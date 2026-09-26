from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CustomerProfileSchema(BaseModel):
    financial_health_score: float
    churn_risk: float
    segment: str
    behavioral_score: float
    avg_monthly_spend: float
    savings_ratio: float
    sentiment_score: float

    model_config = ConfigDict(from_attributes=True)

class CustomerListItem(BaseModel):
    id: int
    customer_id: str
    first_name: str
    last_name: str
    full_name: str
    email: Optional[str] = None
    age: Optional[int] = None
    employment_type: Optional[str] = None
    occupation: Optional[str] = None
    income: Optional[float] = None
    location: Optional[str] = None
    state: Optional[str] = None
    credit_score: Optional[int] = None
    existing_loans: int = 0
    credit_utilization: float = 0.0
    bank_balance: float = 0.0
    risk_tier: str = "Moderate"
    financial_health_score: Optional[float] = 75.0
    churn_risk: Optional[float] = 0.05
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CustomerListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[CustomerListItem]
    summary: dict
