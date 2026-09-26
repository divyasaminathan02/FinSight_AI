"""
FinSight AI - Realistic Synthetic NBFC Dataset Pipeline Generator
Generates realistic correlated NBFC financial data including:
- Customers (Demographics, CIBIL credit score, income, employment, financial health)
- Loans (Principal, tenure, interest rates, EMI, DPD status, product types)
- Loan Applications (Device hash, velocity, application status)
- Transactions & Historical Repayments (UPI, NACH, NetBanking, DPD, missed EMIs)
- AI Credit Assessments, Fraud Alerts, Collection Records, Risk Signals & Liquidity Records
"""

import os
import sys
import argparse
import random
import hashlib
import time
from datetime import datetime, timedelta, date
from faker import Faker
import numpy as np

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine, Base, SessionLocal
from app.models.users import User, UserRole
from app.models.customers import Customer, CustomerProfile
from app.models.loans import Loan, LoanApplication
from app.models.transactions import Transaction, Repayment
from app.models.assessments import CreditAssessment, FraudAlert, CollectionRecord, RiskSignal
from app.models.liquidity import LiquidityRecord
from app.models.agents import AgentRun, AgentDecision
from app.models.notifications import Notification
from app.security.jwt import get_password_hash

fake = Faker('en_IN')
Faker.seed(42)
random.seed(42)
np.random.seed(42)

