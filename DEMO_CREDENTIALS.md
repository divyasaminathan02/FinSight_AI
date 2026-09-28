# FinSight AI - Development Demo Credentials

> **CRITICAL SECURITY NOTICE**
> 
> The credentials documented in this file are strictly for **local development and testing environments only**.
> - **NEVER** commit production passwords, production API keys, production database credentials, or private cryptographic secrets.
> - In production deployments, set `ENVIRONMENT=production`, `DEBUG=False`, and `DEMO_MODE=False` in environment variables to automatically disable demo log-in endpoints and persona switchers.
> - Default passwords are read from the backend environment variables (`DEMO_PASSWORD` and `ADMIN_PASSWORD`) configured in `backend/app/config.py`.

---

## Default Local Development Passwords

| User Tier | Environment Variable | Default Value | Notes |
|:---|:---|:---|:---|
| **Standard Roles** (15 Roles) | `DEMO_PASSWORD` | `FinSight@Demo2026` | Configurable in `.env` |
| **Administrator** (1 Role) | `ADMIN_PASSWORD` | `FinSight@Admin2026` | Configurable in `.env` |

---

## Seeded Institutional Roles Matrix (16 Roles)

The development seed script (`backend/scripts/seed_demo_users.py`) seeds the following 16 accounts into the local database:

| # | Role Enum | Institutional Email | Development Password | Portal URL | Primary Responsibilities |
|:---|:---|:---|:---|:---|:---|
| 1 | `CUSTOMER` | `customer.demo@finsight.ai` | `FinSight@Demo2026` | `/customer-portal` | Retail Borrower self-service, loan applications, EMI repayments, support tickets |
| 2 | `SALES_OFFICER` | `sales.officer@finsight.ai` | `FinSight@Demo2026` | `/sales` | Direct sales origination, borrower onboarding, lead-to-loan pipeline |
| 3 | `RELATIONSHIP_MANAGER` | `relationship.manager@finsight.ai` | `FinSight@Demo2026` | `/relationship` | Commercial banking, high-value client portfolio 360, retention |
| 4 | `CREDIT_ANALYST` | `credit.analyst@finsight.ai` | `FinSight@Demo2026` | `/loan-analysis` | Credit appraisal, bureau scoring, SHAP explainability analysis |
| 5 | `CREDIT_MANAGER` | `credit.manager@finsight.ai` | `FinSight@Demo2026` | `/credit-manager` | Credit committee sanctions, risk tier policy exceptions, secondary approvals |
| 6 | `FRAUD_OFFICER` | `fraud.officer@finsight.ai` | `FinSight@Demo2026` | `/fraud` | Fraud forensics, identity spoofing, AML transaction monitoring, case disposition |
| 7 | `KYC_OFFICER` | `kyc.officer@finsight.ai` | `FinSight@Demo2026` | `/kyc` | CKYC / PAN / Aadhaar verification, document fraud inspection, sanction screening |
| 8 | `COLLECTIONS_OFFICER` | `collections.officer@finsight.ai` | `FinSight@Demo2026` | `/collections` | Tele-calling recovery, field visits, Promise-to-Pay (PTP) agreements |
| 9 | `COLLECTIONS_MANAGER` | `collections.manager@finsight.ai` | `FinSight@Demo2026` | `/collections` | DPD roll-rate mitigation, SMA asset classification, legal escalation |
| 10 | `OPERATIONS_OFFICER` | `operations.officer@finsight.ai` | `FinSight@Demo2026` | `/operations` | Pre-disbursement conditions, e-mandate validation, loan booking |
| 11 | `OPERATIONS_MANAGER` | `operations.manager@finsight.ai` | `FinSight@Demo2026` | `/operations` | Disbursement authorization, settlement exceptions, bank clearing rail control |
| 12 | `FINANCE_OFFICER` | `finance.officer@finsight.ai` | `FinSight@Demo2026` | `/finance` | Double-entry journal entries, repayment reconciliation, fee accounting |
| 13 | `FINANCE_MANAGER` | `finance.manager@finsight.ai` | `FinSight@Demo2026` | `/finance` | Treasury management, Liquidity Coverage Ratio (LCR), ALM structural mismatch |
| 14 | `RISK_ANALYST` | `risk.analyst@finsight.ai` | `FinSight@Demo2026` | `/risk` | Quantitative loss forecasting, stress simulations, model drift monitoring |
| 15 | `RISK_MANAGER` | `risk.manager@finsight.ai` | `FinSight@Demo2026` | `/risk-manager` | Enterprise risk governance, underwriting policy limits, committee escalations |
| 16 | `ADMIN` | `admin.demo@finsight.ai` | `FinSight@Admin2026` | `/admin` | System governance, RBAC role assignment, branch & department hierarchy, audit trails |

---

## How to Reseed or Update Demo Accounts

To reseed or update the demo accounts in your local database:

```bash
cd backend
python scripts/seed_demo_users.py
```

## Security Best Practices

1. Credentials are never hardcoded in frontend source files.
2. The frontend dynamically fetches persona metadata from `/api/auth/demo-users` only when the backend reports development mode is active (`ENVIRONMENT=development`).
3. Passwords are encrypted using salted `bcrypt` hashes before storage.
