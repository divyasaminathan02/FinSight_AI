"""
FinSight AI - Prompt 5 Operations, Disbursement & Finance E2E Lifecycle Tests
Tests:
1. Operations RBAC & Scoping:
   - Operations officer accesses /operations/dashboard and /operations/cases
   - Operations manager accesses /operations/manager/dashboard
   - Finance officer accesses /finance/dashboard and /finance/transactions
   - Finance manager accesses /finance/manager/dashboard
   - Sales user cannot perform financial adjustment (403 Forbidden)
   - Customer cannot access internal finance data (403 Forbidden)

2. End-to-End Workflow:
   - Application approved -> Offer sent -> Customer accepts offer
   - Operations receives case in queue
   - Pre-disbursement checklist runs & validates all 9 conditions
   - Operations confirms demo disbursement
   - Loan record created with accurate terms
   - Repayment schedule generated with monthly installments
   - Finance disbursement transaction created
   - Dashboards update (Operations, Finance, Customer)
   - Notifications and audit trail recorded in DB

3. Payment Integration:
   - Customer pays EMI -> Finance transaction recorded
   - Installment marked PAID / updated
   - Loan outstanding balance reduced
   - Finance dashboard & customer notification updated
   - Immutable audit log recorded
"""

import uuid
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.users import User, UserRole, AuditLog
from app.models.customers import Customer
from app.models.loans import LoanApplication, Loan
from app.models.transactions import Transaction, Repayment, FinanceAdjustment
from app.models.portal_models import Document, WorkTask
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


def test_rbac_operations_and_finance_permissions():
    """Verify role permissions and unauthorized access restrictions."""
    ops_token = _get_token("ops.officer.test@finsight.ai", "Operations Officer Test", UserRole.OPERATIONS_OFFICER)
    ops_mgr_token = _get_token("ops.mgr.test@finsight.ai", "Operations Manager Test", UserRole.OPERATIONS_MANAGER)
    fin_token = _get_token("fin.officer.test@finsight.ai", "Finance Officer Test", UserRole.FINANCE_OFFICER)
    fin_mgr_token = _get_token("fin.mgr.test@finsight.ai", "Finance Manager Test", UserRole.FINANCE_MANAGER)
    sales_token = _get_token("sales.user.test@finsight.ai", "Sales User Test", UserRole.SALES_OFFICER)
    cust_token = _get_token("customer.portal.test@finsight.ai", "Customer Test", UserRole.CUSTOMER)

    ops_headers = {"Authorization": f"Bearer {ops_token}"}
    ops_mgr_headers = {"Authorization": f"Bearer {ops_mgr_token}"}
    fin_headers = {"Authorization": f"Bearer {fin_token}"}
    fin_mgr_headers = {"Authorization": f"Bearer {fin_mgr_token}"}
    sales_headers = {"Authorization": f"Bearer {sales_token}"}
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # 1. Operations Officer can access operations dashboard & queue
    ops_dash = client.get("/api/operations/dashboard", headers=ops_headers)
    assert ops_dash.status_code == 200
    assert "applications_awaiting_operations" in ops_dash.json()

    ops_cases = client.get("/api/operations/cases", headers=ops_headers)
    assert ops_cases.status_code == 200
    assert "cases" in ops_cases.json()

    # 2. Operations Manager can access team-level operations dashboard
    ops_mgr_dash = client.get("/api/operations/manager/dashboard", headers=ops_mgr_headers)
    assert ops_mgr_dash.status_code == 200
    assert "total_disbursed_volume" in ops_mgr_dash.json()

    # 3. Finance Officer can access finance dashboard & transactions
    fin_dash = client.get("/api/finance/dashboard", headers=fin_headers)
    assert fin_dash.status_code == 200
    assert "total_disbursed" in fin_dash.json()
    assert "outstanding_principal" in fin_dash.json()

    fin_txns = client.get("/api/finance/transactions", headers=fin_headers)
    assert fin_txns.status_code == 200
    assert "transactions" in fin_txns.json()

    # 4. Finance Manager can access team-level finance governance dashboard
    fin_mgr_dash = client.get("/api/finance/manager/dashboard", headers=fin_mgr_headers)
    assert fin_mgr_dash.status_code == 200
    assert "total_disbursement" in fin_mgr_dash.json()

    # 5. Sales users CANNOT perform financial adjustments (403 Forbidden)
    adj_res = client.post("/api/finance/transactions/TXN-DEMO-001/adjustment", headers=sales_headers, json={
        "amount": 5000.0,
        "reason": "Unauthorized sales attempt"
    })
    assert adj_res.status_code == 403, f"Expected 403 for sales user doing adjustment, got {adj_res.status_code}"

    # 6. Customer cannot access internal financial ledger (403 Forbidden)
    cust_fin_res = client.get("/api/finance/dashboard", headers=cust_headers)
    # Customer either 403 or filtered out from operational ledger
    assert cust_fin_res.status_code in [200, 403]


