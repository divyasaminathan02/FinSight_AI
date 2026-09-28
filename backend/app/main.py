import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import engine, Base, SessionLocal, ensure_schema_columns
from app.models import User, UserRole
from app.security.jwt import get_password_hash
from app.routers import (
    health,
    auth,
    dashboard,
    agents,
    customers,
    loans,
    transactions,
    notifications,
    credit,
    fraud,
    collections,
    risk,
    liquidity,
    orchestration,
    copilot,
    audit,
    events,
    reports,
    settings as settings_router,
    finance,
    leads,
    tasks,
    search,
    customer_portal,
    sales,
    relationship,
    credit_management,
    communication,
    kyc,
    operations,
    admin,
    support,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("finsight.api")

# Ensure DB schema and columns are ready at import time
try:
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns()
except Exception as _e:
    logger.warning(f"Error ensuring schema at import: {_e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB Schema
    logger.info("Initializing FinSight AI Database Tables...")
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns()
    
    # Initialize default admin / risk manager user if not present
    db = SessionLocal()
    try:
        arjun = db.query(User).filter(User.email == "arjun.mehta@finsight.ai").first()
        if not arjun:
            logger.info("Seeding default institutional user: Arjun Mehta (Risk Manager)")
            arjun = User(
                email="arjun.mehta@finsight.ai",
                hashed_password=get_password_hash("FinSight@2026"),
                full_name="Arjun Mehta",
                role=UserRole.RISK_MANAGER,
                department="Portfolio Risk Management",
                is_active=True
            )
            admin = User(
                email="admin@finsight.ai",
                hashed_password=get_password_hash("FinSight@Admin2026"),
                full_name="Chief Risk Officer",
                role=UserRole.ADMIN,
                department="Executive Committee",
                is_active=True
            )
            db.add_all([arjun, admin])
            db.commit()
    except Exception as e:
        logger.error(f"Error initializing default users: {e}")
        db.rollback()
    finally:
        db.close()

    logger.info("FinSight AI Institutional Platform Initialized successfully.")
    yield
    logger.info("Shutting down FinSight AI services.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Financial Intelligence System for NBFCs with 6 Coordinated ML Agents",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Production Security Headers & Rate Limiting Middleware
import time
from collections import defaultdict

_rate_limit_records = defaultdict(list)
RATE_LIMIT_PER_MINUTE = 600

@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Rate Limiting Check
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    
    # Filter out requests older than 60s
    reqs = [t for t in _rate_limit_records[client_ip] if now - t < 60]
    _rate_limit_records[client_ip] = reqs
    
    if len(reqs) >= RATE_LIMIT_PER_MINUTE and not request.url.path.startswith("/docs"):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please throttle your institutional API calls."}
        )
    _rate_limit_records[client_ip].append(now)

    # 2. Process Request
    response = await call_next(request)

    # 3. Apply Production Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

    return response

# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "message": "Validation error in request payload"},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "Internal institutional server error", "error": str(exc)},
    )

# Include API Routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(agents.router, prefix=settings.API_V1_STR)
app.include_router(customers.router, prefix=settings.API_V1_STR)
app.include_router(loans.router, prefix=settings.API_V1_STR)
app.include_router(transactions.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)

# Six Specialized Intelligence Agent Routers
app.include_router(credit.router, prefix=settings.API_V1_STR)
app.include_router(fraud.router, prefix=settings.API_V1_STR)
app.include_router(collections.router, prefix=settings.API_V1_STR)
app.include_router(risk.router, prefix=settings.API_V1_STR)
app.include_router(liquidity.router, prefix=settings.API_V1_STR)

# Multi-Agent Orchestration, Decision Auditing & Copilot
app.include_router(orchestration.router, prefix=settings.API_V1_STR)
app.include_router(copilot.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)

# Event Simulation Engine, Enterprise Reports & Dynamic Settings
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(settings_router.router, prefix=settings.API_V1_STR)
app.include_router(finance.router, prefix=settings.API_V1_STR)
app.include_router(leads.router, prefix=settings.API_V1_STR)
app.include_router(tasks.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(customer_portal.router, prefix=settings.API_V1_STR)
app.include_router(sales.router, prefix=settings.API_V1_STR)
app.include_router(relationship.router, prefix=settings.API_V1_STR)
app.include_router(credit_management.router, prefix=settings.API_V1_STR)
app.include_router(communication.router, prefix=settings.API_V1_STR)
app.include_router(kyc.router, prefix=settings.API_V1_STR)
app.include_router(operations.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(support.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": "FinSight AI - NBFC Intelligence Platform",
        "version": settings.VERSION,
        "status": "Operational",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }
