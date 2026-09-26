import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import engine, Base, SessionLocal
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
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("finsight.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB Schema
    logger.info("Initializing FinSight AI Database Tables...")
    Base.metadata.create_all(bind=engine)
    
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

@app.get("/")
def root():
    return {
        "platform": "FinSight AI - NBFC Intelligence Platform",
        "version": settings.VERSION,
        "status": "Operational",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }
