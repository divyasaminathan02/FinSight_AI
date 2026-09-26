"""
FinSight AI - Liquidity Intelligence Machine Learning Pipeline
Trains XGBoost Regressors with lag & seasonal features to forecast
7-day, 30-day, and 90-day cash inflows, cash outflows, and LCR safety buffers.
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_percentage_error
import xgboost as xgb

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine
from ml.registry import ModelRegistry

def generate_historical_cashflow_series():
    """
    Generates synthetic daily cash flows with seasonal EMI collection cycles.
    """
    dates = pd.date_range(end=pd.Timestamp.now(), periods=180, freq="D")
    base_inflow = 24.0
    base_outflow = 22.0

    # 5th-10th of every month: NACH EMI collection peak (+35% inflows)
    day_of_month = dates.day
    day_of_week = dates.dayofweek

    inflow_season = np.where((day_of_month >= 5) & (day_of_month <= 10), 1.35, 1.0)
    inflow_weekend = np.where(day_of_week >= 5, 0.4, 1.0)
    
    inflows = base_inflow * inflow_season * inflow_weekend + np.random.normal(0, 1.5, size=len(dates))
    inflows = np.maximum(inflows, 5.0)

    outflow_season = np.where((day_of_month >= 25) & (day_of_month <= 30), 1.25, 1.0)
    outflows = base_outflow * outflow_season * inflow_weekend + np.random.normal(0, 1.2, size=len(dates))
    outflows = np.maximum(outflows, 4.0)

    df = pd.DataFrame({
        "date": dates,
        "inflows_cr": inflows,
        "outflows_cr": outflows,
        "day_of_week": day_of_week,
        "day_of_month": day_of_month,
        "is_month_start": (day_of_month <= 10).astype(int),
        "is_month_end": (day_of_month >= 25).astype(int),
    })

    # Lag features
    df["inflow_lag_1"] = df["inflows_cr"].shift(1).bfill()
    df["inflow_lag_7"] = df["inflows_cr"].shift(7).bfill()
    df["inflow_roll_7"] = df["inflows_cr"].rolling(7, min_periods=1).mean()

    df["outflow_lag_1"] = df["outflows_cr"].shift(1).bfill()
    df["outflow_lag_7"] = df["outflows_cr"].shift(7).bfill()
    df["outflow_roll_7"] = df["outflows_cr"].rolling(7, min_periods=1).mean()

    return df

def train_liquidity_models():
    print("\n--- [6/6] Training Liquidity Intelligence ALM Time-Series Pipeline ---")
    df = generate_historical_cashflow_series()
    
    feature_cols = [
        "day_of_week", "day_of_month", "is_month_start", "is_month_end",
        "inflow_lag_1", "inflow_lag_7", "inflow_roll_7",
        "outflow_lag_1", "outflow_lag_7", "outflow_roll_7"
    ]
    X = df[feature_cols]

    # 1. Inflow Forecaster Model
    model_inflow = xgb.XGBRegressor(n_estimators=100, max_depth=3, learning_rate=0.08, random_state=42)
    model_inflow.fit(X, df["inflows_cr"])
    inflow_mape = mean_absolute_percentage_error(df["inflows_cr"], model_inflow.predict(X))

    # 2. Outflow Forecaster Model
    model_outflow = xgb.XGBRegressor(n_estimators=100, max_depth=3, learning_rate=0.08, random_state=42)
    model_outflow.fit(X, df["outflows_cr"])
    outflow_mape = mean_absolute_percentage_error(df["outflows_cr"], model_outflow.predict(X))

    print(f"Liquidity XGBoost Regressors Trained: Inflow MAPE={inflow_mape:.2%}, Outflow MAPE={outflow_mape:.2%}")

    pipeline_artifact = {
        "model_inflow": model_inflow,
        "model_outflow": model_outflow,
        "feature_cols": feature_cols,
        "last_known_balance_cr": 126.40,
        "target_lcr_ratio": 1.45
    }

    metadata = {
        "agent": "Liquidity Intelligence",
        "model_type": "XGBoost Auto-regressive Time-Series Lag Forecaster",
        "metrics": {
            "inflow_mape": round(float(inflow_mape), 4),
            "outflow_mape": round(float(outflow_mape), 4)
        },
        "forecast_horizons": ["7_days", "30_days", "90_days"]
    }

    saved_path = ModelRegistry.save_model("liquidity_intelligence", pipeline_artifact, metadata)
    print(f"Liquidity model pipeline saved to: {saved_path}")
    return pipeline_artifact

if __name__ == "__main__":
    train_liquidity_models()
