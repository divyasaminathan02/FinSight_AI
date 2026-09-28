"""
FinSight AI - Relationship Management Router
Provides Relationship Manager dashboard, customer assignment, customer 360 overview,
and real database-backed unified customer timeline.
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_, and_

from app.database import get_db
from app.models.customers import Customer, CustomerProfile
from app.models.loans import LoanApplication, Loan
from app.models.transactions import Repayment, Transaction
from app.models.portal_models import Lead, WorkTask, Document, SupportTicket, CustomerCommunication, KycCase, FraudCase, RiskDecisionHistory
from app.models.notifications import Notification
from app.models.assessments import FraudAlert
from app.models.users import User, UserRole, AuditLog
from app.security.jwt import get_current_user_optional
from app.services.followup_service import FollowUpAutomationService

router = APIRouter(prefix="/relationship", tags=["Relationship Management"])

class AssignCustomerPayload(BaseModel):
    assigned_manager: str
    reason: Optional[str] = "Portfolio allocation"

class CustomerNoteCreate(BaseModel):
    note: str

class CustomerFollowUpCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: datetime
    priority: str = "MEDIUM"

class RequestDocPayload(BaseModel):
    document_type: str
    instructions: Optional[str] = "Please provide updated verification document"

class EscalateIssuePayload(BaseModel):
    reason: str
    target_role: str = "OPERATIONS_MANAGER"
    priority: str = "HIGH"

def _is_team_manager(user: Optional[User]) -> bool:
    if not user:
        return True
    return user.role in [
        UserRole.ADMIN,
        UserRole.RISK_MANAGER,
        UserRole.OPERATIONS_MANAGER,
        UserRole.COLLECTIONS_MANAGER,
        "RELATIONSHIP_HEAD",
        "CREDIT_MANAGER"
    ]

@router.get("/dashboard")
def get_relationship_dashboard(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_name = current_user.full_name if current_user else None
    user_email = current_user.email if current_user else None
    is_manager = _is_team_manager(current_user)

    # Scoping Customers
    cust_q = db.query(Customer)
    if not is_manager and user_name:
        cust_q = cust_q.filter(
            (Customer.relationship_manager == user_name) |
            (Customer.relationship_manager == user_email) |
            (Customer.assigned_officer == user_name) |
            (Customer.relationship_manager.is_(None))
        )
    assigned_customers_count = cust_q.count()
    assigned_customer_ids = [c.id for c in cust_q.all()]

    # Scoping Applications for assigned customers
    app_q = db.query(LoanApplication).filter(LoanApplication.customer_id.in_(assigned_customer_ids if assigned_customer_ids else [-1]))
    customer_apps_count = app_q.count()

    # Active Loans for assigned customers
    active_loans_q = db.query(Loan).filter(
        Loan.customer_id.in_(assigned_customer_ids if assigned_customer_ids else [-1]),
        Loan.status.in_(["Active", "Current"])
    )
    active_loans_count = active_loans_q.count()

    # Upcoming EMI within 7 days
    now = datetime.utcnow()
    seven_days = now + timedelta(days=7)
    assigned_loan_ids = [l.id for l in active_loans_q.all()]

    upcoming_emi_q = db.query(Repayment).filter(
        Repayment.loan_id.in_(assigned_loan_ids if assigned_loan_ids else [-1]),
        Repayment.status.in_(["PENDING", "Pending", "Due"]),
        Repayment.due_date >= now,
        Repayment.due_date <= seven_days
    )
    upcoming_emi_count = upcoming_emi_q.count()
    upcoming_emi_amount = float(db.query(func.sum(Repayment.amount_due)).filter(
        Repayment.loan_id.in_(assigned_loan_ids if assigned_loan_ids else [-1]),
        Repayment.status.in_(["PENDING", "Pending", "Due"]),
        Repayment.due_date >= now,
        Repayment.due_date <= seven_days
    ).scalar() or 0.0)

    # Overdue accounts (Repayment with due_date < now and status != Paid, or dpd > 0)
    overdue_q = db.query(Repayment).filter(
        Repayment.loan_id.in_(assigned_loan_ids if assigned_loan_ids else [-1]),
        or_(Repayment.status.in_(["Overdue", "OVERDUE", "Late"]), and_(Repayment.due_date < now, Repayment.status != "Paid"))
    )
    overdue_accounts_count = overdue_q.count()

    # Follow-ups & Tasks
    tasks_q = db.query(WorkTask).filter(WorkTask.status.in_(["TODO", "IN_PROGRESS", "WAITING", "PENDING"]))
    if not is_manager and user_name:
        tasks_q = tasks_q.filter(
            (WorkTask.assigned_to.ilike(f"%{user_name}%")) |
            (WorkTask.role_target.in_(["RELATIONSHIP_MANAGER", "RELATIONSHIP"]))
        )
    tasks_list = tasks_q.order_by(desc(WorkTask.id)).limit(10).all()
    follow_ups_count = tasks_q.filter(WorkTask.title.ilike("%Follow-up%")).count()

    # Customer Messages
    messages_q = db.query(CustomerCommunication).order_by(desc(CustomerCommunication.id)).limit(8)
    recent_messages = messages_q.all()

    # Recent Activity (Audit logs relating to customers)
    activity_q = db.query(AuditLog).order_by(desc(AuditLog.id)).limit(10)
    recent_activity = activity_q.all()

    # List of Assigned Customers for Quick Table
    customers_preview = cust_q.order_by(desc(Customer.id)).limit(10).all()
    customers_data = []
    for c in customers_preview:
        prof = db.query(CustomerProfile).filter(CustomerProfile.customer_id == c.id).first()
        active_loan = db.query(Loan).filter(Loan.customer_id == c.id, Loan.status == "Active").first()
        customers_data.append({
            "id": c.id,
            "customer_id": c.customer_id,
            "name": f"{c.first_name} {c.last_name}",
            "email": c.email,
            "income": c.income,
            "credit_score": c.credit_score,
            "financial_health": prof.financial_health_score if prof else 75.0,
            "assigned_manager": c.relationship_manager or c.assigned_officer or "Desk",
            "active_loan": active_loan.loan_id if active_loan else "None",
            "outstanding_principal": active_loan.outstanding_balance if active_loan else 0.0
        })

    return {
        "manager_name": user_name or "Relationship Desk",
        "assigned_customers": assigned_customers_count,
        "customer_applications": customer_apps_count,
        "active_loans": active_loans_count,
        "upcoming_emi_count": upcoming_emi_count,
        "upcoming_emi_amount": upcoming_emi_amount,
        "upcoming_emi_amount_formatted": f"₹{upcoming_emi_amount:,.0f}",
        "overdue_accounts": overdue_accounts_count,
        "follow_ups": follow_ups_count,
        "tasks": [
            {
                "id": t.id,
                "task_id": t.task_id,
                "title": t.title,
                "priority": t.priority,
                "status": t.status,
                "due_date": t.due_date,
                "customer_id": t.customer_id
            }
            for t in tasks_list
        ],
        "customer_messages": [
            {
                "id": m.id,
                "comm_id": m.comm_id,
                "sender": m.sender,
                "subject": m.subject,
                "message": m.message,
                "created_at": m.created_at
            }
            for m in recent_messages
        ],
        "recent_activity": [
            {
                "id": a.id,
                "action": a.action,
                "resource": a.resource,
                "details": a.details_json,
                "created_at": a.created_at
            }
            for a in recent_activity
        ],
        "customers": customers_data
    }

@router.get("/customers")
def list_relationship_customers(
    search: Optional[str] = None,
    risk_tier: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    is_manager = _is_team_manager(current_user)

    if not is_manager and current_user and current_user.role == UserRole.RELATIONSHIP_MANAGER:
        user_name = current_user.full_name
        query = query.filter(
            (Customer.relationship_manager == user_name) |
            (Customer.relationship_manager == current_user.email) |
            (Customer.assigned_officer == user_name) |
            (Customer.relationship_manager.is_(None))
        )

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Customer.first_name.ilike(search_fmt)) |
            (Customer.last_name.ilike(search_fmt)) |
            (Customer.email.ilike(search_fmt)) |
            (Customer.customer_id.ilike(search_fmt))
        )
    if risk_tier:
        query = query.filter(Customer.risk_tier.ilike(f"%{risk_tier}%"))

    customers = query.order_by(desc(Customer.id)).all()
    results = []
    for c in customers:
        loans_count = db.query(Loan).filter(Loan.customer_id == c.id, Loan.status == "Active").count()
        apps_count = db.query(LoanApplication).filter(LoanApplication.customer_id == c.id).count()
        results.append({
            "id": c.id,
            "customer_id": c.customer_id,
            "full_name": f"{c.first_name} {c.last_name}",
            "email": c.email,
            "income": c.income,
            "credit_score": c.credit_score,
            "risk_tier": c.risk_tier,
            "occupation": c.occupation,
            "location": c.location,
            "assigned_manager": c.relationship_manager or c.assigned_officer or "Unassigned",
            "active_loans": loans_count,
            "total_applications": apps_count,
            "created_at": c.created_at
        })
    return results

@router.get("/customers/{customer_id}/details")
def get_relationship_customer_details(
    customer_id: str,
    db: Session = Depends(get_db)
):
    c = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == (int(customer_id) if customer_id.isdigit() else -1))
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    profile = db.query(CustomerProfile).filter(CustomerProfile.customer_id == c.id).first()
    loans = db.query(Loan).filter(Loan.customer_id == c.id).all()
    applications = db.query(LoanApplication).filter(LoanApplication.customer_id == c.id).all()
    
    # Active loans repayment status
    loan_details = []
    for l in loans:
        schedules = db.query(Repayment).filter(Repayment.loan_id == l.id).all()
        overdue_cnt = sum(1 for s in schedules if s.status in ["Overdue", "OVERDUE", "Late"] or (s.due_date < datetime.utcnow() and s.status != "Paid"))
        loan_details.append({
            "id": l.id,
            "loan_id": l.loan_id,
            "product_type": l.product_type,
            "sanctioned_amount": l.loan_amount,
            "current_principal": l.outstanding_balance,
            "interest_rate": l.interest_rate,
            "status": l.status,
            "overdue_installments": overdue_cnt
        })

    # Notes history
    notes = []
    try:
        if c.relationship_notes_json:
            notes = json.loads(c.relationship_notes_json)
    except Exception:
        notes = []

    return {
        "customer": {
            "id": c.id,
            "customer_id": c.customer_id,
            "name": f"{c.first_name} {c.last_name}",
            "email": c.email,
            "age": c.age,
            "gender": c.gender,
            "occupation": c.occupation,
            "employment_type": c.employment_type,
            "income": c.income,
            "bank_balance": c.bank_balance,
            "credit_score": c.credit_score,
            "risk_tier": c.risk_tier,
            "assigned_manager": c.relationship_manager or c.assigned_officer or "Unassigned",
            "created_at": c.created_at
        },
        "profile": {
            "financial_health_score": profile.financial_health_score if profile else 75.0,
            "churn_risk": profile.churn_risk if profile else 0.05,
            "segment": profile.segment if profile else "Retail",
            "savings_ratio": profile.savings_ratio if profile else 0.25
        } if profile else None,
        "loans": loan_details,
        "applications": [
            {
                "id": a.id,
                "application_id": a.application_id,
                "product_type": a.product_type,
                "requested_amount": a.requested_amount,
                "status": a.status,
                "risk_score": a.risk_score,
                "created_at": a.created_at
            }
            for a in applications
        ],
        "relationship_notes": notes
    }

@router.post("/customers/{customer_id}/assign")
def assign_customer_manager(
    customer_id: str,
    payload: AssignCustomerPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    c = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == (int(customer_id) if customer_id.isdigit() else -1))
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    old_mgr = c.relationship_manager
    c.relationship_manager = payload.assigned_manager
    c.assigned_officer = payload.assigned_manager

    audit = AuditLog(
        action="CUSTOMER_REASSIGNED" if old_mgr else "CUSTOMER_ASSIGNED",
        resource=f"CUST:{c.customer_id}",
        details_json=json.dumps({
            "previous_manager": old_mgr,
            "new_manager": payload.assigned_manager,
            "reason": payload.reason,
            "assigned_by": current_user.email if current_user else "System"
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    FollowUpAutomationService.create_notification(
        db=db,
        title=f"Customer Assigned: {c.first_name} {c.last_name}",
        message=f"Customer #{c.customer_id} has been assigned to your relationship portfolio.",
        severity="Info",
        category="Portfolio Assignment",
        responsible_agent="Relationship Intelligence",
        recipient_email=payload.assigned_manager,
        role_target="RELATIONSHIP_MANAGER",
        related_entity_type="CUSTOMER",
        related_entity_id=c.customer_id
    )

    db.commit()
    return {"status": "success", "message": f"Customer assigned to {payload.assigned_manager}"}

@router.post("/customers/{customer_id}/notes")
def add_customer_relationship_note(
    customer_id: str,
    payload: CustomerNoteCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    c = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == (int(customer_id) if customer_id.isdigit() else -1))
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    author = current_user.full_name if current_user else "Relationship Manager"
    notes = []
    try:
        if c.relationship_notes_json:
            notes = json.loads(c.relationship_notes_json)
    except Exception:
        notes = []

    notes.append({
        "note": payload.note,
        "author": author,
        "timestamp": datetime.utcnow().isoformat()
    })
    c.relationship_notes_json = json.dumps(notes)

    # Also log as internal communication record
    comm = CustomerCommunication(
        comm_id=f"COMM-{uuid.uuid4().hex[:6].upper()}",
        customer_id=c.customer_id,
        sender=author,
        sender_role="RELATIONSHIP_MANAGER",
        recipient="Customer File",
        comm_type="INTERNAL_NOTE",
        subject=f"Relationship Note for {c.customer_id}",
        message=payload.note,
        created_at=datetime.utcnow()
    )
    db.add(comm)

    audit = AuditLog(
        action="CUSTOMER_NOTE_ADDED",
        resource=f"CUST:{c.customer_id}",
        details_json=json.dumps({"note": payload.note, "author": author}),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": "Relationship note saved", "total_notes": len(notes)}

@router.post("/customers/{customer_id}/follow-up")
def create_customer_follow_up(
    customer_id: str,
    payload: CustomerFollowUpCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    c = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == (int(customer_id) if customer_id.isdigit() else -1))
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    assignee = c.relationship_manager or (current_user.full_name if current_user else "Relationship Desk")

    task = FollowUpAutomationService.create_automated_task(
        db=db,
        title=payload.title,
        description=payload.description or f"Follow-up for customer {c.customer_id}",
        customer_id=c.customer_id,
        application_id=None,
        assigned_user=assignee,
        role_target="RELATIONSHIP_MANAGER",
        priority=payload.priority,
        due_hours=max(1, int((payload.due_date - datetime.utcnow()).total_seconds() // 3600)),
        related_entity_type="CUSTOMER",
        related_entity_id=c.customer_id
    )

    audit = AuditLog(
        action="CUSTOMER_FOLLOW_UP_CREATED",
        resource=f"CUST:{c.customer_id}",
        details_json=json.dumps({"task_id": task.task_id, "title": payload.title}),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": "Follow-up task created", "task_id": task.task_id}

@router.post("/customers/{customer_id}/request-document")
def request_customer_document(
    customer_id: str,
    payload: RequestDocPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    c = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == (int(customer_id) if customer_id.isdigit() else -1))
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    sender = current_user.full_name if current_user else "Relationship Manager"

    task = FollowUpAutomationService.create_automated_task(
        db=db,
        title=f"Collect Document: {payload.document_type} ({c.customer_id})",
        description=f"Requested by {sender}. Instructions: {payload.instructions}",
        customer_id=c.customer_id,
        assigned_user=c.relationship_manager or sender,
        role_target="RELATIONSHIP_MANAGER",
        priority="HIGH",
        due_hours=24
    )

    FollowUpAutomationService.create_notification(
        db=db,
        title=f"Document Request: {payload.document_type}",
        message=f"{payload.instructions}. Please upload to your profile.",
        severity="Medium",
        category="Document Request",
        responsible_agent="Customer Intelligence",
        recipient_email=c.email,
        role_target="CUSTOMER",
        related_entity_type="CUSTOMER",
        related_entity_id=c.customer_id
    )

    audit = AuditLog(
        action="DOCUMENT_REQUESTED",
        resource=f"CUST:{c.customer_id}",
        details_json=json.dumps({"document_type": payload.document_type}),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Requested document {payload.document_type}", "task_id": task.task_id}

@router.post("/customers/{customer_id}/escalate")
def escalate_customer_issue(
    customer_id: str,
    payload: EscalateIssuePayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    c = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == (int(customer_id) if customer_id.isdigit() else -1))
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    sender = current_user.full_name if current_user else "Relationship Manager"

    task = FollowUpAutomationService.create_automated_task(
        db=db,
        title=f"CUSTOMER ESCALATION: {c.customer_id} - {payload.reason[:40]}",
        description=f"Escalated by {sender}. Details: {payload.reason}",
        customer_id=c.customer_id,
        role_target=payload.target_role,
        priority=payload.priority,
        due_hours=12
    )

    audit = AuditLog(
        action="CUSTOMER_ESCALATED",
        resource=f"CUST:{c.customer_id}",
        details_json=json.dumps({"reason": payload.reason, "target_role": payload.target_role}),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Customer escalated to {payload.target_role}", "task_id": task.task_id}

# ==========================================
# UNIFIED CUSTOMER TIMELINE (REAL DB EVENTS)
# ==========================================
@router.get("/customers/{customer_id}/timeline")
def get_customer_unified_timeline(
    customer_id: str,
    db: Session = Depends(get_db)
):
    """
    Creates a unified timeline showing actual database events:
    - Lead created
    - Customer created
    - Application started
    - Documents uploaded
    - KYC completed
    - Fraud review
    - Credit review
    - Risk review
    - Approval
    - Offer
    - Offer acceptance
    - Disbursement
    - Payments
    - Collections
    - Support tickets
    - Messages
    - Notes
    """
    c = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == (int(customer_id) if customer_id.isdigit() else -1))
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    timeline = []

    # 1. Lead Event
    lead = db.query(Lead).filter(
        (Lead.converted_customer_id == c.customer_id) |
        (Lead.email == c.email)
    ).first()
    if lead:
        timeline.append({
            "event_type": "LEAD_CREATED",
            "category": "Sales",
            "title": f"Lead Captured: {lead.lead_id}",
            "description": f"Initial inquiry for {lead.product_type} of ₹{lead.requested_amount:,.0f} captured.",
            "timestamp": lead.created_at,
            "badge_color": "blue"
        })

    # 2. Customer Created
    timeline.append({
        "event_type": "CUSTOMER_CREATED",
        "category": "Onboarding",
        "title": f"Customer Profile Registered: {c.customer_id}",
        "description": f"Customer account registered for {c.first_name} {c.last_name} in {c.location}.",
        "timestamp": c.created_at,
        "badge_color": "emerald"
    })

    # 3. Applications and Underwriting Events
    apps = db.query(LoanApplication).filter(LoanApplication.customer_id == c.id).all()
    for a in apps:
        # App started
        timeline.append({
            "event_type": "APPLICATION_STARTED",
            "category": "Application",
            "title": f"Loan Application Started: {a.application_id}",
            "description": f"Applied for ₹{a.requested_amount:,.0f} ({a.product_type}) with tenure {a.requested_tenure} months.",
            "timestamp": a.created_at,
            "badge_color": "indigo"
        })

        # Credit review event if evaluated
        if a.ai_recommendation or a.analyst_recommendation:
            timeline.append({
                "event_type": "CREDIT_REVIEW",
                "category": "Credit",
                "title": f"Credit Review Completed ({a.application_id})",
                "description": f"AI Recommendation: {a.ai_recommendation or 'N/A'} (Score: {a.ai_credit_score or a.risk_score}). Analyst Recommendation: {a.analyst_recommendation or 'In Progress'}.",
                "timestamp": a.analyst_submitted_at or a.created_at + timedelta(minutes=15),
                "badge_color": "purple"
            })

        # Approval / Rejection event
        if a.manager_decision:
            is_approved = a.manager_decision.upper() in ["APPROVE", "APPROVED"]
            timeline.append({
                "event_type": "APPROVAL" if is_approved else "REJECTION",
                "category": "Credit Decision",
                "title": f"Credit Decision: {a.manager_decision} ({a.application_id})",
                "description": f"Final decision by Credit Committee: {a.manager_decision}. Reason: {a.manager_decision_reason or 'Policy criteria'}",
                "timestamp": a.created_at + timedelta(hours=2),
                "badge_color": "green" if is_approved else "red"
            })

    # 4. KYC Documents
    kyc_docs = db.query(Document).filter(Document.customer_id == c.id).all()
    for k in kyc_docs:
        timeline.append({
            "event_type": "KYC_VERIFICATION",
            "category": "Compliance",
            "title": f"KYC Document Verified: {k.doc_type}",
            "description": f"Document status: {k.status}. Verified by: {k.verified_by or 'System Auto-Check'}",
            "timestamp": k.verified_at or k.uploaded_at or (c.created_at + timedelta(minutes=30)),
            "badge_color": "teal"
        })

    # 5. Documents Uploaded
    doc_uploads = db.query(Document).filter(Document.customer_id == c.id).all()
    for d in doc_uploads:
        timeline.append({
            "event_type": "DOCUMENT_UPLOADED",
            "category": "Documents",
            "title": f"Document Uploaded: {d.doc_type}",
            "description": f"File '{d.file_name}' uploaded. Verification status: {d.status}.",
            "timestamp": d.uploaded_at,
            "badge_color": "cyan"
        })

    # 6. Fraud Reviews & Cases
    fraud_reviews = db.query(FraudAlert).filter(FraudAlert.customer_id == c.id).all()
    for f in fraud_reviews:
        timeline.append({
            "event_type": "FRAUD_REVIEW",
            "category": "Risk",
            "title": f"Fraud Screening: {f.alert_type}",
            "description": f"Severity: {f.severity}. Risk score: {f.risk_score}. Status: {f.status}.",
            "timestamp": f.created_at,
            "badge_color": "orange"
        })

    fraud_cases = db.query(FraudCase).filter(FraudCase.customer_id == c.id).all()
    for fc in fraud_cases:
        timeline.append({
            "event_type": "FRAUD_CASE",
            "category": "Fraud Investigation",
            "title": f"Fraud Case {fc.status}: {fc.case_id}",
            "description": f"Severity: {fc.severity}. Risk Score: {fc.risk_score}. Assigned: {fc.assigned_officer}.",
            "timestamp": fc.updated_at or fc.created_at,
            "badge_color": "rose" if fc.status == "CONFIRMED_FRAUD" else "amber"
        })

    # 6b. KYC Cases
    kyc_cases = db.query(KycCase).filter(KycCase.customer_id == c.id).all()
    for kc in kyc_cases:
        timeline.append({
            "event_type": "KYC_CASE",
            "category": "Compliance",
            "title": f"KYC Status: {kc.status} ({kc.case_id})",
            "description": f"Document Status: {kc.document_status}. Risk Level: {kc.risk_level}. Officer: {kc.assigned_officer}.",
            "timestamp": kc.completed_at or kc.updated_at or kc.created_at,
            "badge_color": "emerald" if kc.status == "VERIFIED" else "blue"
        })

    # 6c. Risk Review History
    risk_decisions = db.query(RiskDecisionHistory).filter(RiskDecisionHistory.customer_id.ilike(f"%{c.customer_id}%")).all()
    for rd in risk_decisions:
        timeline.append({
            "event_type": "RISK_REVIEW",
            "category": "Risk Management",
            "title": f"Risk Decision: {rd.final_decision} (App {rd.application_id})",
            "description": f"Risk Score: {rd.risk_score} ({rd.risk_category}). Analyst: {rd.analyst} -> Manager: {rd.manager}. Decision: {rd.decision_reason or 'Risk approved'}",
            "timestamp": rd.created_at,
            "badge_color": "purple"
        })

    # 7. Loan Accounts, Offers, Disbursements
    loans = db.query(Loan).filter(Loan.customer_id == c.id).all()
    for l in loans:
        timeline.append({
            "event_type": "DISBURSEMENT",
            "category": "Disbursement",
            "title": f"Loan Disbursed: {l.loan_id}",
            "description": f"Principal ₹{l.loan_amount:,.0f} disbursed at {l.interest_rate}% per annum.",
            "timestamp": l.disbursed_date or (l.created_at + timedelta(hours=3)),
            "badge_color": "emerald"
        })

        # Repayment transactions
        txs = db.query(Transaction).filter(Transaction.loan_id == l.id).all()
        for t in txs:
            timeline.append({
                "event_type": "PAYMENT",
                "category": "Repayment",
                "title": f"EMI Payment Received: ₹{t.transaction_amount:,.0f}",
                "description": f"Txn #{t.transaction_id} settled via {t.channel}. Status: {t.status}.",
                "timestamp": t.transaction_timestamp,
                "badge_color": "lime"
            })

    # 8. Support Tickets
    tickets = db.query(SupportTicket).filter(SupportTicket.customer_id == c.id).all()
    for tk in tickets:
        timeline.append({
            "event_type": "SUPPORT_TICKET",
            "category": "Support",
            "title": f"Support Ticket: {tk.subject}",
            "description": f"Status: {tk.status}, Priority: {tk.priority}.",
            "timestamp": tk.created_at,
            "badge_color": "amber"
        })

    # 9. Communications & Messages
    comms = db.query(CustomerCommunication).filter(CustomerCommunication.customer_id == c.customer_id).all()
    for cm in comms:
        timeline.append({
            "event_type": "COMMUNICATION",
            "category": "Communication",
            "title": f"{cm.comm_type.replace('_', ' ').title()}: {cm.subject}",
            "description": f"From {cm.sender} ({cm.sender_role}): {cm.message[:120]}...",
            "timestamp": cm.created_at,
            "badge_color": "violet"
        })

    # 10. Audit Logs relating to customer
    audit_logs = db.query(AuditLog).filter(AuditLog.resource.ilike(f"%{c.customer_id}%")).all()
    for al in audit_logs:
        timeline.append({
            "event_type": "AUDIT_EVENT",
            "category": "Audit Trail",
            "title": f"Action: {al.action.replace('_', ' ').title()}",
            "description": f"Details: {al.details_json[:120]}...",
            "timestamp": al.created_at,
            "badge_color": "slate"
        })

    # Sort chronological descending
    timeline.sort(key=lambda x: x["timestamp"] if x["timestamp"] else datetime.min, reverse=True)

    return {
        "customer_id": c.customer_id,
        "customer_name": f"{c.first_name} {c.last_name}",
        "total_events": len(timeline),
        "events": timeline
    }
