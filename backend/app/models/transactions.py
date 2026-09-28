from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(64), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=True, index=True)
    transaction_amount = Column(Float, nullable=False)
    transaction_type = Column(String(50), index=True)  # Disbursement, EMI_Repayment, Prepayment, Penalty, Refund, Withdrawal
    transaction_timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    channel = Column(String(50))  # UPI, NACH, NetBanking, Card, Cash, Branch
    status = Column(String(30), default="Success", index=True)  # Success, Failed, Pending, Flagged
    category = Column(String(50), nullable=True)  # Retail, Utility, MSME_Supply, Salary_Credit
    reconciliation_status = Column(String(30), default="MATCHED", index=True) # UNMATCHED, MATCHED, PARTIAL, EXCEPTION, RESOLVED
    created_by = Column(String(100), default="System")
    reference = Column(String(100), nullable=True)
    related_application_id = Column(String(50), nullable=True)
    related_installment_id = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    
    customer = relationship("Customer", back_populates="transactions")
    loan = relationship("Loan", back_populates="transactions")

class Repayment(Base):
    __tablename__ = "repayments"
    
    id = Column(Integer, primary_key=True, index=True)
    repayment_id = Column(String(64), unique=True, index=True, nullable=False)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    installment_number = Column(Integer, default=1, index=True)
    due_date = Column(DateTime, nullable=False, index=True)
    repayment_date = Column(DateTime, nullable=True)
    amount_due = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0.0)
    principal_amount = Column(Float, default=0.0)
    interest_amount = Column(Float, default=0.0)
    outstanding_amount = Column(Float, default=0.0)
    dpd = Column(Integer, default=0, index=True)
    status = Column(String(30), default="UPCOMING", index=True)  # UPCOMING, DUE, PAID, PARTIALLY_PAID, OVERDUE, WAIVED, Defaulted
    collection_attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    loan = relationship("Loan", back_populates="repayments")

class FinanceAdjustment(Base):
    __tablename__ = "finance_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    adjustment_id = Column(String(50), unique=True, index=True, nullable=False)
    transaction_id = Column(String(64), nullable=True, index=True)
    loan_id = Column(Integer, nullable=True, index=True)
    customer_id = Column(Integer, nullable=True, index=True)
    amount = Column(Float, nullable=False)
    adjustment_type = Column(String(50), default="CREDIT_ADJUSTMENT") # CREDIT_ADJUSTMENT, DEBIT_ADJUSTMENT, FEE_WAIVER, INTEREST_CORRECTION
    reason = Column(Text, nullable=False)
    authorized_by = Column(String(100), nullable=False)
    status = Column(String(30), default="APPROVED", index=True) # PENDING_APPROVAL, APPROVED, REJECTED
    manager_notes = Column(Text, nullable=True)
    approved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class ReconciliationRecord(Base):
    __tablename__ = "reconciliation_records"

    id = Column(Integer, primary_key=True, index=True)
    recon_id = Column(String(50), unique=True, index=True, nullable=False)
    batch_id = Column(String(50), index=True)
    transaction_id = Column(String(64), nullable=True, index=True)
    expected_amount = Column(Float, nullable=False)
    received_amount = Column(Float, nullable=False)
    difference = Column(Float, default=0.0)
    status = Column(String(30), default="MATCHED", index=True) # UNMATCHED, MATCHED, PARTIAL, EXCEPTION, RESOLVED
    notes = Column(Text, nullable=True)
    reconciled_by = Column(String(100), nullable=True)
    reconciled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
