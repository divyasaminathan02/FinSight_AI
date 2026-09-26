from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from app.agents.liquidity_agent import LiquidityIntelligenceAgent

router = APIRouter(prefix="/liquidity", tags=["Liquidity Intelligence"])

@router.get("/current")
def get_current_liquidity():
    """
    Returns current available liquidity reserves, LCR buffer ratio, and compliance status.
    """
    try:
        return LiquidityIntelligenceAgent.get_current_liquidity()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch liquidity status: {str(e)}")

@router.get("/forecast")
def get_liquidity_forecast(horizon_days: int = Query(30, ge=7, le=90)):
    """
    Returns multi-horizon ALM forecast (7, 30, or 90 days) using XGBoost lag models.
    """
    try:
        return LiquidityIntelligenceAgent.forecast_liquidity(horizon_days=horizon_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate liquidity forecast: {str(e)}")

@router.get("/scenarios")
def get_liquidity_stress_scenarios():
    """
    Returns stress shock testing simulation results (Baseline, Moderate Shock, Severe Shock).
    """
    try:
        return LiquidityIntelligenceAgent.get_stress_scenarios()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate stress scenarios: {str(e)}")
