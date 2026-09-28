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
    
    # Sales & Credit Workflow fields
    assigned_officer = Column(String(100), nullable=True, index=True)
    credit_analyst = Column(String(100), nullable=True, index=True)
    credit_manager = Column(String(100), nullable=True, index=True)
    analyst_recommendation = Column(String(50), nullable=True)  # APPROVE_FOR_MANAGER, REQUEST_INFORMATION, ESCALATE, RECOMMEND_REJECTION
    analyst_notes = Column(Text, nullable=True)
    analyst_submitted_at = Column(DateTime, nullable=True)
    manager_decision = Column(String(50), nullable=True)        # APPROVED, REJECTED, RETURN_TO_ANALYST, INFO_REQUESTED
    manager_decision_reason = Column(Text, nullable=True)
    override_reason = Column(Text, nullable=True)
    
    # AI ML Credit Agent Outputs
    ai_credit_score = Column(Float, nullable=True)
    ai_recommendation = Column(String(50), nullable=True)       # APPROVE, REVIEW, REJECT
    ai_pd = Column(Float, nullable=True)
    ai_dti = Column(Float, nullable=True)
    ai_affordability = Column(Float, nullable=True)
    ai_recommended_amount = Column(Float, nullable=True)
    ai_recommended_tenure = Column(Integer, nullable=True)
    ai_risk_category = Column(String(50), nullable=True)
    
    # Cross-Module Workflow Stages: SUBMITTED -> KYC_REVIEW -> FRAUD_REVIEW -> CREDIT_REVIEW -> RISK_REVIEW -> APPROVED
    workflow_stage = Column(String(50), default="SUBMITTED", index=True)
    kyc_status = Column(String(50), default="NOT_STARTED", index=True)     # NOT_STARTED, DOCUMENTS_PENDING, UNDER_REVIEW, ADDITIONAL_INFORMATION_REQUIRED, VERIFIED, REJECTED
    fraud_status = Column(String(50), default="PENDING", index=True)        # PENDING, UNDER_INVESTIGATION, CLEARED, CONFIRMED_FRAUD, ESCALATED
    risk_status = Column(String(50), default="PENDING", index=True)         # PENDING, UNDER_REVIEW, APPROVED, REJECTED, ESCALATED
    
    # Risk Analyst & Manager Fields
    risk_analyst = Column(String(100), nullable=True, index=True)
    risk_manager = Column(String(100), nullable=True, index=True)
    risk_recommendation = Column(String(50), nullable=True) # APPROVE_RISK, REQUEST_INFORMATION, ESCALATE, RECOMMEND_REJECTION
    risk_notes = Column(Text, nullable=True)
    risk_decision = Column(String(50), nullable=True)       # APPROVED, REJECTED, RETURN_TO_ANALYST, INFO_REQUESTED
    risk_decision_reason = Column(Text, nullable=True)
    risk_override_reason = Column(Text, nullable=True)
    
    # Operations & Disbursement Fields
    disbursement_status = Column(String(50), default="PENDING", index=True) # PENDING, READY_FOR_DISBURSEMENT, DISBURSED, FAILED
    operations_officer = Column(String(100), nullable=True, index=True)
    operations_notes = Column(Text, nullable=True)
    offer_accepted = Column(Boolean, default=False)
    offer_accepted_at = Column(DateTime, nullable=True)
    disbursement_date = Column(DateTime, nullable=True)
    net_disbursed_amount = Column(Float, nullable=True)
    processing_fee = Column(Float, nullable=True)
    bank_name = Column(String(100), nullable=True)
    bank_account_number = Column(String(100), nullable=True)
    bank_ifsc = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    customer = relationship("Customer", back_populates="applications")
    fraud_alerts = relationship("FraudAlert", back_populates="application")
