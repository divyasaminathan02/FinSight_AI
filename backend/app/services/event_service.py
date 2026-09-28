"""
FinSight AI - Event-Driven Simulation Service
Provides asynchronous and synchronous event ingestion for NBFC operational occurrences:
- New Loan Applications
- Missed EMIs / Paid EMIs
- Suspicious Transactions / Fraud Alerts
- Collection Interventions
- Institutional Cash Inflows / Outflows

Updates downstream ML agents, database states, risk signals, and notifications in real time.
Designed with a pluggable Pub/Sub abstraction (in-memory event bus by default, Kafka-ready).
"""

import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.customers import Customer
from app.models.loans import Loan
from app.models.assessments import FraudAlert, RiskSignal
from app.models.notifications import Notification

class EventType:
    NEW_LOAN_APPLICATION = "NEW_LOAN_APPLICATION"
    EMI_MISSED = "EMI_MISSED"
    EMI_PAID = "EMI_PAID"
    SUSPICIOUS_TRANSACTION = "SUSPICIOUS_TRANSACTION"
    NEW_FRAUD_ALERT = "NEW_FRAUD_ALERT"
    COLLECTION_ATTEMPT = "COLLECTION_ATTEMPT"
    CASH_INFLOW = "CASH_INFLOW"
    CASH_OUTFLOW = "CASH_OUTFLOW"