INDIAN_STATES_CITIES = [
    ("Maharashtra", ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"]),
    ("Karnataka", ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi"]),
    ("Tamil Nadu", ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"]),
    ("Delhi NCR", ["New Delhi", "Noida", "Gurugram", "Faridabad", "Ghaziabad"]),
    ("Telangana", ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"]),
    ("Gujarat", ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"]),
    ("Rajasthan", ["Jaipur", "Jodhpur", "Kota", "Udaipur", "Bikaner"]),
    ("Uttar Pradesh", ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj"]),
    ("West Bengal", ["Kolkata", "Howrah", "Durgapur", "Siliguri"]),
    ("Madhya Pradesh", ["Indore", "Bhopal", "Jabalpur", "Gwalior"]),
]

PRODUCT_TYPES = [
    ("Vehicle Loan", 0.35, (150000, 1800000), (24, 60), (10.5, 15.0)),
    ("MSME Business Loan", 0.30, (500000, 5000000), (12, 48), (14.0, 22.0)),
    ("Personal Loan", 0.20, (50000, 750000), (12, 36), (13.5, 24.0)),
    ("Gold Loan", 0.10, (30000, 1000000), (6, 24), (9.0, 14.0)),
    ("Micro-finance", 0.05, (20000, 100000), (6, 18), (18.0, 26.0)),
]

EMPLOYMENT_TYPES = ["Salaried", "Self-Employed MSME", "Gig Economy Worker", "Professional / Doctor / CA", "Small Trader"]

def calculate_emi(principal: float, annual_rate_pct: float, tenure_months: int) -> float:
    monthly_rate = (annual_rate_pct / 12.0) / 100.0
    if monthly_rate == 0:
        return principal / tenure_months
    emi = principal * monthly_rate * ((1 + monthly_rate) ** tenure_months) / (((1 + monthly_rate) ** tenure_months) - 1)
    return round(emi, 2)

def generate_nbfc_dataset(num_customers: int = 5000, num_loans: int = 6500, num_transactions: int = 25000):
    print(f"==================================================")
    print(f"  FinSight AI - Synthetic NBFC Dataset Pipeline  ")
    print(f"==================================================")
    print(f"Target: {num_customers:,} Customers | {num_loans:,} Loans | {num_transactions:,} Transactions")
    start_time = time.time()

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Seed Institutional Users
    print("\n[1/7] Seeding Institutional Users & RBAC...")
    users_to_add = [
        User(
            email="arjun.mehta@finsight.ai",
            hashed_password=get_password_hash("FinSight@2026"),
            full_name="Arjun Mehta",
            role=UserRole.RISK_MANAGER,
            department="Portfolio Risk Management",
            is_active=True
        ),
        User(
            email="admin@finsight.ai",
            hashed_password=get_password_hash("FinSight@Admin2026"),
            full_name="Chief Risk Officer",
            role=UserRole.ADMIN,
            department="Executive Board",
            is_active=True
        ),
        User(
            email="priya.sharma@finsight.ai",
            hashed_password=get_password_hash("FinSight@2026"),
            full_name="Priya Sharma",
            role=UserRole.CREDIT_OFFICER,
            department="Underwriting & Credit",
            is_active=True
        ),
        User(
            email="vikram.singh@finsight.ai",
            hashed_password=get_password_hash("FinSight@2026"),
            full_name="Vikram Singh",
            role=UserRole.COLLECTION_MANAGER,
            department="Collections & Recovery",
            is_active=True
        ),
        User(
            email="ananya.iyer@finsight.ai",
            hashed_password=get_password_hash("FinSight@2026"),
            full_name="Ananya Iyer",
            role=UserRole.FINANCE_MANAGER,
            department="Treasury & Liquidity",
            is_active=True
        ),
    ]
    for u in users_to_add:
        existing = db.query(User).filter(User.email == u.email).first()
        if not existing:
            db.add(u)
    db.commit()

    # Pre-generate a pool of reusable suspicious device IDs for fraud correlation
    fraud_device_pool = [f"DEV-SHR-FINGERPRINT-{random.randint(1000, 9999)}" for _ in range(15)]

    # 2. Seed Customers
    print(f"\n[2/7] Generating {num_customers:,} Customers with correlated financial profiles...")
    customers_data = []
    profiles_data = []
    
    for i in range(1, num_customers + 1):
        cust_id_str = f"CUST-NBFC-{100000 + i}"
        first_name = fake.first_name()
        last_name = fake.last_name()
        email = f"{first_name.lower()}.{last_name.lower()}.{i}@example.com"
        
        state_tuple = random.choice(INDIAN_STATES_CITIES)
        state_name = state_tuple[0]
        city_name = random.choice(state_tuple[1])

        emp_type = random.choice(EMPLOYMENT_TYPES)
        age = random.randint(22, 64)
        
        # Correlated income distribution
        if emp_type == "Salaried":
            income = round(np.random.lognormal(mean=10.8, sigma=0.5), -2)  # Mean ~50k - 1.5L
            stability = round(random.uniform(0.75, 0.98), 2)
        elif emp_type == "Self-Employed MSME":
            income = round(np.random.lognormal(mean=11.2, sigma=0.7), -2)  # Mean ~70k - 3L
            stability = round(random.uniform(0.50, 0.85), 2)
        elif emp_type == "Gig Economy Worker":
            income = round(np.random.lognormal(mean=10.1, sigma=0.4), -2)  # Mean ~25k - 45k
            stability = round(random.uniform(0.35, 0.65), 2)
        else:
            income = round(np.random.lognormal(mean=11.5, sigma=0.6), -2)
            stability = round(random.uniform(0.70, 0.95), 2)
        
        income = max(18000.0, min(income, 1500000.0))
        
        # Correlated Credit Score: High stability & income -> higher credit score
        base_score = int(550 + (stability * 250) + (np.log10(income) * 20) + random.randint(-40, 40))
        credit_score = max(320, min(890, base_score))

        # Risk tier correlation
        if credit_score >= 760:
            risk_tier = "Low"
            prev_defaults = 0
            churn_risk = round(random.uniform(0.01, 0.04), 3)
            health_score = round(random.uniform(84.0, 98.0), 1)
            segment = "Prime"
        elif credit_score >= 680:
            risk_tier = "Moderate"
            prev_defaults = 1 if random.random() < 0.08 else 0
            churn_risk = round(random.uniform(0.04, 0.09), 3)
            health_score = round(random.uniform(70.0, 83.9), 1)
            segment = "Near-Prime"
        elif credit_score >= 580:
            risk_tier = "High"
            prev_defaults = random.randint(0, 2)
            churn_risk = round(random.uniform(0.09, 0.18), 3)
            health_score = round(random.uniform(50.0, 69.9), 1)
            segment = "Subprime"
        else:
            risk_tier = "Critical"
            prev_defaults = random.randint(1, 4)
            churn_risk = round(random.uniform(0.18, 0.35), 3)
            health_score = round(random.uniform(30.0, 49.9), 1)
            segment = "Micro-Enterprise"

        # Device / Phone / Address Hashes
        phone = f"+91-{random.randint(6000000000, 9999999999)}"
        phone_hash = hashlib.sha256(phone.encode()).hexdigest()[:16]
        address_hash = hashlib.sha256(f"{city_name}-{state_name}-{i}".encode()).hexdigest()[:16]

        cust = Customer(
            id=i,
            customer_id=cust_id_str,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone_hash=phone_hash,
            address_hash=address_hash,
            age=age,
            gender=random.choice(["Male", "Female", "Other"]),
            occupation=emp_type,
            employment_type=emp_type,
            income=income,
            location=city_name,
            state=state_name,
            credit_score=credit_score,
            existing_loans=random.randint(0, 4),
            credit_utilization=round(random.uniform(0.15, 0.85), 2),
            bank_balance=round(income * random.uniform(0.8, 3.5), 2),
            income_stability=stability,
            previous_defaults=prev_defaults,
            risk_tier=risk_tier,
            created_at=datetime.utcnow() - timedelta(days=random.randint(60, 720))
        )
        customers_data.append(cust)

        prof = CustomerProfile(
            id=i,
            customer_id=i,
            financial_health_score=health_score,
            churn_risk=churn_risk,
            segment=segment,
            behavioral_score=round(health_score * random.uniform(0.9, 1.05), 1),
            avg_monthly_spend=round(income * random.uniform(0.4, 0.7), 2),
            savings_ratio=round(random.uniform(0.1, 0.35), 2),
            sentiment_score=round(random.uniform(0.65, 0.95), 2),
            updated_at=datetime.utcnow()
        )
        profiles_data.append(prof)

    db.bulk_save_objects(customers_data)
    db.bulk_save_objects(profiles_data)
    db.commit()
    print(f"  -> Bulk saved {len(customers_data):,} Customers & Profiles.")

    # 3. Seed Loans and Loan Applications
    print(f"\n[3/7] Generating {num_loans:,} Loans & Applications with risk correlations...")
    loans_data = []
    applications_data = []
    repayments_data = []
    assessments_data = []
    fraud_alerts_data = []
    collections_data = []

    product_choices = [p[0] for p in PRODUCT_TYPES]
    product_weights = [p[1] for p in PRODUCT_TYPES]

    repayment_id_counter = 1
    assessment_id_counter = 1
    fraud_id_counter = 1
    col_id_counter = 1

    for loan_idx in range(1, num_loans + 1):
        cust_id = random.randint(1, num_customers)
        cust_obj = customers_data[cust_id - 1]

        prod_idx = np.random.choice(len(PRODUCT_TYPES), p=product_weights)
        prod_tuple = PRODUCT_TYPES[prod_idx]
        prod_name = prod_tuple[0]
        min_amt, max_amt = prod_tuple[2]
        min_ten, max_ten = prod_tuple[3]
        min_rate, max_rate = prod_tuple[4]

        # Loan amount proportional to income
        max_eligible = cust_obj.income * (min_ten / 2.0)
        loan_amount = float(random.randint(int(min_amt), int(min(max_amt, max(min_amt * 1.5, max_eligible)))))
        loan_amount = round(loan_amount, -3)

        tenure = random.choice(range(min_ten, max_ten + 1, 6))
        interest_rate = round(random.uniform(min_rate, max_rate), 2)
        # Adjust interest rate higher for higher risk tier
        if cust_obj.risk_tier == "High":
            interest_rate += 2.5
        elif cust_obj.risk_tier == "Critical":
            interest_rate += 4.5
        
        emi = calculate_emi(loan_amount, interest_rate, tenure)

        # DPD & Status correlation with risk tier
        if cust_obj.risk_tier == "Low":
            dpd = 0 if random.random() < 0.98 else random.randint(1, 15)
            status = "Active"
        elif cust_obj.risk_tier == "Moderate":
            dpd = 0 if random.random() < 0.88 else random.randint(1, 30)
            status = "Active" if dpd < 30 else "Delinquent"
        elif cust_obj.risk_tier == "High":
            dpd = random.choice([0, random.randint(1, 30), random.randint(31, 60), random.randint(61, 90)])
            status = "Delinquent" if dpd > 0 else "Active"
        else: # Critical
            dpd = random.choice([random.randint(15, 45), random.randint(46, 90), random.randint(91, 120)])
            status = "NPA" if dpd >= 90 else "Delinquent"

        disbursed_dt = datetime.utcnow() - timedelta(days=random.randint(30, 400))
        maturity_dt = disbursed_dt + timedelta(days=tenure * 30)
        months_passed = min(tenure, max(1, (datetime.utcnow() - disbursed_dt).days // 30))
        outstanding = max(0.0, loan_amount - (emi * months_passed * 0.7))

        loan_item = Loan(
            id=loan_idx,
            loan_id=f"LN-2026-{10000 + loan_idx}",
            customer_id=cust_id,
            product_type=prod_name,
            loan_amount=loan_amount,
            interest_rate=interest_rate,
            loan_tenure=tenure,
            emi=emi,
            outstanding_balance=round(outstanding, 2),
            dpd=dpd,
            status=status,
            disbursed_date=disbursed_dt,
            maturity_date=maturity_dt,
            previous_defaults=cust_obj.previous_defaults,
            created_at=disbursed_dt
        )
        loans_data.append(loan_item)

        # Loan Application
        device_id = random.choice(fraud_device_pool) if random.random() < 0.04 else f"DEV-USR-{random.randint(10000, 99999)}"
        velocity = random.choice([1, 1, 1, 2, 4, 7]) if device_id in fraud_device_pool else 1
        
        app_status = "Approved" if status in ["Active", "Delinquent"] else "Flagged_Fraud"
        app_item = LoanApplication(
            id=loan_idx,
            application_id=f"APP-NBFC-{50000 + loan_idx}",
            customer_id=cust_id,
            product_type=prod_name,
            requested_amount=loan_amount,
            requested_tenure=tenure,
            purpose=f"{prod_name} Financing",
            status=app_status,
            device_id=device_id,
            phone_hash=cust_obj.phone_hash,
            address_hash=cust_obj.address_hash,
            application_velocity=velocity,
            risk_score=round(100.0 - (cust_obj.credit_score / 10.0), 1),
            default_probability=round((1000 - cust_obj.credit_score) / 10000.0, 3),
            created_at=disbursed_dt - timedelta(days=3)
        )
        applications_data.append(app_item)

        # Credit Assessment
        dti = round((emi / max(cust_obj.income, 1.0)), 2)
        default_p = round(0.01 + (dti * 0.05) + (cust_obj.previous_defaults * 0.04), 3)
        ass_item = CreditAssessment(
            id=assessment_id_counter,
            assessment_id=f"ASSESS-AI-{assessment_id_counter:06d}",
            customer_id=cust_id,
            loan_id=loan_idx,
            risk_score=round(72.0 if cust_obj.risk_tier == "Moderate" else (40.0 if cust_obj.risk_tier == "Low" else 88.0), 1),
            default_probability=default_p,
            dti_ratio=dti,
            factors_json=f'{{"dti": {dti}, "cibil": {cust_obj.credit_score}, "stability": {cust_obj.income_stability}}}',
            recommendation="Approve" if cust_obj.risk_tier in ["Low", "Moderate"] else "Review",
            status="Completed",
            created_at=disbursed_dt - timedelta(days=2)
        )
        assessments_data.append(ass_item)
        assessment_id_counter += 1

        # Fraud Alert if suspicious device reuse or high velocity
        if velocity >= 3 or device_id in fraud_device_pool[:3]:
            fraud_item = FraudAlert(
                id=fraud_id_counter,
                alert_id=f"FRD-ALERT-{fraud_id_counter:05d}",
                customer_id=cust_id,
                application_id=loan_idx,
                loan_id=loan_idx,
                alert_type="Device Fingerprint Collision" if device_id in fraud_device_pool else "Velocity Anomaly",
                severity="Critical" if velocity >= 4 else "High",
                risk_score=round(random.uniform(82.0, 96.0), 1),
                rule_triggered=f"Device {device_id} linked to {velocity} loan applications in past 7 days",
                status="Active" if fraud_id_counter <= 14 else "Resolved",
                exposure_amount=loan_amount,
                details_json=f'{{"shared_device": "{device_id}", "velocity_7d": {velocity}, "location": "{cust_obj.location}"}}',
                created_at=disbursed_dt - timedelta(days=1)
            )
            fraud_alerts_data.append(fraud_item)
            fraud_id_counter += 1

        # Collection record if loan is delinquent
        if dpd > 0:
            col_item = CollectionRecord(
                id=col_id_counter,
                collection_id=f"COL-REC-{col_id_counter:05d}",
                loan_id=loan_idx,
                customer_id=cust_id,
                overdue_amount=round(emi * max(1, dpd // 30), 2),
                dpd=dpd,
                collection_risk_score=round(50.0 + (dpd * 0.4), 1),
                collection_probability=round(max(0.2, 0.95 - (dpd * 0.008)), 2),
                recommended_strategy="Digital Voice Bot + WhatsApp" if dpd <= 30 else ("Field Visit + Notice" if dpd <= 60 else "Legal Escalation & Recovery"),
                priority="High" if dpd >= 60 else ("Medium" if dpd >= 30 else "Low"),
                collection_attempts=random.randint(1, 5),
                promised_date=datetime.utcnow() + timedelta(days=random.randint(2, 7)) if random.random() < 0.5 else None,
                status="In_Progress" if dpd < 90 else "Escalated",
                updated_at=datetime.utcnow()
            )
            collections_data.append(col_item)
            col_id_counter += 1

        # Generate 3-6 historical repayments for this loan
        for rep_idx in range(months_passed):
            rep_due_dt = disbursed_dt + timedelta(days=(rep_idx + 1) * 30)
            is_missed = (rep_idx == months_passed - 1) and (dpd > 0)
            rep_paid = 0.0 if is_missed else emi
            rep_status = "Overdue" if is_missed else "Paid"

            repayments_data.append(Repayment(
                id=repayment_id_counter,
                repayment_id=f"REP-{repayment_id_counter:07d}",
                loan_id=loan_idx,
                customer_id=cust_id,
                due_date=rep_due_dt,
                repayment_date=None if is_missed else rep_due_dt - timedelta(days=random.randint(0, 3)),
                amount_due=emi,
                amount_paid=rep_paid,
                dpd=dpd if is_missed else 0,
                status=rep_status,
                collection_attempts=1 if is_missed else 0,
                created_at=rep_due_dt
            ))
            repayment_id_counter += 1

    db.bulk_save_objects(loans_data)
    db.bulk_save_objects(applications_data)
    db.bulk_save_objects(repayments_data)
    db.bulk_save_objects(assessments_data)
    db.bulk_save_objects(fraud_alerts_data)
    db.bulk_save_objects(collections_data)
    db.commit()
    print(f"  -> Bulk saved {len(loans_data):,} Loans, {len(applications_data):,} Applications, {len(repayments_data):,} Repayments, {len(fraud_alerts_data):,} Fraud Alerts.")

    # 4. Seed Transactions
    print(f"\n[4/7] Generating {num_transactions:,} Transactions...")
    transactions_data = []
    channels = ["UPI", "NACH", "NetBanking", "Card", "Branch"]
    channel_weights = [0.45, 0.30, 0.15, 0.08, 0.02]

    for tx_idx in range(1, num_transactions + 1):
        cust_id = random.randint(1, num_customers)
        cust_obj = customers_data[cust_id - 1]
        ch = np.random.choice(channels, p=channel_weights)
        tx_type = random.choice(["EMI_Repayment", "Disbursement", "Utility", "Prepayment", "Salary_Credit"])
        
        if tx_type == "EMI_Repayment":
            amt = round(random.uniform(3000, 35000), 2)
        elif tx_type == "Disbursement":
            amt = round(random.uniform(50000, 500000), 2)
        elif tx_type == "Salary_Credit":
            amt = cust_obj.income
        else:
            amt = round(random.uniform(500, 15000), 2)

        tx_dt = datetime.utcnow() - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))

        transactions_data.append(Transaction(
            id=tx_idx,
            transaction_id=f"TXN-{int(tx_dt.timestamp())}-{tx_idx:06d}",
            customer_id=cust_id,
            loan_id=random.randint(1, num_loans) if tx_type in ["EMI_Repayment", "Disbursement"] else None,
            transaction_amount=amt,
            transaction_type=tx_type,
            transaction_timestamp=tx_dt,
            channel=ch,
            status="Success" if random.random() < 0.97 else "Failed",
            category="Credit Operations" if tx_type in ["EMI_Repayment", "Disbursement"] else "Retail"
        ))

    db.bulk_save_objects(transactions_data)
    db.commit()
    print(f"  -> Bulk saved {len(transactions_data):,} Transactions.")

    # 5. Seed Institutional Risk Signals
    print("\n[5/7] Seeding Institutional Risk Signals...")
    signals_data = [
        RiskSignal(
            signal_id="SIG-2026-001",
            signal_type="Regional Delinquency Spike",
            severity="High",
            category="Regional",
            region="South Region (Tamil Nadu / Karnataka)",
            description="Vehicle loan delinquency increased 4.2% in South Region over the past 30 days.",
            metric_impact="+4.2% DPD 30+",
            responsible_agent="Collections Intelligence",
            status="Active",
            detected_at=datetime.utcnow() - timedelta(hours=3)
        ),
        RiskSignal(
            signal_id="SIG-2026-002",
            signal_type="Device Fingerprint Cluster",
            severity="Critical",
            category="Fraud Alert",
            region="Tier 2 Urban",
            description="12 applications share a high-risk device fingerprint linked to previous syndicates.",
            metric_impact="₹84.5L Potential Exposure",
            responsible_agent="Fraud Intelligence",
            status="Active",
            detected_at=datetime.utcnow() - timedelta(hours=4)
        ),
        RiskSignal(
            signal_id="SIG-2026-003",
            signal_type="Sector Early Stress Indicator",
            severity="Medium",
            category="Sectoral Risk",
            region="Western Region",
            description="MSME portfolio shows early repayment stress in export-oriented textile manufacturing clusters.",
            metric_impact="6.2% Flow-to-Delinquency",
            responsible_agent="Credit Intelligence",
            status="Active",
            detected_at=datetime.utcnow() - timedelta(days=1)
        ),
        RiskSignal(
            signal_id="SIG-2026-004",
            signal_type="Collection Probability Drift",
            severity="Medium",
            category="Behavioral Shift",
            region="All Regions",
            description="Collection probability decreased for Segment B borrowers following festival expense spikes.",
            metric_impact="-5.4% Expected Recovery",
            responsible_agent="Customer Intelligence",
            status="Active",
            detected_at=datetime.utcnow() - timedelta(days=1, hours=6)
        ),
        RiskSignal(
            signal_id="SIG-2026-005",
            signal_type="Liquidity Buffer Compliance",
            severity="Low",
            category="ALM Buffer",
            region="Treasury",
            description="Liquidity buffer remains above internal threshold (1.45x) with strong positive cash flows.",
            metric_impact="1.45x LCR Buffer",
            responsible_agent="Liquidity Intelligence",
            status="Active",
            detected_at=datetime.utcnow() - timedelta(days=2)
        ),
    ]
    db.add_all(signals_data)

    # 6. Seed Liquidity Records
    print("\n[6/7] Seeding Daily Liquidity & Treasury Records...")
    for day_offset in range(30, -1, -1):
        rec_dt = (datetime.utcnow() - timedelta(days=day_offset)).date()
        existing_liq = db.query(LiquidityRecord).filter(LiquidityRecord.record_date == rec_dt).first()
        if not existing_liq:
            inflows = round(random.uniform(18.0, 28.0), 2)
            outflows = round(random.uniform(16.0, 24.0), 2)
            avail = round(120.0 + (30 - day_offset) * 0.2 + random.uniform(-1.0, 2.0), 1)
            liq_rec = LiquidityRecord(
                record_date=rec_dt,
                available_liquidity_cr=avail,
                expected_inflows_cr=inflows,
                expected_outflows_cr=outflows,
                forecasted_liquidity_cr=round(avail + inflows - outflows, 1),
                liquidity_buffer_ratio=1.45,
                stress_test_status="Compliant",
                forecast_30d_trend="Stable"
            )
            db.add(liq_rec)

    # 7. Seed Agent Runs & Initial Coordinated Decisions
    print("\n[7/7] Initializing Agent Run Telemetry & Coordinated Decisions...")
    agents = [
        ("Credit Intelligence", "Credit Underwriting & Portfolio Risk", 84, 1250, 18),
        ("Fraud Intelligence", "Device Fingerprint & Velocity Engine", 46, 1250, 14),
        ("Customer Intelligence", "Financial Health & Churn Predictor", 112, 1250, 32),
        ("Collections Intelligence", "Recovery Optimizer & Strategy Allocator", 95, 450, 28),
        ("Risk Intelligence", "Portfolio Macro Risk Aggregator", 142, 6500, 4),
        ("Liquidity Intelligence", "ALM Cashflow & Buffer Forecaster", 63, 1, 0),
    ]
    for agent_name, summary, exec_time, evaluated, anomalies in agents:
        run = AgentRun(
            run_id=f"RUN-{agent_name[:3].upper()}-{int(time.time())}",
            agent_name=agent_name,
            status="Completed" if agent_name != "Fraud Intelligence" else "Elevated",
            summary=summary,
            execution_time_ms=exec_time,
            entities_evaluated=evaluated,
            anomalies_detected=anomalies,
            metrics_json=f'{{"latency_ms": {exec_time}, "evaluated": {evaluated}, "anomalies": {anomalies}}}',
            created_at=datetime.utcnow() - timedelta(minutes=random.randint(1, 10))
        )
        db.add(run)

    # Coordinated Decision Example
    dec1 = AgentDecision(
        decision_id=f"DEC-AI-COORD-001",
        agent_name="Fraud Intelligence",
        entity_type="LoanApplication",
        entity_id="APP-NBFC-50012",
        decision="Flagged for Syndicate Audit",
        confidence=0.96,
        risk_score=94.5,
        explanation_json='{"reason": "Device fingerprint collision across 12 distinct applicants", "velocity": 7}',
        coordinated_with="Credit Intelligence, Risk Intelligence, Collections Intelligence",
        created_at=datetime.utcnow() - timedelta(minutes=15)
    )
    db.add(dec1)

    db.commit()
    db.close()

    elapsed = time.time() - start_time
    print(f"\n==================================================")
    print(f" SUCCESS: Synthetic NBFC Dataset Pipeline Complete!")
    print(f" Elapsed Time: {elapsed:.2f} seconds")
    print(f" Database is fully populated with correlated records.")
    print(f"==================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Realistic Synthetic NBFC Dataset for FinSight AI")
    parser.add_argument("--customers", type=int, default=5000, help="Number of customer profiles to generate (default: 5,000)")
    parser.add_argument("--loans", type=int, default=6500, help="Number of loans to generate (default: 6,500)")
    parser.add_argument("--transactions", type=int, default=25000, help="Number of transactions to generate (default: 25,000)")
    parser.add_argument("--scale", choices=["quick", "medium", "full"], default="medium", help="Dataset scale preset")
    
    args = parser.parse_args()
    
    if args.scale == "quick":
        generate_nbfc_dataset(num_customers=1000, num_loans=1500, num_transactions=5000)
    elif args.scale == "full":
        generate_nbfc_dataset(num_customers=100000, num_loans=150000, num_transactions=500000)
    else:
        generate_nbfc_dataset(num_customers=args.customers, num_loans=args.loans, num_transactions=args.transactions)
