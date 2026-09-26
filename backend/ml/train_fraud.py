"""
FinSight AI - Fraud Intelligence Machine Learning Pipeline
Trains an Isolation Forest anomaly detector + NetworkX Bipartite Graph
to detect device reuse, velocity anomalies, and identity collisions.
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import networkx as nx

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine
from ml.registry import ModelRegistry

def load_fraud_data():
    """
    Loads applications and transaction patterns from database.
    """
    app_query = """
    SELECT 
        a.id AS application_id,
        a.customer_id,
        a.device_id,
        a.phone_hash,
        a.address_hash,
        a.requested_amount,
        a.application_velocity,
        c.income,
        c.bank_balance
    FROM loan_applications a
    JOIN customers c ON a.customer_id = c.id
    """
    df = pd.read_sql(app_query, engine)
    return df

def train_fraud_models():
    print("\n--- [2/6] Training Fraud Intelligence ML Pipeline ---")
    df = load_fraud_data()
    print(f"Loaded {len(df):,} application records for fraud graph & anomaly training.")

    # 1. Build Bipartite Multi-Entity Graph with NetworkX
    G = nx.Graph()
    for _, row in df.iterrows():
        cust_node = f"CUST_{row['customer_id']}"
        dev_node = f"DEV_{row['device_id']}"
        phone_node = f"PHONE_{row['phone_hash']}"
        addr_node = f"ADDR_{row['address_hash']}"

        G.add_node(cust_node, node_type="customer", customer_id=row["customer_id"])
        G.add_node(dev_node, node_type="device", device_id=row["device_id"])
        G.add_node(phone_node, node_type="phone", phone_hash=row["phone_hash"])
        G.add_node(addr_node, node_type="address", address_hash=row["address_hash"])

        G.add_edge(cust_node, dev_node, relation="uses_device")
        G.add_edge(cust_node, phone_node, relation="uses_phone")
        G.add_edge(cust_node, addr_node, relation="lives_at")

    print(f"Constructed Fraud Entity Graph: {G.number_of_nodes():,} nodes, {G.number_of_edges():,} relations.")

    # 2. Extract Graph & Behavioral Features for Isolation Forest
    features_list = []
    for _, row in df.iterrows():
        cust_node = f"CUST_{row['customer_id']}"
        dev_node = f"DEV_{row['device_id']}"
        
        # Count degrees of connected entities (how many applicants share this device/phone/address)
        dev_degree = G.degree(dev_node) if dev_node in G else 1
        phone_degree = G.degree(f"PHONE_{row['phone_hash']}") if f"PHONE_{row['phone_hash']}" in G else 1
        addr_degree = G.degree(f"ADDR_{row['address_hash']}") if f"ADDR_{row['address_hash']}" in G else 1

        amount_to_income = row["requested_amount"] / max(row["income"], 1.0)
        amount_to_balance = row["requested_amount"] / max(row["bank_balance"], 1.0)

        features_list.append([
            row["application_velocity"],
            dev_degree,
            phone_degree,
            addr_degree,
            amount_to_income,
            amount_to_balance,
            row["requested_amount"]
        ])

    X_fraud = np.array(features_list)

    # 3. Train Isolation Forest Anomaly Model
    iso_forest = IsolationForest(
        n_estimators=120,
        contamination=0.035,  # ~3.5% estimated anomaly rate
        max_samples="auto",
        random_state=42
    )
    iso_forest.fit(X_fraud)

    # Evaluate anomaly scores
    anomaly_scores = -iso_forest.score_samples(X_fraud)
    threshold_95th = np.percentile(anomaly_scores, 95)
    print(f"Isolation Forest Anomaly Model trained. 95th percentile score threshold: {threshold_95th:.4f}")

    pipeline_artifact = {
        "isolation_forest": iso_forest,
        "graph": G,
        "feature_names": [
            "application_velocity",
            "device_sharing_degree",
            "phone_sharing_degree",
            "address_sharing_degree",
            "amount_to_income_ratio",
            "amount_to_balance_ratio",
            "requested_amount"
        ],
        "anomaly_threshold": float(threshold_95th)
    }

    metadata = {
        "agent": "Fraud Intelligence",
        "model_type": "Isolation Forest + NetworkX Bipartite Entity Graph",
        "metrics": {
            "graph_nodes": G.number_of_nodes(),
            "graph_edges": G.number_of_edges(),
            "anomaly_threshold_95th": round(float(threshold_95th), 4)
        },
        "features": pipeline_artifact["feature_names"],
        "parameters": {
            "n_estimators": 120,
            "contamination": 0.035
        }
    }

    saved_path = ModelRegistry.save_model("fraud_intelligence", pipeline_artifact, metadata)
    print(f"Fraud model pipeline saved to: {saved_path}")
    return pipeline_artifact

if __name__ == "__main__":
    train_fraud_models()