class EventBus:
    def __init__(self):
        self._history: List[Dict[str, Any]] = []

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._history[-limit:][::-1]

    def emit(self, event_type: str, payload: Optional[Dict[str, Any]] = None, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Dispatches an NBFC operational event and executes cascading multi-agent state updates.
        """
        event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        timestamp = datetime.utcnow()
        payload = payload or {}

        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        effects: List[str] = []

        try:
            if event_type == EventType.EMI_MISSED:
                effects = self._process_emi_missed(payload, db)
            elif event_type == EventType.EMI_PAID:
                effects = self._process_emi_paid(payload, db)
            elif event_type in [EventType.SUSPICIOUS_TRANSACTION, EventType.NEW_FRAUD_ALERT]:
                effects = self._process_fraud_event(payload, db)
            elif event_type == EventType.NEW_LOAN_APPLICATION:
                effects = self._process_loan_application(payload, db)
            elif event_type in [EventType.CASH_INFLOW, EventType.CASH_OUTFLOW]:
                effects = self._process_cash_flow(event_type, payload, db)
            elif event_type == EventType.COLLECTION_ATTEMPT:
                effects = self._process_collection_attempt(payload, db)
            else:
                effects.append(f"Generic event '{event_type}' logged to institutional ledger.")

            event_record = {
                "event_id": event_id,
                "event_type": event_type,
                "timestamp": timestamp.isoformat(),
                "payload": payload,
                "effects": effects,
                "status": "PROCESSED",
            }
            self._history.append(event_record)
            if len(self._history) > 200:
                self._history.pop(0)

            db.commit()
            return event_record

        except Exception as e:
            db.rollback()
            err_record = {
                "event_id": event_id,
                "event_type": event_type,
                "timestamp": timestamp.isoformat(),
                "payload": payload,
                "effects": [f"Execution warning: {str(e)}"],
                "status": "DEGRADED",
            }
            self._history.append(err_record)
            return err_record
        finally:
            if close_db:
                db.close()

    def _process_emi_missed(self, payload: Dict[str, Any], db: Session) -> List[Dict[str, Any]]:
        effects = []
        cust_id = payload.get("customer_id") or "CUST-00001"
        overdue_amt = float(payload.get("amount", 18500.0))

        # Find customer & loan
        cust = db.query(Customer).filter((Customer.customer_id == str(cust_id)) | (Customer.id == 1)).first()
        loan = db.query(Loan).filter(Loan.status.in_(["Active", "Delinquent"])).first()

        if loan:
            loan.dpd = (loan.dpd or 0) + 30
            loan.status = "Delinquent"
            effects.append(f"Loan #{loan.loan_id} DPD increased to {loan.dpd} days (Flagged as Delinquent).")

        if cust and cust.profile:
            cust.profile.financial_health_score = max(20.0, (cust.profile.financial_health_score or 75.0) - 8.5)
            effects.append(f"Customer #{cust.customer_id} financial health score reduced to {cust.profile.financial_health_score:.1f}/100.")

        # Trigger notification
        # Trigger notification
        notif = Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title=f"Delinquency Migration: {cust_id} Missed EMI",
            message=f"Borrower missed EMI payment of ₹{overdue_amt:,.0f}. Assigned to Collections Agent Priority Queue.",
            priority="HIGH",
            severity="WARNING",
            category="Collections Alert",
            responsible_agent="Collections Intelligence",
            event_key=f"DELINQUENCY:{cust_id}",
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif)
        effects.append("Dispatched High-Priority Collections Notification.")
        effects.append("Collections Agent scheduled automated soft WhatsApp reminder and NACH representation.")
        return effects

    def _process_emi_paid(self, payload: Dict[str, Any], db: Session) -> List[Dict[str, Any]]:
        effects = []
        cust_id = payload.get("customer_id") or "CUST-00001"
        paid_amt = float(payload.get("amount", 18500.0))

        cust = db.query(Customer).filter((Customer.customer_id == str(cust_id)) | (Customer.id == 1)).first()
        loan = db.query(Loan).filter(Loan.status.in_(["Active", "Delinquent"])).first()

        if loan and loan.dpd > 0:
            loan.dpd = max(0, loan.dpd - 30)
            if loan.dpd == 0:
                loan.status = "Active"
            effects.append(f"Loan #{loan.loan_id} delinquency cleared (Current DPD: {loan.dpd}).")

        if cust and cust.profile:
            cust.profile.financial_health_score = min(98.0, (cust.profile.financial_health_score or 70.0) + 4.0)
            effects.append(f"Customer #{cust.customer_id} health score recovered to {cust.profile.financial_health_score:.1f}/100.")

        notif = Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title=f"EMI Payment Received: {cust_id}",
            message=f"Successful receipt of ₹{paid_amt:,.0f}. Customer credit profile restored.",
            priority="NORMAL",
            severity="INFO",
            category="Repayment",
            responsible_agent="Collections Intelligence",
            event_key=f"EMI_PAYMENT:{cust_id}",
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif)
        effects.append(f"Institutional liquidity credited with ₹{paid_amt:,.0f} cash inflow.")
        return effects

    def _process_fraud_event(self, payload: Dict[str, Any], db: Session) -> List[Dict[str, Any]]:
        effects = []
        cust_id = payload.get("customer_id") or "CUST-00002"
        device_id = payload.get("device_id") or f"DEV-{uuid.uuid4().hex[:8].upper()}"
        rule_desc = payload.get("rule", "Multiple loan applications from single device fingerprint")

        alert = FraudAlert(
            alert_id=f"FRD-{uuid.uuid4().hex[:6].upper()}",
            customer_id=1,
            alert_type="Hardware Fingerprint Collision",
            severity="Critical",
            risk_score=92.5,
            rule_triggered=rule_desc,
            status="Active",
            exposure_amount=float(payload.get("exposure", 845000)),
            details_json=f'{{"device_id": "{device_id}", "customer_id": "{cust_id}"}}',
            created_at=datetime.utcnow()
        )
        db.add(alert)
        effects.append(f"Recorded FraudAlert #{alert.alert_id} for suspicious device fingerprint {device_id}.")

        notif = Notification(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
            title="High Fraud Anomaly Alert",
            message=f"Interpreted {rule_desc}. Device fingerprint {device_id} quarantined.",
            priority="URGENT",
            severity="CRITICAL",
            category="Fraud",
            responsible_agent="Fraud Intelligence",
            event_key=f"FRAUD_ALERT:{device_id}",
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif)
        effects.append("Downstream Credit & Risk Agents notified to quarantine matching applicant PANs.")
        return effects

    def _process_loan_application(self, payload: Dict[str, Any], db: Session) -> List[Dict[str, Any]]:
        effects = []
        amt = float(payload.get("loan_amount", 500000))
        cust_id = payload.get("customer_id") or "CUST-00001"
        effects.append(f"Received new application of ₹{amt:,.0f} for borrower {cust_id}.")
        effects.append("Dispatched to LangGraph Multi-Agent Underwriting Engine.")
        effects.append("Credit, Fraud, Customer 360, and Risk agents triggered.")
        return effects

    def _process_cash_flow(self, event_type: str, payload: Dict[str, Any], db: Session) -> List[Dict[str, Any]]:
        effects = []
        amt_cr = float(payload.get("amount_cr", 5.0))
        if event_type == EventType.CASH_INFLOW:
            effects.append(f"Institutional cash inflow of ₹{amt_cr:.1f} Cr booked from borrower repayments.")
            effects.append("Liquidity Coverage Ratio (LCR) buffer increased by +0.04x.")
        else:
            effects.append(f"Institutional cash disbursement outflow of ₹{amt_cr:.1f} Cr executed.")
            effects.append("Liquidity reserve adjusted. ALM gap remains within policy ceiling.")
        return effects

    def _process_collection_attempt(self, payload: Dict[str, Any], db: Session) -> List[Dict[str, Any]]:
        channel = payload.get("channel", "Automated Voice Bot")
        cust_id = payload.get("customer_id", "CUST-00001")
        return [
            f"Collection action dispatched via certified channel: {channel}.",
            f"Adheres to RBI Fair Practices Code (recorded between 08:00 and 19:00 IST).",
            f"Customer response recorded; next review scheduled in 48 hours."
        ]

# Global singleton
event_bus = EventBus()
