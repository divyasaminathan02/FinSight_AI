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
  list: async (params?: { page?: number; page_size?: number; product_type?: string; status?: string; search?: string }) => {
    const res = await api.get('/loans', { params });
    return res.data;
  },
  get: async (id: string | number) => {
    const res = await api.get(`/loans/${id}`);
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
  list: async (): Promise<{ unread_count: number; items: NotificationItem[] }> => {
    const res = await api.get('/notifications');
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
  getData: async (reportType: string) => {
    const res = await api.get(`/reports/data/${reportType}`);
    return res.data;
  },
  downloadCsvUrl: (reportType: string) => `/api/reports/export/${reportType}`,
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

export default api;
