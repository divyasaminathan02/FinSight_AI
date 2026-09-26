import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.loans import Loan, LoanApplication

client = TestClient(app)

def test_complete_loan_lifecycle_workflow():
    # 1. Borrower submits loan application
    apply_res = client.post("/api/loans/apply", json={
        "customer_id": "CUST-00001",
        "product_type": "Personal Instant Credit Line",
        "requested_amount": 250000.0,
        "requested_tenure": 12,
        "purpose": "Medical & Home Emergency",
        "monthly_income": 80000.0
    })
    assert apply_res.status_code == 201
    data = apply_res.json()
    app_id = data["application_id"]
    assert app_id.startswith("APP-")
    assert data["initial_status"] == "Under_Review"

    # 2. Credit Officer reviews and approves
    rev_res = client.post(f"/api/loans/applications/{app_id}/review", json={
        "action": "APPROVE",
        "approved_amount": 250000.0,
        "notes": "Verified CIBIL > 750 and low credit utilization. Sanctioned.",
        "reviewer_name": "Priya Sharma (Credit Officer)"
    })
    assert rev_res.status_code == 200
    assert rev_res.json()["new_status"] == "Approved"

    # 3. Operations staff disburses loan
    disb_res = client.post(f"/api/loans/applications/{app_id}/disburse", json={
        "interest_rate": 14.0,
        "tenure": 12,
        "remarks": "eNACH signed, released via RTGS."
    })
    assert disb_res.status_code == 200
    loan_id = disb_res.json()["loan_id"]
    assert loan_id.startswith("LN-")
    assert disb_res.json()["monthly_emi"] > 0

    # 4. Verify loan schedule endpoint
    sched_res = client.get(f"/api/loans/{loan_id}/schedule")
    assert sched_res.status_code == 200
    assert len(sched_res.json()["schedule"]) == 12

    # 5. Customer makes repayment
    emi_amt = disb_res.json()["monthly_emi"]
    pay_res = client.post(f"/api/loans/{loan_id}/pay", json={
        "amount": emi_amt,
        "payment_method": "UPI",
        "reference_no": "UPI/TEST/AUTO"
    })
    assert pay_res.status_code == 200
    assert pay_res.json()["amount_paid"] == emi_amt
    assert pay_res.json()["outstanding_balance"] < 250000.0

def test_finance_overview_api():
    res = client.get("/api/finance/overview")
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert "aging_buckets" in data
    assert data["kpis"]["total_aum_cr"] > 0
    assert data["kpis"]["net_interest_margin_pct"] > 0

def test_document_and_support_workflows():
    # Documents
    doc_res = client.post("/api/loans/documents/upload?customer_id=1&doc_type=SALARY_SLIP&file_name=aug_salary.pdf")
    assert doc_res.status_code == 201
    doc_id = doc_res.json()["doc_id"]

    verify_res = client.post(f"/api/loans/documents/{doc_id}/verify?action=VERIFIED&notes=Valid+seal")
    assert verify_res.status_code == 200
    assert verify_res.json()["document_status"] == "VERIFIED"

    # Support Tickets
    tick_res = client.post("/api/loans/support-tickets?customer_id=1&subject=Address+update+request&category=GENERAL&initial_message=Moved+to+new+flat")
    assert tick_res.status_code == 201
    assert "ticket_id" in tick_res.json()

def test_copilot_database_grounded_queries():
    res1 = client.post("/api/copilot/chat", json={"query": "Show pending loan applications"})
    assert res1.status_code == 200
    assert "Pending Loan Applications" in res1.json()["text"]

    res2 = client.post("/api/copilot/chat", json={"query": "Show overdue loans and delinquency"})
    assert res2.status_code == 200
    assert "Delinquency" in res2.json()["text"]

    res3 = client.post("/api/copilot/chat", json={"query": "Show cumulative disbursements"})
    assert res3.status_code == 200
    assert "Disbursement" in res3.json()["text"]
