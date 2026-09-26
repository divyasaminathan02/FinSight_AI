export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'CREDIT_OFFICER' | 'RISK_MANAGER' | 'COLLECTION_MANAGER' | 'FINANCE_MANAGER' | 'ANALYST' | 'AUDITOR' | 'CUSTOMER' | 'OPERATIONS' | 'EXECUTIVE';
  department?: string;
  is_active: boolean;
  last_login?: string;
}

export interface ExecutiveKPICardData {
  id: string;
  title: string;
  value: string;
  numeric_value: number;
  unit: string;
  change_pct: number;
  change_direction: 'up' | 'down' | 'neutral';
  status: 'positive' | 'warning' | 'negative' | 'neutral';
  subtext: string;
  sparkline?: number[];
}

export interface AgentCardData {
  id: string;
  name: string;
  short_name: string;
  status: string;
  status_type: 'normal' | 'elevated' | 'positive' | 'warning' | 'critical';
  key_metric_label: string;
  key_metric_value: string;
  secondary_metric_label: string;
  secondary_metric_value: string;
  trend: string;
  trend_direction: 'up' | 'down' | 'neutral';
  icon_name: string;
  action_label: string;
  route: string;
  last_updated: string;
  execution_time_ms: number;
}

export interface AgentNetworkNode {
  id: string;
  name: string;
  role: string;
  status: string;
  latency_ms: number;
  data_out: string;
}

export interface AgentNetworkStatus {
  pipeline_state: string;
  sync_rate: number;
  last_sync_timestamp: string;
  nodes: AgentNetworkNode[];
  pipeline_order: string[];
}

export interface RiskTrendPoint {
  date: string;
  month_label: string;
  overall_risk_score: number;
  credit_risk_score: number;
  collection_risk_score: number;
  npa_risk_score?: number;
}

export interface RiskTrendData {
  timeframe: string;
  trend_summary: string;
  current_overall_score: number;
  series: RiskTrendPoint[];
}

export interface RiskAlert {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  message: string;
  timestamp: string;
  responsible_agent: string;
  category: string;
  impact_metric?: string;
  is_acknowledged: boolean;
}

export interface CollectionsPerformanceData {
  current_month_collected_cr: number;
  current_month_collected_formatted: string;
  collection_efficiency_pct: number;
  efficiency_target_pct: number;
  expected_collections_cr: number;
  actual_collections_cr: number;
  at_risk_receivables_cr: number;
  resolution_rate_pct: number;
  breakdown_by_bucket: Record<string, number>;
  trend_direction: string;
}

export interface LiquidityForecastData {
  timeframe: string;
  forecast_status: string;
  current_liquidity_cr: number;
  current_liquidity_formatted: string;
  expected_inflows_cr: number;
  expected_outflows_cr: number;
  forecasted_liquidity_cr: number;
  liquidity_buffer_ratio: number;
  stress_test_status: string;
  projections: Array<{
    period: string;
    inflows_cr: number;
    outflows_cr: number;
    net_balance_cr: number;
  }>;
}

export interface DashboardOverview {
  as_of: string;
  portfolio_status: string;
  kpis: ExecutiveKPICardData[];
  agents: AgentCardData[];
  network: AgentNetworkStatus;
  risk_trend: RiskTrendData;
  risk_alerts: RiskAlert[];
  collections: CollectionsPerformanceData;
  liquidity: LiquidityForecastData;
}

export interface CustomerItem {
  id: number;
  customer_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  age?: number;
  employment_type?: string;
  occupation?: string;
  income?: number;
  location?: string;
  state?: string;
  credit_score?: number;
  existing_loans: number;
  credit_utilization: number;
  bank_balance: number;
  risk_tier: string;
  financial_health_score?: number;
  churn_risk?: number;
  created_at?: string;
}

export interface LoanItem {
  id: number;
  loan_id: string;
  customer_id: number;
  customer_name?: string;
  customer_identifier?: string;
  product_type: string;
  loan_amount: number;
  interest_rate: number;
  loan_tenure: number;
  emi: number;
  outstanding_balance: number;
  dpd: number;
  status: string;
  disbursed_date?: string;
  risk_tier?: string;
}

export interface NotificationItem {
  id: number;
  notification_id: string;
  title: string;
  message: string;
  severity: string;
  category: string;
  responsible_agent?: string;
  is_read: boolean;
  created_at: string;
}

export interface LoanApplicationItem {
  id: number;
  application_id: string;
  customer_id: number;
  customer_name?: string;
  customer_identifier?: string;
  customer_phone?: string;
  customer_income?: number;
  customer_cibil?: number;
  product_type: string;
  requested_amount: number;
  requested_tenure: number;
  purpose?: string;
  status: string;
  risk_score: number;
  default_probability: number;
  approved_amount?: number;
  reviewer_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  disbursed_at?: string;
  created_at: string;
}

export interface LoanProductItem {
  id?: number;
  product_code: string;
  name: string;
  category: string;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  min_tenure: number;
  max_tenure: number;
  processing_fee_pct: number;
  is_active: boolean;
  description?: string;
}

export interface DocumentItem {
  id: number;
  doc_id: string;
  customer_id: number;
  application_id?: number;
  doc_type: string;
  file_name: string;
  file_size_kb: number;
  status: string;
  verified_by?: string;
  verification_notes?: string;
  uploaded_at: string;
  verified_at?: string;
}

export interface SupportTicketItem {
  id: number;
  ticket_id: string;
  customer_id: number;
  customer_name?: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to?: string;
  messages: Array<{ sender: string; text: string; time: string }>;
  created_at: string;
  updated_at: string;
}

export interface AmortizationScheduleRow {
  installment_no: number;
  due_date: string;
  emi: number;
  principal: number;
  interest: number;
  remaining_balance: number;
  status: 'Paid' | 'Upcoming';
}

export interface FinanceOverviewData {
  kpis: {
    total_aum_inr: number;
    total_aum_cr: number;
    total_disbursed_inr: number;
    total_disbursed_cr: number;
    total_collected_inr: number;
    total_collected_cr: number;
    monthly_interest_revenue_cr: number;
    net_interest_income_cr: number;
    net_interest_margin_pct: number;
    cost_of_funds_pct: number;
    weighted_avg_yield_pct: number;
    expected_provision_cr: number;
    npa_ratio_pct: number;
  };
  aging_buckets: {
    standard_cr: number;
    bucket1_1_30_dpd_cr: number;
    bucket2_31_60_dpd_cr: number;
    bucket3_61_90_dpd_cr: number;
    npa_90_plus_cr: number;
  };
  cash_flow_trend: Array<{
    month: string;
    disbursements_cr: number;
    collections_cr: number;
    net_cashflow_cr: number;
  }>;
}

