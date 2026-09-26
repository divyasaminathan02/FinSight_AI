from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base

class AgentRun(Base):
    __tablename__ = "agent_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(50), unique=True, index=True, nullable=False)
    agent_name = Column(String(50), index=True, nullable=False)  # Credit, Fraud, Customer, Collections, Risk, Liquidity
    status = Column(String(30), default="Completed", index=True)  # Running, Completed, Elevated, Warning, Error
    summary = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, default=120)
    entities_evaluated = Column(Integer, default=0)
    anomalies_detected = Column(Integer, default=0)
    metrics_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    decisions = relationship("AgentDecision", back_populates="agent_run")

class AgentDecision(Base):
    __tablename__ = "agent_decisions"
    
    id = Column(Integer, primary_key=True, index=True)
    decision_id = Column(String(50), unique=True, index=True, nullable=False)
    run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=True, index=True)
    agent_name = Column(String(50), index=True, nullable=False)
    entity_type = Column(String(50), nullable=False)  # Customer, Loan, Application, Transaction
    entity_id = Column(String(50), index=True, nullable=False)
    decision = Column(String(100), nullable=False)
    confidence = Column(Float, default=0.92)
    risk_score = Column(Float, nullable=True)
    explanation_json = Column(Text, nullable=True)
    coordinated_with = Column(String(200), nullable=True)  # Comma-separated or JSON list of downstream agents informed
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    agent_run = relationship("AgentRun", back_populates="decisions")
