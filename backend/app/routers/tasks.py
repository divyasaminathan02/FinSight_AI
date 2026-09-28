"""
FinSight AI - Work Task & Follow-up Task Management Router
Supports Task Fields: Title, Description, Customer, Application, Assigned User, Priority, Due Date, Status (TODO, IN_PROGRESS, WAITING, COMPLETED, CANCELLED), Created Date, Completed Date.
"""

import uuid
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.portal_models import WorkTask
from app.models.notifications import Notification
from app.models.users import User, UserRole, AuditLog
from app.security.jwt import get_current_user_optional

router = APIRouter(prefix="/tasks", tags=["Task & Approval Center"])

VALID_TASK_STATUSES = ["TODO", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED", "PENDING"]

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    customer_id: Optional[str] = None
    application_id: Optional[str] = None
    assigned_user: Optional[str] = None
    assigned_to: Optional[str] = None
    role_target: str = "SALES_OFFICER"
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    due_date: Optional[datetime] = None
    status: str = "TODO"
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None

class TaskUpdate(BaseModel):
    status: Optional[str] = None  # TODO, IN_PROGRESS, WAITING, COMPLETED, CANCELLED
    priority: Optional[str] = None
    assigned_user: Optional[str] = None
    assigned_to: Optional[str] = None
    comment: Optional[str] = None
    due_date: Optional[datetime] = None

class TaskResponse(BaseModel):
    id: int
    task_id: str
    title: str
    description: Optional[str] = None
    customer_id: Optional[str] = None
    application_id: Optional[str] = None
    assigned_user: Optional[str] = None
    assigned_to: Optional[str] = None
    role_target: str
    priority: str
    status: str
    due_date: Optional[datetime] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    comments: List[dict] = []
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

def _build_task_response(t: WorkTask) -> TaskResponse:
    comments = []
    try:
        comments = json.loads(t.comments_json or "[]")
    except Exception:
        comments = []

    # normalize status: map PENDING to TODO if desired
    st = t.status or "TODO"
    if st == "PENDING":
        st = "TODO"

    return TaskResponse(
        id=t.id,
        task_id=t.task_id,
        title=t.title,
        description=t.description,
        customer_id=t.customer_id,
        application_id=t.application_id,
        assigned_user=t.assigned_to,
        assigned_to=t.assigned_to,
        role_target=t.role_target or "OPERATIONS",
        priority=t.priority or "MEDIUM",
        status=st,
        due_date=t.due_date,
        created_at=t.created_at,
        completed_at=t.completed_at,
        related_entity_type=t.related_entity_type,
        related_entity_id=t.related_entity_id,
        comments=comments,
        updated_at=t.updated_at
    )

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    role: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    customer_id: Optional[str] = None,
    application_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(WorkTask)
    if role:
        query = query.filter(WorkTask.role_target == role.upper())
    elif current_user and current_user.role not in [UserRole.ADMIN, UserRole.RISK_MANAGER]:
        role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        role_filters = [role_val]
        if "CREDIT" in role_val:
            role_filters.extend(["CREDIT_OFFICER", "CREDIT_ANALYST", "CREDIT_MANAGER"])
        elif "OPERATIONS" in role_val:
            role_filters.extend(["OPERATIONS", "OPERATIONS_OFFICER", "OPERATIONS_MANAGER"])
        elif "COLLECTION" in role_val:
            role_filters.extend(["COLLECTION_MANAGER", "COLLECTIONS_OFFICER", "COLLECTIONS_MANAGER"])
        elif "FRAUD" in role_val or "KYC" in role_val:
            role_filters.extend(["FRAUD_OFFICER", "KYC_OFFICER"])
        elif "SALES" in role_val or "RELATIONSHIP" in role_val:
            role_filters.extend(["SALES", "SALES_OFFICER", "RELATIONSHIP_MANAGER"])

        query = query.filter(
            (WorkTask.role_target.in_(role_filters)) |
            (WorkTask.assigned_to.ilike(f"%{current_user.full_name}%")) |
            (WorkTask.assigned_to.ilike(f"%{current_user.email}%"))
        )

    if status:
        st_filter = status.upper()
        if st_filter == "TODO":
            query = query.filter(WorkTask.status.in_(["TODO", "PENDING"]))
        else:
            query = query.filter(WorkTask.status == st_filter)
    if priority:
        query = query.filter(WorkTask.priority == priority.upper())
    if customer_id:
        query = query.filter(WorkTask.customer_id == customer_id)
    if application_id:
        query = query.filter(WorkTask.application_id == application_id)

    tasks = query.order_by(desc(WorkTask.id)).all()
    return [_build_task_response(t) for t in tasks]

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    task_id = f"TSK-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    assigned = task_in.assigned_user or task_in.assigned_to
    st = task_in.status.upper()
    if st not in VALID_TASK_STATUSES:
        st = "TODO"

    new_task = WorkTask(
        task_id=task_id,
        title=task_in.title,
        description=task_in.description,
        customer_id=task_in.customer_id,
        application_id=task_in.application_id,
        role_target=task_in.role_target.upper(),
        assigned_to=assigned,
        priority=task_in.priority.upper(),
        status=st,
        due_date=task_in.due_date,
        related_entity_type=task_in.related_entity_type or ("APPLICATION" if task_in.application_id else "CUSTOMER" if task_in.customer_id else None),
        related_entity_id=task_in.related_entity_id or task_in.application_id or task_in.customer_id,
        comments_json="[]",
        created_at=datetime.utcnow()
    )
    db.add(new_task)

    # Notification
    notif = Notification(
        notification_id=f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        title=f"Task: {task_in.title}",
        message=f"Assigned to {assigned or task_in.role_target}. Priority: {task_in.priority.upper()}.",
        severity="Medium" if task_in.priority.upper() in ["HIGH", "URGENT"] else "Info",
        category="Task Alert",
        responsible_agent="Task Orchestrator",
        recipient_email=assigned,
        role_target=task_in.role_target.upper(),
        related_entity_type="TASK",
        related_entity_id=task_id,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(new_task)
    return _build_task_response(new_task)

@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    task_in: TaskUpdate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    task = db.query(WorkTask).filter((WorkTask.task_id == task_id) | (WorkTask.id == (int(task_id) if task_id.isdigit() else -1))).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_in.status:
        st = task_in.status.upper()
        if st not in VALID_TASK_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status '{st}'. Must be one of {VALID_TASK_STATUSES}")
        task.status = st
        if st == "COMPLETED":
            task.completed_at = datetime.utcnow()

    if task_in.priority:
        task.priority = task_in.priority.upper()
    if task_in.assigned_user or task_in.assigned_to:
        task.assigned_to = task_in.assigned_user or task_in.assigned_to
    if task_in.due_date:
        task.due_date = task_in.due_date

    if task_in.comment:
        comments = []
        try:
            comments = json.loads(task.comments_json or "[]")
        except Exception:
            comments = []
        comments.append({
            "author": current_user.full_name if current_user else "User",
            "text": task_in.comment,
            "created_at": datetime.utcnow().isoformat()
        })
        task.comments_json = json.dumps(comments)

    task.updated_at = datetime.utcnow()

    audit = AuditLog(
        action="TASK_UPDATED",
        resource=f"TASK:{task.task_id}",
        details_json=json.dumps({"status": task.status, "priority": task.priority, "completed_at": task.completed_at.isoformat() if task.completed_at else None}),
        created_at=datetime.utcnow()
    )
    db.add(audit)

    db.commit()
    db.refresh(task)
    return _build_task_response(task)
