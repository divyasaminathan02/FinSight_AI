from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Loan(Base):
    __tablename__ = "loans"
    
    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "LN-2026-88192"
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    product_type = Column(String(50), index=True)  # Vehicle Loan, MSME Business Loan, Personal Loan, Gold Loan, Micro-finance
    loan_amount = Column(Float, nullable=False)  # Principal amount in INR
    interest_rate = Column(Float, nullable=False)  # Annual percentage (e.g., 14.5%)
    loan_tenure = Column(Integer, nullable=False)  # Tenure in months (e.g., 24, 36, 60)
    emi = Column(Float, nullable=False)  # Equated Monthly Installment
    outstanding_balance = Column(Float, nullable=False)
    dpd = Column(Integer, default=0, index=True)  # Days Past Due: 0, 1-30, 31-60, 61-90, 90+
    status = Column(String(30), default="Active", index=True)  # Active, Closed, Delinquent, Defaulted, NPA, Restructured
    disbursed_date = Column(DateTime, default=datetime.utcnow)
    maturity_date = Column(DateTime, nullable=True)
    previous_defaults = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="loans")
    repayments = relationship("Repayment", back_populates="loan")
    transactions = relationship("Transaction", back_populates="loan")
    credit_assessments = relationship("CreditAssessment", back_populates="loan")
    fraud_alerts = relationship("FraudAlert", back_populates="loan")
    collection_records = relationship("CollectionRecord", back_populates="loan")

class LoanApplication(Base):
    __tablename__ = "loan_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    product_type = Column(String(50), nullable=False)
    requested_amount = Column(Float, nullable=False)
    requested_tenure = Column(Integer, nullable=False)
    purpose = Column(String(100))
    status = Column(String(30), default="Under_Review", index=True)  # Approved, Rejected, Under_Review, Flagged_Fraud
    device_id = Column(String(64), index=True)
    phone_hash = Column(String(64), index=True)
    address_hash = Column(String(64), index=True)
    application_velocity = Column(Integer, default=1)  # Number of applications submitted in 7 days
    risk_score = Column(Float, default=50.0)  # Calculated AI risk score
    default_probability = Column(Float, default=0.03)
    approved_amount = Column(Float, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    disbursed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    customer = relationship("Customer", back_populates="applications")
    fraud_alerts = relationship("FraudAlert", back_populates="application")
