"""
FinSight AI - Phase 2 Intelligence Agents Unit & Integration Tests
Tests all 6 ML intelligence pipelines:
1. Credit Intelligence (XGBoost + SHAP feature attribution + Thresholds)
2. Fraud Intelligence (Isolation Forest + NetworkX graph collision analysis)
3. Customer Intelligence (Customer 360 + K-Means segmentation + Churn)
4. Collections Intelligence (P(Pay 7d) + Recovery + Ethical channels)
5. Risk Intelligence (Portfolio HHI concentration + Policy weights)
6. Liquidity Intelligence (XGBoost 7d/30d/90d cashflow forecaster + Stress testing)
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.agents.credit_agent import CreditIntelligenceAgent
from app.agents.fraud_agent import FraudIntelligenceAgent
from app.agents.customer_agent import CustomerIntelligenceAgent
from app.agents.collections_agent import CollectionsIntelligenceAgent
from app.agents.risk_agent import RiskIntelligenceAgent
from app.agents.liquidity_agent import LiquidityIntelligenceAgent

client = TestClient(app)

# ==========================================
# 1. CREDIT INTELLIGENCE AGENT TESTS
# ==========================================

def test_credit_agent_direct_inference():
    """Verify Credit agent inference produces real scores and SHAP explanations."""
    agent = CreditIntelligenceAgent()
    sample_input = {
        "income": 120000.0,
        "age": 35,
        "employment_type": "Salaried",
        "credit_score": 780,
        "existing_loans": 1,
        "total_emi": 15000.0,
        "debt_to_income": 0.125,
        "credit_utilization": 0.20,
        "previous_dpd": 0,
        "previous_defaults": 0,
        "loan_amount": 300000.0,
        "tenure": 24,
        "bank_balance": 180000.0,
        "income_stability": 0.95
    }
    result = agent.evaluate(sample_input)
    assert "risk_score" in result
    assert "probability_of_default" in result
    assert "decision" in result
    assert result["decision"] in ["APPROVE", "REVIEW", "REJECT"]
    assert "shap_explanations" in result
    assert "top_positive_risk_contributors" in result["shap_explanations"]
    assert "top_negative_risk_contributors" in result["shap_explanations"]
    assert len(result["shap_explanations"]["top_positive_risk_contributors"]) > 0

def test_credit_api_endpoints():
    """Test /api/credit endpoints."""
    # Test evaluation
    payload = {
        "income": 95000.0,
        "age": 30,
        "employment_type": "Salaried",
        "credit_score": 750,
        "existing_loans": 1,
        "total_emi": 12000.0,
        "debt_to_income": 0.126,
        "credit_utilization": 0.25,
        "previous_dpd": 0,
        "previous_defaults": 0,
        "loan_amount": 250000.0,
        "tenure": 18,
        "bank_balance": 150000.0,
        "income_stability": 0.90
    }
    eval_resp = client.post("/api/credit/evaluate", json=payload)
    assert eval_resp.status_code == 200
    data = eval_resp.json()
    assert data["decision"] in ["APPROVE", "REVIEW", "REJECT"]
    assert "shap_explanations" in data

    # Test model info
    info_resp = client.get("/api/credit/model-info")
    assert info_resp.status_code == 200
    assert "model_name" in info_resp.json()

    # Test metrics
    metrics_resp = client.get("/api/credit/metrics")
    assert metrics_resp.status_code == 200
    assert "approval_rate_pct" in metrics_resp.json()

# ==========================================
# 2. FRAUD INTELLIGENCE AGENT TESTS
# ==========================================

def test_fraud_agent_direct_inference():
    """Verify Fraud agent detects anomalies and generates relationship subgraphs."""
    agent = FraudIntelligenceAgent()
    sample_app = {
        "customer_id": "CUST-99999",
        "amount": 250000.0,
        "channel": "MOBILE_APP",
        "device_id": "DEV-SYNDICATE-01",
        "phone_number": "+91-9876543210",
        "address": "Flat 101, Residency Towers",
        "location": "Bengaluru",
        "velocity_1h": 4,
        "velocity_24h": 9
    }
    result = agent.analyze_application(sample_app)
    assert "fraud_risk" in result
    assert "fraud_probability" in result
    assert "risk_signals" in result
    assert "related_entities" in result
    assert "recommendation" in result

def test_fraud_api_endpoints():
    """Test /api/fraud endpoints."""
    # Test analyze
    payload = {
        "customer_id": "CUST-00001",
        "amount": 50000.0,
        "channel": "WEB",
        "device_id": "DEV-00101",
        "phone_number": "+91-9800011122",
        "address": "123 Indiranagar, Bangalore",
        "location": "Bengaluru",
        "velocity_1h": 1,
        "velocity_24h": 1
    }
    analyze_resp = client.post("/api/fraud/analyze", json=payload)
    assert analyze_resp.status_code == 200
    data = analyze_resp.json()
    assert data["fraud_risk"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    # Test alerts list
    alerts_resp = client.get("/api/fraud/alerts")
    assert alerts_resp.status_code == 200
    assert "alerts" in alerts_resp.json()

    # Test network graph for customer
    network_resp = client.get("/api/fraud/network/CUST-00001")
    assert network_resp.status_code == 200
    net_data = network_resp.json()
    assert "nodes" in net_data
    assert "links" in net_data

# ==========================================
# 3. CUSTOMER INTELLIGENCE AGENT TESTS
# ==========================================

def test_customer_agent_360():
    """Verify Customer 360 profile synthesis and K-Means segmentation."""
    agent = CustomerIntelligenceAgent()
    c360 = agent.get_customer_360("CUST-00001")
    assert "financial_health_score" in c360
    assert "customer_segment" in c360
    assert "credit_health" in c360
    assert "repayment_behavior" in c360
    assert "churn_risk" in c360
    assert "financial_stress" in c360
    assert "cross_sell" in c360

def test_customer_api_endpoints():
    """Test /api/customers endpoints."""
    # Test 360
    resp_360 = client.get("/api/customers/CUST-00001/360")
    assert resp_360.status_code == 200
    data_360 = resp_360.json()
    assert data_360["customer_id"] == "CUST-00001"

    # Test health
    resp_health = client.get("/api/customers/CUST-00001/health")
    assert resp_health.status_code == 200
    assert "financial_health_score" in resp_health.json()

    # Test segments
    resp_segments = client.get("/api/customers/segments")
    assert resp_segments.status_code == 200
    data_seg = resp_segments.json()
    assert "segments" in data_seg
    assert len(data_seg["segments"]) > 0

# ==========================================
# 4. COLLECTIONS INTELLIGENCE AGENT TESTS
# ==========================================

def test_collections_agent_priorities():
    """Verify Collections Agent priority ranking and ethical strategy assignment."""
    agent = CollectionsIntelligenceAgent()
    priorities = agent.get_priorities(limit=10)
    assert "items" in priorities
    assert "total_delinquent" in priorities
    assert "priorities_summary" in priorities
    if priorities["items"]:
        item = priorities["items"][0]
        assert "payment_probability_7d" in item
        assert "default_probability" in item
        assert "recommended_channel" in item

def test_collections_api_endpoints():
    """Test /api/collections endpoints."""
    # Test priorities
    resp_prio = client.get("/api/collections/priorities")
    assert resp_prio.status_code == 200
    assert "items" in resp_prio.json()

    # Test performance
    resp_perf = client.get("/api/collections/performance")
    assert resp_perf.status_code == 200
    assert "recovery_rate_pct" in resp_perf.json()

# ==========================================
# 5. RISK INTELLIGENCE AGENT TESTS
# ==========================================

def test_risk_agent_portfolio_aggregation():
    """Verify Risk Agent portfolio aggregation and HHI concentration calculations."""
    agent = RiskIntelligenceAgent()
    port = agent.get_portfolio_risk(w_credit=0.4, w_delinquency=0.3, w_fraud=0.1, w_liquidity=0.1, w_concentration=0.1)
    assert "portfolio_risk_score" in port
    assert "risk_category" in port
    assert "concentration" in port
    assert "product_hhi" in port["concentration"]
    assert "geo_hhi" in port["concentration"]

def test_risk_api_endpoints():
    """Test /api/risk endpoints."""
    # Test portfolio
    resp_port = client.get("/api/risk/portfolio?w_credit=0.35&w_delinquency=0.25")
    assert resp_port.status_code == 200
    assert "portfolio_risk_score" in resp_port.json()

    # Test signals
    resp_sig = client.get("/api/risk/signals")
    assert resp_sig.status_code == 200
    assert "signals" in resp_sig.json()

    # Test trends
    resp_trend = client.get("/api/risk/trends")
    assert resp_trend.status_code == 200
    assert "data" in resp_trend.json()

# ==========================================
# 6. LIQUIDITY INTELLIGENCE AGENT TESTS
# ==========================================

def test_liquidity_agent_forecast():
    """Verify Liquidity Agent multi-horizon forecasting and stress scenarios."""
    agent = LiquidityIntelligenceAgent()
    # 7-day forecast
    f7 = agent.get_forecast(horizon_days=7)
    assert f7["horizon_days"] == 7
    assert len(f7["daily_projections"]) == 7
    assert "forecasted_liquidity_cr" in f7

    # 30-day forecast
    f30 = agent.get_forecast(horizon_days=30)
    assert f30["horizon_days"] == 30
    assert len(f30["daily_projections"]) == 30

    # Scenarios
    scenarios = agent.get_scenarios()
    assert "scenarios" in scenarios
    assert len(scenarios["scenarios"]) >= 3

def test_liquidity_api_endpoints():
    """Test /api/liquidity endpoints."""
    # Test current
    resp_curr = client.get("/api/liquidity/current")
    assert resp_curr.status_code == 200
    assert "current_liquidity_cr" in resp_curr.json()

    # Test forecast
    resp_fc = client.get("/api/liquidity/forecast?horizon_days=30")
    assert resp_fc.status_code == 200
    assert resp_fc.json()["horizon_days"] == 30

    # Test scenarios
    resp_sc = client.get("/api/liquidity/scenarios")
    assert resp_sc.status_code == 200
    assert "scenarios" in resp_sc.json()

# ==========================================
# 7. EDGE CASES, THRESHOLDS & FEATURE TESTS
# ==========================================

def test_feature_engineering_and_thresholds():
    """Verify Credit DTI calculation and threshold decision boundaries."""
    agent = CreditIntelligenceAgent()
    # High quality applicant -> APPROVE
    prime_app = {
        "income": 200000.0,
        "age": 40,
        "employment_type": "Salaried",
        "credit_score": 820,
        "existing_loans": 0,
        "total_emi": 5000.0,
        "credit_utilization": 0.10,
        "previous_dpd": 0,
        "previous_defaults": 0,
        "loan_amount": 500000.0,
        "tenure": 24,
        "bank_balance": 350000.0,
        "income_stability": 0.98
    }
    prime_res = agent.evaluate(prime_app)
    assert prime_res["decision"] == "APPROVE"
    assert prime_res["risk_category"] == "Low"

    # High risk applicant -> REJECT
    subprime_app = {
        "income": 25000.0,
        "age": 22,
        "employment_type": "Gig Economy Worker",
        "credit_score": 520,
        "existing_loans": 4,
        "total_emi": 20000.0,
        "credit_utilization": 0.95,
        "previous_dpd": 65,
        "previous_defaults": 2,
        "loan_amount": 800000.0,
        "tenure": 12,
        "bank_balance": 2000.0,
        "income_stability": 0.40
    }
    subprime_res = agent.evaluate(subprime_app)
    assert subprime_res["decision"] == "REJECT"

def test_missing_customer_and_loan_handling():
    """Verify API handles non-existent IDs gracefully without unhandled crashes."""
    # Non-existent customer 360
    resp_360 = client.get("/api/customers/NON_EXISTENT_ID_999999/360")
    assert resp_360.status_code == 200
    data = resp_360.json()
    assert "financial_health_score" in data

    # Non-existent customer collection assessment
    resp_col = client.get("/api/collections/9999999")
    assert resp_col.status_code == 200
    col_data = resp_col.json()
    assert "collection_priority" in col_data

    # Non-existent customer network
    resp_net = client.get("/api/fraud/network/CUST-9999999")
    assert resp_net.status_code == 200
    net_data = resp_net.json()
    assert "nodes" in net_data

def test_fraud_syndicate_and_velocity_detection():
    """Verify fraud detection detects device reuse, application velocity, and critical risk."""
    agent = FraudIntelligenceAgent()
    syndicate_payload = {
        "customer_id": "CUST-SYNDICATE-TEST",
        "device_id": "DEV-SYNDICATE-CLUSTER-X",
        "amount": 1200000.0,
        "velocity_1h": 5,
        "velocity_24h": 12,
        "income": 30000.0,
        "bank_balance": 5000.0
    }
    result = agent.analyze_application(syndicate_payload)
    assert result["fraud_risk"] == "CRITICAL"
    assert result["fraud_probability"] > 0.60
    assert result["recommendation"] == "BLOCK_SYNDICATE"
    assert any("Velocity" in s["signal"] or "Collision" in s["signal"] for s in result["risk_signals"])

def test_liquidity_forecasting_multi_horizon():
    """Verify liquidity agent calculates 7d, 30d, and 90d forecasts and potential gap."""
    agent = LiquidityIntelligenceAgent()
    for horizon in [7, 30, 90]:
        fc = agent.get_forecast(horizon_days=horizon)
        assert fc["horizon_days"] == horizon
        assert len(fc["daily_projections"]) == horizon
        assert fc["expected_inflows_cr"] > 0
        assert fc["expected_outflows_cr"] > 0
        assert "potential_gap" in fc
        assert "liquidity_buffer" in fc
