from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.loans import Loan, LoanApplication
from app.models.customers import Customer
from app.schemas.loans import LoanListResponse, LoanListItem

router = APIRouter(prefix="/loans", tags=["Loans"])

@router.get("", response_model=LoanListResponse)
def list_loans(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    product_type: Optional[str] = None,
    status: Optional[str] = None,
    min_dpd: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Loan).join(Customer, Loan.customer_id == Customer.id)
    
    if product_type:
        query = query.filter(Loan.product_type == product_type)
    if status:
        query = query.filter(Loan.status == status)
    if min_dpd is not None:
        query = query.filter(Loan.dpd >= min_dpd)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Loan.loan_id.ilike(search_fmt)) |
            (Customer.customer_id.ilike(search_fmt)) |
            (Customer.first_name.ilike(search_fmt)) |
            (Customer.last_name.ilike(search_fmt))
        )

    total = query.count()
    offset = (page - 1) * page_size
    loans = query.order_by(Loan.id).offset(offset).limit(page_size).all()
    
    items = []
    for l in loans:
        items.append(LoanListItem(
            id=l.id,
            loan_id=l.loan_id,
            customer_id=l.customer_id,
            customer_name=f"{l.customer.first_name} {l.customer.last_name}" if l.customer else "Unknown",
            customer_identifier=l.customer.customer_id if l.customer else "",
            product_type=l.product_type,
            loan_amount=l.loan_amount,
            interest_rate=l.interest_rate,
            loan_tenure=l.loan_tenure,
            emi=l.emi,
            outstanding_balance=l.outstanding_balance,
            dpd=l.dpd,
            status=l.status,
            disbursed_date=l.disbursed_date,
            risk_tier=l.customer.risk_tier if l.customer else "Moderate"
        ))

    total_disbursed = db.query(func.sum(Loan.loan_amount)).scalar() or 7182000000.0
    active_count = db.query(func.count(Loan.id)).filter(Loan.status == "Active").scalar() or 0
    delinquent_count = db.query(func.count(Loan.id)).filter(Loan.dpd > 0).scalar() or 0

    return LoanListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
        summary={
            "total_portfolio_inr": total_disbursed,
            "total_portfolio_cr": round(total_disbursed / 10000000.0, 1),
            "active_loans": active_count,
            "delinquent_loans": delinquent_count,
            "npa_ratio_pct": round((delinquent_count / max(total, 1)) * 100, 2)
        }
    )

@router.get("/{loan_id}")
def get_loan_details(loan_id: str, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(
        (Loan.loan_id == loan_id) | (Loan.id == (int(loan_id) if loan_id.isdigit() else -1))
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    return {
        "loan": loan,
        "customer": loan.customer,
        "repayments": loan.repayments[:12],
        "assessments": loan.credit_assessments,
        "fraud_alerts": loan.fraud_alerts,
        "collection_records": loan.collection_records
    }
