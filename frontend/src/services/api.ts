import axios from 'axios';
import {
  DashboardOverview,
  RiskTrendData,
  RiskAlert,
  CollectionsPerformanceData,
  LiquidityForecastData,
  AgentCardData,
  AgentNetworkStatus,
  CustomerItem,
  LoanItem,
  NotificationItem,
  User,
  CustomerDashboardData,
  CustomerProfileData,
  CustomerProductItem,
  CustomerLoanDetail,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finsight_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (email: string, password: string): Promise<{ access_token: string; user: User }> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (userData: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    department?: string;
  }): Promise<{ message: string; user: User }> => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getDemoUsers: async () => {
    const res = await api.get('/auth/demo-users');
    return res.data;
  },
  getRoles: async () => {
    const res = await api.get('/auth/roles');
    return res.data;
  },
  switchRole: async (role: string) => {
    const res = await api.post(`/auth/switch-role?role=${encodeURIComponent(role)}`);
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
};

export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverview> => {
    const res = await api.get('/dashboard/overview');
    return res.data;
  },
  getRiskTrend: async (): Promise<RiskTrendData> => {
    const res = await api.get('/dashboard/risk-trend');
    return res.data;
  },
  getAlerts: async (): Promise<RiskAlert[]> => {
    const res = await api.get('/dashboard/alerts');
    return res.data;
  },
  getCollections: async (): Promise<CollectionsPerformanceData> => {
    const res = await api.get('/dashboard/collections');
    return res.data;
  },
  getLiquidity: async (): Promise<LiquidityForecastData> => {
    const res = await api.get('/dashboard/liquidity');
    return res.data;
  },
};

export const agentsApi = {
  getStatus: async (): Promise<AgentCardData[]> => {
    const res = await api.get('/agents/status');
    return res.data;
  },
  getNetwork: async (): Promise<AgentNetworkStatus> => {
    const res = await api.get('/agents/network');
    return res.data;
  },
};

// --- AGENT 1: Credit Intelligence API ---
export const creditApi = {
  evaluate: async (payload: {
    income: number;
    credit_score: number;
    loan_amount: number;
    tenure: number;
    total_emi?: number;
    employment_type?: string;
    credit_utilization?: number;
    previous_dpd?: number;
    previous_defaults?: number;
    bank_balance?: number;
    income_stability?: number;
  }) => {
    const res = await api.post('/credit/evaluate', payload);
    return res.data;
  },
  getModelInfo: async () => {
    const res = await api.get('/credit/model-info');
    return res.data;
  },
  getMetrics: async () => {
    const res = await api.get('/credit/metrics');
    return res.data;
  },
};

// --- AGENT 2: Fraud Intelligence API ---
export const fraudApi = {
  analyze: async (payload: {
    customer_id?: number;
    device_id: string;
    phone_hash?: string;
    address_hash?: string;
    requested_amount: number;
    application_velocity: number;
    income?: number;
  }) => {
    const res = await api.post('/fraud/analyze', payload);
    return res.data;
  },
  getAlerts: async () => {
    const res = await api.get('/fraud/alerts');
    return res.data;
  },
  getNetwork: async (customerId: number | string) => {
    const res = await api.get(`/fraud/network/${customerId}`);
    return res.data;
  },
};

// --- AGENT 3: Customer Intelligence API ---
export const customerApi = {
  get360: async (customerId: number | string) => {
    const res = await api.get(`/customers/${customerId}/360`);
    return res.data;
  },
  getHealth: async (customerId: number | string) => {
    const res = await api.get(`/customers/${customerId}/health`);
    return res.data;
  },
  getSegments: async () => {
    const res = await api.get('/customers/segments');
    return res.data;
  },
};

export const customersApi = {
  list: async (params?: { page?: number; page_size?: number; search?: string; risk_tier?: string }) => {
    const res = await api.get('/customers', { params });
    return res.data;
  },
  get: async (id: string | number) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },
};

