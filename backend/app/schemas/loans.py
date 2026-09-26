from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

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

class LoanApplicationItem(BaseModel):
    id: int
    application_id: str
    customer_id: int
    customer_name: Optional[str] = "Applicant"
    customer_identifier: Optional[str] = ""
    customer_phone: Optional[str] = None
    customer_income: Optional[float] = None
    customer_cibil: Optional[int] = None
    product_type: str
    requested_amount: float
    requested_tenure: int
    purpose: Optional[str] = None
    status: str
    risk_score: float
    default_probability: float
    approved_amount: Optional[float] = None
    reviewer_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    disbursed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LoanApplicationListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[LoanApplicationItem]
    status_counts: Dict[str, int]

class LoanApplyRequest(BaseModel):
    customer_id: Optional[str] = "CUST-00001"
    customer_name: Optional[str] = "Applicant"
    product_type: str = "MSME Business Growth Loan"
    requested_amount: float = Field(..., ge=10000)
    requested_tenure: int = Field(..., ge=3, le=84)
    purpose: str = "Business Working Capital"
    monthly_income: Optional[float] = 75000.0

class LoanReviewRequest(BaseModel):
    action: str = Field(..., description="APPROVE, REJECT, DOCUMENTS_REQUIRED, RISK_REVIEW")
    approved_amount: Optional[float] = None
    notes: Optional[str] = "Standard underwriting review completed."
    reviewer_name: Optional[str] = "Credit Officer"

class LoanDisburseRequest(BaseModel):
    interest_rate: Optional[float] = 13.5
    tenure: Optional[int] = None
    disbursement_account: Optional[str] = "•••• •••• 9281"
    remarks: Optional[str] = "Operations verification passed; disbursement released via NEFT/RTGS."

class LoanPaymentRequest(BaseModel):
    amount: float = Field(..., ge=1.0)
    payment_method: str = "UPI"  # UPI, ECS, NET_BANKING, DEBIT_CARD
    reference_no: Optional[str] = None

class LoanProductSchema(BaseModel):
    id: Optional[int] = None
    product_code: str
    name: str
    category: str
    min_amount: float
    max_amount: float
    interest_rate: float
    min_tenure: int
    max_tenure: int
    processing_fee_pct: float
    is_active: bool = True
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentSchema(BaseModel):
    id: int
    doc_id: str
    customer_id: int
    application_id: Optional[int] = None
    doc_type: str
    file_name: str
    file_size_kb: int
    status: str
    verified_by: Optional[str] = None
    verification_notes: Optional[str] = None
    uploaded_at: datetime
    verified_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SupportTicketSchema(BaseModel):
    id: int
    ticket_id: str
    customer_id: int
    customer_name: Optional[str] = None
    subject: str
    category: str
    priority: str
    status: str
    assigned_to: Optional[str] = None
    messages: List[Dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime
