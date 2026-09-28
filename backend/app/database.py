from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
import logging

logger = logging.getLogger("finsight.database")

connect_args = {}
engine_kwargs = {}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    engine_kwargs = {
        "pool_size": 20,
        "max_overflow": 10,
        "pool_pre_ping": True,
    }

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema_columns():
    """Ensure any newly added columns exist in existing SQLite tables."""
    from sqlalchemy import text
    with engine.connect() as conn:
        def get_existing_cols(table_name):
            try:
                res = conn.execute(text(f"PRAGMA table_info({table_name});"))
                return {row[1] for row in res}
            except Exception:
                return set()

        columns_to_ensure = {
            "customers": [
                ("assigned_officer", "VARCHAR(100)"),
                ("relationship_manager", "VARCHAR(100)"),
                ("relationship_notes_json", "TEXT DEFAULT '[]'"),
                ("kyc_status", "VARCHAR(50) DEFAULT 'NOT_STARTED'"),
                ("kyc_verified_at", "DATETIME"),
                ("kyc_verified_by", "VARCHAR(100)")
            ],
            "loan_applications": [
                ("assigned_officer", "VARCHAR(100)"),
                ("credit_analyst", "VARCHAR(100)"),
                ("credit_manager", "VARCHAR(100)"),
                ("analyst_recommendation", "VARCHAR(50)"),
                ("analyst_notes", "TEXT"),
                ("analyst_submitted_at", "DATETIME"),
                ("manager_decision", "VARCHAR(50)"),
                ("manager_decision_reason", "TEXT"),
                ("override_reason", "TEXT"),
                ("ai_credit_score", "FLOAT"),
                ("ai_recommendation", "VARCHAR(50)"),
                ("ai_pd", "FLOAT"),
                ("ai_dti", "FLOAT"),
                ("ai_affordability", "FLOAT"),
                ("ai_recommended_amount", "FLOAT"),
                ("ai_recommended_tenure", "INTEGER"),
                ("ai_risk_category", "VARCHAR(50)"),
                ("workflow_stage", "VARCHAR(50) DEFAULT 'SUBMITTED'"),
                ("kyc_status", "VARCHAR(50) DEFAULT 'NOT_STARTED'"),
                ("fraud_status", "VARCHAR(50) DEFAULT 'PENDING'"),
                ("risk_status", "VARCHAR(50) DEFAULT 'PENDING'"),
                ("risk_analyst", "VARCHAR(100)"),
                ("risk_manager", "VARCHAR(100)"),
                ("risk_recommendation", "VARCHAR(50)"),
                ("risk_notes", "TEXT"),
                ("risk_decision", "VARCHAR(50)"),
                ("risk_decision_reason", "TEXT"),
                ("risk_override_reason", "TEXT"),
                ("disbursement_status", "VARCHAR(50) DEFAULT 'PENDING'"),
                ("operations_officer", "VARCHAR(100)"),
                ("operations_notes", "TEXT"),
                ("offer_accepted", "BOOLEAN DEFAULT 0"),
                ("offer_accepted_at", "DATETIME"),
                ("disbursement_date", "DATETIME"),
                ("net_disbursed_amount", "FLOAT"),
                ("processing_fee", "FLOAT"),
                ("bank_name", "VARCHAR(100)"),
                ("bank_account_number", "VARCHAR(100)"),
                ("bank_ifsc", "VARCHAR(50)")
            ],
            "repayments": [
                ("installment_number", "INTEGER DEFAULT 1"),
                ("principal_amount", "FLOAT DEFAULT 0.0"),
                ("interest_amount", "FLOAT DEFAULT 0.0"),
                ("outstanding_amount", "FLOAT DEFAULT 0.0")
            ],
            "transactions": [
                ("reconciliation_status", "VARCHAR(30) DEFAULT 'MATCHED'"),
                ("created_by", "VARCHAR(100) DEFAULT 'System'"),
                ("reference", "VARCHAR(100)"),
                ("related_application_id", "VARCHAR(50)"),
                ("related_installment_id", "VARCHAR(50)"),
                ("notes", "TEXT")
            ],
            "documents": [
                ("document_type", "VARCHAR(50)"),
                ("verification_status", "VARCHAR(50)"),
                ("rejection_reason", "TEXT"),
                ("replacement_reason", "TEXT")
            ],
            "leads": [
                ("assigned_officer", "VARCHAR(100)"),
                ("notes_history_json", "TEXT DEFAULT '[]'"),
                ("converted_customer_id", "VARCHAR(50)"),
                ("converted_application_id", "VARCHAR(50)")
            ],
            "work_tasks": [
                ("customer_id", "VARCHAR(50)"),
                ("application_id", "VARCHAR(50)"),
                ("completed_at", "DATETIME"),
                ("role_target", "VARCHAR(50)")
            ],
            "notifications": [
                ("recipient_email", "VARCHAR(100)"),
                ("role_target", "VARCHAR(50)"),
                ("priority", "VARCHAR(20) DEFAULT 'NORMAL'"),
                ("severity", "VARCHAR(20) DEFAULT 'INFO'"),
                ("category", "VARCHAR(50) DEFAULT 'Agent Alert'"),
                ("event_key", "VARCHAR(100)"),
                ("status", "VARCHAR(30) DEFAULT 'ACTIVE'"),
                ("action_url", "VARCHAR(255)"),
                ("updated_at", "DATETIME")
            ],
            "collection_records": [
                ("workflow_stage", "VARCHAR(50) DEFAULT 'OVERDUE'"),
                ("assigned_officer", "VARCHAR(100)"),
                ("last_contact_date", "DATETIME"),
                ("last_contact_channel", "VARCHAR(50)"),
                ("next_action", "VARCHAR(150)"),
                ("followup_date", "DATETIME"),
                ("payment_probability", "FLOAT DEFAULT 0.75"),
                ("recovery_probability", "FLOAT DEFAULT 0.80"),
                ("promise_amount", "FLOAT"),
                ("promise_date", "DATETIME"),
                ("promise_status", "VARCHAR(50)"),
                ("is_escalated", "BOOLEAN DEFAULT 0"),
                ("escalation_reason", "TEXT"),
                ("created_at", "DATETIME")
            ],
            "customer_communications": [
                ("channel", "VARCHAR(50) DEFAULT 'IN_APP'"),
                ("is_simulated", "BOOLEAN DEFAULT 1"),
                ("is_customer_visible", "BOOLEAN DEFAULT 1"),
                ("is_read", "BOOLEAN DEFAULT 0")
            ],
            "support_tickets": [
                ("activity_history_json", "TEXT DEFAULT '[]'"),
                ("assigned_officer", "VARCHAR(100)"),
                ("escalated_to", "VARCHAR(100)"),
                ("escalation_reason", "TEXT"),
                ("resolution_notes", "TEXT"),
                ("resolved_at", "DATETIME"),
                ("closed_at", "DATETIME")
            ],
            "users": [
                ("branch_id", "VARCHAR(50)"),
                ("branch_name", "VARCHAR(100)"),
                ("team_id", "VARCHAR(50)"),
                ("region", "VARCHAR(50) DEFAULT 'West'"),
                ("phone", "VARCHAR(20)"),
                ("is_locked", "BOOLEAN DEFAULT 0")
            ],
            "audit_logs": [
                ("user_email", "VARCHAR(255)"),
                ("user_name", "VARCHAR(100)"),
                ("user_role", "VARCHAR(50)"),
                ("entity_type", "VARCHAR(50)"),
                ("entity_id", "VARCHAR(100)"),
                ("before_state_json", "TEXT"),
                ("after_state_json", "TEXT")
            ],
            "loan_products": [
                ("eligibility_criteria", "TEXT DEFAULT '{}'"),
                ("required_documents", "TEXT DEFAULT '[\"PAN_CARD\", \"AADHAAR\", \"BANK_STATEMENT\"]'"),
                ("approval_threshold", "FLOAT DEFAULT 500000.0"),
                ("version", "INTEGER DEFAULT 1"),
                ("updated_by", "VARCHAR(100)"),
                ("updated_at", "DATETIME")
            ],
            "approval_rules": [
                ("requires_dual_approval", "BOOLEAN DEFAULT 0"),
                ("secondary_role", "VARCHAR(50)"),
                ("workflow_name", "VARCHAR(100) DEFAULT 'Standard Credit & Risk Workflow'"),
                ("updated_at", "DATETIME"),
                ("updated_by", "VARCHAR(100)")
            ]
        }

        for table, cols in columns_to_ensure.items():
            existing = get_existing_cols(table)
            if existing:
                for col_name, col_type in cols:
                    if col_name not in existing:
                        try:
                            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type};"))
                            conn.commit()
                            logger.info(f"Added column {col_name} to table {table}")
                        except Exception as e:
                            logger.warning(f"Could not add column {col_name} to {table}: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
