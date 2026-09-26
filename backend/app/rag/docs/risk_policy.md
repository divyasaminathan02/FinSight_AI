# FinSight AI - Enterprise Risk Management & Concentration Policy (v2026.1)

## 1. Portfolio Concentration Limits (Herfindahl-Hirschman Index - HHI)
- **Geographic Concentration**: Single state exposure must not exceed 25% of total AUM. Regional HHI index target: `< 0.18` (Moderate concentration ceiling). If regional HHI exceeds 0.22, automatic approval quotas are throttled in the dominant state.
- **Product Concentration**: No single loan product category (e.g. Unsecured Personal Loans) may exceed 35% of total NBFC loan portfolio.
- **Single Borrower / Group Exposure Limit**: Exposure to a single corporate entity capped at 15% of Tier-1 capital; group exposure capped at 25%.

## 2. Early Warning Indicators & Risk Signals
- **Delinquency Velocity Alert**: A week-on-week increase of > 1.5% in SMA-1 or SMA-2 accounts flags an institutional risk alert.
- **Fraud Syndicate Threshold**: Detection of more than 3 applicant collisions on a single device or phone number triggers an automatic regional containment protocol.
- **Capital Adequacy (CRAR)**: Minimum Capital-to-Risk-Weighted-Assets Ratio of 15.0% must be maintained at all times, with Tier-1 capital not dropping below 10.0%.

## 3. Dynamic Underwriting Adjustments
- When portfolio-level composite risk score exceeds 65.0 (High Risk), the automated credit decision engine automatically tightens the maximum permissible DTI by 500 basis points (from 55% to 50%) across all subsequent applications.
