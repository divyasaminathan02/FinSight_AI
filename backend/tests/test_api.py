import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "version" in data

def test_auth_login():
    response = client.post("/api/auth/login", json={
        "email": "arjun.mehta@finsight.ai",
        "password": "FinSight@2026"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "arjun.mehta@finsight.ai"
    assert data["user"]["role"] == "RISK_MANAGER"

def test_dashboard_overview():
    response = client.get("/api/dashboard/overview")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert len(data["kpis"]) == 6
    assert "agents" in data
    assert len(data["agents"]) == 6
    assert "network" in data
    assert "risk_trend" in data
    assert "risk_alerts" in data
    assert "collections" in data
    assert "liquidity" in data

def test_agents_status():
    response = client.get("/api/agents/status")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    agent_names = [a["short_name"] for a in data]
    assert "Credit Intelligence" in agent_names
    assert "Fraud Intelligence" in agent_names
    assert "Customer Intelligence" in agent_names
    assert "Collections Intelligence" in agent_names
    assert "Risk Intelligence" in agent_names
    assert "Liquidity Intelligence" in agent_names

def test_customers_api():
    response = client.get("/api/customers?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) <= 10
    assert "summary" in data

def test_loans_api():
    response = client.get("/api/loans?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "summary" in data

def test_transactions_api():
    response = client.get("/api/transactions?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data

def test_notifications_api():
    response = client.get("/api/notifications")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "unread_count" in data
