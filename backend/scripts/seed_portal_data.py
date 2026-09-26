import json
from app.database import engine, Base, SessionLocal
from app.models import LoanProduct, Document, SupportTicket, Customer, Loan, LoanApplication

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

        db.commit()
        print("Initialization complete and application statuses diversified successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    init_and_seed()
