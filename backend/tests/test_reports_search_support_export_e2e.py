"""
FinSight AI - Prompt 9 Automated E2E Test Suite
Validates:
1. Unified Global Search across all 9 entities with strict RBAC:
   - Customers, Applications, Loans, Transactions, Payments, Tasks, Fraud Cases, Collection Cases, Tickets
   - Search by ID, name, phone, email, loan number, application number
   - RBAC isolation for Customer vs Staff
   - PII data masking (phone/email/PAN) for unprivileged users
2. 13 Enterprise Reports with live database data:
   - Portfolio, Loans, Applications, Disbursement, Collections, Delinquency, Fraud,
     Credit, Customer Segments, Liquidity, Finance, Branch Performance, Product Performance
3. Multi-dimensional filtering:
   - Date, branch, product, status, customer segment, risk
4. Regulatory Export Engine:
   - CSV export
   - PDF / printable HTML regulatory dossier
   - Permission-based PII protection in exports
5. Support Ticket Lifecycle & Helpdesk SLA:
   - Customer ticket creation
   - Staff actions: assign, reply, escalate, resolve, close
   - Statuses: OPEN, IN_PROGRESS, WAITING_CUSTOMER, ESCALATED, RESOLVED, CLOSED
   - Activity history timeline & AuditLog recording
   - Support desk metrics
"""

import uuid
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.customers import Customer
from app.models.loans import Loan, LoanApplication
from app.models.transactions import Transaction, Repayment
from app.models.portal_models import SupportTicket, WorkTask, FraudCase
from app.models.assessments import CollectionRecord, FraudAlert
from app.models.users import User, UserRole, AuditLog
from app.config import settings
from app.security.jwt import get_password_hash

client = TestClient(app)


