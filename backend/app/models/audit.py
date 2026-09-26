"""
FinSight AI - Multi-Agent Decision Audit Model
Records auditable records of all multi-agent loan evaluations, outputs, model versions, and policy rules.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index
from app.database import Base

class LoanDecisionAudit(Base):
    __tablename__ = "loan_decision_audits"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(String(50), unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(String(50), default="Arjun Mehta (Risk Manager)")
    customer_id = Column(String(50), nullable=True, index=True)
    application_id = Column(String(50), nullable=True, index=True)
    loan_amount = Column(Float, nullable=False)
    tenure = Column(Integer, nullable=False)
    purpose = Column(String(100), default="Personal")
    
    # Final verdict
    decision = Column(String(30), nullable=False, index=True)  # APPROVE, REVIEW REQUIRED, REJECT
    reasons_json = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    policy_version = Column(String(50), default="FINSIGHT-POL-2026.1")

    # Snapshot of domain agent numerical outputs & explanations
    credit_output_json = Column(Text, nullable=True)
    fraud_output_json = Column(Text, nullable=True)
    customer_output_json = Column(Text, nullable=True)
    collections_output_json = Column(Text, nullable=True)
    risk_output_json = Column(Text, nullable=True)
    liquidity_output_json = Column(Text, nullable=True)
    shap_explanation_json = Column(Text, nullable=True)
    model_versions_json = Column(Text, nullable=True)
    execution_time_ms = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
