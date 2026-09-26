# FinSight AI - Multi-Agent Architecture & Governance Guide

## 1. System Overview & Core Philosophy
FinSight AI is an autonomous, multi-agent financial intelligence platform tailored for Non-Banking Financial Companies (NBFCs).
The foundational architectural principle is strict separation of concerns:
1. **Machine Learning Models**: Deterministically produce numerical risk and financial signals (e.g. probability of default, anomaly scores, churn risk, cash flow forecasts).
2. **Specialized Intelligence Agents**: Encapsulate domain intelligence (Credit, Fraud, Customer 360, Collections, Portfolio Risk, Institutional Liquidity).
3. **Decision Engine**: Applies auditable, configurable underwriting policy rules to determine final loan verdicts (`APPROVE`, `REVIEW REQUIRED`, `REJECT`).
4. **Large Language Models (LLM)**: Explain outputs, synthesize cross-agent context, and answer natural language user queries. LLMs do NOT independently decide loan approvals or rejections.

## 2. Agent Responsibilities & Data Flow
- **Credit Intelligence Agent**: Evaluates borrower capacity, credit history, and TreeSHAP risk factors using XGBoost.
- **Fraud Intelligence Agent**: Screens identity, phone, device fingerprint, and address reuse using Isolation Forest and NetworkX graph analysis.
- **Customer Intelligence Agent**: Builds Customer 360 profile, K-Means behavioral clustering, churn probability, and financial stress scores.
- **Collections Intelligence Agent**: Predicts short-term repayment probability, default risk, and assigns ethical, compliance-certified recovery interventions.
- **Risk Intelligence Agent**: Aggregates macro and portfolio risk, monitors HHI concentration, and triggers policy tightening.
- **Liquidity Intelligence Agent**: Analyzes institutional cash buffers, ALM cumulative gaps, and 7/30/90-day liquidity outlooks.

## 3. LangGraph Decision Workflow
Every loan underwriting run proceeds through a coordinated pipeline:
Application Input → Credit Evaluation → Fraud Screening → Customer 360 Context → Collections History Check → Portfolio Risk Review → Decision Engine Execution → Explainability Synthesis → Audit Persistence.
