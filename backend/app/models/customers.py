from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "CUST-NBFC-10294"
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), index=True)
    phone_hash = Column(String(64), index=True)
    address_hash = Column(String(64), index=True)
    age = Column(Integer)
    gender = Column(String(20))
    occupation = Column(String(100))
    employment_type = Column(String(50))  # Salaried, Self-Employed, MSME Owner, Gig Worker
    income = Column(Float)  # Monthly income in INR
    location = Column(String(100))  # Region / City
    state = Column(String(50))
    credit_score = Column(Integer, index=True)  # CIBIL / Experian scale: 300 - 900
    existing_loans = Column(Integer, default=0)
    credit_utilization = Column(Float, default=0.0)  # Percentage (0.0 to 1.0)
    bank_balance = Column(Float, default=0.0)
    income_stability = Column(Float, default=0.5)  # 0.0 to 1.0
    previous_defaults = Column(Integer, default=0)
    risk_tier = Column(String(20), default="Moderate", index=True)  # Low, Moderate, High, Critical
    assigned_officer = Column(String(100), nullable=True, index=True)  # Sales Officer
    relationship_manager = Column(String(100), nullable=True, index=True)  # Relationship Manager
    relationship_notes_json = Column(Text, default="[]")
    kyc_status = Column(String(50), default="NOT_STARTED", index=True)  # NOT_STARTED, DOCUMENTS_PENDING, UNDER_REVIEW, ADDITIONAL_INFORMATION_REQUIRED, VERIFIED, REJECTED
    kyc_verified_at = Column(DateTime, nullable=True)
    kyc_verified_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = relationship("CustomerProfile", back_populates="customer", uselist=False)
    loans = relationship("Loan", back_populates="customer")
    applications = relationship("LoanApplication", back_populates="customer")
    transactions = relationship("Transaction", back_populates="customer")
    assessments = relationship("CreditAssessment", back_populates="customer")
    fraud_alerts = relationship("FraudAlert", back_populates="customer")
    collection_records = relationship("CollectionRecord", back_populates="customer")

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True, nullable=False)
    financial_health_score = Column(Float, default=75.0)  # 0 to 100
    churn_risk = Column(Float, default=0.05)  # 0.0 to 1.0 (e.g., 5% = 0.05)
    segment = Column(String(50), default="Standard")  # Prime, Near-Prime, Subprime, MSME, Micro-Enterprise
    behavioral_score = Column(Float, default=70.0)
    avg_monthly_spend = Column(Float, default=0.0)
    savings_ratio = Column(Float, default=0.2)
    sentiment_score = Column(Float, default=0.8)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="profile")
