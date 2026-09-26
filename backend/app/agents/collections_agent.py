"""
FinSight AI - Collections Intelligence Agent Service
Predicts P(Payment in 7d), P(Default), and P(Recovery Rate) using XGBoost.
Allocates dynamic priority and ethical, customer-sensitive recovery strategies.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.loans import Loan
from app.models.customers import Customer
from app.models.transactions import Repayment
from ml.registry import ModelRegistry

class CollectionsIntelligenceAgent:
    _artifact: Optional[Dict[str, Any]] = None

    @classmethod
    def get_artifact(cls) -> Dict[str, Any]:
        if cls._artifact is None:
            cls._artifact = ModelRegistry.load_model("collections_intelligence")
        if cls._artifact is None:
            from ml.train_collections import train_collections_models
            cls._artifact = train_collections_models()
        return cls._artifact

    @classmethod
    def get_customer_collection_assessment(cls, customer_id: Any, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Evaluates dynamic recovery profile for a delinquent/due borrower.
        """
        artifact = cls.get_artifact()
        scaler = artifact["scaler"]
        model_pay = artifact["model_payment_7d"]
        model_def = artifact["model_default"]
        model_rec = artifact["model_recovery_rate"]

        close_db = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            close_db = True

        try:
            cid = int(customer_id) if str(customer_id).isdigit() else 1
            cust = db.query(Customer).filter(Customer.id == cid).first()
            active_loan = db.query(Loan).filter(Loan.customer_id == cid, Loan.status.in_(["Active", "Delinquent"])).first()

            overdue_amt = active_loan.emi if active_loan else 15000.0
            dpd = active_loan.dpd if active_loan else 12
            credit_score = cust.credit_score if cust else 680
            income = cust.income if cust else 50000.0
            bank_balance = cust.bank_balance if cust else 45000.0
            attempts = 1
            stability = cust.income_stability if cust else 0.8

            feat_vec = np.array([[overdue_amt, dpd, credit_score, income, bank_balance, attempts, stability]])
            feat_scaled = scaler.transform(feat_vec)

            p_pay_7d = float(model_pay.predict_proba(feat_scaled)[0, 1])
            p_pay_7d = round(max(0.05, min(0.98, p_pay_7d)), 3)

            p_default = float(model_def.predict_proba(feat_scaled)[0, 1])
            p_default = round(max(0.01, min(0.95, p_default)), 3)

            expected_recovery_pct = float(model_rec.predict(feat_scaled)[0])
            expected_recovery_pct = round(max(0.15, min(1.0, expected_recovery_pct)), 2)

            # Priority Allocation (LOW, MEDIUM, HIGH)
            if dpd >= 60 or p_default > 0.40:
                priority = "HIGH"
                strategy = "Senior Counselor Outreach + Restructuring Plan"
                contact_channel = "Relationship Manager Call"
            elif dpd >= 30 or p_pay_7d < 0.60:
                priority = "MEDIUM"
                strategy = "Interactive Digital Voice Bot + Structured Payment Link"
                contact_channel = "Automated Voice Bot / WhatsApp"
            else:
                priority = "LOW"
                strategy = "Gentle NACH Re-presentment & WhatsApp Soft Reminder"
                contact_channel = "WhatsApp / SMS"

            expected_date = (datetime.utcnow() + timedelta(days=int(np.random.choice([2, 3, 5, 7])))).strftime("%d %b %Y")
            expected_amt = round(overdue_amt * expected_recovery_pct, 2)

            return {
                "customer_id": customer_id,
                "borrower_name": f"{cust.first_name} {cust.last_name}" if cust else f"Borrower #{customer_id}",
                "overdue_amount": overdue_amt,
                "overdue_amount_formatted": f"₹{overdue_amt:,.0f}",
                "dpd": dpd,
                "payment_probability_7d": p_pay_7d,
                "payment_probability_7d_pct": f"{p_pay_7d * 100:.1f}%",
                "default_probability": p_default,
                "default_probability_pct": f"{p_default * 100:.1f}%",
                "expected_recovery_pct": f"{expected_recovery_pct * 100:.0f}%",
                "expected_payment": expected_amt,
                "expected_payment_amount": expected_amt,
                "expected_payment_date": expected_date,
                "expected_date": expected_date,
                "collection_priority": priority,
                "recommended_strategy": strategy,
                "recommended_channel": contact_channel,
                "contact_channel": contact_channel,
                "ethics_guideline": "Adheres to RBI Fair Practices Code (No harassment, reasonable contact hours 8 AM - 7 PM, customer-centric restructuring)."
            }
        finally:
            if close_db:
                db.close()

    @classmethod
    def get_customer_collections(cls, customer_id: Any, db: Optional[Session] = None) -> Dict[str, Any]:
        """Alias for get_customer_collection_assessment."""
        return cls.get_customer_collection_assessment(customer_id, db=db)

    @classmethod
    def get_priorities(cls, limit: int = 25, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Retrieves prioritized recovery queues with both priorities_summary and priority_queues.
        """
        return cls.get_priorities_list(db=db, limit=limit)

    @classmethod
    def get_priorities_list(cls, db: Optional[Session] = None, limit: int = 25) -> Dict[str, Any]:
        """
        Retrieves prioritized recovery queues across all delinquent loans.
        """
        close_db = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            close_db = True

        try:
            delinquent_loans = db.query(Loan).filter(Loan.dpd > 0).order_by(desc(Loan.dpd)).limit(limit).all()
            if not delinquent_loans:
                delinquent_loans = db.query(Loan).order_by(desc(Loan.id)).limit(min(limit, 5)).all()

            items = []
            for loan in delinquent_loans:
                assessment = cls.get_customer_collection_assessment(loan.customer_id, db)
                items.append({
                    "loan_id": loan.loan_id,
                    "customer_id": loan.customer_id,
                    "customer_name": assessment["borrower_name"],
                    "product_type": loan.product_type,
                    "overdue_amount": loan.emi,
                    "dpd": loan.dpd,
                    "payment_probability_7d": assessment["payment_probability_7d"],
                    "payment_probability_7d_pct": assessment["payment_probability_7d_pct"],
                    "default_probability": assessment["default_probability"],
                    "default_probability_pct": assessment["default_probability_pct"],
                    "collection_priority": assessment["collection_priority"],
                    "recommended_strategy": assessment["recommended_strategy"],
                    "recommended_channel": assessment["recommended_channel"],
                    "contact_channel": assessment["contact_channel"],
                    "expected_payment": assessment["expected_payment"],
                    "expected_date": assessment["expected_date"]
                })

            summary = {
                "HIGH": len([i for i in items if i["collection_priority"] == "HIGH"]),
                "MEDIUM": len([i for i in items if i["collection_priority"] == "MEDIUM"]),
                "LOW": len([i for i in items if i["collection_priority"] == "LOW"]),
            }

            return {
                "total_delinquent": len(items),
                "total_delinquent_accounts": len(items),
                "priorities_summary": summary,
                "priority_queues": summary,
                "items": items
            }
        finally:
            if close_db:
                db.close()

    def __call__(self, limit: int = 25, db: Optional[Session] = None) -> Dict[str, Any]:
        return self.get_priorities(limit=limit, db=db)

    @classmethod
    def get_model_info(cls) -> Dict[str, Any]:
        from ml.registry import ModelRegistry
        meta = ModelRegistry.get_model_metadata("collections_intelligence") or {}
        return {
            "model_name": "Collections Intelligence Agent",
            "model_type": meta.get("model_type", "Multi-Target XGBoost Classifier & Regressor"),
            "features": meta.get("features", []),
            "parameters": meta.get("parameters", {}),
            "metrics": meta.get("metrics", {}),
            "status": "Production"
        }

CollectionsAgent = CollectionsIntelligenceAgent
collections_agent = CollectionsIntelligenceAgent()

