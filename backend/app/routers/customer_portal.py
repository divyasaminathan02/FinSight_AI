"""
FinSight AI - Complete Customer Self-Service Portal Router
Provides end-to-end APIs for borrowers:
- Customer Dashboard & Real-Time KPIs
- Profile & Verification Management with Audit Tracking
- Product Catalog & Eligibility Browsing
- Multi-Step Loan Application (Steps 1-9 & Save Draft)
- Real-time Application State Tracking (DRAFT -> SUBMITTED -> KYC -> APPROVAL -> DISBURSED)
- Sanction Offer Details, Acceptance & Rejection
- Active Loan Servicing, Amortization Schedule & EMI Repayment
- Simulated NBFC EMI Payment Processing with Balance, Ledger, and Notification updates
- Customer Document Center with Verification Status
- Support Ticketing & Messaging
"""

import uuid
import json
import math
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app.models.customers import Customer, CustomerProfile
from app.models.loans import Loan, LoanApplication
from app.models.transactions import Transaction, Repayment
from app.models.notifications import Notification
from app.models.portal_models import LoanProduct, Document, SupportTicket, ApprovalRule
from app.models.users import User, UserRole, AuditLog
from app.security.jwt import get_current_user_optional, get_current_user

router = APIRouter(prefix="/customer", tags=["Customer Portal"])

# -------------------------------------------------------------
# Pydantic Schemas
# -------------------------------------------------------------

class ProfileUpdateRequest(BaseModel):
    phone: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    employment_type: Optional[str] = None
    occupation: Optional[str] = None
    employer_name: Optional[str] = None
    designation: Optional[str] = None
    years_employed: Optional[float] = None
    income: Optional[float] = None
    other_income: Optional[float] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None

class ApplicationDraftRequest(BaseModel):
    application_id: Optional[str] = None
    product_type: str = "MSME Business Growth Loan"
    requested_amount: float = 500000.0
    requested_tenure: int = 24
    purpose: Optional[str] = "Working Capital"
    step: int = 1
    employment_details: Optional[Dict[str, Any]] = None
    existing_liabilities: Optional[Dict[str, Any]] = None
    bank_details: Optional[Dict[str, Any]] = None

class ApplicationSubmitRequest(BaseModel):
    draft_application_id: Optional[str] = None
    product_type: str
    requested_amount: float
    requested_tenure: int
    purpose: str
    employment_details: Dict[str, Any]
    existing_liabilities: Optional[Dict[str, Any]] = None
    bank_details: Dict[str, Any]
    uploaded_document_ids: Optional[List[str]] = None

class OfferDecisionRequest(BaseModel):
    action: str = Field(..., description="'ACCEPT' or 'REJECT'")
    decision_notes: Optional[str] = None

class PaymentSimulationRequest(BaseModel):
    loan_id: str
    amount: float
    payment_channel: str = "UPI_SIMULATED"  # UPI_SIMULATED, NACH_SIMULATED, NETBANKING
    remarks: Optional[str] = "EMI Payment"

class SupportTicketCreateRequest(BaseModel):
    subject: str
    category: str = "Payment"  # Payment, Loan application, Documents, Account, Technical issue, Other
    priority: str = "MEDIUM"
    message: str

class SupportTicketReplyRequest(BaseModel):
    message: str

class WorkflowAdvanceRequest(BaseModel):
    target_status: str  # e.g., DOCUMENT_VERIFICATION, KYC_REVIEW, CREDIT_REVIEW, APPROVED, OFFER_SENT, DISBURSED

# -------------------------------------------------------------
# Helper: Resolve Logged-in Customer
# -------------------------------------------------------------
def get_portal_customer(current_user: Optional[User], db: Session) -> Customer:
    """
    Returns the Customer record corresponding to the logged in user.
    Falls back gracefully to the primary borrower for demonstration if user is demo/admin.
    """
    if current_user:
        # Match by email or customer id
        cust = db.query(Customer).filter(
            (Customer.email == current_user.email) |
            (Customer.id == current_user.id)
        ).first()
        if cust:
            return cust

    # Fallback to first customer record in database
    cust = db.query(Customer).first()
    if not cust:
        # Create default customer record if database was empty
        cust = Customer(
            customer_id="CUST-00001",
            first_name="Rajesh",
            last_name="Kumar Verma",
            email="customer.demo@finsight.ai",
            age=36,
            gender="Male",
            occupation="Enterprise Business Owner",
            employment_type="Self-Employed MSME",
            income=145000.0,
            location="Bengaluru",
            state="Karnataka",
            credit_score=780,
            existing_loans=1,
            bank_balance=285000.0,
            risk_tier="Low"
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)
    return cust

def calculate_emi(principal: float, annual_rate_pct: float, tenure_months: int) -> float:
    monthly_rate = (annual_rate_pct / 12.0) / 100.0
    if monthly_rate == 0:
        return round(principal / tenure_months, 2)
    emi = principal * monthly_rate * ((1 + monthly_rate) ** tenure_months) / (((1 + monthly_rate) ** tenure_months) - 1)
    return round(emi, 2)

