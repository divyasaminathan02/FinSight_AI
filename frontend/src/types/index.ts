export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'CREDIT_OFFICER' | 'RISK_MANAGER' | 'COLLECTION_MANAGER' | 'FINANCE_MANAGER' | 'ANALYST' | 'AUDITOR';
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
