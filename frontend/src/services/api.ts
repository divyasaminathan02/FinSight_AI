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
};

export default api;
