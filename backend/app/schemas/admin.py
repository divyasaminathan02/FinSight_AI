from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class UserCreateAdmin(BaseModel):
    email: str
    password: str
    full_name: str
    role: str
    department: Optional[str] = "Credit & Risk Management"
    branch_id: Optional[str] = "BR-MUM-01"
    branch_name: Optional[str] = "Mumbai Central Flagship"
    team_id: Optional[str] = None
    region: Optional[str] = "West"
    phone: Optional[str] = "+91 98201 12345"

class UserUpdateAdmin(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    team_id: Optional[str] = None
    region: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_locked: Optional[bool] = None

class ResetPasswordAdmin(BaseModel):
    new_password: str = Field(..., min_length=6)

class BranchSchema(BaseModel):
    id: Optional[int] = None
    branch_code: str
    name: str
    city: str = "Mumbai"
    state: str = "Maharashtra"
    region: str = "West"
    address: Optional[str] = None
    manager_name: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DepartmentSchema(BaseModel):
    id: Optional[int] = None
    dept_code: str
    name: str
    head_of_department: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TeamSchema(BaseModel):
    id: Optional[int] = None
    team_code: str
    name: str
    department_code: Optional[str] = None
    branch_code: Optional[str] = None
    team_lead: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LoanProductAdminCreate(BaseModel):
    product_code: str
    name: str
    category: str
    min_amount: float
    max_amount: float
    interest_rate: float
    min_tenure: int
    max_tenure: int
    processing_fee_pct: float = 1.5
    eligibility_criteria: Optional[str] = "{}"
    required_documents: Optional[str] = '["PAN_CARD", "AADHAAR", "BANK_STATEMENT"]'
    approval_threshold: float = 500000.0
    description: Optional[str] = None
    is_active: bool = True

class LoanProductAdminUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    min_tenure: Optional[int] = None
    max_tenure: Optional[int] = None
    processing_fee_pct: Optional[float] = None
    eligibility_criteria: Optional[str] = None
    required_documents: Optional[str] = None
    approval_threshold: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ApprovalRuleAdminCreate(BaseModel):
    rule_code: str
    tier_name: str
    min_amount: float
    max_amount: float
    required_role: str
    min_cibil_score: int = 650
    max_dti_pct: float = 55.0
    escalation_role: str = "RISK_MANAGER"
    requires_dual_approval: bool = False
    secondary_role: Optional[str] = None
    workflow_name: str = "Standard Credit & Risk Workflow"
    is_active: bool = True

class ApprovalRuleAdminUpdate(BaseModel):
    tier_name: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    required_role: Optional[str] = None
    min_cibil_score: Optional[int] = None
    max_dti_pct: Optional[float] = None
    escalation_role: Optional[str] = None
    requires_dual_approval: bool = None
    secondary_role: Optional[str] = None
    workflow_name: Optional[str] = None
    is_active: Optional[bool] = None

class ApprovalEvaluatePayload(BaseModel):
    amount: float
    cibil_score: Optional[int] = 720
    dti_pct: Optional[float] = 35.0
    risk_score: Optional[float] = 25.0
    product_category: Optional[str] = "MSME"

class NotificationBroadcastPayload(BaseModel):
    title: str
    message: str
    priority: str = "MEDIUM"
    target_role: Optional[str] = "ALL"
    target_branch: Optional[str] = "ALL"
