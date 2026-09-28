"""
FinSight AI - Sales & Lead Management Router
Provides end-to-end lead lifecycle management, assignment, auditing, and conversion workflows.
"""

import uuid
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.portal_models import Lead, WorkTask
from app.models.customers import Customer, CustomerProfile
from app.models.loans import LoanApplication
from app.models.notifications import Notification
from app.models.users import User, UserRole, AuditLog
from app.security.jwt import get_current_user_optional
from app.services.followup_service import FollowUpAutomationService

router = APIRouter(prefix="/leads", tags=["Sales & Lead Management"])

VALID_LEAD_STATES = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "DOCUMENTS_PENDING",
    "APPLICATION_STARTED",
    "APPLICATION_SUBMITTED",
    "CONVERTED",
    "LOST"
]

class LeadCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    product_type: str = "MSME Business Loan"
    requested_amount: float = 500000.0
    annual_income: float = 750000.0
    city: str = "Mumbai"
    notes: Optional[str] = None
    assigned_officer: Optional[str] = None

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_officer: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    requested_amount: Optional[float] = None
    product_type: Optional[str] = None

class LeadAssign(BaseModel):
    assigned_officer: str
    reason: Optional[str] = "Workload distribution"

class LeadNoteCreate(BaseModel):
    note: str

class LeadFollowUpCreate(BaseModel):
    follow_up_date: datetime
    notes: Optional[str] = "Scheduled follow-up"
    priority: str = "MEDIUM"

class LeadStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None

class LeadResponse(BaseModel):
    id: int
    lead_id: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    product_type: str
    requested_amount: float
    annual_income: float
    city: str
    status: str
    assigned_to: Optional[str] = None
    assigned_officer: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None
    notes_history: List[dict] = []
    converted_customer_id: Optional[str] = None
    converted_application_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

def _build_lead_response(lead: Lead) -> LeadResponse:
    history = []
    try:
        if lead.notes_history_json:
            history = json.loads(lead.notes_history_json)
    except Exception:
        history = []

    return LeadResponse(
        id=lead.id,
        lead_id=lead.lead_id,
        full_name=lead.full_name,
        email=lead.email,
        phone=lead.phone,
        product_type=lead.product_type,
        requested_amount=lead.requested_amount,
        annual_income=lead.annual_income,
        city=lead.city,
        status=lead.status,
        assigned_to=lead.assigned_to,
        assigned_officer=lead.assigned_officer or lead.assigned_to,
        follow_up_date=lead.follow_up_date,
        notes=lead.notes,
        notes_history=history,
        converted_customer_id=lead.converted_customer_id,
        converted_application_id=lead.converted_application_id,
        created_at=lead.created_at,
        updated_at=lead.updated_at
    )

@router.get("", response_model=List[LeadResponse])
def list_leads(
    status: Optional[str] = None,
    product_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Lead)

    # Scoping: If user is SALES_OFFICER, only show leads assigned to them or unassigned
    if current_user and current_user.role == UserRole.SALES_OFFICER:
        user_name = current_user.full_name
        user_email = current_user.email
        query = query.filter(
            (Lead.assigned_officer == user_name) |
            (Lead.assigned_officer == user_email) |
            (Lead.assigned_to == user_name) |
            (Lead.assigned_officer.is_(None)) |
            (Lead.assigned_to.is_(None)) |
            (Lead.assigned_to == "Relationship Desk")
        )

    if status:
        query = query.filter(Lead.status == status.upper())
    if product_type:
        query = query.filter(Lead.product_type == product_type)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Lead.full_name.ilike(search_fmt)) |
            (Lead.email.ilike(search_fmt)) |
            (Lead.phone.ilike(search_fmt)) |
            (Lead.city.ilike(search_fmt))
        )
    leads = query.order_by(desc(Lead.id)).all()
    return [_build_lead_response(l) for l in leads]

