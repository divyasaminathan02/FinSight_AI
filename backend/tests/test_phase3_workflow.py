"""
FinSight AI - Phase 3 Comprehensive Test Suite
Tests:
- Decision Engine (Approve, Review, Reject, thresholds, hard stops)
- RAG Knowledge Base & pgvector/embedded retrieval
- LangGraph Multi-Agent Orchestration Workflow (Credit -> Fraud -> Customer -> Collections -> Liquidity -> Risk -> Decision Engine -> Explainability -> Audit)
- FinSight Copilot Tool Calling System & Intent Routing
- Decision Audit Logging & Query APIs
- Notifications generation from backend events
- Error resilience: Missing customer, invalid payload, LLM unavailable fallback
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.decision_engine.engine import DecisionEngine, PolicyConfig
from app.rag.knowledge_base import knowledge_base
from app.copilot.tools import (
    tool_get_portfolio_risk,
    tool_get_customer_360,
    tool_get_liquidity_forecast,
    tool_get_collection_priorities,
    tool_get_agent_status,
)
from app.copilot.service import copilot_service
from app.orchestration.workflow import run_loan_orchestration

client = TestClient(app)

# ----------------- DECISION ENGINE TESTS -----------------

def test_decision_engine_approve():
    engine = DecisionEngine()
    app_data = {
        "loan_amount": 350000,
        "income": 85000,
        "credit_score": 760,
        "previous_defaults": 0,
        "previous_dpd": 0,
        "debt_to_income": 0.28,
    }
    credit_res = {
        "probability_of_default": 0.03,
        "credit_risk_score": 760,
        "debt_to_income": 0.28,
    }
    fraud_res = {
        "fraud_risk": "LOW",
        "fraud_probability": 0.02,
        "related_entities": [],
        "risk_signals": [],
    }
    res = engine.evaluate(app_data, credit_result=credit_res, fraud_result=fraud_res)
    assert res["decision"] == "APPROVE"
    assert len(res["positive_factors"]) > 0
    assert "disbursement" in res["recommended_action"].lower() or "approve" in res["recommended_action"].lower()

def test_decision_engine_review_required():
    engine = DecisionEngine()
    # High DTI triggers REVIEW REQUIRED
    app_data = {
        "loan_amount": 600000,
        "income": 50000,
        "credit_score": 680,
        "previous_defaults": 0,
        "debt_to_income": 0.62,  # Exceeds max 0.55
    }
    res = engine.evaluate(app_data, credit_result={"probability_of_default": 0.08, "debt_to_income": 0.62})
    assert res["decision"] == "REVIEW REQUIRED"
    assert any("Debt-to-Income" in r for r in res["reasons"])
    assert "Senior Underwriter" in res["recommended_action"]

def test_decision_engine_reject_fraud():
    engine = DecisionEngine()
    app_data = {"loan_amount": 500000, "credit_score": 750}
    fraud_res = {
        "fraud_risk": "CRITICAL",
        "fraud_probability": 0.82,
        "risk_signals": ["Clustered device fingerprint collision"],
    }
    res = engine.evaluate(app_data, fraud_result=fraud_res)
    assert res["decision"] == "REJECT"
    assert any("fraud" in r.lower() for r in res["reasons"])

def test_decision_engine_reject_credit():
    engine = DecisionEngine()
    # Subprime score below floor
    app_data = {"loan_amount": 500000, "credit_score": 540, "previous_defaults": 1}
    res = engine.evaluate(app_data)
    assert res["decision"] == "REJECT"
    assert len(res["risk_factors"]) > 0

# ----------------- RAG KNOWLEDGE BASE TESTS -----------------

def test_rag_knowledge_retrieval():
    # Test query about DTI
    results_dti = knowledge_base.search("What is the maximum permissible DTI ratio?", top_k=2)
    assert len(results_dti) > 0
    assert "Debt-To-Income" in results_dti[0]["title"] or "DTI" in results_dti[0]["content"]

    # Test query about Collections
    results_coll = knowledge_base.search("RBI fair practices contact hours collections", top_k=2)
    assert len(results_coll) > 0
    assert any("8" in r["content"] and "7" in r["content"] for r in results_coll)

# ----------------- LANGGRAPH ORCHESTRATION TESTS -----------------

def test_langgraph_full_orchestration():
    app_data = {
        "customer_id": "CUST-00001",
        "loan_amount": 400000,
        "tenure": 36,
        "loan_purpose": "Personal",
        "income": 70000,
        "credit_score": 730,
        "debt_to_income": 0.30,
    }
    result = run_loan_orchestration(app_data, user_id="Test Risk Officer")
    assert result is not None
    assert result["decision"]["decision"] in ["APPROVE", "REVIEW REQUIRED", "REJECT"]
    
    # All 9 agent stages completed
    statuses = result["agent_statuses"]
    assert statuses["credit"] == "Completed"
    assert statuses["fraud"] == "Completed"
    assert statuses["customer"] == "Completed"
    assert statuses["collections"] == "Completed"
    assert statuses["liquidity"] == "Completed"
    assert statuses["risk"] == "Completed"
    assert statuses["decision_engine"] == "Completed"
    assert statuses["explainability"] == "Completed"
    assert statuses["audit"] == "Completed"

    # Verifies SHAP explainability presence
    shap = result.get("shap_explanation")
    assert shap is not None
    assert "top_positive_risk_contributors" in shap
    assert "top_negative_risk_contributors" in shap

# ----------------- COPILOT TOOL SYSTEM & CHAT TESTS -----------------

def test_copilot_tool_execution():
    risk_res = tool_get_portfolio_risk()
    assert "portfolio_risk_score" in risk_res
    assert risk_res["portfolio_risk_score"] > 0

    c360 = tool_get_customer_360("CUST-00001")
    assert "financial_health_score" in c360

    liq = tool_get_liquidity_forecast(days=30)
    assert "current_liquidity_cr" in liq
    assert "lcr_buffer_ratio" in liq

    coll = tool_get_collection_priorities(limit=5)
    assert "priorities_summary" in coll or "priority_queues" in coll

    status = tool_get_agent_status()
    assert "credit_agent" in status
    assert "fraud_agent" in status

def test_copilot_chat_queries():
    # 1. Portfolio risk question
    res_risk = copilot_service.answer_query("What is driving portfolio risk?")
    assert "portfolio" in res_risk["text"].lower()
    assert len(res_risk["tools_called"]) > 0
    assert res_risk["financial_data"]["category"] == "Portfolio Risk"

    # 2. Liquidity question
    res_liq = copilot_service.answer_query("What is the 30-day liquidity outlook?")
    assert "liquidity" in res_liq["text"].lower()
    assert any(t["tool"] == "get_liquidity_forecast" for t in res_liq["tools_called"])

    # 3. Customer inquiry
    res_cust = copilot_service.answer_query("Why was customer CUST-00001 flagged?")
    assert "c360" in str(res_cust["tools_called"]).lower() or "customer" in res_cust["text"].lower()

# ----------------- REST API ENDPOINT INTEGRATION TESTS -----------------

def test_api_orchestration_analyze_loan():
    payload = {
        "customer_id": "CUST-00001",
        "loan_amount": 500000,
        "tenure": 36,
        "loan_purpose": "Business",
        "income": 80000,
        "credit_score": 750,
    }
    response = client.post("/api/orchestration/analyze-loan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "decision" in data
    assert data["decision"]["decision"] in ["APPROVE", "REVIEW REQUIRED", "REJECT"]
    assert "agent_statuses" in data
    assert "audit_metadata" in data

def test_api_orchestration_workflow_info():
    response = client.get("/api/orchestration/workflow-info")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert len(data["nodes"]) == 9

def test_api_copilot_chat_and_tools():
    # Chat endpoint
    response = client.post("/api/copilot/chat", json={"query": "What are today's major risk alerts?"})
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "financial_data" in data

    # Tools endpoint
    t_res = client.get("/api/copilot/tools")
    assert t_res.status_code == 200
    assert t_res.json()["tools_count"] >= 9

    # Suggestions endpoint
    s_res = client.get("/api/copilot/suggestions")
    assert s_res.status_code == 200
    assert len(s_res.json()["suggestions"]) >= 5

def test_api_audit_decisions():
    # List audits
    res = client.get("/api/audit/decisions?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "audits" in data
    assert data["total"] >= 1
    
    audit_id = data["audits"][0]["audit_id"]
    # Detail audit
    detail_res = client.get(f"/api/audit/decisions/{audit_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["audit_id"] == audit_id
    assert "agent_outputs" in detail

def test_api_notifications_live_alerts():
    res = client.post("/api/notifications/generate-alerts")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "generated_count" in data

# ----------------- RESILIENCE & ERROR HANDLING TESTS -----------------

def test_error_handling_missing_customer():
    # Should not crash; gracefully provides synthetic profile
    payload = {
        "customer_id": "CUST-NONEXISTENT-99999",
        "loan_amount": 300000,
        "tenure": 24,
        "loan_purpose": "Personal",
    }
    response = client.post("/api/orchestration/analyze-loan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"]["decision"] in ["APPROVE", "REVIEW REQUIRED", "REJECT"]

def test_error_handling_invalid_input():
    # Negative loan amount triggers 422
    payload = {
        "loan_amount": -500,
        "tenure": 36,
        "loan_purpose": "Personal",
    }
    response = client.post("/api/orchestration/analyze-loan", json=payload)
    assert response.status_code == 422
