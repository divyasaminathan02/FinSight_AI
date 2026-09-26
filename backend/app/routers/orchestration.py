"""
FinSight AI - Multi-Agent Orchestration Router
Provides endpoints to trigger the LangGraph coordinated loan decision workflow.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.orchestration.workflow import run_loan_orchestration

router = APIRouter(prefix="/orchestration", tags=["Multi-Agent Orchestration"])

class LoanAnalysisRequest(BaseModel):
    customer_id: Optional[str] = Field(default="CUST-00001", description="Borrower ID")
    loan_amount: float = Field(default=500000.0, ge=10000, description="Requested principal")
    tenure: int = Field(default=36, ge=6, le=84, description="Tenure in months")
    loan_purpose: str = Field(default="Personal", description="Purpose: Personal, Business, Auto, Home Improvement")
    income: Optional[float] = Field(default=None, description="Monthly in-hand income")
    credit_score: Optional[int] = Field(default=None, description="Bureau score if known")
    existing_loans: Optional[int] = Field(default=None, description="Existing active loans count")
    total_emi: Optional[float] = Field(default=None, description="Current monthly EMI obligations")
    bank_balance: Optional[float] = Field(default=None, description="Average bank balance")
    income_stability: Optional[float] = Field(default=None, description="Stability index 0-1")
    device_fingerprint: Optional[str] = Field(default=None, description="Applicant device hash")
    phone_number: Optional[str] = Field(default=None, description="Applicant phone number")

@router.post("/analyze-loan")
def analyze_loan_application(req: LoanAnalysisRequest, db: Session = Depends(get_db)):
    """
    Execute full LangGraph multi-agent decision workflow:
    Credit -> Fraud -> Customer -> Collections -> Liquidity -> Risk -> Decision Engine -> Explainability -> Audit.
    """
    try:
        app_dict = req.model_dump()
        result = run_loan_orchestration(app_dict, user_id="Arjun Mehta (Risk Manager)")
        
        return {
            "decision": result.get("decision"),
            "reasons": result.get("reasons", []),
            "risk_factors": result.get("risk_factors", []),
            "positive_factors": result.get("positive_factors", []),
            "warnings": result.get("warnings", []),
            "recommended_action": result.get("recommended_action"),
            "explanation": result.get("explanation"),
            "agent_statuses": result.get("agent_statuses", {}),
            "shap_explanation": result.get("shap_explanation"),
            "policy_context": result.get("policy_context", []),
            "audit_metadata": result.get("audit_metadata", {}),
            "agent_outputs": {
                "credit": result.get("credit_result"),
                "fraud": result.get("fraud_result"),
                "customer": result.get("customer_result"),
                "collections": result.get("collections_result"),
                "risk": result.get("risk_result"),
                "liquidity": result.get("liquidity_result"),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Orchestration execution failed: {str(e)}")

@router.get("/workflow-info")
def get_workflow_info():
    """Returns LangGraph orchestration pipeline topography and agent node details."""
    return {
        "workflow_name": "FinSight Multi-Agent Loan Underwriting Graph",
        "framework": "LangGraph (StateGraph)",
        "nodes": [
            {"id": "credit", "name": "Credit Intelligence Agent", "type": "ML Inference (XGBoost + SHAP)", "role": "Probability of Default & Loan Sizing"},
            {"id": "fraud", "name": "Fraud Intelligence Agent", "type": "Anomaly + Graph (Isolation Forest + NetworkX)", "role": "Syndicate, Collision & Velocity Screening"},
            {"id": "customer", "name": "Customer Intelligence Agent", "type": "Clustering & Churn (K-Means + XGBoost)", "role": "Customer 360 & Financial Stress Assessment"},
            {"id": "collections", "name": "Collections Intelligence Agent", "type": "Multi-Target ML (XGBoost)", "role": "Repayment Probability & Ethical Strategy"},
            {"id": "liquidity", "name": "Liquidity Intelligence Agent", "type": "Cashflow Forecasting (XGBoost Regressors)", "role": "Institutional Cash Buffer & ALM Gap Review"},
            {"id": "risk", "name": "Risk Intelligence Agent", "type": "Composite Aggregation (HHI Limits)", "role": "Portfolio Concentration & Macro Risk Check"},
            {"id": "decision_engine", "name": "Decision Engine", "type": "Configurable Business Rules", "role": "Deterministic Final Verdict (Approve/Review/Reject)"},
            {"id": "explainability", "name": "Explainability & RAG", "type": "Knowledge Retrieval + LLM Synthesis", "role": "Plain-English Narrative Rationale"},
            {"id": "audit", "name": "Audit Persistence", "type": "Database Audit Logger", "role": "Regulatory Decision Logging & Traceability"}
        ],
        "execution_flow": "Credit -> Fraud -> Customer -> Collections -> Liquidity -> Risk -> Decision Engine -> Explainability -> Audit",
        "governance_rule": "ML models generate numerical signals. Decision Engine applies deterministic business rules. LLMs synthesize explanation without approving/rejecting."
    }
