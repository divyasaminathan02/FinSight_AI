from typing import Dict, Any, Optional, Union
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from app.database import get_db
from app.agents.fraud_agent import FraudIntelligenceAgent
from app.models.assessments import FraudAlert

router = APIRouter(prefix="/fraud", tags=["Fraud Intelligence"])

class FraudAnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    customer_id: Optional[Union[int, str]] = Field(default=1, description="Customer ID or identifier")
    device_id: Optional[str] = Field(default="DEV-SHR-FINGERPRINT-8492", description="Device hardware hash")
    phone_hash: Optional[str] = Field(default=None, description="Phone number hash")
    phone_number: Optional[str] = Field(default=None, description="Raw phone number")
    address_hash: Optional[str] = Field(default=None, description="Address hash")
    address: Optional[str] = Field(default=None, description="Address string")
    requested_amount: Optional[float] = Field(default=None, description="Requested amount")
    amount: Optional[float] = Field(default=None, description="Requested amount alias")
    application_velocity: Optional[int] = Field(default=None, description="Applications in 7 days")
    velocity_1h: Optional[int] = Field(default=None, description="Applications in 1 hour")
    velocity_24h: Optional[int] = Field(default=None, description="Applications in 24 hours")
    income: Optional[float] = Field(default=45000.0, description="Monthly income")
    bank_balance: Optional[float] = Field(default=25000.0, description="Bank balance")
    channel: Optional[str] = Field(default="MOBILE_APP", description="Channel (WEB, MOBILE_APP)")
    location: Optional[str] = Field(default="Bengaluru", description="Geographic location")

@router.post("/analyze")
def analyze_fraud(request: FraudAnalysisRequest):
    """
    Evaluates fraud collision risk using Isolation Forest and NetworkX multi-entity graph.
    """
    try:
        return FraudIntelligenceAgent.analyze_fraud_risk(request.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fraud analysis failed: {str(e)}")

@router.get("/alerts")
def list_fraud_alerts(db: Session = Depends(get_db)):
    """
    Returns active fraud alerts, syndicate collisions, and forensic risk signals.
    """
    alerts = db.query(FraudAlert).order_by(FraudAlert.created_at.desc()).limit(20).all()
    alert_items = [
        {
            "id": a.alert_id,
            "type": a.alert_type,
            "severity": a.severity,
            "risk_score": a.risk_score,
            "rule_triggered": a.rule_triggered,
            "status": a.status,
            "exposure_amount": a.exposure_amount,
            "exposure_formatted": f"₹{a.exposure_amount:,.0f}",
            "created_at": a.created_at.strftime("%d %b, %H:%M")
        }
        for a in alerts
    ]
    return {
        "total_alerts": len(alert_items),
        "alerts": alert_items
    }

@router.get("/network/{customer_id}")
def get_fraud_network(customer_id: str):
    """
    Returns graph topology (nodes and links) for visual fraud syndicate inspection.
    """
    try:
        return FraudIntelligenceAgent.get_customer_network(customer_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Network extraction failed: {str(e)}")
