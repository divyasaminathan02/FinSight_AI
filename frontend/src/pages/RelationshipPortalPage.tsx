import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Search,
  Filter,
  ArrowRight,
  Shield,
  FileText,
  DollarSign,
  TrendingUp,
  X,
  Send,
  AlertCircle,
  Eye,
  History,
  Activity,
  Layers,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RelationshipPortalPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'timeline'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskTier, setSelectedRiskTier] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isDocRequestModalOpen, setIsDocRequestModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [noteText, setNoteText] = useState('');
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDesc, setFollowUpDesc] = useState('');
  const [followUpDueDate, setFollowUpDueDate] = useState('');
  const [followUpPriority, setFollowUpPriority] = useState('MEDIUM');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [docType, setDocType] = useState('GST Returns (Last 6 Months)');
  const [escalateReason, setEscalateReason] = useState('');

  // 1. Fetch Dashboard Data
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['relationship-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/relationship/dashboard', { headers });
      if (!res.ok) throw new Error('Failed to load relationship dashboard');
      return res.json();
    }
  });

  // 2. Fetch Customers List
  const { data: customersData, isLoading: custLoading } = useQuery({
    queryKey: ['relationship-customers', searchQuery, selectedRiskTier],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedRiskTier) params.append('risk_tier', selectedRiskTier);
      const res = await fetch(`/api/relationship/customers?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to load customers');
      return res.json();
    }
  });

  // 3. Fetch Customer Details
  const { data: customerDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['relationship-customer-details', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const res = await fetch(`/api/relationship/customers/${selectedCustomerId}/details`, { headers });
      if (!res.ok) throw new Error('Failed to load customer details');
      return res.json();
    },
    enabled: !!selectedCustomerId
  });

  // 4. Fetch Unified Timeline
  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['customer-timeline', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const res = await fetch(`/api/relationship/customers/${selectedCustomerId}/timeline`, { headers });
      if (!res.ok) throw new Error('Failed to load timeline');
      return res.json();
    },
    enabled: !!selectedCustomerId && activeTab === 'timeline'
  });

  // Action Mutations
  const addNoteMutation = useMutation({
    mutationFn: async ({ custId, note }: { custId: string; note: string }) => {
      const res = await fetch(`/api/relationship/customers/${custId}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ note })
      });
      if (!res.ok) throw new Error('Failed to add note');
      return res.json();
    },
    onSuccess: () => {
      setFeedbackMsg({ type: 'success', text: 'Relationship note saved successfully' });
      setIsNoteModalOpen(false);
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['relationship-customer-details', selectedCustomerId] });
    }
  });

  const followUpMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/relationship/customers/${payload.custId}/follow-up`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to schedule follow-up');
      return res.json();
    },
    onSuccess: () => {
      setFeedbackMsg({ type: 'success', text: 'Follow-up task scheduled successfully' });
      setIsFollowUpModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['relationship-dashboard'] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ custId, subject, message }: { custId: string; subject: string; message: string }) => {
      const res = await fetch('/api/communication/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_id: custId,
          comm_type: 'CUSTOMER_MESSAGE',
          subject,
          message
        })
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      setFeedbackMsg({ type: 'success', text: 'Communication dispatched to customer' });
      setIsMessageModalOpen(false);
      setMessageSubject('');
      setMessageBody('');
      queryClient.invalidateQueries({ queryKey: ['relationship-dashboard'] });
    }
  });

  const requestDocMutation = useMutation({
    mutationFn: async ({ custId, document_type }: { custId: string; document_type: string }) => {
      const res = await fetch(`/api/relationship/customers/${custId}/request-document`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ document_type })
      });
      if (!res.ok) throw new Error('Failed to request document');
      return res.json();
    },
    onSuccess: () => {
      setFeedbackMsg({ type: 'success', text: 'Document request generated with automated task' });
      setIsDocRequestModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['relationship-dashboard'] });
    }
  });

  const escalateMutation = useMutation({
    mutationFn: async ({ custId, reason }: { custId: string; reason: string }) => {
      const res = await fetch(`/api/relationship/customers/${custId}/escalate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason })
      });
      if (!res.ok) throw new Error('Failed to escalate');
      return res.json();
    },
    onSuccess: () => {
      setFeedbackMsg({ type: 'success', text: 'Customer case escalated to Senior Management' });
      setIsEscalateModalOpen(false);
      setEscalateReason('');
      queryClient.invalidateQueries({ queryKey: ['relationship-dashboard'] });
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" />
              Relationship Management Portal
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Portfolio & Customer 360 Desk</h1>
            <p className="text-slate-400 text-sm mt-1">
              Serving assigned institutional accounts, real-time EMI tracking, follow-ups, and unified lifecycle auditing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Assigned Manager:</span>
            <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-emerald-400 font-semibold text-xs">
              {dashData?.manager_name || user?.full_name || 'RM Desk'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-6 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Dashboard & KPIs
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'customers'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Assigned Accounts ({customersData?.length || 0})
          </button>
          <button
            onClick={() => {
              if (!selectedCustomerId && customersData?.length > 0) {
                setSelectedCustomerId(customersData[0].customer_id);
              }
              setActiveTab('timeline');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'timeline'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Unified Customer Timeline
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

      {/* TAB 1: DASHBOARD & KPIS */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Assigned Customers</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {dashLoading ? '...' : dashData?.assigned_customers ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Active relationship scope</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Active Loans</span>
                <Briefcase className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {dashLoading ? '...' : dashData?.active_loans ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {dashData?.customer_applications ?? 0} applications in pipeline
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Upcoming EMI (7d)</span>
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {dashLoading ? '...' : dashData?.upcoming_emi_amount_formatted ?? '₹0'}
              </div>
              <div className="text-[11px] text-amber-400/80 mt-1">
                {dashData?.upcoming_emi_count ?? 0} accounts due soon
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Overdue Accounts</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400 mt-2">
                {dashLoading ? '...' : dashData?.overdue_accounts ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {dashData?.follow_ups ?? 0} active follow-up tasks
              </div>
            </div>
          </div>

          {/* Quick Customers & Recent Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Customer Accounts Table */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Portfolio Overview</h3>
                </div>
                <button
                  onClick={() => setActiveTab('customers')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-lg">Customer</th>
                      <th className="py-2.5 px-3">Monthly Income</th>
                      <th className="py-2.5 px-3">Credit Score</th>
                      <th className="py-2.5 px-3">Health</th>
                      <th className="py-2.5 px-3">Active Loan</th>
                      <th className="py-2.5 px-3 rounded-r-lg text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dashData?.customers?.slice(0, 6).map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{c.name}</div>
                          <div className="text-[11px] text-slate-400">{c.customer_id}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-300">₹{c.income?.toLocaleString() || '0'}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-semibold ${
                              c.credit_score >= 700 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {c.credit_score}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold">
                            {c.financial_health}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{c.active_loan}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedCustomerId(c.customer_id);
                              setActiveTab('timeline');
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="View Timeline"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!dashData?.customers || dashData.customers.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          No assigned accounts found in active portfolio.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Follow-up Tasks & Activity */}
            <div className="space-y-6">
              {/* Relationship Tasks */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-white">Pending Action Tasks</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded-full font-semibold">
                    {dashData?.tasks?.length || 0}
                  </span>
                </div>
                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {dashData?.tasks?.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3 bg-slate-800/40 border border-slate-800 rounded-lg hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{t.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            t.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-300'
                              : t.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                        <span>Due: {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'Pending'}</span>
                        <span className="text-emerald-400 font-medium">{t.customer_id || ''}</span>
                      </div>
                    </div>
                  ))}
                  {(!dashData?.tasks || dashData.tasks.length === 0) && (
                    <div className="text-center py-6 text-slate-500 text-xs">No pending tasks.</div>
                  )}
                </div>
              </div>

              {/* Messages Center */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-semibold text-white">Recent Communications</h3>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                  {dashData?.customer_messages?.map((m: any) => (
                    <div key={m.id} className="p-2.5 bg-slate-800/30 rounded border border-slate-800">
                      <div className="flex justify-between font-semibold text-white">
                        <span>{m.sender}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-slate-300 text-[11px] mt-0.5 font-medium">{m.subject}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5 line-clamp-1">{m.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGNED ACCOUNTS LIST */}
      {activeTab === 'customers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedRiskTier}
                onChange={(e) => setSelectedRiskTier(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Risk Tiers</option>
                <option value="Low">Low Risk</option>
                <option value="Moderate">Moderate Risk</option>
                <option value="High">High Risk</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400">
                <tr>
                  <th className="py-3 px-3 rounded-l-lg">Customer Name</th>
                  <th className="py-3 px-3">Location & Occupation</th>
                  <th className="py-3 px-3">Monthly Income</th>
                  <th className="py-3 px-3">Credit Score</th>
                  <th className="py-3 px-3">Risk Tier</th>
                  <th className="py-3 px-3">Active Loans</th>
                  <th className="py-3 px-3">Applications</th>
                  <th className="py-3 px-3 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {customersData?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-white">{c.full_name}</div>
                      <div className="text-[11px] text-slate-400">{c.customer_id} • {c.email}</div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      <div>{c.location}</div>
                      <div className="text-[10px] text-slate-500">{c.occupation}</div>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-200">
                      ₹{c.income?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-emerald-400">
                      {c.credit_score}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                        {c.risk_tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">{c.active_loans}</td>
                    <td className="py-3.5 px-3 text-slate-300">{c.total_applications}</td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedCustomerId(c.customer_id);
                            setIsNoteModalOpen(true);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium"
                          title="Add Note"
                        >
                          + Note
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomerId(c.customer_id);
                            setIsFollowUpModalOpen(true);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[11px] font-medium"
                          title="Follow-up"
                        >
                          Follow-up
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomerId(c.customer_id);
                            setActiveTab('timeline');
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold"
                        >
                          Timeline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!customersData || customersData.length === 0) && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No customer accounts matching filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: UNIFIED CUSTOMER TIMELINE (REAL DATABASE EVENTS) */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400">Viewing Unified History for:</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {timelineData?.customer_name || selectedCustomerId || 'Select Account'}
              </div>
              <div className="text-xs text-slate-500">
                {timelineData?.total_events || 0} chronological database events registered
              </div>
            </div>

            {/* Quick Action Drawer */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsNoteModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Note
              </button>
              <button
                onClick={() => setIsFollowUpModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" /> Follow-Up
              </button>
              <button
                onClick={() => setIsMessageModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-violet-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Send Message
              </button>
              <button
                onClick={() => setIsDocRequestModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> Request Doc
              </button>
              <button
                onClick={() => setIsEscalateModalOpen(true)}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Escalate
              </button>
            </div>
          </div>

          {/* Chronological Timeline Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            {timelineLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Assembling unified database timeline events...
              </div>
            ) : timelineData?.events?.length > 0 ? (
              <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
                {timelineData.events.map((ev: any, idx: number) => (
                  <div key={idx} className="relative group">
                    {/* Event Node Dot */}
                    <div
                      className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                        ev.badge_color === 'emerald' || ev.badge_color === 'green'
                          ? 'bg-emerald-500 shadow-md shadow-emerald-500/30'
                          : ev.badge_color === 'red'
                          ? 'bg-rose-500 shadow-md shadow-rose-500/30'
                          : ev.badge_color === 'purple' || ev.badge_color === 'indigo'
                          ? 'bg-indigo-500 shadow-md shadow-indigo-500/30'
                          : ev.badge_color === 'amber' || ev.badge_color === 'orange'
                          ? 'bg-amber-500 shadow-md shadow-amber-500/30'
                          : 'bg-cyan-500 shadow-md shadow-cyan-500/30'
                      }`}
                    />

                    <div className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 rounded-xl p-4 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{ev.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                            {ev.category}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{ev.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                No events recorded for this customer in database.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD RELATIONSHIP NOTE */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-sm font-bold text-white mb-2">Add Relationship Note</h3>
            <p className="text-xs text-slate-400 mb-4">
              Notes are committed directly to immutable audit logs and customer history.
            </p>
            <textarea
              rows={4}
              placeholder="Enter client interaction observations, meeting minutes, or risk updates..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  selectedCustomerId &&
                  addNoteMutation.mutate({ custId: selectedCustomerId, note: noteText })
                }
                disabled={!noteText.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE FOLLOW-UP */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white">Schedule Follow-up Task</h3>
            <input
              type="text"
              placeholder="Task Title (e.g., Review Q2 Financials)"
              value={followUpTitle}
              onChange={(e) => setFollowUpTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <textarea
              rows={3}
              placeholder="Details or specific talking points..."
              value={followUpDesc}
              onChange={(e) => setFollowUpDesc(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Due Date</label>
                <input
                  type="date"
                  value={followUpDueDate}
                  onChange={(e) => setFollowUpDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Priority</label>
                <select
                  value={followUpPriority}
                  onChange={(e) => setFollowUpPriority(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsFollowUpModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  selectedCustomerId &&
                  followUpMutation.mutate({
                    custId: selectedCustomerId,
                    title: followUpTitle,
                    description: followUpDesc,
                    due_date: followUpDueDate || new Date(Date.now() + 86400000).toISOString(),
                    priority: followUpPriority
                  })
                }
                disabled={!followUpTitle.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SEND IN-APP / CUSTOMER MESSAGE */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white">Send Message to Customer</h3>
            <input
              type="text"
              placeholder="Message Subject..."
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <textarea
              rows={4}
              placeholder="Type message content..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsMessageModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  selectedCustomerId &&
                  sendMessageMutation.mutate({
                    custId: selectedCustomerId,
                    subject: messageSubject,
                    message: messageBody
                  })
                }
                disabled={!messageSubject.trim() || !messageBody.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
              >
                Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST DOCUMENT */}
      {isDocRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white">Request Verification Document</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Select Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="GST Returns (Last 6 Months)">GST Returns (Last 6 Months)</option>
                <option value="Audited P&L Statements">Audited P&L Statements</option>
                <option value="Bank Account Statements (12 Months)">Bank Account Statements (12 Months)</option>
                <option value="Business Ownership Proof">Business Ownership Proof</option>
                <option value="ITR Verification Ack">ITR Verification Ack</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDocRequestModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  selectedCustomerId &&
                  requestDocMutation.mutate({ custId: selectedCustomerId, document_type: docType })
                }
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg"
              >
                Dispatch Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESCALATE ISSUE */}
      {isEscalateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-4 h-4" /> Escalate Account to Leadership
            </h3>
            <textarea
              rows={4}
              placeholder="State clear rationale for priority escalation (credit deterioration, non-responsive borrower, high-risk flag)..."
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEscalateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  selectedCustomerId &&
                  escalateMutation.mutate({ custId: selectedCustomerId, reason: escalateReason })
                }
                disabled={!escalateReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
              >
                Submit Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
