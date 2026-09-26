from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.security.jwt import get_current_user
from app.models.users import UserRole
from ml.registry import ModelRegistry

router = APIRouter(prefix="/settings", tags=["Configuration & Settings"])

# In-memory runtime settings cache initialized with standard NBFC parameters
RUNTIME_CONFIG = {
    "risk_thresholds": {
        "max_pd_for_auto_approval": 0.05,
        "max_pd_for_manual_review": 0.15,
        "min_credit_score_prime": 750,
        "min_credit_score_near_prime": 650,
        "max_dti_ratio": 0.50,
        "max_credit_utilization": 0.75,
        "fraud_risk_cutoff_score": 75,
        "high_value_transaction_limit": 200000.0,
    },
    "decision_policies": {
        "allow_instant_disbursal": True,
        "require_co_applicant_above_amount": 1000000.0,
        "mandatory_field_verification_above_pd": 0.10,
        "collections_grace_period_days": 3,
        "npa_threshold_dpd": 90,
        "alm_minimum_lcr_pct": 110.0
    },
    "notification_preferences": {
        "email_alerts_on_fraud": True,
        "sms_to_borrower_on_emi_due": True,
        "webhook_on_auto_reject": True,
        "daily_liquidity_slack_digest": True,
        "audit_log_retention_days": 365
    }
}

class UpdateConfigPayload(BaseModel):
    risk_thresholds: Optional[Dict[str, Any]] = None
    decision_policies: Optional[Dict[str, Any]] = None
    notification_preferences: Optional[Dict[str, Any]] = None

@router.get("/config", summary="Retrieve active NBFC risk thresholds and policies")
def get_system_config(current_user = Depends(get_current_user)):
    """Returns current active risk thresholds, policies, notification toggles, user profile, and registered model versions."""
    models_meta = ModelRegistry.list_registered_models()
    
    return {
        "config": RUNTIME_CONFIG,
        "profile": {
            "email": current_user.email,
            "role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
            "full_name": getattr(current_user, "full_name", current_user.email.split("@")[0].capitalize()),
            "department": getattr(current_user, "department", "Enterprise Risk Operations"),
            "session_status": "ACTIVE_AUTHENTICATED"
        },
        "model_versions": models_meta
    }

@router.put("/config", summary="Update NBFC risk thresholds and decision policies (Risk Manager & Admin only)")
def update_system_config(
    payload: UpdateConfigPayload,
    current_user = Depends(get_current_user)
):
    """Allows Risk Managers or Admins to tune risk thresholds without code deployments."""
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role not in [UserRole.ADMIN.value, UserRole.RISK_MANAGER.value, "ADMIN", "RISK_MANAGER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Risk Managers and Admins can modify enterprise risk thresholds."
        )

    if payload.risk_thresholds:
        RUNTIME_CONFIG["risk_thresholds"].update(payload.risk_thresholds)
    if payload.decision_policies:
        RUNTIME_CONFIG["decision_policies"].update(payload.decision_policies)
    if payload.notification_preferences:
        RUNTIME_CONFIG["notification_preferences"].update(payload.notification_preferences)
        
    return {
        "status": "SUCCESS",
        "message": "System configuration updated successfully",
        "updated_by": current_user.email,
        "config": RUNTIME_CONFIG
    }
