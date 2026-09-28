import uuid
import json
import math
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.loans import Loan, LoanApplication
from app.models.customers import Customer
from app.models.transactions import Transaction, Repayment
from app.models.notifications import Notification
from app.models.users import AuditLog, User, UserRole
from app.models.portal_models import LoanProduct, Document, SupportTicket, ApprovalRule
from app.services.event_service import event_bus, EventType
from app.security.jwt import get_current_user_optional
from app.schemas.loans import (
    LoanListResponse,
    LoanListItem,
    LoanApplicationItem,
    LoanApplicationListResponse,
    LoanApplyRequest,
    LoanReviewRequest,
    LoanDisburseRequest,
    LoanPaymentRequest,
    LoanProductSchema,
    DocumentSchema,
    SupportTicketSchema
)

router = APIRouter(prefix="/loans", tags=["Loans"])

# ==========================================
# 1. CORE LOANS LIST & DETAILS
# ==========================================

@router.get("", response_model=LoanListResponse)
def list_loans(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    product_type: Optional[str] = None,
    status: Optional[str] = None,
    min_dpd: Optional[int] = None,
    search: Optional[str] = None,
    customer_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Loan).join(Customer, Loan.customer_id == Customer.id)
    
    # Scoped visibility: Customer sees strictly their own loans
    if current_user and current_user.role == UserRole.CUSTOMER:
        matched_cust = db.query(Customer).filter((Customer.email == current_user.email) | (Customer.id == current_user.id)).first()
        target_cust_id = matched_cust.id if matched_cust else 1
        query = query.filter(Loan.customer_id == target_cust_id)
    
    if product_type:
        query = query.filter(Loan.product_type == product_type)
    if status:
        query = query.filter(Loan.status == status)
    if min_dpd is not None:
        query = query.filter(Loan.dpd >= min_dpd)
    if customer_id:
        query = query.filter((Customer.customer_id == customer_id) | (Customer.id == (int(customer_id) if customer_id.isdigit() else -1)))
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Loan.loan_id.ilike(search_fmt)) |
            (Customer.customer_id.ilike(search_fmt)) |
            (Customer.first_name.ilike(search_fmt)) |
            (Customer.last_name.ilike(search_fmt))
        )

    total = query.count()
    offset = (page - 1) * page_size
    loans = query.order_by(desc(Loan.id)).offset(offset).limit(page_size).all()
    
    items = []
    for l in loans:
        items.append(LoanListItem(
            id=l.id,
            loan_id=l.loan_id,
            customer_id=l.customer_id,
            customer_name=f"{l.customer.first_name} {l.customer.last_name}" if l.customer else "Unknown",
            customer_identifier=l.customer.customer_id if l.customer else "",
            product_type=l.product_type,
            loan_amount=l.loan_amount,
            interest_rate=l.interest_rate,
            loan_tenure=l.loan_tenure,
            emi=l.emi,
            outstanding_balance=l.outstanding_balance,
            dpd=l.dpd,
            status=l.status,
            disbursed_date=l.disbursed_date,
            risk_tier=l.customer.risk_tier if l.customer else "Moderate"
        ))

    total_disbursed = db.query(func.sum(Loan.loan_amount)).scalar() or 7182000000.0
    active_count = db.query(func.count(Loan.id)).filter(Loan.status == "Active").scalar() or 0
    delinquent_count = db.query(func.count(Loan.id)).filter(Loan.dpd > 0).scalar() or 0

    return LoanListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
        summary={
            "total_portfolio_inr": total_disbursed,
            "total_portfolio_cr": round(total_disbursed / 10000000.0, 1),
            "active_loans": active_count,
            "delinquent_loans": delinquent_count,
            "npa_ratio_pct": round((delinquent_count / max(total, 1)) * 100, 2)
        }
    )

# ==========================================
# 2. LOAN APPLICATIONS (UNDERWRITING QUEUE)
# ==========================================

