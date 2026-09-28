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
from app.models.users import AuditLog

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("/logs")
def get_general_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    logs = query.order_by(desc(AuditLog.created_at)).limit(limit).all()
    
    results = []
    for log in logs:
        details = {}
        before = {}
        after = {}
        try:
            if log.details_json:
                details = json.loads(log.details_json)
        except Exception:
            details = {"raw": log.details_json}
        try:
            if log.before_state_json:
                before = json.loads(log.before_state_json)
        except Exception:
            before = {"raw": log.before_state_json}
        try:
            if log.after_state_json:
                after = json.loads(log.after_state_json)
        except Exception:
            after = {"raw": log.after_state_json}

        results.append({
            "id": log.id,
            "action": log.action,
            "resource": log.resource,
            "entity": log.entity_type or (log.resource.split(":")[0] if ":" in (log.resource or "") else "Entity"),
            "entity_id": log.entity_id or (log.resource.split(":")[1] if ":" in (log.resource or "") else str(log.id)),
            "user": log.user_name or (log.user.full_name if log.user else log.user_email or "System / Officer"),
            "role": log.user_role or (log.user.role.value if log.user and hasattr(log.user.role, 'value') else "OFFICER"),
            "timestamp": log.created_at.isoformat() if log.created_at else None,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "before": before,
            "after": after,
            "details": details,
        })
    return {"total": len(results), "logs": results}


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
