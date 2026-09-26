from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.agents.risk_agent import RiskIntelligenceAgent
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/risk", tags=["Risk Intelligence"])

@router.get("/portfolio")
def get_portfolio_risk(
    w_credit: Optional[float] = None,
    w_delinquency: Optional[float] = None,
    w_fraud: Optional[float] = None,
    w_liquidity: Optional[float] = None,
    w_concentration: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Returns aggregate portfolio risk score, HHI concentration indices, and risk drivers.
    """
    try:
        return RiskIntelligenceAgent.get_portfolio_risk(
            db=db,
            w_credit=w_credit,
            w_delinquency=w_delinquency,
            w_fraud=w_fraud,
            w_liquidity=w_liquidity,
            w_concentration=w_concentration
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate portfolio risk: {str(e)}")

@router.get("/signals")
def get_risk_signals(db: Session = Depends(get_db)):
    """
    Returns active early warning signals across regions, sectors, and products.
    """
    try:
        signals = RiskIntelligenceAgent.get_signals(db)
        return {
            "total_signals": len(signals),
            "signals": signals
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch risk signals: {str(e)}")

@router.get("/trends")
def get_risk_trends(db: Session = Depends(get_db)):
    """
    Returns 6-month historical risk trends across Overall, Credit, and Collection risk.
    """
    trend = DashboardService.get_risk_trend(db)
    res = trend.model_dump() if hasattr(trend, "model_dump") else dict(trend)
    res["data"] = res.get("series", [])
    return res
