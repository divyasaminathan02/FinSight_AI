from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from app.database import get_db
from app.security.jwt import get_current_user
from app.services.event_service import event_bus, EventType

router = APIRouter(prefix="/events", tags=["Event Simulation Engine"])

class SimulateEventRequest(BaseModel):
    event_type: str = Field(..., description="One of NEW_LOAN_APPLICATION, EMI_MISSED, EMI_PAID, SUSPICIOUS_TRANSACTION, NEW_FRAUD_ALERT, COLLECTION_ATTEMPT, CASH_INFLOW, CASH_OUTFLOW")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Event-specific metadata and parameters")

@router.get("/types", summary="Get supported NBFC simulation event types")
def get_event_types():
    """Returns list of supported simulation event types and sample schemas."""
    return {
        "event_types": [
            {
                "type": EventType.NEW_LOAN_APPLICATION,
                "label": "New Loan Application",
                "description": "Simulates borrower applying for loan; runs automated underwriting assessment",
                "sample_payload": {"customer_id": "CUST-00001", "loan_amount": 250000.0, "tenure_months": 24, "product_type": "Personal"}
            },
            {
                "type": EventType.EMI_MISSED,
                "label": "EMI Missed / Default",
                "description": "Simulates loan installment default; alerts collections & degrades borrower score",
                "sample_payload": {"loan_id": "LN-00001", "customer_id": "CUST-00001", "amount_due": 12500.0}
            },
            {
                "type": EventType.EMI_PAID,
                "label": "EMI Paid Successfully",
                "description": "Simulates borrower repayment; updates ledger, restores credit rating & records cash inflow",
                "sample_payload": {"loan_id": "LN-00001", "customer_id": "CUST-00001", "amount": 12500.0}
            },
            {
                "type": EventType.SUSPICIOUS_TRANSACTION,
                "label": "Suspicious Transaction Spike",
                "description": "Flags high-velocity anomalous transaction; routes to Fraud & Risk agents",
                "sample_payload": {"customer_id": "CUST-00001", "amount": 185000.0, "channel": "ONLINE_TRANSFER", "velocity_score": 0.89}
            },
            {
                "type": EventType.NEW_FRAUD_ALERT,
                "label": "New Fraud Alert",
                "description": "Triggers critical fraud alert with mandatory review flag",
                "sample_payload": {"customer_id": "CUST-00001", "rule_triggered": "Device Fingerprint Conflict", "exposure": 850000}
            },
            {
                "type": EventType.COLLECTION_ATTEMPT,
                "label": "Collection Attempt Executed",
                "description": "Records outreach attempt adhering to RBI Fair Practices Code",
                "sample_payload": {"loan_id": "LN-00001", "customer_id": "CUST-00001", "channel": "Automated Voice Bot"}
            },
            {
                "type": EventType.CASH_INFLOW,
                "label": "Treasury Cash Inflow",
                "description": "Records institutional liquidity deposit; improves LCR ratio",
                "sample_payload": {"amount_cr": 5.0}
            },
            {
                "type": EventType.CASH_OUTFLOW,
                "label": "Bulk Loan Disbursement",
                "description": "Records institutional capital disbursement outflow",
                "sample_payload": {"amount_cr": 3.5}
            }
        ]
    }

@router.post("/simulate", summary="Trigger a simulated NBFC event with cascading intelligence")
def simulate_event(
    req: SimulateEventRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    valid_types = [
        EventType.NEW_LOAN_APPLICATION,
        EventType.EMI_MISSED,
        EventType.EMI_PAID,
        EventType.SUSPICIOUS_TRANSACTION,
        EventType.NEW_FRAUD_ALERT,
        EventType.COLLECTION_ATTEMPT,
        EventType.CASH_INFLOW,
        EventType.CASH_OUTFLOW
    ]
    if req.event_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event type '{req.event_type}'. Valid types: {valid_types}"
        )
    
    result = event_bus.emit(
        event_type=req.event_type,
        payload=req.payload,
        db=db
    )
    result["triggered_by"] = current_user.email
    return {
        "status": "SUCCESS",
        "message": f"Event {req.event_type} dispatched successfully",
        "event_result": result
    }

@router.get("/history", summary="Get recent simulated event log")
def get_event_history(
    limit: int = 50,
    current_user = Depends(get_current_user)
):
    history = event_bus.get_history(limit=limit)
    return {
        "total": len(history),
        "events": history
    }
