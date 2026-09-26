"""
FinSight AI - Credit Intelligence Agent Service
Executes XGBoost underwriting inference, dynamic loan recommendation,
and real-time SHAP feature attribution explanations.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from ml.registry import ModelRegistry

class CreditIntelligenceAgent:
    _artifact: Optional[Dict[str, Any]] = None

    @classmethod
    def get_artifact(cls) -> Dict[str, Any]:
        if cls._artifact is None:
            cls._artifact = ModelRegistry.load_model("credit_intelligence")
        if cls._artifact is None:
            from ml.train_credit import train_credit_models
            cls._artifact = train_credit_models()
        return cls._artifact

    @classmethod
    def evaluate_credit_application(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs credit risk evaluation using XGBoost and SHAP TreeExplainer.
        """
        artifact = cls.get_artifact()
        preprocessor = artifact["preprocessor"]
        model = artifact["model"]
        explainer = artifact["explainer"]
        thresholds = artifact["thresholds"]
        all_feature_names = artifact["feature_names"]

        # 1. Feature Preparation with safe defaults
        income = float(data.get("income") or 50000.0)
        loan_amount = float(data.get("loan_amount") or 250000.0)
        tenure = int(data.get("tenure") or 36)
        total_emi = float(data.get("total_emi") or 7500.0)
        credit_score = int(data.get("credit_score") or 700)
        
        dti_raw = data.get("debt_to_income")
        dti = float(dti_raw) if dti_raw is not None else round(total_emi / max(income, 1.0), 3)
        
        row_dict = {
            "income": income,
            "age": int(data.get("age") or 35),
            "employment_type": str(data.get("employment_type") or "Salaried"),
            "credit_score": credit_score,
            "existing_loans": int(data.get("existing_loans") if data.get("existing_loans") is not None else 1),
            "total_emi": total_emi,
            "debt_to_income": dti,
            "credit_utilization": float(data.get("credit_utilization") if data.get("credit_utilization") is not None else 0.35),
            "previous_dpd": int(data.get("previous_dpd") if data.get("previous_dpd") is not None else 0),
            "previous_defaults": int(data.get("previous_defaults") if data.get("previous_defaults") is not None else 0),
            "loan_amount": loan_amount,
            "tenure": tenure,
            "bank_balance": float(data.get("bank_balance") or 75000.0),
            "income_stability": float(data.get("income_stability") if data.get("income_stability") is not None else 0.85)
        }

        input_df = pd.DataFrame([row_dict])
        X_trans = preprocessor.transform(input_df)

        # 2. Model Inference
        proba = float(model.predict_proba(X_trans)[0, 1])
        proba = round(max(0.005, min(0.985, proba)), 4)
        
        # Credit Risk Score on 0 to 100 scale (lower is safer)
        risk_score = round(proba * 100.0, 1)

        # 3. Decision Logic based on Configurable Policy Thresholds
        if proba <= thresholds["approve_max_pd"]:
            decision = "APPROVE"
            risk_category = "Low"
            rec_amount = loan_amount
        elif proba <= thresholds["review_max_pd"]:
            decision = "REVIEW"
            risk_category = "Moderate"
            max_monthly_capacity = income * 0.45
            rec_amount = min(loan_amount, max_monthly_capacity * (tenure * 0.7))
        else:
            decision = "REJECT"
            risk_category = "High" if proba < 0.35 else "Critical"
            rec_amount = 0.0

        rec_amount = float(round(rec_amount, -3))

        # 4. Real-time SHAP Explanations
        shap_explanation = explainer(X_trans)
        shap_vals = shap_explanation.values[0]
        base_val = float(shap_explanation.base_values[0]) if hasattr(shap_explanation.base_values, '__len__') else float(shap_explanation.base_values)

        feature_importance = []
        for name, val in zip(all_feature_names, shap_vals):
            display_name = name.replace("emp_", "").replace("_", " ").title()
            feature_importance.append({
                "feature": name,
                "display_name": display_name,
                "shap_value": round(float(val), 4),
                "impact": "Increases Risk" if val > 0 else "Decreases Risk"
            })

        positive_contributors = sorted([f for f in feature_importance if f["shap_value"] > 0], key=lambda x: x["shap_value"], reverse=True)[:5]
        negative_contributors = sorted([f for f in feature_importance if f["shap_value"] < 0], key=lambda x: x["shap_value"])[:5]

        # Structure explanations supporting all key conventions
        shap_dict = {
            "base_value": base_val,
            "top_positive_risk_contributors": positive_contributors,
            "top_negative_risk_contributors": negative_contributors,
            "top_positive_contributors": positive_contributors,
            "top_negative_contributors": negative_contributors,
            "all_contributions": feature_importance
        }

        return {
            "risk_score": risk_score,
            "probability_of_default": proba,
            "probability_of_default_pct": f"{proba * 100:.2f}%",
            "risk_category": risk_category,
            "recommended_amount": rec_amount,
            "recommended_amount_formatted": f"₹{rec_amount:,.0f}",
            "decision": decision,
            "thresholds_applied": thresholds,
            "shap_explanations": shap_dict,
            "shap_explanation": shap_dict,
            "evaluation_timestamp": pd.Timestamp.now().isoformat()
        }

    @classmethod
    def evaluate(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Alias for evaluate_credit_application."""
        return cls.evaluate_credit_application(data)

    def evaluate_instance(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.evaluate_credit_application(data)

    @classmethod
    def get_model_info(cls) -> Dict[str, Any]:
        meta = ModelRegistry.get_model_metadata("credit_intelligence") or {}
        return {
            "model_name": "Credit Intelligence Agent",
            "model_type": meta.get("model_type", "XGBoost Classifier + SHAP TreeExplainer"),
            "baseline_type": meta.get("baseline_type", "Logistic Regression"),
            "last_trained": meta.get("last_trained", "2026-09-26T00:00:00Z"),
            "features": meta.get("features", []),
            "parameters": meta.get("parameters", {}),
            "metrics": meta.get("metrics", {}),
            "status": "Production"
        }

    # Support instance method calls
    def __call__(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.evaluate_credit_application(data)

CreditAgent = CreditIntelligenceAgent
credit_agent = CreditIntelligenceAgent()
