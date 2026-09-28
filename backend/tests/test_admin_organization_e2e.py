"""
FinSight AI - Prompt 7 Automated Test Suite
End-to-End Testing for Admin Portal, User Management & Privilege Enforcement,
Organization Hierarchy, Scoped Data Access, Versioned Loan Products,
Dynamic Approval Matrix, Audit Trail Diffing, and Live System Health.
"""

import uuid
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.users import User, UserRole, Branch, Department, Team, AuditLog
from app.models.portal_models import LoanProduct, ApprovalRule
from app.models.loans import Loan, LoanApplication
from app.models.customers import Customer
from app.config import settings
from app.security.jwt import get_password_hash

client = TestClient(app)

def _get_token(email: str, name: str, role: UserRole, branch_id: str = "BR-MUM-01", region: str = "West") -> str:
    email = email.lower().strip()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                full_name=name,
                hashed_password=get_password_hash(settings.DEMO_PASSWORD),
                role=role,
                department="Management",
                branch_id=branch_id,
                region=region,
                is_active=True
            )
            db.add(user)
            db.commit()
        else:
            user.hashed_password = get_password_hash(settings.DEMO_PASSWORD)
            user.role = role
            user.branch_id = branch_id
            user.region = region
            user.is_active = True
            db.commit()
    finally:
        db.close()

    res = client.post("/api/auth/login", json={
        "email": email,
        "password": settings.DEMO_PASSWORD
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


def test_rbac_admin_portal_access():
    """Verify that only authorized Admins and Managers can access admin endpoints."""
    admin_token = _get_token("admin_test_p7@finsight.ai", "Admin Test", UserRole.ADMIN)
    cust_token = _get_token("borrower_p7@gmail.com", "Borrower Test", UserRole.CUSTOMER)

    # 1. Customer attempting to access admin users list must receive 403 Forbidden
    res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {cust_token}"})
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"

    # 2. Administrator accessing admin users list must succeed
    res_admin = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    assert isinstance(res_admin.json(), list)


def test_user_management_crud_and_self_elevation_security():
    """Verify Admin can create, edit, activate/deactivate, reset access, and verify self-privilege prevention."""
    admin_token = _get_token("admin_test_p7@finsight.ai", "Admin Test", UserRole.ADMIN)
    analyst_token = _get_token("credit_analyst_p7@finsight.ai", "Pooja Credit", UserRole.CREDIT_ANALYST)

    unique_email = f"staff_{uuid.uuid4().hex[:6]}@finsight.ai"

    # 1. Create User
    create_payload = {
        "email": unique_email,
        "password": "FinSight@User2026",
        "full_name": "Rohan Deshmukh",
        "role": "CREDIT_ANALYST",
        "department": "Enterprise Credit & Portfolio Risk",
        "branch_id": "BR-MUM-01",
        "branch_name": "Mumbai Central Flagship",
        "region": "West",
        "phone": "+91 98201 55667"
    }
    res_create = client.post("/api/admin/users", json=create_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_create.status_code == 200, res_create.text
    new_user_id = res_create.json()["user_id"]

    # 2. Edit User role and branch
    edit_payload = {
        "full_name": "Rohan Deshmukh Senior",
        "role": "CREDIT_OFFICER",
        "branch_id": "BR-DEL-02",
        "branch_name": "New Delhi Regional Hub",
        "region": "North"
    }
    res_edit = client.put(f"/api/admin/users/{new_user_id}", json=edit_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_edit.status_code == 200
    assert res_edit.json()["user"]["branch_id"] == "BR-DEL-02"

    # 3. Toggle Status (Deactivate then Activate)
    res_toggle1 = client.post(f"/api/admin/users/{new_user_id}/toggle-status", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_toggle1.status_code == 200
    assert res_toggle1.json()["is_active"] is False

    res_toggle2 = client.post(f"/api/admin/users/{new_user_id}/toggle-status", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_toggle2.status_code == 200
    assert res_toggle2.json()["is_active"] is True

    # 4. Reset Access
    res_reset = client.post(
        f"/api/admin/users/{new_user_id}/reset-access",
        json={"new_password": "NewSecretPassword2026!"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_reset.status_code == 200
    assert res_reset.json()["status"] == "SUCCESS"

    # 5. CRITICAL SECURITY CHECK: Prevent users from assigning themselves privileged roles
    # Fetch admin user id
    db = SessionLocal()
    admin_user = db.query(User).filter(User.email == "admin_test_p7@finsight.ai").first()
    admin_id = admin_user.id
    db.close()

    # Attempt to change own role
    res_self_elevate = client.put(
        f"/api/admin/users/{admin_id}",
        json={"role": "SALES_OFFICER"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_self_elevate.status_code == 403
    assert "strictly forbidden" in res_self_elevate.json()["detail"].lower()


def test_organization_branches_departments_teams():
    """Verify branch, department, and team management endpoints."""
    admin_token = _get_token("admin_test_p7@finsight.ai", "Admin Test", UserRole.ADMIN)

    # 1. List Branches (seeded if empty)
    res_branches = client.get("/api/admin/branches", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_branches.status_code == 200
    branches = res_branches.json()
    assert len(branches) >= 5

    # 2. Add New Branch
    branch_code = f"BR-TEST-{uuid.uuid4().hex[:4].upper()}"
    new_branch = {
        "branch_code": branch_code,
        "name": "Ahmedabad West Commercial Hub",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "region": "West",
        "address": "SG Highway, Bodakdev",
        "manager_name": "Manish Patel",
        "contact_phone": "+91 79 2685 1100",
        "is_active": True
    }
    res_add_br = client.post("/api/admin/branches", json=new_branch, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_add_br.status_code == 200
    assert res_add_br.json()["branch_code"] == branch_code

    # 3. List Departments
    res_depts = client.get("/api/admin/departments", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_depts.status_code == 200
    assert len(res_depts.json()) >= 4

    # 4. List Teams
    res_teams = client.get("/api/admin/teams", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_teams.status_code == 200
    assert len(res_teams.json()) >= 3


def test_organizational_scope_manager_scoping():
    """
    Verify manager scoping requirements:
    - Branch Manager: only branch data
    - Regional Manager: regional data
    - Risk Manager: portfolio-wide risk data
    - Admin: organization-wide
    """
    admin_token = _get_token("admin_scope@finsight.ai", "Admin Scope", UserRole.ADMIN)
    risk_token = _get_token("risk_scope@finsight.ai", "Risk Scope", UserRole.RISK_MANAGER)
    credit_mgr_token = _get_token("reg_mgr_scope@finsight.ai", "Reg Mgr Scope", UserRole.CREDIT_MANAGER, branch_id="BR-DEL-02", region="North")
    branch_token = _get_token("branch_scope@finsight.ai", "Branch Scope", UserRole.SALES_OFFICER, branch_id="BR-MUM-01", region="West")

    # 1. Admin Scope (Organization-Wide)
    res_admin = client.get("/api/admin/organization/scope", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    assert res_admin.json()["scope_level"] == "ORGANIZATION_WIDE"
    assert res_admin.json()["branches_count"] >= 5

    # 2. Risk Manager Scope (Portfolio-Wide Risk)
    res_risk = client.get("/api/admin/organization/scope", headers={"Authorization": f"Bearer {risk_token}"})
    assert res_risk.status_code == 200
    assert res_risk.json()["scope_level"] == "PORTFOLIO_WIDE_RISK"

    # 3. Regional Manager Scope (Regional Data)
    res_reg = client.get("/api/admin/organization/scope", headers={"Authorization": f"Bearer {credit_mgr_token}"})
    assert res_reg.status_code == 200
    assert res_reg.json()["scope_level"] == "REGIONAL_DATA"
    assert res_reg.json()["assigned_region"] == "North"

    # 4. Branch Scope (Branch Only)
    res_br = client.get("/api/admin/organization/scope", headers={"Authorization": f"Bearer {branch_token}"})
    assert res_br.status_code == 200
    assert res_br.json()["scope_level"] == "BRANCH_ONLY"
    assert res_br.json()["assigned_branch"] == "BR-MUM-01"


def test_loan_product_versioning_and_auditing():
    """Verify loan product configuration, version incrementing, and audit logging."""
    admin_token = _get_token("admin_test_p7@finsight.ai", "Admin Test", UserRole.ADMIN)

    # 1. Fetch loan products
    res_list = client.get("/api/admin/loan-products", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_list.status_code == 200
    products = res_list.json()
    assert len(products) > 0
    p1 = products[0]
    initial_ver = p1["version"]

    # 2. Update loan product
    update_payload = {
        "interest_rate": 14.75,
        "processing_fee_pct": 2.0,
        "approval_threshold": 750000.0
    }
    res_update = client.put(f"/api/admin/loan-products/{p1['id']}", json=update_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_update.status_code == 200
    assert res_update.json()["version"] == initial_ver + 1
    assert res_update.json()["product"]["interest_rate"] == 14.75

    # 3. Verify audit log was recorded with before and after state
    res_audit = client.get("/api/admin/audit-logs?action=LOAN_PRODUCT_UPDATED", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_audit.status_code == 200
    logs = res_audit.json()["logs"]
    assert len(logs) > 0
    recent = logs[0]
    assert recent["action"] == "LOAN_PRODUCT_UPDATED"
    assert "interest_rate" in recent["before"]
    assert "interest_rate" in recent["after"]


def test_configurable_approval_matrix_and_workflow_evaluation():
    """
    Verify configurable approval rules:
    - Small loan -> Credit Analyst
    - Medium exposure -> Credit Manager
    - Large / high-risk -> Credit Manager + Risk Manager dual approval
    """
    admin_token = _get_token("admin_test_p7@finsight.ai", "Admin Test", UserRole.ADMIN)

    # 1. List approval rules
    res_rules = client.get("/api/admin/approval-rules", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_rules.status_code == 200
    rules = res_rules.json()
    assert len(rules) >= 3

    # 2. Evaluate Small Loan (< ₹2 Lakhs) -> Credit Analyst
    eval_small = client.post("/api/admin/approval-rules/evaluate", json={
        "amount": 120000.0,
        "cibil_score": 750,
        "dti_pct": 30.0,
        "risk_score": 20.0
    })
    assert eval_small.status_code == 200
    assert eval_small.json()["primary_required_role"] == "CREDIT_ANALYST"
    assert eval_small.json()["requires_dual_approval"] is False

    # 3. Evaluate Medium Loan (₹5 Lakhs) -> Credit Manager
    eval_medium = client.post("/api/admin/approval-rules/evaluate", json={
        "amount": 500000.0,
        "cibil_score": 710,
        "dti_pct": 35.0,
        "risk_score": 28.0
    })
    assert eval_medium.status_code == 200
    assert eval_medium.json()["primary_required_role"] == "CREDIT_MANAGER"
    assert eval_medium.json()["requires_dual_approval"] is False

    # 4. Evaluate Large Exposure (> ₹10 Lakhs) -> Dual Approval (Credit Manager + Risk Manager)
    eval_large = client.post("/api/admin/approval-rules/evaluate", json={
        "amount": 2500000.0,
        "cibil_score": 740,
        "dti_pct": 35.0,
        "risk_score": 30.0
    })
    assert eval_large.status_code == 200
    assert eval_large.json()["primary_required_role"] == "CREDIT_MANAGER"
    assert eval_large.json()["requires_dual_approval"] is True
    assert eval_large.json()["secondary_required_role"] == "RISK_MANAGER"


def test_audit_logs_and_state_diffs():
    """Verify audit logs endpoint filters and displays user, role, action, entity, timestamp, before, after."""
    admin_token = _get_token("admin_test_p7@finsight.ai", "Admin Test", UserRole.ADMIN)

    # 1. Trigger Login and Logout to create audit records
    res_logout = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_logout.status_code == 200

    # 2. Query Audit Logs
    res_logs = client.get("/api/admin/audit-logs?limit=50", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_logs.status_code == 200
    logs = res_logs.json()["logs"]
    assert len(logs) > 0

    first = logs[0]
    assert "user" in first
    assert "role" in first
    assert "action" in first
    assert "entity_type" in first or "resource" in first
    assert "timestamp" in first
    assert "before" in first
    assert "after" in first


def test_system_health_real_telemetry():
    """Verify system health endpoint returns actual operational statuses (no fakes)."""
    res_health = client.get("/api/admin/health")
    assert res_health.status_code == 200
    data = res_health.json()

    assert data["status"] in ["HEALTHY", "DEGRADED"]
    components = data["components"]

    # 1. Database check
    assert components["database"]["status"] == "OPERATIONAL"
    assert components["database"]["roundtrip_latency_ms"] >= 0.0

    # 2. AI Services check
    assert components["ai_services"]["status"] == "OPERATIONAL"
    assert components["ai_services"]["models_count"] == 6

    # 3. Notification Service check
    assert components["notification_service"]["status"] == "OPERATIONAL"

    # 4. Backend Server check
    assert components["backend"]["status"] == "OPERATIONAL"
    assert components["backend"]["python_runtime"] != ""

    # 5. Frontend Check
    assert components["frontend"]["status"] == "OPERATIONAL"
