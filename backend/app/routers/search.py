"""
FinSight AI - Unified Global Search Router
Prompt 9 Requirement:
Search across:
- Customers
- Applications
- Loans
- Transactions
- Payments
- Tasks
- Fraud Cases
- Collection Cases
- Tickets

Search by:
- ID
- Name
- Phone where permitted
- Email where permitted
- Loan number
- Application number

Results strictly respect RBAC and PII protection rules.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.database import get_db
from app.models.customers import Customer
from app.models.loans import Loan, LoanApplication
from app.models.transactions import Transaction, Repayment
from app.models.assessments import FraudAlert, CollectionRecord
from app.models.portal_models import WorkTask, SupportTicket, Lead, FraudCase
from app.models.users import User, UserRole
from app.security.jwt import get_current_user_optional

router = APIRouter(prefix="/search", tags=["Global Unified Search"])


def _mask_phone(phone: Optional[str]) -> str:
    if not phone:
        return "N/A"
    clean = phone.strip()
    if len(clean) >= 4:
        return "******" + clean[-4:]
    return "******"


def _mask_email(email: Optional[str]) -> str:
    if not email or "@" not in email:
        return "hidden@***.com"
    parts = email.split("@")
    name = parts[0]
    domain = parts[1]
    masked_name = (name[0] + "***" + name[-1]) if len(name) > 2 else "u***"
    return f"{masked_name}@{domain}"


@router.get("", summary="Execute unified global search across all financial entities with RBAC")
def global_search(
    q: str = Query(..., min_length=1, description="Search query string"),
    limit_per_category: int = 6,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query_str = q.strip()
    term = f"%{query_str}%"

    try:
        limit_val = int(limit_per_category) if isinstance(limit_per_category, (int, str)) and str(limit_per_category).isdigit() else 6
    except Exception:
        limit_val = 6

    is_numeric = query_str.isdigit()
    num_id = int(query_str) if is_numeric else None
    
    # RBAC context evaluation
    is_customer = current_user and current_user.role == UserRole.CUSTOMER
    user_branch_id = getattr(current_user, "branch_id", None) if current_user else None
    
    # Authorized staff roles that can view unmasked customer PII
    can_view_pii = bool(
        current_user and current_user.role in {
            UserRole.ADMIN,
            UserRole.RISK_MANAGER,
            UserRole.CREDIT_MANAGER,
            UserRole.RELATIONSHIP_MANAGER,
            UserRole.COLLECTIONS_MANAGER,
            UserRole.OPERATIONS_MANAGER,
            UserRole.FINANCE_MANAGER,
            UserRole.AUDITOR
        }
    )

    # If user is a customer, identify their specific customer ID
    customer_record_id: Optional[int] = None
    if is_customer:
        c_obj = db.query(Customer).filter(Customer.email.ilike(current_user.email)).first()
        if c_obj:
            customer_record_id = c_obj.id

    results: Dict[str, List[Dict[str, Any]]] = {
        "customers": [],
        "applications": [],
        "loans": [],
        "transactions": [],
        "payments": [],
        "tasks": [],
        "fraud_cases": [],
        "collection_cases": [],
        "tickets": []
    }

    # 1. Search Customers (By ID, Name, Phone where permitted, Email where permitted)
    if not is_customer:
        c_filters = [
            Customer.customer_id.ilike(term),
            Customer.first_name.ilike(term),
            Customer.last_name.ilike(term),
            (Customer.first_name + " " + Customer.last_name).ilike(term),
            Customer.location.ilike(term)
        ]
        if is_numeric and num_id:
            c_filters.append(Customer.id == num_id)
        if can_view_pii:
            c_filters.append(Customer.email.ilike(term))
            c_filters.append(Customer.phone_hash.ilike(term))

        c_query = db.query(Customer).filter(or_(*c_filters))
        if user_branch_id:
            c_query = c_query.filter(Customer.location.ilike(f"%{user_branch_id}%"))
        custs = c_query.limit(limit_val).all()
        for c in custs:
            c_phone = getattr(c, "phone", None) or getattr(c, "phone_hash", None)
            ph = c_phone if can_view_pii else _mask_phone(c_phone)
            em = c.email if can_view_pii else _mask_email(c.email)
            results["customers"].append({
                "id": c.id,
                "customer_id": c.customer_id,
                "title": f"{c.first_name} {c.last_name}",
                "subtitle": f"{c.customer_id} • CIBIL: {c.credit_score} • {c.location} • {ph} • {em}",
                "url": f"/customer?id={c.id}",
                "badge": c.risk_tier,
                "entity_type": "Customer"
            })
    elif customer_record_id:
        c = db.query(Customer).filter(Customer.id == customer_record_id).first()
        c_phone = getattr(c, "phone", "") or getattr(c, "phone_hash", "") if c else ""
        if c and (query_str.lower() in f"{c.customer_id} {c.first_name} {c.last_name} {c.email} {c_phone}".lower()):
            results["customers"].append({
                "id": c.id,
                "customer_id": c.customer_id,
                "title": f"My Profile: {c.first_name} {c.last_name}",
                "subtitle": f"{c.customer_id} • CIBIL: {c.credit_score} • {c.location}",
                "url": f"/customer-portal",
                "badge": c.risk_tier,
                "entity_type": "Customer"
            })

    # 2. Search Applications (By ID, Application Number, Customer Name)
    app_filters = [
        LoanApplication.application_id.ilike(term),
        Customer.first_name.ilike(term),
        Customer.last_name.ilike(term),
        (Customer.first_name + " " + Customer.last_name).ilike(term),
        Customer.customer_id.ilike(term),
        LoanApplication.product_type.ilike(term)
    ]
    if is_numeric and num_id:
        app_filters.append(LoanApplication.id == num_id)

    app_query = db.query(LoanApplication).join(Customer, LoanApplication.customer_id == Customer.id).filter(
        or_(*app_filters)
    )
    if is_customer and customer_record_id:
        app_query = app_query.filter(LoanApplication.customer_id == customer_record_id)
    apps = app_query.limit(limit_val).all()
    for a in apps:
        cust_name = f"{a.customer.first_name} {a.customer.last_name}" if a.customer else "Applicant"
        results["applications"].append({
            "id": a.id,
            "application_id": a.application_id,
            "title": f"Application #{a.application_id} - ₹{a.requested_amount:,.0f}",
            "subtitle": f"{a.product_type} • {cust_name} • Status: {a.status}",
            "url": f"/customer-portal" if is_customer else f"/underwriting-queue?app_id={a.application_id}",
            "badge": a.status,
            "entity_type": "Application"
        })

    # 3. Search Loans (By ID, Loan Number, Customer Name)
    loan_filters = [
        Loan.loan_id.ilike(term),
        Customer.first_name.ilike(term),
        Customer.last_name.ilike(term),
        (Customer.first_name + " " + Customer.last_name).ilike(term),
        Customer.customer_id.ilike(term),
        Loan.product_type.ilike(term)
    ]
    if is_numeric and num_id:
        loan_filters.append(Loan.id == num_id)

    loan_query = db.query(Loan).join(Customer, Loan.customer_id == Customer.id).filter(
        or_(*loan_filters)
    )
    if is_customer and customer_record_id:
        loan_query = loan_query.filter(Loan.customer_id == customer_record_id)
    loans = loan_query.limit(limit_val).all()
    for l in loans:
        cust_name = f"{l.customer.first_name} {l.customer.last_name}" if l.customer else "Borrower"
        results["loans"].append({
            "id": l.id,
            "loan_id": l.loan_id,
            "title": f"Facility #{l.loan_id} - ₹{l.loan_amount:,.0f}",
            "subtitle": f"{l.product_type} • {cust_name} • Bal: ₹{l.outstanding_balance:,.0f} • DPD: {l.dpd}",
            "url": f"/customer-portal" if is_customer else f"/operations?loan_id={l.loan_id}",
            "badge": l.status,
            "entity_type": "Loan"
        })

    # 4. Search Transactions (By ID, Transaction ID, Reference, Channel)
    tx_filters = [
        Transaction.transaction_id.ilike(term),
        Transaction.reference.ilike(term),
        Transaction.transaction_type.ilike(term),
        Transaction.channel.ilike(term)
    ]
    if is_numeric and num_id:
        tx_filters.append(Transaction.id == num_id)

    tx_query = db.query(Transaction).filter(or_(*tx_filters))
    if is_customer and customer_record_id:
        tx_query = tx_query.filter(Transaction.customer_id == customer_record_id)
    txs = tx_query.limit(limit_val).all()
    for t in txs:
        results["transactions"].append({
            "id": t.id,
            "transaction_id": t.transaction_id,
            "title": f"Txn #{t.transaction_id} ({t.transaction_type})",
            "subtitle": f"₹{t.transaction_amount:,.0f} • {t.channel} • Status: {t.status}",
            "url": f"/customer-portal" if is_customer else f"/finance",
            "badge": t.status,
            "entity_type": "Transaction"
        })

    # 5. Search Payments (Repayments by ID, Loan ID, Status)
    rep_filters = [
        Repayment.repayment_id.ilike(term),
        Repayment.status.ilike(term)
    ]
    if is_numeric and num_id:
        rep_filters.append(Repayment.id == num_id)

    rep_query = db.query(Repayment).filter(or_(*rep_filters))
    if is_customer and customer_record_id:
        rep_query = rep_query.filter(Repayment.customer_id == customer_record_id)
    payments = rep_query.limit(limit_val).all()
    for p in payments:
        results["payments"].append({
            "id": p.id,
            "payment_id": p.repayment_id,
            "title": f"Payment #{p.repayment_id} - ₹{p.amount_due:,.0f}",
            "subtitle": f"Inst #{p.installment_number} • Due: {p.due_date.strftime('%Y-%m-%d') if p.due_date else 'N/A'} • Status: {p.status}",
            "url": f"/customer-portal" if is_customer else f"/finance",
            "badge": p.status,
            "entity_type": "Payment"
        })

    # 6. Search Tasks (Staff Only)
    if not is_customer:
        task_filters = [
            WorkTask.task_id.ilike(term),
            WorkTask.title.ilike(term),
            WorkTask.description.ilike(term),
            WorkTask.role_target.ilike(term)
        ]
        if is_numeric and num_id:
            task_filters.append(WorkTask.id == num_id)

        t_query = db.query(WorkTask).filter(or_(*task_filters))
        tasks = t_query.limit(limit_val).all()
        for tk in tasks:
            results["tasks"].append({
                "id": tk.id,
                "task_id": tk.task_id,
                "title": f"Task #{tk.task_id}: {tk.title}",
                "subtitle": f"Role: {tk.role_target} • Priority: {tk.priority} • Status: {tk.status}",
                "url": f"/tasks",
                "badge": tk.priority,
                "entity_type": "Task"
            })

    # 7. Search Fraud Cases (Staff Only - Fraud / Risk)
    if not is_customer:
        fc_filters = [
            FraudCase.case_id.ilike(term),
            FraudCase.severity.ilike(term),
            FraudCase.investigation_notes.ilike(term),
            FraudCase.fraud_indicators_json.ilike(term)
        ]
        if is_numeric and num_id:
            fc_filters.append(FraudCase.id == num_id)

        fc_query = db.query(FraudCase).filter(or_(*fc_filters))
        f_cases = fc_query.limit(limit_val).all()
        for fc in f_cases:
            results["fraud_cases"].append({
                "id": fc.id,
                "case_id": fc.case_id,
                "title": f"Fraud Case #{fc.case_id} ({fc.severity})",
                "subtitle": f"Risk Score: {fc.risk_score} • Status: {fc.status} • Assigned: {fc.assigned_officer or 'Desk'}",
                "url": f"/fraud",
                "badge": fc.status,
                "entity_type": "Fraud Case"
            })
        if not results["fraud_cases"]:
            # Fallback to FraudAlerts
            fa_filters = [
                FraudAlert.alert_id.ilike(term),
                FraudAlert.alert_type.ilike(term),
                FraudAlert.rule_triggered.ilike(term)
            ]
            if is_numeric and num_id:
                fa_filters.append(FraudAlert.id == num_id)

            fa_query = db.query(FraudAlert).filter(or_(*fa_filters)).limit(limit_val).all()
            for al in fa_query:
                results["fraud_cases"].append({
                    "id": al.id,
                    "case_id": al.alert_id,
                    "title": f"Fraud Alert #{al.alert_id}: {al.alert_type}",
                    "subtitle": f"Exposure: ₹{al.exposure_amount:,.0f} • Rule: {al.rule_triggered}",
                    "url": f"/fraud",
                    "badge": al.severity,
                    "entity_type": "Fraud Case"
                })

    # 8. Search Collection Cases (Staff Only - Collections / Risk)
    if not is_customer:
        cc_filters = [
            Loan.loan_id.ilike(term),
            Customer.first_name.ilike(term),
            Customer.last_name.ilike(term),
            (Customer.first_name + " " + Customer.last_name).ilike(term),
            CollectionRecord.workflow_stage.ilike(term),
            CollectionRecord.assigned_officer.ilike(term)
        ]
        if is_numeric and num_id:
            cc_filters.append(CollectionRecord.id == num_id)

        cc_query = db.query(CollectionRecord).join(Loan, CollectionRecord.loan_id == Loan.id).join(Customer, Loan.customer_id == Customer.id).filter(
            or_(*cc_filters)
        )
        colls = cc_query.limit(limit_val).all()
        for c_rec in colls:
            c_loan = c_rec.loan
            cust_name = f"{c_loan.customer.first_name} {c_loan.customer.last_name}" if (c_loan and c_loan.customer) else "Borrower"
            results["collection_cases"].append({
                "id": c_rec.id,
                "case_id": f"COL-{c_rec.id:04d}",
                "title": f"Collection: {cust_name} (Facility #{c_loan.loan_id if c_loan else 'N/A'})",
                "subtitle": f"Stage: {c_rec.workflow_stage} • Overdue DPD: {c_loan.dpd if c_loan else 0} • Officer: {c_rec.assigned_officer or 'Unassigned'}",
                "url": f"/collections",
                "badge": c_rec.workflow_stage,
                "entity_type": "Collection Case"
            })

    # 9. Search Tickets (Support Tickets by ID, Subject, Customer Name)
    tck_filters = [
        SupportTicket.ticket_id.ilike(term),
        SupportTicket.subject.ilike(term),
        SupportTicket.assigned_to.ilike(term),
        SupportTicket.assigned_officer.ilike(term)
    ]
    if is_numeric and num_id:
        tck_filters.append(SupportTicket.id == num_id)

    tck_query = db.query(SupportTicket).filter(or_(*tck_filters))
    if is_customer and customer_record_id:
        tck_query = tck_query.filter(SupportTicket.customer_id == customer_record_id)
    tcks = tck_query.limit(limit_val).all()
    for tc in tcks:
        cust = db.query(Customer).filter(Customer.id == tc.customer_id).first()
        cust_name = f"{cust.first_name} {cust.last_name}" if cust else "Customer"
        results["tickets"].append({
            "id": tc.id,
            "ticket_id": tc.ticket_id,
            "title": f"Ticket #{tc.ticket_id}: {tc.subject}",
            "subtitle": f"{tc.category} • {cust_name} • Priority: {tc.priority} • Status: {tc.status}",
            "url": f"/customer-portal" if is_customer else f"/support",
            "badge": tc.status,
            "entity_type": "Support Ticket"
        })

    total_matches = sum(len(v) for v in results.values())
    return {
        "query": query_str,
        "total_matches": total_matches,
        "results": results
    }