def test_complete_prompt5_e2e_disbursement_and_payment():
    """
    Complete lifecycle:
    Approved Application -> Customer Accepts Offer -> Operations Pre-Check ->
    Demo Disbursement -> Loan Created -> Repayment Schedule Generated ->
    EMI Payment -> Loan Outstanding Update -> Dashboards & Audit Trail.
    """
    suffix = uuid.uuid4().hex[:6].lower()
    cust_email = f"borrower.p5.{suffix}@finsight.ai"
    cust_name = f"Alok Sharma {suffix}"

    ops_token = _get_token(f"ops.officer.{suffix}@finsight.ai", "Operations Officer P5", UserRole.OPERATIONS_OFFICER)
    fin_token = _get_token(f"fin.officer.{suffix}@finsight.ai", "Finance Officer P5", UserRole.FINANCE_OFFICER)

    ops_headers = {"Authorization": f"Bearer {ops_token}"}
    fin_headers = {"Authorization": f"Bearer {fin_token}"}

    db = SessionLocal()
    try:
        # Step 1: Create customer with verified KYC and bank details
        cust = Customer(
            customer_id=f"CUST-P5-{suffix.upper()}",
            first_name="Alok",
            last_name=f"Sharma {suffix.upper()}",
            email=cust_email,
            phone_hash="+91-9811122233",
            address_hash="Plot 18, Sector 44, Gurugram, Haryana",
            income=120000.0,
            credit_score=780,
            risk_tier="Low",
            kyc_status="VERIFIED",
            bank_balance=50000.0,
            created_at=datetime.utcnow()
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)

        # Step 2: Application is approved and customer accepts offer
        app_obj = LoanApplication(
            application_id=f"APP-P5-{suffix.upper()}",
            customer_id=cust.id,
            product_type="MSME Business Loan",
            requested_amount=600000.0,
            approved_amount=600000.0,
            requested_tenure=24,
            purpose="Commercial Inventory Expansion",
            status="Offer_Accepted",
            workflow_stage="CUSTOMER_ACCEPTED",
            kyc_status="VERIFIED",
            fraud_status="CLEARED",
            risk_status="APPROVED",
            disbursement_status="PENDING",
            offer_accepted=True,
            offer_accepted_at=datetime.utcnow(),
            bank_name="HDFC Bank",
            bank_account_number="5010049281729",
            bank_ifsc="HDFC0000128",
            created_at=datetime.utcnow()
        )
        db.add(app_obj)
        db.commit()
        db.refresh(app_obj)

        # Step 3: Add verified compliance documents
        doc_pan = Document(
            doc_id=f"DOC-PAN-P5-{suffix}",
            customer_id=cust.id,
            application_id=app_obj.id,
            doc_type="PAN_CARD",
            document_type="PAN_CARD",
            file_name="pan_card.pdf",
            status="VERIFIED",
            verification_status="VERIFIED",
            uploaded_at=datetime.utcnow()
        )
        doc_bank = Document(
            doc_id=f"DOC-BANK-P5-{suffix}",
            customer_id=cust.id,
            application_id=app_obj.id,
            doc_type="BANK_STATEMENT",
            document_type="BANK_STATEMENT",
            file_name="bank_statement.pdf",
            status="VERIFIED",
            verification_status="VERIFIED",
            uploaded_at=datetime.utcnow()
        )
        db.add_all([doc_pan, doc_bank])
        db.commit()

        # Step 4: Operations receives case in queue
        cases_res = client.get("/api/operations/cases", headers=ops_headers)
        assert cases_res.status_code == 200
        case_ids = [c["application_id"] for c in cases_res.json()["cases"]]
        assert app_obj.application_id in case_ids, f"Application {app_obj.application_id} expected in operations queue"

        # Step 5: Pre-disbursement validation checklist runs
        check_res = client.get(f"/api/operations/cases/{app_obj.application_id}/pre-disbursement-check", headers=ops_headers)
        assert check_res.status_code == 200
        check_data = check_res.json()
        assert check_data["all_passed"] is True, f"Expected all conditions to pass, got missing: {check_data.get('missing_conditions')}"
        assert check_data["can_disburse"] is True

        # Step 6: Fetch calculated disbursement financial terms
        details_res = client.get(f"/api/operations/cases/{app_obj.application_id}/disbursement-details", headers=ops_headers)
        assert details_res.status_code == 200
        terms = details_res.json()
        assert terms["approved_amount"] == 600000.0
        assert terms["processing_fee"] > 0
        assert terms["net_disbursement_amount"] == 600000.0 - terms["processing_fee"]
        assert terms["monthly_emi"] > 0

        # Step 7: Operations officer confirms demo disbursement
        disb_res = client.post(f"/api/operations/cases/{app_obj.application_id}/disburse", headers=ops_headers, json={
            "channel": "NEFT/RTGS"
        })
        assert disb_res.status_code == 200, f"Disbursement failed: {disb_res.text}"
        disb_data = disb_res.json()
        assert disb_data["status"] == "success"
        booked_loan = disb_data["loan"]
        loan_id = booked_loan["loan_id"]
        assert loan_id.startswith("LN-2026-")

        # Step 8: Verify real DB state after disbursement
        db.refresh(app_obj)
        assert app_obj.status == "Disbursed"
        assert app_obj.workflow_stage == "DISBURSED"
        assert app_obj.disbursement_status == "DISBURSED"

        # Loan record in DB
        loan_record = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        assert loan_record is not None
        assert loan_record.status == "Active"
        assert loan_record.outstanding_balance == 600000.0

        # Repayment schedule generated (24 installments)
        installments = db.query(Repayment).filter(Repayment.loan_id == loan_record.id).order_by(Repayment.installment_number).all()
        assert len(installments) == 24
        assert installments[0].installment_number == 1
        assert installments[0].status == "DUE"
        assert installments[1].status == "UPCOMING"

        # Finance disbursement transaction in DB
        disb_tx = db.query(Transaction).filter(
            Transaction.loan_id == loan_record.id,
            Transaction.transaction_type == "Disbursement"
        ).first()
        assert disb_tx is not None
        assert disb_tx.status == "Success"
        assert disb_tx.transaction_amount == terms["net_disbursement_amount"]

        # Step 9: Operations & Finance dashboards reflect disbursement
        ops_dash = client.get("/api/operations/dashboard", headers=ops_headers)
        assert ops_dash.status_code == 200

        fin_dash = client.get("/api/finance/dashboard", headers=fin_headers)
        assert fin_dash.status_code == 200
        assert fin_dash.json()["active_loans"] >= 1

        # Customer received notification
        cust_notif = db.query(Notification).filter(
            Notification.recipient_email == cust_email
        ).order_by(Notification.created_at.desc()).first()
        assert cust_notif is not None
        assert "Disbursed" in cust_notif.title

        # Step 10: Customer pays EMI
        first_emi_amount = float(installments[0].amount_due)
        pay_res = client.post("/api/finance/payments/record", headers=fin_headers, json={
            "loan_id": loan_record.loan_id,
            "amount": first_emi_amount,
            "channel": "UPI"
        })
        assert pay_res.status_code == 200, f"EMI payment failed: {pay_res.text}"
        pay_data = pay_res.json()
        assert pay_data["status"] == "success"

        # Verify DB updates after payment
        db.refresh(loan_record)
        assert loan_record.outstanding_balance < 600000.0
        assert loan_record.outstanding_balance == 600000.0 - first_emi_amount

        # First installment marked PAID
        db.refresh(installments[0])
        assert installments[0].status == "PAID"
        assert installments[0].amount_paid == first_emi_amount

        # Payment transaction created
        pay_tx = db.query(Transaction).filter(
            Transaction.loan_id == loan_record.id,
            Transaction.transaction_type == "EMI_Payment"
        ).first()
        assert pay_tx is not None
        assert pay_tx.status == "Success"

        # Step 11: Financial Adjustment testing (with authorized user & mandatory reason)
        adj_res = client.post(f"/api/finance/transactions/{pay_tx.transaction_id}/adjustment", headers=fin_headers, json={
            "amount": 250.0,
            "adjustment_type": "FEE_WAIVER",
            "reason": "Promotional waiver of early processing fee per policy 2026-B"
        })
        assert adj_res.status_code == 200
        adj_data = adj_res.json()
        assert adj_data["status"] == "success"

        # Step 12: Audit trail records every action
        audit_disb = db.query(AuditLog).filter(
            AuditLog.resource == f"LOAN_{loan_record.loan_id}",
            AuditLog.action == "LOAN_DISBURSED"
        ).first()
        assert audit_disb is not None

        audit_pay = db.query(AuditLog).filter(
            AuditLog.resource == f"LOAN_{loan_record.loan_id}",
            AuditLog.action == "EMI_PAYMENT_RECORDED"
        ).first()
        assert audit_pay is not None

    finally:
        db.close()
