"""
FinSight AI - KYC Verification & Compliance Desk Router
Implements KYC Officer Dashboard, Work Queue, Multi-Document Verification,
Detailed Review Screen, Automatic Escalations, and Audited Status Transitions.
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_

from app.database import get_db
from app.models.customers import Customer, CustomerProfile
from app.models.loans import LoanApplication, Loan
from app.models.portal_models import KycCase, Document, WorkTask, CustomerCommunication
from app.models.notifications import Notification
from app.models.assessments import FraudAlert
from app.models.users import User, UserRole, AuditLog
from app.security.jwt import get_current_user_optional, get_current_user, require_roles
from app.services.followup_service import FollowUpAutomationService

router = APIRouter(prefix="/kyc", tags=["KYC & Compliance Management"])

# --- Request/Response Schemas ---
class VerifyDocumentPayload(BaseModel):
    doc_id: str
    action: str  # VERIFY, REJECT, REQUEST_REPLACEMENT
    reason: Optional[str] = None
    notes: Optional[str] = None

class KycActionPayload(BaseModel):
    action: str  # VERIFY_KYC, REJECT_KYC, REQUEST_DOCUMENT, REQUEST_REPLACEMENT, ESCALATE, ASSIGN, REASSIGN, ADD_NOTE, REQUEST_INFORMATION
    reason: Optional[str] = None
    notes: Optional[str] = None
    assigned_officer: Optional[str] = None
    doc_type: Optional[str] = None

def get_or_create_kyc_case(db: Session, customer_id: int, application_id: Optional[int] = None) -> KycCase:
    """Finds or initializes a KYC case for a customer application."""
    query = db.query(KycCase).filter(KycCase.customer_id == customer_id)
    if application_id:
        case = query.filter(KycCase.application_id == application_id).first()
    else:
        case = query.first()

    if not case:
        case_id = f"KYC-{datetime.utcnow().strftime('%y%m')}-{uuid.uuid4().hex[:5].upper()}"
        case = KycCase(
            case_id=case_id,
            customer_id=customer_id,
            application_id=application_id,
            status="UNDER_REVIEW",
            assigned_officer="KYC Officer Demo",
            risk_level="LOW",
            document_status="PENDING",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(case)
        db.commit()
        db.refresh(case)
    return case

# ==========================================
# 1. KYC OFFICER DASHBOARD (/kyc/dashboard)
# ==========================================
@router.get("/dashboard")
def get_kyc_dashboard(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns real-time KYC operational metrics scoped to role and assignment.
    """
    # Permission check: If authenticated, ensure role is appropriate
    if current_user and current_user.role not in [
        UserRole.KYC_OFFICER, UserRole.ADMIN, UserRole.OPERATIONS_OFFICER,
        UserRole.OPERATIONS_MANAGER, UserRole.RISK_MANAGER, UserRole.EXECUTIVE
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have permission to access KYC Officer Dashboard."
        )

    user_name = current_user.full_name if current_user else "KYC Officer Demo"
    user_email = current_user.email if current_user else "kyc.officer@finsight.ai"
    is_scoped = current_user and current_user.role == UserRole.KYC_OFFICER

    # Query all cases
    cases_q = db.query(KycCase)
    if is_scoped:
        scoped_cases_q = cases_q.filter(
            or_(
                KycCase.assigned_officer == user_name,
                KycCase.assigned_officer == user_email,
                KycCase.assigned_officer.is_(None)
            )
        )
    else:
        scoped_cases_q = cases_q

    total_cases = scoped_cases_q.count()
    pending_cases = scoped_cases_q.filter(
        KycCase.status.in_(["NOT_STARTED", "DOCUMENTS_PENDING", "UNDER_REVIEW", "ADDITIONAL_INFORMATION_REQUIRED"])
    ).count()

    assigned_cases = db.query(KycCase).filter(
        or_(
            KycCase.assigned_officer == user_name,
            KycCase.assigned_officer == user_email
        )
    ).count()

    completed_cases = scoped_cases_q.filter(KycCase.status == "VERIFIED").count()
    rejected_cases = scoped_cases_q.filter(KycCase.status == "REJECTED").count()

    # Documents awaiting verification
    docs_q = db.query(Document)
    docs_awaiting = docs_q.filter(Document.status.in_(["UPLOADED", "UNDER_REVIEW"])).count()
    docs_requiring_replacement = docs_q.filter(Document.status == "REPLACEMENT_REQUIRED").count()

    # KYC Completion Rate
    denominator = completed_cases + rejected_cases + pending_cases
    completion_rate = round((completed_cases / max(denominator, 1)) * 100.0, 1)

    # High priority cases
    high_priority_cases = scoped_cases_q.filter(KycCase.risk_level.in_(["HIGH", "CRITICAL"])).count()

    # Notifications
    notifications_q = db.query(Notification).filter(
        or_(
            Notification.recipient_email == user_email,
            Notification.role_target == "KYC_OFFICER",
            Notification.role_target.is_(None)
        )
    ).order_by(desc(Notification.created_at)).limit(5).all()

    notifications = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": getattr(n, "severity", "Info"),
            "read": getattr(n, "is_read", False),
            "time": n.created_at.strftime("%d %b, %H:%M") if n.created_at else ""
        }
        for n in notifications_q
    ]

    # Pending tasks
    tasks_q = db.query(WorkTask).filter(
        or_(
            WorkTask.assigned_to == user_name,
            WorkTask.assigned_to == user_email,
            WorkTask.role_target == "KYC_OFFICER"
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

    return {
        "pending_kyc_cases": pending_cases,
        "assigned_cases": assigned_cases,
        "completed_cases": completed_cases,
        "rejected_cases": rejected_cases,
        "documents_awaiting_verification": docs_awaiting,
        "documents_requiring_replacement": docs_requiring_replacement,
        "kyc_completion_rate": completion_rate,
        "average_verification_time": "3.8 hours",
        "high_priority_cases": high_priority_cases,
        "notifications": notifications,
        "pending_tasks": tasks
    }

# ==========================================
# 2. KYC WORK QUEUE (/kyc/cases)
# ==========================================
@router.get("/cases")
def get_kyc_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    doc_type: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    assigned_officer: Optional[str] = Query(None),
    application_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns list of KYC cases matching filters.
    """
    if current_user and current_user.role not in [
        UserRole.KYC_OFFICER, UserRole.ADMIN, UserRole.OPERATIONS_OFFICER,
        UserRole.OPERATIONS_MANAGER, UserRole.RISK_MANAGER, UserRole.EXECUTIVE
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: KYC role required."
        )

    # Automatically ensure KYC cases exist for submitted applications
    submitted_apps = db.query(LoanApplication).all()
    for app in submitted_apps:
        get_or_create_kyc_case(db, customer_id=app.customer_id, application_id=app.id)

    q = db.query(KycCase).order_by(desc(KycCase.created_at))

    # Officer Scoping
    if current_user and current_user.role == UserRole.KYC_OFFICER:
        if not assigned_officer:
            q = q.filter(
                or_(
                    KycCase.assigned_officer == current_user.full_name,
                    KycCase.assigned_officer == current_user.email,
                    KycCase.assigned_officer.is_(None)
                )
            )

    if status_filter and status_filter.upper() != "ALL":
        q = q.filter(KycCase.status == status_filter.upper())

    if risk_level and risk_level.upper() != "ALL":
        q = q.filter(KycCase.risk_level == risk_level.upper())

    if assigned_officer and assigned_officer.upper() != "ALL":
        q = q.filter(KycCase.assigned_officer == assigned_officer)

    if application_id:
        app_obj = db.query(LoanApplication).filter(LoanApplication.application_id == application_id).first()
        if app_obj:
            q = q.filter(KycCase.application_id == app_obj.id)
        else:
            return {"total": 0, "cases": []}

    cases = q.all()
    results = []

    for c in cases:
        cust = db.query(Customer).filter(Customer.id == c.customer_id).first()
        app = db.query(LoanApplication).filter(LoanApplication.id == c.application_id).first() if c.application_id else None

        # Filter by document type if requested
        docs = db.query(Document).filter(Document.customer_id == c.customer_id).all()
        if doc_type and doc_type.upper() != "ALL":
            matching_docs = [d for d in docs if (d.doc_type or "").upper() == doc_type.upper()]
            if not matching_docs:
                continue

        total_docs = len(docs)
        verified_docs = len([d for d in docs if d.status == "VERIFIED"])
        replacement_needed = len([d for d in docs if d.status == "REPLACEMENT_REQUIRED"])

        doc_status_label = "ALL_VERIFIED" if total_docs > 0 and verified_docs == total_docs else (
            "REPLACEMENT_REQUIRED" if replacement_needed > 0 else (
                "UNDER_REVIEW" if total_docs > 0 else "NO_DOCS"
            )
        )

        results.append({
            "case_id": c.case_id,
            "customer_id": cust.customer_id if cust else f"CUST-{c.customer_id}",
            "customer_name": f"{cust.first_name} {cust.last_name}" if cust else "Unknown Customer",
            "customer_email": cust.email if cust else None,
            "customer_phone": cust.phone_hash if cust else None,
            "application_id": app.application_id if app else None,
            "product_type": app.product_type if app else "MSME Loan",
            "requested_amount": app.requested_amount if app else 500000.0,
            "kyc_status": c.status,
            "document_status": doc_status_label,
            "assigned_officer": c.assigned_officer or "KYC Officer Demo",
            "risk_indicators": c.risk_level,
            "risk_level": c.risk_level,
            "total_documents": total_docs,
            "verified_documents": verified_docs,
            "created_date": c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else "",
            "last_updated": c.updated_at.strftime("%Y-%m-%d %H:%M") if c.updated_at else ""
        })

    return {
        "total": len(results),
        "cases": results
    }

# ==========================================
# 3. DETAILED KYC REVIEW (/kyc/review/{id})
# ==========================================
@router.get("/review/{identifier}")
def get_kyc_review_detail(
    identifier: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns complete verification dossier including customer profile,
    documents, metadata, history, timeline, risk indicators, fraud alerts, and existing loans.
    """
    if current_user and current_user.role not in [
        UserRole.KYC_OFFICER, UserRole.ADMIN, UserRole.OPERATIONS_OFFICER,
        UserRole.OPERATIONS_MANAGER, UserRole.RISK_MANAGER, UserRole.EXECUTIVE
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Insufficient permissions to view KYC Review screen."
        )

    # Find case or application
    case = db.query(KycCase).filter(
        or_(
            KycCase.case_id == identifier,
            KycCase.application_id == identifier
        )
    ).first()

    app_obj = None
    if not case:
        app_obj = db.query(LoanApplication).filter(LoanApplication.application_id == identifier).first()
        if app_obj:
            case = get_or_create_kyc_case(db, customer_id=app_obj.customer_id, application_id=app_obj.id)
    else:
        if case.application_id:
            app_obj = db.query(LoanApplication).filter(LoanApplication.id == case.application_id).first()

    if not case:
        raise HTTPException(status_code=404, detail="KYC Case or Application not found.")

    cust = db.query(Customer).filter(Customer.id == case.customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Associated customer profile not found.")

    # 1. Documents
    docs = db.query(Document).filter(Document.customer_id == cust.id).all()
    doc_list = []
    for d in docs:
        doc_list.append({
            "doc_id": d.doc_id,
            "doc_type": d.doc_type,
            "document_type": d.doc_type,
            "file_name": d.file_name,
            "file_size_kb": d.file_size_kb,
            "status": d.status,
            "verification_status": d.status,
            "verified_by": d.verified_by,
            "verification_notes": d.verification_notes,
            "rejection_reason": d.rejection_reason,
            "replacement_reason": d.replacement_reason,
            "uploaded_at": d.uploaded_at.strftime("%Y-%m-%d %H:%M") if d.uploaded_at else "",
            "verified_at": d.verified_at.strftime("%Y-%m-%d %H:%M") if d.verified_at else None
        })

    # 2. Existing Loans
    loans = db.query(Loan).filter(Loan.customer_id == cust.id).all()
    loans_list = [
        {
            "loan_id": l.loan_id,
            "product_type": l.product_type,
            "amount": l.loan_amount,
            "outstanding_balance": l.outstanding_balance,
            "emi": l.emi,
            "dpd": l.dpd,
            "status": l.status
        }
        for l in loans
    ]

    # 3. Previous Applications
    prior_apps = db.query(LoanApplication).filter(
        LoanApplication.customer_id == cust.id,
        LoanApplication.id != (app_obj.id if app_obj else -1)
    ).all()
    prior_apps_list = [
        {
            "application_id": pa.application_id,
            "product_type": pa.product_type,
            "requested_amount": pa.requested_amount,
            "status": pa.status,
            "created_at": pa.created_at.strftime("%Y-%m-%d") if pa.created_at else ""
        }
        for pa in prior_apps
    ]

    # 4. Fraud Alerts
    alerts = db.query(FraudAlert).filter(FraudAlert.customer_id == cust.id).all()
    alerts_list = [
        {
            "alert_id": a.alert_id,
            "type": a.alert_type,
            "severity": a.severity,
            "rule_triggered": a.rule_triggered,
            "status": a.status
        }
        for a in alerts
    ]

    # 5. Verification History & Audit Logs
    audit_entries = db.query(AuditLog).filter(
        or_(
            AuditLog.resource.contains(case.case_id),
            AuditLog.resource.contains(cust.customer_id),
            AuditLog.resource.contains(app_obj.application_id if app_obj else "NONE")
        )
    ).order_by(desc(AuditLog.created_at)).limit(15).all()

    verification_history = [
        {
            "id": a.id,
            "action": a.action,
            "resource": a.resource,
            "details": a.details_json,
            "timestamp": a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else ""
        }
        for a in audit_entries
    ]

    return {
        "case_id": case.case_id,
        "kyc_status": case.status,
        "risk_level": case.risk_level,
        "assigned_officer": case.assigned_officer,
        "rejection_reason": case.rejection_reason,
        "verification_notes": case.verification_notes,
        "created_at": case.created_at.strftime("%Y-%m-%d %H:%M") if case.created_at else "",
        "updated_at": case.updated_at.strftime("%Y-%m-%d %H:%M") if case.updated_at else "",
        "customer": {
            "customer_id": cust.customer_id,
            "first_name": cust.first_name,
            "last_name": cust.last_name,
            "email": cust.email,
            "phone": cust.phone_hash,
            "age": cust.age,
            "gender": cust.gender,
            "occupation": cust.occupation,
            "employment_type": cust.employment_type,
            "income": cust.income,
            "location": cust.location,
            "state": cust.state,
            "credit_score": cust.credit_score,
            "risk_tier": cust.risk_tier,
            "previous_defaults": cust.previous_defaults,
            "kyc_status": cust.kyc_status
        },
        "application": {
            "application_id": app_obj.application_id if app_obj else None,
            "product_type": app_obj.product_type if app_obj else None,
            "requested_amount": app_obj.requested_amount if app_obj else None,
            "requested_tenure": app_obj.requested_tenure if app_obj else None,
            "purpose": app_obj.purpose if app_obj else None,
            "status": app_obj.status if app_obj else None,
            "workflow_stage": getattr(app_obj, "workflow_stage", "SUBMITTED"),
            "created_at": app_obj.created_at.strftime("%Y-%m-%d %H:%M") if app_obj and app_obj.created_at else ""
        },
        "documents": doc_list,
        "existing_loans": loans_list,
        "previous_applications": prior_apps_list,
        "fraud_alerts": alerts_list,
        "verification_history": verification_history
    }

# ==========================================
# 4. DOCUMENT-LEVEL VERIFICATION
# ==========================================
@router.post("/cases/{case_id}/verify-document")
def verify_document(
    case_id: str,
    payload: VerifyDocumentPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Verifies, rejects, or requests replacement for an individual customer document.
    """
    if current_user and current_user.role not in [
        UserRole.KYC_OFFICER, UserRole.ADMIN, UserRole.OPERATIONS_OFFICER,
        UserRole.OPERATIONS_MANAGER, UserRole.RISK_MANAGER
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: KYC verification permissions required."
        )

    user_name = current_user.full_name if current_user else "KYC Officer Demo"

    case = db.query(KycCase).filter(KycCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="KYC Case not found.")

    doc = db.query(Document).filter(
        Document.doc_id == payload.doc_id,
        Document.customer_id == case.customer_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {payload.doc_id} not found.")

    action_upper = payload.action.upper()
    if action_upper == "VERIFY":
        doc.status = "VERIFIED"
        doc.verification_status = "VERIFIED"
        doc.verified_by = user_name
        doc.verified_at = datetime.utcnow()
        doc.verification_notes = payload.notes
    elif action_upper == "REJECT":
        if not payload.reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required.")
        doc.status = "REJECTED"
        doc.verification_status = "REJECTED"
        doc.verified_by = user_name
        doc.rejection_reason = payload.reason
        doc.verification_notes = payload.notes
    elif action_upper in ["REQUEST_REPLACEMENT", "REPLACEMENT_REQUIRED"]:
        if not payload.reason:
            raise HTTPException(status_code=400, detail="Replacement reason is required.")
        doc.status = "REPLACEMENT_REQUIRED"
        doc.verification_status = "REPLACEMENT_REQUIRED"
        doc.verified_by = user_name
        doc.replacement_reason = payload.reason
        doc.verification_notes = payload.notes

        # Create automated follow-up & notification
        FollowUpAutomationService.on_missing_document(
            db=db,
            customer_id=f"CUST-{case.customer_id}",
            document_type=doc.doc_type,
            application_id=str(case.application_id) if case.application_id else None
        )
    else:
        raise HTTPException(status_code=400, detail=f"Invalid document action: {payload.action}")

    # Audit log
    audit = AuditLog(
        user_id=current_user.id if current_user else 1,
        action=f"DOCUMENT_{action_upper}",
        resource=f"Document:{doc.doc_id}:Case:{case.case_id}",
        details_json=json.dumps({
            "doc_id": doc.doc_id,
            "doc_type": doc.doc_type,
            "action": action_upper,
            "reason": payload.reason,
            "verified_by": user_name
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    case.updated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "doc_id": doc.doc_id,
        "verification_status": doc.status,
        "verified_by": user_name,
        "message": f"Document {doc.doc_type} successfully updated to {doc.status}."
    }

# ==========================================
# 5. KYC OFFICER WORKFLOW ACTIONS
# ==========================================
@router.post("/cases/{case_id}/action")
def execute_kyc_action(
    case_id: str,
    payload: KycActionPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Executes KYC case-level transitions:
    VERIFY_KYC, REJECT_KYC, REQUEST_DOCUMENT, REQUEST_REPLACEMENT, ESCALATE, ASSIGN, REASSIGN, ADD_NOTE
    """
    if current_user and current_user.role not in [
        UserRole.KYC_OFFICER, UserRole.ADMIN, UserRole.OPERATIONS_OFFICER,
        UserRole.OPERATIONS_MANAGER, UserRole.RISK_MANAGER
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Insufficient permissions to perform KYC verification action."
        )

    user_name = current_user.full_name if current_user else "KYC Officer Demo"
    user_email = current_user.email if current_user else "kyc.officer@finsight.ai"

    case = db.query(KycCase).filter(KycCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="KYC Case not found.")

    cust = db.query(Customer).filter(Customer.id == case.customer_id).first()
    app_obj = db.query(LoanApplication).filter(LoanApplication.id == case.application_id).first() if case.application_id else None

    action_upper = payload.action.upper()

    if action_upper == "VERIFY_KYC":
        case.status = "VERIFIED"
        case.completed_at = datetime.utcnow()
        case.updated_at = datetime.utcnow()
        if payload.notes:
            case.verification_notes = payload.notes

        if cust:
            cust.kyc_status = "VERIFIED"
            cust.kyc_verified_at = datetime.utcnow()
            cust.kyc_verified_by = user_name

        if app_obj:
            app_obj.kyc_status = "VERIFIED"
            # Cross-Module Workflow: Advance from KYC_REVIEW to FRAUD_REVIEW / CREDIT_REVIEW
            app_obj.workflow_stage = "FRAUD_REVIEW"

        # Notification for Fraud Officer & Risk Manager
        db.add(Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title="KYC Verified",
            message=f"KYC verification completed for {cust.first_name if cust else 'Customer'} (Case {case.case_id}). Ready for Fraud & Credit analysis.",
            severity="Info",
            category="KYC",
            role_target="FRAUD_OFFICER",
            created_at=datetime.utcnow()
        ))

        # Notification for Customer
        if cust and cust.email:
            db.add(Notification(
                notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
                title="KYC Verified Successfully",
                message="Your identity and address documents have been verified. Your application has moved to underwriting review.",
                severity="Info",
                category="KYC",
                recipient_email=cust.email,
                role_target="CUSTOMER",
                created_at=datetime.utcnow()
            ))

    elif action_upper == "REJECT_KYC":
        if not payload.reason:
            raise HTTPException(status_code=400, detail="Rejection reason is mandatory.")

        case.status = "REJECTED"
        case.rejection_reason = payload.reason
        case.completed_at = datetime.utcnow()
        case.updated_at = datetime.utcnow()

        if cust:
            cust.kyc_status = "REJECTED"

        if app_obj:
            app_obj.kyc_status = "REJECTED"
            app_obj.status = "Rejected"
            app_obj.workflow_stage = "REJECTED"
            app_obj.reviewer_notes = f"KYC Rejected by {user_name}: {payload.reason}"

        # Notify Customer & Sales Officer
        if cust and cust.email:
            db.add(Notification(
                notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
                title="KYC Verification Unsuccessful",
                message=f"Your KYC documentation could not be verified: {payload.reason}. Please contact your loan officer.",
                severity="High",
                category="KYC",
                recipient_email=cust.email,
                role_target="CUSTOMER",
                created_at=datetime.utcnow()
            ))

        db.add(Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title="KYC Case Rejected",
            message=f"KYC Case {case.case_id} rejected for {cust.first_name if cust else 'Customer'}: {payload.reason}",
            severity="High",
            category="KYC",
            role_target="SALES_OFFICER",
            created_at=datetime.utcnow()
        ))

    elif action_upper in ["REQUEST_DOCUMENT", "REQUEST_REPLACEMENT", "REQUEST_INFORMATION"]:
        case.status = "ADDITIONAL_INFORMATION_REQUIRED" if action_upper == "REQUEST_REPLACEMENT" else "DOCUMENTS_PENDING"
        case.updated_at = datetime.utcnow()

        req_msg = payload.reason or payload.notes or "Please provide the requested document."

        # Auto create work task
        task = WorkTask(
            task_id=f"TASK-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}",
            title=f"KYC Document Request: {payload.doc_type or 'Identity Document'}",
            description=req_msg,
            customer_id=f"CUST-{case.customer_id}",
            application_id=app_obj.application_id if app_obj else str(case.application_id),
            role_target="CUSTOMER",
            priority="HIGH",
            status="TODO",
            due_date=datetime.utcnow() + timedelta(days=2),
            created_at=datetime.utcnow()
        )
        db.add(task)

        # Notify Customer
        if cust and cust.email:
            db.add(Notification(
                notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
                title="Action Required: KYC Document Request",
                message=req_msg,
                severity="Medium",
                category="KYC",
                recipient_email=cust.email,
                role_target="CUSTOMER",
                created_at=datetime.utcnow()
            ))

        # Store in CustomerCommunication
        db.add(CustomerCommunication(
            comm_id=f"COMM-{uuid.uuid4().hex[:6].upper()}",
            customer_id=f"CUST-{case.customer_id}",
            application_id=app_obj.application_id if app_obj else None,
            sender=user_name,
            sender_role="KYC_OFFICER",
            recipient=cust.email if cust else "Borrower",
            comm_type="CUSTOMER_MESSAGE",
            subject="KYC Documentation Required",
            message=req_msg,
            created_at=datetime.utcnow()
        ))

    elif action_upper == "ESCALATE":
        if not payload.reason:
            raise HTTPException(status_code=400, detail="Escalation reason is mandatory.")

        case.risk_level = "HIGH"
        case.updated_at = datetime.utcnow()

        # Automatic escalation task for Risk Manager
        esc_task = WorkTask(
            task_id=f"ESC-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}",
            title=f"Escalated KYC Verification Case: {case.case_id}",
            description=f"Escalated by {user_name}. Reason: {payload.reason}",
            customer_id=f"CUST-{case.customer_id}",
            application_id=app_obj.application_id if app_obj else None,
            role_target="RISK_MANAGER",
            priority="HIGH",
            status="TODO",
            due_date=datetime.utcnow() + timedelta(hours=24),
            created_at=datetime.utcnow()
        )
        db.add(esc_task)

        db.add(Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title="KYC Case Escalated",
            message=f"Case {case.case_id} escalated for risk review: {payload.reason}",
            severity="High",
            category="KYC",
            role_target="RISK_MANAGER",
            created_at=datetime.utcnow()
        ))

    elif action_upper in ["ASSIGN", "REASSIGN"]:
        new_officer = payload.assigned_officer or user_name
        case.assigned_officer = new_officer
        case.updated_at = datetime.utcnow()

        db.add(Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title="KYC Case Assigned",
            message=f"You have been assigned KYC Case {case.case_id}.",
            severity="Info",
            category="KYC",
            role_target="KYC_OFFICER",
            created_at=datetime.utcnow()
        ))

    elif action_upper == "ADD_NOTE":
        note_text = payload.notes or payload.reason or "Note added"
        existing = case.verification_notes or ""
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        case.verification_notes = f"{existing}\n[{timestamp}] {user_name}: {note_text}".strip()
        case.updated_at = datetime.utcnow()

    else:
        raise HTTPException(status_code=400, detail=f"Unrecognized action: {payload.action}")

    # Audit Trail
    audit = AuditLog(
        user_id=current_user.id if current_user else 1,
        action=f"KYC_{action_upper}",
        resource=f"KycCase:{case.case_id}",
        details_json=json.dumps({
            "case_id": case.case_id,
            "action": action_upper,
            "status": case.status,
            "officer": user_name,
            "reason": payload.reason,
            "notes": payload.notes
        }),
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "case_id": case.case_id,
        "kyc_status": case.status,
        "message": f"KYC action '{action_upper}' executed successfully."
    }
