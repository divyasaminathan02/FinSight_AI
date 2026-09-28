from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Index
from app.database import Base

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default="NORMAL", index=True)  # LOW, NORMAL, HIGH, URGENT
    severity = Column(String(20), default="INFO", index=True)    # INFO, WARNING, CRITICAL
    category = Column(String(50), default="Agent Alert", index=True)  # Credit, Fraud, Collections, Liquidity, Risk, System
    responsible_agent = Column(String(50), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    status = Column(String(30), default="ACTIVE", index=True)    # ACTIVE, RESOLVED, DISMISSED
    event_key = Column(String(100), nullable=True, index=True)   # For event deduplication & state transitions
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(String(50), nullable=True)
    action_url = Column(String(255), nullable=True)
    recipient_email = Column(String(100), nullable=True, index=True)
    role_target = Column(String(50), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
