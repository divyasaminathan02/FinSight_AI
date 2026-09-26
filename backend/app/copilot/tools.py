"""
FinSight AI - Copilot Tool System
Exposes domain agent APIs as executable tools for the FinSight AI Copilot.
The LLM selects tools, and tool outputs become the authoritative factual source for answers.
"""

from typing import Dict, Any, List, Optional
from app.agents.credit_agent import credit_agent
from app.agents.fraud_agent import fraud_agent
from app.agents.customer_agent import customer_agent
from app.agents.collections_agent import collections_agent
from app.agents.risk_agent import risk_agent
from app.agents.liquidity_agent import liquidity_agent
from app.rag.knowledge_base import knowledge_base
from app.database import SessionLocal
from app.models.audit import LoanDecisionAudit
from app.models.assessments import FraudAlert, RiskSignal

def tool_get_portfolio_risk(weights: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    """Retrieve macro portfolio risk score, concentration HHI, and risk drivers."""
    try:
        return risk_agent.get_portfolio_risk(weights=weights)
    except Exception as e:
        return {"error": str(e), "portfolio_risk_score": 42.5, "risk_category": "Moderate"}

def tool_get_risk_alerts() -> List[Dict[str, Any]]:
    """Retrieve today's active risk signals and early warning indicators."""
    try:
        return risk_agent.get_signals()
    except Exception as e:
        return [{"error": str(e)}]

def tool_get_customer_360(customer_id: str) -> Dict[str, Any]:
    """Retrieve complete 360 profile, K-Means segment, churn risk, and financial stress."""
    try:
        return customer_agent.get_customer_360(customer_id)
    except Exception as e:
        return {"error": str(e), "customer_id": customer_id}

def tool_get_credit_assessment(application: Dict[str, Any]) -> Dict[str, Any]:
    """Execute Credit Intelligence underwriting and SHAP attribution on an application."""
    try:
        return credit_agent.evaluate(application)
    except Exception as e:
        return {"error": str(e)}

def tool_get_fraud_alerts(limit: int = 10) -> List[Dict[str, Any]]:
    """Retrieve active fraud syndicate alerts and device fingerprint collisions."""
    try:
        return fraud_agent.get_alerts(limit=limit)
    except Exception as e:
        return [{"error": str(e)}]

def tool_get_collection_priorities(limit: int = 10) -> Dict[str, Any]:
    """Retrieve prioritized recovery queues (HIGH, MEDIUM, LOW) and payment probabilities."""
    try:
        return collections_agent.get_priorities(limit=limit)
    except Exception as e:
        return {"error": str(e)}

def tool_get_liquidity_forecast(days: int = 30) -> Dict[str, Any]:
    """Retrieve institutional cash buffer, forecasted inflows/outflows, and ALM gap analysis."""
    try:
        return liquidity_agent.get_forecast(days=days)
    except Exception as e:
        return {"error": str(e), "current_liquidity_cr": 126.4, "potential_gap_cr": 0.0}

def tool_get_agent_status() -> Dict[str, Any]:
    """Retrieve operational status, MLflow version, and accuracy metrics for all 6 agents."""
    return {
        "credit_agent": credit_agent.get_model_info(),
        "fraud_agent": fraud_agent.get_model_info(),
        "customer_agent": customer_agent.get_model_info(),
        "collections_agent": collections_agent.get_model_info(),
        "risk_agent": risk_agent.get_model_info(),
        "liquidity_agent": liquidity_agent.get_model_info(),
    }

def tool_get_loan_decision(audit_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve latest or specific audited multi-agent loan underwriting decision."""
    db = SessionLocal()
    try:
        query = db.query(LoanDecisionAudit)
        if audit_id:
            record = query.filter(LoanDecisionAudit.audit_id == audit_id).first()
        else:
            record = query.order_by(LoanDecisionAudit.timestamp.desc()).first()
            
        if not record:
            return {"status": "No decision records found"}
            
        return {
            "audit_id": record.audit_id,
            "timestamp": record.timestamp.isoformat() if record.timestamp else None,
            "decision": record.decision,
            "customer_id": record.customer_id,
            "loan_amount": record.loan_amount,
            "tenure": record.tenure,
            "purpose": record.purpose,
            "recommended_action": record.recommended_action,
            "policy_version": record.policy_version,
        }
    finally:
        db.close()

def tool_search_policy_knowledge(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """Query RAG knowledge base for underwriting, collections, or risk policies."""
    return knowledge_base.search(query, top_k=top_k)

# Tool registry metadata for LLM function calling
COPILOT_TOOLS_METADATA = [
    {
        "name": "get_portfolio_risk",
        "description": "Get overall NBFC portfolio composite risk score, HHI concentration, and risk drivers.",
        "parameters": {"type": "object", "properties": {"weights": {"type": "object"}}, "required": []},
        "func": tool_get_portfolio_risk
    },
    {
        "name": "get_risk_alerts",
        "description": "Get today's major early warning risk signals and concentration alerts across regions.",
        "parameters": {"type": "object", "properties": {}, "required": []},
        "func": tool_get_risk_alerts
    },
    {
        "name": "get_customer_360",
        "description": "Get Customer 360 profile, financial health score, K-Means segment, and churn risk by customer ID.",
        "parameters": {"type": "object", "properties": {"customer_id": {"type": "string"}}, "required": ["customer_id"]},
        "func": tool_get_customer_360
    },
    {
        "name": "get_credit_assessment",
        "description": "Evaluate credit risk, probability of default, and SHAP explanations for an application.",
        "parameters": {"type": "object", "properties": {"application": {"type": "object"}}, "required": ["application"]},
        "func": tool_get_credit_assessment
    },
    {
        "name": "get_fraud_alerts",
        "description": "Get active fraud syndicate alerts, device fingerprint collisions, and velocity anomalies.",
        "parameters": {"type": "object", "properties": {"limit": {"type": "integer"}}, "required": []},
        "func": tool_get_fraud_alerts
    },
    {
        "name": "get_collection_priorities",
        "description": "Get delinquent borrower recovery queues, payment probabilities, and ethical channels.",
        "parameters": {"type": "object", "properties": {"limit": {"type": "integer"}}, "required": []},
        "func": tool_get_collection_priorities
    },
    {
        "name": "get_liquidity_forecast",
        "description": "Get institutional cash buffer, 7/30/90-day cash flow projections, and ALM gap analysis.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer"}}, "required": []},
        "func": tool_get_liquidity_forecast
    },
    {
        "name": "get_agent_status",
        "description": "Get operational status, MLflow versioning, and performance metrics for all 6 agents.",
        "parameters": {"type": "object", "properties": {}, "required": []},
        "func": tool_get_agent_status
    },
    {
        "name": "get_loan_decision",
        "description": "Get recent or specific loan underwriting decision reasons, risk factors, and actions.",
        "parameters": {"type": "object", "properties": {"audit_id": {"type": "string"}}, "required": []},
        "func": tool_get_loan_decision
    },
    {
        "name": "search_policy_knowledge",
        "description": "Search internal NBFC credit policies, collection practices, and regulatory guidelines.",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
        "func": tool_search_policy_knowledge
    },
]
