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
    collection_probability = Column(Float, default=0.85)  # 0.0 to 1.0 (alias for payment probability)
    payment_probability = Column(Float, default=0.85)    # 0.0 to 1.0
    recovery_probability = Column(Float, default=0.80)   # 0.0 to 1.0
    recommended_strategy = Column(String(150))
    priority = Column(String(20), default="Medium", index=True)  # Low, Medium, High, Critical
    collection_attempts = Column(Integer, default=0)
    workflow_stage = Column(String(50), default="OVERDUE", index=True)  # CURRENT, PAYMENT DUE, OVERDUE, COLLECTION_ASSIGNED, CONTACTED, PROMISE_TO_PAY, PAYMENT_RECEIVED, RESOLVED, ESCALATED
    assigned_officer = Column(String(100), nullable=True, index=True)
    last_contact_date = Column(DateTime, nullable=True)
    last_contact_channel = Column(String(50), nullable=True)
    next_action = Column(String(150), nullable=True)
    followup_date = Column(DateTime, nullable=True)
    promise_amount = Column(Float, nullable=True)
    promise_date = Column(DateTime, nullable=True)
    promise_status = Column(String(50), nullable=True)  # PENDING, KEPT, BROKEN, CANCELLED
    is_escalated = Column(Boolean, default=False, index=True)
    escalation_reason = Column(Text, nullable=True)
    status = Column(String(30), default="Pending", index=True)  # Pending, In_Progress, Recovered, Escalated, Write_Off
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="collection_records")
    loan = relationship("Loan", back_populates="collection_records")

class CollectionActivity(Base):
    __tablename__ = "collection_activities"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(String(50), unique=True, index=True, nullable=False)
    collection_id = Column(String(50), index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False, index=True)
    officer_name = Column(String(100), nullable=False)
    activity_type = Column(String(50), nullable=False, index=True)  # CALL, MESSAGE, NOTE, PROMISE, PAYMENT, FOLLOW_UP, ESCALATE, REASSIGN
    channel = Column(String(50), default="PHONE")  # CALL, SMS, EMAIL, IN_APP, IN_PERSON
    notes = Column(Text, nullable=False)
    is_customer_visible = Column(Boolean, default=False)  # Internal staff notes NOT visible to borrower
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class PromiseToPay(Base):
    __tablename__ = "promises_to_pay"

    id = Column(Integer, primary_key=True, index=True)
    promise_id = Column(String(50), unique=True, index=True, nullable=False)
    collection_id = Column(String(50), index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    promise_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="PENDING", index=True)  # PENDING, KEPT, BROKEN, CANCELLED
    recorded_by = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)

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
