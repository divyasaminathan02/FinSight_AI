from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Index
from app.database import Base

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="Info", index=True)  # Low, Medium, High, Critical, Info
    category = Column(String(50), default="Agent Alert", index=True)  # Credit, Fraud, Collections, Liquidity, Risk, System
    responsible_agent = Column(String(50), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
