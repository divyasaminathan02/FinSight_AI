"""
FinSight AI - Sales Officer Dashboard & Application Work Queue Router
Provides real backend analytics, work queue filtering, and pipeline actions for Sales Officers.
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_

from app.database import get_db
from app.models.portal_models import Lead, WorkTask, Document, CustomerCommunication
from app.models.customers import Customer
from app.models.loans import LoanApplication
from app.models.notifications import Notification
from app.models.assessments import FraudAlert
from app.models.users import User, UserRole, AuditLog
from app.security.jwt import get_current_user_optional
from app.services.followup_service import FollowUpAutomationService

router = APIRouter(prefix="/sales", tags=["Sales Officer & Application Queue"])

class ApplicationNoteCreate(BaseModel):
    note: str

class RequestDocumentPayload(BaseModel):
    document_type: str
    instructions: Optional[str] = "Please upload standard verification document"

class AssignApplicationPayload(BaseModel):
    assigned_officer: str
    reason: Optional[str] = "Workload rebalancing"

class EscalateApplicationPayload(BaseModel):
    reason: str
    target_role: str = "CREDIT_MANAGER"
    priority: str = "HIGH"

class AdvanceStagePayload(BaseModel):
    target_stage: str  # Under_Review, Credit_Review, Manager_Approval, Disbursed, Rejected
    notes: Optional[str] = None

class SendMessagePayload(BaseModel):
    subject: str
    message: str
    recipient: Optional[str] = None
    comm_type: str = "IN_APP_MESSAGE"

def _is_manager_or_admin(user: Optional[User]) -> bool:
    if not user:
        return True  # open mode for unauthenticated / default testing
    return user.role in [
        UserRole.ADMIN,
        UserRole.RISK_MANAGER,
        UserRole.OPERATIONS_MANAGER,
        UserRole.COLLECTIONS_MANAGER,
        "CREDIT_MANAGER",
        "SALES_MANAGER"
    ]

@router.get("/dashboard")
def get_sales_dashboard(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_name = current_user.full_name if current_user else None
    user_email = current_user.email if current_user else None
    is_broad = _is_manager_or_admin(current_user)

    # 1. Assigned Leads
    lead_q = db.query(Lead)
    if not is_broad and user_name:
        lead_q = lead_q.filter(
            (Lead.assigned_officer == user_name) |
            (Lead.assigned_officer == user_email) |
            (Lead.assigned_to == user_name) |
            (Lead.assigned_officer.is_(None)) |
            (Lead.assigned_to == "Relationship Desk")
        )
    assigned_leads_count = lead_q.count()

    # 2. Applications scoping
    app_q = db.query(LoanApplication)
    if not is_broad and user_name:
        app_q = app_q.filter(
            (LoanApplication.assigned_officer == user_name) |
            (LoanApplication.assigned_officer == user_email) |
            (LoanApplication.assigned_officer.is_(None))
        )

    # New applications (status in Submitted, New, In_Progress, Under_Review)
    new_apps_count = app_q.filter(
        LoanApplication.status.in_(["Submitted", "New", "Under_Review", "Draft"])
    ).count()

    # Applications requiring action (Documents_Pending, Action_Required, Under_Review)
    req_action_count = app_q.filter(
        LoanApplication.status.in_(["Documents_Pending", "Action_Required", "Under_Review", "Returned"])
    ).count()

    # Applications submitted, approved, rejected this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    submitted_count = app_q.filter(LoanApplication.created_at >= start_of_month).count()
    approved_count = app_q.filter(
        LoanApplication.status.in_(["Approved", "Active", "Disbursed"]),
        LoanApplication.created_at >= start_of_month
    ).count()
    rejected_count = app_q.filter(
        LoanApplication.status.in_(["Rejected", "Cancelled"]),
        LoanApplication.created_at >= start_of_month
    ).count()

    # Monthly sales volume (sum of requested/sanctioned amount for approved apps)
    sales_sum = db.query(func.sum(LoanApplication.requested_amount)).filter(
        LoanApplication.status.in_(["Approved", "Active", "Disbursed"]),
        LoanApplication.created_at >= start_of_month
    )
    if not is_broad and user_name:
        sales_sum = sales_sum.filter(
            (LoanApplication.assigned_officer == user_name) |
            (LoanApplication.assigned_officer == user_email) |
            (LoanApplication.assigned_officer.is_(None))
        )
    monthly_sales = float(sales_sum.scalar() or 0.0)

    # Conversion rate
    conversion_rate = round((approved_count / max(assigned_leads_count, 1)) * 100.0, 1)

    # Pending documents
    # Documents associated with customer applications
    pending_docs_count = db.query(Document).filter(
        Document.status.in_(["PENDING", "REQUIRED", "REJECTED", "UPLOADED", "UNDER_REVIEW"])
    ).count()

    # Customer follow-ups / tasks
    tasks_q = db.query(WorkTask).filter(WorkTask.status.in_(["TODO", "IN_PROGRESS", "WAITING", "PENDING"]))
    if not is_broad and user_name:
        tasks_q = tasks_q.filter(
            (WorkTask.assigned_to.ilike(f"%{user_name}%")) |
            (WorkTask.role_target.in_(["SALES_OFFICER", "SALES"]))
        )
    pending_tasks_count = tasks_q.count()
    follow_ups_count = tasks_q.filter(WorkTask.title.ilike("%Follow-up%")).count()

    # Notifications
    notifs_q = db.query(Notification).order_by(desc(Notification.created_at)).limit(10)
    if not is_broad and user_email:
        notifs_q = db.query(Notification).filter(
            (Notification.recipient_email == user_email) |
            (Notification.role_target.in_(["SALES_OFFICER", "SALES", "ALL"])) |
            (Notification.recipient_email.is_(None))
        ).order_by(desc(Notification.created_at)).limit(10)
    recent_notifs = notifs_q.all()

    # Recent Assigned Leads
    recent_leads = lead_q.order_by(desc(Lead.id)).limit(8).all()

    # Recent Applications
    recent_apps = app_q.order_by(desc(LoanApplication.id)).limit(8).all()
    apps_data = []
    for a in recent_apps:
        cust = db.query(Customer).filter(Customer.id == a.customer_id).first()
        apps_data.append({
            "id": a.id,
            "application_id": a.application_id,
            "customer_id": cust.customer_id if cust else f"CUST-{a.customer_id}",
            "customer_name": f"{cust.first_name} {cust.last_name}" if cust else "Institutional Borrower",
            "product_type": a.product_type,
            "requested_amount": a.requested_amount,
            "status": a.status,
            "risk_score": a.risk_score,
            "created_at": a.created_at
        })

    return {
        "sales_officer": user_name or "Sales Desk",
        "assigned_leads": assigned_leads_count,
        "new_applications": new_apps_count,
        "applications_requiring_action": req_action_count,
        "pending_documents": pending_docs_count,
        "customer_follow_ups": follow_ups_count,
        "applications_submitted": submitted_count,
        "applications_approved": approved_count,
        "applications_rejected": rejected_count,
        "monthly_sales": monthly_sales,
        "monthly_sales_formatted": f"₹{monthly_sales:,.0f}",
        "conversion_rate": conversion_rate,
        "conversion_rate_pct": f"{conversion_rate}%",
        "pending_tasks": pending_tasks_count,
        "notifications": [
            {
                "id": n.id,
                "notification_id": n.notification_id,
                "title": n.title,
                "message": n.message,
                "severity": n.severity,
                "created_at": n.created_at
            }
            for n in recent_notifs
        ],
        "recent_leads": [
            {
                "id": l.id,
                "lead_id": l.lead_id,
                "full_name": l.full_name,
                "phone": l.phone,
                "email": l.email,
                "product_type": l.product_type,
                "requested_amount": l.requested_amount,
                "status": l.status,
                "created_at": l.created_at
            }
            for l in recent_leads
        ],
        "recent_applications": apps_data
    }

@router.get("/applications")
def list_sales_applications(
    status: Optional[str] = None,
    product_type: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    risk_level: Optional[str] = None,
    kyc_status: Optional[str] = None,
    fraud_status: Optional[str] = None,
    assigned_officer: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(LoanApplication)
    is_broad = _is_manager_or_admin(current_user)

    # Scoping: if sales officer without broad access, show only assigned (or unassigned pool)
    if not is_broad and current_user and current_user.role == UserRole.SALES_OFFICER:
        user_name = current_user.full_name
        user_email = current_user.email
        query = query.filter(
            (LoanApplication.assigned_officer == user_name) |
            (LoanApplication.assigned_officer == user_email) |
            (LoanApplication.assigned_officer.is_(None))
        )
    elif assigned_officer:
        query = query.filter(LoanApplication.assigned_officer.ilike(f"%{assigned_officer}%"))

    if status:
        query = query.filter(LoanApplication.status.ilike(f"%{status}%"))
    if product_type:
        query = query.filter(LoanApplication.product_type.ilike(f"%{product_type}%"))
    if min_amount is not None:
        query = query.filter(LoanApplication.requested_amount >= min_amount)
    if max_amount is not None:
        query = query.filter(LoanApplication.requested_amount <= max_amount)
    if date_from:
        query = query.filter(LoanApplication.created_at >= date_from)
    if date_to:
        query = query.filter(LoanApplication.created_at <= date_to)

    apps = query.order_by(desc(LoanApplication.id)).all()
    results = []
    for a in apps:
        cust = db.query(Customer).filter(Customer.id == a.customer_id).first()
        kyc = db.query(Document).filter(Document.customer_id == a.customer_id).first()
        fraud = db.query(FraudAlert).filter(FraudAlert.application_id == a.id).first()

        # Risk level determination
        r_level = "Low"
        if a.risk_score:
            if a.risk_score >= 70:
                r_level = "High"
            elif a.risk_score >= 35:
                r_level = "Medium"

        kyc_st = kyc.status if kyc else "PENDING"
        fraud_st = fraud.severity if fraud else "CLEARED"

        # Apply in-memory secondary filters if provided
        if risk_level and risk_level.upper() != r_level.upper():
            continue
        if kyc_status and kyc_status.upper() != kyc_st.upper():
            continue
        if fraud_status and fraud_status.upper() != fraud_st.upper():
            continue

        results.append({
            "id": a.id,
            "application_id": a.application_id,
            "customer_id": cust.customer_id if cust else f"CUST-{a.customer_id}",
            "customer_name": f"{cust.first_name} {cust.last_name}" if cust else "Borrower",
            "customer_email": cust.email if cust else None,
            "product_type": a.product_type,
            "requested_amount": a.requested_amount,
            "requested_tenure": a.requested_tenure,
            "status": a.status,
            "risk_score": a.risk_score,
            "risk_level": r_level,
            "kyc_status": kyc_st,
            "fraud_status": fraud_st,
            "assigned_officer": a.assigned_officer or "Unassigned",
            "credit_analyst": a.credit_analyst,
            "analyst_recommendation": a.analyst_recommendation,
            "manager_decision": a.manager_decision,
            "created_at": a.created_at
        })

    return results

@router.get("/applications/{app_id}")
def get_sales_application_detail(
    app_id: str,
    db: Session = Depends(get_db)
):
    a = db.query(LoanApplication).filter(
        (LoanApplication.application_id == app_id) | (LoanApplication.id == (int(app_id) if app_id.isdigit() else -1))
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Loan Application not found")

    cust = db.query(Customer).filter(Customer.id == a.customer_id).first()
    kyc = db.query(Document).filter(Document.customer_id == a.customer_id).all()
    comms = db.query(CustomerCommunication).filter(CustomerCommunication.application_id == a.application_id).all()
    tasks = db.query(WorkTask).filter(WorkTask.application_id == a.application_id).all()

    return {
        "application": {
            "id": a.id,
            "application_id": a.application_id,
            "product_type": a.product_type,
            "requested_amount": a.requested_amount,
            "requested_tenure": a.requested_tenure,
            "purpose": a.purpose,
            "status": a.status,
            "assigned_officer": a.assigned_officer,
            "credit_analyst": a.credit_analyst,
            "analyst_recommendation": a.analyst_recommendation,
            "analyst_notes": a.analyst_notes,
            "manager_decision": a.manager_decision,
            "risk_score": a.risk_score,
            "default_probability": a.default_probability,
            "created_at": a.created_at
        },
        "customer": {
            "id": cust.id if cust else None,
            "customer_id": cust.customer_id if cust else None,
            "full_name": f"{cust.first_name} {cust.last_name}" if cust else None,
            "email": cust.email if cust else None,
            "income": cust.income if cust else None,
            "occupation": cust.occupation if cust else None,
            "credit_score": cust.credit_score if cust else None,
            "assigned_officer": cust.assigned_officer if cust else None,
            "relationship_manager": cust.relationship_manager if cust else None
        } if cust else None,
        "kyc_documents": [{"id": k.id, "type": k.doc_type, "status": k.status} for k in kyc],
        "communications": [
            {"id": c.id, "sender": c.sender, "subject": c.subject, "message": c.message, "created_at": c.created_at}
            for c in comms
        ],
        "tasks": [
            {"id": t.id, "title": t.title, "priority": t.priority, "status": t.status, "due_date": t.due_date}
            for t in tasks
        ]
    }

@router.post("/applications/{app_id}/note")
def add_application_note(
    app_id: str,
    payload: ApplicationNoteCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    a = db.query(LoanApplication).filter(
        (LoanApplication.application_id == app_id) | (LoanApplication.id == (int(app_id) if app_id.isdigit() else -1))
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")

    author = current_user.full_name if current_user else "Sales Officer"

    # Save as internal note in CustomerCommunication
    comm = CustomerCommunication(
        comm_id=f"COMM-{uuid.uuid4().hex[:6].upper()}",
        application_id=a.application_id,
        customer_id=f"CUST-{a.customer_id}",
        sender=author,
        sender_role="SALES_OFFICER",
        recipient="Internal File",
        comm_type="INTERNAL_NOTE",
        subject=f"Note on {a.application_id}",
        message=payload.note,
        created_at=datetime.utcnow()
    )
    db.add(comm)

    # Audit
    audit = AuditLog(
        action="APPLICATION_NOTE_ADDED",
        resource=f"APP:{a.application_id}",
        details_json=json.dumps({"note": payload.note, "author": author}),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": "Note added to application", "author": author}

@router.post("/applications/{app_id}/request-document")
def request_application_document(
    app_id: str,
    payload: RequestDocumentPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    a = db.query(LoanApplication).filter(
        (LoanApplication.application_id == app_id) | (LoanApplication.id == (int(app_id) if app_id.isdigit() else -1))
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")

    cust = db.query(Customer).filter(Customer.id == a.customer_id).first()
    officer = current_user.full_name if current_user else (a.assigned_officer or "Sales Desk")

    # Update app status to Documents_Pending
    a.status = "Documents_Pending"

    # Create automated task for follow up
    task = FollowUpAutomationService.create_automated_task(
        db=db,
        title=f"Collect Document: {payload.document_type} ({a.application_id})",
        description=f"Borrower requested to upload {payload.document_type}. {payload.instructions}",
        customer_id=cust.customer_id if cust else None,
        application_id=a.application_id,
        assigned_user=officer,
        role_target="SALES_OFFICER",
        priority="HIGH",
        due_hours=24
    )

    # Notify Customer & Officer
    FollowUpAutomationService.create_notification(
        db=db,
        title=f"Document Requested: {payload.document_type}",
        message=f"Please upload {payload.document_type} for loan application {a.application_id}.",
        severity="Medium",
        category="Document Request",
        responsible_agent="Customer Intelligence",
        recipient_email=cust.email if cust else None,
        role_target="CUSTOMER",
        related_entity_type="APPLICATION",
        related_entity_id=a.application_id
    )

    # Audit
    audit = AuditLog(
        action="DOCUMENT_REQUESTED",
        resource=f"APP:{a.application_id}",
        details_json=json.dumps({"document_type": payload.document_type, "instructions": payload.instructions}),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Requested {payload.document_type}", "task_id": task.task_id}

@router.post("/applications/{app_id}/assign")
def assign_application_officer(
    app_id: str,
    payload: AssignApplicationPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    a = db.query(LoanApplication).filter(
        (LoanApplication.application_id == app_id) | (LoanApplication.id == (int(app_id) if app_id.isdigit() else -1))
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")

    old_officer = a.assigned_officer
    a.assigned_officer = payload.assigned_officer

    # Audit
    audit = AuditLog(
        action="APPLICATION_ASSIGNED",
        resource=f"APP:{a.application_id}",
        details_json=json.dumps({
            "previous_officer": old_officer,
            "new_officer": payload.assigned_officer,
            "reason": payload.reason,
            "assigned_by": current_user.email if current_user else "System"
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    # Notification
    FollowUpAutomationService.create_notification(
        db=db,
        title=f"New Application Assigned: {a.application_id}",
        message=f"Application {a.application_id} for ₹{a.requested_amount:,.0f} has been assigned to you.",
        severity="Info",
        category="Application Assignment",
        responsible_agent="Sales Orchestrator",
        recipient_email=payload.assigned_officer,
        role_target="SALES_OFFICER",
        related_entity_type="APPLICATION",
        related_entity_id=a.application_id
    )

    db.commit()
    return {"status": "success", "message": f"Application assigned to {payload.assigned_officer}"}

@router.post("/applications/{app_id}/escalate")
def escalate_application(
    app_id: str,
    payload: EscalateApplicationPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    a = db.query(LoanApplication).filter(
        (LoanApplication.application_id == app_id) | (LoanApplication.id == (int(app_id) if app_id.isdigit() else -1))
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")

    sender = current_user.full_name if current_user else "Sales Officer"

    task = FollowUpAutomationService.create_automated_task(
        db=db,
        title=f"ESCALATION: {a.application_id} - {payload.reason[:40]}",
        description=f"Escalated by {sender}. Reason: {payload.reason}",
        customer_id=f"CUST-{a.customer_id}",
        application_id=a.application_id,
        role_target=payload.target_role,
        priority=payload.priority,
        due_hours=12
    )

    audit = AuditLog(
        action="APPLICATION_ESCALATED",
        resource=f"APP:{a.application_id}",
        details_json=json.dumps({"reason": payload.reason, "target_role": payload.target_role, "sender": sender}),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Application escalated to {payload.target_role}", "task_id": task.task_id}

@router.post("/applications/{app_id}/message")
def send_application_message(
    app_id: str,
    payload: SendMessagePayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    a = db.query(LoanApplication).filter(
        (LoanApplication.application_id == app_id) | (LoanApplication.id == (int(app_id) if app_id.isdigit() else -1))
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")

    cust = db.query(Customer).filter(Customer.id == a.customer_id).first()
    sender_name = current_user.full_name if current_user else "Sales Officer"

    comm = CustomerCommunication(
        comm_id=f"COMM-{uuid.uuid4().hex[:6].upper()}",
        application_id=a.application_id,
        customer_id=cust.customer_id if cust else f"CUST-{a.customer_id}",
        sender=sender_name,
        sender_role="SALES_OFFICER",
        recipient=payload.recipient or (cust.email if cust else "Customer"),
        comm_type=payload.comm_type,
        subject=payload.subject,
        message=payload.message,
        created_at=datetime.utcnow()
    )
    db.add(comm)

    # Notification for recipient
    FollowUpAutomationService.create_notification(
        db=db,
        title=f"Message: {payload.subject}",
        message=f"{sender_name}: {payload.message[:120]}...",
        severity="Info",
        category="Customer Communication",
        responsible_agent="Customer Intelligence",
        recipient_email=payload.recipient or (cust.email if cust else None),
        related_entity_type="APPLICATION",
        related_entity_id=a.application_id
    )

    db.commit()
    return {"status": "success", "message": "Message dispatched", "comm_id": comm.comm_id}

@router.post("/applications/{app_id}/advance-stage")
def advance_application_stage(
    app_id: str,
    payload: AdvanceStagePayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    a = db.query(LoanApplication).filter(
        (LoanApplication.application_id == app_id) | (LoanApplication.id == (int(app_id) if app_id.isdigit() else -1))
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")

    old_stage = a.status
    a.status = payload.target_stage

    # If transitioning to Credit_Review or Under_Review, alert credit analysts
    if payload.target_stage in ["Credit_Review", "Under_Review"]:
        FollowUpAutomationService.create_notification(
            db=db,
            title=f"Credit Review Required: {a.application_id}",
            message=f"Application {a.application_id} for ₹{a.requested_amount:,.0f} has advanced to Credit Review stage.",
            severity="Medium",
            category="Underwriting",
            responsible_agent="Credit Intelligence",
            role_target="CREDIT_ANALYST",
            related_entity_type="APPLICATION",
            related_entity_id=a.application_id
        )

    audit = AuditLog(
        action="APPLICATION_STAGE_CHANGED",
        resource=f"APP:{a.application_id}",
        details_json=json.dumps({
            "from_stage": old_stage,
            "to_stage": payload.target_stage,
            "notes": payload.notes,
            "by": current_user.email if current_user else "Officer"
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Application stage updated from '{old_stage}' to '{payload.target_stage}'",
        "current_status": a.status
    }
