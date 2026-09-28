import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
from app.database import engine, Base, SessionLocal
from app.models import LoanProduct, Document, SupportTicket, Customer, Loan, LoanApplication, Lead, WorkTask, ApprovalRule

def init_and_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Seed Loan Products if empty
        if db.query(LoanProduct).count() == 0:
            products = [
                LoanProduct(
                    product_code="LP-MSME",
                    name="MSME Business Growth Loan",
                    category="MSME",
                    min_amount=100000.0,
                    max_amount=5000000.0,
                    interest_rate=13.5,
                    min_tenure=12,
                    max_tenure=60,
                    processing_fee_pct=1.5,
                    description="Working capital and term financing for MSME enterprises with GST and ITR verification."
                ),
                LoanProduct(
                    product_code="LP-PERS",
                    name="Personal Instant Credit Line",
                    category="Personal",
                    min_amount=25000.0,
                    max_amount=500000.0,
                    interest_rate=14.0,
                    min_tenure=6,
                    max_tenure=36,
                    processing_fee_pct=1.0,
                    description="Unsecured personal credit for salaried and professional borrowers."
                ),
                LoanProduct(
                    product_code="LP-AUTO",
                    name="Commercial Vehicle Finance",
                    category="Commercial Vehicle",
                    min_amount=300000.0,
                    max_amount=2500000.0,
                    interest_rate=11.5,
                    min_tenure=12,
                    max_tenure=48,
                    processing_fee_pct=1.2,
                    description="Secured commercial vehicle loans for fleet owners and transport logistics operators."
                ),
                LoanProduct(
                    product_code="LP-GOLD",
                    name="Sovereign Gold Loan Facility",
                    category="Gold",
                    min_amount=50000.0,
                    max_amount=2000000.0,
                    interest_rate=9.5,
                    min_tenure=3,
                    max_tenure=24,
                    processing_fee_pct=0.5,
                    description="Instant liquidity against physical gold collateral with same-day disbursement."
                ),
                LoanProduct(
                    product_code="LP-MICRO",
                    name="Micro-Enterprise Community Loan",
                    category="Microfinance",
                    min_amount=15000.0,
                    max_amount=100000.0,
                    interest_rate=16.0,
                    min_tenure=6,
                    max_tenure=18,
                    processing_fee_pct=1.0,
                    description="Community and joint-liability group loans for micro-entrepreneurs."
                ),
            ]
            db.add_all(products)
            print("Seeded loan products")

        # Seed sample documents
        c1 = db.query(Customer).first()
        if c1 and db.query(Document).count() == 0:
            docs = [
                Document(
                    doc_id="DOC-KYC-001",
                    customer_id=c1.id,
                    doc_type="PAN_CARD",
                    file_name="pan_card_verified.pdf",
                    file_size_kb=340,
                    status="VERIFIED",
                    verified_by="Operations Desk (Deepa Nair)"
                ),
                Document(
                    doc_id="DOC-KYC-002",
                    customer_id=c1.id,
                    doc_type="AADHAAR",
                    file_name="aadhaar_masked.pdf",
                    file_size_kb=420,
                    status="VERIFIED",
                    verified_by="Operations Desk (Deepa Nair)"
                ),
                Document(
                    doc_id="DOC-KYC-003",
                    customer_id=c1.id,
                    doc_type="BANK_STATEMENT",
                    file_name="hdfc_6m_statement.pdf",
                    file_size_kb=1240,
                    status="VERIFIED",
                    verified_by="Operations Desk (Deepa Nair)"
                ),
            ]
            db.add_all(docs)
            print("Seeded initial documents")

        # Seed sample support tickets
        if c1 and db.query(SupportTicket).count() == 0:
            messages = [
                {"sender": "customer", "text": "Could you provide the interest tax certificate for FY 2025-26?", "time": "2026-09-20 10:00"},
                {"sender": "staff", "text": "Certificate has been generated and dispatched to your registered email.", "time": "2026-09-20 11:30"}
            ]
            t = SupportTicket(
                ticket_id="TICK-2026-001",
                customer_id=c1.id,
                subject="Request for Loan Amortization Schedule & Tax Certificate",
                category="LOAN_STATUS",
                priority="LOW",
                status="RESOLVED",
                assigned_to="Customer Support Desk",
                messages_json=json.dumps(messages)
            )
            db.add(t)
            print("Seeded support ticket")

        # Ensure some loan applications have various active statuses:
        # e.g. Under_Review, Approved, Rejected, Documents_Required, Disbursement_Pending
        # This makes the Credit Officer and Operations queues immediately active!
        apps = db.query(LoanApplication).limit(20).all()
        statuses = ["Under_Review", "Under_Review", "Under_Review", "Approved", "Approved", "Documents_Required", "Disbursement_Pending"]
        for i, a in enumerate(apps):
            if i < len(statuses):
                a.status = statuses[i]
                if statuses[i] == "Approved":
                    a.approved_amount = a.requested_amount
                    a.reviewer_notes = "Approved based on XGBoost PD < 2.5% and clean bureau record."
                    a.reviewed_by = "Priya Sharma (Credit Officer)"
                elif statuses[i] == "Documents_Required":
                    a.reviewer_notes = "Latest 3 months GST returns required to verify turnover consistency."
                    a.reviewed_by = "Priya Sharma (Credit Officer)"
                elif statuses[i] == "Disbursement_Pending":
                    a.approved_amount = a.requested_amount
                    a.reviewer_notes = "Sanction verified. Ready for eNACH activation and treasury release."
                    a.reviewed_by = "Priya Sharma (Credit Officer)"

        # Seed sample Leads if empty
        if db.query(Lead).count() == 0:
            sample_leads = [
                Lead(
                    lead_id="LEAD-2026-001",
                    full_name="Rajesh Verma",
                    email="rajesh.verma@techsol.in",
                    phone="+91 98201 12345",
                    product_type="MSME Business Growth Loan",
                    requested_amount=1500000.0,
                    annual_income=1800000.0,
                    city="Bengaluru",
                    status="QUALIFIED",
                    assigned_to="Vikram Sethi (Sales)",
                    notes="GST turnover of 85L verified. Looking to expand manufacturing unit."
                ),
                Lead(
                    lead_id="LEAD-2026-002",
                    full_name="Sunita Nair",
                    email="sunita.nair@healthclinic.org",
                    phone="+91 98450 98765",
                    product_type="Commercial Vehicle Finance",
                    requested_amount=850000.0,
                    annual_income=1200000.0,
                    city="Kochi",
                    status="CONTACTED",
                    assigned_to="Vikram Sethi (Sales)",
                    notes="Ambulance fleet acquisition; preliminary discussion complete."
                ),
                Lead(
                    lead_id="LEAD-2026-003",
                    full_name="Amit Patel",
                    email="amit.patel@gujarattextiles.com",
                    phone="+91 99250 44321",
                    product_type="Personal Instant Credit Line",
                    requested_amount=400000.0,
                    annual_income=950000.0,
                    city="Ahmedabad",
                    status="NEW",
                    assigned_to="Vikram Sethi (Sales)",
                    notes="Direct website enquiry for home renovation personal loan."
                )
            ]
            db.add_all(sample_leads)
            print("Seeded sample leads")

        # Seed sample WorkTasks if empty
        if db.query(WorkTask).count() == 0:
            sample_tasks = [
                WorkTask(
                    task_id="TASK-2026-001",
                    title="Verify GST Reconciliation & 6M Bank Statement for APP-NBFC-50393",
                    description="Customer requested high ticket MSME expansion. Re-check 3B filings against bank statement credits.",
                    role_target="CREDIT_OFFICER",
                    assigned_to="Priya Sharma",
                    priority="HIGH",
                    status="IN_PROGRESS",
                    related_entity_type="APPLICATION",
                    related_entity_id="APP-NBFC-50393",
                    comments_json=json.dumps([{"author": "System", "comment": "Task auto-generated on underwriting queue alert", "timestamp": "2026-09-26 10:00"}])
                ),
                WorkTask(
                    task_id="TASK-2026-002",
                    title="Examine IP Geolocation Drift & Device Velocity for TXN-2026-8812",
                    description="Multiple authentication attempts detected from unusual ASN across state borders.",
                    role_target="FRAUD_OFFICER",
                    assigned_to="Kavita Reddy",
                    priority="URGENT",
                    status="PENDING",
                    related_entity_type="TRANSACTION",
                    related_entity_id="TXN-2026-8812",
                    comments_json=json.dumps([{"author": "Fraud Intelligence", "comment": "Anomaly score 0.89 flagged by Isolation Forest", "timestamp": "2026-09-26 11:15"}])
                ),
                WorkTask(
                    task_id="TASK-2026-003",
                    title="Execute eNACH Batch Mandate Verification for Cycle 1st October",
                    description="Confirm NPCI clearing batch registration for 142 newly onboarded facilities.",
                    role_target="OPERATIONS",
                    assigned_to="Deepa Nair",
                    priority="MEDIUM",
                    status="PENDING",
                    related_entity_type="LOAN",
                    related_entity_id="BATCH-OCT-01",
                    comments_json=json.dumps([])
                )
            ]
            db.add_all(sample_tasks)
            print("Seeded sample work tasks")

        # Seed sample ApprovalRules if empty
        if db.query(ApprovalRule).count() == 0:
            rules = [
                ApprovalRule(
                    rule_code="TIER-1-AUTO",
                    tier_name="Tier 1: STP Auto-Underwrite (< 2 Lakhs)",
                    min_amount=0.0,
                    max_amount=200000.0,
                    required_role="CREDIT_OFFICER",
                    min_cibil_score=750,
                    max_dti_pct=45.0,
                    escalation_role="CREDIT_OFFICER"
                ),
                ApprovalRule(
                    rule_code="TIER-2-STD",
                    tier_name="Tier 2: Standard Credit Authority (2L - 10L)",
                    min_amount=200000.0,
                    max_amount=1000000.0,
                    required_role="CREDIT_OFFICER",
                    min_cibil_score=700,
                    max_dti_pct=50.0,
                    escalation_role="RISK_MANAGER"
                ),
                ApprovalRule(
                    rule_code="TIER-3-HIGH",
                    tier_name="Tier 3: Senior Risk Committee (> 10 Lakhs)",
                    min_amount=1000000.0,
                    max_amount=10000000.0,
                    required_role="RISK_MANAGER",
                    min_cibil_score=680,
                    max_dti_pct=55.0,
                    escalation_role="ADMIN"
                )
            ]
            db.add_all(rules)
            print("Seeded approval rules")

        db.commit()
        print("Initialization complete and application statuses diversified successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    init_and_seed()
