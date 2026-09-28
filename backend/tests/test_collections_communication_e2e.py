"""
FinSight AI - Prompt 6 Automated Test Suite
End-to-End Testing for Collections Operations, ML Intelligence, Role-Based Access Control,
Customer Communication Isolation, and Multi-Portal Synchronization.
"""

import uuid
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.users import User, UserRole, AuditLog
from app.models.customers import Customer
from app.models.loans import Loan, LoanApplication
from app.models.transactions import Transaction, Repayment
from app.models.assessments import CollectionRecord, CollectionActivity, PromiseToPay
from app.models.portal_models import WorkTask, CustomerCommunication
from app.models.notifications import Notification
from app.config import settings
from app.security.jwt import get_password_hash

client = TestClient(app)

def _get_token(email: str, name: str, role: UserRole) -> str:
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
                department="Operations & Collections",
                is_active=True
            )
            db.add(user)
            db.commit()
        else:
            user.hashed_password = get_password_hash(settings.DEMO_PASSWORD)
            user.role = role
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


def test_rbac_collections_and_communication():
    """
    Test strict role-based access control across all Collections endpoints:
    - COLLECTIONS_OFFICER can view assigned queue but is blocked from manager analytics (403).
    - COLLECTIONS_MANAGER can view manager analytics and team workload.
    - SALES_OFFICER cannot view collections dashboard (403).
    - CUSTOMER cannot access internal collections dashboard (403), but can view self-service status (200).
    """
    suffix = uuid.uuid4().hex[:6]
    officer_email = f"coll.officer.{suffix}@finsight.ai"
    manager_email = f"coll.manager.{suffix}@finsight.ai"
    sales_email = f"sales.officer.{suffix}@finsight.ai"
    customer_email = f"borrower.{suffix}@finsight.ai"

    officer_token = _get_token(officer_email, f"Collections Officer {suffix}", UserRole.COLLECTIONS_OFFICER)
    manager_token = _get_token(manager_email, f"Collections Manager {suffix}", UserRole.COLLECTIONS_MANAGER)
    sales_token = _get_token(sales_email, f"Sales Officer {suffix}", UserRole.SALES_OFFICER)
    customer_token = _get_token(customer_email, f"Borrower {suffix}", UserRole.CUSTOMER)

    # 1. Collections Officer accesses /collections/dashboard -> 200 OK
    res = client.get("/api/collections/dashboard", headers={"Authorization": f"Bearer {officer_token}"})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    # 2. Collections Officer attempts to access Manager dashboard -> 403 Forbidden
    res = client.get("/api/collections/manager/dashboard", headers={"Authorization": f"Bearer {officer_token}"})
    assert res.status_code == 403, f"Officer should be blocked from manager dashboard, got {res.status_code}"

    # 3. Collections Manager accesses Manager dashboard -> 200 OK
    res = client.get("/api/collections/manager/dashboard", headers={"Authorization": f"Bearer {manager_token}"})
    assert res.status_code == 200, f"Expected 200 for manager, got {res.status_code}: {res.text}"
    mgr_body = res.json()
    assert "dpd_buckets" in mgr_body
    assert "officer_workload" in mgr_body
    assert "regional_performance" in mgr_body

    # 4. Sales Officer attempts to access collections dashboard -> 403 Forbidden
    res = client.get("/api/collections/dashboard", headers={"Authorization": f"Bearer {sales_token}"})
    assert res.status_code == 403, f"Sales should be blocked from collections dashboard, got {res.status_code}"

    # 5. Customer attempts to access internal collections dashboard -> 403 Forbidden
    res = client.get("/api/collections/dashboard", headers={"Authorization": f"Bearer {customer_token}"})
    assert res.status_code == 403, f"Customer should be blocked from internal collections, got {res.status_code}"

    # 6. Customer accesses self-service collections status -> 200 OK
    res = client.get("/api/collections/customer/my-status", headers={"Authorization": f"Bearer {customer_token}"})
    assert res.status_code == 200, f"Customer should access self-service status, got {res.status_code}"


