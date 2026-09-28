"""
FinSight AI - Customer & Internal Communications Router
Manages customer interactions, multi-channel messaging (In-app, Simulated SMS, Simulated Email),
internal staff notes, and consolidated chronological customer communication histories.
Strictly isolates internal staff notes from borrower-facing communications.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database import get_db
from app.models.portal_models import CustomerCommunication, SupportTicket
from app.models.notifications import Notification
from app.models.customers import Customer
from app.models.assessments import CollectionActivity
from app.models.users import User, UserRole, AuditLog
from app.security.jwt import get_current_user, get_current_user_optional
from app.services.followup_service import FollowUpAutomationService

router = APIRouter(prefix="/communication", tags=["Customer & Internal Communications"])


class CommunicationCreate(BaseModel):
    customer_id: Optional[str] = None
    application_id: Optional[str] = None
    recipient: Optional[str] = None
    comm_type: str = "CUSTOMER_MESSAGE"  # CUSTOMER_MESSAGE, IN_APP_MESSAGE, SIMULATED_SMS, SIMULATED_EMAIL, INTERNAL_NOTE, CALL_LOG
    channel: Optional[str] = None         # IN_APP, SMS, EMAIL, PHONE
    subject: str
    message: str
    is_customer_visible: Optional[bool] = None


class CommunicationResponse(BaseModel):
    id: int
    comm_id: str
    customer_id: Optional[str] = None
    application_id: Optional[str] = None
    sender: str
    sender_role: Optional[str] = None
    recipient: Optional[str] = None
    comm_type: str
    channel: Optional[str] = "IN_APP"
    is_simulated: Optional[bool] = False
    is_customer_visible: Optional[bool] = True
    subject: str
    message: str
    is_read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/send", response_model=CommunicationResponse, status_code=status.HTTP_201_CREATED)
def send_communication(
    payload: CommunicationCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Sends customer communication or records internal staff notes.
    Separates customer communication from internal notes:
    - Internal notes are tagged as is_customer_visible = False.
    - External channels (SMS, Email) are simulated and clearly tagged with is_simulated = True.
    """
    sender_name = current_user.full_name if current_user else "Institutional Officer"
    sender_role = (current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)) if current_user else "STAFF"

    comm_type_upper = payload.comm_type.upper()
    is_internal = comm_type_upper in ["INTERNAL_NOTE", "STAFF_NOTE", "OFFICER_NOTE"]

    # Determine channel
    channel = payload.channel.upper() if payload.channel else "IN_APP"
    if "SMS" in comm_type_upper:
        channel = "SMS"
    elif "EMAIL" in comm_type_upper:
        channel = "EMAIL"
    elif "CALL" in comm_type_upper:
        channel = "PHONE"

    is_simulated = channel in ["SMS", "EMAIL"]
    is_customer_visible = False if is_internal else (payload.is_customer_visible if payload.is_customer_visible is not None else True)

    comm_id = f"COMM-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:5].upper()}"

    # Format message with simulated delivery badge if applicable
    prefix = ""
    if is_simulated and channel == "SMS":
        prefix = "[SIMULATED SMS - Demo Gateway] "
    elif is_simulated and channel == "EMAIL":
        prefix = "[SIMULATED EMAIL - Demo SMTP] "

    stored_message = f"{prefix}{payload.message}" if (prefix and not payload.message.startswith(prefix)) else payload.message

    comm = CustomerCommunication(
        comm_id=comm_id,
        customer_id=payload.customer_id,
        application_id=payload.application_id,
        sender=sender_name,
        sender_role=sender_role,
        recipient=payload.recipient or "Customer",
        comm_type=comm_type_upper,
        channel=channel,
        is_simulated=is_simulated,
        is_customer_visible=is_customer_visible,
        subject=payload.subject,
        message=stored_message,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(comm)

    # Immutable Audit Log
    db.add(AuditLog(
        action=f"COMM_{comm_type_upper}",
        resource=f"{payload.customer_id or payload.application_id or 'GENERAL'}",
        details_json=f'{{"comm_id": "{comm_id}", "subject": "{payload.subject}", "channel": "{channel}", "is_internal": {str(is_internal).lower()}}}',
        created_at=datetime.utcnow()
    ))

    # Send in-app notification if customer visible
    if is_customer_visible:
        FollowUpAutomationService.create_notification(
            db=db,
            title=payload.subject,
            message=f"{sender_name} ({channel}): {payload.message[:120]}...",
            severity="Info",
            category="Communication",
            responsible_agent="Customer Intelligence",
            recipient_email=payload.recipient,
            related_entity_type="COMMUNICATION",
            related_entity_id=comm_id
        )

    db.commit()
    db.refresh(comm)
    return comm


@router.get("/customer/{customer_id}", response_model=List[CommunicationResponse])
def get_customer_communications(
    customer_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Fetches communication records for a given customer.
    Customers CANNOT see internal notes or staff communication.
    """
    query = db.query(CustomerCommunication).filter(
        CustomerCommunication.customer_id == str(customer_id)
    )

    if current_user and current_user.role == UserRole.CUSTOMER:
        query = query.filter(
            CustomerCommunication.is_customer_visible == True,
            CustomerCommunication.comm_type != "INTERNAL_NOTE"
        )

    return query.order_by(desc(CustomerCommunication.id)).all()


@router.get("/history/{customer_id}")
def get_unified_customer_communication_history(
    customer_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Consolidated communication center history for a customer.
    Includes:
    - Messages (In-app, Customer messages)
    - Simulated Emails (clearly labeled)
    - Simulated SMS events (clearly labeled)
    - System Notifications
    - Staff Notes (hidden from customers)
    - Calls & Interaction Logs (hidden from customers if marked internal)
    - Support Tickets
    """
    cid_str = str(customer_id)
    cid_int = int(cid_str) if cid_str.isdigit() else None

    # Fetch customer entity to get email and phone
    cust = db.query(Customer).filter(
        or_(Customer.customer_id == cid_str, Customer.id == cid_int if cid_int else False)
    ).first()

    cust_email = cust.email if cust else None
    cust_id_canonical = cust.customer_id if cust else cid_str

    # RBAC: If customer user, verify ownership and ensure NO internal notes are exposed
    is_customer_user = current_user and current_user.role == UserRole.CUSTOMER
    if is_customer_user:
        if cust and current_user.email != cust.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You may only view your own communication history."
            )

    timeline_events: List[Dict[str, Any]] = []

    # 1. Customer Communications (In-App, SMS, Email, Notes)
    comms_query = db.query(CustomerCommunication).filter(
        or_(CustomerCommunication.customer_id == cid_str, CustomerCommunication.customer_id == cust_id_canonical)
    )
    if is_customer_user:
        comms_query = comms_query.filter(
            CustomerCommunication.is_customer_visible == True,
            CustomerCommunication.comm_type != "INTERNAL_NOTE"
        )
    for c in comms_query.all():
        timeline_events.append({
            "id": c.comm_id,
            "timestamp": c.created_at.isoformat() if c.created_at else "",
            "channel": c.channel or ("SMS" if "SMS" in c.comm_type else "EMAIL" if "EMAIL" in c.comm_type else "IN_APP"),
            "event_type": c.comm_type,
            "sender": f"{c.sender} ({c.sender_role or 'Staff'})",
            "recipient": c.recipient or "Customer",
            "subject": c.subject or "Communication",
            "message": c.message,
            "is_simulated": getattr(c, "is_simulated", False) or "[SIMULATED" in (c.message or ""),
            "is_internal": not getattr(c, "is_customer_visible", True) or c.comm_type == "INTERNAL_NOTE",
            "delivery_status": "Simulated Sent" if getattr(c, "is_simulated", False) else "Delivered"
        })

    # 2. System Notifications
    notif_query = db.query(Notification)
    if cust_email:
        notif_query = notif_query.filter(Notification.recipient_email == cust_email)
    else:
        notif_query = notif_query.filter(Notification.role_target == "CUSTOMER")
    
    for n in notif_query.order_by(desc(Notification.created_at)).limit(30).all():
        timeline_events.append({
            "id": n.notification_id,
            "timestamp": n.created_at.isoformat() if n.created_at else "",
            "channel": "IN_APP_NOTIFICATION",
            "event_type": "AUTOMATIC_NOTIFICATION",
            "sender": f"FinSight AI ({n.responsible_agent or 'System'})",
            "recipient": n.recipient_email or "Customer",
            "subject": n.title,
            "message": n.message,
            "is_simulated": False,
            "is_internal": False,
            "delivery_status": "Delivered"
        })

    # 3. Collection Interaction Activities (Calls, Notes, Promises)
    if cust:
        act_query = db.query(CollectionActivity).filter(CollectionActivity.customer_id == cust.id)
        if is_customer_user:
            act_query = act_query.filter(CollectionActivity.is_customer_visible == True)
        
        for a in act_query.all():
            timeline_events.append({
                "id": a.activity_id,
                "timestamp": a.created_at.isoformat() if a.created_at else "",
                "channel": a.channel or "PHONE",
                "event_type": f"COLLECTION_{a.activity_type}",
                "sender": f"{a.officer_name} (Collections Officer)",
                "recipient": f"{cust.first_name} {cust.last_name}",
                "subject": f"Collections: {a.activity_type.title()}",
                "message": a.notes,
                "is_simulated": a.channel in ["SMS", "EMAIL"],
                "is_internal": not a.is_customer_visible,
                "delivery_status": "Logged"
            })

    # 4. Support Tickets
    if cust:
        tickets = db.query(SupportTicket).filter(SupportTicket.customer_id == cust.id).all()
        for t in tickets:
            timeline_events.append({
                "id": t.ticket_id,
                "timestamp": t.created_at.isoformat() if t.created_at else "",
                "channel": "SUPPORT_TICKET",
                "event_type": f"TICKET_{t.status}",
                "sender": "Customer Support Desk",
                "recipient": f"{cust.first_name} {cust.last_name}",
                "subject": f"Ticket #{t.ticket_id}: {t.subject}",
                "message": f"Category: {t.category} | Priority: {t.priority} | Status: {t.status}",
                "is_simulated": False,
                "is_internal": False,
                "delivery_status": t.status
            })

    # Sort descending by timestamp
    timeline_events.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "customer_id": cust_id_canonical,
        "customer_name": f"{cust.first_name} {cust.last_name}" if cust else cid_str,
        "total_events": len(timeline_events),
        "events": timeline_events
    }


