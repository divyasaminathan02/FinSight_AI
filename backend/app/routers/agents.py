from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.services.dashboard_service import DashboardService
from app.models.agents import AgentRun, AgentDecision
from app.schemas.dashboard import AgentCard, AgentNetworkStatusResponse

router = APIRouter(prefix="/agents", tags=["AI Agents"])

@router.get("/status", response_model=List[AgentCard])
def get_agents_status(db: Session = Depends(get_db)):
    """
    Returns the real-time operational status, key metrics, and coordination state
    of all six FinSight AI intelligence agents.
    """
    return DashboardService.get_agent_cards(db)

@router.get("/network", response_model=AgentNetworkStatusResponse)
def get_agent_network(db: Session = Depends(get_db)):
    """
    Returns the coordinated intelligence network topology and real-time synchronization pipeline.
    """
    return DashboardService.get_agent_network_status(db)

@router.get("/runs")
def list_agent_runs(agent_name: Optional[str] = None, limit: int = 20, db: Session = Depends(get_db)):
    query = db.query(AgentRun)
    if agent_name:
        query = query.filter(AgentRun.agent_name == agent_name)
    runs = query.order_by(desc(AgentRun.created_at)).limit(limit).all()
    return runs

@router.get("/decisions")
def list_agent_decisions(
    agent_name: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(AgentDecision)
    if agent_name:
        query = query.filter(AgentDecision.agent_name == agent_name)
    if entity_type:
        query = query.filter(AgentDecision.entity_type == entity_type)
    decisions = query.order_by(desc(AgentDecision.created_at)).limit(limit).all()
    return decisions