// --- AGENT 4: Collections Intelligence API ---
export const collectionsApi = {
  getPriorities: async (params?: number | { priority?: string; limit?: number }) => {
    const limit = typeof params === 'number' ? params : (params?.limit || 25);
    const priority = typeof params === 'object' ? params?.priority : undefined;
    const res = await api.get('/collections/priorities', { params: { limit, priority } });
    return res.data;
  },
  getPerformance: async () => {
    const res = await api.get('/collections/performance');
    return res.data;
  },
  getCustomerAssessment: async (customerId: number | string) => {
    const res = await api.get(`/collections/${customerId}`);
    return res.data;
  },
  getCustomerCollections: async (customerId: number | string) => {
    const res = await api.get(`/collections/${customerId}`);
    return res.data;
  },
  getDashboard: async () => {
    const res = await api.get('/collections/dashboard');
    return res.data;
  },
  getCases: async (params?: any) => {
    const res = await api.get('/collections/cases', { params });
    return res.data;
  },
  getCaseDetails: async (collectionId: string) => {
    const res = await api.get(`/collections/cases/${collectionId}`);
    return res.data;
  },
  recordActivity: async (collectionId: string, payload: any) => {
    const res = await api.post(`/collections/cases/${collectionId}/activity`, payload);
    return res.data;
  },
  markPromiseBroken: async (collectionId: string, notes?: string) => {
    const res = await api.post(`/collections/cases/${collectionId}/mark-promise-broken`, null, { params: { notes } });
    return res.data;
  },
  getManagerDashboard: async () => {
    const res = await api.get('/collections/manager/dashboard');
    return res.data;
  },
  reassignCase: async (payload: { collection_id: string; new_officer: string; notes?: string }) => {
    const res = await api.post('/collections/manager/reassign', payload);
    return res.data;
  },
  getCustomerStatus: async () => {
    const res = await api.get('/collections/customer/my-status');
    return res.data;
  },
  syncOverdue: async () => {
    const res = await api.post('/collections/sync-overdue');
    return res.data;
  },
};

// --- Customer & Internal Communications API ---
export const communicationApi = {
  send: async (payload: {
    customer_id?: string;
    application_id?: string;
    recipient?: string;
    comm_type?: string;
    channel?: string;
    subject: string;
    message: string;
    is_customer_visible?: boolean;
  }) => {
    const res = await api.post('/communication/send', payload);
    return res.data;
  },
  getHistory: async (customerId: string) => {
    const res = await api.get(`/communication/history/${customerId}`);
    return res.data;
  },
  getCustomerCommunications: async (customerId: string) => {
    const res = await api.get(`/communication/customer/${customerId}`);
    return res.data;
  },
  triggerNotification: async (params: {
    event_type: string;
    customer_id: string;
    loan_id?: string;
    amount?: number;
    due_date?: string;
  }) => {
    const res = await api.post('/communication/trigger-event-notification', null, { params });
    return res.data;
  },
};

// --- AGENT 5: Risk Intelligence API ---
export const riskApi = {
  getPortfolio: async (weights?: { w_credit?: number; w_delinquency?: number; w_fraud?: number; w_liquidity?: number; w_concentration?: number }) => {
    const res = await api.get('/risk/portfolio', { params: weights });
    return res.data;
  },
  getSignals: async () => {
    const res = await api.get('/risk/signals');
    return res.data;
  },
  getTrends: async () => {
    const res = await api.get('/risk/trends');
    return res.data;
  },
};

// --- AGENT 6: Liquidity Intelligence API ---
export const liquidityApi = {
  getCurrent: async () => {
    const res = await api.get('/liquidity/current');
    return res.data;
  },
  getForecast: async (horizonDays: number = 30) => {
    const res = await api.get('/liquidity/forecast', { params: { horizon_days: horizonDays } });
    return res.data;
  },
  getScenarios: async () => {
    const res = await api.get('/liquidity/scenarios');
    return res.data;
  },
};

