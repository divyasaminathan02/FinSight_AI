"""
FinSight AI - Complete Customer Portal E2E Lifecycle Test
Tests exact sequence from Prompt 2:
Customer login
-> Apply
-> Save draft
-> Submit
-> Upload document
-> Move workflow
-> Approve
-> Offer
-> Accept
-> Disburse
-> View active loan
-> Pay EMI
-> Verify payment history
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

def test_full_customer_portal_lifecycle():
    # 1. Customer Login
    login_res = client.post("/api/auth/login", json={
        "email": "customer.demo@finsight.ai",
        "password": settings.DEMO_PASSWORD
    })
    assert login_res.status_code == 200, f"Customer login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. View Customer Dashboard
    dash_res = client.get("/api/customer/dashboard", headers=headers)
    assert dash_res.status_code == 200, f"Dashboard failed: {dash_res.text}"
    dash_data = dash_res.json()
    assert "customer" in dash_data
    assert "overview" in dash_data
    assert "profile_completion" in dash_data["customer"]
    assert "kyc_status" in dash_data["customer"]

    # 3. View & Update Profile (Permitted fields)
    prof_res = client.get("/api/customer/profile", headers=headers)
    assert prof_res.status_code == 200
    prof_data = prof_res.json()
    assert "personal_info" in prof_data
    assert "contact_info" in prof_data
    assert "employment_info" in prof_data
    assert "bank_info" in prof_data

    update_prof_res = client.put("/api/customer/profile", json={
        "phone": "+91 98450 99999",
        "city": "Bengaluru",
        "income": 160000.0,
        "employer_name": "Verma Global Logistics"
    }, headers=headers)
    assert update_prof_res.status_code == 200

    # 4. Browse Loan Products from Database
    products_res = client.get("/api/customer/products", headers=headers)
    assert products_res.status_code == 200
    products = products_res.json()
    assert len(products) >= 1
    sample_prod = products[0]
    assert "name" in sample_prod
    assert "min_amount" in sample_prod
    assert "interest_rate_pa" in sample_prod

    # 5. Save Draft Application (Steps 1-6)
    draft_res = client.post("/api/customer/applications/draft", json={
        "product_type": sample_prod["name"],
        "requested_amount": 750000.0,
        "requested_tenure": 36,
        "purpose": "Fleet expansion and technology setup",
        "step": 3
    }, headers=headers)
    assert draft_res.status_code == 200
    draft_app_id = draft_res.json()["application_id"]
    assert draft_app_id.startswith("APP-")

    # 6. Submit Loan Application (Step 9)
    submit_res = client.post("/api/customer/applications/submit", json={
        "draft_application_id": draft_app_id,
        "product_type": sample_prod["name"],
        "requested_amount": 750000.0,
        "requested_tenure": 36,
        "purpose": "Fleet expansion and technology setup",
        "employment_details": {
            "employment_type": "Self-Employed MSME",
            "employer_name": "Verma Global Logistics",
            "monthly_income": 160000.0
        },
        "bank_details": {
            "bank_name": "HDFC Bank",
            "bank_account_number": "50100492817492",
            "bank_ifsc": "HDFC0001234"
        }
    }, headers=headers)
    assert submit_res.status_code == 201
    app_id = submit_res.json()["application_id"]

    # 7. Upload Supporting Document
    upload_res = client.post(
        f"/api/customer/documents/upload?doc_type=PAN_CARD&file_name=pan_card_verma.pdf&file_size_kb=320",
        headers=headers
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["doc_id"]
    assert doc_id.startswith("DOC-")

    # 8. Move Workflow Through Real NBFC States
    workflow_steps = [
        "DOCUMENT_VERIFICATION",
        "KYC_REVIEW",
        "FRAUD_REVIEW",
        "CREDIT_REVIEW",
        "RISK_REVIEW",
        "APPROVAL_PENDING",
        "APPROVED",
        "OFFER_SENT"
    ]
    for step in workflow_steps:
        wf_res = client.post(f"/api/customer/applications/{app_id}/advance-workflow", json={
            "target_status": step
        }, headers=headers)
        assert wf_res.status_code == 200, f"Step {step} failed: {wf_res.text}"

    # 9. View Customer Offer Details
    app_detail_res = client.get(f"/api/customer/applications/{app_id}", headers=headers)
    assert app_detail_res.status_code == 200
    app_detail = app_detail_res.json()
    assert app_detail["status"] == "OFFER_SENT"
    assert app_detail["offer"] is not None
    assert app_detail["offer"]["approved_amount"] == 750000.0
    assert "monthly_emi" in app_detail["offer"]
    assert "interest_rate_pa" in app_detail["offer"]

    # 10. Accept Sanction Offer
    accept_res = client.post(f"/api/customer/applications/{app_id}/offer-decision", json={
        "action": "ACCEPT",
        "decision_notes": "Accepted terms online via borrower self-service portal"
    }, headers=headers)
    assert accept_res.status_code == 200
    assert accept_res.json()["new_status"] == "CUSTOMER_ACCEPTED"

    # 11. Disburse Facility
    disb_res = client.post(f"/api/customer/applications/{app_id}/advance-workflow", json={
        "target_status": "DISBURSED"
    }, headers=headers)
    assert disb_res.status_code == 200

    # 12. View Active Loan & Repayment Schedule
    loans_res = client.get("/api/customer/loans", headers=headers)
    assert loans_res.status_code == 200
    active_loans = loans_res.json()
    assert len(active_loans) >= 1
    target_loan = active_loans[0]
    loan_id = target_loan["loan_id"]

    loan_detail_res = client.get(f"/api/customer/loans/{loan_id}", headers=headers)
    assert loan_detail_res.status_code == 200
    loan_detail = loan_detail_res.json()
    assert loan_detail["outstanding_amount"] > 0
    assert len(loan_detail["repayment_schedule"]) > 0
    initial_outstanding = loan_detail["outstanding_amount"]
    emi_amount = loan_detail["emi"]

    # 13. Pay EMI (Simulated Payment)
    pay_res = client.post("/api/customer/payments/simulate", json={
        "loan_id": loan_id,
        "amount": emi_amount,
        "payment_channel": "UPI_SIMULATED",
        "remarks": "E2E Test Installment Payment"
    }, headers=headers)
    assert pay_res.status_code == 200
    pay_data = pay_res.json()
    assert pay_data["status"] == "success"
    assert pay_data["new_outstanding_balance"] < initial_outstanding

    # 14. Verify Payment History & Repayments
    loan_after_pay = client.get(f"/api/customer/loans/{loan_id}", headers=headers).json()
    assert loan_after_pay["outstanding_amount"] == pay_data["new_outstanding_balance"]
    assert len(loan_after_pay["payment_history"]) >= 1
    assert any(tx["transaction_id"] == pay_data["transaction_id"] for tx in loan_after_pay["payment_history"])

    # 15. Create Support Ticket & Reply
    ticket_res = client.post("/api/customer/support-tickets", json={
        "subject": "Inquiry on Statement of Account",
        "category": "Loan application",
        "priority": "LOW",
        "message": "Please send monthly interest certificates for tax purposes."
    }, headers=headers)
    assert ticket_res.status_code == 201
    ticket_id = ticket_res.json()["ticket_id"]

    reply_res = client.post(f"/api/customer/support-tickets/{ticket_id}/reply", json={
        "message": "Following up with the relationship desk."
    }, headers=headers)
    assert reply_res.status_code == 200

    # 16. Verify Customer Notifications
    notifs_res = client.get("/api/customer/notifications", headers=headers)
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    assert len(notifs) >= 1
    assert any("Payment Received" in n["title"] or "Application" in n["title"] for n in notifs)

    print("\n[OK] Complete Customer Portal E2E Lifecycle test passed successfully!")

if __name__ == "__main__":
    test_full_customer_portal_lifecycle()