@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(
    lead_in: LeadCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    lead_id = f"LEAD-{datetime.utcnow().strftime('%y%m')}-{uuid.uuid4().hex[:4].upper()}"
    assigned = lead_in.assigned_officer or (current_user.full_name if current_user and current_user.role == UserRole.SALES_OFFICER else "Relationship Desk")

    init_history = []
    if lead_in.notes:
        init_history.append({
            "note": lead_in.notes,
            "author": current_user.full_name if current_user else "System",
            "timestamp": datetime.utcnow().isoformat()
        })

    lead = Lead(
        lead_id=lead_id,
        full_name=lead_in.full_name,
        email=lead_in.email,
        phone=lead_in.phone,
        product_type=lead_in.product_type,
        requested_amount=lead_in.requested_amount,
        annual_income=lead_in.annual_income,
        city=lead_in.city,
        notes=lead_in.notes,
        notes_history_json=json.dumps(init_history),
        assigned_to=assigned,
        assigned_officer=assigned,
        status="NEW",
        created_at=datetime.utcnow()
    )
    db.add(lead)

    # Audit Log
    audit = AuditLog(
        action="LEAD_CREATED",
        resource=f"LEAD:{lead_id}",
        details_json=json.dumps({
            "full_name": lead.full_name,
            "requested_amount": lead.requested_amount,
            "assigned_officer": assigned,
            "creator": current_user.email if current_user else "API"
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    # Notification
    FollowUpAutomationService.create_notification(
        db=db,
        title=f"New Lead Assigned: {lead.full_name}",
        message=f"Lead {lead.lead_id} captured for ₹{lead.requested_amount:,.0f} ({lead.product_type}). Assigned to {assigned}.",
        severity="Info",
        category="Sales Pipeline",
        responsible_agent="Customer Intelligence",
        recipient_email=assigned,
        role_target="SALES_OFFICER",
        related_entity_type="LEAD",
        related_entity_id=lead_id
    )

    db.commit()
    db.refresh(lead)
    return _build_lead_response(lead)

@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: str, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter((Lead.lead_id == lead_id) | (Lead.id == (int(lead_id) if lead_id.isdigit() else -1))).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _build_lead_response(lead)

@router.patch("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: str,
    lead_in: LeadUpdate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter((Lead.lead_id == lead_id) | (Lead.id == (int(lead_id) if lead_id.isdigit() else -1))).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    changes = {}
    if lead_in.status:
        st = lead_in.status.upper()
        if st not in VALID_LEAD_STATES:
            raise HTTPException(status_code=400, detail=f"Invalid lead status '{st}'. Must be one of {VALID_LEAD_STATES}")
        changes["status_from"] = lead.status
        changes["status_to"] = st
        lead.status = st

    if lead_in.notes:
        history = []
        try:
            if lead.notes_history_json:
                history = json.loads(lead.notes_history_json)
        except Exception:
            history = []
        history.append({
            "note": lead_in.notes,
            "author": current_user.full_name if current_user else "Officer",
            "timestamp": datetime.utcnow().isoformat()
        })
        lead.notes = lead_in.notes
        lead.notes_history_json = json.dumps(history)
        changes["note_added"] = lead_in.notes

    if lead_in.assigned_officer:
        changes["reassigned_from"] = lead.assigned_officer
        changes["reassigned_to"] = lead_in.assigned_officer
        lead.assigned_officer = lead_in.assigned_officer
        lead.assigned_to = lead_in.assigned_officer

    if lead_in.follow_up_date:
        changes["follow_up_date"] = lead_in.follow_up_date.isoformat()
        lead.follow_up_date = lead_in.follow_up_date

    if lead_in.requested_amount is not None:
        lead.requested_amount = lead_in.requested_amount
    if lead_in.product_type:
        lead.product_type = lead_in.product_type

    lead.updated_at = datetime.utcnow()

    # Audit Log
    audit = AuditLog(
        action="LEAD_UPDATED",
        resource=f"LEAD:{lead.lead_id}",
        details_json=json.dumps(changes),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    db.commit()
    db.refresh(lead)
    return _build_lead_response(lead)

@router.post("/{lead_id}/assign", response_model=LeadResponse)
def assign_lead(
    lead_id: str,
    payload: LeadAssign,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter((Lead.lead_id == lead_id) | (Lead.id == (int(lead_id) if lead_id.isdigit() else -1))).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_assignee = lead.assigned_officer or lead.assigned_to
    lead.assigned_officer = payload.assigned_officer
    lead.assigned_to = payload.assigned_officer
    lead.updated_at = datetime.utcnow()

    # Audit Log
    audit = AuditLog(
        action="LEAD_REASSIGNED" if old_assignee else "LEAD_ASSIGNED",
        resource=f"LEAD:{lead.lead_id}",
        details_json=json.dumps({
            "previous_assignee": old_assignee,
            "new_assignee": payload.assigned_officer,
            "reason": payload.reason,
            "by": current_user.email if current_user else "System"
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    # Notification
    FollowUpAutomationService.create_notification(
        db=db,
        title=f"Lead Assigned: {lead.full_name}",
        message=f"Lead {lead.lead_id} has been assigned to you. Contact borrower soon.",
        severity="Info",
        category="Lead Assignment",
        responsible_agent="Sales Orchestrator",
        recipient_email=payload.assigned_officer,
        role_target="SALES_OFFICER",
        related_entity_type="LEAD",
        related_entity_id=lead.lead_id
    )

    db.commit()
    db.refresh(lead)
    return _build_lead_response(lead)

@router.post("/{lead_id}/notes", response_model=LeadResponse)
def add_lead_note(
    lead_id: str,
    payload: LeadNoteCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter((Lead.lead_id == lead_id) | (Lead.id == (int(lead_id) if lead_id.isdigit() else -1))).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    history = []
    try:
        if lead.notes_history_json:
            history = json.loads(lead.notes_history_json)
    except Exception:
        history = []

    history.append({
        "note": payload.note,
        "author": current_user.full_name if current_user else "Sales Officer",
        "timestamp": datetime.utcnow().isoformat()
    })

    lead.notes = payload.note
    lead.notes_history_json = json.dumps(history)
    lead.updated_at = datetime.utcnow()

    # Audit
    audit = AuditLog(
        action="LEAD_NOTE_ADDED",
        resource=f"LEAD:{lead.lead_id}",
        details_json=json.dumps({"note": payload.note}),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    db.commit()
    db.refresh(lead)
    return _build_lead_response(lead)

@router.post("/{lead_id}/follow-up")
def schedule_lead_follow_up(
    lead_id: str,
    payload: LeadFollowUpCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter((Lead.lead_id == lead_id) | (Lead.id == (int(lead_id) if lead_id.isdigit() else -1))).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.follow_up_date = payload.follow_up_date
    lead.updated_at = datetime.utcnow()

    # Create automated task
    task = FollowUpAutomationService.create_automated_task(
        db=db,
        title=f"Follow-up: {lead.full_name} ({lead.lead_id})",
        description=payload.notes or f"Follow-up with lead {lead.full_name} for {lead.product_type}",
        customer_id=None,
        application_id=None,
        assigned_user=lead.assigned_officer or (current_user.full_name if current_user else "Sales Officer"),
        role_target="SALES_OFFICER",
        priority=payload.priority,
        due_hours=max(1, int((payload.follow_up_date - datetime.utcnow()).total_seconds() // 3600)),
        related_entity_type="LEAD",
        related_entity_id=lead.lead_id
    )

    # Audit
    audit = AuditLog(
        action="LEAD_FOLLOW_UP_SCHEDULED",
        resource=f"LEAD:{lead.lead_id}",
        details_json=json.dumps({
            "follow_up_date": payload.follow_up_date.isoformat(),
            "notes": payload.notes,
            "task_id": task.task_id
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    db.commit()
    return {
        "status": "success",
        "message": f"Follow-up scheduled for lead {lead.lead_id}",
        "follow_up_date": payload.follow_up_date,
        "task_id": task.task_id
    }

@router.post("/{lead_id}/status", response_model=LeadResponse)
def change_lead_status(
    lead_id: str,
    payload: LeadStatusUpdate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter((Lead.lead_id == lead_id) | (Lead.id == (int(lead_id) if lead_id.isdigit() else -1))).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    st = payload.status.upper()
    if st not in VALID_LEAD_STATES:
        raise HTTPException(status_code=400, detail=f"Invalid status '{st}'. Must be one of {VALID_LEAD_STATES}")

    old_status = lead.status
    lead.status = st
    lead.updated_at = datetime.utcnow()

    audit = AuditLog(
        action="LEAD_STATUS_CHANGED",
        resource=f"LEAD:{lead.lead_id}",
        details_json=json.dumps({
            "from_status": old_status,
            "to_status": st,
            "reason": payload.reason,
            "changed_by": current_user.email if current_user else "Officer"
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    db.commit()
    db.refresh(lead)
    return _build_lead_response(lead)

@router.post("/{lead_id}/convert")
def convert_lead_to_customer(
    lead_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter((Lead.lead_id == lead_id) | (Lead.id == (int(lead_id) if lead_id.isdigit() else -1))).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    officer = lead.assigned_officer or (current_user.full_name if current_user else "Sales Desk")

    # Split name
    names = lead.full_name.split(" ", 1)
    first_name = names[0]
    last_name = names[1] if len(names) > 1 else "Borrower"

    cust_id = f"CUST-NBFC-{uuid.uuid4().hex[:5].upper()}"
    new_customer = Customer(
        customer_id=cust_id,
        first_name=first_name,
        last_name=last_name,
        email=lead.email or f"{first_name.lower()}@customer.finsight.ai",
        phone_hash=f"PH-{uuid.uuid4().hex[:6]}",
        address_hash=f"ADDR-{uuid.uuid4().hex[:6]}",
        age=32,
        gender="Other",
        occupation="Business Owner",
        employment_type="Self-Employed",
        income=round(lead.annual_income / 12.0, 2),
        location=lead.city,
        state="Maharashtra",
        credit_score=720,
        existing_loans=0,
        credit_utilization=0.25,
        bank_balance=150000.0,
        income_stability=0.85,
        risk_tier="Moderate",
        assigned_officer=officer,
        relationship_manager=officer,
        created_at=datetime.utcnow()
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)

    # Customer profile
    profile = CustomerProfile(
        customer_id=new_customer.id,
        financial_health_score=78.0,
        churn_risk=0.04,
        segment="MSME",
        behavioral_score=75.0,
        avg_monthly_spend=45000.0,
        savings_ratio=0.30,
        sentiment_score=0.90,
        updated_at=datetime.utcnow()
    )
    db.add(profile)

    # Loan application
    app_id = f"APP-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:5].upper()}"
    new_app = LoanApplication(
        application_id=app_id,
        customer_id=new_customer.id,
        product_type=lead.product_type,
        requested_amount=lead.requested_amount,
        requested_tenure=36,
        purpose=f"{lead.product_type} - Converted Lead",
        status="Under_Review",
        device_id=f"DEV-{uuid.uuid4().hex[:8].upper()}",
        phone_hash=new_customer.phone_hash,
        address_hash=new_customer.address_hash,
        application_velocity=1,
        risk_score=35.0,
        default_probability=0.024,
        assigned_officer=officer,
        created_at=datetime.utcnow()
    )
    db.add(new_app)

    # Update lead status and references
    lead.status = "CONVERTED"
    lead.converted_customer_id = cust_id
    lead.converted_application_id = app_id
    lead.updated_at = datetime.utcnow()

    # Audit & Notification
    audit = AuditLog(
        action="LEAD_CONVERTED",
        resource=f"LEAD:{lead.lead_id}",
        details_json=json.dumps({
            "customer_id": cust_id,
            "application_id": app_id,
            "assigned_officer": officer
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    FollowUpAutomationService.create_notification(
        db=db,
        title=f"Lead Converted: {lead.full_name}",
        message=f"Lead #{lead.lead_id} converted to Customer #{cust_id}. Loan application #{app_id} queued for Underwriting.",
        severity="Info",
        category="Lead Conversion",
        responsible_agent="Customer Intelligence",
        recipient_email=officer,
        role_target="SALES_OFFICER",
        related_entity_type="APPLICATION",
        related_entity_id=app_id
    )
    db.commit()

    return {
        "status": "success",
        "message": f"Lead {lead.lead_id} converted to customer successfully.",
        "customer_id": cust_id,
        "application_id": app_id,
        "lead_status": "CONVERTED"
    }
