from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base

class CreditAssessment(Base):
    __tablename__ = "credit_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=True, index=True)
    risk_score = Column(Float, nullable=False)  # 0 to 100
    default_probability = Column(Float, nullable=False)  # e.g., 0.024
    dti_ratio = Column(Float, nullable=False)  # Debt to Income ratio (e.g., 0.38)
    factors_json = Column(Text, nullable=True)  # Top contributing risk/credit factors
    recommendation = Column(String(50), default="Approve")  # Approve, Review, Reject, Conditional
    status = Column(String(30), default="Completed")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    customer = relationship("Customer", back_populates="assessments")
    loan = relationship("Loan", back_populates="credit_assessments")

class FraudAlert(Base):
    __tablename__ = "fraud_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"), nullable=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=True, index=True)
    alert_type = Column(String(100), nullable=False, index=True)  # Device Fingerprint Collision, Velocity Anomaly, Identity Mismatch
    severity = Column(String(20), default="High", index=True)  # Low, Medium, High, Critical
    risk_score = Column(Float, default=85.0)
    rule_triggered = Column(String(200), nullable=False)
    status = Column(String(30), default="Active", index=True)  # Active, Under_Investigation, Resolved, Dismissed
    exposure_amount = Column(Float, default=0.0)  # INR exposure
    details_json = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    customer = relationship("Customer", back_populates="fraud_alerts")
    application = relationship("LoanApplication", back_populates="fraud_alerts")
    loan = relationship("Loan", back_populates="fraud_alerts")

class CollectionRecord(Base):
    __tablename__ = "collection_records"
    
    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(String(50), unique=True, index=True, nullable=False)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    overdue_amount = Column(Float, nullable=False)
    dpd = Column(Integer, default=0, index=True)
    collection_risk_score = Column(Float, default=65.0)  # 0 to 100
    collection_probability = Column(Float, default=0.85)  # 0.0 to 1.0
    recommended_strategy = Column(String(100))  # Automated SMS/WhatsApp, Digital Voice Bot, Field Visit, Restructuring
    priority = Column(String(20), default="Medium", index=True)  # Low, Medium, High, Critical
    collection_attempts = Column(Integer, default=0)
    promised_date = Column(DateTime, nullable=True)
    status = Column(String(30), default="Pending", index=True)  # Pending, In_Progress, Recovered, Escalated, Write_Off
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="collection_records")
    loan = relationship("Loan", back_populates="collection_records")

class RiskSignal(Base):
    __tablename__ = "risk_signals"
    
    id = Column(Integer, primary_key=True, index=True)
    signal_id = Column(String(50), unique=True, index=True, nullable=False)
    signal_type = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), default="Medium", index=True)  # Low, Medium, High, Critical
    category = Column(String(50), default="Portfolio")  # Regional, Segment, Product, Market, Macro
    region = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    metric_impact = Column(String(100), nullable=True)
    responsible_agent = Column(String(50), default="Risk Intelligence", index=True)
    status = Column(String(30), default="Active", index=True)
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)