export const loansApi = {
  list: async (params?: { page?: number; page_size?: number; product_type?: string; status?: string; search?: string; customer_id?: string }) => {
    const res = await api.get('/loans', { params });
    return res.data;
  },
  get: async (id: string | number) => {
    const res = await api.get(`/loans/${id}`);
    return res.data;
  },
  getApplications: async (params?: { page?: number; page_size?: number; status?: string; search?: string; customer_id?: string }) => {
    const res = await api.get('/loans/applications', { params });
    return res.data;
  },
  apply: async (payload: {
    customer_id?: string;
    product_type: string;
    requested_amount: number;
    requested_tenure: number;
    purpose: string;
    monthly_income?: number;
  }) => {
    const res = await api.post('/loans/apply', payload);
    return res.data;
  },
  reviewApplication: async (applicationId: string, payload: {
    action: string;
    approved_amount?: number;
    notes?: string;
    reviewer_name?: string;
  }) => {
    const res = await api.post(`/loans/applications/${applicationId}/review`, payload);
    return res.data;
  },
  disburseApplication: async (applicationId: string, payload: {
    interest_rate?: number;
    tenure?: number;
    disbursement_account?: string;
    remarks?: string;
  }) => {
    const res = await api.post(`/loans/applications/${applicationId}/disburse`, payload);
    return res.data;
  },
  pay: async (loanId: string | number, payload: {
    amount: number;
    payment_method?: string;
    reference_no?: string;
  }) => {
    const res = await api.post(`/loans/${loanId}/pay`, payload);
    return res.data;
  },
  getSchedule: async (loanId: string | number) => {
    const res = await api.get(`/loans/${loanId}/schedule`);
    return res.data;
  },
  getProducts: async () => {
    const res = await api.get('/loans/products');
    return res.data;
  },
  createProduct: async (prod: any) => {
    const res = await api.post('/loans/products', prod);
    return res.data;
  },
  getDocuments: async (params?: { customer_id?: string; status?: string }) => {
    const res = await api.get('/loans/documents', { params });
    return res.data;
  },
  uploadDocument: async (payload: { customer_id: number; doc_type: string; file_name: string; application_id?: number }) => {
    const res = await api.post('/loans/documents/upload', null, { params: payload });
    return res.data;
  },
  verifyDocument: async (docId: string, action: 'VERIFIED' | 'REJECTED', notes?: string) => {
    const res = await api.post(`/loans/documents/${docId}/verify`, null, { params: { action, notes } });
    return res.data;
  },
  getSupportTickets: async (params?: { customer_id?: string; status?: string }) => {
    const res = await api.get('/loans/support-tickets', { params });
    return res.data;
  },
  createSupportTicket: async (payload: { customer_id: number; subject: string; category?: string; priority?: string; initial_message?: string }) => {
    const res = await api.post('/loans/support-tickets', null, { params: payload });
    return res.data;
  },
  updateSupportTicket: async (ticketId: string, payload: { status?: string; reply_text?: string; assigned_to?: string; priority?: string; sender?: string }) => {
    const res = await api.patch(`/loans/support-tickets/${ticketId}`, payload);
    return res.data;
  },
  acceptOffer: async (applicationId: string) => {
    const res = await api.post(`/loans/applications/${applicationId}/accept-offer`);
    return res.data;
  },
  rejectOffer: async (applicationId: string, reason?: string) => {
    const res = await api.post(`/loans/applications/${applicationId}/reject-offer`, null, { params: { reason } });
    return res.data;
  },
  closeLoan: async (loanId: string | number) => {
    const res = await api.post(`/loans/${loanId}/close`);
    return res.data;
  },
  getNoc: async (loanId: string | number) => {
    const res = await api.get(`/loans/${loanId}/noc`);
    return res.data;
  },
  getApprovalRules: async () => {
    const res = await api.get('/loans/approval-rules');
    return res.data;
  },
};

