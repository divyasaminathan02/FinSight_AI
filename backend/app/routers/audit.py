"""
FinSight AI - Audit Trail Router
Provides endpoints to inspect historical multi-agent underwriting runs and decision metadata.
"""

import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.audit import LoanDecisionAudit

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("/decisions")
def get_decision_audits(
    limit: int = Query(25, ge=1, le=100),
    decision: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve decision audit log records with filtering."""
    query = db.query(LoanDecisionAudit)
    if decision:
        query = query.filter(LoanDecisionAudit.decision == decision.upper())
    if customer_id:
        query = query.filter(LoanDecisionAudit.customer_id == customer_id)
        
    records = query.order_by(desc(LoanDecisionAudit.timestamp)).limit(limit).all()
    
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "audit_id": r.audit_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "user_id": r.user_id,
            "customer_id": r.customer_id,
            "application_id": r.application_id,
            "loan_amount": r.loan_amount,
            "tenure": r.tenure,
            "purpose": r.purpose,
            "decision": r.decision,
            "reasons": json.loads(r.reasons_json) if r.reasons_json else [],
            "recommended_action": r.recommended_action,
            "policy_version": r.policy_version,
            "execution_time_ms": r.execution_time_ms,
        })
    return {"total": len(results), "audits": results}

@router.get("/decisions/{audit_id}")
def get_decision_audit_detail(audit_id: str, db: Session = Depends(get_db)):
    """Retrieve complete multi-agent execution audit trail for a specific run."""
    r = db.query(LoanDecisionAudit).filter(LoanDecisionAudit.audit_id == audit_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Decision audit record not found")
        
    return {
        "id": r.id,
        "audit_id": r.audit_id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "user_id": r.user_id,
        "customer_id": r.customer_id,
        "application_id": r.application_id,
        "loan_amount": r.loan_amount,
        "tenure": r.tenure,
        "purpose": r.purpose,
        "decision": r.decision,
        "reasons": json.loads(r.reasons_json) if r.reasons_json else [],
        "recommended_action": r.recommended_action,
        "policy_version": r.policy_version,
        "execution_time_ms": r.execution_time_ms,
        "agent_outputs": {
            "credit": json.loads(r.credit_output_json) if r.credit_output_json else None,
            "fraud": json.loads(r.fraud_output_json) if r.fraud_output_json else None,
            "customer": json.loads(r.customer_output_json) if r.customer_output_json else None,
            "collections": json.loads(r.collections_output_json) if r.collections_output_json else None,
            "risk": json.loads(r.risk_output_json) if r.risk_output_json else None,
            "liquidity": json.loads(r.liquidity_output_json) if r.liquidity_output_json else None,
        },
        "shap_explanation": json.loads(r.shap_explanation_json) if r.shap_explanation_json else None,
        "model_versions": json.loads(r.model_versions_json) if r.model_versions_json else {},
    }
