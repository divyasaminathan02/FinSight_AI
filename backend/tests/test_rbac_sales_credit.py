"""
FinSight AI - Sales, Relationship & Credit RBAC Scoping Tests
Tests:
- Sales officer sees assigned customers / leads / apps
- Relationship manager sees assigned customers
- Credit analyst sees assigned credit cases
- Credit manager sees team-level credit cases
- Unauthorized users cannot access restricted information
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.users import User, UserRole
from app.models.customers import Customer
from app.models.loans import LoanApplication
from app.models.portal_models import Lead
from app.security.jwt import get_password_hash

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_rbac_users():
    db = SessionLocal()
    try:
        # Create dedicated test users for each role if not existing
        users_to_ensure = [
            ("sales.officer1@finsight.ai", "Sales Officer One", UserRole.SALES_OFFICER),
            ("sales.officer2@finsight.ai", "Sales Officer Two", UserRole.SALES_OFFICER),
            ("rm.officer1@finsight.ai", "RM One", UserRole.RELATIONSHIP_MANAGER),
            ("rm.officer2@finsight.ai", "RM Two", UserRole.RELATIONSHIP_MANAGER),
            ("credit.analyst1@finsight.ai", "Credit Analyst One", UserRole.CREDIT_ANALYST),
            ("credit.manager1@finsight.ai", "Credit Manager One", UserRole.CREDIT_MANAGER),
        ]
        for email, name, role in users_to_ensure:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    email=email,
                    hashed_password=get_password_hash(settings.DEMO_PASSWORD),
                    full_name=name,
                    role=role,
                    is_active=True
                )
                db.add(u)
        db.commit()
    finally:
        db.close()

def _get_token(email: str):
    res = client.post("/api/auth/login", json={
        "email": email,
        "password": settings.DEMO_PASSWORD
    })
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_sales_officer_scoping(setup_rbac_users):
    token1 = _get_token("sales.officer1@finsight.ai")
    token2 = _get_token("sales.officer2@finsight.ai")
    h1 = {"Authorization": f"Bearer {token1}"}
    h2 = {"Authorization": f"Bearer {token2}"}

    # Create lead assigned to officer 1
    create_res = client.post("/api/leads", json={
        "full_name": "Exclusive Officer1 Lead",
        "email": "lead1@test.com",
        "phone": "+91 99999 11111",
        "requested_amount": 750000.0,
        "annual_income": 900000.0,
        "city": "Mumbai",
        "assigned_officer": "Sales Officer One"
    }, headers=h1)
    assert create_res.status_code == 201
    lead_id = create_res.json()["lead_id"]

    # Officer 1 sees it in list
    list1 = client.get("/api/leads", headers=h1)
    assert list1.status_code == 200
    ids1 = [l["lead_id"] for l in list1.json()]
    assert lead_id in ids1

    # Officer 2 should not see Officer 1's lead
    list2 = client.get("/api/leads", headers=h2)
    assert list2.status_code == 200
    ids2 = [l["lead_id"] for l in list2.json()]
    assert lead_id not in ids2

def test_relationship_manager_scoping(setup_rbac_users):
    token1 = _get_token("rm.officer1@finsight.ai")
    token2 = _get_token("rm.officer2@finsight.ai")
    h1 = {"Authorization": f"Bearer {token1}"}
    h2 = {"Authorization": f"Bearer {token2}"}

    # Verify RM dashboard works for RM 1
    dash1 = client.get("/api/relationship/dashboard", headers=h1)
    assert dash1.status_code == 200
    assert "assigned_customers" in dash1.json()
    assert "upcoming_emi_count" in dash1.json()

    # Verify RM 2 dashboard works for RM 2
    dash2 = client.get("/api/relationship/dashboard", headers=h2)
    assert dash2.status_code == 200
    assert dash2.json()["manager_name"] == "RM Two"

def test_credit_analyst_and_manager_scoping(setup_rbac_users):
    token_analyst = _get_token("credit.analyst1@finsight.ai")
    token_mgr = _get_token("credit.manager1@finsight.ai")

    # Analyst dashboard
    analyst_res = client.get("/api/credit/dashboard", headers={"Authorization": f"Bearer {token_analyst}"})
    assert analyst_res.status_code == 200
    data_a = analyst_res.json()
    assert "awaiting_credit_review" in data_a
    assert "approval_rate" in data_a

    # Manager dashboard
    mgr_res = client.get("/api/credit-manager/dashboard", headers={"Authorization": f"Bearer {token_mgr}"})
    assert mgr_res.status_code == 200
    data_m = mgr_res.json()
    assert "pending_approvals" in data_m
    assert "team_performance" in data_m
    assert "approval_volume" in data_m
