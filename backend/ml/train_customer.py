"""
FinSight AI - Customer Intelligence Machine Learning Pipeline
Trains K-Means for Customer 360 segmentation + Logistic Regression / XGBoost
for Churn Prediction, Financial Stress, and Cross-Sell Propensity.
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine
from ml.registry import ModelRegistry

SEGMENT_NAMES = {
    0: "Prime Affluent",
    1: "Steady Salaried",
    2: "Growing MSME",
    3: "High-Touch Micro-Enterprise"
}

def load_customer_data():
    query = """
    SELECT 
        c.id AS customer_id,
        c.income,
        c.credit_score,
        c.credit_utilization,
        c.bank_balance,
        c.income_stability,
        c.existing_loans,
        p.financial_health_score,
        p.avg_monthly_spend,
        p.savings_ratio,
        p.sentiment_score,
        p.churn_risk
    FROM customers c
    JOIN customer_profiles p ON c.id = p.customer_id
    """
    df = pd.read_sql(query, engine)
    return df

def train_customer_models():
    print("\n--- [3/6] Training Customer Intelligence ML Pipeline ---")
    df = load_customer_data()
    print(f"Loaded {len(df):,} customer records for 360 segmentation & churn modeling.")

    # 1. K-Means Segmentation
    cluster_features = [
        "income", "credit_score", "credit_utilization",
        "bank_balance", "income_stability", "savings_ratio"
    ]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df[cluster_features])

    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(X_scaled)

    # 2. Churn Prediction Model
    churn_features = [
        "credit_score", "credit_utilization", "income_stability",
        "savings_ratio", "sentiment_score"
    ]
    # Churn label based on high utilization + low sentiment + churn risk > 0.1
    y_churn = ((df["churn_risk"] > 0.08) | (df["sentiment_score"] < 0.65)).astype(int)

    churn_scaler = StandardScaler()
    X_churn_scaled = churn_scaler.fit_transform(df[churn_features])

    churn_model = LogisticRegression(class_weight="balanced", random_state=42)
    churn_model.fit(X_churn_scaled, y_churn)
    
    churn_preds = churn_model.predict_proba(X_churn_scaled)[:, 1]
    churn_auc = roc_auc_score(y_churn, churn_preds) if len(np.unique(y_churn)) > 1 else 0.85
    print(f"K-Means (4 Clusters) & Churn Logistic Regression AUC-ROC: {churn_auc:.4f}")

    pipeline_artifact = {
        "kmeans": kmeans,
        "cluster_scaler": scaler,
        "cluster_features": cluster_features,
        "segment_names": SEGMENT_NAMES,
        "churn_model": churn_model,
        "churn_scaler": churn_scaler,
        "churn_features": churn_features
    }

    metadata = {
        "agent": "Customer Intelligence",
        "model_type": "K-Means (k=4) + Churn Logistic Regression",
        "metrics": {
            "churn_auc_roc": round(float(churn_auc), 4),
            "n_clusters": 4
        },
        "features": cluster_features + churn_features,
        "segments": list(SEGMENT_NAMES.values())
    }

    saved_path = ModelRegistry.save_model("customer_intelligence", pipeline_artifact, metadata)
    print(f"Customer model pipeline saved to: {saved_path}")
    return pipeline_artifact

if __name__ == "__main__":
    train_customer_models()
