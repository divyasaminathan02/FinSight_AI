"""
FinSight AI - Unified Multi-Agent Machine Learning Trainer
Executes training pipelines for all six intelligence agents:
1. Credit Intelligence (XGBoost + SHAP TreeExplainer)
2. Fraud Intelligence (Isolation Forest + NetworkX Entity Graph)
3. Customer Intelligence (K-Means + Churn Model)
4. Collections Intelligence (XGBoost P_Pay & Priority Scorer)
5. Risk Intelligence (Macro Portfolio & Concentration Aggregator)
6. Liquidity Intelligence (XGBoost ALM Lag Forecaster)
"""

import time
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.train_credit import train_credit_models
from ml.train_fraud import train_fraud_models
from ml.train_customer import train_customer_models
from ml.train_collections import train_collections_models
from ml.train_risk import train_risk_models
from ml.train_liquidity import train_liquidity_models

def train_all_agents():
    start_time = time.time()
    print("================================================================")
    print("  FinSight AI - Six Coordinated Agents Machine Learning Pipeline ")
    print("================================================================")

    train_credit_models()
    train_fraud_models()
    train_customer_models()
    train_collections_models()
    train_risk_models()
    train_liquidity_models()

    elapsed = time.time() - start_time
    print("\n================================================================")
    print(f" ALL 6 AGENT ML PIPELINES TRAINED & PERSISTED IN {elapsed:.2f} SECONDS!")
    print("================================================================")

if __name__ == "__main__":
    train_all_agents()