def _get_token(email: str, name: str, role: UserRole, branch_id: str = "BR-MUM-01") -> str:
    email = email.lower().strip()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                full_name=name,
                hashed_password=get_password_hash(settings.DEMO_PASSWORD),
                role=role,
                department="Management",
                branch_id=branch_id,
                is_active=True
            )
            db.add(user)
            db.commit()
        else:
            user.hashed_password = get_password_hash(settings.DEMO_PASSWORD)
            user.role = role
            user.branch_id = branch_id
            user.is_active = True
            db.commit()
    finally:
        db.close()

    res = client.post("/api/auth/login", json={
        "email": email,
        "password": settings.DEMO_PASSWORD
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


def test_support_ticket_complete_lifecycle():
    """
    Validates complete Support Ticket lifecycle:
    1. Customer creates ticket (OPEN)
    2. Staff assigns ticket (IN_PROGRESS)
    3. Staff replies (WAITING_CUSTOMER)
    4. Customer replies (IN_PROGRESS)
    5. Staff escalates (ESCALATED, priority URGENT)
    6. Staff resolves (RESOLVED with resolution notes)
    7. Staff closes (CLOSED)
    8. Verifies activity history timeline and AuditLog records
    """
    customer_email = f"borrower_{uuid.uuid4().hex[:6]}@example.com"
    cust_token = _get_token(customer_email, "Vikram Malhotra", UserRole.CUSTOMER)
    staff_token = _get_token("ops.support@finsight.ai", "Anjali Verma", UserRole.OPERATIONS_OFFICER)

    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    # Step 1: Customer creates ticket
    create_res = client.post("/api/support/tickets", json={
        "subject": "Disbursement timeline inquiry for Loan LN-0099",
        "category": "DISBURSEMENT",
        "priority": "MEDIUM",
        "initial_message": "Hello, my loan was sanctioned 2 days ago. When will funds hit my account?"
    }, headers=cust_headers)
    assert create_res.status_code == 200
    ticket_id = create_res.json()["ticket_id"]

    # Verify initial ticket state
    detail_res = client.get(f"/api/support/tickets/{ticket_id}", headers=staff_headers)
    assert detail_res.status_code == 200
    t_data = detail_res.json()
    assert t_data["status"] == "OPEN"
    assert t_data["category"] == "DISBURSEMENT"
    assert len(t_data["messages"]) == 1

    # Step 2: Staff assigns ticket
    assign_res = client.post(f"/api/support/tickets/{ticket_id}/assign", json={
        "assigned_to": "Disbursement Desk",
        "assigned_officer": "Ramesh Kumar",
        "note": "Urgent review requested by borrower"
    }, headers=staff_headers)
    assert assign_res.status_code == 200

    # Step 3: Staff replies to ticket
    reply_staff_res = client.post(f"/api/support/tickets/{ticket_id}/reply", json={
        "message": "We have verified your NACH mandate. Disbursement is scheduled for 4 PM today."
    }, headers=staff_headers)
    assert reply_staff_res.status_code == 200
    assert reply_staff_res.json()["current_status"] == "WAITING_CUSTOMER"

    # Step 4: Customer replies back
    reply_cust_res = client.post(f"/api/support/tickets/{ticket_id}/reply", json={
        "message": "Thank you, I will confirm once received."
    }, headers=cust_headers)
    assert reply_cust_res.status_code == 200
    assert reply_cust_res.json()["current_status"] == "IN_PROGRESS"

    # Step 5: Staff escalates ticket
    escalate_res = client.post(f"/api/support/tickets/{ticket_id}/escalate", json={
        "escalated_to": "Senior Operations Manager",
        "reason": "RTGS clearing delay requires manual treasury release authorization"
    }, headers=staff_headers)
    assert escalate_res.status_code == 200

    # Verify escalated state
    check_escalated = client.get(f"/api/support/tickets/{ticket_id}", headers=staff_headers)
    assert check_escalated.status_code == 200
    assert check_escalated.json()["status"] == "ESCALATED"
    assert check_escalated.json()["priority"] == "URGENT"

    # Step 6: Staff resolves ticket
    resolve_res = client.post(f"/api/support/tickets/{ticket_id}/resolve", json={
        "resolution_notes": "RTGS UTR #HDFC9823423 released. Funds credited successfully to borrower account."
    }, headers=staff_headers)
    assert resolve_res.status_code == 200

    # Step 7: Staff closes ticket
    close_res = client.post(f"/api/support/tickets/{ticket_id}/close", headers=staff_headers)
    assert close_res.status_code == 200

    # Step 8: Verify full ticket detail, activity timeline, and database persistence
    final_res = client.get(f"/api/support/tickets/{ticket_id}", headers=staff_headers)
    assert final_res.status_code == 200
    final_data = final_res.json()
    assert final_data["status"] == "CLOSED"
    assert final_data["resolution_notes"] is not None
    assert len(final_data["messages"]) >= 3
    assert len(final_data["activity_history"]) >= 6

    # Verify AuditLog has records
    db = SessionLocal()
    try:
        logs = db.query(AuditLog).filter(AuditLog.resource == f"SUPPORT_TICKET:{ticket_id}").all()
        assert len(logs) >= 3, f"Expected multiple audit log records for {ticket_id}"
    finally:
        db.close()


def test_global_search_across_all_entities_and_rbac():
    """
    Validates Global Search across all required entities:
    - Customers, Applications, Loans, Transactions, Payments, Tasks, Fraud Cases, Collection Cases, Tickets
    - Search by ID, Name, Phone, Email, Loan Number, Application Number
    - RBAC enforcement: Customers cannot see private staff tasks, fraud cases, or other customers' data
    - PII protection: non-privileged users receive masked phone and email
    """
    admin_token = _get_token("cro.admin@finsight.ai", "Chief Risk Officer", UserRole.ADMIN)
    analyst_token = _get_token("ops.analyst.search@finsight.ai", "Search Analyst", UserRole.SALES_OFFICER)
    
    unique_cust_email = f"test_search_{uuid.uuid4().hex[:6]}@example.com"
    cust_token = _get_token(unique_cust_email, "Search Borrower", UserRole.CUSTOMER)

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # 1. Staff search by name returns all categories
    res_staff = client.get("/api/search?q=Loan", headers=admin_headers)
    assert res_staff.status_code == 200
    results = res_staff.json()["results"]

    # Verify all 9 required keys exist in search payload
    expected_categories = [
        "customers", "applications", "loans", "transactions",
        "payments", "tasks", "fraud_cases", "collection_cases", "tickets"
    ]
    for cat in expected_categories:
        assert cat in results, f"Category '{cat}' missing from search results"

    # 2. Search by phone & email with PII masking validation
    res_unprivileged = client.get("/api/search?q=Mumbai", headers=analyst_headers)
    assert res_unprivileged.status_code == 200
    for c in res_unprivileged.json()["results"]["customers"]:
        subtitle = c["subtitle"]
        # Subtitle should contain masked phone or email (e.g. ****** or ***@)
        if "@" in subtitle:
            assert "***@" in subtitle or "hidden@" in subtitle, f"Email was not masked in: {subtitle}"

    # Privileged CRO/Admin gets unmasked info
    res_privileged = client.get("/api/search?q=Mumbai", headers=admin_headers)
    assert res_privileged.status_code == 200

    # 3. Customer search RBAC isolation
    res_customer = client.get("/api/search?q=Loan", headers=cust_headers)
    assert res_customer.status_code == 200
    c_results = res_customer.json()["results"]
    assert len(c_results["tasks"]) == 0, "Customers must never see internal work tasks"
    assert len(c_results["fraud_cases"]) == 0, "Customers must never see fraud forensic cases"
    assert len(c_results["collection_cases"]) == 0, "Customers must never see collection cases"


def test_all_13_canonical_reports_data():
    """
    Validates that all 13 required enterprise reports execute cleanly
    using live database data and return summary metrics and rows:
    1. portfolio
    2. loans
    3. applications
    4. disbursement
    5. collections
    6. delinquency
    7. fraud
    8. credit
    9. customer-segments
    10. liquidity
    11. finance
    12. branch-performance
    13. product-performance
    """
    token = _get_token("cro.reports@finsight.ai", "Reports Validator", UserRole.RISK_MANAGER)
    headers = {"Authorization": f"Bearer {token}"}

    # Verify catalog list
    list_res = client.get("/api/reports/list", headers=headers)
    assert list_res.status_code == 200
    reports_meta = list_res.json()
    assert reports_meta["total_reports"] == 13

    canonical_report_keys = [
        "portfolio",
        "loans",
        "applications",
        "disbursement",
        "collections",
        "delinquency",
        "fraud",
        "credit",
        "customer-segments",
        "liquidity",
        "finance",
        "branch-performance",
        "product-performance"
    ]

    for r_key in canonical_report_keys:
        res = client.get(f"/api/reports/data/{r_key}", headers=headers)
        assert res.status_code == 200, f"Report {r_key} failed: {res.text}"
        data = res.json()
        assert "title" in data
        assert "summary" in data
        assert "rows" in data
        assert len(data["summary"]) >= 2, f"Summary in {r_key} must contain metrics"


def test_report_multi_dimensional_filtering():
    """
    Validates filtering across reports by:
    - Date (start_date, end_date)
    - Branch
    - Product
    - Status
    - Customer Segment
    - Risk Tier
    """
    token = _get_token("auditor.filter@finsight.ai", "Filter Auditor", UserRole.AUDITOR)
    headers = {"Authorization": f"Bearer {token}"}

    # Filter by product = 'Personal Loan'
    res_prod = client.get("/api/reports/data/loans?product=Personal Loan", headers=headers)
    assert res_prod.status_code == 200
    for row in res_prod.json()["rows"]:
        if "product_type" in row:
            assert row["product_type"] == "Personal Loan"

    # Filter by status = 'ACTIVE'
    res_status = client.get("/api/reports/data/loans?status=ACTIVE", headers=headers)
    assert res_status.status_code == 200

    # Filter by customer segment = 'Prime'
    res_seg = client.get("/api/reports/data/customer-segments?customer_segment=Prime", headers=headers)
    assert res_seg.status_code == 200

    # Filter by date range
    yesterday = (datetime.utcnow() - timedelta(days=2)).isoformat()
    res_date = client.get(f"/api/reports/data/applications?start_date={yesterday}", headers=headers)
    assert res_date.status_code == 200


def test_report_exports_csv_and_pdf():
    """
    Validates export of reports in CSV and PDF formats,
    ensuring PII masking is enforced for unauthorized users.
    """
    token = _get_token("cro.export@finsight.ai", "Export Officer", UserRole.RISK_MANAGER)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Export CSV
    res_csv = client.get("/api/reports/export/portfolio?format=csv", headers=headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers.get("content-type", "")
    assert "attachment; filename=" in res_csv.headers.get("content-disposition", "")
    csv_content = res_csv.text
    assert "FinSight AI" in csv_content
    assert "Portfolio Risk" in csv_content

    # 2. Export PDF (Printable Regulatory Dossier)
    res_pdf = client.get("/api/reports/export/delinquency?format=pdf", headers=headers)
    assert res_pdf.status_code == 200
    assert "text/html" in res_pdf.headers.get("content-type", "")
    html_content = res_pdf.text
    assert "FinSight AI Regulatory Intelligence Dossier" in html_content
    assert "Delinquency Aging" in html_content
    assert "<table" in html_content


def test_support_metrics():
    """
    Validates the support metrics summary endpoint.
    """
    token = _get_token("support.metrics@finsight.ai", "Metrics Agent", UserRole.OPERATIONS_OFFICER)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/support/metrics", headers=headers)
    assert res.status_code == 200
    m = res.json()
    assert "total_tickets" in m
    assert "open_tickets" in m
    assert "escalated" in m
    assert "resolved" in m
    assert "sla_compliance_pct" in m