@router.post("/trigger-event-notification")
def trigger_automatic_notification(
    event_type: str = Query(..., description="EMI_APPROACHING, EMI_OVERDUE, PAYMENT_SUCCESSFUL, PAYMENT_FAILED, PROMISE_DUE, APPLICATION_STATUS, DOCUMENT_REQUEST, APPROVAL, DISBURSEMENT"),
    customer_id: str = Query(...),
    loan_id: Optional[str] = None,
    amount: Optional[float] = None,
    due_date: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Triggers automated standard institutional notifications:
    EMI approaching, EMI overdue, payment successful, payment failed, promise due, etc.
    """
    cid_str = str(customer_id)
    cid_int = int(cid_str) if cid_str.isdigit() else None
    cust = db.query(Customer).filter(
        or_(Customer.customer_id == cid_str, Customer.id == cid_int if cid_int else False)
    ).first()

    recip = cust.email if cust else f"customer.{cid_str}@finsight.ai"
    cname = f"{cust.first_name} {cust.last_name}" if cust else f"Borrower #{cid_str}"

    templates = {
        "EMI_APPROACHING": {
            "title": "Upcoming EMI Payment Reminder",
            "message": f"Dear {cname}, your upcoming EMI installment of INR {amount or 15000:,.0f} for loan {loan_id or 'ACTIVE'} is due on {due_date or 'within 3 days'}. Please ensure sufficient balance in your linked account.",
            "severity": "Info",
            "category": "Collections"
        },
        "EMI_OVERDUE": {
            "title": "URGENT: EMI Payment Overdue",
            "message": f"Dear {cname}, your EMI payment of INR {amount or 15000:,.0f} for loan {loan_id or 'FACILITY'} is past due. To prevent adverse CIBIL reporting and penalty charges, please settle immediately.",
            "severity": "Critical",
            "category": "Collections"
        },
        "PAYMENT_SUCCESSFUL": {
            "title": "Payment Received with Thanks",
            "message": f"Dear {cname}, your payment of INR {amount or 15000:,.0f} against loan {loan_id or 'ACTIVE'} has been credited successfully. Thank you for banking with FinSight AI.",
            "severity": "Success",
            "category": "Finance"
        },
        "PAYMENT_FAILED": {
            "title": "Payment Transaction Failed",
            "message": f"Dear {cname}, your attempt to pay INR {amount or 15000:,.0f} for loan {loan_id or 'ACTIVE'} failed due to authorization error. Please re-try with an alternative payment method.",
            "severity": "Warning",
            "category": "Finance"
        },
        "PROMISE_DUE": {
            "title": "Promise to Pay Commitment Due",
            "message": f"Dear {cname}, this is a gentle reminder that your promised commitment to pay INR {amount or 15000:,.0f} is scheduled for today ({due_date or 'today'}). Please complete the payment.",
            "severity": "Warning",
            "category": "Collections"
        },
        "DISBURSEMENT": {
            "title": "Loan Disbursed to Bank Account",
            "message": f"Congratulations {cname}! Your loan {loan_id or 'FACILITY'} amount of INR {amount or 500000:,.0f} has been disbursed to your designated bank account.",
            "severity": "Success",
            "category": "Disbursement"
        }
    }

    tpl = templates.get(event_type.upper(), {
        "title": f"Update on your account: {event_type}",
        "message": f"Notification regarding your account {loan_id or cid_str}.",
        "severity": "Info",
        "category": "System"
    })

    notif_id = f"NOTIF-{uuid.uuid4().hex[:6].upper()}"
    notif = Notification(
        notification_id=notif_id,
        title=tpl["title"],
        message=tpl["message"],
        severity=tpl["severity"],
        category=tpl["category"],
        responsible_agent="Collections Intelligence",
        recipient_email=recip,
        role_target="CUSTOMER",
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()

    return {"status": "SUCCESS", "notification_id": notif_id, "event_type": event_type, "recipient": recip}


# ==========================================
# ALIAS: /log — Integration Test Compatibility
# ==========================================
class CommunicationLogRequest(BaseModel):
    """Flexible log endpoint accepting multiple field naming conventions."""
    customer_id: Optional[str] = None
    application_id: Optional[str] = None
    direction: Optional[str] = None          # INTERNAL_STAFF, CUSTOMER_FACING
    message: str
    officer_name: Optional[str] = None
    is_internal_only: Optional[bool] = False
    subject: Optional[str] = "Staff Communication"
    comm_type: Optional[str] = None
    channel: Optional[str] = None


@router.post("/log", status_code=200)
def log_communication(
    payload: CommunicationLogRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Alias endpoint for recording staff communications and internal notes.
    Maps direction=INTERNAL_STAFF to comm_type=INTERNAL_NOTE (not customer-visible).
    """
    sender_name = current_user.full_name if current_user else (payload.officer_name or "Institutional Officer")
    sender_role = (current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)) if current_user else "STAFF"

    direction = (payload.direction or "").upper()
    is_internal = payload.is_internal_only or direction in ["INTERNAL_STAFF", "INTERNAL", "STAFF"]

    comm_type = payload.comm_type or ("INTERNAL_NOTE" if is_internal else "IN_APP_MESSAGE")
    channel = (payload.channel or "IN_APP").upper()
    is_customer_visible = not is_internal

    comm_id = f"COMM-LOG-{uuid.uuid4().hex[:8].upper()}"

    comm = CustomerCommunication(
        comm_id=comm_id,
        customer_id=payload.customer_id,
        application_id=payload.application_id,
        sender=sender_name,
        sender_role=sender_role,
        recipient="Staff" if is_internal else "Customer",
        comm_type=comm_type.upper(),
        channel=channel,
        is_simulated=False,
        is_customer_visible=is_customer_visible,
        subject=payload.subject or "Staff Communication",
        message=payload.message,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(comm)

    db.add(AuditLog(
        action=f"COMM_LOG_{comm_type.upper()}",
        resource=payload.customer_id or payload.application_id or "GENERAL",
        details_json=f'{{"comm_id": "{comm_id}", "is_internal": {str(is_internal).lower()}, "officer": "{sender_name}"}}',
        created_at=datetime.utcnow()
    ))
    db.commit()
    db.refresh(comm)

    return {
        "status": "logged",
        "comm_id": comm_id,
        "is_internal": is_internal,
        "customer_id": payload.customer_id,
        "application_id": payload.application_id
    }
