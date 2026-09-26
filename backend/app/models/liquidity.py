from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text, Index
from app.database import Base

class LiquidityRecord(Base):
    __tablename__ = "liquidity_records"
    
    id = Column(Integer, primary_key=True, index=True)
    record_date = Column(Date, unique=True, index=True, default=date.today)
    available_liquidity_cr = Column(Float, nullable=False)  # ₹ Cr
    expected_inflows_cr = Column(Float, nullable=False)  # ₹ Cr
    expected_outflows_cr = Column(Float, nullable=False)  # ₹ Cr
    forecasted_liquidity_cr = Column(Float, nullable=False)  # ₹ Cr
    liquidity_buffer_ratio = Column(Float, default=1.45)  # Liquidity Coverage / Internal Buffer Ratio
    stress_test_status = Column(String(50), default="Compliant")  # Compliant, Adequate, Under_Pressure, Critical
    forecast_30d_trend = Column(String(30), default="Stable")
    created_at = Column(DateTime, default=datetime.utcnow)