export const operationsApi = {
  getDashboard: async () => {
    const res = await api.get('/operations/dashboard');
    return res.data;
  },
  getCases: async (params?: any) => {
    const res = await api.get('/operations/cases', { params });
    return res.data;
  },
  getPreDisbursementCheck: async (applicationId: string) => {
    const res = await api.get(`/operations/cases/${applicationId}/pre-disbursement-check`);
    return res.data;
  },
  getDisbursementDetails: async (applicationId: string) => {
    const res = await api.get(`/operations/cases/${applicationId}/disbursement-details`);
    return res.data;
  },
  action: async (applicationId: string, payload: any) => {
    const res = await api.post(`/operations/cases/${applicationId}/action`, payload);
    return res.data;
  },
  disburse: async (applicationId: string, payload: any = {}) => {
    const res = await api.post(`/operations/cases/${applicationId}/disburse`, payload);
    return res.data;
  },
  getManagerDashboard: async () => {
    const res = await api.get('/operations/manager/dashboard');
    return res.data;
  },
};

export const financeApi = {
  getOverview: async () => {
    const res = await api.get('/finance/overview');
    return res.data;
  },
  getProductPerformance: async () => {
    const res = await api.get('/finance/product-performance');
    return res.data;
  },
  getDashboard: async () => {
    const res = await api.get('/finance/dashboard');
    return res.data;
  },
  getTransactions: async (params?: any) => {
    const res = await api.get('/finance/transactions', { params });
    return res.data;
  },
  getTransactionDetails: async (txnId: string) => {
    const res = await api.get(`/finance/transactions/${txnId}`);
    return res.data;
  },
  verifyTransaction: async (txnId: string, payload: any = {}) => {
    const res = await api.post(`/finance/transactions/${txnId}/verify`, payload);
    return res.data;
  },
  reconcileTransaction: async (txnId: string, payload: any = {}) => {
    const res = await api.post(`/finance/transactions/${txnId}/reconcile`, payload);
    return res.data;
  },
  flagTransaction: async (txnId: string, payload: any) => {
    const res = await api.post(`/finance/transactions/${txnId}/flag`, payload);
    return res.data;
  },
  addAdjustment: async (txnId: string, payload: any) => {
    const res = await api.post(`/finance/transactions/${txnId}/adjustment`, payload);
    return res.data;
  },
  getReconciliation: async () => {
    const res = await api.get('/finance/reconciliation');
    return res.data;
  },
  detectOverdue: async () => {
    const res = await api.post('/finance/detect-overdue');
    return res.data;
  },
  recordPayment: async (payload: any) => {
    const res = await api.post('/finance/payments/record', payload);
    return res.data;
  },
  getManagerDashboard: async () => {
    const res = await api.get('/finance/manager/dashboard');
    return res.data;
  },
};

export const transactionsApi = {
  list: async (params?: { page?: number; page_size?: number; transaction_type?: string }) => {
    const res = await api.get('/transactions', { params });
    return res.data;
  },
};

