import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base

class LoanProduct(Base):
    __tablename__ = "loan_products"

    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # MSME, Personal, Commercial Vehicle, Gold, Microfinance
    min_amount = Column(Float, nullable=False)
    max_amount = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)  # Annual rate in % (e.g., 12.5)
    min_tenure = Column(Integer, nullable=False)   # in months
    max_tenure = Column(Integer, nullable=False)   # in months
    processing_fee_pct = Column(Float, default=1.5)
    eligibility_criteria = Column(Text, default="{}")
    required_documents = Column(Text, default='["PAN_CARD", "AADHAAR", "BANK_STATEMENT"]')
    approval_threshold = Column(Float, default=500000.0)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(100), nullable=True)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"), nullable=True, index=True)
    doc_type = Column(String(50), nullable=False)  # PAN_CARD, AADHAAR, BANK_STATEMENT, SALARY_SLIP, ITR
    document_type = Column(String(50), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_size_kb = Column(Integer, default=256)
    status = Column(String(30), default="UPLOADED", index=True)  # UPLOADED, UNDER_REVIEW, VERIFIED, REJECTED, REPLACEMENT_REQUIRED
    verification_status = Column(String(30), nullable=True)
    verified_by = Column(String(100), nullable=True)
    verification_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    replacement_reason = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    subject = Column(String(200), nullable=False)
    category = Column(String(50), default="GENERAL")  # LOAN_STATUS, DISBURSEMENT, EMI_PAYMENT, GRIEVANCE, GENERAL
    priority = Column(String(20), default="MEDIUM")   # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(30), default="OPEN", index=True)  # OPEN, IN_PROGRESS, WAITING_CUSTOMER, ESCALATED, RESOLVED, CLOSED
    assigned_to = Column(String(100), nullable=True)
    assigned_officer = Column(String(100), nullable=True)
    escalated_to = Column(String(100), nullable=True)
    escalation_reason = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    messages_json = Column(Text, default="[]")
    activity_history_json = Column(Text, default="[]")
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), index=True)
    phone = Column(String(20), index=True)
    product_type = Column(String(50), default="MSME Business Loan")
    requested_amount = Column(Float, default=500000.0)
    annual_income = Column(Float, default=750000.0)
    city = Column(String(100), default="Mumbai")
    status = Column(String(30), default="NEW", index=True)  # NEW, CONTACTED, QUALIFIED, CONVERTED, DROPPED
    assigned_to = Column(String(100), default="Relationship Desk")
    assigned_officer = Column(String(100), nullable=True, index=True)
    follow_up_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    notes_history_json = Column(Text, default="[]")
    converted_customer_id = Column(String(50), nullable=True)
    converted_application_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WorkTask(Base):
    __tablename__ = "work_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    customer_id = Column(String(50), nullable=True, index=True)
    application_id = Column(String(50), nullable=True, index=True)
    role_target = Column(String(50), index=True, nullable=True)
    assigned_to = Column(String(100), nullable=True, index=True)  # Assigned user
    priority = Column(String(20), default="MEDIUM", index=True)   # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(30), default="TODO", index=True)       # TODO, IN_PROGRESS, WAITING, COMPLETED, CANCELLED
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    related_entity_type = Column(String(50), nullable=True)       # LOAN, APPLICATION, CUSTOMER, TRANSACTION
    related_entity_id = Column(String(50), nullable=True)
    comments_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ApprovalRule(Base):
    __tablename__ = "approval_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(50), unique=True, index=True, nullable=False)
    tier_name = Column(String(100), nullable=False)
    min_amount = Column(Float, nullable=False)
    max_amount = Column(Float, nullable=False)
    required_role = Column(String(50), nullable=False)
    min_cibil_score = Column(Integer, default=650)
    max_dti_pct = Column(Float, default=55.0)
    escalation_role = Column(String(50), default="RISK_MANAGER")
    requires_dual_approval = Column(Boolean, default=False)
    secondary_role = Column(String(50), nullable=True)
    workflow_name = Column(String(100), default="Standard Credit & Risk Workflow")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(100), nullable=True)

