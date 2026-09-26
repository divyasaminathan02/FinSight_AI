from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class LoanListItem(BaseModel):
    id: int
    loan_id: str
    customer_id: int
    customer_name: Optional[str] = None
    customer_identifier: Optional[str] = None
    product_type: str
    loan_amount: float
    interest_rate: float
    loan_tenure: int
    emi: float
    outstanding_balance: float
    dpd: int
    status: str
    disbursed_date: Optional[datetime] = None
    risk_tier: Optional[str] = "Moderate"

    model_config = ConfigDict(from_attributes=True)

class LoanListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[LoanListItem]
    summary: dict
