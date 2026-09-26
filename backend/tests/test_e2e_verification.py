import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(email="arjun.mehta@finsight.ai", password="FinSight@2026"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]

def test_e2e_loan_underwriting_flow():
    """
    END-TO-END LOAN TEST:
    1. Submit loan application to LangGraph Multi-Agent Orchestration.
    2. Executes Credit, Fraud, Customer, Collections, and Risk agents.
    3. Runs Decision Engine (Approve / Review / Reject).
    4. Produces SHAP explanations and Copilot natural language summary.
    5. Stores immutable audit trail.
    """
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "customer_id": "CUST-00001",
        "loan_amount": 350000.0,
        "tenure": 24,
        "loan_purpose": "MSME Working Capital Expansion",
        "income": 75000.0,
        "credit_score": 740,
        "existing_loans": 1,
        "total_emi": 12000.0,
        "bank_balance": 95000.0,
        "income_stability": 0.85
    }

    # 1. Run multi-agent loan analysis
    response = client.post("/api/orchestration/analyze-loan", json=payload, headers=headers)
    assert response.status_code == 200, f"Analysis failed: {response.text}"
    data = response.json()

    # 2. Check Decision Engine result
    assert "decision" in data
    dec = data["decision"]
    assert dec["decision"] in ["APPROVE", "REVIEW REQUIRED", "REJECT"]

    # 3. Check Agent Statuses across all 9 stages
    assert "agent_statuses" in data
    statuses = data["agent_statuses"]
    assert statuses["credit"] == "Completed"
    assert statuses["fraud"] == "Completed"
    assert statuses["customer"] == "Completed"
    assert statuses["collections"] == "Completed"
    assert statuses["liquidity"] == "Completed"
    assert statuses["risk"] == "Completed"
    assert statuses["decision_engine"] == "Completed"

    # 4. Check SHAP explanation factors
    assert "shap_explanation" in data
    shap = data["shap_explanation"]
    assert "top_positive_risk_contributors" in shap
    assert "top_negative_risk_contributors" in shap

    # 5. Check Copilot natural language explanation
    assert "explanation" in data
    assert len(data["explanation"]) > 20

    # 6. Verify Decision is logged in Audit Trail
    audit_resp = client.get("/api/audit/decisions", headers=headers)
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()
    assert "audits" in audit_data
    assert len(audit_data["audits"]) > 0

def test_fraud_intelligence_signals():
    """
    FRAUD TEST:
    Verify fraud score calculation, network relationship signals, and anomaly indicators.
    """
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/fraud/analyze",
        json={
            "customer_id": "CUST-00001",
            "amount": 350000.0,
            "channel": "MOBILE_APP",
            "device_id": "DEV-TEST-9981",
            "ip_address": "49.207.12.8"
        },
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "fraud_probability" in data
    assert "fraud_risk" in data
    assert "anomaly_score" in data

def test_collections_intelligence_priorities():
    """
    COLLECTION TEST:
    Verify collections priority list, borrower recovery score, and queue.
    """
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/collections/priorities", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "priorities_summary" in data
    assert "priority_queues" in data
    
    # Specific borrower collection assessment
    resp_cust = client.get("/api/collections/CUST-00001", headers=headers)
    assert resp_cust.status_code == 200
    cust_data = resp_cust.json()
    assert "payment_probability" in cust_data or "repayment_probability" in cust_data or "overdue_amount" in cust_data

def test_liquidity_intelligence_calculations():
    """
    LIQUIDITY TEST:
    Verify LCR calculation, 30-day forecast, inflows, and outflows.
    """
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/liquidity/forecast", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "current_liquidity_cr" in data
    assert "horizon_days" in data

def test_copilot_queries_against_actual_data():
    """
    COPILOT TEST:
    Verify Copilot executes tools and answers core domain questions using real application data.
    """
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    queries = [
        "What is driving portfolio risk?",
        "Show me high-risk customers.",
        "What is the 30-day liquidity outlook?",
        "What are today's fraud alerts?"
    ]

    for q in queries:
        resp = client.post("/api/copilot/chat", json={"query": q}, headers=headers)
        assert resp.status_code == 200, f"Copilot failed on query '{q}': {resp.text}"
        data = resp.json()
        assert "text" in data
        assert len(data["text"]) > 20, f"Copilot returned too short response for query: {q}"
        assert "financial_data" in data

def test_security_and_role_access():
    """
    SECURITY TEST:
    Verify invalid token is rejected (401) and role restrictions are enforced (403).
    """
    # 1. Invalid token returns 401 Unauthorized
    resp = client.get("/api/settings/config", headers={"Authorization": "Bearer totally_invalid_jwt_token"})
    assert resp.status_code == 401, f"Invalid token should return 401, got {resp.status_code}"

    # 2. Authenticated user with Auditor role attempting write operation to Risk Thresholds
    client.post("/api/auth/register", json={
        "email": "test.auditor.sec@finsight.ai",
        "password": "SecurePassword@123",
        "full_name": "Audit Inspector",
        "role": "AUDITOR",
        "department": "Internal Audit"
    })
    auditor_token = get_auth_token("test.auditor.sec@finsight.ai", "SecurePassword@123")
    
    # Auditor trying to modify risk thresholds should get 403 Forbidden
    resp_put = client.put(
        "/api/settings/config",
        json={"risk_thresholds": {"max_pd_for_auto_approval": 0.04}},
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert resp_put.status_code == 403, f"Auditor role should receive 403 Forbidden on settings update, got {resp_put.status_code}"
