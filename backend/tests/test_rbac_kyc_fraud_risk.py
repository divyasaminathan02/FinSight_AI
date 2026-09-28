"""
FinSight AI - KYC, Fraud & Risk RBAC Permission Scoping Tests
Tests:
- KYC officers can access KYC cases.
- Fraud officers can access fraud cases.
- Risk analysts can access risk cases.
- Risk managers can access team-level risk cases.
- Credit users cannot modify KYC verification unless permitted (returns 403).
- Sales users cannot modify fraud decisions (returns 403).
- Customers cannot access internal fraud/risk information (returns 403).
- Unauthorized API access returns correct authorization error.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.users import User, UserRole
from app.models.customers import Customer
from app.models.loans import LoanApplication
from app.models.portal_models import KycCase, FraudCase
from app.security.jwt import get_password_hash

client = TestClient(app)

def ensure_rbac_users():
    db = SessionLocal()
    try:
        users_to_ensure = [
            ("kyc.officer.test@finsight.ai", "KYC Officer Test", UserRole.KYC_OFFICER),
            ("fraud.officer.test@finsight.ai", "Fraud Officer Test", UserRole.FRAUD_OFFICER),
            ("risk.analyst.test@finsight.ai", "Risk Analyst Test", UserRole.RISK_ANALYST),
            ("risk.manager.test@finsight.ai", "Risk Manager Test", UserRole.RISK_MANAGER),
            ("credit.officer.test@finsight.ai", "Credit Officer Test", UserRole.CREDIT_ANALYST),
            ("sales.officer.test@finsight.ai", "Sales Officer Test", UserRole.SALES_OFFICER),
            ("customer.test@finsight.ai", "Customer Test", UserRole.CUSTOMER),
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
            else:
                u.hashed_password = get_password_hash(settings.DEMO_PASSWORD)
                u.role = role
                u.is_active = True
        db.commit()
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_rbac_users():
    ensure_rbac_users()

def _get_token(email: str):
    ensure_rbac_users()
    res = client.post("/api/auth/login", json={
        "email": email,
        "password": settings.DEMO_PASSWORD
    })
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_kyc_officer_access():
    token = _get_token("kyc.officer.test@finsight.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Access KYC Dashboard
    dash_res = client.get("/api/kyc/dashboard", headers=headers)
    assert dash_res.status_code == 200, f"KYC dashboard error: {dash_res.text}"
    assert "pending_kyc_cases" in dash_res.json()

    # 2. Access KYC Cases Queue
    cases_res = client.get("/api/kyc/cases", headers=headers)
    assert cases_res.status_code == 200, f"KYC cases error: {cases_res.text}"
    assert "cases" in cases_res.json()

def test_fraud_officer_access():
    token = _get_token("fraud.officer.test@finsight.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Access Fraud Dashboard
    dash_res = client.get("/api/fraud/dashboard", headers=headers)
    assert dash_res.status_code == 200, f"Fraud dashboard error: {dash_res.text}"
    assert "pending_fraud_cases" in dash_res.json()

    # 2. Access Fraud Cases Queue
    cases_res = client.get("/api/fraud/cases", headers=headers)
    assert cases_res.status_code == 200, f"Fraud cases error: {cases_res.text}"
    assert "cases" in cases_res.json()

def test_risk_analyst_access():
    token = _get_token("risk.analyst.test@finsight.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Access Risk Dashboard
    dash_res = client.get("/api/risk/dashboard", headers=headers)
    assert dash_res.status_code == 200, f"Risk dashboard error: {dash_res.text}"
    assert "portfolio_risk" in dash_res.json()

    # 2. Access Risk Cases Queue
    cases_res = client.get("/api/risk/cases", headers=headers)
    assert cases_res.status_code == 200, f"Risk cases error: {cases_res.text}"
    assert "cases" in cases_res.json()

def test_risk_manager_access():
    token = _get_token("risk.manager.test@finsight.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Access Risk Manager Console
    mgr_res = client.get("/api/risk-manager/dashboard", headers=headers)
    assert mgr_res.status_code == 200, f"Risk manager dashboard error: {mgr_res.text}"
    assert "pending_approvals" in mgr_res.json()

def test_unauthorized_cross_module_restrictions():
    credit_token = _get_token("credit.officer.test@finsight.ai")
    sales_token = _get_token("sales.officer.test@finsight.ai")
    customer_token = _get_token("customer.test@finsight.ai")

    # 1. Credit users cannot modify KYC verification (403 Forbidden)
    credit_headers = {"Authorization": f"Bearer {credit_token}"}
    kyc_res = client.post("/api/kyc/cases/KYC-TEST-001/action", headers=credit_headers, json={
        "action": "VERIFY_KYC",
        "notes": "Unauthorized attempt"
    })
    assert kyc_res.status_code == 403, f"Expected 403 for credit user modifying KYC, got {kyc_res.status_code}"

    # 2. Sales users cannot modify fraud decisions (403 Forbidden)
    sales_headers = {"Authorization": f"Bearer {sales_token}"}
    fraud_res = client.post("/api/fraud/cases/FRD-TEST-001/action", headers=sales_headers, json={
        "action": "CLEAR_CASE",
        "notes": "Unauthorized attempt"
    })
    assert fraud_res.status_code == 403, f"Expected 403 for sales user modifying fraud, got {fraud_res.status_code}"

    # 3. Customer cannot access internal fraud cases or risk dashboards (403 Forbidden)
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    cust_fraud_res = client.get("/api/fraud/cases", headers=customer_headers)
    assert cust_fraud_res.status_code == 403, f"Expected 403 for customer accessing fraud cases, got {cust_fraud_res.status_code}"

    cust_risk_res = client.get("/api/risk/dashboard", headers=customer_headers)
    assert cust_risk_res.status_code == 403, f"Expected 403 for customer accessing risk dashboard, got {cust_risk_res.status_code}"
