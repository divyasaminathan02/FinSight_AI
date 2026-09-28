import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(email="arjun.mehta@finsight.ai", password="FinSight@2026"):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]

def test_security_headers():
    """Verify production security headers are attached to all API responses."""
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert "max-age" in resp.headers.get("strict-transport-security", "")

def test_health_endpoints():
    """Test detailed system health endpoints."""
    # Base health
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"].lower() in ["healthy", "degraded"]
    assert "services" in data

    # Database health
    r_db = client.get("/api/health/database")
    assert r_db.status_code == 200
    assert r_db.json()["connection"] == "connected"

    # Models health
    r_mod = client.get("/api/health/models")
    assert r_mod.status_code == 200
    assert r_mod.json()["total_expected"] == 6

    # LLM health
    r_llm = client.get("/api/health/llm")
    assert r_llm.status_code == 200
    assert "active_provider" in r_llm.json()

def test_auth_registration_and_rbac():
    """Test user registration and role verification."""
    test_user_payload = {
        "email": "auditor.phase4@finsight.ai",
        "password": "SecurePassword@123",
        "full_name": "Audit Inspector",
        "role": "AUDITOR",
        "department": "Internal Audit & Compliance"
    }
    r = client.post("/api/auth/register", json=test_user_payload)
    assert r.status_code in [200, 201, 400]
    
    # Login as auditor
    token = get_auth_token("auditor.phase4@finsight.ai", "SecurePassword@123")
    assert token is not None

def test_event_simulation_engine():
    """Test event triggering, cascading updates, and history tracking."""
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get supported types
    r_types = client.get("/api/events/types", headers=headers)
    assert r_types.status_code == 200
    types = r_types.json()["event_types"]
    assert len(types) >= 8

    # 2. Simulate EMI Missed
    r_sim = client.post(
        "/api/events/simulate",
        json={"event_type": "EMI_MISSED", "payload": {"loan_id": "LN-00001", "amount_due": 15000.0}},
        headers=headers
    )
    assert r_sim.status_code == 200
    assert r_sim.json()["status"] == "SUCCESS"
    assert len(r_sim.json()["event_result"]["effects"]) > 0

    # 3. Simulate Suspicious Transaction
    r_sim2 = client.post(
        "/api/events/simulate",
        json={"event_type": "SUSPICIOUS_TRANSACTION", "payload": {"amount": 250000.0, "customer_id": "CUST-00001"}},
        headers=headers
    )
    assert r_sim2.status_code == 200

    # 4. Check Event History
    r_hist = client.get("/api/events/history", headers=headers)
    assert r_hist.status_code == 200
    assert r_hist.json()["total"] >= 2

def test_enterprise_reports():
    """Test report generation and CSV export."""
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # List reports
    r_list = client.get("/api/reports/list", headers=headers)
    assert r_list.status_code == 200
    assert len(r_list.json()["reports"]) >= 6

    # Get structured report data
    for rep in ["portfolio-risk", "credit", "fraud", "collections", "liquidity", "executive-summary"]:
        r_data = client.get(f"/api/reports/data/{rep}", headers=headers)
        assert r_data.status_code == 200
        assert "title" in r_data.json()

    # Test CSV Export
    r_csv = client.get("/api/reports/export/portfolio-risk", headers=headers)
    assert r_csv.status_code == 200
    assert "text/csv" in r_csv.headers["content-type"]
    assert "attachment" in r_csv.headers.get("content-disposition", "")
    assert b"FinSight AI" in r_csv.content

def test_settings_and_risk_thresholds():
    """Test configurable risk thresholds and decision policies."""
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Retrieve config
    r_get = client.get("/api/settings/config", headers=headers)
    assert r_get.status_code == 200
    data = r_get.json()
    assert "risk_thresholds" in data["config"]
    assert "decision_policies" in data["config"]
    assert "profile" in data

    # Update risk threshold
    r_put = client.put(
        "/api/settings/config",
        json={"risk_thresholds": {"max_pd_for_auto_approval": 0.045}},
        headers=headers
    )
    assert r_put.status_code == 200
    assert r_put.json()["config"]["risk_thresholds"]["max_pd_for_auto_approval"] == 0.045
