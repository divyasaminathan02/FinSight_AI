"""
FinSight AI - LangGraph Multi-Agent Orchestration Workflow
Orchestrates Credit -> Fraud -> Customer -> Collections -> Risk -> Decision Engine -> Explainability -> Audit
Strictly maintains the separation of ML signals, policy rules, and LLM explanation.
"""

import time
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END

from app.agents.credit_agent import credit_agent
from app.agents.fraud_agent import fraud_agent
from app.agents.customer_agent import customer_agent
from app.agents.collections_agent import collections_agent
from app.agents.risk_agent import risk_agent
from app.agents.liquidity_agent import liquidity_agent
from app.decision_engine.engine import decision_engine
from app.rag.knowledge_base import knowledge_base
from app.database import SessionLocal
from app.models.audit import LoanDecisionAudit

class WorkflowState(TypedDict):
    application: Dict[str, Any]
    customer_id: Optional[str]
    credit_result: Optional[Dict[str, Any]]
    fraud_result: Optional[Dict[str, Any]]
    customer_result: Optional[Dict[str, Any]]
    collections_result: Optional[Dict[str, Any]]
    liquidity_result: Optional[Dict[str, Any]]
    risk_result: Optional[Dict[str, Any]]
    decision: Optional[Dict[str, Any]]
    reasons: List[str]
    risk_factors: List[str]
    positive_factors: List[str]
    warnings: List[str]
    policy_context: List[Dict[str, Any]]
    audit_metadata: Dict[str, Any]
    agent_statuses: Dict[str, str]
    shap_explanation: Optional[Dict[str, Any]]
    recommended_action: Optional[str]
    explanation: Optional[str]

# ----------------- NODE DEFINITIONS -----------------

def credit_node(state: WorkflowState) -> Dict[str, Any]:
    """Execute Credit Intelligence Agent: XGBoost + TreeSHAP."""
    app = state["application"]
    statuses = dict(state.get("agent_statuses", {}))
    try:
        credit_eval = credit_agent.evaluate(app)
        statuses["credit"] = "Completed"
        shap = credit_eval.get("shap_explanations")
        return {
            "credit_result": credit_eval,
            "shap_explanation": shap,
            "agent_statuses": statuses,
        }
    except Exception as e:
        statuses["credit"] = f"Warning: {str(e)}"
        return {
            "credit_result": {
                "probability_of_default": 0.08,
                "credit_risk_score": 700,
                "risk_category": "Moderate",
                "debt_to_income": float(app.get("debt_to_income", 0.35)),
            },
            "agent_statuses": statuses,
        }

def fraud_node(state: WorkflowState) -> Dict[str, Any]:
    """Execute Fraud Intelligence Agent: Isolation Forest + NetworkX collision graph."""
    app = state["application"]
    statuses = dict(state.get("agent_statuses", {}))
    try:
        fraud_eval = fraud_agent.analyze_application(app)
        statuses["fraud"] = "Completed"
        return {
            "fraud_result": fraud_eval,
            "agent_statuses": statuses,
        }
    except Exception as e:
        statuses["fraud"] = f"Warning: {str(e)}"
        return {
            "fraud_result": {
                "fraud_probability": 0.04,
                "fraud_risk": "LOW",
                "risk_signals": [],
                "related_entities": [],
            },
            "agent_statuses": statuses,
        }

def customer_node(state: WorkflowState) -> Dict[str, Any]:
    """Execute Customer Intelligence Agent: Customer 360, K-Means cluster, churn risk."""
    app = state["application"]
    cust_id = state.get("customer_id") or app.get("customer_id", "CUST-00001")
    statuses = dict(state.get("agent_statuses", {}))
    try:
        cust_profile = customer_agent.get_customer_360(cust_id)
        statuses["customer"] = "Completed"
        return {
            "customer_result": cust_profile,
            "agent_statuses": statuses,
        }
    except Exception as e:
        statuses["customer"] = f"Warning: {str(e)}"
        return {
            "customer_result": {
                "financial_health_score": 70.0,
                "customer_segment": "Balanced Salaried",
                "financial_stress": {"stress_score": 25.0, "stress_level": "Low"},
                "churn_risk": {"churn_probability": 0.05, "churn_risk_level": "Low"},
            },
            "agent_statuses": statuses,
        }

def collections_node(state: WorkflowState) -> Dict[str, Any]:
    """Execute Collections Intelligence Agent: Payment probability and ethical recovery."""
    app = state["application"]
    cust_id = state.get("customer_id") or app.get("customer_id", "CUST-00001")
    statuses = dict(state.get("agent_statuses", {}))
    try:
        coll_data = collections_agent.get_customer_collections(cust_id)
        statuses["collections"] = "Completed"
        return {
            "collections_result": coll_data,
            "agent_statuses": statuses,
        }
    except Exception as e:
        statuses["collections"] = f"Warning: {str(e)}"
        return {
            "collections_result": {
                "collection_priority": "LOW",
                "payment_probability_7d": 0.92,
                "recovery_probability": 0.95,
                "overdue_records": 0,
            },
            "agent_statuses": statuses,
        }

