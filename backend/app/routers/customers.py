from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.customers import Customer, CustomerProfile
from app.schemas.customers import CustomerListResponse, CustomerListItem

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=CustomerListResponse)
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    risk_tier: Optional[str] = None,
    employment_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Customer.first_name.ilike(search_fmt)) |
            (Customer.last_name.ilike(search_fmt)) |
            (Customer.customer_id.ilike(search_fmt)) |
            (Customer.email.ilike(search_fmt))
        )
    if risk_tier:
        query = query.filter(Customer.risk_tier == risk_tier)
    if employment_type:
        query = query.filter(Customer.employment_type == employment_type)

    total = query.count()
    offset = (page - 1) * page_size
    customers = query.order_by(Customer.id).offset(offset).limit(page_size).all()
    
    items = []
    for c in customers:
        full_name = f"{c.first_name} {c.last_name}"
        health_score = c.profile.financial_health_score if c.profile else 75.0
        churn = c.profile.churn_risk if c.profile else 0.05
        
        items.append(CustomerListItem(
            id=c.id,
            customer_id=c.customer_id,
            first_name=c.first_name,
            last_name=c.last_name,
            full_name=full_name,
            email=c.email,
            age=c.age,
            employment_type=c.employment_type,
            occupation=c.occupation,
            income=c.income,
            location=c.location,
            state=c.state,
            credit_score=c.credit_score,
            existing_loans=c.existing_loans or 0,
            credit_utilization=c.credit_utilization or 0.0,
            bank_balance=c.bank_balance or 0.0,
            risk_tier=c.risk_tier or "Moderate",
            financial_health_score=health_score,
            churn_risk=churn,
            created_at=c.created_at
        ))
        
    # Summary aggregations
    avg_score = db.query(func.avg(Customer.credit_score)).scalar() or 720.0
    tier_counts = {
        "Low": db.query(func.count(Customer.id)).filter(Customer.risk_tier == "Low").scalar() or 0,
        "Moderate": db.query(func.count(Customer.id)).filter(Customer.risk_tier == "Moderate").scalar() or 0,
        "High": db.query(func.count(Customer.id)).filter(Customer.risk_tier == "High").scalar() or 0,
        "Critical": db.query(func.count(Customer.id)).filter(Customer.risk_tier == "Critical").scalar() or 0,
    }

    return CustomerListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
        summary={
            "total_borrowers": total,
            "avg_credit_score": round(avg_score, 0),
            "tier_distribution": tier_counts
        }
    )

@router.get("/{customer_id}")
def get_customer_details(customer_id: str, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == (int(customer_id) if customer_id.isdigit() else -1))
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {
        "customer": customer,
        "profile": customer.profile,
        "loans_count": len(customer.loans),
        "assessments": customer.assessments,
        "fraud_alerts": customer.fraud_alerts,
        "collection_records": customer.collection_records
    }
