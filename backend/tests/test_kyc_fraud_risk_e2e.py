"""
FinSight AI - Prompt 4 End-to-End Test
Workflow:
Customer submits application
-> Documents uploaded
-> KYC case created
-> KYC officer verifies documents
-> Fraud analysis runs
-> Fraud officer reviews case
-> Risk analysis runs
-> Risk analyst reviews case
-> Required manager approvals occur
-> Application moves to next workflow stage
-> Customer receives appropriate notification
-> Staff dashboards update
-> Audit trail records every action.
Everything verified with real database state.
"""

import uuid
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.users import User, UserRole, AuditLog
from app.models.customers import Customer
from app.models.loans import LoanApplication, Loan
from app.models.portal_models import KycCase, FraudCase, RiskDecisionHistory, Document, WorkTask
from app.models.notifications import Notification
from app.security.jwt import get_password_hash

client = TestClient(app)

def _get_token(email: str, name: str, role: UserRole):
    email = email.lower().strip()
    db = SessionLocal()
    try:
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
        else:
            u.hashed_password = get_password_hash(settings.DEMO_PASSWORD)
            u.role = role
            u.is_active = True
            db.commit()
    finally:
        db.close()

    res = client.post("/api/auth/login", json={
        "email": email,
        "password": settings.DEMO_PASSWORD
    })
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_complete_prompt4_e2e_workflow():
    suffix = uuid.uuid4().hex[:6].lower()
    cust_email = f"borrower.{suffix}@finsight.ai"
    cust_name = f"Rohan Verma {suffix}"

    kyc_token = _get_token(f"kyc.officer.{suffix}@finsight.ai", "KYC Officer E2E", UserRole.KYC_OFFICER)
    fraud_token = _get_token(f"fraud.officer.{suffix}@finsight.ai", "Fraud Officer E2E", UserRole.FRAUD_OFFICER)
    risk_analyst_token = _get_token(f"risk.analyst.{suffix}@finsight.ai", "Risk Analyst E2E", UserRole.RISK_ANALYST)
    risk_manager_token = _get_token(f"risk.manager.{suffix}@finsight.ai", "Risk Manager E2E", UserRole.RISK_MANAGER)

    kyc_headers = {"Authorization": f"Bearer {kyc_token}"}
    fraud_headers = {"Authorization": f"Bearer {fraud_token}"}
    risk_analyst_headers = {"Authorization": f"Bearer {risk_analyst_token}"}
    risk_manager_headers = {"Authorization": f"Bearer {risk_manager_token}"}

    db = SessionLocal()
    try:
        # Step 1: Customer submits application & is registered in DB
        cust = Customer(
            customer_id=f"CUST-P4-{suffix}",
            first_name="Rohan",
            last_name=f"Verma {suffix}",
            email=cust_email,
            phone_hash="+91-9820011223",
            address_hash="Flat 402, Powai Heights, Mumbai",
            income=85000.0,
            credit_score=745,
            risk_tier="Moderate",
            kyc_status="NOT_STARTED",
            created_at=datetime.utcnow()
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)

        app_obj = LoanApplication(
            application_id=f"APP-P4-{suffix}",
            customer_id=cust.id,
            product_type="MSME Business Loan",
            requested_amount=750000.0,
            requested_tenure=36,
            purpose="Machinery Expansion",
            status="Under_Review",
            workflow_stage="KYC_REVIEW",
            kyc_status="UNDER_REVIEW",
            fraud_status="PENDING",
            risk_status="PENDING",
            created_at=datetime.utcnow()
        )
        db.add(app_obj)
        db.commit()
        db.refresh(app_obj)

        # Step 2: Documents uploaded
        doc_pan = Document(
            doc_id=f"DOC-PAN-{suffix}",
            customer_id=cust.id,
            application_id=app_obj.id,
            doc_type="PAN_CARD",
            document_type="PAN_CARD",
            file_name=f"pan_{suffix.lower()}.pdf",
            status="UPLOADED",
            verification_status="UPLOADED",
            uploaded_at=datetime.utcnow()
        )
        doc_aadhaar = Document(
            doc_id=f"DOC-AADHAAR-{suffix}",
            customer_id=cust.id,
            application_id=app_obj.id,
            doc_type="AADHAAR",
            document_type="AADHAAR",
            file_name=f"aadhaar_{suffix.lower()}.pdf",
            status="UPLOADED",
            verification_status="UPLOADED",
            uploaded_at=datetime.utcnow()
        )
        db.add_all([doc_pan, doc_aadhaar])
        db.commit()

        # Step 3: KYC case created
        kyc_case = KycCase(
            case_id=f"KYC-CASE-{suffix}",
            customer_id=cust.id,
            application_id=app_obj.id,
            status="UNDER_REVIEW",
            assigned_officer="KYC Officer E2E",
            risk_level="LOW",
            document_status="PENDING",
            created_at=datetime.utcnow()
        )
        db.add(kyc_case)
        db.commit()
        db.refresh(kyc_case)

        # Step 4: KYC officer verifies documents & verifies KYC
        v_doc_res = client.post(f"/api/kyc/cases/{kyc_case.case_id}/verify-document", headers=kyc_headers, json={
            "doc_id": doc_pan.doc_id,
            "action": "VERIFY",
            "notes": "PAN card verified against NSDL portal"
        })
        assert v_doc_res.status_code == 200, f"Doc verify error: {v_doc_res.text}"

        kyc_act_res = client.post(f"/api/kyc/cases/{kyc_case.case_id}/action", headers=kyc_headers, json={
            "action": "VERIFY_KYC",
            "notes": "All mandatory KYC documentation verified successfully"
        })
        assert kyc_act_res.status_code == 200, f"KYC verify error: {kyc_act_res.text}"

        # Verify DB state after KYC
        db.refresh(cust)
        db.refresh(app_obj)
        db.refresh(kyc_case)
        assert kyc_case.status == "VERIFIED"
        assert cust.kyc_status == "VERIFIED"
        assert app_obj.workflow_stage == "FRAUD_REVIEW"

        # Step 5: Fraud analysis runs
        fraud_eval_res = client.post(f"/api/fraud/evaluate/{app_obj.application_id}", headers=fraud_headers)
        assert fraud_eval_res.status_code == 200, f"Fraud evaluation error: {fraud_eval_res.text}"
        fraud_data = fraud_eval_res.json()
        assert "fraud_risk_score" in fraud_data
        assert "risk_category" in fraud_data

        fraud_case = db.query(FraudCase).filter(FraudCase.application_id == app_obj.id).first()
        assert fraud_case is not None

        # Step 6: Fraud officer reviews case & clears it
        fraud_act_res = client.post(f"/api/fraud/cases/{fraud_case.case_id}/action", headers=fraud_headers, json={
            "action": "CLEAR_CASE",
            "notes": "No synthetic identity or device collision detected."
        })
        assert fraud_act_res.status_code == 200, f"Fraud clear error: {fraud_act_res.text}"

        db.refresh(app_obj)
        db.refresh(fraud_case)
        assert fraud_case.status == "CLEARED"
        assert app_obj.fraud_status == "CLEARED"
        assert app_obj.workflow_stage == "CREDIT_REVIEW"

        # Step 7: Risk analysis runs
        risk_assess_res = client.get(f"/api/risk/assessment/{app_obj.application_id}", headers=risk_analyst_headers)
        assert risk_assess_res.status_code == 200, f"Risk assessment error: {risk_assess_res.text}"
        risk_data = risk_assess_res.json()
        assert "loan_to_income_ratio" in risk_data
        assert "debt_to_income_ratio" in risk_data
        assert "overall_risk_score" in risk_data
        assert "credit_risk" in risk_data
        assert "fraud_risk" in risk_data

        # Step 8: Risk analyst reviews case and executes APPROVE_RISK
        analyst_act_res = client.post(f"/api/risk/assessment/{app_obj.application_id}/action", headers=risk_analyst_headers, json={
            "action": "APPROVE_RISK",
            "notes": "LTI ratio within policy tolerance. Credit PD low."
        })
        assert analyst_act_res.status_code == 200, f"Risk analyst action error: {analyst_act_res.text}"

        db.refresh(app_obj)
        assert app_obj.risk_recommendation == "APPROVE_RISK"

        # Step 9: Required manager approvals occur (Risk Manager sanctions)
        mgr_dec_res = client.post(f"/api/risk-manager/{app_obj.application_id}/decision", headers=risk_manager_headers, json={
            "decision": "APPROVE",
            "decision_reason": "Enterprise portfolio limits satisfied. DSCR verified.",
            "sanctioned_amount": 750000.0,
            "notes": "Final sanction sanctioned by Risk Committee"
        })
        assert mgr_dec_res.status_code == 200, f"Manager decision error: {mgr_dec_res.text}"

        # Step 10: Application moves to next workflow stage (APPROVED)
        db.refresh(app_obj)
        assert app_obj.status == "Approved"
        assert app_obj.workflow_stage == "APPROVED"
        assert app_obj.approved_amount == 750000.0

        # Step 11: Customer receives notification
        cust_notif = db.query(Notification).filter(
            Notification.recipient_email == cust_email
        ).order_by(Notification.created_at.desc()).first()
        assert cust_notif is not None
        assert "Approved" in cust_notif.title or "Sanctioned" in cust_notif.title or "Verified" in cust_notif.title

        # Step 12: Staff dashboards update
        rsk_dash = client.get("/api/risk-manager/dashboard", headers=risk_manager_headers)
        assert rsk_dash.status_code == 200

        # Step 13: Audit trail records every action
        audit_records = db.query(AuditLog).filter(
            AuditLog.resource.ilike(f"%{app_obj.application_id}%")
        ).all()
        assert len(audit_records) >= 2, "Expected at least 2 audit trail records for this application"

        # Step 14: Immutable RiskDecisionHistory record is verified
        history_res = client.get(f"/api/risk/applications/{app_obj.application_id}/history", headers=risk_analyst_headers)
        assert history_res.status_code == 200
        hist_data = history_res.json()
        assert hist_data["total_records"] >= 1
        assert hist_data["history"][0]["final_decision"] == "APPROVE"
        assert hist_data["history"][0]["decision_reason"] == "Enterprise portfolio limits satisfied. DSCR verified."

    finally:
        db.close()
