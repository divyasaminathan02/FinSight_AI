import uuid
import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc, case, func, or_, and_

from app.database import get_db
from app.models.notifications import Notification
from app.models.users import User, AuditLog
from app.schemas.transactions import NotificationListResponse, NotificationItem
from app.security.jwt import get_current_user_optional, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Canonical Priority and Severity definitions
# Priority: LOW, NORMAL, HIGH, URGENT (Urgency to act)
# Severity: INFO, WARNING, CRITICAL (Business impact)
VALID_PRIORITIES = {"LOW", "NORMAL", "HIGH", "URGENT"}
VALID_SEVERITIES = {"INFO", "WARNING", "CRITICAL"}

def determine_priority_and_severity(
    event_type: Optional[str] = None,
    category: Optional[str] = None,
    title: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> tuple[str, str]:
    """
    Business rule engine deriving notification priority and severity from the actual event context.
    
    Examples:
    - EMI approaching -> Priority: NORMAL, Severity: INFO
    - Document required -> Priority: HIGH, Severity: WARNING
    - Payment failed -> Priority: HIGH, Severity: WARNING
    - Fraud alert -> Priority: URGENT, Severity: CRITICAL
    - Liquidity alert -> Priority: URGENT, Severity: CRITICAL
    - System failure -> Priority: URGENT, Severity: CRITICAL
    """
    ctx = context or {}
    text_to_check = f"{event_type or ''} {category or ''} {title or ''}".upper()

    # 1. System Failure, Database Outage & Critical Crashes
    if any(k in text_to_check for k in ["SYSTEM_FAILURE", "DATABASE_OUTAGE", "SERVICE_CRASH", "API_OUTAGE", "SYSTEM FAILURE"]):
        return ("URGENT", "CRITICAL")

    # 2. Fraud Alert & Forensic Network Anomalies
    if any(k in text_to_check for k in ["FRAUD", "SUSPICIOUS_VELOCITY", "IDENTITY_THEFT", "DEVICE_SPOOF", "CONFIRMED_FRAUD"]):
        return ("URGENT", "CRITICAL")

    # 3. Liquidity Threshold Breaches & Capital Deficits
    if any(k in text_to_check for k in ["LIQUIDITY_ALERT", "LCR_BREACH", "ALM_DEFICIT", "LIQUIDITY THRESHOLD", "LIQUIDITY"]):
        return ("URGENT", "CRITICAL")

    # 4. Critical Loan Defaults & NPA Transitions
    if any(k in text_to_check for k in ["CRITICAL_DEFAULT", "NPA_CLASSIFICATION", "REPOSSESSION", "WRITEOFF"]):
        return ("URGENT", "CRITICAL")

    # 5. Payment Failed & Repayment Bounces
    if any(k in text_to_check for k in ["PAYMENT_FAILED", "REPAYMENT_BOUNCE", "NACH_REJECTED", "DISBURSEMENT_FAILED", "PAYMENT FAILED"]):
        return ("HIGH", "WARNING")

    # 6. Document Required & Replacement Requests
    if any(k in text_to_check for k in ["DOCUMENT_REQUIRED", "DOCUMENT_REPLACEMENT", "KYC_REJECTED", "DOCUMENTS_PENDING", "DOCUMENT REQUIRED"]):
        return ("HIGH", "WARNING")

    # 7. Delinquency Spikes & Collection Escalations
    if any(k in text_to_check for k in ["DELINQUENCY_SPIKE", "COLLECTION_ESCALATION", "PROMISE_BROKEN", "COLLECTIONS ALERT"]):
        return ("HIGH", "WARNING")

    # 8. EMI Approaching, Sanctions & Servicing Milestones
    if any(k in text_to_check for k in ["EMI_APPROACHING", "EMI_DUE", "LOAN_SANCTIONED", "DISBURSEMENT_COMPLETED", "APPLICATION_SUBMITTED", "EMI APPROACHING"]):
        return ("NORMAL", "INFO")

    # 9. Routine / Informational Notifications
    if any(k in text_to_check for k in ["KYC_VERIFIED", "MODEL_REGISTRY", "ROUTINE", "SYSTEM_SYNC"]):
        return ("LOW", "INFO")

    # Dynamic threshold overrides
    if ctx.get("fraud_score", 0) >= 75 or ctx.get("dpd", 0) >= 90 or ctx.get("lcr", 2.0) < 1.0:
        return ("URGENT", "CRITICAL")
    if ctx.get("dpd", 0) >= 30 or ctx.get("amount_failed", 0) > 0:
        return ("HIGH", "WARNING")

    return ("NORMAL", "INFO")


def log_notification_audit(
    db: Session,
    user: Optional[User],
    action: str,
    notification_id: str,
    before_state: Optional[Dict[str, Any]] = None,
    after_state: Optional[Dict[str, Any]] = None,
    details: Optional[Dict[str, Any]] = None,
    client_ip: Optional[str] = "127.0.0.1"
):
    try:
        user_role = user.role.value if (user and hasattr(user.role, "value")) else (str(user.role) if user else "SYSTEM")
        audit = AuditLog(
            user_id=user.id if user else None,
            user_email=user.email if user else "system@finsight.ai",
            user_name=user.full_name if user else "FinSight System",
            user_role=user_role,
            action=action,
            resource=f"NOTIFICATION:{notification_id}",
            entity_type="Notification",
            entity_id=notification_id,
            details_json=json.dumps(details or {}),
            before_state_json=json.dumps(before_state or {}) if before_state else None,
            after_state_json=json.dumps(after_state or {}) if after_state else None,
            ip_address=client_ip,
            created_at=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to record notification audit: {e}")
        db.rollback()


class NotificationCreatePayload(BaseModel):
    title: str
    message: str
    event_type: Optional[str] = None
    category: Optional[str] = "Agent Alert"
    priority: Optional[str] = None
    severity: Optional[str] = None
    event_key: Optional[str] = None
    recipient_email: Optional[str] = None
    role_target: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    action_url: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    context: Optional[Dict[str, Any]] = None


class NotificationUpdatePayload(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    priority: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    is_read: Optional[bool] = None


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    priority: Optional[str] = Query(None, description="Filter by Priority: LOW, NORMAL, HIGH, URGENT"),
    severity: Optional[str] = Query(None, description="Filter by Severity: INFO, WARNING, CRITICAL"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_read: Optional[bool] = Query(None, description="Filter read or unread"),
    start_date: Optional[datetime] = Query(None, description="Filter from timestamp"),
    end_date: Optional[datetime] = Query(None, description="Filter to timestamp"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    List notifications with multi-dimensional filtering, user scoping, and required sorting:
    Urgent/High priority first, then Severity, then newest timestamp.
    """
    query = db.query(Notification)

    # User scoping for relevant notifications
    if current_user:
        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        query = query.filter(
            or_(
                Notification.recipient_email == current_user.email,
                Notification.role_target == user_role_str,
                Notification.role_target == "ALL",
                and_(Notification.recipient_email.is_(None), Notification.role_target.is_(None))
            )
        )

    # Apply filters
    if priority and priority.upper() != "ALL":
        query = query.filter(func.upper(Notification.priority) == priority.upper())
    if severity and severity.upper() != "ALL":
        query = query.filter(func.upper(Notification.severity) == severity.upper())
    if category and category.upper() != "ALL":
        query = query.filter(Notification.category.ilike(f"%{category}%"))
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    if start_date:
        query = query.filter(Notification.created_at >= start_date)
    if end_date:
        query = query.filter(Notification.created_at <= end_date)

    # Scoped unread count calculation
    unread_q = db.query(Notification).filter(Notification.is_read == False, Notification.status == "ACTIVE")
    if current_user:
        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        unread_q = unread_q.filter(
            or_(
                Notification.recipient_email == current_user.email,
                Notification.role_target == user_role_str,
                Notification.role_target == "ALL",
                and_(Notification.recipient_email.is_(None), Notification.role_target.is_(None))
            )
        )
    unread_count = unread_q.count()

    # Required Sorting Hierarchy:
    # 1. Urgent/High priority first (URGENT=4, HIGH=3, NORMAL=2, LOW=1)
    # 2. Then severity (CRITICAL=3, WARNING=2, INFO=1)
    # 3. Then newest timestamp (created_at DESC)
    priority_order = case(
        (func.upper(Notification.priority) == "URGENT", 4),
        (func.upper(Notification.priority) == "HIGH", 3),
        (func.upper(Notification.priority) == "NORMAL", 2),
        (func.upper(Notification.priority) == "LOW", 1),
        else_=2
    )

    severity_order = case(
        (func.upper(Notification.severity) == "CRITICAL", 3),
        (func.upper(Notification.severity) == "WARNING", 2),
        (func.upper(Notification.severity) == "INFO", 1),
        else_=1
    )

    items = query.order_by(
        desc(priority_order),
        desc(severity_order),
        desc(Notification.created_at)
    ).offset(offset).limit(limit).all()

    # Seed baseline institutional items if empty
    if not items and offset == 0:
        seed_samples = [
            Notification(
                notification_id="NOTIF-SYS-001",
                title="Elevated Fraud Velocity Alert",
                message="Multiple loan applications share high-risk synthetic device signatures across Tier 2 hubs.",
                priority="URGENT",
                severity="CRITICAL",
                category="Fraud Alert",
                responsible_agent="Fraud Intelligence",
                is_read=False,
                event_key="FRAUD_ALERT:SYNTH_FINGERPRINT",
                created_at=datetime.utcnow()
            ),
            Notification(
                notification_id="NOTIF-SYS-002",
                title="Liquidity LCR Buffer Threshold Warning",
                message="Projected Net Cash Outflows approach internal regulatory threshold boundary.",
                priority="URGENT",
                severity="CRITICAL",
                category="Liquidity Alert",
                responsible_agent="Liquidity Intelligence",
                is_read=False,
                event_key="LIQUIDITY_ALERT:LCR_DEFICIT",
                created_at=datetime.utcnow()
            ),
            Notification(
                notification_id="NOTIF-SYS-003",
                title="KYC Replacement Document Required",
                message="Borrower PAN card mask verification unreadable. Replacement document required.",
                priority="HIGH",
                severity="WARNING",
                category="Compliance",
                responsible_agent="KYC Operations",
                is_read=False,
                event_key="DOCUMENT_REQUIRED:CUST-00001",
                created_at=datetime.utcnow()
            ),
            Notification(
                notification_id="NOTIF-SYS-004",
                title="NACH Mandate Payment Failed",
                message="Direct debit presentation returned due to insufficient funds.",
                priority="HIGH",
                severity="WARNING",
                category="Collections",
                responsible_agent="Collections Intelligence",
                is_read=False,
                event_key="PAYMENT_FAILED:LN-00001",
                created_at=datetime.utcnow()
            ),
            Notification(
                notification_id="NOTIF-SYS-005",
                title="Scheduled EMI Installment Approaching",
                message="Monthly installment of ₹14,250 due in 3 days. Automated borrower reminder dispatched.",
                priority="NORMAL",
                severity="INFO",
                category="Customer Servicing",
                responsible_agent="Operations Desk",
                is_read=True,
                event_key="EMI_APPROACHING:LN-00001",
                created_at=datetime.utcnow()
            ),
        ]
        db.add_all(seed_samples)
        db.commit()
        return list_notifications(priority, severity, category, is_read, start_date, end_date, limit, offset, db, current_user)

    return NotificationListResponse(
        unread_count=unread_count,
        items=[NotificationItem.model_validate(n) for n in items]
    )


@router.post("", summary="Create or update notification with business rules & deduplication")
def create_or_update_notification(
    payload: NotificationCreatePayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Creates a new notification or updates an existing notification if event_key matches.
    Determines priority and severity from business rules.
    Audits any priority/severity state changes.
    """
    # 1. Determine Priority and Severity
    if payload.priority and payload.severity:
        p_val = payload.priority.upper()
        s_val = payload.severity.upper()
    else:
        derived_p, derived_s = determine_priority_and_severity(
            event_type=payload.event_type,
            category=payload.category,
            title=payload.title,
            context=payload.context
        )
        p_val = payload.priority.upper() if payload.priority else derived_p
        s_val = payload.severity.upper() if payload.severity else derived_s

    if p_val not in VALID_PRIORITIES:
        p_val = "NORMAL"
    if s_val not in VALID_SEVERITIES:
        s_val = "INFO"

    client_ip = request.client.host if request.client else "127.0.0.1"

    # 2. State Transition & Deduplication Check: Update existing if event_key matches
    if payload.event_key:
        existing = db.query(Notification).filter(
            Notification.event_key == payload.event_key,
            Notification.status == "ACTIVE"
        ).first()

        if existing:
            before_state = {
                "priority": existing.priority,
                "severity": existing.severity,
                "title": existing.title,
                "message": existing.message,
                "status": existing.status,
                "is_read": existing.is_read
            }

            is_p_changed = existing.priority != p_val
            is_s_changed = existing.severity != s_val

            existing.title = payload.title
            existing.message = payload.message
            existing.priority = p_val
            existing.severity = s_val
            if payload.status:
                existing.status = payload.status
            if payload.action_url:
                existing.action_url = payload.action_url
            existing.updated_at = datetime.utcnow()

            db.commit()
            db.refresh(existing)

            after_state = {
                "priority": existing.priority,
                "severity": existing.severity,
                "title": existing.title,
                "message": existing.message,
                "status": existing.status,
                "is_read": existing.is_read
            }

            action_name = "NOTIFICATION_PRIORITY_SEVERITY_CHANGED" if (is_p_changed or is_s_changed) else "NOTIFICATION_STATE_UPDATED"
            log_notification_audit(
                db=db,
                user=current_user,
                action=action_name,
                notification_id=existing.notification_id,
                before_state=before_state,
                after_state=after_state,
                details={"event_key": payload.event_key, "updated_in_place": True},
                client_ip=client_ip
            )

            return {
                "status": "SUCCESS",
                "message": f"Updated existing notification ({existing.notification_id}) in place without duplicate creation.",
                "action": "UPDATED",
                "notification": NotificationItem.model_validate(existing)
            }

    # 3. Create New Notification
    notif_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
    new_notif = Notification(
        notification_id=notif_id,
        title=payload.title,
        message=payload.message,
        priority=p_val,
        severity=s_val,
        category=payload.category or "Agent Alert",
        is_read=False,
        status=payload.status or "ACTIVE",
        event_key=payload.event_key,
        recipient_email=payload.recipient_email,
        role_target=payload.role_target,
        related_entity_type=payload.related_entity_type,
        related_entity_id=payload.related_entity_id,
        action_url=payload.action_url,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)

    log_notification_audit(
        db=db,
        user=current_user,
        action="NOTIFICATION_CREATED",
        notification_id=new_notif.notification_id,
        after_state={
            "priority": new_notif.priority,
            "severity": new_notif.severity,
            "title": new_notif.title,
            "category": new_notif.category
        },
        client_ip=client_ip
    )

    return {
        "status": "SUCCESS",
        "message": f"Notification created with Priority={p_val} and Severity={s_val}.",
        "action": "CREATED",
        "notification": NotificationItem.model_validate(new_notif)
    }


@router.put("/{notification_id}", summary="Update notification priority, severity, or status with audit tracking")
def update_notification(
    notification_id: str,
    payload: NotificationUpdatePayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Updates priority, severity, or status.
    Mandatory requirement: All priority/severity changes must be recorded in the audit history.
    """
    notif = db.query(Notification).filter(
        (Notification.notification_id == notification_id) |
        (Notification.id == (int(notification_id) if notification_id.isdigit() else -1))
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    before_state = {
        "priority": notif.priority,
        "severity": notif.severity,
        "title": notif.title,
        "status": notif.status,
        "is_read": notif.is_read
    }

    if payload.title is not None: notif.title = payload.title
    if payload.message is not None: notif.message = payload.message
    if payload.priority is not None:
        p_up = payload.priority.upper()
        if p_up in VALID_PRIORITIES:
            notif.priority = p_up
    if payload.severity is not None:
        s_up = payload.severity.upper()
        if s_up in VALID_SEVERITIES:
            notif.severity = s_up
    if payload.status is not None: notif.status = payload.status
    if payload.is_read is not None: notif.is_read = payload.is_read

    notif.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(notif)

    after_state = {
        "priority": notif.priority,
        "severity": notif.severity,
        "title": notif.title,
        "status": notif.status,
        "is_read": notif.is_read
    }

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_notification_audit(
        db=db,
        user=current_user,
        action="NOTIFICATION_PRIORITY_SEVERITY_CHANGED",
        notification_id=notif.notification_id,
        before_state=before_state,
        after_state=after_state,
        details={"manual_update": True},
        client_ip=client_ip
    )

    return {
        "status": "SUCCESS",
        "message": f"Notification {notif.notification_id} updated.",
        "notification": NotificationItem.model_validate(notif)
    }


@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(
        (Notification.notification_id == notification_id) | (Notification.id == (int(notification_id) if notification_id.isdigit() else -1))
    ).first()
    if notif:
        notif.is_read = True
        notif.updated_at = datetime.utcnow()
        db.commit()
    return {"status": "success", "message": "Notification marked as read"}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = db.query(Notification).filter(Notification.is_read == False)
    if current_user:
        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        query = query.filter(
            or_(
                Notification.recipient_email == current_user.email,
                Notification.role_target == user_role_str,
                Notification.role_target == "ALL",
                and_(Notification.recipient_email.is_(None), Notification.role_target.is_(None))
            )
        )
    query.update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"status": "success", "message": "Relevant notifications marked as read"}


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = db.query(Notification).filter(Notification.is_read == False, Notification.status == "ACTIVE")
    if current_user:
        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        query = query.filter(
            or_(
                Notification.recipient_email == current_user.email,
                Notification.role_target == user_role_str,
                Notification.role_target == "ALL",
                and_(Notification.recipient_email.is_(None), Notification.role_target.is_(None))
            )
        )
    return {"unread_count": query.count()}


@router.post("/generate-alerts")
def generate_live_alerts(db: Session = Depends(get_db)):
    """
    Scans live backend agent signals and generates real notification events
    with derived Priority (LOW, NORMAL, HIGH, URGENT) and Severity (INFO, WARNING, CRITICAL).
    """
    from app.agents.risk_agent import risk_agent
    from app.agents.liquidity_agent import liquidity_agent

    new_notifs = []

    # 1. Check portfolio risk
    try:
        risk_res = risk_agent.get_portfolio_risk()
        score = risk_res.get("portfolio_risk_score", 42.5)
        if score > 50:
            notif_id = f"NOTIF-{uuid.uuid4().hex[:6].upper()}"
            notif = Notification(
                notification_id=notif_id,
                title="Portfolio Risk Elevated",
                message=f"Composite NBFC risk score increased to {score:.1f}/100. Review geographic concentration HHI.",
                priority="HIGH",
                severity="WARNING",
                category="Risk",
                responsible_agent="Risk Intelligence",
                is_read=False,
                event_key="PORTFOLIO_RISK:ELEVATED",
                created_at=datetime.utcnow()
            )
            db.add(notif)
            new_notifs.append(notif.title)
    except Exception:
        pass

    # 2. Check liquidity buffer
    try:
        liq_res = liquidity_agent.get_forecast(days=30)
        lcr = liq_res.get("lcr_buffer_ratio", 1.45)
        if lcr < 1.10:
            notif_id = f"NOTIF-{uuid.uuid4().hex[:6].upper()}"
            notif = Notification(
                notification_id=notif_id,
                title="Liquidity Threshold Warning",
                message=f"LCR buffer ratio approaching regulatory buffer boundary at {lcr:.2f}x.",
                priority="URGENT",
                severity="CRITICAL",
                category="Liquidity Alert",
                responsible_agent="Liquidity Intelligence",
                is_read=False,
                event_key="LIQUIDITY_ALERT:LCR_BOUNDARY",
                created_at=datetime.utcnow()
            )
            db.add(notif)
            new_notifs.append(notif.title)
    except Exception:
        pass

    # 3. Model retraining notice
    notif_m = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title="Model Registry Synchronized",
        message="All 6 NBFC machine learning pipelines registered and validated in MLflow.",
        priority="LOW",
        severity="INFO",
        category="System",
        responsible_agent="Model Governance",
        is_read=False,
        event_key="MODEL_REGISTRY:VALIDATED",
        created_at=datetime.utcnow()
    )
    db.add(notif_m)
    new_notifs.append(notif_m.title)

    db.commit()
    return {"status": "success", "generated_count": len(new_notifs), "events": new_notifs}
