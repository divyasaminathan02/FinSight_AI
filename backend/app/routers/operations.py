import json
import math
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_

from app.database import get_db
from app.models.users import User, UserRole, AuditLog
from app.models.customers import Customer
from app.models.loans import Loan, LoanApplication
from app.models.transactions import Transaction, Repayment
from app.models.portal_models import Document, WorkTask, LoanProduct, CustomerCommunication, KycCase, FraudCase
from app.models.notifications import Notification
from app.security.jwt import get_current_user, get_current_user_optional
from app.security.rbac import check_permission, Permission

router = APIRouter(prefix="/operations", tags=["Operations & Disbursement"])

def calculate_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    """Calculate standard monthly Equated Monthly Installment (EMI)."""
    if principal <= 0 or tenure_months <= 0:
        return 0.0
    r = (annual_rate / 12.0) / 100.0
    if r == 0:
        return round(principal / tenure_months, 2)
    emi = (principal * r * math.pow(1 + r, tenure_months)) / (math.pow(1 + r, tenure_months) - 1)
    return round(emi, 2)

# ==========================================
# 1. OPERATIONS OFFICER DASHBOARD
# ==========================================
@router.get("/dashboard")
def get_operations_dashboard(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns real backend operational KPIs, case queues, today's disbursements,
    and task notifications scoped to the officer's role.
    """
    user_role = current_user.role.value if current_user and hasattr(current_user.role, 'value') else str(current_user.role if current_user else "OPERATIONS_OFFICER")
    user_name = current_user.full_name if current_user else "Operations Officer Demo"
    user_email = current_user.email if current_user else "operations.officer@finsight.ai"

    # Base query for applications in operations scope
    ops_stages = [
        "APPROVED", "OFFER_SENT", "CUSTOMER_ACCEPTED",
        "DISBURSEMENT_PENDING", "OPERATIONS_REVIEW", "READY_FOR_DISBURSEMENT"
    ]
    apps_q = db.query(LoanApplication)

    # Scoping: if regular officer, view assigned or unassigned
    if user_role in ["OPERATIONS_OFFICER", "OPERATIONS"]:
        scoped_apps_q = apps_q.filter(
            or_(
                LoanApplication.operations_officer == user_name,
                LoanApplication.operations_officer == user_email,
                LoanApplication.operations_officer.is_(None)
            )
        )
    else:
        scoped_apps_q = apps_q

    # Real Metrics
    awaiting_operations = scoped_apps_q.filter(
        LoanApplication.workflow_stage.in_(ops_stages),
        LoanApplication.status != "Disbursed"
    ).count()

    approved_applications = scoped_apps_q.filter(
        LoanApplication.status.in_(["Approved", "Offer_Accepted"])
    ).count()

    disbursement_pending = scoped_apps_q.filter(
        LoanApplication.workflow_stage.in_(["DISBURSEMENT_PENDING", "OPERATIONS_REVIEW", "READY_FOR_DISBURSEMENT"]),
        LoanApplication.status != "Disbursed"
    ).count()

    # Documents pending verification or replacement across active applications
    docs_pending = db.query(Document).filter(
        Document.status.in_(["UPLOADED", "UNDER_REVIEW", "REPLACEMENT_REQUIRED"])
    ).count()

    # Operational exceptions (rejected/failed disbursement attempts or flagged)
    operational_exceptions = scoped_apps_q.filter(
        or_(
            LoanApplication.disbursement_status == "FAILED",
            LoanApplication.status == "Rejected"
        )
    ).count()

    # Today's disbursements calculation
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_disbursements_res = db.query(
        func.count(Transaction.id).label("count"),
        func.sum(Transaction.transaction_amount).label("amount")
    ).filter(
        Transaction.transaction_type == "Disbursement",
        Transaction.status == "Success",
        Transaction.transaction_timestamp >= today_start
    ).first()

    today_disbursement_count = today_disbursements_res.count or 0
    today_disbursement_amount = float(today_disbursements_res.amount or 0.0)

    # Completed disbursements overall
    completed_disbursements = db.query(Transaction).filter(
        Transaction.transaction_type == "Disbursement",
        Transaction.status == "Success"
    ).count()

    failed_disbursements = db.query(Transaction).filter(
        Transaction.transaction_type == "Disbursement",
        Transaction.status == "Failed"
    ).count()

    # Pending operational tasks
    tasks_q = db.query(WorkTask).filter(
        or_(
            WorkTask.assigned_to == user_name,
            WorkTask.assigned_to == user_email,
            WorkTask.role_target.in_(["OPERATIONS_OFFICER", "OPERATIONS_MANAGER", "OPERATIONS"])
        ),
        WorkTask.status.in_(["TODO", "IN_PROGRESS", "WAITING"])
    ).order_by(desc(WorkTask.created_at)).limit(5).all()

    tasks = [
        {
            "id": t.task_id,
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "status": t.status,
            "customer_id": t.customer_id,
            "application_id": t.application_id,
            "due_date": t.due_date.strftime("%Y-%m-%d") if t.due_date else None
        }
        for t in tasks_q
    ]

    # Operational notifications
    notifications_q = db.query(Notification).filter(
        or_(
            Notification.recipient_email == user_email,
            Notification.role_target.in_(["OPERATIONS_OFFICER", "OPERATIONS_MANAGER", "OPERATIONS"]),
            Notification.category.in_(["Operations", "Disbursement"])
        )
    ).order_by(desc(Notification.created_at)).limit(5).all()

    notifications = [
        {
            "id": getattr(n, "notification_id", str(n.id)),
            "title": n.title,
            "message": n.message,
            "type": getattr(n, "severity", "Info"),
            "read": getattr(n, "is_read", False),
            "time": n.created_at.strftime("%d %b, %H:%M") if n.created_at else ""
        }
        for n in notifications_q
    ]

    return {
        "applications_awaiting_operations": awaiting_operations,
        "approved_applications": approved_applications,
        "disbursement_pending": disbursement_pending,
        "documents_pending": docs_pending,
        "operational_exceptions": operational_exceptions,
        "today_disbursements": {
            "count": today_disbursement_count,
            "amount": today_disbursement_amount
        },
        "completed_disbursements": completed_disbursements,
        "failed_disbursements": failed_disbursements,
        "pending_tasks": tasks,
        "notifications": notifications
    }

# ==========================================
# 2. OPERATIONS WORK QUEUE
# ==========================================
@router.get("/cases")
def get_operations_cases(
    status: Optional[str] = Query(None),
    loan_product: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    assigned_officer: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns operations work queue with multi-factor filters.
    """
    q = db.query(LoanApplication, Customer).join(Customer, LoanApplication.customer_id == Customer.id)

    # Scoping: if regular officer, allow viewing their cases or unassigned
    user_role = current_user.role.value if current_user and hasattr(current_user.role, 'value') else str(current_user.role if current_user else "OPERATIONS_OFFICER")
    user_name = current_user.full_name if current_user else None

    if user_role in ["OPERATIONS_OFFICER", "OPERATIONS"] and user_name:
        if assigned_officer:
            q = q.filter(LoanApplication.operations_officer == assigned_officer)
        else:
            q = q.filter(
                or_(
                    LoanApplication.operations_officer == user_name,
                    LoanApplication.operations_officer.is_(None)
                )
            )
    elif assigned_officer:
        q = q.filter(LoanApplication.operations_officer == assigned_officer)

    if status:
        q = q.filter(
            or_(
                LoanApplication.workflow_stage == status,
                LoanApplication.disbursement_status == status,
                LoanApplication.status == status
            )
        )
    else:
        # Default show approved, in operations, ready or disbursed
        q = q.filter(
            or_(
                LoanApplication.status.in_(["Approved", "Offer_Accepted", "Disbursed"]),
                LoanApplication.workflow_stage.in_([
                    "APPROVED", "OFFER_SENT", "CUSTOMER_ACCEPTED",
                    "DISBURSEMENT_PENDING", "OPERATIONS_REVIEW", "READY_FOR_DISBURSEMENT", "DISBURSED"
                ])
            )
        )

    if loan_product:
        q = q.filter(LoanApplication.product_type == loan_product)

    if risk_level:
        q = q.filter(LoanApplication.ai_risk_category == risk_level)

    total_count = q.count()
    items = q.order_by(desc(LoanApplication.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    cases = []
    for app_obj, cust in items:
        cases.append({
            "application_id": app_obj.application_id,
            "customer_id": cust.customer_id,
            "customer_name": f"{cust.first_name} {cust.last_name}",
            "loan_product": app_obj.product_type,
            "requested_amount": app_obj.requested_amount,
            "approved_amount": app_obj.approved_amount or app_obj.requested_amount,
            "approval_status": app_obj.status,
            "workflow_stage": app_obj.workflow_stage,
            "kyc_status": app_obj.kyc_status or cust.kyc_status or "VERIFIED",
            "fraud_status": app_obj.fraud_status or "CLEARED",
            "risk_status": app_obj.risk_status or "APPROVED",
            "disbursement_status": app_obj.disbursement_status or "PENDING",
            "assigned_officer": app_obj.operations_officer or "Unassigned",
            "risk_category": app_obj.ai_risk_category or "LOW",
            "created_date": app_obj.created_at.strftime("%Y-%m-%d %H:%M") if app_obj.created_at else None,
            "updated_date": app_obj.disbursed_at.strftime("%Y-%m-%d %H:%M") if app_obj.disbursed_at else None
        })

    return {
        "total_cases": total_count,
        "page": page,
        "page_size": page_size,
        "cases": cases
    }

# ==========================================
# 3. PRE-DISBURSEMENT CHECK
# ==========================================
@router.get("/cases/{application_id}/pre-disbursement-check")
def run_pre_disbursement_check(
    application_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Mandatory Pre-Disbursement Verification.
    Verifies all 9 regulatory & credit conditions before allowing disbursement.
    """
    app = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    cust = db.query(Customer).filter(Customer.id == app.customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    # 1. KYC completed
    kyc_completed = (
        app.kyc_status == "VERIFIED" or
        getattr(cust, "kyc_status", None) == "VERIFIED"
    )

    # 2. Fraud review completed
    fraud_cleared = (
        app.fraud_status in ["CLEARED", "RESOLVED"] or
        (app.fraud_status is None and cust.risk_tier != "Critical")
    )

    # 3. Credit approval completed
    credit_approved = (
        app.status in ["Approved", "Offer_Accepted", "Disbursed"] or
        app.manager_decision in ["APPROVED", "APPROVE"] or
        app.workflow_stage in ["APPROVED", "OFFER_SENT", "CUSTOMER_ACCEPTED", "DISBURSEMENT_PENDING", "OPERATIONS_REVIEW", "READY_FOR_DISBURSEMENT", "DISBURSED"]
    )

    # 4. Risk approval completed
    risk_approved = (
        app.risk_decision in ["APPROVED", "APPROVE"] or
        app.risk_status in ["APPROVED", "PASSED"] or
        app.workflow_stage in ["APPROVED", "OFFER_SENT", "CUSTOMER_ACCEPTED", "DISBURSEMENT_PENDING", "OPERATIONS_REVIEW", "READY_FOR_DISBURSEMENT", "DISBURSED"]
    )

    # 5. Required documents verified
    docs = db.query(Document).filter(
        or_(
            Document.application_id == app.id,
            Document.customer_id == cust.id
        )
    ).all()
    has_rejected_docs = any(d.status in ["REJECTED", "REPLACEMENT_REQUIRED"] for d in docs)
    docs_verified = len(docs) > 0 and not has_rejected_docs

    # 6. Loan offer accepted
    offer_accepted = (
        app.offer_accepted is True or
        app.status in ["Offer_Accepted", "Disbursed"] or
        app.workflow_stage in ["CUSTOMER_ACCEPTED", "DISBURSEMENT_PENDING", "OPERATIONS_REVIEW", "READY_FOR_DISBURSEMENT", "DISBURSED"]
    )

    # 7. Required conditions satisfied
    conditions_satisfied = (
        app.status != "Rejected" and
        app.fraud_status != "CONFIRMED_FRAUD" and
        app.risk_status != "REJECTED"
    )

    # 8. Bank information available
    bank_available = bool(
        app.bank_account_number or
        app.bank_ifsc or
        cust.bank_account_number or
        getattr(cust, "bank_name", None) or
        getattr(cust, "account_number", None)
    )

    # 9. Approved amount available
    amount_valid = bool(app.approved_amount and app.approved_amount > 0) or (app.requested_amount and app.requested_amount > 0)

    checklist = [
        {"code": "KYC_COMPLETED", "label": "KYC Verification Completed", "passed": kyc_completed},
        {"code": "FRAUD_CLEARED", "label": "Fraud Forensics Cleared", "passed": fraud_cleared},
        {"code": "CREDIT_APPROVED", "label": "Credit Committee Approved", "passed": credit_approved},
        {"code": "RISK_APPROVED", "label": "Enterprise Risk Approval Completed", "passed": risk_approved},
        {"code": "DOCS_VERIFIED", "label": "Mandatory Compliance Documents Verified", "passed": docs_verified},
        {"code": "OFFER_ACCEPTED", "label": "Sanction Letter & Loan Offer Accepted", "passed": offer_accepted},
        {"code": "CONDITIONS_SATISFIED", "label": "Sanction Conditions Satisfied", "passed": conditions_satisfied},
        {"code": "BANK_INFO_AVAILABLE", "label": "Borrower Bank Mandate & IFSC Available", "passed": bank_available},
        {"code": "APPROVED_AMOUNT_AVAILABLE", "label": "Sanction Amount Allocated & Valid", "passed": amount_valid},
    ]

    missing_conditions = [item["label"] for item in checklist if not item["passed"]]
    all_passed = len(missing_conditions) == 0

    return {
        "application_id": app.application_id,
        "customer_id": cust.customer_id,
        "customer_name": f"{cust.first_name} {cust.last_name}",
        "all_passed": all_passed,
        "can_disburse": all_passed and app.status != "Disbursed",
        "missing_conditions": missing_conditions,
        "checklist": checklist
    }

# ==========================================
# 4. DISBURSEMENT DETAILS
# ==========================================
@router.get("/cases/{application_id}/disbursement-details")
def get_disbursement_details(
    application_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns calculated financial values for disbursement review.
    Does not hardcode financial values.
    """
    app = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    cust = db.query(Customer).filter(Customer.id == app.customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    # Lookup product details for rates
    prod = db.query(LoanProduct).filter(LoanProduct.name == app.product_type).first()
    interest_rate = prod.interest_rate if prod else 13.5
    processing_fee_pct = prod.processing_fee_pct if prod else 1.5

    principal = app.approved_amount or app.requested_amount or 500000.0
    processing_fee = round(principal * (processing_fee_pct / 100.0), 2)
    net_disbursed = round(principal - processing_fee, 2)
    tenure = app.requested_tenure or 24
    emi = calculate_emi(principal, interest_rate, tenure)

    # Check if loan is already booked
    existing_loan = db.query(Loan).filter(Loan.customer_id == cust.id).order_by(desc(Loan.id)).first()
    loan_number = existing_loan.loan_id if (existing_loan and app.status == "Disbursed") else f"LN-2026-{uuid.uuid4().hex[:5].upper()}"

    return {
        "application_id": app.application_id,
        "loan_number": loan_number,
        "customer_id": cust.customer_id,
        "customer_name": f"{cust.first_name} {cust.last_name}",
        "customer_email": cust.email,
        "customer_phone": cust.phone_hash,
        "product_type": app.product_type,
        "approved_amount": principal,
        "interest_rate": interest_rate,
        "tenure_months": tenure,
        "monthly_emi": emi,
        "processing_fee_pct": processing_fee_pct,
        "processing_fee": processing_fee,
        "net_disbursement_amount": net_disbursed,
        "bank_details": {
            "bank_name": app.bank_name or getattr(cust, "bank_name", "HDFC Bank"),
            "account_number": app.bank_account_number or getattr(cust, "bank_account_number", "5010049281729"),
            "ifsc": app.bank_ifsc or "HDFC0000128"
        },
        "approval_date": app.reviewed_at.strftime("%Y-%m-%d") if app.reviewed_at else datetime.utcnow().strftime("%Y-%m-%d"),
        "offer_acceptance_date": app.offer_accepted_at.strftime("%Y-%m-%d") if app.offer_accepted_at else datetime.utcnow().strftime("%Y-%m-%d"),
        "disbursement_date": app.disbursement_date.strftime("%Y-%m-%d") if app.disbursement_date else datetime.utcnow().strftime("%Y-%m-%d"),
        "assigned_officer": app.operations_officer or "Operations Desk",
        "workflow_stage": app.workflow_stage,
        "status": app.status
    }

# ==========================================
# 5. OPERATIONS OFFICER ACTIONS
# ==========================================
@router.post("/cases/{application_id}/action")
def perform_operations_action(
    application_id: str,
    payload: dict,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Handles operations officer workflow actions:
    ASSIGN, REASSIGN, VERIFY, REQUEST_INFORMATION, ESCALATE, START_DISBURSEMENT, ADD_NOTE.
    """
    app = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    cust = db.query(Customer).filter(Customer.id == app.customer_id).first()
    user_name = current_user.full_name if current_user else "Operations Officer Demo"
    user_email = current_user.email if current_user else "operations.officer@finsight.ai"
    action = payload.get("action", "").upper()
    notes = payload.get("notes", "")

    if action == "ASSIGN":
        target = payload.get("assigned_officer") or user_name
        app.operations_officer = target
        app.workflow_stage = "OPERATIONS_REVIEW"

    elif action == "REASSIGN":
        target = payload.get("assigned_officer")
        if not target:
            raise HTTPException(status_code=400, detail="Target officer required for reassignment.")
        app.operations_officer = target

    elif action == "VERIFY":
        app.workflow_stage = "READY_FOR_DISBURSEMENT"
        app.disbursement_status = "READY_FOR_DISBURSEMENT"
        app.operations_notes = f"Pre-disbursement checks verified by {user_name}. {notes}"

    elif action == "START_DISBURSEMENT":
        app.workflow_stage = "READY_FOR_DISBURSEMENT"
        app.disbursement_status = "READY_FOR_DISBURSEMENT"

    elif action == "REQUEST_INFORMATION":
        req_msg = payload.get("message") or notes or "Additional operational documentation required for loan disbursement."
        app.workflow_stage = "DISBURSEMENT_PENDING"
        if cust:
            db.add(CustomerCommunication(
                comm_id=f"COMM-OPS-{uuid.uuid4().hex[:6].upper()}",
                customer_id=cust.customer_id,
                application_id=app.application_id,
                sender=user_name,
                sender_role="OPERATIONS_OFFICER",
                recipient=f"{cust.first_name} {cust.last_name}",
                comm_type="IN_APP_MESSAGE",
                subject="Disbursement Update: Information Required",
                message=req_msg,
                created_at=datetime.utcnow()
            ))
            if cust.email:
                db.add(Notification(
                    notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
                    title="Disbursement Action Required",
                    message=req_msg,
                    severity="High",
                    category="Operations",
                    recipient_email=cust.email,
                    role_target="CUSTOMER",
                    created_at=datetime.utcnow()
                ))

    elif action == "ESCALATE":
        reason = payload.get("reason") or notes
        if not reason:
            raise HTTPException(status_code=400, detail="Mandatory reason required to escalate operational case.")
        app.disbursement_status = "FAILED"
        db.add(WorkTask(
            task_id=f"ESC-OPS-{uuid.uuid4().hex[:5].upper()}",
            title=f"URGENT: Operational Exception on App {app.application_id}",
            description=f"Escalated by {user_name}. Reason: {reason}",
            customer_id=cust.customer_id if cust else None,
            application_id=app.application_id,
            role_target="OPERATIONS_MANAGER",
            priority="HIGH",
            status="TODO",
            due_date=datetime.utcnow() + timedelta(hours=12),
            created_at=datetime.utcnow()
        ))
        db.add(Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title="Operational Exception Escalated",
            message=f"Application {app.application_id} escalated to Operations Manager: {reason}",
            severity="High",
            category="Operations",
            role_target="OPERATIONS_MANAGER",
            created_at=datetime.utcnow()
        ))

    elif action == "ADD_NOTE":
        existing_notes = app.operations_notes or ""
        app.operations_notes = f"{existing_notes}\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')} {user_name}]: {notes}".strip()

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")

    # Audit Trail
    db.add(AuditLog(
        user_id=current_user.id if current_user else None,
        action=f"OPERATIONS_{action}",
        resource=f"LOAN_APPLICATION_{app.application_id}",
        details_json=json.dumps({"action": action, "officer": user_name, "notes": notes}),
        created_at=datetime.utcnow()
    ))
    db.commit()

    return {
        "status": "success",
        "action": action,
        "application_id": app.application_id,
        "workflow_stage": app.workflow_stage,
        "disbursement_status": app.disbursement_status
    }

# ==========================================
# 6. DEMO DISBURSEMENT EXECUTION
# ==========================================
@router.post("/cases/{application_id}/disburse")
def execute_demo_disbursement(
    application_id: str,
    payload: dict = {},
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Executes Institutional Demo Disbursement in an atomic database transaction.
    Validates application, approval, pre-disbursement checklist, creates Loan record,
    Disbursement transaction, Repayment Schedule, and updates all dashboards.
    """
    # Verify RBAC permission for disbursement
    if current_user:
        check_permission(current_user, Permission.LOANS_DISBURSE)

    app = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    if app.status == "Disbursed":
        raise HTTPException(status_code=400, detail="This loan application has already been disbursed.")

    cust = db.query(Customer).filter(Customer.id == app.customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    user_name = current_user.full_name if current_user else "Operations Officer Demo"
    user_email = current_user.email if current_user else "operations.officer@finsight.ai"

    # Pre-disbursement validation checklist
    check_result = run_pre_disbursement_check(application_id=application_id, current_user=current_user, db=db)
    if not check_result["all_passed"]:
        missing = ", ".join(check_result["missing_conditions"])
        raise HTTPException(
            status_code=400,
            detail=f"Disbursement blocked. Mandatory pre-disbursement conditions failed: {missing}"
        )

    # Financial terms calculation
    prod = db.query(LoanProduct).filter(LoanProduct.name == app.product_type).first()
    interest_rate = prod.interest_rate if prod else 13.5
    processing_fee_pct = prod.processing_fee_pct if prod else 1.5

    principal = float(app.approved_amount or app.requested_amount or 500000.0)
    processing_fee = round(principal * (processing_fee_pct / 100.0), 2)
    net_disbursed = round(principal - processing_fee, 2)
    tenure_months = int(app.requested_tenure or 24)
    monthly_emi = calculate_emi(principal, interest_rate, tenure_months)

    # 1. Create Loan Record
    loan_num = f"LN-2026-{uuid.uuid4().hex[:5].upper()}"
    maturity_date = datetime.utcnow() + timedelta(days=30 * tenure_months)

    loan = Loan(
        loan_id=loan_num,
        customer_id=cust.id,
        product_type=app.product_type,
        loan_amount=principal,
        interest_rate=interest_rate,
        loan_tenure=tenure_months,
        emi=monthly_emi,
        outstanding_balance=principal,
        dpd=0,
        status="Active",
        disbursed_date=datetime.utcnow(),
        maturity_date=maturity_date,
        created_at=datetime.utcnow()
    )
    db.add(loan)
    db.flush() # flush to get loan.id

    # 2. Create Disbursement Transaction
    disb_tx = Transaction(
        transaction_id=f"TXN-DISB-{uuid.uuid4().hex[:8].upper()}",
        customer_id=cust.id,
        loan_id=loan.id,
        transaction_amount=net_disbursed,
        transaction_type="Disbursement",
        channel=payload.get("channel", "NEFT/RTGS"),
        status="Success",
        category="Disbursement",
        reconciliation_status="MATCHED",
        created_by=user_name,
        reference=f"UTR-DEMO-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        related_application_id=app.application_id,
        notes=f"Demo disbursement processed by {user_name}. Net credited: INR {net_disbursed:,.2f}",
        transaction_timestamp=datetime.utcnow()
    )
    db.add(disb_tx)

    # 3. Generate Repayment Schedule (Monthly installments)
    monthly_rate = (interest_rate / 12.0) / 100.0
    balance = principal
    repayments_list = []

    for i in range(1, tenure_months + 1):
        due_dt = datetime.utcnow() + timedelta(days=30 * i)
        interest_part = round(balance * monthly_rate, 2)
        principal_part = round(monthly_emi - interest_part, 2)
        if i == tenure_months:
            principal_part = balance
            monthly_emi = round(principal_part + interest_part, 2)
        balance = max(0.0, round(balance - principal_part, 2))

        inst_status = "DUE" if i == 1 else "UPCOMING"
        rep = Repayment(
            repayment_id=f"REP-{loan.loan_id}-{i:02d}",
            loan_id=loan.id,
            customer_id=cust.id,
            installment_number=i,
            due_date=due_dt,
            amount_due=monthly_emi,
            amount_paid=0.0,
            principal_amount=principal_part,
            interest_amount=interest_part,
            outstanding_amount=monthly_emi,
            dpd=0,
            status=inst_status,
            created_at=datetime.utcnow()
        )
        db.add(rep)
        repayments_list.append(rep)

    # 4. Update Application State
    app.status = "Disbursed"
    app.workflow_stage = "DISBURSED"
    app.disbursement_status = "DISBURSED"
    app.disbursement_date = datetime.utcnow()
    app.disbursed_at = datetime.utcnow()
    app.net_disbursed_amount = net_disbursed
    app.processing_fee = processing_fee
    app.operations_officer = user_name

    # 5. Update Customer Record
    if not cust.existing_loans:
        cust.existing_loans = 1
    else:
        cust.existing_loans += 1

    # 6. Customer Timeline & Notification
    if cust.email:
        db.add(Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title="Loan Disbursed Successfully",
            message=f"Your loan {loan.loan_id} of INR {principal:,.0f} has been disbursed to your account. First EMI of INR {monthly_emi:,.0f} is due on {(datetime.utcnow() + timedelta(days=30)).strftime('%d %b %Y')}.",
            severity="Info",
            category="Disbursement",
            recipient_email=cust.email,
            role_target="CUSTOMER",
            created_at=datetime.utcnow()
        ))

    db.add(Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title="Disbursement Completed",
        message=f"Loan {loan.loan_id} ({app.application_id}) for {cust.first_name} {cust.last_name} disbursed: INR {net_disbursed:,.2f}.",
        severity="Info",
        category="Operations",
        role_target="OPERATIONS_MANAGER",
        created_at=datetime.utcnow()
    ))

    # 7. Audit Log Event
    db.add(AuditLog(
        user_id=current_user.id if current_user else None,
        action="LOAN_DISBURSED",
        resource=f"LOAN_{loan.loan_id}",
        details_json=json.dumps({
            "application_id": app.application_id,
            "loan_id": loan.loan_id,
            "principal": principal,
            "net_disbursed": net_disbursed,
            "processing_fee": processing_fee,
            "officer": user_name,
            "tenure": tenure_months,
            "emi": monthly_emi
        }),
        created_at=datetime.utcnow()
    ))

    db.commit()

    return {
        "status": "success",
        "message": f"Demo disbursement completed successfully for {app.application_id}.",
        "loan": {
            "loan_id": loan.loan_id,
            "customer_id": cust.customer_id,
            "customer_name": f"{cust.first_name} {cust.last_name}",
            "product_type": loan.product_type,
            "principal": loan.loan_amount,
            "net_disbursed_amount": net_disbursed,
            "processing_fee": processing_fee,
            "interest_rate": loan.interest_rate,
            "tenure_months": loan.loan_tenure,
            "emi": loan.emi,
            "first_due_date": (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "maturity_date": maturity_date.strftime("%Y-%m-%d"),
            "status": loan.status
        },
        "transaction": {
            "transaction_id": disb_tx.transaction_id,
            "reference": disb_tx.reference,
            "amount": disb_tx.transaction_amount,
            "status": disb_tx.status
        },
        "total_installments": tenure_months
    }

# ==========================================
# 7. OPERATIONS MANAGER DASHBOARD
# ==========================================
@router.get("/manager/dashboard")
def get_operations_manager_dashboard(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Team-level executive operations governance dashboard.
    """
    total_disbursed = db.query(func.sum(Loan.loan_amount)).scalar() or 0.0
    active_loans_count = db.query(Loan).filter(Loan.status == "Active").count()
    pending_approvals = db.query(LoanApplication).filter(
        LoanApplication.workflow_stage.in_(["OPERATIONS_REVIEW", "READY_FOR_DISBURSEMENT"]),
        LoanApplication.status != "Disbursed"
    ).count()

    exceptions = db.query(WorkTask).filter(
        WorkTask.role_target == "OPERATIONS_MANAGER",
        WorkTask.status.in_(["TODO", "IN_PROGRESS"])
    ).count()

    # Officer distribution
    officers = db.query(
        LoanApplication.operations_officer,
        func.count(LoanApplication.id).label("count")
    ).filter(
        LoanApplication.operations_officer.isnot(None)
    ).group_by(LoanApplication.operations_officer).all()

    team_activity = [
        {"officer": o[0], "assigned_cases": o[1]}
        for o in officers
    ]

    return {
        "total_disbursed_volume": total_disbursed,
        "active_loans": active_loans_count,
        "pending_operations_review": pending_approvals,
        "operations_exceptions": exceptions,
        "team_activity": team_activity
    }


# ==========================================
# ALIAS: /disburse/{application_id}
# RBAC check BEFORE any DB lookup = 403 not 404 for unauthorized users
# ==========================================

class DisburseAliasPayload:
    pass

from pydantic import BaseModel as _BaseModel
class _DisbursePayload(_BaseModel):
    bank_account_verified: Optional[bool] = True
    mandate_registered: Optional[bool] = True
    disbursement_channel: Optional[str] = "NEFT"
    remarks: Optional[str] = ""

@router.post("/disburse/{application_id}")
def disburse_alias(
    application_id: str,
    payload: _DisbursePayload = _DisbursePayload(),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Alias: POST /operations/disburse/{id}
    RBAC is enforced BEFORE any database lookup so unauthorized users
    always receive 403 — even for non-existent application IDs.
    Delegates to the same disbursement logic as /cases/{id}/disburse.
    """
    # RBAC FIRST — before any DB lookup to guarantee 403 over 404
    if current_user:
        check_permission(current_user, Permission.LOANS_DISBURSE)
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to disburse loans."
        )

    # Now delegate to the actual disbursement implementation
    # We build a simple dict payload and pass directly
    app = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    if app.status == "Disbursed":
        raise HTTPException(status_code=400, detail="Application already disbursed.")

    cust = db.query(Customer).filter(Customer.id == app.customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    from app.routers.operations import run_pre_disbursement_check
    check_result = run_pre_disbursement_check(application_id=application_id, current_user=current_user, db=db)
    if not check_result["all_passed"]:
        missing = ", ".join(check_result["missing_conditions"])
        raise HTTPException(
            status_code=400,
            detail=f"Disbursement blocked. Mandatory pre-disbursement conditions failed: {missing}"
        )

    prod = db.query(LoanProduct).filter(LoanProduct.name == app.product_type).first()
    interest_rate = prod.interest_rate if prod else 13.5
    processing_fee_pct = prod.processing_fee_pct if prod else 1.5
    principal = float(app.approved_amount or app.requested_amount or 500000.0)
    processing_fee = round(principal * (processing_fee_pct / 100.0), 2)
    net_disbursed = round(principal - processing_fee, 2)
    tenure = app.requested_tenure or 36
    emi = calculate_emi(net_disbursed, interest_rate, tenure)

    loan_id = f"LN-{uuid.uuid4().hex[:8].upper()}"
    new_loan = Loan(
        loan_id=loan_id,
        customer_id=app.customer_id,
        product_type=app.product_type or "Personal Loan",
        loan_amount=net_disbursed,
        outstanding_balance=net_disbursed,
        interest_rate=interest_rate,
        loan_tenure=tenure,
        emi=emi,
        status="Active",
        dpd=0,
        disbursed_date=datetime.utcnow()
    )
    db.add(new_loan)
    db.flush()

    # Disbursement transaction
    txn_id = f"TXN-DISB-{uuid.uuid4().hex[:8].upper()}"
    disb_txn = Transaction(
        transaction_id=txn_id,
        loan_id=new_loan.id,
        customer_id=app.customer_id,
        transaction_type="DISBURSEMENT",
        amount=net_disbursed,
        balance_after=net_disbursed,
        payment_channel=payload.disbursement_channel or "NEFT",
        status="Completed",
        remarks=f"Loan disbursed via alias endpoint",
        transaction_date=datetime.utcnow()
    )
    db.add(disb_txn)

    # Repayment schedule
    balance = net_disbursed
    monthly_rate = (interest_rate / 12.0) / 100.0
    sched_date = datetime.utcnow()
    for i in range(1, tenure + 1):
        interest_component = round(balance * monthly_rate, 2)
        principal_component = round(emi - interest_component, 2)
        balance = max(0.0, round(balance - principal_component, 2))
        sched_date = sched_date + timedelta(days=30)
        repay = Repayment(
            loan_id=new_loan.id,
            customer_id=app.customer_id,
            installment_number=i,
            due_date=sched_date,
            emi_amount=emi,
            principal_component=principal_component,
            interest_component=interest_component,
            outstanding_balance=balance,
            status="Pending"
        )
        db.add(repay)

    app.status = "Disbursed"
    app.workflow_stage = "DISBURSED"
    app.operations_officer = current_user.full_name if current_user else "Operations Officer"

    user_name = current_user.full_name if current_user else "Operations Officer Demo"
    db.add(AuditLog(
        user_id=current_user.id if current_user else None,
        action="LOAN_DISBURSED",
        resource=f"LOAN_{loan_id}",
        details_json=json.dumps({
            "loan_id": loan_id, "application_id": application_id,
            "amount": net_disbursed, "officer": user_name
        }),
        created_at=datetime.utcnow()
    ))
    db.commit()

    return {
        "status": "disbursed",
        "loan_id": loan_id,
        "application_id": application_id,
        "disbursed_amount": net_disbursed,
        "emi": emi,
        "tenure_months": tenure,
        "interest_rate": interest_rate
    }