export const notificationsApi = {
  list: async (params?: {
    priority?: string;
    severity?: string;
    category?: string;
    is_read?: boolean;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ unread_count: number; items: NotificationItem[] }> => {
    const res = await api.get('/notifications', { params });
    return res.data;
  },
  markAsRead: async (id: string | number) => {
    const res = await api.post(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await api.post('/notifications/read-all');
    return res.data;
  },
  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const res = await api.get('/notifications/unread-count');
    return res.data;
  },
  createOrUpdate: async (payload: {
    title: string;
    message: string;
    event_type?: string;
    category?: string;
    priority?: string;
    severity?: string;
    event_key?: string;
    recipient_email?: string;
    role_target?: string;
    related_entity_type?: string;
    related_entity_id?: string;
    action_url?: string;
    status?: string;
    context?: any;
  }) => {
    const res = await api.post('/notifications', payload);
    return res.data;
  },
  updateNotification: async (
    id: string | number,
    payload: {
      priority?: string;
      severity?: string;
      status?: string;
      is_read?: boolean;
      title?: string;
      message?: string;
    }
  ) => {
    const res = await api.put(`/notifications/${id}`, payload);
    return res.data;
  },
  generateAlerts: async () => {
    const res = await api.post('/notifications/generate-alerts');
    return res.data;
  },
};

// --- Multi-Agent LangGraph Orchestration API ---
export const orchestrationApi = {
  analyzeLoan: async (payload: {
    customer_id?: string;
    loan_amount: number;
    tenure: number;
    loan_purpose: string;
    income?: number;
    credit_score?: number;
    existing_loans?: number;
    total_emi?: number;
    bank_balance?: number;
    income_stability?: number;
  }) => {
    const res = await api.post('/orchestration/analyze-loan', payload);
    return res.data;
  },
  getWorkflowInfo: async () => {
    const res = await api.get('/orchestration/workflow-info');
    return res.data;
  },
};

// --- FinSight AI Copilot API ---
export const copilotApi = {
  chat: async (query: string, context?: any) => {
    const res = await api.post('/copilot/chat', { query, context });
    return res.data;
  },
  getTools: async () => {
    const res = await api.get('/copilot/tools');
    return res.data;
  },
  getSuggestions: async () => {
    const res = await api.get('/copilot/suggestions');
    return res.data;
  },
};

// --- Decision Audit Trail API ---
export const auditApi = {
  getDecisions: async (params?: { limit?: number; decision?: string; customer_id?: string }) => {
    const res = await api.get('/audit/decisions', { params });
    return res.data;
  },
  getDecisionDetail: async (auditId: string) => {
    const res = await api.get(`/audit/decisions/${auditId}`);
    return res.data;
  },
};

// --- Event Simulation Engine API ---
export const eventsApi = {
  getTypes: async () => {
    const res = await api.get('/events/types');
    return res.data;
  },
  simulate: async (eventType: string, payload: Record<string, any> = {}) => {
    const res = await api.post('/events/simulate', { event_type: eventType, payload });
    return res.data;
  },
  getHistory: async (limit = 50) => {
    const res = await api.get('/events/history', { params: { limit } });
    return res.data;
  },
};

// --- Enterprise Reports API ---
export const reportsApi = {
  getList: async () => {
    const res = await api.get('/reports/list');
    return res.data;
  },
  getData: async (reportType: string, params?: Record<string, any>) => {
    const res = await api.get(`/reports/data/${reportType}`, { params });
    return res.data;
  },
  downloadCsvUrl: (reportType: string, params?: Record<string, any>) => {
    const cleanParams: Record<string, string> = { format: 'csv' };
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 'All') {
          cleanParams[k] = String(v);
        }
      });
    }
    const qs = new URLSearchParams(cleanParams).toString();
    return `/api/reports/export/${reportType}?${qs}`;
  },
  downloadPdfUrl: (reportType: string, params?: Record<string, any>) => {
    const cleanParams: Record<string, string> = { format: 'pdf' };
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 'All') {
          cleanParams[k] = String(v);
        }
      });
    }
    const qs = new URLSearchParams(cleanParams).toString();
    return `/api/reports/export/${reportType}?${qs}`;
  },
};

// --- System Configuration & Risk Policies API ---
export const settingsApi = {
  getConfig: async () => {
    const res = await api.get('/settings/config');
    return res.data;
  },
  updateConfig: async (payload: {
    risk_thresholds?: Record<string, any>;
    decision_policies?: Record<string, any>;
    notification_preferences?: Record<string, any>;
  }) => {
    const res = await api.put('/settings/config', payload);
    return res.data;
  },
};

