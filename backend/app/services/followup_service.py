"""
FinSight AI - Follow-up Automation & Notification Service
Generates automated operational follow-ups and notifications for Sales, Relationship, and Credit teams.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.portal_models import WorkTask
from app.models.notifications import Notification
from app.models.users import AuditLog

class FollowUpAutomationService:
    @staticmethod
    def create_notification(
        db: Session,
        title: str,
        message: str,
        severity: str = "Info",
        category: str = "Workflow",
        responsible_agent: str = "System Orchestration",
        recipient_email: Optional[str] = None,
        role_target: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None
    ) -> Notification:
        notif = Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title=title,
            message=message,
            severity=severity,
            category=category,
            responsible_agent=responsible_agent,
            recipient_email=recipient_email,
            role_target=role_target,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif)
        return notif

    @staticmethod
    def create_automated_task(
        db: Session,
        title: str,
        description: str,
        customer_id: Optional[str] = None,
        application_id: Optional[str] = None,
        assigned_user: Optional[str] = None,
        role_target: str = "SALES_OFFICER",
        priority: str = "MEDIUM",
        due_hours: int = 48,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None
    ) -> WorkTask:
        task_id = f"TASK-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        due_date = datetime.utcnow() + timedelta(hours=due_hours)
        task = WorkTask(
            task_id=task_id,
            title=title,
            description=description,
            role_target=role_target,
            assigned_to=assigned_user,
            customer_id=customer_id,
            application_id=application_id,
            priority=priority,
            status="TODO",
            due_date=due_date,
            related_entity_type=related_entity_type or ("APPLICATION" if application_id else "CUSTOMER" if customer_id else None),
            related_entity_id=related_entity_id or application_id or customer_id,
            created_at=datetime.utcnow()
        )
        db.add(task)
        
        # Also generate notification for the assigned user / role
        FollowUpAutomationService.create_notification(
            db=db,
            title=f"Task Assigned: {title}",
            message=f"{description} (Due in {due_hours}h)",
            severity="Medium" if priority in ["HIGH", "URGENT"] else "Info",
            category="Task Alert",
            responsible_agent="Task Orchestrator",
            recipient_email=assigned_user,
            role_target=role_target,
            related_entity_type="TASK",
            related_entity_id=task_id
        )
        return task

    @classmethod
    def trigger_automation(
        cls,
        db: Session,
        event_type: str,
        customer_id: Optional[str] = None,
        application_id: Optional[str] = None,
        assigned_user: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Automated task triggers:
        - MISSING_DOCUMENT
        - CUSTOMER_NO_RESPONSE
        - APPLICATION_WAITING
        - APPLICATION_REJECTED
        - OFFER_PENDING
        - PAYMENT_OVERDUE
        - SUPPORT_TICKET_ESCALATION
        """
        details = details or {}
        doc_type = details.get("document_type", "Required verification document")

        if event_type == "MISSING_DOCUMENT":
            return cls.create_automated_task(
                db=db,
                title=f"Collect Missing Document: {doc_type}",
                description=f"Borrower document '{doc_type}' is missing or rejected for application {application_id or customer_id}. Contact customer to collect re-upload.",
                customer_id=customer_id,
                application_id=application_id,
                assigned_user=assigned_user,
                role_target="SALES_OFFICER",
                priority="HIGH",
                due_hours=24
            )

        elif event_type == "CUSTOMER_NO_RESPONSE":
            return cls.create_automated_task(
                db=db,
                title=f"Follow-up: Unresponsive Customer ({customer_id})",
                description=f"Customer has not responded to previous inquiries. Call or message via WhatsApp/SMS to re-engage.",
                customer_id=customer_id,
                application_id=application_id,
                assigned_user=assigned_user,
                role_target="RELATIONSHIP_MANAGER",
                priority="MEDIUM",
                due_hours=48
            )

        elif event_type == "APPLICATION_WAITING":
            return cls.create_automated_task(
                db=db,
                title=f"Expedite Application: {application_id}",
                description=f"Application {application_id} has been waiting in review queue. Follow up with underwriting desk.",
                customer_id=customer_id,
                application_id=application_id,
                assigned_user=assigned_user,
                role_target="SALES_OFFICER",
                priority="HIGH",
                due_hours=24
            )

        elif event_type == "APPLICATION_REJECTED":
            reason = details.get("reason", "Credit underwriting threshold")
            return cls.create_automated_task(
                db=db,
                title=f"Adverse Action Counseling: {customer_id}",
                description=f"Application {application_id} was rejected due to: {reason}. Reach out to customer with explanation and recommend credit builder remedies.",
                customer_id=customer_id,
                application_id=application_id,
                assigned_user=assigned_user,
                role_target="SALES_OFFICER",
                priority="MEDIUM",
                due_hours=72
            )

        elif event_type == "OFFER_PENDING":
            amount = details.get("amount", "")
            return cls.create_automated_task(
                db=db,
                title=f"Sanction Offer Acceptance: {application_id}",
                description=f"Loan sanction letter issued for ₹{amount}. Contact borrower to assist with digital loan agreement signing and e-NACH mandate.",
                customer_id=customer_id,
                application_id=application_id,
                assigned_user=assigned_user,
                role_target="SALES_OFFICER",
                priority="URGENT",
                due_hours=24
            )

        elif event_type == "PAYMENT_OVERDUE":
            overdue_amt = details.get("amount", "Overdue EMI")
            return cls.create_automated_task(
                db=db,
                title=f"Overdue Recovery Action: {customer_id}",
                description=f"Customer loan payment of ₹{overdue_amt} is overdue. Immediate contact required to avoid credit bureau penalty reporting.",
                customer_id=customer_id,
                application_id=application_id,
                assigned_user=assigned_user,
                role_target="RELATIONSHIP_MANAGER",
                priority="URGENT",
                due_hours=12
            )

        elif event_type == "SUPPORT_TICKET_ESCALATION":
            subject = details.get("subject", "High priority customer ticket")
            return cls.create_automated_task(
                db=db,
                title=f"Support Escalation: {subject}",
                description=f"Customer raised priority ticket: '{subject}'. Resolve within SLA window.",
                customer_id=customer_id,
                application_id=application_id,
                assigned_user=assigned_user,
                role_target="RELATIONSHIP_MANAGER",
                priority="HIGH",
                due_hours=24
            )
        return None
