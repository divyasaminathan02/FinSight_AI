import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base

class LoanProduct(Base):
    __tablename__ = "loan_products"

    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # MSME, Personal, Commercial Vehicle, Gold, Microfinance
    min_amount = Column(Float, nullable=False)
    max_amount = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)  # Annual rate in % (e.g., 12.5)
    min_tenure = Column(Integer, nullable=False)   # in months
    max_tenure = Column(Integer, nullable=False)   # in months
    processing_fee_pct = Column(Float, default=1.5)
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"), nullable=True, index=True)
    doc_type = Column(String(50), nullable=False)  # PAN_CARD, AADHAAR, BANK_STATEMENT, SALARY_SLIP, ITR
    file_name = Column(String(255), nullable=False)
    file_size_kb = Column(Integer, default=256)
    status = Column(String(30), default="UPLOADED", index=True)  # UPLOADED, UNDER_REVIEW, VERIFIED, REJECTED, REUPLOAD_REQUIRED
    verified_by = Column(String(100), nullable=True)
    verification_notes = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    subject = Column(String(200), nullable=False)
    category = Column(String(50), default="GENERAL")  # LOAN_STATUS, DISBURSEMENT, EMI_PAYMENT, GRIEVANCE, GENERAL
    priority = Column(String(20), default="MEDIUM")   # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(30), default="OPEN", index=True)  # OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED
    assigned_to = Column(String(100), nullable=True)
    messages_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