def liquidity_node(state: WorkflowState) -> Dict[str, Any]:
    """Execute Liquidity Intelligence Agent: Institutional cash buffer and ALM gaps."""
    statuses = dict(state.get("agent_statuses", {}))
    try:
        liq_data = liquidity_agent.get_forecast(days=30)
        statuses["liquidity"] = "Completed"
        return {
            "liquidity_result": liq_data,
            "agent_statuses": statuses,
        }
    except Exception as e:
        statuses["liquidity"] = f"Warning: {str(e)}"
        return {
            "liquidity_result": {
                "current_liquidity_cr": 126.4,
                "potential_gap_cr": 0.0,
                "liquidity_buffer_ratio": 1.45,
            },
            "agent_statuses": statuses,
        }

def risk_node(state: WorkflowState) -> Dict[str, Any]:
    """Execute Risk Intelligence Agent: Portfolio composite score and concentration limits."""
    statuses = dict(state.get("agent_statuses", {}))
    try:
        risk_data = risk_agent.get_portfolio_risk()
        statuses["risk"] = "Completed"
        return {
            "risk_result": risk_data,
            "agent_statuses": statuses,
        }
    except Exception as e:
        statuses["risk"] = f"Warning: {str(e)}"
        return {
            "risk_result": {
                "portfolio_risk_score": 42.5,
                "risk_category": "Moderate",
                "concentration": {"geographic_hhi": 0.14, "product_hhi": 0.22},
            },
            "agent_statuses": statuses,
        }

def decision_node(state: WorkflowState) -> Dict[str, Any]:
    """Execute Decision Engine: Applies deterministic business rules to agent signals."""
    statuses = dict(state.get("agent_statuses", {}))
    dec = decision_engine.evaluate(
        application=state["application"],
        credit_result=state.get("credit_result"),
        fraud_result=state.get("fraud_result"),
        customer_result=state.get("customer_result"),
        collections_result=state.get("collections_result"),
        risk_result=state.get("risk_result"),
        liquidity_result=state.get("liquidity_result"),
    )
    statuses["decision_engine"] = "Completed"
    return {
        "decision": dec,
        "reasons": dec.get("reasons", []),
        "risk_factors": dec.get("risk_factors", []),
        "positive_factors": dec.get("positive_factors", []),
        "warnings": dec.get("warnings", []),
        "recommended_action": dec.get("recommended_action"),
        "agent_statuses": statuses,
    }

def explainability_node(state: WorkflowState) -> Dict[str, Any]:
    """
    Synthesize explainability context: RAG policy citations + structured cross-agent rationale.
    LLM/rules synthesize explanation WITHOUT overriding the decision.
    """
    statuses = dict(state.get("agent_statuses", {}))
    decision_dict = state.get("decision", {})
    final_verdict = decision_dict.get("decision", "REVIEW REQUIRED")
    app = state["application"]
    amount = float(app.get("loan_amount", 500000))

    # Retrieve relevant policy from RAG
    query = f"Credit underwriting policy for {final_verdict} loan amount {amount} DTI guidelines"
    policy_chunks = knowledge_base.search(query, top_k=2)

    # Build clear financial synthesis
    c_res = state.get("credit_result", {})
    f_res = state.get("fraud_result", {})
    pd = c_res.get("probability_of_default", 0.05)
    f_risk = f_res.get("fraud_risk", "LOW")

    if final_verdict == "APPROVE":
        explanation = (
            f"The application of ₹{amount:,.0f} has been APPROVED based on strong credit credentials "
            f"(Estimated Default Probability: {pd:.1%}, Credit Score: {c_res.get('credit_risk_score', 740)}) "
            f"and clean fraud screening ({f_risk} risk). The borrower's debt-service capacity complies with the "
            f"underwriting criteria under {decision_dict.get('policy_version', 'FINSIGHT-POL-2026.1')}."
        )
    elif final_verdict == "REVIEW REQUIRED":
        reasons_str = "; ".join(decision_dict.get("reasons", ["Review required for enhanced verification."]))
        explanation = (
            f"The application has been flagged for SENIOR UNDERWRITER REVIEW. Reason: {reasons_str}. "
            f"While the applicant demonstrates active borrowing capacity, risk indicators necessitate "
            f"manual verification of income stability and address consistency prior to sanction."
        )
    else:  # REJECT
        reasons_str = "; ".join(decision_dict.get("reasons", ["Exceeds permissible risk appetite."]))
        explanation = (
            f"The application has been DECLINED. Primary factor: {reasons_str}. "
            f"The financial risk signals exceed the tolerance ceiling established by institutional policy."
        )

    statuses["explainability"] = "Completed"
    return {
        "policy_context": policy_chunks,
        "explanation": explanation,
        "agent_statuses": statuses,
    }

