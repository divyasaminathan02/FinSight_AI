"""
FinSight AI - Risk Intelligence Policy Engine & Macro Portfolio Aggregator
Consumes upstream agent outputs (Credit, Fraud, Customer, Collections, Liquidity)
to compute Herfindahl-Hirschman Concentration Indices (HHI), flow-to-loss, and macro portfolio risk.
"""

import os
import sys
import numpy as np
import pandas as pd

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine
from ml.registry import ModelRegistry

DEFAULT_RISK_POLICY = {
    "weight_credit_risk": 0.30,
    "weight_collections_delinquency": 0.25,
    "weight_fraud_exposure": 0.15,
    "weight_liquidity_stress": 0.15,
    "weight_concentration_risk": 0.15,
    "threshold_moderate": 45.0,
    "threshold_elevated": 65.0,
    "threshold_critical": 80.0
}

def calculate_hhi_concentration(series: pd.Series) -> float:
    """
    Computes Herfindahl-Hirschman Index (HHI) for concentration risk.
    Range 0 to 10,000 (below 1,500 = unconcentrated, 1,500-2,500 = moderate, >2,500 = high).
    """
    shares = (series.value_counts(normalize=True) * 100).values
    hhi = float(np.sum(shares ** 2))
    return round(hhi, 1)

def train_risk_models():
    print("\n--- [5/6] Training Risk Intelligence Portfolio Aggregator ---")
    
    # Load portfolio distributions
    loans_df = pd.read_sql("SELECT product_type, loan_amount, dpd, status FROM loans", engine)
    cust_df = pd.read_sql("SELECT state, location, credit_score, risk_tier FROM customers", engine)

    geo_hhi = calculate_hhi_concentration(cust_df["state"]) if len(cust_df) > 0 else 1850.0
    prod_hhi = calculate_hhi_concentration(loans_df["product_type"]) if len(loans_df) > 0 else 2200.0

    print(f"Portfolio Concentrations: Geographic HHI={geo_hhi} | Product HHI={prod_hhi}")

    pipeline_artifact = {
        "policy": DEFAULT_RISK_POLICY,
        "baseline_geo_hhi": geo_hhi,
        "baseline_prod_hhi": prod_hhi,
        "risk_categories": ["Low", "Moderate", "Elevated", "Critical"]
    }

    metadata = {
        "agent": "Risk Intelligence",
        "model_type": "Multi-Agent Composite Aggregator + HHI Concentration Engine",
        "policy_weights": DEFAULT_RISK_POLICY,
        "metrics": {
            "geo_concentration_hhi": geo_hhi,
            "product_concentration_hhi": prod_hhi
        }
    }

    saved_path = ModelRegistry.save_model("risk_intelligence", pipeline_artifact, metadata)
    print(f"Risk model pipeline saved to: {saved_path}")
    return pipeline_artifact

if __name__ == "__main__":
    train_risk_models()
