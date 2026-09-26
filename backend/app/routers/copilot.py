"""
FinSight AI - Copilot Router
Provides endpoints to chat with the FinSight AI Copilot, execute factual tools, and retrieve policy context.
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.copilot.service import copilot_service
from app.copilot.tools import COPILOT_TOOLS_METADATA

router = APIRouter(prefix="/copilot", tags=["AI Copilot"])

class CopilotQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Natural language question")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional conversational or UI context")

@router.post("/chat")
def chat_with_copilot(req: CopilotQueryRequest):
    """
    Submits a query to the Copilot.
    Copilot parses intent, calls required backend tools, queries RAG policies,
    and returns a structured, factual financial explanation.
    """
    try:
        response = copilot_service.answer_query(req.query, req.context)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copilot inference failed: {str(e)}")

@router.get("/tools")
def get_available_tools():
    """Returns list of executable tools available to the Copilot."""
    tools_summary = [
        {"name": t["name"], "description": t["description"], "parameters": t["parameters"]}
        for t in COPILOT_TOOLS_METADATA
    ]
    return {"tools_count": len(tools_summary), "tools": tools_summary}

@router.get("/suggestions")
def get_prompt_suggestions():
    """Returns curated enterprise financial questions for quick analysis."""
    return {
        "suggestions": [
            {"category": "Portfolio Risk", "prompt": "What is driving portfolio risk?"},
            {"category": "Customer Intelligence", "prompt": "Why was customer CUST-00001 flagged?"},
            {"category": "Liquidity & ALM", "prompt": "What is the 30-day liquidity outlook?"},
            {"category": "Collections", "prompt": "Which regions have worsening collection performance?"},
            {"category": "Underwriting Decision", "prompt": "Explain the latest loan decision."},
            {"category": "Risk Signals", "prompt": "What are today's major risk alerts?"},
        ]
    }
