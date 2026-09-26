"""
FinSight AI - Configurable Business Decision Engine
Applies auditable, regulatory-aligned credit and risk underwriting rules to multi-agent signals.
Strictly separated from LLM reasoning: LLM provides natural-language explanation, not numerical verdicts.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class PolicyConfig(BaseModel):
    policy_version: str = "FINSIGHT-POL-2026.1"
    min_credit_score: float = Field(default=600.0, description="Minimum credit score for underwriting")
    prime_credit_score: float = Field(default=720.0, description="Prime approval threshold")
    max_probability_of_default: float = Field(default=0.35, description="Max acceptable PD")
    max_dti: float = Field(default=0.55, description="Maximum permitted Debt-to-Income ratio")
    max_fraud_probability: float = Field(default=0.45, description="Max fraud score before review")
    critical_fraud_probability: float = Field(default=0.75, description="Critical fraud score for rejection")
    max_previous_defaults: int = Field(default=0, description="Max allowed prior defaults")
    max_previous_dpd: int = Field(default=30, description="Max allowed previous DPD")
    min_financial_health: float = Field(default=45.0, description="Minimum financial health score (0-100)")
    max_financial_stress: float = Field(default=75.0, description="Maximum acceptable financial stress (0-100)")
    min_collection_probability: float = Field(default=0.50, description="Minimum expected recovery probability")

class DecisionEngine:
    """
    Evaluates multi-agent signals against configured NBFC underwriting rules.
    """
    def __init__(self, policy: Optional[PolicyConfig] = None):
        self.policy = policy or PolicyConfig()

    def evaluate(
        self,
        application: Dict[str, Any],
        credit_result: Optional[Dict[str, Any]] = None,
        fraud_result: Optional[Dict[str, Any]] = None,
        customer_result: Optional[Dict[str, Any]] = None,
        collections_result: Optional[Dict[str, Any]] = None,
        risk_result: Optional[Dict[str, Any]] = None,
        liquidity_result: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute deterministic policy evaluation.
        Possible decisions: 'APPROVE', 'REVIEW REQUIRED', 'REJECT'.
        """
        reasons: List[str] = []
        risk_factors: List[str] = []
        positive_factors: List[str] = []
        warnings: List[str] = []
        rule_evaluations: List[Dict[str, Any]] = []

        # Extract normalized signals with robust None fallbacks
        app_amount = float(application.get("loan_amount") or 500000)
        income_val = application.get("income") or application.get("monthly_income") or 60000
        income = float(income_val)

        c_score = None
        if credit_result and credit_result.get("credit_score") is not None:
            c_score = credit_result.get("credit_score")
        elif credit_result and credit_result.get("credit_risk_score") is not None:
            c_score = credit_result.get("credit_risk_score")
        elif application.get("credit_score") is not None:
            c_score = application.get("credit_score")
        credit_score = float(c_score or 700)

        pd_val = credit_result.get("probability_of_default") if credit_result else None
        pd = float(pd_val if pd_val is not None else 0.08)

        dti_val = None
        if credit_result and credit_result.get("debt_to_income") is not None:
            dti_val = credit_result.get("debt_to_income")
        elif application.get("debt_to_income") is not None:
            dti_val = application.get("debt_to_income")
        dti = float(dti_val if dti_val is not None else 0.35)

        prev_defaults = int(application.get("previous_defaults") or 0)
        prev_dpd = int(application.get("previous_dpd") or 0)

        # Fraud signals
        fraud_prob = float(fraud_result.get("fraud_probability", 0.05) if fraud_result else 0.05)
        fraud_risk = str(fraud_result.get("fraud_risk", "LOW") if fraud_result else "LOW").upper()
        fraud_signals = fraud_result.get("risk_signals", []) if fraud_result else []
        related_entities = fraud_result.get("related_entities", []) if fraud_result else []

        # Customer health signals
        fin_health = float(customer_result.get("financial_health_score", 72.0) if customer_result else 72.0)
        stress_score = 30.0
        if customer_result and "financial_stress" in customer_result:
            fs = customer_result["financial_stress"]
            stress_score = float(fs.get("stress_score", 30.0) if isinstance(fs, dict) else 30.0)
        churn_prob = 0.05
        if customer_result and "churn_risk" in customer_result:
            cr = customer_result["churn_risk"]
            churn_prob = float(cr.get("churn_probability", 0.05) if isinstance(cr, dict) else 0.05)

        # Collections signals
        coll_priority = "LOW"
        if collections_result:
            coll_priority = str(collections_result.get("collection_priority", "LOW")).upper()

        # Hard rejection checks
        is_rejected = False
        is_review = False

        # Rule 1: Critical Fraud Check
        if fraud_risk in ["CRITICAL", "HIGH"] or fraud_prob >= self.policy.critical_fraud_probability:
            is_rejected = True
            reason_text = f"Severe fraud risk detected (Probability: {fraud_prob:.1%}, Classification: {fraud_risk})."
            reasons.append(reason_text)
            risk_factors.append(f"High fraud anomaly score ({fraud_prob:.1%}) with {len(fraud_signals)} active risk signals")
            rule_evaluations.append({"rule": "FRAUD_CRITICAL_CHECK", "status": "FAIL", "reason": reason_text})
        elif fraud_prob >= self.policy.max_fraud_probability or len(related_entities) > 0 or len(fraud_signals) > 0:
            is_review = True
            reason_text = f"Fraud flags identified: {len(related_entities)} entity collisions, {len(fraud_signals)} anomaly signals."
            reasons.append(reason_text)
            risk_factors.append(reason_text)
            rule_evaluations.append({"rule": "FRAUD_SUSPICION_CHECK", "status": "WARN", "reason": reason_text})
        else:
            positive_factors.append("Clean fraud screening: zero entity collisions or device anomalies")
            rule_evaluations.append({"rule": "FRAUD_CHECK", "status": "PASS", "reason": "No fraud indicators found"})

        # Rule 2: Prior Defaults Exclusion
        if prev_defaults > self.policy.max_previous_defaults:
            is_rejected = True
            reason_text = f"Applicant has {prev_defaults} previous loan default(s), violating policy limit of {self.policy.max_previous_defaults}."
            reasons.append(reason_text)
            risk_factors.append(f"Past default history ({prev_defaults} defaults)")
            rule_evaluations.append({"rule": "PRIOR_DEFAULTS_CHECK", "status": "FAIL", "reason": reason_text})
        else:
            positive_factors.append("Unblemished default history: 0 historical defaults")
            rule_evaluations.append({"rule": "PRIOR_DEFAULTS_CHECK", "status": "PASS", "reason": "Clean default history"})

        # Rule 3: Credit Score & Default Probability Floor
        if credit_score < self.policy.min_credit_score:
            is_rejected = True
            reason_text = f"Bureau credit score ({credit_score:.0f}) falls below underwriting threshold ({self.policy.min_credit_score:.0f})."
            reasons.append(reason_text)
            risk_factors.append(f"Sub-prime credit score ({credit_score:.0f})")
            rule_evaluations.append({"rule": "CREDIT_SCORE_FLOOR", "status": "FAIL", "reason": reason_text})
        elif pd > self.policy.max_probability_of_default:
            is_rejected = True
            reason_text = f"Model estimated Probability of Default ({pd:.1%}) exceeds risk appetite limit ({self.policy.max_probability_of_default:.1%})."
            reasons.append(reason_text)
            risk_factors.append(f"Elevated default probability ({pd:.1%})")
            rule_evaluations.append({"rule": "PD_RISK_LIMIT", "status": "FAIL", "reason": reason_text})
        else:
            if credit_score >= self.policy.prime_credit_score:
                positive_factors.append(f"Prime bureau score ({credit_score:.0f}) demonstrating strong credit discipline")
            else:
                positive_factors.append(f"Acceptable credit score ({credit_score:.0f}) above minimum standard")
            rule_evaluations.append({"rule": "CREDIT_SCORE_FLOOR", "status": "PASS", "reason": "Credit score acceptable"})

        # Rule 4: Debt-To-Income (DTI) Capacity
        if dti > self.policy.max_dti:
            is_review = True
            reason_text = f"Debt-to-Income ratio ({dti:.1%}) exceeds maximum guideline ({self.policy.max_dti:.1%})."
            reasons.append(reason_text)
            risk_factors.append(f"High debt burden: DTI at {dti:.1%}")
            rule_evaluations.append({"rule": "DTI_CAPACITY_CHECK", "status": "WARN", "reason": reason_text})
        else:
            positive_factors.append(f"Favorable DTI ratio ({dti:.1%}) within safe debt-service band")
            rule_evaluations.append({"rule": "DTI_CAPACITY_CHECK", "status": "PASS", "reason": "DTI within tolerance"})

        # Rule 5: Repayment Delinquency (DPD)
        if prev_dpd > self.policy.max_previous_dpd:
            is_review = True
            reason_text = f"Recent delinquency of {prev_dpd} DPD exceeds standard threshold ({self.policy.max_previous_dpd} days)."
            reasons.append(reason_text)
            risk_factors.append(f"Past delinquency record ({prev_dpd} DPD)")
            rule_evaluations.append({"rule": "DPD_TOLERANCE_CHECK", "status": "WARN", "reason": reason_text})
        elif prev_dpd > 0:
            warnings.append(f"Minor historical DPD observed ({prev_dpd} days)")

        # Rule 6: Customer Financial Stress & Health
        if stress_score > self.policy.max_financial_stress:
            is_review = True
            reason_text = f"Customer Financial Stress index ({stress_score:.0f}/100) indicates strained liquidity."
            reasons.append(reason_text)
            risk_factors.append(f"Elevated financial stress score ({stress_score:.0f}/100)")
            rule_evaluations.append({"rule": "FINANCIAL_STRESS_CHECK", "status": "WARN", "reason": reason_text})
        elif fin_health >= 70.0:
            positive_factors.append(f"Robust financial health index ({fin_health:.0f}/100)")

        # Rule 7: Collections Priority Overdue Record
        if coll_priority in ["HIGH", "CRITICAL"]:
            is_review = True
            reason_text = f"Borrower holds an active high-priority collection status in portfolio."
            reasons.append(reason_text)
            risk_factors.append("Active collection priority flag")
            rule_evaluations.append({"rule": "COLLECTIONS_EXPOSURE_CHECK", "status": "WARN", "reason": reason_text})

        # Synthesize Final Verdict
        if is_rejected:
            final_decision = "REJECT"
            recommended_action = "Decline application. Send adverse action notification citing primary risk drivers. Maintain 6-month cooling period."
        elif is_review:
            final_decision = "REVIEW REQUIRED"
            recommended_action = "Escalate to Senior Underwriter. Mandate physical address verification, 6-month bank statement scrutiny, and secondary phone confirmation."
        else:
            final_decision = "APPROVE"
            recommended_action = f"Approve application for disbursement of ₹{app_amount:,.0f} subject to standard e-NACH mandate and e-KYC validation."
            if not reasons:
                reasons.append("Applicant satisfies all credit, fraud, solvency, and portfolio risk criteria.")

        return {
            "decision": final_decision,
            "reasons": reasons,
            "risk_factors": risk_factors,
            "positive_factors": positive_factors,
            "warnings": warnings,
            "recommended_action": recommended_action,
            "policy_version": self.policy.policy_version,
            "evaluated_at": datetime.utcnow().isoformat(),
            "rule_evaluations": rule_evaluations,
            "summary_metrics": {
                "credit_score": credit_score,
                "probability_of_default": round(pd, 4),
                "dti": round(dti, 3),
                "fraud_probability": round(fraud_prob, 4),
                "financial_health_score": round(fin_health, 1),
                "financial_stress_score": round(stress_score, 1),
                "loan_amount": app_amount,
            }
        }

# Global singleton
decision_engine = DecisionEngine()
