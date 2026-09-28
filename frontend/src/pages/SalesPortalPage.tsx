import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Briefcase,
  Users,
  UserPlus,
  PhoneCall,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  X,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
  Send,
  AlertTriangle,
  MessageSquare,
  HelpCircle,
  Eye,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SalesPortalPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('finsight_token') || localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  // Synchronize active tab with URL path
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'leads'>('dashboard');

  useEffect(() => {
    if (location.pathname.includes('/sales/applications')) {
      setActiveTab('applications');
    } else if (location.pathname.includes('/sales/dashboard')) {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  // Lead Filters & State
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('ALL');
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  // Application Queue Filters & State
  const [appStatusFilter, setAppStatusFilter] = useState('');
  const [appProductFilter, setAppProductFilter] = useState('');
  const [appRiskFilter, setAppRiskFilter] = useState('');
  const [appKycFilter, setAppKycFilter] = useState('');
  const [appFraudFilter, setAppFraudFilter] = useState('');
  const [appSearch, setAppSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // Application Action Modals
  const [actionType, setActionType] = useState<string | null>(null); // 'NOTE', 'DOC_REQUEST', 'ASSIGN', 'ESCALATE', 'MESSAGE', 'ADVANCE'
  const [modalInput1, setModalInput1] = useState('');
  const [modalInput2, setModalInput2] = useState('');
  const [modalTargetRole, setModalTargetRole] = useState('CREDIT_MANAGER');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for creating new lead
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadProduct, setLeadProduct] = useState('MSME Business Loan');
  const [leadAmount, setLeadAmount] = useState<number>(500000);
  const [leadIncome, setLeadIncome] = useState<number>(850000);
  const [leadCity, setLeadCity] = useState('Mumbai');
  const [leadNote, setLeadNote] = useState('');

  // 1. Fetch Sales Dashboard
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['sales-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/sales/dashboard', { headers });
      if (!res.ok) throw new Error('Failed to load sales dashboard');
      return res.json();
    }
  });

  // 2. Fetch Applications Work Queue
  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: [
      'sales-applications',
      appStatusFilter,
      appProductFilter,
      appRiskFilter,
      appKycFilter,
      appFraudFilter
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appStatusFilter) params.append('status', appStatusFilter);
      if (appProductFilter) params.append('product_type', appProductFilter);
      if (appRiskFilter) params.append('risk_level', appRiskFilter);
      if (appKycFilter) params.append('kyc_status', appKycFilter);
      if (appFraudFilter) params.append('fraud_status', appFraudFilter);
      const res = await fetch(`/api/sales/applications?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to load sales applications');
      return res.json();
    }
  });

  // 3. Fetch Leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['sales-leads', leadStatusFilter, leadSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (leadStatusFilter && leadStatusFilter !== 'ALL') params.append('status', leadStatusFilter);
      if (leadSearch) params.append('search', leadSearch);
      const res = await fetch(`/api/leads?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to load leads');
      return res.json();
    }
  });

  // Application Actions Mutation
  const appActionMutation = useMutation({
    mutationFn: async ({ appId, type, payload }: { appId: string; type: string; payload: any }) => {
      let endpoint = '';
      if (type === 'NOTE') endpoint = `/api/sales/applications/${appId}/note`;
      else if (type === 'DOC_REQUEST') endpoint = `/api/sales/applications/${appId}/request-document`;
      else if (type === 'ASSIGN') endpoint = `/api/sales/applications/${appId}/assign`;
      else if (type === 'ESCALATE') endpoint = `/api/sales/applications/${appId}/escalate`;
      else if (type === 'MESSAGE') endpoint = `/api/sales/applications/${appId}/message`;
      else if (type === 'ADVANCE') endpoint = `/api/sales/applications/${appId}/advance-stage`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Action failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setFeedbackMsg({ type: 'success', text: data.message || 'Action executed successfully!' });
      setActionType(null);
      setModalInput1('');
      setModalInput2('');
      queryClient.invalidateQueries({ queryKey: ['sales-applications'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Action failed' });
    }
  });

  // Create Lead Mutation
  const createLeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create lead');
      return res.json();
    },
    onSuccess: () => {
      setFeedbackMsg({ type: 'success', text: 'New lead captured and audit log recorded' });
      setIsCreateLeadOpen(false);
      setLeadName('');
      setLeadEmail('');
      setLeadPhone('');
      setLeadNote('');
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
    }
  });

  // Convert Lead Mutation
  const convertLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await fetch(`/api/leads/${leadId}/convert`, {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error('Failed to convert lead');
      return res.json();
    },
    onSuccess: (data) => {
      setFeedbackMsg({
        type: 'success',
        text: `Lead converted! Customer #${data.customer_id} & Application #${data.application_id} active in underwriting.`
      });
      setSelectedLead(null);
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-applications'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              Sales Officer Workspace
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sales & Lead Pipeline Management</h1>
            <p className="text-slate-400 text-sm mt-1">
              End-to-end institutional loan originations, lead qualifying, document collection, and workflow progression.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Assigned Officer:</span>
            <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-blue-400 font-semibold text-xs">
              {dashData?.sales_officer || user?.full_name || 'Sales Officer'}
            </span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mt-6 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Sales Dashboard
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'applications'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Application Work Queue ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'leads'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Lead Management ({leads.length})
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: SALES OFFICER DASHBOARD (/sales/dashboard) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Real Backend KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Assigned Leads</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {dashLoading ? '...' : dashData?.assigned_leads ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Directly assigned portfolio</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">New Applications</span>
                <Briefcase className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {dashLoading ? '...' : dashData?.new_applications ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Under review / new</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Requires Action</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-2">
                {dashLoading ? '...' : dashData?.applications_requiring_action ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Docs pending / returned</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Pending Documents</span>
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-400 mt-2">
                {dashLoading ? '...' : dashData?.pending_documents ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Verification items</div>
            </div>
          </div>

          {/* Monthly Sales & Conversion Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Monthly Sales</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">
                {dashLoading ? '...' : dashData?.monthly_sales_formatted ?? '₹0'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Sanctioned volume (MTD)</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Conversion Rate</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400 mt-2">
                {dashLoading ? '...' : dashData?.conversion_rate_pct ?? '0%'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Lead-to-sanction ratio</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Approved vs Rejected</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white mt-2">
                <span className="text-emerald-400">{dashData?.applications_approved ?? 0}</span>
                <span className="text-slate-500 mx-1.5">/</span>
                <span className="text-rose-400">{dashData?.applications_rejected ?? 0}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Applications this month</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Pending Tasks</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-2">
                {dashLoading ? '...' : dashData?.pending_tasks ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {dashData?.customer_follow_ups ?? 0} follow-ups scheduled
              </div>
            </div>
          </div>

          {/* Quick Recent Applications & Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Recent Assigned Applications</h3>
                <button
                  onClick={() => setActiveTab('applications')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                >
                  Work Queue <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-lg">Application</th>
                      <th className="py-2.5 px-3">Borrower</th>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Requested Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 rounded-r-lg text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dashData?.recent_applications?.slice(0, 6).map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold text-white">{a.application_id}</td>
                        <td className="py-3 px-3 text-slate-300">{a.customer_name}</td>
                        <td className="py-3 px-3 text-slate-400">{a.product_type}</td>
                        <td className="py-3 px-3 text-slate-200 font-medium">
                          ₹{a.requested_amount?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold">
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedApp(a);
                              setActiveTab('applications');
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!dashData?.recent_applications || dashData.recent_applications.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          No recent applications in queue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notifications Feed */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Live Officer Alerts</h3>
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {dashData?.notifications?.map((n: any) => (
                  <div key={n.id} className="p-3 bg-slate-800/40 border border-slate-800 rounded-lg text-xs">
                    <div className="font-semibold text-white">{n.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{n.message}</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                {(!dashData?.notifications || dashData.notifications.length === 0) && (
                  <div className="text-center py-6 text-slate-500 text-xs">No alerts.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: APPLICATION WORK QUEUE (/sales/applications) */}
      {activeTab === 'applications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Application Work Queue</h3>
              <p className="text-xs text-slate-400">
                Manage assigned cases, collect verification documents, and transition stages.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Status</label>
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Under_Review">Under Review</option>
                <option value="Credit_Review">Credit Review</option>
                <option value="Documents_Pending">Documents Pending</option>
                <option value="Manager_Approval">Manager Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Product</label>
              <select
                value={appProductFilter}
                onChange={(e) => setAppProductFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Products</option>
                <option value="MSME Business Loan">MSME Business Loan</option>
                <option value="Vehicle Loan">Vehicle Loan</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Gold Loan">Gold Loan</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Risk Level</label>
              <select
                value={appRiskFilter}
                onChange={(e) => setAppRiskFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Risk Levels</option>
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">KYC Status</label>
              <select
                value={appKycFilter}
                onChange={(e) => setAppKycFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                <option value="">All KYC</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Fraud Screen</label>
              <select
                value={appFraudFilter}
                onChange={(e) => setAppFraudFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Fraud States</option>
                <option value="CLEARED">Cleared</option>
                <option value="FLAGGED">Flagged</option>
              </select>
            </div>
          </div>

          {/* Work Queue Table */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400">
                <tr>
                  <th className="py-3 px-3 rounded-l-lg">Application</th>
                  <th className="py-3 px-3">Borrower</th>
                  <th className="py-3 px-3">Product & Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Risk & KYC</th>
                  <th className="py-3 px-3">Underwriting</th>
                  <th className="py-3 px-3 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {applications.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-white">{a.application_id}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(a.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-200">{a.customer_name}</div>
                      <div className="text-[10px] text-slate-500">{a.customer_id}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-white">₹{a.requested_amount?.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400">{a.product_type}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-semibold">
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="text-[11px] font-medium text-slate-300">
                        Risk: <span className={a.risk_level === 'High' ? 'text-rose-400' : 'text-emerald-400'}>{a.risk_level}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">KYC: {a.kyc_status}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="text-[11px] text-slate-300">{a.analyst_recommendation || 'Pending Review'}</div>
                      <div className="text-[10px] text-slate-500">{a.credit_analyst || 'Unassigned'}</div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedApp(a);
                            setActionType('NOTE');
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium"
                          title="Add Note"
                        >
                          Note
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApp(a);
                            setActionType('DOC_REQUEST');
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-medium"
                          title="Request Doc"
                        >
                          Doc
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApp(a);
                            setActionType('ADVANCE');
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold"
                        >
                          Advance
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No applications found matching the current work queue filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: LEAD MANAGEMENT */}
      {activeTab === 'leads' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Institutional Lead Pipeline</h3>
              <p className="text-xs text-slate-400">
                Track new leads, qualify prospective borrowers, schedule follow-ups, and convert to active customers.
              </p>
            </div>
            <button
              onClick={() => setIsCreateLeadOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-3.5 h-3.5" /> Capture New Lead
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads by name, email, phone, city..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="ALL">All States</option>
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="DOCUMENTS_PENDING">DOCUMENTS_PENDING</option>
                <option value="APPLICATION_STARTED">APPLICATION_STARTED</option>
                <option value="APPLICATION_SUBMITTED">APPLICATION_SUBMITTED</option>
                <option value="CONVERTED">CONVERTED</option>
                <option value="LOST">LOST</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400">
                <tr>
                  <th className="py-3 px-3 rounded-l-lg">Lead Details</th>
                  <th className="py-3 px-3">Product & Amount</th>
                  <th className="py-3 px-3">Annual Income</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Assigned Officer</th>
                  <th className="py-3 px-3 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leads.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-white">{l.full_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {l.lead_id} • {l.phone || 'No phone'} • {l.city}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-200">₹{l.requested_amount?.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">{l.product_type}</div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      ₹{l.annual_income?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          l.status === 'NEW'
                            ? 'bg-blue-500/10 text-blue-400'
                            : l.status === 'QUALIFIED' || l.status === 'CONVERTED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : l.status === 'LOST'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {l.assigned_officer || l.assigned_to || 'Desk'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {l.status !== 'CONVERTED' && (
                          <button
                            onClick={() => convertLeadMutation.mutate(l.lead_id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold"
                          >
                            Convert
                          </button>
                        )}
                        {l.status === 'CONVERTED' && (
                          <span className="text-[11px] text-emerald-400 font-semibold px-2">Converted</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No leads matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: APPLICATION ACTIONS */}
      {actionType && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Action on {selectedApp.application_id}
                </h3>
                <div className="text-xs text-slate-400">Borrower: {selectedApp.customer_name}</div>
              </div>
              <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionType === 'NOTE' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Add Case Note</label>
                <textarea
                  rows={4}
                  placeholder="Record verification updates or customer phone interaction..."
                  value={modalInput1}
                  onChange={(e) => setModalInput1(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            )}

            {actionType === 'DOC_REQUEST' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Document Required</label>
                  <input
                    type="text"
                    placeholder="e.g., Audited Balance Sheet 2025-26"
                    value={modalInput1}
                    onChange={(e) => setModalInput1(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Special Instructions</label>
                  <textarea
                    rows={2}
                    placeholder="Provide specific details or formats needed from customer..."
                    value={modalInput2}
                    onChange={(e) => setModalInput2(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            {actionType === 'ADVANCE' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Advance Workflow Stage</label>
                <select
                  value={modalInput1 || 'Credit_Review'}
                  onChange={(e) => setModalInput1(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none mb-3"
                >
                  <option value="Credit_Review">Credit Review (Underwriting Queue)</option>
                  <option value="Documents_Pending">Documents Pending</option>
                  <option value="Manager_Approval">Manager Approval</option>
                  <option value="Disbursed">Disbursed</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <textarea
                  rows={2}
                  placeholder="Reason / Notes for stage transition..."
                  value={modalInput2}
                  onChange={(e) => setModalInput2(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActionType(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  let payload: any = {};
                  if (actionType === 'NOTE') payload = { note: modalInput1 };
                  else if (actionType === 'DOC_REQUEST')
                    payload = { document_type: modalInput1, instructions: modalInput2 };
                  else if (actionType === 'ADVANCE')
                    payload = { target_stage: modalInput1 || 'Credit_Review', notes: modalInput2 };

                  appActionMutation.mutate({ appId: selectedApp.application_id, type: actionType, payload });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"
              >
                Submit Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CAPTURE NEW LEAD */}
      {isCreateLeadOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-3.5">
            <h3 className="text-sm font-bold text-white">Capture Prospective Borrower Lead</h3>
            <input
              type="text"
              placeholder="Borrower Full Name *"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="email"
                placeholder="Email Address"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Loan Product</label>
                <select
                  value={leadProduct}
                  onChange={(e) => setLeadProduct(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  <option value="MSME Business Loan">MSME Business Loan</option>
                  <option value="Vehicle Loan">Vehicle Loan</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Gold Loan">Gold Loan</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">City</label>
                <input
                  type="text"
                  value={leadCity}
                  onChange={(e) => setLeadCity(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Requested Amount (₹)</label>
                <input
                  type="number"
                  value={leadAmount}
                  onChange={(e) => setLeadAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Annual Income (₹)</label>
                <input
                  type="number"
                  value={leadIncome}
                  onChange={(e) => setLeadIncome(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
            <textarea
              rows={2}
              placeholder="Initial inquiries, purpose, or lead source notes..."
              value={leadNote}
              onChange={(e) => setLeadNote(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreateLeadOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createLeadMutation.mutate({
                    full_name: leadName,
                    email: leadEmail,
                    phone: leadPhone,
                    product_type: leadProduct,
                    requested_amount: leadAmount,
                    annual_income: leadIncome,
                    city: leadCity,
                    notes: leadNote,
                    assigned_officer: user?.full_name || 'Sales Desk'
                  })
                }
                disabled={!leadName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
              >
                Capture Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
