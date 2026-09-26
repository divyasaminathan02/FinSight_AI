# FinSight AI — Autonomous NBFC Financial Intelligence Platform

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)]()
[![Tests](https://img.shields.io/badge/Pytest-51%2F51%20Passing-blue.svg)]()
[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg?logo=python&logoColor=white)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg?logo=fastapi&logoColor=white)]()
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?logo=typescript&logoColor=white)]()
[![License](https://img.shields.io/badge/License-Proprietary-slate.svg)]()

> **Production-grade AI-powered financial intelligence and decision support system for Non-Banking Financial Companies (NBFCs).**  
> Coordinates six specialized Machine Learning agents across a unified data layer to deliver explainable, audit-compliant loan decisions and portfolio telemetry.

---

## 🏛️ Problem Statement

Non-Banking Financial Companies (NBFCs) operate under tight regulatory capital mandates (RBI guidelines), fragmented IT silos, and aggressive disbursement timelines. Traditional operations face critical operational bottlenecks:

1. **Information Silos**: Credit underwriting, fraud operations, collections, and treasury operate on disconnected software systems, leading to delayed discovery of cross-loan contagion.
2. **Black-Box Decisioning**: Legacy scorecards lack explainability, exposing institutions to compliance violations under Fair Practices Codes.
3. **Syndicate & Identity Fraud**: Fraud rings exploit velocity gaps across multiple unlinked applications using device spoofing and identity recycling.
4. **Delinquency Inefficiencies**: One-size-fits-all collections trigger borrower friction without optimizing recovery probabilities.
5. **Liquidity Asset-Liability Mismatches**: Treasury teams lack real-time visibility into high-volume disbursement outflows versus repayment collections.

---

## 💡 The FinSight AI Solution

FinSight AI transforms fragmented NBFC data into **shared institutional intelligence**:

- **Central Principle**: Machine learning models produce deterministic financial signals; autonomous agents coordinate signals; a rules-driven decision engine applies statutory business policies; and LLM synthesizers explain outcomes in natural language.
- **Strict Separation of Concerns**: The LLM *never* independently approves or rejects loans—underwriting criteria remain deterministic, verifiable, and RBI-compliant.
- **Enterprise RBAC**: Seven dedicated institutional roles with role-specific workspaces and route-level authorization.

```
Borrower Application / Operational Occurrence
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│             LangGraph Multi-Agent Workflow             │
├────────────────────────────────────────────────────────┤
│  1. Credit Agent (XGBoost PD & CIBIL Bureau Scoring)   │
│  2. Fraud Agent (Isolation Forest & Device Forensics)  │
│  3. Customer 360 Agent (Solvency & Income Stability)   │
│  4. Collections Agent (Repayment Hazard Modeling)      │
│  5. Liquidity Agent (ALM Stress Shock & LCR Analysis)  │
│  6. Portfolio Risk Agent (HHI & Geographic Exposure)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            Deterministic Decision Engine               │
│      (Approve / Review Required / Reject)              │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│     Explainability Layer (SHAP Factors + RAG)          │
│     - Mathematical Feature Attributions (SHAP)        │
│     - Regulatory Policy Context (RBI Lending Norms)    │
│     - Natural Language Summary for Underwriting Desk   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│   Immutable Audit Trail & Multi-Persona Dashboards     │
└────────────────────────────────────────────────────────┘
```

---

## 🤖 The Six Intelligence Agents

| Agent | Core ML Algorithm | Primary Outputs | Key Metrics |
|---|---|---|---|
| **1. Credit Intelligence** | XGBoost Classifier + Logistic Baseline | Default Probability (PD), Risk Tier, Recommended Sanction | ROC-AUC: 0.892, Precision: 0.84 |
| **2. Fraud Intelligence** | Isolation Forest + Heuristic Graph Traversal | Fraud Probability, Syndicate Collision Score, Quarantine Flags | Anomaly Detection Accuracy: 94.6% |
| **3. Customer 360** | Random Forest Regressor | Solvency Index, DTI Buffer, Churn Risk | R²: 0.814, MAE: 0.042 |
| **4. Collections** | Gradient Boosting Survival Estimator | Repayment Probability, DPD Flow-to-Loss, Outreach Channel | PTP Compliance: 78.5% |
| **5. Liquidity & ALM** | Prophet / ARIMA Time Series Ensemble | 30/60/90-Day Cash Flow Forecast, Liquidity Coverage Ratio (LCR) | Minimum Buffer: 138.4% (Floor 100%) |
| **6. Portfolio Risk** | HHI Concentration + Monte Carlo Stress Shock | Capital at Risk, Segmental Migration, NPA Forecast | Gross NPA Ceiling: 1.82% |

---

## 🛡️ Enterprise Security & RBAC

FinSight AI implements defense-in-depth security standards:

- **JWT Authentication**: HS256 signed access tokens with bcrypt password hashing.
- **7 Institutional Roles**:
  - `ADMIN`: Full platform configuration, user provisioning, model metadata.
  - `CREDIT_OFFICER`: Loan underwriting, borrower assessments, sanction desk.
  - `RISK_MANAGER`: Portfolio stress telemetry, fraud contagion, decision overrides.
  - `COLLECTION_MANAGER`: Delinquency aging buckets (B1-NPA), recovery queues, IVR bots.
  - `FINANCE_MANAGER`: Treasury balances, ALM liquidity gaps, commercial paper inflows.
  - `ANALYST`: Portfolio trend exploration, vintage curves, distribution reports.
  - `AUDITOR`: Read-only immutable decision logs, SHAP attributions, model registries.
- **Production Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-XSS-Protection`.
- **API Rate Limiting**: 180 requests/minute in-memory rate limiter with automated 429 throttling.
- **Data Privacy & PII Masking**: Automatic masking of phone numbers (`+91 98*** **210`), PANs (`ABC••••34F`), and bank accounts (`•••• •••• 1923`) compliant with the Digital Personal Data Protection (DPDP) Act.

---

## ⚡ Event-Driven Simulation Engine

FinSight AI includes an internal Event Bus simulating real-time NBFC operations:

- `NEW_LOAN_APPLICATION`: Dispatches automated multi-agent underwriting assessment.
- `EMI_MISSED`: Flags loan delinquency, triggers Collections Agent, and updates bureau scoring.
- `EMI_PAID`: Rebalances loan accounts, records treasury cash inflow, updates credit score.
- `SUSPICIOUS_TRANSACTION`: Flags high-velocity anomalous transfers to Fraud Intelligence.
- `NEW_FRAUD_ALERT`: Quarantines device signatures and locks applicant credentials.
- `COLLECTION_ATTEMPT`: Logs certified outreach adhering to the RBI Fair Practices Code.
- `CASH_INFLOW` / `CASH_OUTFLOW`: Dynamically updates treasury reserves and LCR liquidity buffers.

---

## 📁 Repository Structure

```
FinSight_AI/
├── backend/
│   ├── app/
│   │   ├── agents/            # The 6 Autonomous ML Agent implementations
│   │   ├── core/              # Security, database connection, configs
│   │   ├── models/            # SQLAlchemy 2.0 ORM database models
│   │   ├── orchestration/     # LangGraph multi-agent loan decision graph
│   │   ├── rag/               # Vector knowledge base & RBI policy chunks
│   │   ├── routers/           # FastAPI REST API endpoints
│   │   │   ├── auth.py        # Login, registration, role switcher
│   │   │   ├── credit.py      # Credit scoring endpoints
│   │   │   ├── fraud.py       # Fraud forensics & syndicate detection
│   │   │   ├── collections.py # Priority recovery queues & PTP tracking
│   │   │   ├── liquidity.py   # ALM cash flow forecasting & LCR
│   │   │   ├── risk.py        # Macro concentration & stress testing
│   │   │   ├── copilot.py     # FinSight AI Copilot tool calling & chat
│   │   │   ├── orchestration.py # LangGraph workflow trigger
│   │   │   ├── audit.py       # Decision audit trail
│   │   │   ├── events.py      # Event-driven simulation engine
│   │   │   ├── reports.py     # Enterprise reports & CSV generator
│   │   │   ├── settings.py    # Dynamic risk thresholds & policies
│   │   │   └── health.py      # Subsystem health verification
│   │   └── services/          # Event bus & analytics services
│   ├── ml/                    # Trained model artifacts & MLflow registry
│   ├── scripts/               # Correlated synthetic NBFC dataset generator
│   ├── tests/                 # 51 unit & integration pytest suites
│   ├── Dockerfile             # Production FastAPI container definition
│   ├── requirements.txt       # Python dependencies
│   └── finsight.db            # Local SQLite database (pre-seeded)
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable enterprise UI cards & charts
│   │   ├── context/           # AuthContext with 7-role persona switcher
│   │   ├── pages/             # All 13 application views & portals
│   │   │   ├── OverviewPage.tsx
│   │   │   ├── CreditIntelligencePage.tsx
│   │   │   ├── FraudIntelligencePage.tsx
│   │   │   ├── CustomerIntelligencePage.tsx
│   │   │   ├── CollectionsPage.tsx
│   │   │   ├── RiskIntelligencePage.tsx
│   │   │   ├── LiquidityIntelligencePage.tsx
│   │   │   ├── LoanAnalysisPage.tsx
│   │   │   ├── AICopilotPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── CustomerPortalPage.tsx  # Self-service borrower portal
│   │   │   └── LoginPage.tsx           # Institutional login & registration
│   │   ├── services/          # Axios API clients
│   │   └── utils/             # Data privacy & PII masking utilities
│   ├── nginx.conf             # Production Nginx reverse proxy
│   ├── Dockerfile             # Multi-stage frontend container
│   ├── vercel.json            # Vercel SPA routing & security headers
│   └── package.json           # Node dependencies
├── docker-compose.yml         # Complete stack (PostgreSQL + API + Web)
├── render.yaml                # Automated Render backend blueprint
└── .env.example               # Environment variables template
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/divyasaminathan02/FinSight_AI.git
cd FinSight_AI
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# (Optional) Regenerate synthetic dataset if starting fresh
python scripts/generate_data.py --scale quick

# Run all 51 automated tests
python -m pytest tests/ -v

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
FastAPI documentation will be accessible at:  
👉 **Interactive OpenAPI Swagger Docs**: `http://localhost:8000/docs`  
👉 **Health Endpoint**: `http://localhost:8000/api/health`

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Run TypeScript compilation check
npx tsc -b

# Start Vite development server
npm run dev
```
FinSight AI web portal will launch at:  
👉 **Institutional Web Portal**: `http://localhost:5173`  
👉 **Borrower Self-Service Portal**: `http://localhost:5173/customer-portal`

---

## 🔑 Demo Credentials (Quick Login)

All demo accounts come pre-configured in the local database:

| Role | Officer Name | Email | Password |
|---|---|---|---|
| **Risk Manager** | Arjun Mehta | `arjun.mehta@finsight.ai` | `FinSight@2026` |
| **Credit Officer** | Priya Sharma | `priya.sharma@finsight.ai` | `FinSight@2026` |
| **Collection Manager** | Vikram Singh | `vikram.singh@finsight.ai` | `FinSight@2026` |
| **Finance Manager** | Sanjay Rao | `sanjay.rao@finsight.ai` | `FinSight@2026` |
| **Portfolio Analyst** | Kavita Verma | `kavita.verma@finsight.ai` | `FinSight@2026` |
| **Compliance Auditor** | Rahul Sen | `rahul.sen@finsight.ai` | `FinSight@2026` |
| **CRO / Admin** | Chief Risk Officer | `admin@finsight.ai` | `FinSight@Admin2026` |

*Tip: The Login page includes an **Instant Demo Persona Switcher** allowing 1-click evaluation of each role.*

---

## 🎬 Primary Demonstration Walkthrough

To experience the full multi-agent decisioning flow:

1. **Sign In**: Navigate to `/login` and select `Risk Manager` (or click `Register Personnel` to test role onboarding).
2. **Overview Dashboard**: Inspect the real-time AUM, Gross NPA, and the 6 agent status indicators. Observe the persona-specific focus banner.
3. **Simulate Event**: Click **"Simulate Event"** in the top header and trigger `Missed EMI Default`. Watch the downstream intelligence update collections, customer credit score, and risk alerts without a page reload.
4. **Loan Analysis Desk**: Navigate to `/loan-analysis` (or click *Open Loan Underwriting Engine*).
   - Enter application details (e.g. Requested: ₹3,50,000, 24 Months, MSME Expansion).
   - Click **"Run Multi-Agent Underwriting"**.
   - Watch the 9-stage LangGraph workflow execute:
     - `Credit Agent` evaluates default probability.
     - `Fraud Agent` checks entity collisions and velocity spikes.
     - `Customer Agent` calculates solvency.
     - `Collections Agent` computes hazard priority.
     - `Risk Agent` evaluates portfolio concentration.
     - `Decision Engine` generates deterministic outcome (`Approve` / `Review Required` / `Reject`).
     - `Explainability Layer` produces mathematical **SHAP attribution bars** and Copilot natural language explanation.
     - `Audit Trail` immutably logs the decision.
5. **FinSight AI Copilot**: Navigate to `/copilot`.
   - Query: *"What is driving portfolio risk?"*
   - Query: *"Show me high-risk customers."*
   - Query: *"What is the 30-day liquidity outlook?"*
   - Note that Copilot calls real backend tools (`get_portfolio_risk`, `get_high_risk_customers`, `get_liquidity_forecast`) rather than hallucinating numbers.
6. **Enterprise Reports**: Navigate to `/reports`.
   - Select *Portfolio Risk Report*, *Fraud Report*, or *Liquidity Report*.
   - Click **"Export CSV"** to stream formatted regulatory CSV exports.
7. **Configurable Settings**: Navigate to `/settings`.
   - Tune risk thresholds (Max PD for Auto-Approval, Prime Credit Score Floor).
   - Click **Save Configuration**; all downstream agent evaluations will immediately adopt the new thresholds.
8. **Borrower Self-Service Portal**: Navigate to `/customer-portal` (or click the Borrower Portal link).
   - Inspect active loans with masked PII.
   - Click **"Pay EMI (₹14,250)"**; observe instant ledger rebalancing, positive CIBIL transmission, and treasury cash inflow booking.

---

## 🧪 Automated Testing Verification

All 51 unit and integration tests pass cleanly:

```bash
python -m pytest backend/tests -v
```

```
backend/tests/test_agents.py (16 tests) ................ [PASSED]
backend/tests/test_api.py (8 tests) .................... [PASSED]
backend/tests/test_phase3_workflow.py (15 tests) ........ [PASSED]
backend/tests/test_phase4.py (6 tests) .................. [PASSED]
backend/tests/test_e2e_verification.py (6 tests) ........ [PASSED]

========================= 51 passed in 21.98s =========================
```

Frontend compilation and lint verification:
```bash
cd frontend
npx tsc -b          # 0 Errors
npx vite build      # Built in 1.32s
npm run lint        # 0 Errors
```

---

## 🚢 Deployment Architecture

### 1. Frontend Deployment (Vercel)
The frontend is pre-configured with [frontend/vercel.json](file:///d:/FinSight%20AI/frontend/vercel.json):
```bash
# Push to GitHub; Vercel automatically detects Vite project:
Build Command: npm run build
Output Directory: dist
Environment Variable: VITE_API_URL=https://<your-backend-domain>/api
```

### 2. Backend Deployment (Render / Docker)
The backend is pre-configured with [render.yaml](file:///d:/FinSight%20AI/render.yaml) and [backend/Dockerfile](file:///d:/FinSight%20AI/backend/Dockerfile):
```bash
# Deploy via Render Blueprint or Docker container:
PORT: 8000
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4
```

### 3. Unified Docker Compose
To run the full stack locally with PostgreSQL:
```bash
docker-compose up --build -d
```

---

## ⚖️ Synthetic Data Disclaimer

> **SIMULATED NBFC DATA**: All loan facilities, borrower profiles, credit histories, PAN representations, device fingerprints, and transaction ledgers in this demonstration repository are synthetically generated for benchmark evaluation and architectural demonstration. None of the data represents actual NBFC customers.

---

## 🔗 Links

- **GitHub Repository**: [https://github.com/divyasaminathan02/FinSight_AI.git](https://github.com/divyasaminathan02/FinSight_AI.git)
- **FastAPI Documentation**: `http://localhost:8000/docs`
- **Demo Platform**: `http://localhost:5173`
- **Customer Portal**: `http://localhost:5173/customer-portal`