// --- Sales & Leads API ---
export const leadsApi = {
  list: async (params?: { status?: string; product_type?: string; search?: string }) => {
    const res = await api.get('/leads', { params });
    return res.data;
  },
  create: async (lead: {
    full_name: string;
    email?: string;
    phone?: string;
    product_type: string;
    requested_amount: number;
    annual_income: number;
    city: string;
    notes?: string;
    assigned_to?: string;
  }) => {
    const res = await api.post('/leads', lead);
    return res.data;
  },
  update: async (leadId: string | number, payload: { status?: string; notes?: string; assigned_to?: string }) => {
    const res = await api.patch(`/leads/${leadId}`, payload);
    return res.data;
  },
  convert: async (leadId: string | number) => {
    const res = await api.post(`/leads/${leadId}/convert`);
    return res.data;
  },
};

// --- Task & Approval Center API ---
export const tasksApi = {
  list: async (params?: { role?: string; status?: string; priority?: string }) => {
    const res = await api.get('/tasks', { params });
    return res.data;
  },
  create: async (task: {
    title: string;
    description?: string;
    role_target: string;
    assigned_to?: string;
    priority?: string;
    due_date?: string;
    related_entity_type?: string;
    related_entity_id?: string;
  }) => {
    const res = await api.post('/tasks', task);
    return res.data;
  },
  update: async (taskId: string | number, payload: { status?: string; priority?: string; assigned_to?: string; comment?: string }) => {
    const res = await api.patch(`/tasks/${taskId}`, payload);
    return res.data;
  },
};

// --- Global Search API ---
export const searchApi = {
  globalSearch: async (q: string) => {
    const res = await api.get('/search', { params: { q } });
    return res.data;
  },
};

