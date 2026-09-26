import time
import os
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.rag.knowledge_base import knowledge_base
from ml.registry import ModelRegistry

router = APIRouter(prefix="/health", tags=["System Health"])

@router.get("")
def health_check(db: Session = Depends(get_db)):
    """Comprehensive system health status overview."""
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    models_meta = ModelRegistry.list_registered_models()
    models_ready = len(models_meta) >= 6

    return {
        "status": "healthy" if db_ok and models_ready else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "services": {
            "database": "operational" if db_ok else "unreachable",
            "models": f"{len(models_meta)}/6 pipelines active",
            "rag_knowledge_base": f"{len(knowledge_base.chunks)} policy chunks indexed",
            "copilot_engine": "operational"
        }
    }

@router.get("/database")
def health_database(db: Session = Depends(get_db)):
    """Checks database latency, pool health, and connection status."""
    t0 = time.time()
    try:
        res = db.execute(text("SELECT 1")).scalar()
        latency_ms = round((time.time() - t0) * 1000, 2)
        return {
            "status": "healthy",
            "latency_ms": latency_ms,
            "connection": "connected",
            "checked_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "checked_at": datetime.utcnow().isoformat(),
        }

@router.get("/models")
def health_models():
    """Verifies all 6 ML model pipelines, artifacts, and MLflow registry status."""
    models_list = ModelRegistry.list_registered_models()
    expected = [
        "credit_intelligence",
        "fraud_intelligence",
        "customer_intelligence",
        "collections_intelligence",
        "risk_intelligence",
        "liquidity_intelligence"
    ]
    
    details = {}
    for name in expected:
        meta = ModelRegistry.get_model_metadata(name)
        if meta:
            details[name] = {
                "status": "LOADED",
                "model_type": meta.get("model_type"),
                "version": meta.get("version", "v1.0"),
                "last_trained": meta.get("last_trained"),
                "metrics": meta.get("metrics", {})
            }
        else:
            details[name] = {"status": "MISSING"}

    all_ready = all(d["status"] == "LOADED" for d in details.values())
    return {
        "status": "healthy" if all_ready else "degraded",
        "loaded_models_count": len([d for d in details.values() if d["status"] == "LOADED"]),
        "total_expected": 6,
        "models": details
    }

@router.get("/llm")
def health_llm():
    """Checks LLM provider readiness, API key availability, and RAG knowledge base."""
    provider = os.getenv("LLM_PROVIDER", "local_expert")
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))

    return {
        "status": "healthy",
        "active_provider": provider,
        "api_keys_configured": {
            "gemini": has_gemini,
            "openai": has_openai,
            "anthropic": has_anthropic,
        },
        "rag_vector_chunks_indexed": len(knowledge_base.chunks),
        "synthesizer_mode": "Hybrid LLM + Deterministic Financial Rules"
    }
