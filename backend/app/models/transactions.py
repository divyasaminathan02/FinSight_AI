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
    
    customer = relationship("Customer", back_populates="transactions")
    loan = relationship("Loan", back_populates="transactions")

class Repayment(Base):
    __tablename__ = "repayments"
    
    id = Column(Integer, primary_key=True, index=True)
    repayment_id = Column(String(64), unique=True, index=True, nullable=False)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    due_date = Column(DateTime, nullable=False, index=True)
    repayment_date = Column(DateTime, nullable=True)
    amount_due = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0.0)
    dpd = Column(Integer, default=0, index=True)
    status = Column(String(30), default="Paid", index=True)  # Paid, Late, Overdue, Partial, Defaulted
    collection_attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    loan = relationship("Loan", back_populates="repayments")