// --- Support Ticket & Helpdesk API ---
export const supportApi = {
  list: async (params?: {
    status?: string;
    category?: string;
    priority?: string;
    assigned_to?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const res = await api.get('/support/tickets', { params });
    return res.data;
  },
  get: async (ticketId: string | number) => {
    const res = await api.get(`/support/tickets/${ticketId}`);
    return res.data;
  },
  create: async (payload: {
    subject: string;
    category: string;
    priority: string;
    initial_message: string;
    customer_id?: number;
    related_loan_id?: string;
  }) => {
    const res = await api.post('/support/tickets', payload);
    return res.data;
  },
  assign: async (ticketId: string | number, payload: { assigned_to: string; assigned_officer?: string; note?: string }) => {
    const res = await api.post(`/support/tickets/${ticketId}/assign`, payload);
    return res.data;
  },
  reply: async (ticketId: string | number, payload: { message: string; status_update?: string }) => {
    const res = await api.post(`/support/tickets/${ticketId}/reply`, payload);
    return res.data;
  },
  escalate: async (ticketId: string | number, payload: { escalated_to: string; reason: string }) => {
    const res = await api.post(`/support/tickets/${ticketId}/escalate`, payload);
    return res.data;
  },
  resolve: async (ticketId: string | number, payload: { resolution_notes: string }) => {
    const res = await api.post(`/support/tickets/${ticketId}/resolve`, payload);
    return res.data;
  },
  close: async (ticketId: string | number, note?: string) => {
    const res = await api.post(`/support/tickets/${ticketId}/close`, null, { params: { note } });
    return res.data;
  },
  getMetrics: async () => {
    const res = await api.get('/support/metrics');
    return res.data;
  },
};

// --- User Management API ---
export const usersApi = {
  list: async () => {
    const res = await api.get('/auth/users');
    return res.data;
  },
  update: async (userId: number, payload: { role?: string; department?: string; is_active?: boolean }) => {
    const res = await api.patch(`/auth/users/${userId}`, payload);
    return res.data;
  },
  getRoles: async () => {
    const res = await api.get('/auth/roles');
    return res.data;
  },
};

// --- System Health API ---
export const healthApi = {
  getStatus: async () => {
    const res = await api.get('/health');
    return res.data;
  },
  getDatabase: async () => {
    const res = await api.get('/health/database');
    return res.data;
  },
  getModels: async () => {
    const res = await api.get('/health/models');
    return res.data;
  },
  getLlm: async () => {
    const res = await api.get('/health/llm');
    return res.data;
  },
};

// --- Customer Portal Self-Service API ---
export const customerPortalApi = {
  getDashboard: async (): Promise<CustomerDashboardData> => {
    const res = await api.get('/customer/dashboard');
    return res.data;
  },
  getProfile: async (): Promise<CustomerProfileData> => {
    const res = await api.get('/customer/profile');
    return res.data;
  },
  updateProfile: async (payload: {
    phone?: string;
    address_line?: string;
    city?: string;
    state?: string;
    pincode?: string;
    employment_type?: string;
    occupation?: string;
    employer_name?: string;
    designation?: string;
    years_employed?: number;
    income?: number;
    other_income?: number;
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
  }) => {
    const res = await api.put('/customer/profile', payload);
    return res.data;
  },
  getProducts: async (): Promise<CustomerProductItem[]> => {
    const res = await api.get('/customer/products');
    return res.data;
  },
  saveDraft: async (payload: {
    application_id?: string;
    product_type: string;
    requested_amount: number;
    requested_tenure: number;
    purpose?: string;
    step: number;
    employment_details?: Record<string, any>;
    existing_liabilities?: Record<string, any>;
    bank_details?: Record<string, any>;
  }) => {
    const res = await api.post('/customer/applications/draft', payload);
    return res.data;
  },
  submitApplication: async (payload: {
    draft_application_id?: string;
    product_type: string;
    requested_amount: number;
    requested_tenure: number;
    purpose: string;
    employment_details: Record<string, any>;
    existing_liabilities?: Record<string, any>;
    bank_details: Record<string, any>;
    uploaded_document_ids?: string[];
  }) => {
    const res = await api.post('/customer/applications/submit', payload);
    return res.data;
  },
  getApplications: async () => {
    const res = await api.get('/customer/applications');
    return res.data;
  },
  getApplicationDetails: async (applicationId: string | number) => {
    const res = await api.get(`/customer/applications/${applicationId}`);
    return res.data;
  },
  decideOffer: async (applicationId: string | number, action: 'ACCEPT' | 'REJECT', notes?: string) => {
    const res = await api.post(`/customer/applications/${applicationId}/offer-decision`, {
      action,
      decision_notes: notes,
    });
    return res.data;
  },
  advanceWorkflow: async (applicationId: string | number, targetStatus: string) => {
    const res = await api.post(`/customer/applications/${applicationId}/advance-workflow`, {
      target_status: targetStatus,
    });
    return res.data;
  },
  getLoans: async () => {
    const res = await api.get('/customer/loans');
    return res.data;
  },
  getLoanDetails: async (loanId: string | number): Promise<CustomerLoanDetail> => {
    const res = await api.get(`/customer/loans/${loanId}`);
    return res.data;
  },
  simulatePayment: async (payload: {
    loan_id: string;
    amount: number;
    payment_channel?: string;
    remarks?: string;
  }) => {
    const res = await api.post('/customer/payments/simulate', payload);
    return res.data;
  },
  getDocuments: async () => {
    const res = await api.get('/customer/documents');
    return res.data;
  },
  uploadDocument: async (docType: string, fileName?: string, fileSizeKb?: number) => {
    const res = await api.post(
      `/customer/documents/upload?doc_type=${encodeURIComponent(docType)}&file_name=${encodeURIComponent(
        fileName || 'document.pdf'
      )}&file_size_kb=${fileSizeKb || 450}`
    );
    return res.data;
  },
  getSupportTickets: async () => {
    const res = await api.get('/customer/support-tickets');
    return res.data;
  },
  createSupportTicket: async (payload: {
    subject: string;
    category: string;
    priority?: string;
    message: string;
  }) => {
    const res = await api.post('/customer/support-tickets', payload);
    return res.data;
  },
  replySupportTicket: async (ticketId: string, message: string) => {
    const res = await api.post(`/customer/support-tickets/${ticketId}/reply`, { message });
    return res.data;
  },
  getNotifications: async () => {
    const res = await api.get('/customer/notifications');
    return res.data;
  },
  markNotificationsRead: async () => {
    const res = await api.post('/customer/notifications/mark-read');
    return res.data;
  },
};

export const adminApi = {
  getUsers: async (params?: { query?: string; role?: string; department?: string; branch_id?: string; is_active?: boolean }) => {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },
  createUser: async (payload: any) => {
    const res = await api.post('/admin/users', payload);
    return res.data;
  },
  editUser: async (userId: number, payload: any) => {
    const res = await api.put(`/admin/users/${userId}`, payload);
    return res.data;
  },
  toggleUserStatus: async (userId: number) => {
    const res = await api.post(`/admin/users/${userId}/toggle-status`);
    return res.data;
  },
  resetUserAccess: async (userId: number, new_password: string) => {
    const res = await api.post(`/admin/users/${userId}/reset-access`, { new_password });
    return res.data;
  },
  getRoles: async () => {
    const res = await api.get('/admin/roles');
    return res.data;
  },
  getPermissions: async () => {
    const res = await api.get('/admin/permissions');
    return res.data;
  },
  getBranches: async () => {
    const res = await api.get('/admin/branches');
    return res.data;
  },
  createBranch: async (payload: any) => {
    const res = await api.post('/admin/branches', payload);
    return res.data;
  },
  updateBranch: async (branchId: number, payload: any) => {
    const res = await api.put(`/admin/branches/${branchId}`, payload);
    return res.data;
  },
  getDepartments: async () => {
    const res = await api.get('/admin/departments');
    return res.data;
  },
  createDepartment: async (payload: any) => {
    const res = await api.post('/admin/departments', payload);
    return res.data;
  },
  getTeams: async () => {
    const res = await api.get('/admin/teams');
    return res.data;
  },
  createTeam: async (payload: any) => {
    const res = await api.post('/admin/teams', payload);
    return res.data;
  },
  getOrganizationalScope: async () => {
    const res = await api.get('/admin/organization/scope');
    return res.data;
  },
  getLoanProducts: async () => {
    const res = await api.get('/admin/loan-products');
    return res.data;
  },
  createLoanProduct: async (payload: any) => {
    const res = await api.post('/admin/loan-products', payload);
    return res.data;
  },
  updateLoanProduct: async (productId: number, payload: any) => {
    const res = await api.put(`/admin/loan-products/${productId}`, payload);
    return res.data;
  },
  getApprovalRules: async () => {
    const res = await api.get('/admin/approval-rules');
    return res.data;
  },
  createApprovalRule: async (payload: any) => {
    const res = await api.post('/admin/approval-rules', payload);
    return res.data;
  },
  updateApprovalRule: async (ruleId: number, payload: any) => {
    const res = await api.put(`/admin/approval-rules/${ruleId}`, payload);
    return res.data;
  },
  evaluateApprovalRules: async (payload: { amount: number; cibil_score?: number; dti_pct?: number; risk_score?: number }) => {
    const res = await api.post('/admin/approval-rules/evaluate', payload);
    return res.data;
  },
  getAuditLogs: async (params?: { limit?: number; action?: string; user_query?: string; role?: string; entity?: string }) => {
    const res = await api.get('/admin/audit-logs', { params });
    return res.data;
  },
  getConfig: async () => {
    const res = await api.get('/admin/config');
    return res.data;
  },
  updateConfig: async (payload: any) => {
    const res = await api.put('/admin/config', payload);
    return res.data;
  },
  testIntegration: async (key: string) => {
    const res = await api.post(`/admin/integrations/${key}/test`);
    return res.data;
  },
  broadcastNotification: async (payload: { title: string; message: string; priority?: string; target_role?: string; target_branch?: string }) => {
    const res = await api.post('/admin/notifications/broadcast', payload);
    return res.data;
  },
  getSystemHealth: async () => {
    const res = await api.get('/admin/health');
    return res.data;
  },
};

export default api;