def audit_node(state: WorkflowState) -> Dict[str, Any]:
    """Persist decision audit trail into the database."""
    statuses = dict(state.get("agent_statuses", {}))
    audit_meta = dict(state.get("audit_metadata", {}))
    audit_id = audit_meta.get("audit_id", f"AUD-{uuid.uuid4().hex[:10].upper()}")
    audit_meta["audit_id"] = audit_id

    app = state["application"]
    dec = state.get("decision", {})

    db = SessionLocal()
    try:
        audit_record = LoanDecisionAudit(
            audit_id=audit_id,
            timestamp=datetime.utcnow(),
            user_id=audit_meta.get("user_id", "Arjun Mehta (Risk Manager)"),
            customer_id=state.get("customer_id") or app.get("customer_id"),
            application_id=app.get("application_id", f"APP-{uuid.uuid4().hex[:8].upper()}"),
            loan_amount=float(app.get("loan_amount", 500000)),
            tenure=int(app.get("tenure", 36)),
            purpose=str(app.get("loan_purpose", app.get("purpose", "Personal"))),
            decision=dec.get("decision", "REVIEW REQUIRED"),
            reasons_json=json.dumps(dec.get("reasons", [])),
            recommended_action=dec.get("recommended_action", ""),
            policy_version=dec.get("policy_version", "FINSIGHT-POL-2026.1"),
            credit_output_json=json.dumps(state.get("credit_result")),
            fraud_output_json=json.dumps(state.get("fraud_result")),
            customer_output_json=json.dumps(state.get("customer_result")),
            collections_output_json=json.dumps(state.get("collections_result")),
            risk_output_json=json.dumps(state.get("risk_result")),
            liquidity_output_json=json.dumps(state.get("liquidity_result")),
            shap_explanation_json=json.dumps(state.get("shap_explanation")),
            model_versions_json=json.dumps({
                "credit_model": "xgboost_v1.0",
                "fraud_model": "isolation_forest_v1.0",
                "customer_model": "kmeans_churn_v1.0",
                "collections_model": "multihead_xgb_v1.0",
                "risk_model": "composite_hhi_v1.0",
                "liquidity_model": "alm_regressor_v1.0",
            }),
            execution_time_ms=audit_meta.get("execution_time_ms", 0.0),
        )
        db.add(audit_record)
        db.commit()
        statuses["audit"] = "Completed"
    except Exception as e:
        db.rollback()
        statuses["audit"] = f"Warning: {str(e)}"
    finally:
        db.close()

    return {
        "audit_metadata": audit_meta,
        "agent_statuses": statuses,
    }

# ----------------- GRAPH COMPILATION -----------------

def build_workflow() -> Any:
    workflow = StateGraph(WorkflowState)

    # Add Nodes
    workflow.add_node("credit", credit_node)
    workflow.add_node("fraud", fraud_node)
    workflow.add_node("customer", customer_node)
    workflow.add_node("collections", collections_node)
    workflow.add_node("liquidity", liquidity_node)
    workflow.add_node("risk", risk_node)
    workflow.add_node("decision_engine", decision_node)
    workflow.add_node("explainability", explainability_node)
    workflow.add_node("audit", audit_node)

    # Linear coordinated workflow with institutional liquidity feed
    workflow.add_edge(START, "credit")
    workflow.add_edge("credit", "fraud")
    workflow.add_edge("fraud", "customer")
    workflow.add_edge("customer", "collections")
    workflow.add_edge("collections", "liquidity")
    workflow.add_edge("liquidity", "risk")
    workflow.add_edge("risk", "decision_engine")
    workflow.add_edge("decision_engine", "explainability")
    workflow.add_edge("explainability", "audit")
    workflow.add_edge("audit", END)

    return workflow.compile()

# Global compiled LangGraph app
loan_orchestrator = build_workflow()

def run_loan_orchestration(application_data: Dict[str, Any], user_id: str = "Arjun Mehta (Risk Manager)") -> Dict[str, Any]:
    """
    Entry point to run the complete multi-agent loan underwriting workflow.
    """
    t0 = time.time()
    audit_id = f"AUD-{uuid.uuid4().hex[:10].upper()}"
    cust_id = application_data.get("customer_id") or application_data.get("customer_identifier")

    initial_state: WorkflowState = {
        "application": application_data,
        "customer_id": cust_id,
        "credit_result": None,
        "fraud_result": None,
        "customer_result": None,
        "collections_result": None,
        "liquidity_result": None,
        "risk_result": None,
        "decision": None,
        "reasons": [],
        "risk_factors": [],
        "positive_factors": [],
        "warnings": [],
        "policy_context": [],
        "audit_metadata": {
            "audit_id": audit_id,
            "user_id": user_id,
            "started_at": datetime.utcnow().isoformat(),
        },
        "agent_statuses": {
            "credit": "Pending",
            "fraud": "Pending",
            "customer": "Pending",
            "collections": "Pending",
            "liquidity": "Pending",
            "risk": "Pending",
            "decision_engine": "Pending",
            "explainability": "Pending",
            "audit": "Pending",
        },
        "shap_explanation": None,
        "recommended_action": None,
        "explanation": None,
    }

    final_state = loan_orchestrator.invoke(initial_state)
    elapsed_ms = round((time.time() - t0) * 1000, 2)
    final_state["audit_metadata"]["execution_time_ms"] = elapsed_ms

    return final_state