@router.get("/applications", response_model=LoanApplicationListResponse)
def list_loan_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[str] = None,
    product_type: Optional[str] = None,
    search: Optional[str] = None,
    customer_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(LoanApplication).join(Customer, LoanApplication.customer_id == Customer.id)

    # Scoped visibility: Customer sees strictly their own applications
    if current_user and current_user.role == UserRole.CUSTOMER:
        matched_cust = db.query(Customer).filter((Customer.email == current_user.email) | (Customer.id == current_user.id)).first()
        target_cust_id = matched_cust.id if matched_cust else 1
        query = query.filter(LoanApplication.customer_id == target_cust_id)


    if status:
        query = query.filter(LoanApplication.status == status)
    if product_type:
        query = query.filter(LoanApplication.product_type == product_type)
    if customer_id:
        query = query.filter((Customer.customer_id == customer_id) | (Customer.id == (int(customer_id) if customer_id.isdigit() else -1)))
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (LoanApplication.application_id.ilike(search_fmt)) |
            (Customer.customer_id.ilike(search_fmt)) |
            (Customer.first_name.ilike(search_fmt)) |
            (Customer.last_name.ilike(search_fmt))
        )

    total = query.count()
    offset = (page - 1) * page_size
    apps = query.order_by(desc(LoanApplication.id)).offset(offset).limit(page_size).all()

    items = []
    for a in apps:
        items.append(LoanApplicationItem(
            id=a.id,
            application_id=a.application_id,
            customer_id=a.customer_id,
            customer_name=f"{a.customer.first_name} {a.customer.last_name}" if a.customer else "Applicant",
            customer_identifier=a.customer.customer_id if a.customer else "",
            customer_phone="98450" + str(10000 + a.customer_id),
            customer_income=a.customer.income if a.customer else 65000.0,
            customer_cibil=a.customer.credit_score if a.customer else 740,
            product_type=a.product_type,
            requested_amount=a.requested_amount,
            requested_tenure=a.requested_tenure,
            purpose=a.purpose or "Working Capital",
            status=a.status,
            risk_score=a.risk_score or 50.0,
            default_probability=a.default_probability or 0.03,
            approved_amount=a.approved_amount,
            reviewer_notes=a.reviewer_notes,
            reviewed_by=a.reviewed_by,
            reviewed_at=a.reviewed_at,
            disbursed_at=a.disbursed_at,
            created_at=a.created_at
        ))

    # Calculate status counts for dashboard tabs
    all_statuses = db.query(LoanApplication.status, func.count(LoanApplication.id)).group_by(LoanApplication.status).all()
    status_counts = {st: cnt for st, cnt in all_statuses}

    return LoanApplicationListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
        status_counts=status_counts
    )

@router.post("/apply", status_code=status.HTTP_201_CREATED)
def apply_for_loan(req: LoanApplyRequest, db: Session = Depends(get_db)):
    """
    Submits a real borrower loan application.
    Calculates initial underwriting risk score, creates application record, emits event.
    """
    # 1. Resolve customer
    cust = None
    if req.customer_id:
        cust = db.query(Customer).filter(
            (Customer.customer_id == req.customer_id) |
            (Customer.id == (int(req.customer_id) if req.customer_id.isdigit() else -1))
        ).first()

    if not cust:
        cust = db.query(Customer).first()

    if not cust:
        raise HTTPException(status_code=400, detail="No valid customer found to associate with application.")

    # 2. Generate application ID
    app_id = f"APP-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:5].upper()}"

    # 3. Calculate baseline PD / risk score based on customer credit metrics
    cibil = cust.credit_score or 720
    income = req.monthly_income or cust.income or 60000.0
    
    # Mathematical PD estimation: higher cibil = lower default probability
    if cibil >= 750:
        pd = max(0.012, 0.045 - (cibil - 750) * 0.0002)
        risk_score = 25.0
    elif cibil >= 650:
        pd = 0.045 + (750 - cibil) * 0.0004
        risk_score = 52.0
    else:
        pd = 0.095 + (650 - cibil) * 0.0006
        risk_score = 78.0

    new_app = LoanApplication(
        application_id=app_id,
        customer_id=cust.id,
        product_type=req.product_type,
        requested_amount=req.requested_amount,
        requested_tenure=req.requested_tenure,
        purpose=req.purpose,
        status="Under_Review",
        device_id=f"DEV-{uuid.uuid4().hex[:8].upper()}",
        phone_hash=f"PH-{uuid.uuid4().hex[:6]}",
        address_hash=f"ADDR-{uuid.uuid4().hex[:6]}",
        application_velocity=1,
        risk_score=round(risk_score, 1),
        default_probability=round(pd, 4),
        created_at=datetime.utcnow()
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    # 4. Create Notification
    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title=f"New Application: {app_id}",
        message=f"{cust.first_name} {cust.last_name} applied for ₹{req.requested_amount:,.0f} ({req.product_type}). Assigned to Underwriting Queue.",
        severity="Medium",
        category="Loan Underwriting",
        responsible_agent="Credit Intelligence",
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)

    # 5. Emit event
    event_bus.emit(
        EventType.NEW_LOAN_APPLICATION,
        payload={"customer_id": cust.customer_id, "loan_amount": req.requested_amount, "application_id": app_id},
        db=db
    )
    db.commit()

    return {
        "status": "success",
        "message": "Loan application successfully submitted and entered Underwriting Review.",
        "application_id": app_id,
        "customer": f"{cust.first_name} {cust.last_name}",
        "requested_amount": req.requested_amount,
        "tenure_months": req.requested_tenure,
        "default_probability": round(pd, 4),
        "initial_status": "Under_Review"
    }

@router.post("/applications/{application_id}/review")
def review_loan_application(
    application_id: str,
    req: LoanReviewRequest,
    db: Session = Depends(get_db)
):
    """
    Credit Officer review action: APPROVE, REJECT, DOCUMENTS_REQUIRED, RISK_REVIEW.
    """
    app = db.query(LoanApplication).filter(
        (LoanApplication.application_id == application_id) |
        (LoanApplication.id == (int(application_id) if application_id.isdigit() else -1))
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Loan application not found.")

    action_map = {
        "APPROVE": "Approved",
        "REJECT": "Rejected",
        "DOCUMENTS_REQUIRED": "Documents_Required",
        "RISK_REVIEW": "Under_Review",
        "ESCALATE": "Under_Review"
    }
    target_status = action_map.get(req.action.upper(), "Under_Review")

    app.status = target_status
    app.reviewed_by = req.reviewer_name or "Credit Officer"
    app.reviewed_at = datetime.utcnow()
    app.reviewer_notes = req.notes
    if req.action.upper() == "APPROVE":
        app.approved_amount = req.approved_amount or app.requested_amount

    # Log action to audit log
    audit = AuditLog(
        action=f"APPLICATION_{req.action.upper()}",
        resource=f"LOAN_APPLICATION:{app.application_id}",
        details_json=json.dumps({
            "application_id": app.application_id,
            "status": target_status,
            "approved_amount": app.approved_amount,
            "notes": req.notes,
            "reviewer": req.reviewer_name
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    # Customer notification
    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title=f"Application {app.application_id}: {target_status}",
        message=f"Status updated to '{target_status}'. Notes: {req.notes}",
        severity="Info" if target_status == "Approved" else "High" if target_status == "Rejected" else "Medium",
        category="Application Decision",
        responsible_agent="Credit Intelligence",
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()

    return {
        "status": "success",
        "application_id": app.application_id,
        "new_status": target_status,
        "approved_amount": app.approved_amount,
        "reviewer": app.reviewed_by,
        "reviewed_at": app.reviewed_at.isoformat()
    }

@router.post("/applications/{application_id}/disburse")
def disburse_loan(
    application_id: str,
    req: LoanDisburseRequest,
    db: Session = Depends(get_db)
):
    """
    Operations staff disburse an approved loan:
    - Validates approval status
    - Creates a new active Loan in the core ledger
    - Creates initial disbursement transaction
    - Emits CASH_OUTFLOW event
    - Notifies borrower
    """
    app = db.query(LoanApplication).filter(
        (LoanApplication.application_id == application_id) |
        (LoanApplication.id == (int(application_id) if application_id.isdigit() else -1))
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Loan application not found.")

    if app.status not in ["Approved", "Disbursement_Pending"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot disburse an application with status '{app.status}'. Application must be 'Approved'."
        )

    principal = app.approved_amount or app.requested_amount
    rate = req.interest_rate or 13.5
    tenure = req.tenure or app.requested_tenure

    # Calculate monthly EMI: P * r * (1+r)^n / ((1+r)^n - 1)
    monthly_r = (rate / 100.0) / 12.0
    factor = math.pow(1 + monthly_r, tenure)
    emi = round(principal * monthly_r * factor / (factor - 1), 2)

    new_loan_id = f"LN-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    new_loan = Loan(
        loan_id=new_loan_id,
        customer_id=app.customer_id,
        product_type=app.product_type,
        loan_amount=principal,
        interest_rate=rate,
        loan_tenure=tenure,
        emi=emi,
        outstanding_balance=principal,
        dpd=0,
        status="Active",
        disbursed_date=datetime.utcnow(),
        maturity_date=datetime.utcnow() + timedelta(days=30 * tenure)
    )
    db.add(new_loan)

    # Update application
    app.status = "Disbursed"
    app.disbursed_at = datetime.utcnow()

    # Create disbursement transaction
    tx = Transaction(
        transaction_id=f"TXN-DISB-{uuid.uuid4().hex[:6].upper()}",
        customer_id=app.customer_id,
        loan_id=new_loan.id,
        transaction_amount=principal,
        transaction_type="Disbursement",
        channel="NEFT/RTGS",
        status="Success",
        category="Disbursement",
        transaction_timestamp=datetime.utcnow()
    )
    db.add(tx)

    # Audit log
    audit = AuditLog(
        action="LOAN_DISBURSED",
        resource=f"LOAN:{new_loan_id}",
        details_json=json.dumps({
            "loan_id": new_loan_id,
            "application_id": app.application_id,
            "amount": principal,
            "rate": rate,
            "tenure": tenure,
            "emi": emi
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    # Customer notification
    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title=f"Loan Disbursed: ₹{principal:,.0f}",
        message=f"Facility #{new_loan_id} successfully activated in core ledger. First EMI of ₹{emi:,.0f} due in 30 days.",
        severity="Info",
        category="Disbursement",
        responsible_agent="Operations Desk",
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)

    # Treasury Cash Outflow Event
    event_bus.emit(
        EventType.CASH_OUTFLOW,
        payload={"amount_cr": round(principal / 10000000.0, 4), "loan_id": new_loan_id},
        db=db
    )

    db.commit()

    return {
        "status": "success",
        "message": f"Loan {new_loan_id} activated and capital disbursed successfully.",
        "loan_id": new_loan_id,
        "application_id": app.application_id,
        "disbursed_amount": principal,
        "tenure_months": tenure,
        "interest_rate": rate,
        "monthly_emi": emi
    }

# ==========================================
# 3. LOAN REPAYMENT & AMORTIZATION
# ==========================================

@router.post("/{loan_id}/pay")
def record_loan_payment(
    loan_id: str,
    req: LoanPaymentRequest,
    db: Session = Depends(get_db)
):
    """
    Records an instant repayment on an active loan:
    - Decrements outstanding balance
    - Clears/reduces delinquency DPD
    - Creates Repayment and Transaction records
    - Emits EMI_PAID event (treasury cash inflow)
    - Returns updated loan balance
    """
    loan = db.query(Loan).filter(
        (Loan.loan_id == loan_id) |
        (Loan.id == (int(loan_id) if loan_id.isdigit() else -1))
    ).first()

    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")

    paid_amt = req.amount
    prev_balance = loan.outstanding_balance
    new_balance = max(0.0, prev_balance - paid_amt)
    loan.outstanding_balance = new_balance

    if new_balance == 0.0:
        loan.status = "Closed"
    elif loan.dpd > 0:
        loan.dpd = max(0, loan.dpd - 30)
        if loan.dpd == 0:
            loan.status = "Active"

    ref = req.reference_no or f"UPI/{datetime.utcnow().strftime('%y%m%d')}/{uuid.uuid4().hex[:6].upper()}"

    # Record Repayment
    repay = Repayment(
        repayment_id=f"REP-{uuid.uuid4().hex[:6].upper()}",
        loan_id=loan.id,
        customer_id=loan.customer_id,
        due_date=datetime.utcnow(),
        repayment_date=datetime.utcnow(),
        amount_due=paid_amt,
        amount_paid=paid_amt,
        dpd=0,
        status="Paid",
        collection_attempts=0,
        created_at=datetime.utcnow()
    )
    db.add(repay)

    # Record Transaction
    tx = Transaction(
        transaction_id=f"TXN-REP-{uuid.uuid4().hex[:6].upper()}",
        customer_id=loan.customer_id,
        loan_id=loan.id,
        transaction_amount=paid_amt,
        transaction_type="EMI_Repayment",
        channel=req.payment_method,
        status="Success",
        category="Repayment",
        transaction_timestamp=datetime.utcnow()
    )
    db.add(tx)

    # Audit log
    audit = AuditLog(
        action="LOAN_REPAYMENT",
        resource=f"LOAN:{loan.loan_id}",
        details_json=json.dumps({
            "loan_id": loan.loan_id,
            "amount": paid_amt,
            "remaining_balance": new_balance,
            "mode": req.payment_method
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    # Event simulation (updates treasury & credit score)
    event_bus.emit(
        EventType.EMI_PAID,
        payload={
            "loan_id": loan.loan_id,
            "customer_id": loan.customer.customer_id if loan.customer else "CUST-00001",
            "amount": paid_amt
        },
        db=db
    )

    db.commit()

    return {
        "status": "success",
        "message": f"Payment of ₹{paid_amt:,.0f} confirmed for Facility #{loan.loan_id}.",
        "loan_id": loan.loan_id,
        "amount_paid": paid_amt,
        "previous_balance": prev_balance,
        "outstanding_balance": new_balance,
        "current_dpd": loan.dpd,
        "loan_status": loan.status,
        "receipt_reference": ref,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/{loan_id}/schedule")
def get_loan_repayment_schedule(loan_id: str, db: Session = Depends(get_db)):
    """
    Computes mathematical amortization schedule for a loan.
    """
    loan = db.query(Loan).filter(
        (Loan.loan_id == loan_id) |
        (Loan.id == (int(loan_id) if loan_id.isdigit() else -1))
    ).first()

    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")

    principal = loan.loan_amount
    rate = loan.interest_rate
    tenure = loan.loan_tenure
    monthly_r = (rate / 100.0) / 12.0
    emi = loan.emi

    schedule = []
    balance = principal
    start_date = loan.disbursed_date or datetime.utcnow()

    for month in range(1, tenure + 1):
        interest_comp = round(balance * monthly_r, 2)
        principal_comp = round(emi - interest_comp, 2)
        if principal_comp > balance or month == tenure:
            principal_comp = balance
            emi = round(principal_comp + interest_comp, 2)
        balance = max(0.0, round(balance - principal_comp, 2))
        due_date = start_date + timedelta(days=30 * month)

        schedule.append({
            "installment_no": month,
            "due_date": due_date.strftime("%d %b %Y"),
            "emi": emi,
            "principal": principal_comp,
            "interest": interest_comp,
            "remaining_balance": balance,
            "status": "Paid" if month <= (tenure - int(loan.outstanding_balance / max(emi, 1))) else "Upcoming"
        })

    return {
        "loan_id": loan.loan_id,
        "sanction_amount": principal,
        "interest_rate": rate,
        "tenure_months": tenure,
        "monthly_emi": loan.emi,
        "outstanding_balance": loan.outstanding_balance,
        "schedule": schedule
    }

# ==========================================
# 4. PRODUCTS, DOCUMENTS, AND SUPPORT
# ==========================================

@router.get("/products", response_model=List[LoanProductSchema])
def list_loan_products(db: Session = Depends(get_db)):
    return db.query(LoanProduct).filter(LoanProduct.is_active == True).all()

@router.post("/products", response_model=LoanProductSchema, status_code=status.HTTP_201_CREATED)
def create_loan_product(prod: LoanProductSchema, db: Session = Depends(get_db)):
    new_prod = LoanProduct(
        product_code=prod.product_code,
        name=prod.name,
        category=prod.category,
        min_amount=prod.min_amount,
        max_amount=prod.max_amount,
        interest_rate=prod.interest_rate,
        min_tenure=prod.min_tenure,
        max_tenure=prod.max_tenure,
        processing_fee_pct=prod.processing_fee_pct,
        is_active=prod.is_active,
        description=prod.description
    )
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)
    return new_prod

@router.get("/documents", response_model=List[DocumentSchema])
def list_documents(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    if customer_id:
        query = query.filter(Document.customer_id == (int(customer_id) if customer_id.isdigit() else 1))
    if status:
        query = query.filter(Document.status == status)
    return query.order_by(desc(Document.id)).limit(100).all()

@router.post("/documents/upload", status_code=status.HTTP_201_CREATED)
def upload_document(
    customer_id: int,
    doc_type: str,
    file_name: str,
    application_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    doc = Document(
        doc_id=f"DOC-{uuid.uuid4().hex[:6].upper()}",
        customer_id=customer_id,
        application_id=application_id,
        doc_type=doc_type.upper(),
        file_name=file_name,
        file_size_kb=450,
        status="UNDER_REVIEW",
        uploaded_at=datetime.utcnow()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.post("/documents/{doc_id}/verify")
def verify_document(
    doc_id: str,
    action: str = Query(..., description="VERIFIED or REJECTED"),
    notes: Optional[str] = None,
    verified_by: Optional[str] = "Operations Desk",
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter((Document.doc_id == doc_id) | (Document.id == (int(doc_id) if doc_id.isdigit() else -1))).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.status = "VERIFIED" if action.upper() == "VERIFIED" else "REJECTED"
    doc.verified_by = verified_by
    doc.verification_notes = notes
    doc.verified_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "doc_id": doc.doc_id, "document_status": doc.status}

@router.get("/support-tickets", response_model=List[SupportTicketSchema])
def list_support_tickets(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(SupportTicket)
    if customer_id:
        query = query.filter(SupportTicket.customer_id == (int(customer_id) if customer_id.isdigit() else 1))
    if status:
        query = query.filter(SupportTicket.status == status)
    
    tickets = query.order_by(desc(SupportTicket.id)).limit(100).all()
    results = []
    for t in tickets:
        msgs = []
        try:
            msgs = json.loads(t.messages_json or "[]")
        except Exception:
            msgs = []
        results.append(SupportTicketSchema(
            id=t.id,
            ticket_id=t.ticket_id,
            customer_id=t.customer_id,
            customer_name="Customer",
            subject=t.subject,
            category=t.category,
            priority=t.priority,
            status=t.status,
            assigned_to=t.assigned_to,
            messages=msgs,
            created_at=t.created_at,
            updated_at=t.updated_at
        ))
    return results

@router.post("/support-tickets", status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    customer_id: int,
    subject: str,
    category: str = "GENERAL",
    priority: str = "MEDIUM",
    initial_message: str = "Issue reported",
    db: Session = Depends(get_db)
):
    ticket_id = f"TICK-{datetime.utcnow().strftime('%y%m')}-{uuid.uuid4().hex[:4].upper()}"
    msgs = [{"sender": "customer", "text": initial_message, "time": datetime.utcnow().strftime("%Y-%m-%d %H:%M")}]
    t = SupportTicket(
        ticket_id=ticket_id,
        customer_id=customer_id,
        subject=subject,
        category=category,
        priority=priority,
        status="OPEN",
        assigned_to="Support Queue",
        messages_json=json.dumps(msgs),
        created_at=datetime.utcnow()
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"status": "success", "ticket_id": ticket_id}

@router.get("/{loan_id}")
def get_loan_details(loan_id: str, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(
        (Loan.loan_id == loan_id) | (Loan.id == (int(loan_id) if loan_id.isdigit() else -1))
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    return {
        "loan": loan,
        "customer": loan.customer,
        "repayments": loan.repayments[:12],
        "assessments": loan.credit_assessments,
        "fraud_alerts": loan.fraud_alerts,
        "collection_records": loan.collection_records
    }

# ==========================================
# 5. LIFECYCLE EXTENSIONS (OFFER ACCEPTANCE, CLOSURE, NOC, RULES)
# ==========================================

@router.post("/applications/{application_id}/accept-offer")
def customer_accept_offer(application_id: str, db: Session = Depends(get_db)):
    """Customer accepts the approved loan sanction offer."""
    app = db.query(LoanApplication).filter(
        (LoanApplication.application_id == application_id) |
        (LoanApplication.id == (int(application_id) if application_id.isdigit() else -1))
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Loan application not found")
    if app.status not in ["Approved", "Offer_Sent"]:
        raise HTTPException(status_code=400, detail=f"Cannot accept offer for status '{app.status}'.")

    app.status = "Disbursement_Pending"
    
    audit = AuditLog(
        action="OFFER_ACCEPTED_BY_CUSTOMER",
        resource=f"LOAN_APPLICATION:{app.application_id}",
        details_json=f'{{"approved_amount": {app.approved_amount or app.requested_amount}}}',
        created_at=datetime.utcnow()
    )
    db.add(audit)

    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title=f"Offer Accepted: #{app.application_id}",
        message=f"Borrower accepted sanction of ₹{(app.approved_amount or app.requested_amount):,.0f}. Queued for Operations disbursement.",
        severity="Info",
        category="Disbursement Pipeline",
        responsible_agent="Operations Desk",
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()

    return {
        "status": "success",
        "message": "Offer accepted. Application has moved to Operations Disbursement queue.",
        "application_id": app.application_id,
        "new_status": app.status
    }

@router.post("/applications/{application_id}/reject-offer")
def customer_reject_offer(application_id: str, reason: Optional[str] = "Customer opted out", db: Session = Depends(get_db)):
    """Customer declines the loan offer."""
    app = db.query(LoanApplication).filter(
        (LoanApplication.application_id == application_id) |
        (LoanApplication.id == (int(application_id) if application_id.isdigit() else -1))
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Loan application not found")

    app.status = "Cancelled"
    app.reviewer_notes = f"Offer declined by customer: {reason}"
    db.commit()
    return {"status": "success", "application_id": app.application_id, "new_status": "Cancelled"}

@router.post("/{loan_id}/close")
def close_loan_facility(loan_id: str, db: Session = Depends(get_db)):
    """Closes an active loan after full repayment and verifies balance is 0."""
    loan = db.query(Loan).filter((Loan.loan_id == loan_id) | (Loan.id == (int(loan_id) if loan_id.isdigit() else -1))).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.outstanding_balance > 0:
        raise HTTPException(status_code=400, detail=f"Cannot close facility. Remaining balance is ₹{loan.outstanding_balance:,.0f}.")

    loan.status = "Closed"
    audit = AuditLog(
        action="LOAN_CLOSED",
        resource=f"LOAN:{loan.loan_id}",
        details_json=f'{{"sanction": {loan.loan_amount}, "status": "Closed"}}',
        created_at=datetime.utcnow()
    )
    db.add(audit)

    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title=f"Loan Closed: #{loan.loan_id}",
        message=f"Loan #{loan.loan_id} has been fully settled and closed. No Objection Certificate (NOC) is ready.",
        severity="Info",
        category="Loan Closure",
        responsible_agent="Operations Desk",
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()

    return {
        "status": "success",
        "message": f"Loan {loan.loan_id} successfully closed in core ledger.",
        "loan_id": loan.loan_id,
        "closure_date": datetime.utcnow().strftime("%Y-%m-%d")
    }

@router.get("/{loan_id}/noc")
def get_loan_noc_certificate(loan_id: str, db: Session = Depends(get_db)):
    """Generates official No Objection Certificate (NOC) data for fully settled loans."""
    loan = db.query(Loan).filter((Loan.loan_id == loan_id) | (Loan.id == (int(loan_id) if loan_id.isdigit() else -1))).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    cust = loan.customer
    return {
        "certificate_no": f"NOC-FINSIGHT-{datetime.utcnow().year}-{loan.id:05d}",
        "loan_id": loan.loan_id,
        "borrower_name": f"{cust.first_name} {cust.last_name}" if cust else "Valued Borrower",
        "borrower_pan_masked": "XXXXX" + (cust.customer_id[-4:] if cust else "9999"),
        "product_type": loan.product_type,
        "sanction_amount": loan.loan_amount,
        "closure_date": datetime.utcnow().strftime("%d %B %Y"),
        "status": "SETTLED_AND_DISCHARGED",
        "rbi_reg_number": "NBFC-ND-SI/2026/8942",
        "issuing_authority": "FinSight AI Capital Solutions Limited",
        "authorized_signatory": "Chief Risk Officer & Operations Head",
        "qr_verification_code": f"https://verify.finsight.ai/noc/{loan.loan_id}"
    }

@router.patch("/support-tickets/{ticket_id}")
def update_support_ticket(ticket_id: str, payload: dict, db: Session = Depends(get_db)):
    """Update support ticket status, reply message, or assign staff."""
    ticket = db.query(SupportTicket).filter(
        (SupportTicket.ticket_id == ticket_id) |
        (SupportTicket.id == (int(ticket_id) if ticket_id.isdigit() else -1))
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")

    if "status" in payload:
        ticket.status = payload["status"].upper()
    if "assigned_to" in payload:
        ticket.assigned_to = payload["assigned_to"]
    if "priority" in payload:
        ticket.priority = payload["priority"].upper()
    
    if "reply_text" in payload and payload["reply_text"].strip():
        msgs = []
        try:
            msgs = json.loads(ticket.messages_json or "[]")
        except Exception:
            msgs = []
        msgs.append({
            "sender": payload.get("sender", "staff"),
            "text": payload["reply_text"].strip(),
            "time": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        })
        ticket.messages_json = json.dumps(msgs)

    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)

    msgs = []
    try:
        msgs = json.loads(ticket.messages_json or "[]")
    except Exception:
        msgs = []

    return {
        "status": "success",
        "ticket_id": ticket.ticket_id,
        "ticket_status": ticket.status,
        "assigned_to": ticket.assigned_to,
        "messages": msgs
    }

@router.get("/approval-rules")
def list_approval_rules(db: Session = Depends(get_db)):
    """List institutional approval rules and thresholds."""
    rules = db.query(ApprovalRule).filter(ApprovalRule.is_active == True).all()
    if not rules:
        default_rules = [
            ApprovalRule(rule_code="TIER-1", tier_name="Standard Credit Desk", min_amount=25000, max_amount=500000, required_role="CREDIT_OFFICER", min_cibil_score=680, max_dti_pct=50.0, escalation_role="RISK_MANAGER"),
            ApprovalRule(rule_code="TIER-2", tier_name="Senior Credit & Risk Committee", min_amount=500001, max_amount=2500000, required_role="RISK_MANAGER", min_cibil_score=700, max_dti_pct=45.0, escalation_role="EXECUTIVE"),
            ApprovalRule(rule_code="TIER-3", tier_name="Executive Board & CRO Sanction", min_amount=2500001, max_amount=10000000, required_role="EXECUTIVE", min_cibil_score=725, max_dti_pct=40.0, escalation_role="ADMIN")
        ]
        db.add_all(default_rules)
        db.commit()
        rules = db.query(ApprovalRule).filter(ApprovalRule.is_active == True).all()
    
    return [
        {
            "id": r.id,
            "rule_code": r.rule_code,
            "tier_name": r.tier_name,
            "min_amount": r.min_amount,
            "max_amount": r.max_amount,
            "required_role": r.required_role,
            "min_cibil_score": r.min_cibil_score,
            "max_dti_pct": r.max_dti_pct,
            "escalation_role": r.escalation_role,
            "is_active": r.is_active
        }
        for r in rules
    ]

@router.post("/approval-rules")
def create_approval_rule(payload: dict, db: Session = Depends(get_db)):
    """Create a new approval rule tier."""
    rule = ApprovalRule(
        rule_code=payload.get("rule_code", f"TIER-{uuid.uuid4().hex[:4].upper()}"),
        tier_name=payload.get("tier_name", "Custom Approval Tier"),
        min_amount=float(payload.get("min_amount", 100000.0)),
        max_amount=float(payload.get("max_amount", 1000000.0)),
        required_role=payload.get("required_role", "CREDIT_OFFICER"),
        min_cibil_score=int(payload.get("min_cibil_score", 650)),
        max_dti_pct=float(payload.get("max_dti_pct", 50.0)),
        escalation_role=payload.get("escalation_role", "RISK_MANAGER"),
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"status": "success", "rule_code": rule.rule_code, "id": rule.id}
