from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.transactions import Transaction
from app.models.customers import Customer
from app.schemas.transactions import TransactionListResponse, TransactionListItem

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    transaction_type: Optional[str] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).join(Customer, Transaction.customer_id == Customer.id)
    
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if channel:
        query = query.filter(Transaction.channel == channel)
    if status:
        query = query.filter(Transaction.status == status)

    total = query.count()
    offset = (page - 1) * page_size
    transactions = query.order_by(desc(Transaction.transaction_timestamp)).offset(offset).limit(page_size).all()
    
    items = []
    for t in transactions:
        items.append(TransactionListItem(
            id=t.id,
            transaction_id=t.transaction_id,
            customer_id=t.customer_id,
            customer_name=f"{t.customer.first_name} {t.customer.last_name}" if t.customer else "Unknown",
            loan_id=t.loan_id,
            transaction_amount=t.transaction_amount,
            transaction_type=t.transaction_type,
            transaction_timestamp=t.transaction_timestamp,
            channel=t.channel,
            status=t.status,
            category=t.category
        ))

    return TransactionListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items
    )
