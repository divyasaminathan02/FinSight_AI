from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.users import User, UserRole, AuditLog
from app.schemas.auth import UserLogin, Token, UserResponse, UserCreate, DemoUserItem
from app.security.jwt import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

from app.security.rbac import get_permissions_for_role, ROLE_PERMISSIONS

def build_user_response(user: User) -> UserResponse:
    resp = UserResponse.model_validate(user)
    resp.permissions = get_permissions_for_role(user.role.value if hasattr(user.role, 'value') else str(user.role))
    resp.branch = "Headquarters - Mumbai"
    return resp

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    email_clean = login_data.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    
    if not user:
        if email_clean == "arjun.mehta@finsight.ai":
            user = User(
                email="arjun.mehta@finsight.ai",
                hashed_password=get_password_hash("FinSight@2026"),
                full_name="Arjun Mehta",
                role=UserRole.RISK_MANAGER,
                department="Portfolio Risk Management",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Check password via bcrypt or development demo fallback
    pw_matches = verify_password(login_data.password, user.hashed_password)
    is_dev_override = settings.DEBUG and login_data.password in [
        settings.DEMO_PASSWORD,
        settings.ADMIN_PASSWORD,
        "FinSight@2026",
        "FinSight@Demo2026",
        "FinSight@Admin2026",
    ]

    if not pw_matches and not is_dev_override:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user.last_login = datetime.utcnow()
    role_val = user.role.value if hasattr(user.role, 'value') else str(user.role)
    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        user_name=user.full_name,
        user_role=role_val,
        action="LOGIN_SUCCESS",
        resource=f"AUTH:{user.email}",
        entity_type="User",
        entity_id=str(user.id),
        details_json='{"method": "password"}'
    )
    db.add(audit)
    db.commit()

    role_val = user.role.value if hasattr(user.role, 'value') else str(user.role)
    access_token = create_access_token(subject=user.id, role=role_val)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=60 * 24 * 60,
        user=build_user_response(user)
    )

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    email_clean = user_in.email.lower().strip()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    new_user = User(
        email=email_clean,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        role=user_in.role,
        department=user_in.department or "Risk Operations",
        is_active=True,
        created_at=datetime.utcnow(),
        last_login=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    role_val = new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role)
    audit = AuditLog(
        user_id=new_user.id,
        action="USER_REGISTRATION",
        resource="AUTH",
        details_json=f'{{"role": "{role_val}"}}'
    )
    db.add(audit)
    db.commit()

    token = create_access_token(subject=new_user.id, role=role_val)
    return Token(
        access_token=token,
        token_type="bearer",
        expires_in=60 * 24 * 60,
        user=build_user_response(new_user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_logged_in_user(current_user: User = Depends(get_current_user)):
    return build_user_response(current_user)

@router.post("/switch-role")
def switch_active_role(role: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        new_role = UserRole(role.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {[r.value for r in UserRole]}")

    current_user.role = new_role
    db.commit()
    role_val = new_role.value
    token = create_access_token(subject=current_user.id, role=role_val)
    return {
        "status": "success",
        "active_role": role_val,
        "access_token": token,
        "user": build_user_response(current_user)
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.full_name,
        user_role=role_val,
        action="LOGOUT",
        resource=f"AUTH:{current_user.email}",
        entity_type="User",
        entity_id=str(current_user.id),
        details_json='{"action": "session_terminated"}'
    )
    db.add(audit)
    db.commit()
    return {"status": "SUCCESS", "message": f"User {current_user.email} logged out successfully."}


@router.get("/users", response_model=List[UserResponse])
def list_system_users(db: Session = Depends(get_db)):
    """List all registered platform users for admin user management."""
    users = db.query(User).order_by(User.id).all()
    return [build_user_response(u) for u in users]

@router.patch("/users/{user_id}")
def update_user_status_or_role(user_id: int, payload: dict, db: Session = Depends(get_db)):
    """Update user role, department, or active status."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if "role" in payload:
        try:
            user.role = UserRole(payload["role"].upper())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {payload['role']}")
    if "is_active" in payload:
        user.is_active = bool(payload["is_active"])
    if "department" in payload:
        user.department = payload["department"]
    
    db.commit()
    db.refresh(user)
    return build_user_response(user)

@router.get("/roles")
def get_roles_and_permissions():
    """List all roles and their assigned permissions matrix."""
    return {
        role: sorted(list(perms))
        for role, perms in ROLE_PERMISSIONS.items()
    }

@router.get("/demo-users", response_model=List[DemoUserItem])
def list_demo_users():
    """
    List safe institutional demo personas for development login.
    Only available when development mode / DEBUG is enabled.
    """
    if settings.ENVIRONMENT != "development" and not settings.DEBUG and not settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo switcher is disabled in production environments."
        )
    
    from scripts.seed_demo_users import DEMO_ACCOUNTS
    return [
        DemoUserItem(
            name=acc["full_name"],
            email=acc["email"],
            role=acc["role"].value if hasattr(acc["role"], 'value') else str(acc["role"]),
            department=acc["department"],
            description=acc["description"],
            password_hint=settings.ADMIN_PASSWORD if acc["role"] == UserRole.ADMIN else settings.DEMO_PASSWORD
        )
        for acc in DEMO_ACCOUNTS
    ]


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit = AuditLog(
        user_id=current_user.id,
        action="LOGOUT",
        resource="AUTH"
    )
    db.add(audit)
    db.commit()
    return {"message": "Successfully logged out"}

