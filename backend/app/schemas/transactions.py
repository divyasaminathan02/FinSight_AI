from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class TransactionListItem(BaseModel):
    id: int
    transaction_id: str
    customer_id: int
    customer_name: Optional[str] = None
    loan_id: Optional[int] = None
    transaction_amount: float
    transaction_type: str
    transaction_timestamp: datetime
    channel: str
    status: str
    category: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TransactionListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[TransactionListItem]

class NotificationItem(BaseModel):
    id: int
    notification_id: str
    title: str
    message: str
    severity: str
    category: str
    responsible_agent: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationListResponse(BaseModel):
    unread_count: int
    items: List[NotificationItem]
