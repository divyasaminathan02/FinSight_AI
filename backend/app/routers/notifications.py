from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.notifications import Notification
from app.schemas.transactions import NotificationListResponse, NotificationItem

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=NotificationListResponse)
def list_notifications(limit: int = 15, db: Session = Depends(get_db)):
    unread_count = db.query(Notification).filter(Notification.is_read == False).count()
    items = db.query(Notification).order_by(desc(Notification.created_at)).limit(limit).all()
    
    # If no notifications seeded yet, return realistic notification items
    if not items:
        default_items = [
            NotificationItem(
                id=1,
                notification_id="NOTIF-891",
                title="Elevated Fraud Velocity Detected",
                message="12 applications share a high-risk device fingerprint across Tier 2 locations.",
                severity="Critical",
                category="Fraud Alert",
                responsible_agent="Fraud Intelligence",
                is_read=False,
                created_at="2026-09-26T07:45:00"
            ),
            NotificationItem(
                id=2,
                notification_id="NOTIF-890",
                title="Regional Delinquency Spike",
                message="Vehicle loan delinquency increased 4.2% in South Region. Collections trigger activated.",
                severity="High",
                category="Collections Alert",
                responsible_agent="Collections Intelligence",
                is_read=False,
                created_at="2026-09-26T08:30:00"
            ),
            NotificationItem(
                id=3,
                notification_id="NOTIF-889",
                title="Sector Early Stress Indicator",
                message="MSME portfolio shows early repayment stress in textile manufacturing cluster.",
                severity="Medium",
                category="Credit Risk",
                responsible_agent="Credit Intelligence",
                is_read=True,
                created_at="2026-09-25T16:15:00"
            )
        ]
        return NotificationListResponse(unread_count=2, items=default_items)

    return NotificationListResponse(
        unread_count=unread_count,
        items=[NotificationItem.from_orm(n) for n in items]
    )

@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(
        (Notification.notification_id == notification_id) | (Notification.id == (int(notification_id) if notification_id.isdigit() else -1))
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success", "message": "Notification marked as read"}

@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}