class CreditDecisionHistory(Base):
    __tablename__ = "credit_decision_history"

    id = Column(Integer, primary_key=True, index=True)
    history_id = Column(String(50), unique=True, index=True, nullable=False)
    application_id = Column(String(50), nullable=False, index=True)
    customer_id = Column(String(50), nullable=True, index=True)
    analyst = Column(String(100), nullable=True)
    manager = Column(String(100), nullable=True)
    recommendation = Column(String(50), nullable=True)  # APPROVE_FOR_MANAGER, REQUEST_INFORMATION, ESCALATE, RECOMMEND_REJECTION
    final_decision = Column(String(50), nullable=False) # APPROVED, REJECTED, RETURNED_TO_ANALYST, INFO_REQUESTED
    decision_reason = Column(Text, nullable=True)
    ai_score = Column(Float, nullable=True)
    ai_recommendation = Column(String(50), nullable=True)
    override_reason = Column(Text, nullable=True)
    supporting_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class CustomerCommunication(Base):
    __tablename__ = "customer_communications"

    id = Column(Integer, primary_key=True, index=True)
    comm_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(String(50), nullable=False, index=True)
    application_id = Column(String(50), nullable=True, index=True)
    sender = Column(String(100), nullable=False)
    sender_role = Column(String(50), nullable=True)
    recipient = Column(String(100), nullable=True)
    comm_type = Column(String(50), default="IN_APP_MESSAGE")  # IN_APP_MESSAGE, INTERNAL_NOTE, CUSTOMER_MESSAGE
    channel = Column(String(50), default="IN_APP")
    is_simulated = Column(Boolean, default=False)
    is_customer_visible = Column(Boolean, default=True)
    is_read = Column(Boolean, default=False)
    subject = Column(String(200), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class KycCase(Base):
    __tablename__ = "kyc_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"), nullable=True, index=True)
    status = Column(String(50), default="UNDER_REVIEW", index=True)  # NOT_STARTED, DOCUMENTS_PENDING, UNDER_REVIEW, ADDITIONAL_INFORMATION_REQUIRED, VERIFIED, REJECTED
    assigned_officer = Column(String(100), nullable=True, index=True)
    risk_level = Column(String(20), default="LOW", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    document_status = Column(String(50), default="PENDING")
    verification_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    replacement_reason = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", foreign_keys=[customer_id])
    application = relationship("LoanApplication", foreign_keys=[application_id])

class FraudCase(Base):
    __tablename__ = "fraud_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"), nullable=True, index=True)
    risk_score = Column(Float, default=45.0)
    severity = Column(String(20), default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    fraud_indicators_json = Column(Text, default="[]")
    assigned_officer = Column(String(100), nullable=True, index=True)
    status = Column(String(50), default="NEW", index=True)  # NEW, UNDER_INVESTIGATION, ADDITIONAL_INFORMATION_REQUIRED, CLEARED, CONFIRMED_FRAUD, ESCALATED, CLOSED
    investigation_notes = Column(Text, nullable=True)
    decision_reason = Column(Text, nullable=True)
    model_explanation = Column(Text, nullable=True)
    recommended_action = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", foreign_keys=[customer_id])
    application = relationship("LoanApplication", foreign_keys=[application_id])

class RiskDecisionHistory(Base):
    __tablename__ = "risk_decision_history"

    id = Column(Integer, primary_key=True, index=True)
    history_id = Column(String(50), unique=True, index=True, nullable=False)
    application_id = Column(String(50), nullable=False, index=True)
    customer_id = Column(String(50), nullable=True, index=True)
    analyst = Column(String(100), nullable=True)
    manager = Column(String(100), nullable=True)
    risk_score = Column(Float, nullable=True)
    risk_category = Column(String(50), nullable=True)  # LOW, MODERATE, ELEVATED, CRITICAL
    credit_risk = Column(Float, nullable=True)
    fraud_risk = Column(Float, nullable=True)
    customer_risk = Column(Float, nullable=True)
    lti_ratio = Column(Float, nullable=True)
    dti_ratio = Column(Float, nullable=True)
    exposure_amount = Column(Float, nullable=True)
    recommendation = Column(String(50), nullable=True)  # APPROVE_RISK, REQUEST_INFORMATION, ESCALATE, RECOMMEND_REJECTION
    final_decision = Column(String(50), nullable=False)  # APPROVED, REJECTED, RETURN_TO_ANALYST, INFO_REQUESTED
    decision_reason = Column(Text, nullable=True)
    override_reason = Column(Text, nullable=True)
    supporting_notes = Column(Text, nullable=True)
    ai_recommendation = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
