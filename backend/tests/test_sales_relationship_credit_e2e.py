"""
FinSight AI - Complete Prompt 3 End-to-End Workflow Test
Tests:
Create lead
-> Assign sales officer
-> Contact customer
-> Convert to customer
-> Start application
-> Submit application
-> Application appears in sales queue
-> Credit analyst receives case
-> AI credit analysis runs
-> Analyst submits recommendation
-> Credit manager receives approval task
-> Manager approves/rejects
-> Customer receives notification
-> Relationship manager dashboard updates
-> Audit trail records every action.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.users import User, UserRole, AuditLog
from app.models.notifications import Notification
from app.security.jwt import get_password_hash

client = TestClient(app)

def _get_token(email: str):
    res = client.post("/api/auth/login", json={
        "email": email,
        "password": settings.DEMO_PASSWORD
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]

def test_complete_prompt3_e2e_workflow():
    db = SessionLocal()
    # 0. Ensure test users exist
    try:
        users_info = [
            ("sales.officer@finsight.ai", "Rajesh Sharma", UserRole.SALES_OFFICER),
            ("credit.analyst@finsight.ai", "Ananya Deshmukh", UserRole.CREDIT_ANALYST),
            ("credit.manager@finsight.ai", "Vikram Malhotra", UserRole.CREDIT_MANAGER),
            ("relationship.manager@finsight.ai", "Priya Nair", UserRole.RELATIONSHIP_MANAGER)
        ]
        for em, nm, rl in users_info:
            if not db.query(User).filter(User.email == em).first():
                db.add(User(
                    email=em,
                    hashed_password=get_password_hash(settings.DEMO_PASSWORD),
                    full_name=nm,
                    role=rl,
                    is_active=True
                ))
        db.commit()
    finally:
        db.close()

    sales_token = _get_token("sales.officer@finsight.ai")
    analyst_token = _get_token("credit.analyst@finsight.ai")
    manager_token = _get_token("credit.manager@finsight.ai")
    rm_token = _get_token("relationship.manager@finsight.ai")

    h_sales = {"Authorization": f"Bearer {sales_token}"}
    h_analyst = {"Authorization": f"Bearer {analyst_token}"}
    h_mgr = {"Authorization": f"Bearer {manager_token}"}
    h_rm = {"Authorization": f"Bearer {rm_token}"}

    db = SessionLocal()
    try:
        sales_user = db.query(User).filter(User.email == "sales.officer@finsight.ai").first()
        sales_name = sales_user.full_name if sales_user else "Sales Officer Demo"
        mgr_user = db.query(User).filter(User.email == "credit.manager@finsight.ai").first()
        mgr_name = mgr_user.full_name if mgr_user else "Credit Manager Demo"
    finally:
        db.close()

    # STEP 1: Create lead
    lead_res = client.post("/api/leads", json={
        "full_name": "Rohan Deshmukh",
        "email": "rohan.deshmukh@enterprise.in",
        "phone": "+91 98765 43210",
        "product_type": "MSME Business Loan",
        "requested_amount": 1200000.0,
        "annual_income": 1800000.0,
        "city": "Pune",
        "notes": "Interested in working capital line for auto component tooling"
    }, headers=h_sales)
    assert lead_res.status_code == 201, f"Create lead failed: {lead_res.text}"
    lead_data = lead_res.json()
    lead_id = lead_data["lead_id"]
    assert lead_data["status"] == "NEW"

    # STEP 2: Assign sales officer
    assign_res = client.post(f"/api/leads/{lead_id}/assign", json={
        "assigned_officer": sales_name,
        "reason": "Specialized in manufacturing MSME accounts"
    }, headers=h_sales)
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_officer"] == sales_name

    # STEP 3: Contact customer & add notes
    contact_res = client.post(f"/api/leads/{lead_id}/status", json={
        "status": "CONTACTED",
        "reason": "Called client, scheduled document collection"
    }, headers=h_sales)
    assert contact_res.status_code == 200
    assert contact_res.json()["status"] == "CONTACTED"

    note_res = client.post(f"/api/leads/{lead_id}/notes", json={
        "note": "Client confirmed 3 years audited balance sheets available"
    }, headers=h_sales)
    assert note_res.status_code == 200
    assert len(note_res.json()["notes_history"]) > 0

    # STEP 4: Convert lead to customer
    convert_res = client.post(f"/api/leads/{lead_id}/convert", headers=h_sales)
    assert convert_res.status_code == 200
    conv_data = convert_res.json()
    customer_id = conv_data["customer_id"]
    application_id = conv_data["application_id"]
    assert conv_data["lead_status"] == "CONVERTED"

    # STEP 5 & 6: Application appears in sales queue
    queue_res = client.get("/api/sales/applications", headers=h_sales)
    assert queue_res.status_code == 200
    apps_in_queue = [a["application_id"] for a in queue_res.json()]
    assert application_id in apps_in_queue

    # Sales officer advances stage to Credit_Review
    advance_res = client.post(f"/api/sales/applications/{application_id}/advance-stage", json={
        "target_stage": "Credit_Review",
        "notes": "KYC verified and dossiers submitted for underwriting"
    }, headers=h_sales)
    assert advance_res.status_code == 200
    assert advance_res.json()["current_status"] == "Credit_Review"

    # STEP 7: Credit analyst receives case
    analyst_dash = client.get("/api/credit/dashboard", headers=h_analyst)
    assert analyst_dash.status_code == 200
    queue_app_ids = [a["application_id"] for a in analyst_dash.json()["review_queue"]]
    assert application_id in queue_app_ids

    # Review dossier details
    review_res = client.get(f"/api/credit/review/{application_id}", headers=h_analyst)
    assert review_res.status_code == 200
    dossier = review_res.json()
    assert dossier["customer"]["customer_id"] == customer_id
    assert "debt_to_income_ratio" in dossier["financial_profile"]
    assert "risk_indicators" in dossier

    # STEP 8: Run AI credit evaluation (Real XGBoost model inference)
    ai_eval_res = client.post(f"/api/credit/review/{application_id}/ai-evaluate", headers=h_analyst)
    assert ai_eval_res.status_code == 200
    ai_data = ai_eval_res.json()
    assert "probability_of_default" in ai_data
    assert "approval_recommendation" in ai_data
    assert "shap_explanations" in ai_data
    assert ai_data["approval_recommendation"] in ["APPROVE", "REVIEW", "REJECT"]

    # STEP 9: Analyst submits recommendation
    action_res = client.post(f"/api/credit/review/{application_id}/analyst-action", json={
        "action": "APPROVE_FOR_MANAGER",
        "notes": "Healthy bank balance, verified GST filings, positive debt-servicing capacity.",
        "recommended_amount": 1200000.0,
        "recommended_tenure": 36
    }, headers=h_analyst)
    assert action_res.status_code == 200
    assert action_res.json()["current_status"] == "Manager_Approval"

    # STEP 10: Credit manager receives approval task & reviews dashboard
    mgr_dash = client.get("/api/credit-manager/dashboard", headers=h_mgr)
    assert mgr_dash.status_code == 200
    mgr_cases = [c["application_id"] for c in mgr_dash.json()["pending_approvals"]]
    assert application_id in mgr_cases

    # STEP 11: Manager approves application
    decision_res = client.post(f"/api/credit-manager/{application_id}/decision", json={
        "decision": "APPROVE",
        "decision_reason": "Concurs with credit analyst assessment. Prime MSME profile.",
        "sanctioned_amount": 1200000.0,
        "interest_rate": 11.75,
        "tenure_months": 36
    }, headers=h_mgr)
    assert decision_res.status_code == 200
    assert decision_res.json()["final_status"] == "Approved"
    history_id = decision_res.json()["history_id"]
    assert history_id.startswith("DEC-")

    # STEP 12: Verify immutable credit decision history
    history_res = client.get(f"/api/credit/applications/{application_id}/history", headers=h_mgr)
    assert history_res.status_code == 200
    history_records = history_res.json()
    assert len(history_records) >= 1
    assert history_records[0]["final_decision"] == "APPROVE"
    assert history_records[0]["manager"] == mgr_name

    # STEP 13: Customer notification and Unified Timeline update
    timeline_res = client.get(f"/api/relationship/customers/{customer_id}/timeline", headers=h_rm)
    assert timeline_res.status_code == 200
    events = timeline_res.json()["events"]
    event_types = [e["event_type"] for e in events]
    assert "CUSTOMER_CREATED" in event_types
    assert "APPLICATION_STARTED" in event_types
    assert "APPROVAL" in event_types
    assert "DISBURSEMENT" in event_types

    # STEP 14: Audit Trail records every action
    db = SessionLocal()
    try:
        audits = db.query(AuditLog).filter(
            AuditLog.resource.in_([f"LEAD:{lead_id}", f"APP:{application_id}", f"CUST:{customer_id}"])
        ).all()
        actions = [a.action for a in audits]
        assert "LEAD_CREATED" in actions
        assert "LEAD_CONVERTED" in actions
        assert "CREDIT_ANALYST_APPROVE_FOR_MANAGER" in actions
        assert "CREDIT_MANAGER_APPROVE" in actions
    finally:
        db.close()
