# FinSight AI - NBFC Intelligence Platform

> **AI-Powered Financial Intelligence System for NBFCs with 6 Coordinated Agents**

FinSight AI is an institutional financial intelligence platform designed specifically for Non-Banking Financial Companies (NBFCs). It integrates six autonomous AI agents sharing a common financial data layer:
1. **Credit Intelligence Agent** - Underwriting, CIBIL scoring, income stability & default probability.
2. **Fraud Intelligence Agent** - Device fingerprint collisions, syndicate detection & velocity tracking.
3. **Customer Intelligence Agent** - Behavioral financial health scoring & churn prediction.
4. **Collections Intelligence Agent** - Dynamic recovery optimization & DPD flow-to-loss mitigation.
5. **Risk Intelligence Agent** - Macro portfolio concentration & emerging stress early warning.
6. **Liquidity Intelligence Agent** - ALM cashflow forecasting & 30-day stress shock simulation.

---

## Architecture Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5, Recharts, Lucide React, React Router v7.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, JWT / Bcrypt RBAC.
- **Database**: PostgreSQL (with automatic zero-config fallback to SQLite for local standalone development).
- **Synthetic Pipeline**: High-performance correlated NBFC data generator (`generate_data.py`).

---

## Quick Start Instructions

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python requirements
pip install -r requirements.txt

# Seed realistic synthetic NBFC dataset
python scripts/generate_data.py --scale quick

# Run automated tests
pytest tests/ -v

# Start FastAPI server (runs on http://127.0.0.1:8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite dev server (runs on http://127.0.0.1:5173)
npm run dev
```

---

## Core API Endpoints

- `GET /api/health` - Institutional health check & database latency
- `POST /api/auth/login` - JWT login & RBAC session issuance
- `GET /api/dashboard/overview` - Consolidated executive intelligence dashboard
- `GET /api/dashboard/risk-trend` - 6-month portfolio default risk trajectory
- `GET /api/dashboard/alerts` - Multi-agent anomaly & risk alerts
- `GET /api/dashboard/collections` - Recovery performance & bucket distribution
- `GET /api/dashboard/liquidity` - 30-day ALM cash flow forecast & LCR buffer ratio
- `GET /api/agents/status` - Real-time status & metrics for all 6 agents
- `GET /api/agents/network` - Coordinated intelligence pipeline synchronization
- `GET /api/customers` - Paginated borrower profiles & financial health
- `GET /api/loans` - Loan portfolio repayments & DPD tracking
- `GET /api/transactions` - Institutional transaction ledger
- `GET /api/notifications` - Real-time multi-agent notification feed

---

## Demo Credentials

- **Risk Manager**: `arjun.mehta@finsight.ai` / `FinSight@2026`
- **Credit Officer**: `priya.sharma@finsight.ai` / `FinSight@2026`
- **Collection Manager**: `vikram.singh@finsight.ai` / `FinSight@2026`
- **Chief Risk Officer / Admin**: `admin@finsight.ai` / `FinSight@Admin2026`
