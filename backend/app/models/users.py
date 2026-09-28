import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum, Index
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    # 16 Canonical Institutional Roles
    CUSTOMER = "CUSTOMER"
    SALES_OFFICER = "SALES_OFFICER"
    RELATIONSHIP_MANAGER = "RELATIONSHIP_MANAGER"
    CREDIT_ANALYST = "CREDIT_ANALYST"
    CREDIT_MANAGER = "CREDIT_MANAGER"
    FRAUD_OFFICER = "FRAUD_OFFICER"
    KYC_OFFICER = "KYC_OFFICER"
    COLLECTIONS_OFFICER = "COLLECTIONS_OFFICER"
    COLLECTIONS_MANAGER = "COLLECTIONS_MANAGER"
    OPERATIONS_OFFICER = "OPERATIONS_OFFICER"
    OPERATIONS_MANAGER = "OPERATIONS_MANAGER"
    FINANCE_OFFICER = "FINANCE_OFFICER"
    FINANCE_MANAGER = "FINANCE_MANAGER"
    RISK_ANALYST = "RISK_ANALYST"
    RISK_MANAGER = "RISK_MANAGER"
    ADMIN = "ADMIN"

    # Backward Compatibility Aliases for existing DB rows and tests
    CREDIT_OFFICER = "CREDIT_OFFICER"
    COLLECTION_MANAGER = "COLLECTION_MANAGER"
    OPERATIONS = "OPERATIONS"
    EXECUTIVE = "EXECUTIVE"
    SALES = "SALES"
    ANALYST = "ANALYST"
    AUDITOR = "AUDITOR"

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    branch_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    city = Column(String(100), default="Mumbai")
    state = Column(String(50), default="Maharashtra")
    region = Column(String(50), default="West", index=True)  # West, North, South, East, Central
    address = Column(Text, nullable=True)
    manager_name = Column(String(100), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    dept_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    head_of_department = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    team_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    department_code = Column(String(50), nullable=True)
    branch_code = Column(String(50), nullable=True)
    team_lead = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.RISK_MANAGER, nullable=False)
    department = Column(String(100), default="Risk Management")
    branch_id = Column(String(50), nullable=True, index=True)
    branch_name = Column(String(100), nullable=True)
    team_id = Column(String(50), nullable=True)
    region = Column(String(50), default="West", index=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    is_locked = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    audit_logs = relationship("AuditLog", back_populates="user")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True, index=True)
    user_name = Column(String(100), nullable=True)
    user_role = Column(String(50), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True, index=True)
    entity_id = Column(String(100), nullable=True, index=True)
    details_json = Column(Text, nullable=True)
    before_state_json = Column(Text, nullable=True)
    after_state_json = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="audit_logs")
