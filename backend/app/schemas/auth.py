from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.users import UserRole

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    department: Optional[str] = None
    branch: Optional[str] = "Headquarters - Mumbai"
    permissions: Optional[List[str]] = None
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.RISK_MANAGER
    department: Optional[str] = "Risk Management"

class DemoUserItem(BaseModel):
    name: str
    email: str
    role: str
    department: str
    description: str
    password_hint: str

