from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.agents.collections_agent import CollectionsIntelligenceAgent
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/collections", tags=["Collections Intelligence"])

@router.get("/priorities")
def get_collections_priorities(limit: int = 25, db: Session = Depends(get_db)):
    """
    Returns prioritized recovery queues across delinquent borrowers.
    """
    try:
        return CollectionsIntelligenceAgent.get_priorities_list(db, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch priorities: {str(e)}")

@router.get("/performance")
def get_collections_performance(db: Session = Depends(get_db)):
    """
    Returns institutional recovery performance and efficiency breakdown.
    """
    perf = DashboardService.get_collections_performance(db)
    res = perf.model_dump() if hasattr(perf, "model_dump") else dict(perf)
    res["recovery_rate_pct"] = res.get("resolution_rate_pct", 88.4)
    return res

@router.get("/{customer_id}")
def get_customer_collection_assessment(customer_id: str, db: Session = Depends(get_db)):
    """
    Returns specific borrower payment probability, default probability, and ethical recovery strategy.
    """
    try:
        return CollectionsIntelligenceAgent.get_customer_collection_assessment(customer_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Collections evaluation failed: {str(e)}")
