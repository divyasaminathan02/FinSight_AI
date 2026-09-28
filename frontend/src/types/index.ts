export type UserRole =
  | 'CUSTOMER'
  | 'SALES_OFFICER'
  | 'RELATIONSHIP_MANAGER'
  | 'CREDIT_ANALYST'
  | 'CREDIT_MANAGER'
  | 'FRAUD_OFFICER'
  | 'KYC_OFFICER'
  | 'COLLECTIONS_OFFICER'
  | 'COLLECTIONS_MANAGER'
  | 'OPERATIONS_OFFICER'
  | 'OPERATIONS_MANAGER'
  | 'FINANCE_OFFICER'
  | 'FINANCE_MANAGER'
  | 'RISK_ANALYST'
  | 'RISK_MANAGER'
  | 'ADMIN'
  // Legacy aliases
  | 'CREDIT_OFFICER'
  | 'COLLECTION_MANAGER'
  | 'OPERATIONS'
  | 'EXECUTIVE'
  | 'SALES'
  | 'ANALYST'
  | 'AUDITOR';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  branch?: string;
  permissions?: string[];
  is_active: boolean;
  last_login?: string;
}

export interface DemoUserItem {
  name: string;
  email: string;
  role: UserRole;
  department: string;
  description: string;
  password_hint: string;
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
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  category: string;
  responsible_agent?: string;
  is_read: boolean;
  status?: string;
  event_key?: string;
  action_url?: string;
  created_at: string;
  updated_at?: string;
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

export interface CustomerDashboardData {
  customer: {
    id: number;
    customer_id: string;
    name: string;
    email: string;
    credit_score: number;
    risk_tier: string;
    profile_completion: number;
    kyc_status: string;
  };
  overview: {
    active_loans_count: number;
    outstanding_principal: number;
    next_emi_amount: number;
    next_emi_date: string;
    payment_status: string;
    available_credit_limit: number;
  };
  current_application: {
    id: number;
    application_id: string;
    product_type: string;
    requested_amount: number;
    requested_tenure: number;
    status: string;
    created_at: string;
    approved_amount: number | null;
    reviewer_notes: string | null;
  } | null;
  recent_payments: Array<{
    transaction_id: string;
    amount: number;
    type: string;
    status: string;
    channel: string;
    date: string;
  }>;
  notifications: Array<{
    id: number;
    title: string;
    message: string;
    severity: string;
    category: string;
    is_read: boolean;
    created_at: string;
  }>;
  support_tickets: Array<{
    ticket_id: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
  }>;
}

export interface CustomerProfileData {
  personal_info: {
    customer_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string | null;
    gender: string;
    pan_masked: string;
    aadhaar_masked: string;
  };
  contact_info: {
    address_line: string;
    city: string;
    state: string;
    pincode: string;
  };
  employment_info: {
    employment_type: string;
    occupation: string;
    employer_name: string;
    designation: string;
    years_employed: number;
    monthly_income: number;
    other_income: number;
  };
  bank_info: {
    bank_name: string;
    bank_account_number: string;
    bank_ifsc: string;
    account_type: string;
  };
  kyc_info: {
    kyc_status: string;
    verified_documents_count: number;
    cibil_score: number;
    risk_tier: string;
    pan_verified: boolean;
    aadhaar_verified: boolean;
  };
  audit_history: Array<{
    action: string;
    resource: string;
    details: any;
    timestamp: string;
  }>;
}

export interface CustomerProductItem {
  id: number;
  product_code: string;
  name: string;
  category: string;
  min_amount: number;
  max_amount: number;
  min_tenure_months: number;
  max_tenure_months: number;
  interest_rate_pa: number;
  processing_fee_pct: number;
  description: string;
  eligibility_summary: string;
}

export interface CustomerLoanDetail {
  loan_id: string;
  product_type: string;
  principal: number;
  outstanding_amount: number;
  interest_rate: number;
  tenure_months: number;
  emi: number;
  dpd: number;
  status: string;
  next_due_date?: string | null;
  disbursed_date: string | null;
  repayment_schedule: Array<{
    repayment_id: string;
    due_date: string;
    amount_due: number;
    amount_paid: number;
    status: string;
    payment_date: string | null;
  }>;
  payment_history: Array<{
    transaction_id: string;
    amount: number;
    type: string;
    channel: string;
    status: string;
    timestamp: string;
  }>;
}
