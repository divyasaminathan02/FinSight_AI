import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SQLITE_PATH = os.path.join(BASE_DIR, "finsight.db").replace("\\", "/")

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinSight AI - NBFC Intelligence Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "finsight-ai-enterprise-secret-key-super-secure-jwt-2026-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database: Supports PostgreSQL (via DATABASE_URL env var) with unified local SQLite fallback
    DATABASE_URL: str = f"sqlite:///{DEFAULT_SQLITE_PATH}"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    DEMO_MODE: bool = True
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "FinSight@Demo2026")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "FinSight@Admin2026")
    
    # Portfolio Baseline Settings (₹ Cr)
    AUM_BASELINE_CR: float = 842.60
    LOAN_PORTFOLIO_CR: float = 718.20
    AVAILABLE_LIQUIDITY_CR: float = 126.40
    FRAUD_EXPOSURE_CR: float = 2.80
    COLLECTION_EFFICIENCY_BASELINE: float = 94.70

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="allow"
    )

settings = Settings()