# -------------------------------------------------------------
# 1. CUSTOMER DASHBOARD
# -------------------------------------------------------------
@router.get("/dashboard")
def get_customer_dashboard(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)

    # Active loans
    active_loans = db.query(Loan).filter(
        Loan.customer_id == cust.id,
        Loan.status.in_(["Active", "Standard", "Delinquent"])
    ).all()

    total_outstanding = sum(l.outstanding_balance or l.loan_amount for l in active_loans)
    next_emi_amount = sum(l.emi for l in active_loans) if active_loans else 0.0

    # Next EMI Date: roughly 5th of next month
    today = datetime.utcnow()
    next_emi_date = (today.replace(day=1) + timedelta(days=32)).replace(day=5).strftime("%Y-%m-%d")

    # Payment Status
    delinquent_loans = [l for l in active_loans if (l.dpd or 0) > 0]
    payment_status = "OVERDUE" if delinquent_loans else ("ACTIVE" if active_loans else "NO_ACTIVE_LOANS")

    # Current / Latest Loan Application
    latest_app = db.query(LoanApplication).filter(
        LoanApplication.customer_id == cust.id
    ).order_by(desc(LoanApplication.id)).first()

    current_app_data = None
    if latest_app:
        current_app_data = {
            "id": latest_app.id,
            "application_id": latest_app.application_id,
            "product_type": latest_app.product_type,
            "requested_amount": latest_app.requested_amount,
            "requested_tenure": latest_app.requested_tenure,
            "status": latest_app.status,
            "created_at": latest_app.created_at.strftime("%Y-%m-%d %H:%M") if latest_app.created_at else None,
            "approved_amount": latest_app.approved_amount,
            "reviewer_notes": latest_app.reviewer_notes
        }

    # Profile completion %
    completed_fields = 0
    total_fields = 8
    if cust.first_name and cust.last_name: completed_fields += 1
    if cust.email: completed_fields += 1
    if cust.income: completed_fields += 1
    if cust.employment_type: completed_fields += 1
    if cust.location: completed_fields += 1
    if cust.credit_score: completed_fields += 1
    if cust.bank_balance: completed_fields += 1
    # Check if verified documents exist
    doc_count = db.query(Document).filter(Document.customer_id == cust.id).count()
    if doc_count > 0: completed_fields += 1
    profile_completion = int((completed_fields / total_fields) * 100)

    # KYC Status
    verified_docs = db.query(Document).filter(
        Document.customer_id == cust.id,
        Document.status == "VERIFIED"
    ).count()
    kyc_status = "VERIFIED" if verified_docs >= 2 else ("IN_PROGRESS" if doc_count > 0 else "PENDING")

    # Recent payments (last 5)
    recent_repayments = db.query(Repayment).filter(
        Repayment.customer_id == cust.id
    ).order_by(desc(Repayment.id)).limit(5).all()

    recent_payments_list = []
    for r in recent_repayments:
        recent_payments_list.append({
            "repayment_id": r.repayment_id,
            "amount_paid": r.amount_paid or r.amount_due,
            "due_date": r.due_date.strftime("%Y-%m-%d"),
            "payment_date": r.repayment_date.strftime("%Y-%m-%d") if r.repayment_date else r.due_date.strftime("%Y-%m-%d"),
            "status": r.status,
            "channel": "UPI / eNACH"
        })

    # Customer Notifications
    notifs = db.query(Notification).filter(
        (Notification.related_entity_id == cust.customer_id) |
        (Notification.message.ilike(f"%{cust.first_name}%")) |
        (Notification.category.in_(["Customer Alert", "Loan Application", "Repayment", "Disbursement Pipeline"]))
    ).order_by(desc(Notification.id)).limit(6).all()

    notif_list = [{
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "created_at": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else None,
        "severity": n.severity,
        "is_read": n.is_read
    } for n in notifs]

    # Support tickets
    tickets = db.query(SupportTicket).filter(
        SupportTicket.customer_id == cust.id
    ).order_by(desc(SupportTicket.id)).limit(4).all()

    ticket_list = [{
        "ticket_id": t.ticket_id,
        "subject": t.subject,
        "category": t.category,
        "status": t.status,
        "priority": t.priority,
        "created_at": t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else None
    } for t in tickets]

    return {
        "customer": {
            "id": cust.id,
            "customer_id": cust.customer_id,
            "name": f"{cust.first_name} {cust.last_name}",
            "email": cust.email,
            "credit_score": cust.credit_score,
            "risk_tier": cust.risk_tier,
            "profile_completion": profile_completion,
            "kyc_status": kyc_status
        },
        "overview": {
            "active_loans_count": len(active_loans),
            "outstanding_principal": total_outstanding,
            "next_emi_amount": next_emi_amount,
            "next_emi_date": next_emi_date,
            "payment_status": payment_status,
            "available_credit_limit": max(0.0, 2500000.0 - total_outstanding)
        },
        "current_application": current_app_data,
        "recent_payments": recent_payments_list,
        "notifications": notif_list,
        "support_tickets": ticket_list
    }

# -------------------------------------------------------------
# 2. CUSTOMER PROFILE
# -------------------------------------------------------------
@router.get("/profile")
def get_customer_profile(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)

    # Fetch audit log of edits
    audit_history = db.query(AuditLog).filter(
        AuditLog.resource == f"CUSTOMER_PROFILE:{cust.customer_id}"
    ).order_by(desc(AuditLog.id)).limit(10).all()

    audit_list = [{
        "action": a.action,
        "timestamp": a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else None,
        "details": json.loads(a.details_json or "{}")
    } for a in audit_history]

    # Documents for KYC badge
    verified_docs = db.query(Document).filter(
        Document.customer_id == cust.id,
        Document.status == "VERIFIED"
    ).count()

    return {
        "personal_info": {
            "customer_id": cust.customer_id,
            "first_name": cust.first_name,
            "last_name": cust.last_name,
            "email": cust.email,
            "phone": "+91 98450 10294",
            "date_of_birth": "1990-05-15",
            "gender": cust.gender or "Male",
            "pan_masked": "ABCDE****F",
            "aadhaar_masked": "XXXX-XXXX-8921"
        },
        "contact_info": {
            "address_line": "Plot 42, Koramangala 4th Block",
            "city": cust.location or "Bengaluru",
            "state": cust.state or "Karnataka",
            "pincode": "560034"
        },
        "employment_info": {
            "employment_type": cust.employment_type or "Self-Employed MSME",
            "occupation": cust.occupation or "Director",
            "employer_name": "Verma Solutions Pvt Ltd",
            "designation": "Managing Director",
            "years_employed": 8.5,
            "monthly_income": cust.income or 145000.0,
            "other_income": 25000.0
        },
        "bank_info": {
            "bank_name": "HDFC Bank Ltd",
            "bank_account_number": "50100293847291",
            "bank_ifsc": "HDFC0000128",
            "account_type": "Current Account"
        },
        "kyc_info": {
            "kyc_status": "VERIFIED" if verified_docs >= 2 else "PENDING",
            "verified_documents_count": verified_docs,
            "cibil_score": cust.credit_score or 780,
            "risk_tier": cust.risk_tier or "Low",
            "pan_verified": True,
            "aadhaar_verified": True
        },
        "audit_history": audit_list
    }