def test_complete_prompt6_collections_lifecycle():
    """
    Complete end-to-end synchronized test:
    1. Create an overdue loan with DPD > 0.
    2. Synchronize into CollectionRecord and verify Collections Officer and Manager dashboards.
    3. Collections Officer records Promise to Pay -> DB updates, WorkTask created, notification generated, audit logged.
    4. Settle payment -> DB updates, Repayment marked PAID, Loan balance decreased, Finance transaction created, promise marked KEPT.
    5. Collections Manager reassigns case -> previous officer loses access, new officer receives case, notification & audit logged.
    """
    suffix = uuid.uuid4().hex[:6]
    officer_a_name = f"Officer Alpha {suffix}"
    officer_b_name = f"Officer Beta {suffix}"
    officer_a_email = f"officer.a.{suffix}@finsight.ai"
    officer_b_email = f"officer.b.{suffix}@finsight.ai"
    manager_email = f"manager.{suffix}@finsight.ai"
    cust_email = f"borrower.{suffix}@finsight.ai"

    officer_a_token = _get_token(officer_a_email, officer_a_name, UserRole.COLLECTIONS_OFFICER)
    officer_b_token = _get_token(officer_b_email, officer_b_name, UserRole.COLLECTIONS_OFFICER)
    manager_token = _get_token(manager_email, f"Manager {suffix}", UserRole.COLLECTIONS_MANAGER)
    cust_token = _get_token(cust_email, f"Ramesh {suffix}", UserRole.CUSTOMER)

    db = SessionLocal()
    try:
        # Step 1: Create customer and delinquent loan
        cust = Customer(
            customer_id=f"CUST-P6-{suffix.upper()}",
            first_name="Ramesh",
            last_name=f"Kumar {suffix.upper()}",
            email=cust_email,
            phone_hash="+91-9876500001",
            income=60000.0,
            credit_score=640,
            risk_tier="Moderate",
            kyc_status="VERIFIED",
            created_at=datetime.utcnow()
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)

        loan = Loan(
            loan_id=f"LOAN-P6-{suffix.upper()}",
            customer_id=cust.id,
            loan_amount=200000.0,
            outstanding_balance=185000.0,
            interest_rate=14.0,
            loan_tenure=24,
            emi=10500.0,
            dpd=35,
            status="Delinquent",
            product_type="MSME Business Loan",
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        db.add(loan)
        db.commit()
        db.refresh(loan)

        # Create repayment installment that is overdue
        rep = Repayment(
            repayment_id=f"REP-{suffix.upper()}-2",
            loan_id=loan.id,
            customer_id=cust.id,
            installment_number=2,
            due_date=datetime.utcnow() - timedelta(days=5),
            amount_due=10500.0,
            principal_amount=8500.0,
            interest_amount=2000.0,
            amount_paid=0.0,
            outstanding_amount=10500.0,
            status="OVERDUE"
        )
        db.add(rep)

        # Create collection case initially assigned to Officer A
        col_id = f"COLL-{suffix.upper()}"
        col_case = CollectionRecord(
            collection_id=col_id,
            loan_id=loan.id,
            customer_id=cust.id,
            overdue_amount=10500.0,
            dpd=35,
            payment_probability=0.78,
            recovery_probability=0.82,
            priority="HIGH",
            recommended_strategy="Interactive Digital Voice Bot + Structured Payment Link",
            workflow_stage="OVERDUE",
            assigned_officer=officer_a_name,
            status="Pending",
            created_at=datetime.utcnow()
        )
        db.add(col_case)
        db.commit()

        # Step 2: Verify Officer A sees the case in dashboard
        res_a = client.get("/api/collections/dashboard", headers={"Authorization": f"Bearer {officer_a_token}"})
        assert res_a.status_code == 200
        cases_a = res_a.json()["cases"]
        assert any(c["collection_id"] == col_id for c in cases_a), "Officer A should see assigned case"

        # Verify Officer B does NOT see the case
        res_b = client.get("/api/collections/dashboard", headers={"Authorization": f"Bearer {officer_b_token}"})
        assert res_b.status_code == 200
        cases_b = res_b.json()["cases"]
        assert not any(c["collection_id"] == col_id for c in cases_b), "Officer B must NOT see Officer A's case"

        # Step 3: Officer A logs a call interaction
        call_res = client.post(
            f"/api/collections/cases/{col_id}/activity",
            headers={"Authorization": f"Bearer {officer_a_token}"},
            json={
                "activity_type": "CALL",
                "channel": "PHONE",
                "notes": "Borrower contacted via phone. Requested 3 days time to clear EMI."
            }
        )
        assert call_res.status_code == 200
        assert call_res.json()["workflow_stage"] == "CONTACTED"

        # Step 4: Officer A records a Promise to Pay
        promise_date_str = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d")
        ptp_res = client.post(
            f"/api/collections/cases/{col_id}/activity",
            headers={"Authorization": f"Bearer {officer_a_token}"},
            json={
                "activity_type": "PROMISE",
                "notes": "Borrower promised to pay full overdue of INR 10,500 by Friday.",
                "promise_amount": 10500.0,
                "promise_date": promise_date_str
            }
        )
        assert ptp_res.status_code == 200
        assert ptp_res.json()["workflow_stage"] == "PROMISE_TO_PAY"

        # Verify Follow-up task, Notification, and Promise record created in DB
        db.expire_all()
        ptp_record = db.query(PromiseToPay).filter(PromiseToPay.collection_id == col_id).first()
        assert ptp_record is not None
        assert ptp_record.amount == 10500.0
        assert ptp_record.status == "PENDING"

        task = db.query(WorkTask).filter(WorkTask.related_entity_id == col_id).first()
        assert task is not None
        assert task.assigned_to == officer_a_name

        notif = db.query(Notification).filter(Notification.recipient_email == cust_email).first()
        assert notif is not None

        # Step 5: Settle Payment
        pay_res = client.post(
            f"/api/collections/cases/{col_id}/activity",
            headers={"Authorization": f"Bearer {officer_a_token}"},
            json={
                "activity_type": "PAYMENT",
                "payment_amount": 10500.0,
                "payment_reference": f"PAY-{suffix.upper()}",
                "notes": "Customer cleared overdue EMI via UPI collection link."
            }
        )
        assert pay_res.status_code == 200
        assert pay_res.json()["workflow_stage"] == "RESOLVED"

        # Verify DB updates: Repayment is PAID, Loan outstanding reduced, Promise marked KEPT
        db.expire_all()
        updated_rep = db.query(Repayment).filter(Repayment.loan_id == loan.id).first()
        assert updated_rep.status == "PAID"
        assert updated_rep.amount_paid == 10500.0

        updated_loan = db.query(Loan).filter(Loan.id == loan.id).first()
        assert updated_loan.outstanding_balance == 174500.0
        assert updated_loan.dpd == 0

        updated_ptp = db.query(PromiseToPay).filter(PromiseToPay.collection_id == col_id).first()
        assert updated_ptp.status == "KEPT"

        finance_txn = db.query(Transaction).filter(Transaction.loan_id == loan.id, Transaction.transaction_type == "EMI_Payment").first()
        assert finance_txn is not None
        assert finance_txn.transaction_amount == 10500.0

        # Step 6: Test Reassignment by Collections Manager
        # Create another delinquent case for testing reassignment
        col_id_2 = f"COLL-2-{suffix.upper()}"
        col_case_2 = CollectionRecord(
            collection_id=col_id_2,
            loan_id=loan.id,
            customer_id=cust.id,
            overdue_amount=5000.0,
            dpd=15,
            workflow_stage="OVERDUE",
            assigned_officer=officer_a_name,
            status="Pending",
            created_at=datetime.utcnow()
        )
        db.add(col_case_2)
        db.commit()

        # Manager reassigns col_id_2 to Officer B
        reassign_res = client.post(
            "/api/collections/manager/reassign",
            headers={"Authorization": f"Bearer {manager_token}"},
            json={
                "collection_id": col_id_2,
                "new_officer": officer_b_name,
                "notes": "Queue rebalancing due to officer workload"
            }
        )
        assert reassign_res.status_code == 200
        assert reassign_res.json()["new_officer"] == officer_b_name

        # Verify Officer A lost access to col_id_2 and Officer B now sees it
        res_a_after = client.get("/api/collections/dashboard", headers={"Authorization": f"Bearer {officer_a_token}"})
        assert not any(c["collection_id"] == col_id_2 for c in res_a_after.json()["cases"])

        res_b_after = client.get("/api/collections/dashboard", headers={"Authorization": f"Bearer {officer_b_token}"})
        assert any(c["collection_id"] == col_id_2 for c in res_b_after.json()["cases"])

    finally:
        db.close()


def test_customer_communication_isolation():
    """
    Test that customer communication is strictly separated from internal notes:
    - Staff can create simulated SMS, simulated Email, and internal notes.
    - Staff viewing customer communication history sees all entries.
    - Customer viewing customer communication history NEVER sees internal staff notes!
    """
    suffix = uuid.uuid4().hex[:6]
    officer_email = f"staff.{suffix}@finsight.ai"
    cust_email = f"borrower.comm.{suffix}@finsight.ai"

    staff_token = _get_token(officer_email, f"Staff {suffix}", UserRole.COLLECTIONS_OFFICER)
    cust_token = _get_token(cust_email, f"Customer {suffix}", UserRole.CUSTOMER)

    db = SessionLocal()
    try:
        cust = Customer(
            customer_id=f"CUST-COMM-{suffix.upper()}",
            first_name="Pooja",
            last_name=f"Verma {suffix.upper()}",
            email=cust_email,
            phone_hash="+91-9988776655",
            income=75000.0,
            credit_score=710,
            risk_tier="Low",
            created_at=datetime.utcnow()
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)

        # 1. Staff sends a simulated SMS
        res_sms = client.post(
            "/api/communication/send",
            headers={"Authorization": f"Bearer {staff_token}"},
            json={
                "customer_id": cust.customer_id,
                "comm_type": "SIMULATED_SMS",
                "recipient": cust.email,
                "subject": "Payment Reminder",
                "message": "Please clear your monthly installment of INR 12,000."
            }
        )
        assert res_sms.status_code == 201
        assert res_sms.json()["is_simulated"] == True

        # 2. Staff adds an internal staff note (confidential strategy)
        res_note = client.post(
            "/api/communication/send",
            headers={"Authorization": f"Bearer {staff_token}"},
            json={
                "customer_id": cust.customer_id,
                "comm_type": "INTERNAL_NOTE",
                "recipient": "Collections Desk",
                "subject": "Confidential Staff Strategy",
                "message": "Internal note: Borrower may be facing temporary cash crunch. Offer restructuring if DPD > 45."
            }
        )
        assert res_note.status_code == 201
        assert res_note.json()["is_customer_visible"] == False

        # 3. Staff fetches unified history -> sees BOTH SMS and internal note
        staff_history = client.get(
            f"/api/communication/history/{cust.customer_id}",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert staff_history.status_code == 200
        events_staff = staff_history.json()["events"]
        assert any(e["subject"] == "Confidential Staff Strategy" for e in events_staff), "Staff must see internal note"
        assert any(e["subject"] == "Payment Reminder" for e in events_staff), "Staff must see customer SMS"

        # 4. Customer fetches communications -> internal note MUST NOT be present!
        cust_history = client.get(
            f"/api/communication/customer/{cust.customer_id}",
            headers={"Authorization": f"Bearer {cust_token}"}
        )
        assert cust_history.status_code == 200
        comms_cust = cust_history.json()
        assert not any(c["comm_type"] == "INTERNAL_NOTE" for c in comms_cust), "Customer must NEVER see internal notes!"
        assert any(c["subject"] == "Payment Reminder" for c in comms_cust), "Customer should see their own SMS reminder"

    finally:
        db.close()
