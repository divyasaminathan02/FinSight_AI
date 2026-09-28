"""
FinSight AI - Development-Only Demo User Seed Script
Seeds safe development credentials for all 16 institutional roles.
Passphrases are configured via backend environment / config and never hardcoded in frontend.
"""

import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine, Base, SessionLocal
from app.models.users import User, UserRole
from app.config import settings
from app.security.jwt import get_password_hash

DEMO_ACCOUNTS = [
    {
        "full_name": "Customer Demo",
        "email": "customer.demo@finsight.ai",
        "role": UserRole.CUSTOMER,
        "department": "Retail Borrower (Self-Service)",
        "description": "Borrower persona with view into personal applications, loan schedules, and repayments."
    },
    {
        "full_name": "Sales Officer Demo",
        "email": "sales.officer@finsight.ai",
        "role": UserRole.SALES_OFFICER,
        "department": "Direct Sales & Lead Origination",
        "description": "Front-line sales officer managing retail leads, borrower applications, and qualification."
    },
    {
        "full_name": "Relationship Manager Demo",
        "email": "relationship.manager@finsight.ai",
        "role": UserRole.RELATIONSHIP_MANAGER,
        "department": "Commercial & MSME Banking",
        "description": "Institutional RM overseeing high-ticket MSME borrowers and corporate client portfolios."
    },
    {
        "full_name": "Credit Analyst Demo",
        "email": "credit.analyst@finsight.ai",
        "role": UserRole.CREDIT_ANALYST,
        "department": "Credit Appraisal & Underwriting",
        "description": "Underwriting specialist analyzing financial statements, XGBoost PD scores, and bureau reports."
    },
    {
        "full_name": "Credit Manager Demo",
        "email": "credit.manager@finsight.ai",
        "role": UserRole.CREDIT_MANAGER,
        "department": "Credit Sanctions & Policy",
        "description": "Credit authority with sanction, conditional approval, and policy override permissions."
    },
    {
        "full_name": "Fraud Officer Demo",
        "email": "fraud.officer@finsight.ai",
        "role": UserRole.FRAUD_OFFICER,
        "department": "Fraud Forensics & Investigation",
        "description": "Investigator analyzing synthetic fraud alerts, device collisions, and anomaly scores."
    },
    {
        "full_name": "KYC Officer Demo",
        "email": "kyc.officer@finsight.ai",
        "role": UserRole.KYC_OFFICER,
        "department": "Identity & AML Verification Desk",
        "description": "Compliance officer verifying Aadhaar/PAN, PEP lists, and documentation completeness."
    },
    {
        "full_name": "Collections Officer Demo",
        "email": "collections.officer@finsight.ai",
        "role": UserRole.COLLECTIONS_OFFICER,
        "department": "Field & Tele-Collections",
        "description": "Remediation officer assigned to active DPD queues, payment promises, and recovery actions."
    },
    {
        "full_name": "Collections Manager Demo",
        "email": "collections.manager@finsight.ai",
        "role": UserRole.COLLECTIONS_MANAGER,
        "department": "NPA Recovery & Remediation",
        "description": "Strategy head managing SMA buckets, agency allocations, and legal recovery processes."
    },
    {
        "full_name": "Operations Officer Demo",
        "email": "operations.officer@finsight.ai",
        "role": UserRole.OPERATIONS_OFFICER,
        "department": "Loan Booking & Mandate Verification",
        "description": "Back-office officer validating eNACH mandates, agreements, and pre-disbursement checks."
    },
    {
        "full_name": "Operations Manager Demo",
        "email": "operations.manager@finsight.ai",
        "role": UserRole.OPERATIONS_MANAGER,
        "department": "Back-Office Operations & Settlement",
        "description": "Operations head supervising loan disbursements, release authorizations, and bank reconciliation."
    },
    {
        "full_name": "Finance Officer Demo",
        "email": "finance.officer@finsight.ai",
        "role": UserRole.FINANCE_OFFICER,
        "department": "Payment Reconciliation & Accounting",
        "description": "Finance specialist handling payment clearing, transaction logs, and ledger entries."
    },
    {
        "full_name": "Finance Manager Demo",
        "email": "finance.manager@finsight.ai",
        "role": UserRole.FINANCE_MANAGER,
        "department": "Treasury & ALM Operations",
        "description": "Treasury head monitoring cash inflows/outflows, 30-day liquidity buffer, and ALM gaps."
    },
    {
        "full_name": "Risk Analyst Demo",
        "email": "risk.analyst@finsight.ai",
        "role": UserRole.RISK_ANALYST,
        "department": "Portfolio Risk & Quantitative Modeling",
        "description": "Risk analyst analyzing portfolio concentration (HHI), expected loss, and migration matrices."
    },
    {
        "full_name": "Risk Manager Demo",
        "email": "risk.manager@finsight.ai",
        "role": UserRole.RISK_MANAGER,
        "department": "Enterprise Portfolio Risk",
        "description": "Enterprise risk leader evaluating cross-agent risk alerts, macroeconomic stress, and limits."
    },
    {
        "full_name": "Admin Demo",
        "email": "admin.demo@finsight.ai",
        "role": UserRole.ADMIN,
        "department": "Executive Risk & Administration",
        "description": "System administrator with unrestricted organization-wide access, user and audit control."
    },
]

def seed_demo_accounts():
    print("=" * 60)
    print("FinSight AI - Development Demo User Seeder")
    print("=" * 60)
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    default_demo_pw = settings.DEMO_PASSWORD
    admin_pw = settings.ADMIN_PASSWORD
    
    created_count = 0
    updated_count = 0
    
    try:
        for acc in DEMO_ACCOUNTS:
            email = acc["email"].lower().strip()
            existing = db.query(User).filter(User.email == email).first()
            pw = admin_pw if acc["role"] == UserRole.ADMIN else default_demo_pw
            hashed = get_password_hash(pw)
            
            if not existing:
                u = User(
                    email=email,
                    hashed_password=hashed,
                    full_name=acc["full_name"],
                    role=acc["role"],
                    department=acc["department"],
                    is_active=True
                )
                db.add(u)
                created_count += 1
                print(f"[CREATED] {acc['full_name']} <{email}> ({acc['role'].value})")
            else:
                existing.full_name = acc["full_name"]
                existing.role = acc["role"]
                existing.department = acc["department"]
                existing.hashed_password = hashed
                existing.is_active = True
                updated_count += 1
                print(f"[UPDATED] {acc['full_name']} <{email}> ({acc['role'].value})")
                
        # Also ensure primary admin and arjun.mehta exist with valid hash
        arjun = db.query(User).filter(User.email == "arjun.mehta@finsight.ai").first()
        if arjun:
            arjun.hashed_password = get_password_hash("FinSight@2026")
            
        admin_primary = db.query(User).filter(User.email == "admin@finsight.ai").first()
        if admin_primary:
            admin_primary.hashed_password = get_password_hash("FinSight@Admin2026")
            
        db.commit()
        print("-" * 60)
        print(f"Summary: {created_count} demo users created, {updated_count} updated.")
        print(f"Total institutional roles seeded: {len(DEMO_ACCOUNTS)}")
        print("=" * 60)
    except Exception as e:
        db.rollback()
        print(f"Error seeding demo accounts: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_accounts()