@router.put("/profile")
def update_customer_profile(
    payload: ProfileUpdateRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)

    # Track fields changed for audit history
    changes = {}
    if payload.phone:
        changes["phone"] = payload.phone
    if payload.city:
        changes["location"] = {"old": cust.location, "new": payload.city}
        cust.location = payload.city
    if payload.state:
        changes["state"] = {"old": cust.state, "new": payload.state}
        cust.state = payload.state
    if payload.income is not None:
        changes["income"] = {"old": cust.income, "new": payload.income}
        cust.income = payload.income
    if payload.employment_type:
        changes["employment_type"] = {"old": cust.employment_type, "new": payload.employment_type}
        cust.employment_type = payload.employment_type
    if payload.occupation:
        changes["occupation"] = {"old": cust.occupation, "new": payload.occupation}
        cust.occupation = payload.occupation

    cust.updated_at = datetime.utcnow()

    # Record Audit Log
    audit = AuditLog(
        action="CUSTOMER_PROFILE_UPDATED",
        resource=f"CUSTOMER_PROFILE:{cust.customer_id}",
        details_json=json.dumps(changes),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(cust)

    return {
        "status": "success",
        "message": "Customer profile updated successfully.",
        "changes_recorded": list(changes.keys())
    }

# -------------------------------------------------------------
# 3. LOAN PRODUCTS CATALOG
# -------------------------------------------------------------
@router.get("/products")
def list_available_products(db: Session = Depends(get_db)):
    products = db.query(LoanProduct).filter(LoanProduct.is_active == True).all()
    if not products:
        # Seed default products if table is empty
        default_prods = [
            LoanProduct(
                product_code="LP-MSME",
                name="MSME Business Growth Loan",
                category="MSME",
                min_amount=100000.0,
                max_amount=5000000.0,
                interest_rate=13.5,
                min_tenure=12,
                max_tenure=60,
                processing_fee_pct=1.5,
                description="Collateral-free working capital loan for registered micro, small and medium enterprises."
            ),
            LoanProduct(
                product_code="LP-PERS",
                name="Personal Instant Credit Line",
                category="Personal",
                min_amount=25000.0,
                max_amount=500000.0,
                interest_rate=14.0,
                min_tenure=6,
                max_tenure=36,
                processing_fee_pct=1.0,
                description="Instant digital personal financing for salaried professionals with same-day disbursement."
            ),
            LoanProduct(
                product_code="LP-AUTO",
                name="Commercial Vehicle Finance",
                category="Commercial Vehicle",
                min_amount=300000.0,
                max_amount=2500000.0,
                interest_rate=11.5,
                min_tenure=12,
                max_tenure=48,
                processing_fee_pct=1.2,
                description="Financing for logistics operators, trucks, buses, and commercial transport fleet vehicles."
            ),
            LoanProduct(
                product_code="LP-GOLD",
                name="Sovereign Gold Loan Facility",
                category="Gold",
                min_amount=50000.0,
                max_amount=2000000.0,
                interest_rate=9.5,
                min_tenure=3,
                max_tenure=24,
                processing_fee_pct=0.5,
                description="Low-interest liquidity backed by physical gold jewelry with instant appraisal."
            ),
            LoanProduct(
                product_code="LP-MICRO",
                name="Micro-Enterprise Community Loan",
                category="Microfinance",
                min_amount=15000.0,
                max_amount=100000.0,
                interest_rate=16.0,
                min_tenure=6,
                max_tenure=18,
                processing_fee_pct=1.0,
                description="Direct doorstep financing for neighborhood shops, artisans, and women micro-entrepreneurs."
            )
        ]
        db.add_all(default_prods)
        db.commit()
        products = default_prods

    return [{
        "id": p.id,
        "product_code": p.product_code,
        "name": p.name,
        "category": p.category,
        "min_amount": p.min_amount,
        "max_amount": p.max_amount,
        "min_tenure_months": p.min_tenure,
        "max_tenure_months": p.max_tenure,
        "interest_rate_pa": p.interest_rate,
        "processing_fee_pct": p.processing_fee_pct,
        "description": p.description,
        "eligibility_summary": f"Min CIBIL 650+; Min ₹{p.min_amount:,.0f} to Max ₹{p.max_amount:,.0f}; {p.min_tenure}-{p.max_tenure} Months"
    } for p in products]

# -------------------------------------------------------------
# 4. MULTI-STEP LOAN APPLICATION (STEPS 1-9)
# -------------------------------------------------------------
@router.post("/applications/draft")
def save_application_draft(
    payload: ApplicationDraftRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)

    app = None
    if payload.application_id:
        app = db.query(LoanApplication).filter(
            LoanApplication.application_id == payload.application_id,
            LoanApplication.customer_id == cust.id
        ).first()

    if not app:
        app_id = f"APP-{datetime.utcnow().strftime('%y%m')}-{uuid.uuid4().hex[:5].upper()}"
        app = LoanApplication(
            application_id=app_id,
            customer_id=cust.id,
            product_type=payload.product_type,
            requested_amount=payload.requested_amount,
            requested_tenure=payload.requested_tenure,
            purpose=payload.purpose,
            status="DRAFT",
            created_at=datetime.utcnow()
        )
        db.add(app)
    else:
        app.product_type = payload.product_type
        app.requested_amount = payload.requested_amount
        app.requested_tenure = payload.requested_tenure
        app.purpose = payload.purpose

    db.commit()
    db.refresh(app)

    return {
        "status": "success",
        "message": f"Application draft saved at Step {payload.step}.",
        "application_id": app.application_id,
        "step": payload.step
    }

@router.post("/applications/submit", status_code=status.HTTP_201_CREATED)
def submit_loan_application(
    payload: ApplicationSubmitRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)

    # Validate inputs
    if payload.requested_amount <= 0:
        raise HTTPException(status_code=400, detail="Requested amount must be greater than zero.")
    if payload.requested_tenure <= 0:
        raise HTTPException(status_code=400, detail="Requested tenure must be greater than zero.")

    app = None
    if payload.draft_application_id:
        app = db.query(LoanApplication).filter(
            LoanApplication.application_id == payload.draft_application_id,
            LoanApplication.customer_id == cust.id
        ).first()

    if not app:
        app_id = f"APP-{datetime.utcnow().strftime('%y%m')}-{uuid.uuid4().hex[:5].upper()}"
        app = LoanApplication(
            application_id=app_id,
            customer_id=cust.id,
            product_type=payload.product_type,
            requested_amount=payload.requested_amount,
            requested_tenure=payload.requested_tenure,
            purpose=payload.purpose,
            status="SUBMITTED",
            created_at=datetime.utcnow()
        )
        db.add(app)
    else:
        app.product_type = payload.product_type
        app.requested_amount = payload.requested_amount
        app.requested_tenure = payload.requested_tenure
        app.purpose = payload.purpose
        app.status = "SUBMITTED"

    # Link any documents provided
    if payload.uploaded_document_ids:
        docs = db.query(Document).filter(Document.doc_id.in_(payload.uploaded_document_ids)).all()
        for d in docs:
            d.application_id = app.id

    # Create audit event
    audit = AuditLog(
        action="LOAN_APPLICATION_SUBMITTED",
        resource=f"LOAN_APPLICATION:{app.application_id}",
        details_json=json.dumps({
            "product": app.product_type,
            "amount": app.requested_amount,
            "tenure": app.requested_tenure
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    # Customer notification
    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title="Application Submitted Successfully",
        message=f"Your loan application #{app.application_id} for ₹{app.requested_amount:,.0f} has been submitted for automated KYC and credit verification.",
        severity="Info",
        category="Loan Application",
        responsible_agent="Underwriting Desk",
        related_entity_id=cust.customer_id,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(app)

    return {
        "status": "success",
        "message": "Loan application successfully submitted and queued for verification.",
        "application_id": app.application_id,
        "application_status": app.status,
        "estimated_decision_time": "15 minutes (Autonomous Multi-Agent AI Underwriting)"
    }

@router.get("/applications")
def list_customer_applications(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    apps = db.query(LoanApplication).filter(
        LoanApplication.customer_id == cust.id
    ).order_by(desc(LoanApplication.id)).all()

    results = []
    for a in apps:
        results.append({
            "id": a.id,
            "application_id": a.application_id,
            "product_type": a.product_type,
            "requested_amount": a.requested_amount,
            "requested_tenure": a.requested_tenure,
            "purpose": a.purpose,
            "status": a.status,
            "approved_amount": a.approved_amount,
            "reviewer_notes": a.reviewer_notes,
            "reviewed_by": a.reviewed_by,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else None
        })
    return results

@router.get("/applications/{application_id}")
def get_application_details(
    application_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    app = db.query(LoanApplication).filter(
        (LoanApplication.application_id == application_id) | (LoanApplication.id == (int(application_id) if application_id.isdigit() else -1)),
        LoanApplication.customer_id == cust.id
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Calculate offer details if approved or offer sent
    offer = None
    if app.status in ["APPROVED", "Approved", "OFFER_SENT", "Offer_Sent", "CUSTOMER_ACCEPTED", "DISBURSEMENT_PENDING", "DISBURSED"]:
        rate = 13.5
        approved_amt = app.approved_amount or app.requested_amount
        tenure = app.requested_tenure
        emi = calculate_emi(approved_amt, rate, tenure)
        proc_fee = round(approved_amt * 0.015, 2)
        expiry = (app.created_at or datetime.utcnow()) + timedelta(days=7)

        offer = {
            "approved_amount": approved_amt,
            "interest_rate_pa": rate,
            "tenure_months": tenure,
            "monthly_emi": emi,
            "processing_fee": proc_fee,
            "offer_expiry_date": expiry.strftime("%Y-%m-%d"),
            "repayment_schedule_summary": f"{tenure} Equal Monthly Installments of ₹{emi:,.0f}"
        }

    return {
        "application_id": app.application_id,
        "product_type": app.product_type,
        "requested_amount": app.requested_amount,
        "requested_tenure": app.requested_tenure,
        "purpose": app.purpose,
        "status": app.status,
        "created_at": app.created_at.strftime("%Y-%m-%d %H:%M") if app.created_at else None,
        "reviewer_notes": app.reviewer_notes,
        "offer": offer
    }

# -------------------------------------------------------------
# 5. SANCTION OFFER ACCEPT / REJECT
# -------------------------------------------------------------
@router.post("/applications/{application_id}/offer-decision")
def decide_on_loan_offer(
    application_id: str,
    payload: OfferDecisionRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    app = db.query(LoanApplication).filter(
        (LoanApplication.application_id == application_id) | (LoanApplication.id == (int(application_id) if application_id.isdigit() else -1)),
        LoanApplication.customer_id == cust.id
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    if payload.action.upper() == "ACCEPT":
        app.status = "CUSTOMER_ACCEPTED"
        message = "Sanction offer accepted. Queued for operations disbursement."
        audit_action = "CUSTOMER_OFFER_ACCEPTED"
    elif payload.action.upper() == "REJECT":
        app.status = "REJECTED"
        message = "Sanction offer rejected by applicant."
        audit_action = "CUSTOMER_OFFER_REJECTED"
    else:
        raise HTTPException(status_code=400, detail="Action must be ACCEPT or REJECT.")

    # Audit & Notification
    audit = AuditLog(
        action=audit_action,
        resource=f"LOAN_APPLICATION:{app.application_id}",
        details_json=json.dumps({"decision": payload.action, "notes": payload.decision_notes}),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title=f"Offer {payload.action.capitalize()}ed",
        message=f"You have {payload.action.lower()}ed the loan offer for #{app.application_id}.",
        severity="Info",
        category="Loan Application",
        responsible_agent="Underwriting Desk",
        related_entity_id=cust.customer_id,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()

    return {
        "status": "success",
        "message": message,
        "application_id": app.application_id,
        "new_status": app.status
    }

# -------------------------------------------------------------
# 6. DEMO WORKFLOW STEP ADVANCER (For Verification & Demo Control)
# -------------------------------------------------------------
@router.post("/applications/{application_id}/advance-workflow")
def advance_workflow(
    application_id: str,
    payload: WorkflowAdvanceRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Seamlessly steps application through realistic NBFC workflow stages:
    DRAFT -> SUBMITTED -> DOCUMENT_VERIFICATION -> KYC_REVIEW -> FRAUD_REVIEW ->
    CREDIT_REVIEW -> APPROVAL_PENDING -> APPROVED -> OFFER_SENT ->
    CUSTOMER_ACCEPTED -> DISBURSEMENT_PENDING -> DISBURSED
    """
    cust = get_portal_customer(current_user, db)
    app = db.query(LoanApplication).filter(
        (LoanApplication.application_id == application_id) | (LoanApplication.id == (int(application_id) if application_id.isdigit() else -1))
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    target = payload.target_status.upper().replace(' ', '_')
    app.status = target

    if target in ["APPROVED", "OFFER_SENT"]:
        app.approved_amount = app.requested_amount
        app.reviewer_notes = "Approved based on XGBoost automated scoring and clean bureau credit record."
        app.reviewed_by = "Automated Credit Policy Engine"
        app.reviewed_at = datetime.utcnow()

    # If disbursed, create an active Loan and Repayment schedule!
    created_loan_id = None
    if target == "DISBURSED":
        loan_id_str = f"LN-{datetime.utcnow().strftime('%y%m')}-{uuid.uuid4().hex[:5].upper()}"
        principal = app.approved_amount or app.requested_amount
        tenure = app.requested_tenure
        rate = 13.5
        emi = calculate_emi(principal, rate, tenure)

        new_loan = Loan(
            loan_id=loan_id_str,
            customer_id=app.customer_id,
            product_type=app.product_type,
            loan_amount=principal,
            interest_rate=rate,
            loan_tenure=tenure,
            emi=emi,
            outstanding_balance=principal,
            dpd=0,
            status="Active",
            disbursed_date=datetime.utcnow()
        )
        db.add(new_loan)
        db.flush()
        created_loan_id = new_loan.loan_id

        # Generate 6 initial repayment schedules
        today = datetime.utcnow()
        for i in range(1, min(7, tenure + 1)):
            due_dt = (today.replace(day=1) + timedelta(days=32 * i)).replace(day=5)
            rep = Repayment(
                repayment_id=f"REP-{uuid.uuid4().hex[:8].upper()}",
                loan_id=new_loan.id,
                customer_id=app.customer_id,
                due_date=due_dt,
                amount_due=emi,
                amount_paid=0.0,
                dpd=0,
                status="Pending"
            )
            db.add(rep)

        # Create disbursement transaction
        txn = Transaction(
            transaction_id=f"TXN-DISB-{uuid.uuid4().hex[:6].upper()}",
            customer_id=app.customer_id,
            loan_id=new_loan.id,
            transaction_amount=principal,
            transaction_type="Disbursement",
            channel="NEFT_RTGS",
            status="Success",
            category="Loan Disbursement"
        )
        db.add(txn)

    # Generate contextual customer notifications for workflow transitions
    notif_details = {
        "DOCUMENT_VERIFICATION": ("Document Verification Started", f"Documents submitted for application #{app.application_id} are under compliance verification.", "Info"),
        "KYC_REVIEW": ("KYC Review In Progress", f"Identity and address biometric KYC verification initiated for #{app.application_id}.", "Info"),
        "FRAUD_REVIEW": ("Fraud & AML Check", f"Automated forensics scan running for application #{app.application_id}.", "Info"),
        "CREDIT_REVIEW": ("Credit Review", f"Autonomous credit scoring engine is assessing eligibility for #{app.application_id}.", "Info"),
        "RISK_REVIEW": ("Risk Policy Review", f"Portfolio concentration and risk committee evaluation underway for #{app.application_id}.", "Info"),
        "APPROVAL_PENDING": ("Approval Pending", f"Application #{app.application_id} is awaiting final sign-off.", "Info"),
        "APPROVED": ("Application Approved", f"Congratulations! Your application #{app.application_id} for ₹{app.requested_amount:,.0f} has been approved.", "Low"),
        "OFFER_SENT": ("Offer Received", f"Sanction offer issued for application #{app.application_id}. Please review terms and accept online.", "Low"),
        "CUSTOMER_ACCEPTED": ("Offer Accepted", f"You have accepted the sanction offer for #{app.application_id}. Moving to treasury disbursement queue.", "Low"),
        "DISBURSEMENT_PENDING": ("Disbursement Pending", f"Mandate verified. NACH / NEFT funds transfer scheduled for #{app.application_id}.", "Info"),
        "DISBURSED": ("Disbursement Completed", f"Disbursement of ₹{(app.approved_amount or app.requested_amount):,.0f} completed! Facility #{created_loan_id or app.application_id} is now active.", "Low"),
        "REJECTED": ("Application Rejected", f"Your application #{app.application_id} could not be sanctioned at this time under credit policy guidelines.", "High"),
        "CANCELLED": ("Application Cancelled", f"Application #{app.application_id} has been cancelled.", "Medium"),
    }

    if target in notif_details:
        ntitle, nmsg, nsev = notif_details[target]
        notif = Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title=ntitle,
            message=nmsg,
            severity=nsev,
            category="Loan Application" if target != "DISBURSED" else "Disbursement Pipeline",
            responsible_agent="Underwriting Desk",
            related_entity_id=cust.customer_id,
            created_at=datetime.utcnow()
        )
        db.add(notif)

    db.commit()

    return {
        "status": "success",
        "application_id": app.application_id,
        "new_status": app.status,
        "created_loan_id": created_loan_id
    }

# -------------------------------------------------------------
# 7. ACTIVE LOANS & REPAYMENT SCHEDULE
# -------------------------------------------------------------
@router.get("/loans")
def list_customer_loans(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    loans = db.query(Loan).filter(Loan.customer_id == cust.id).order_by(desc(Loan.id)).all()

    results = []
    for l in loans:
        results.append({
            "id": l.id,
            "loan_id": l.loan_id,
            "product_type": l.product_type,
            "principal_amount": l.loan_amount,
            "outstanding_balance": l.outstanding_balance,
            "interest_rate": l.interest_rate,
            "loan_tenure": l.loan_tenure,
            "emi": l.emi,
            "dpd": l.dpd or 0,
            "status": l.status,
            "disbursed_date": l.disbursed_date.strftime("%Y-%m-%d") if l.disbursed_date else None
        })
    return results

@router.get("/loans/{loan_id}")
def get_customer_loan_details(
    loan_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    loan = db.query(Loan).filter(
        (Loan.loan_id == loan_id) | (Loan.id == (int(loan_id) if loan_id.isdigit() else -1)),
        Loan.customer_id == cust.id
    ).first()

    if not loan:
        raise HTTPException(status_code=404, detail="Loan facility not found.")

    # Repayment schedule
    repayments = db.query(Repayment).filter(
        Repayment.loan_id == loan.id
    ).order_by(Repayment.due_date).all()

    schedule = [{
        "repayment_id": r.repayment_id,
        "due_date": r.due_date.strftime("%Y-%m-%d"),
        "amount_due": r.amount_due,
        "amount_paid": r.amount_paid or 0.0,
        "status": r.status,
        "payment_date": r.repayment_date.strftime("%Y-%m-%d") if r.repayment_date else None
    } for r in repayments]

    # Payment transactions history
    transactions = db.query(Transaction).filter(
        Transaction.loan_id == loan.id
    ).order_by(desc(Transaction.transaction_timestamp)).all()

    history = [{
        "transaction_id": t.transaction_id,
        "amount": t.transaction_amount,
        "type": t.transaction_type,
        "channel": t.channel,
        "status": t.status,
        "timestamp": t.transaction_timestamp.strftime("%Y-%m-%d %H:%M") if t.transaction_timestamp else None
    } for t in transactions]

    next_pending = next((r for r in repayments if r.status != 'Paid'), None)
    next_due_date = next_pending.due_date.strftime("%Y-%m-%d") if next_pending else None

    return {
        "loan_id": loan.loan_id,
        "product_type": loan.product_type,
        "principal": loan.loan_amount,
        "outstanding_amount": loan.outstanding_balance,
        "interest_rate": loan.interest_rate,
        "tenure_months": loan.loan_tenure,
        "emi": loan.emi,
        "dpd": loan.dpd or 0,
        "status": loan.status,
        "next_due_date": next_due_date,
        "disbursed_date": loan.disbursed_date.strftime("%Y-%m-%d") if loan.disbursed_date else None,
        "repayment_schedule": schedule,
        "payment_history": history
    }

# -------------------------------------------------------------
# 8. DEMO PAYMENT SIMULATION
# -------------------------------------------------------------
@router.post("/payments/simulate")
def simulate_emi_payment(
    payload: PaymentSimulationRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Executes a simulated EMI payment transaction:
    - Validates amount
    - Updates repayment schedule record
    - Reduces loan outstanding balance
    - Clears DPD if overdue
    - Logs audit and triggers customer notification
    """
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    cust = get_portal_customer(current_user, db)
    loan = db.query(Loan).filter(
        (Loan.loan_id == payload.loan_id) | (Loan.id == (int(payload.loan_id) if payload.loan_id.isdigit() else -1)),
        Loan.customer_id == cust.id
    ).first()

    if not loan:
        raise HTTPException(status_code=404, detail="Loan facility not found.")

    # Deduct from outstanding balance
    loan.outstanding_balance = max(0.0, (loan.outstanding_balance or loan.loan_amount) - payload.amount)
    if loan.outstanding_balance == 0.0:
        loan.status = "Closed"
    loan.dpd = 0  # Cleared on payment

    # Create transaction
    txn_id = f"TXN-PAY-{uuid.uuid4().hex[:6].upper()}"
    txn = Transaction(
        transaction_id=txn_id,
        customer_id=cust.id,
        loan_id=loan.id,
        transaction_amount=payload.amount,
        transaction_type="EMI_Repayment",
        channel=payload.payment_channel,
        status="Success",
        category="Retail Repayment",
        transaction_timestamp=datetime.utcnow()
    )
    db.add(txn)

    # Find earliest pending or late repayment to mark as paid
    rep = db.query(Repayment).filter(
        Repayment.loan_id == loan.id,
        Repayment.status != "Paid"
    ).order_by(Repayment.due_date).first()

    if rep:
        rep.status = "Paid"
        rep.amount_paid = payload.amount
        rep.repayment_date = datetime.utcnow()
        rep.dpd = 0
    else:
        # Create a new repayment record if none pending
        rep = Repayment(
            repayment_id=f"REP-{uuid.uuid4().hex[:8].upper()}",
            loan_id=loan.id,
            customer_id=cust.id,
            due_date=datetime.utcnow(),
            repayment_date=datetime.utcnow(),
            amount_due=payload.amount,
            amount_paid=payload.amount,
            status="Paid",
            dpd=0
        )
        db.add(rep)

    # Audit log
    audit = AuditLog(
        action="EMI_PAYMENT_SIMULATED",
        resource=f"LOAN:{loan.loan_id}",
        details_json=json.dumps({
            "amount": payload.amount,
            "channel": payload.payment_channel,
            "remaining_outstanding": loan.outstanding_balance
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    # Notification
    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title="Payment Received",
        message=f"Your EMI payment of ₹{payload.amount:,.2f} for loan facility #{loan.loan_id} has been processed successfully via {payload.payment_channel}.",
        severity="Low",
        category="Repayment",
        responsible_agent="Treasury Operations",
        related_entity_id=cust.customer_id,
        created_at=datetime.utcnow()
    )
    # Update collections data if relevant
    try:
        from app.models.assessments import CollectionRecord
        coll_records = db.query(CollectionRecord).filter(
            CollectionRecord.loan_id == loan.id,
            CollectionRecord.status.in_(["Pending", "In_Progress", "Escalated", "Active"])
        ).all()
        for coll in coll_records:
            coll.status = "Recovered"
            coll.updated_at = datetime.utcnow()
    except Exception:
        pass

    db.commit()

    return {
        "status": "success",
        "message": f"Simulated payment of ₹{payload.amount:,.2f} recorded successfully.",
        "transaction_id": txn_id,
        "new_outstanding_balance": loan.outstanding_balance,
        "loan_status": loan.status
    }

# -------------------------------------------------------------
# 9. CUSTOMER DOCUMENTS
# -------------------------------------------------------------
@router.get("/documents")
def list_customer_documents(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    docs = db.query(Document).filter(Document.customer_id == cust.id).order_by(desc(Document.id)).all()

    return [{
        "doc_id": d.doc_id,
        "doc_type": d.doc_type,
        "file_name": d.file_name,
        "file_size_kb": d.file_size_kb,
        "status": d.status,
        "verified_by": d.verified_by,
        "verification_notes": d.verification_notes,
        "uploaded_at": d.uploaded_at.strftime("%Y-%m-%d %H:%M") if d.uploaded_at else None
    } for d in docs]

@router.post("/documents/upload", status_code=status.HTTP_201_CREATED)
def upload_customer_document(
    doc_type: str = Query(..., description="PAN_CARD, AADHAAR, BANK_STATEMENT, SALARY_SLIP, OTHER"),
    file_name: str = Query("document.pdf"),
    file_size_kb: int = Query(450),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    doc_id = f"DOC-{datetime.utcnow().strftime('%y%m')}-{uuid.uuid4().hex[:4].upper()}"

    doc = Document(
        doc_id=doc_id,
        customer_id=cust.id,
        doc_type=doc_type.upper(),
        file_name=file_name,
        file_size_kb=file_size_kb,
        status="UPLOADED",
        uploaded_at=datetime.utcnow()
    )
    db.add(doc)

    # Notification
    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title="Document Uploaded",
        message=f"Your {doc_type.replace('_', ' ')} has been uploaded and queued for KYC compliance verification.",
        severity="Low",
        category="Documents",
        responsible_agent="KYC Operations",
        related_entity_id=cust.customer_id,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(doc)

    return {
        "status": "success",
        "message": f"{doc_type} uploaded successfully.",
        "doc_id": doc.doc_id,
        "document_status": doc.status
    }

# -------------------------------------------------------------
# 10. SUPPORT TICKETS
# -------------------------------------------------------------
@router.get("/support-tickets")
def list_customer_support_tickets(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    tickets = db.query(SupportTicket).filter(
        SupportTicket.customer_id == cust.id
    ).order_by(desc(SupportTicket.id)).all()

    results = []
    for t in tickets:
        msgs = []
        try:
            msgs = json.loads(t.messages_json or "[]")
        except Exception:
            msgs = []
        results.append({
            "ticket_id": t.ticket_id,
            "subject": t.subject,
            "category": t.category,
            "priority": t.priority,
            "status": t.status,
            "assigned_to": t.assigned_to,
            "messages": msgs,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else None
        })
    return results

@router.post("/support-tickets", status_code=status.HTTP_201_CREATED)
def create_customer_support_ticket(
    payload: SupportTicketCreateRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    ticket_id = f"TICK-{datetime.utcnow().strftime('%y%m')}-{uuid.uuid4().hex[:4].upper()}"

    initial_msgs = [{
        "sender": "customer",
        "text": payload.message,
        "time": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    }]

    ticket = SupportTicket(
        ticket_id=ticket_id,
        customer_id=cust.id,
        subject=payload.subject,
        category=payload.category,
        priority=payload.priority,
        status="OPEN",
        assigned_to="Customer Relationship Desk",
        messages_json=json.dumps(initial_msgs),
        created_at=datetime.utcnow()
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return {
        "status": "success",
        "message": "Support ticket created. Our relationship officer will reply shortly.",
        "ticket_id": ticket.ticket_id
    }

@router.post("/support-tickets/{ticket_id}/reply")
def reply_support_ticket(
    ticket_id: str,
    payload: SupportTicketReplyRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    ticket = db.query(SupportTicket).filter(
        (SupportTicket.ticket_id == ticket_id) | (SupportTicket.id == (int(ticket_id) if ticket_id.isdigit() else -1)),
        SupportTicket.customer_id == cust.id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found.")

    msgs = []
    try:
        msgs = json.loads(ticket.messages_json or "[]")
    except Exception:
        msgs = []

    msgs.append({
        "sender": "customer",
        "text": payload.message,
        "time": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    })
    ticket.messages_json = json.dumps(msgs)
    ticket.updated_at = datetime.utcnow()

    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title="Support Response",
        message=f"Update recorded on support ticket #{ticket.ticket_id} ({ticket.subject}).",
        severity="Low",
        category="Customer Alert",
        responsible_agent="Customer Desk",
        related_entity_id=cust.customer_id,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()

    return {"status": "success", "ticket_id": ticket.ticket_id, "messages_count": len(msgs)}

# -------------------------------------------------------------
# 11. NOTIFICATIONS
# -------------------------------------------------------------
@router.get("/notifications")
def get_customer_notifications(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    notifs = db.query(Notification).filter(
        (Notification.related_entity_id == cust.customer_id) |
        (Notification.category.in_(["Customer Alert", "Loan Application", "Repayment", "Disbursement Pipeline"]))
    ).order_by(desc(Notification.id)).limit(20).all()

    return [{
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "severity": n.severity,
        "category": n.category,
        "is_read": n.is_read,
        "created_at": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else None
    } for n in notifs]

@router.post("/notifications/mark-read")
def mark_notifications_read(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    cust = get_portal_customer(current_user, db)
    db.query(Notification).filter(
        Notification.related_entity_id == cust.customer_id
    ).update({"is_read": True})
    db.commit()
    return {"status": "success", "message": "All notifications marked as read."}
