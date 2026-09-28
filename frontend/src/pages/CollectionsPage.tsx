import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PiggyBank, Calendar, PhoneCall, AlertOctagon, CheckCircle2, 
  TrendingUp, Clock, ShieldAlert, ArrowUpRight, Search, FileText, X,
  Phone, Mail, MessageSquare, Send, DollarSign, UserCheck, RefreshCw,
  AlertTriangle, Users, SlidersHorizontal, Layers, ChevronRight, Activity,
  Smartphone, Inbox, History
} from 'lucide-react';
import { collectionsApi, communicationApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';

export const CollectionsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isManager = user?.role === 'COLLECTIONS_MANAGER' || 
                    user?.role === 'COLLECTION_MANAGER' || 
                    user?.role === 'ADMIN' || 
                    user?.role === 'RISK_MANAGER';

  const [activeTab, setActiveTab] = useState<'queue' | 'manager' | 'communications'>('queue');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals state
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [interactionModalCase, setInteractionModalCase] = useState<any | null>(null);
  const [interactionType, setInteractionType] = useState<'CALL' | 'MESSAGE' | 'PROMISE' | 'PAYMENT' | 'ESCALATE' | 'NOTE'>('CALL');
  const [interactionChannel, setInteractionChannel] = useState<'PHONE' | 'SMS' | 'EMAIL' | 'IN_APP'>('PHONE');
  const [interactionNotes, setInteractionNotes] = useState<string>('');
  const [promiseAmount, setPromiseAmount] = useState<number>(0);
  const [promiseDate, setPromiseDate] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [escalateReason, setEscalateReason] = useState<string>('');

  // Reassignment Modal state
  const [reassignCase, setReassignCase] = useState<any | null>(null);
  const [newOfficerName, setNewOfficerName] = useState<string>('Rahul Sharma');
  const [reassignNotes, setReassignNotes] = useState<string>('');

  // Communication History view state
  const [commCustomerQuery, setCommCustomerQuery] = useState<string>('');
  const [activeCommCustomerId, setActiveCommCustomerId] = useState<string>('1');

  // 1. Fetch Officer Dashboard & Cases
  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['collections-dashboard'],
    queryFn: () => collectionsApi.getDashboard(),
  });

  // 2. Fetch Manager Dashboard (if manager or manager tab active)
  const { data: managerData, isLoading: isManagerLoading, refetch: refetchManager } = useQuery({
    queryKey: ['collections-manager-dashboard'],
    queryFn: () => collectionsApi.getManagerDashboard(),
    enabled: isManager || activeTab === 'manager',
  });

  // 3. Fetch Case Details if open
  const { data: caseDetailsData, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['collections-case-details', activeCaseId],
    queryFn: () => activeCaseId ? collectionsApi.getCaseDetails(activeCaseId) : null,
    enabled: !!activeCaseId,
  });

  // 4. Fetch Customer Communication History
  const { data: commHistoryData, isLoading: isCommLoading, refetch: refetchCommHistory } = useQuery({
    queryKey: ['collections-comm-history', activeCommCustomerId],
    queryFn: () => activeCommCustomerId ? communicationApi.getHistory(activeCommCustomerId) : null,
    enabled: activeTab === 'communications' && !!activeCommCustomerId,
  });

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: (variables: { id: string; payload: any }) => 
      collectionsApi.recordActivity(variables.id, variables.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['collections-cases'] });
      queryClient.invalidateQueries({ queryKey: ['collections-case-details'] });
      queryClient.invalidateQueries({ queryKey: ['collections-manager-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['collections-comm-history'] });
      setInteractionModalCase(null);
      setInteractionNotes('');
    },
    onError: (err: any) => {
      alert(`Action failed: ${err?.response?.data?.detail || err.message}`);
    }
  });

  // Reassignment mutation
  const reassignMutation = useMutation({
    mutationFn: (payload: { collection_id: string; new_officer: string; notes?: string }) =>
      collectionsApi.reassignCase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['collections-manager-dashboard'] });
      setReassignCase(null);
    },
    onError: (err: any) => {
      alert(`Reassignment failed: ${err?.response?.data?.detail || err.message}`);
    }
  });

  // Sync Overdue mutation
  const syncMutation = useMutation({
    mutationFn: () => collectionsApi.syncOverdue(),
    onSuccess: (data: any) => {
      alert(`Delinquency synchronization completed! ${data.synced_records} records processed.`);
      queryClient.invalidateQueries({ queryKey: ['collections-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['collections-manager-dashboard'] });
    }
  });

  const kpis = dashboardData?.kpis || {
    assigned_cases: 0,
    total_overdue: 0,
    total_overdue_formatted: '₹0',
    contacted_today: 0,
    promises_pending: 0,
    recovered_this_month: 0,
    recovered_this_month_formatted: '₹0',
    escalated_cases: 0
  };

  const rawCases: any[] = dashboardData?.cases || [];

  const filteredCases = rawCases.filter((c: any) => {
    if (selectedStage !== 'ALL' && c.workflow_stage !== selectedStage) return false;
    if (selectedPriority !== 'ALL' && c.priority !== selectedPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = c.customer?.name?.toLowerCase().includes(q);
      const matchId = c.customer?.customer_id?.toLowerCase().includes(q);
      const matchLoan = c.loan?.loan_number?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchLoan) return false;
    }
    return true;
  });

  const handleOpenActionModal = (c: any, defaultType: 'CALL' | 'MESSAGE' | 'PROMISE' | 'PAYMENT' | 'ESCALATE' | 'NOTE') => {
    setInteractionModalCase(c);
    setInteractionType(defaultType);
    setInteractionChannel(defaultType === 'MESSAGE' ? 'SMS' : 'PHONE');
    setInteractionNotes('');
    setPromiseAmount(c.overdue_amount || 15000);
    setPaymentAmount(c.overdue_amount || 15000);
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    setPromiseDate(inThreeDays.toISOString().split('T')[0]);
    setEscalateReason('Borrower unresponsive across multiple channels. High delinquency risk.');
  };

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactionModalCase) return;

    const payload: any = {
      activity_type: interactionType,
      channel: interactionChannel,
      notes: interactionNotes || `Action ${interactionType} executed by officer.`
    };

    if (interactionType === 'PROMISE') {
      payload.promise_amount = promiseAmount;
      payload.promise_date = promiseDate ? new Date(promiseDate).toISOString() : undefined;
    } else if (interactionType === 'PAYMENT') {
      payload.payment_amount = paymentAmount;
      payload.payment_reference = `REC-${Date.now().toString().slice(-6)}`;
    } else if (interactionType === 'ESCALATE') {
      payload.escalation_reason = escalateReason;
    }

    actionMutation.mutate({
      id: interactionModalCase.collection_id,
      payload
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="finsight-card p-6 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900">
        <div className="flex flex-col lg:flex-row lg:lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
              <PiggyBank className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Collections Operations & Intelligence</h1>
                <Badge variant="positive">Multi-Head XGBoost</Badge>
                {isManager && <Badge variant="neutral">Manager Console</Badge>}
              </div>
              <p className="text-xs text-slate-700 font-semibold mt-1">
                Dynamic Recovery Prioritization, Probability of Payment Models, Ethical Tele-Recovery & Synchronized Ledger
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Overdue Portfolio
            </button>
            <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 text-xs">
              <span className="text-slate-600 font-medium">Logged Officer:</span>{' '}
              <strong className="text-teal-700 font-bold">{dashboardData?.officer?.name || user?.full_name || 'Officer'}</strong>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'queue'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Officer Work Queue ({rawCases.length})
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab('manager')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'manager'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Collections Manager Console
            </button>
          )}
          <button
            onClick={() => setActiveTab('communications')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'communications'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Customer Communication Center
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="finsight-card p-3.5 bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1">
            <span>Assigned Cases</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{kpis.assigned_cases}</div>
          <p className="text-[11px] text-slate-600 font-medium mt-0.5">Permitted queue</p>
        </div>

        <div className="finsight-card p-3.5 bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1">
            <span>Total Overdue AUM</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-700">{kpis.total_overdue_formatted}</div>
          <p className="text-[11px] text-amber-800 font-bold mt-0.5">Delinquent balances</p>
        </div>

        <div className="finsight-card p-3.5 bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1">
            <span>Contacted Today</span>
            <PhoneCall className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-extrabold text-teal-800">{kpis.contacted_today}</div>
          <p className="text-[11px] text-teal-800 font-bold mt-0.5">Outreach interactions</p>
        </div>

        <div className="finsight-card p-3.5 bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1">
            <span>Pending Promises</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-800">{kpis.promises_pending}</div>
          <p className="text-[11px] text-blue-800 font-bold mt-0.5">PTP commitments</p>
        </div>

        <div className="finsight-card p-3.5 bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1">
            <span>Recovered Month</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-800">{kpis.recovered_this_month_formatted}</div>
          <p className="text-[11px] text-emerald-800 font-bold mt-0.5">Cured & collected</p>
        </div>

        <div className="finsight-card p-3.5 bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1">
            <span>Escalated Cases</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-extrabold text-rose-700">{kpis.escalated_cases}</div>
          <p className="text-[11px] text-rose-800 font-bold mt-0.5">Manager review</p>
        </div>
      </div>

      {/* 3. TAB 1: OFFICER WORK QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search borrower, loan #, customer ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 w-64 font-medium"
                />
              </div>

              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold"
              >
                <option value="ALL">All Lifecycle Stages</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="COLLECTION_ASSIGNED">COLLECTION_ASSIGNED</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="PROMISE_TO_PAY">PROMISE_TO_PAY</option>
                <option value="PAYMENT_RECEIVED">PAYMENT_RECEIVED</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="ESCALATED">ESCALATED</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold"
              >
                <option value="ALL">All Priorities</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>

            <div className="text-xs text-slate-700 font-semibold">
              Showing <strong className="text-slate-900 font-bold">{filteredCases.length}</strong> of {rawCases.length} cases
            </div>
          </div>

          {/* Cases Data Table */}
          <div className="finsight-card bg-[#F0F7FF] border border-blue-200 overflow-hidden shadow-sm rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-[#E4F0FF] text-[11px] font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                    <th className="py-3.5 px-4 text-blue-950 font-bold">Borrower & Customer</th>
                    <th className="py-3.5 px-4 text-blue-950 font-bold">Loan Details</th>
                    <th className="py-3.5 px-4 text-blue-950 font-bold">Overdue & DPD</th>
                    <th className="py-3.5 px-4 text-blue-950 font-bold">Risk & ML P(Pay)</th>
                    <th className="py-3.5 px-4 text-blue-950 font-bold">Priority & Recommendation</th>
                    <th className="py-3.5 px-4 text-blue-950 font-bold">Stage & Next Action</th>
                    <th className="py-3.5 px-4 text-blue-950 font-bold">Assigned Officer</th>
                    <th className="py-3.5 px-4 text-right text-blue-950 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 text-xs">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-700 font-semibold">
                        <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        No collection cases matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c: any) => (
                      <tr key={c.collection_id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Borrower */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{c.customer?.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{c.customer?.customer_id}</span>
                            <span>•</span>
                            <span>{c.customer?.phone}</span>
                          </div>
                        </td>

                        {/* 2. Loan */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 font-mono">{c.loan?.loan_number}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {c.loan?.product_type} • ₹{(c.loan?.principal || 0).toLocaleString()}
                          </div>
                        </td>

                        {/* 3. Overdue & DPD */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-amber-700">₹{(c.overdue_amount || 0).toLocaleString()}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.dpd > 60 ? 'bg-rose-100 text-rose-700' :
                              c.dpd > 30 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              DPD {c.dpd}
                            </span>
                            <span className="text-[11px] text-slate-400">Bal: ₹{(c.outstanding || 0).toLocaleString()}</span>
                          </div>
                        </td>

                        {/* 4. Risk & ML Probability */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.risk === 'Critical' ? 'bg-rose-100 text-rose-700' :
                              c.risk === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {c.risk}
                            </span>
                            <span className="font-bold text-teal-700">{c.probability_of_payment_pct}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            P(Recovery): <strong className="text-slate-700">{c.recovery_probability_pct}</strong>
                          </div>
                        </td>

                        {/* 5. Priority & Recommended Action */}
                        <td className="py-3 px-4 max-w-xs">
                          <Badge variant={c.priority === 'HIGH' ? 'critical' : c.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                            {c.priority}
                          </Badge>
                          <div className="text-[11px] text-slate-600 line-clamp-2 mt-1" title={c.recommended_action}>
                            {c.recommended_action}
                          </div>
                        </td>

                        {/* 6. Stage & Next Action */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${
                            c.workflow_stage === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                            c.workflow_stage === 'ESCALATED' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                            c.workflow_stage === 'PROMISE_TO_PAY' ? 'bg-blue-100 text-blue-800' :
                            c.workflow_stage === 'CONTACTED' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {c.workflow_stage}
                          </span>
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-1" title={c.next_action}>
                            {c.next_action}
                          </div>
                        </td>

                        {/* 7. Assigned Officer */}
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {c.assigned_officer}
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => setActiveCaseId(c.collection_id)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                            title="View Case Dossier"
                          >
                            Dossier
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(c, 'CALL')}
                            className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 text-[11px] font-semibold transition-colors"
                            title="Log Call"
                          >
                            <Phone className="w-3.5 h-3.5 inline mr-0.5" /> Call
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(c, 'MESSAGE')}
                            className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors"
                            title="Send Message"
                          >
                            <MessageSquare className="w-3.5 h-3.5 inline mr-0.5" /> Message
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(c, 'PROMISE')}
                            className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition-colors"
                            title="Promise to Pay"
                          >
                            PTP
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(c, 'PAYMENT')}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold transition-colors"
                            title="Record Payment"
                          >
                            Pay
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: COLLECTIONS MANAGER CONSOLE */}
      {activeTab === 'manager' && (
        <div className="space-y-6">
          {/* DPD Buckets Grid */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              Delinquency Portfolio By DPD Buckets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(managerData?.dpd_buckets || []).map((b: any, idx: number) => (
                <div key={idx} className="finsight-card p-4 bg-white border-slate-200">
                  <div className="text-xs font-bold text-slate-600">{b.bucket}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    ₹{(b.amount || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Accounts: <strong>{b.count}</strong></span>
                    <span className="text-emerald-600 font-semibold">Cure: {b.cure_rate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Officer Workload & Reassignment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 finsight-card p-5 bg-white border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  Officer Workload & Recovery Performance
                </h3>
                <span className="text-xs text-slate-400">Team Governance</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                      <th className="py-2.5 px-3">Officer Name</th>
                      <th className="py-2.5 px-3">Assigned Cases</th>
                      <th className="py-2.5 px-3">Overdue Managed</th>
                      <th className="py-2.5 px-3">PTPs Tracked</th>
                      <th className="py-2.5 px-3">Resolved</th>
                      <th className="py-2.5 px-3">Escalated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(managerData?.officer_workload || []).map((w: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{w.officer_name}</td>
                        <td className="py-2.5 px-3">{w.assigned_cases}</td>
                        <td className="py-2.5 px-3 font-semibold text-amber-700">₹{(w.total_overdue || 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-blue-700 font-semibold">{w.promises_tracked}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-semibold">{w.resolved_count}</td>
                        <td className="py-2.5 px-3 text-rose-700 font-semibold">{w.escalated_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Regional Collection Performance */}
            <div className="finsight-card p-5 bg-white border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                Regional Recovery Efficiency
              </h3>
              <div className="space-y-3">
                {(managerData?.regional_performance || []).map((r: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-800">{r.region}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Overdue: ₹{r.overdue_cr} Cr • Rec: ₹{r.recovered_cr} Cr</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-teal-700">{r.efficiency}</div>
                      <Badge variant={r.risk_level === 'Low' ? 'positive' : r.risk_level === 'Moderate' ? 'warning' : 'critical'}>
                        {r.risk_level}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Escalated Queue in Manager View */}
          <div className="finsight-card p-5 bg-white border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  Escalated Cases Awaiting Manager Intervention
                </h3>
                <p className="text-xs text-slate-500">Failed promises, high DPD, or legal action required</p>
              </div>
              <Badge variant="critical">{(managerData?.escalated_cases || []).length} Cases</Badge>
            </div>

            <div className="divide-y divide-slate-100">
              {(managerData?.escalated_cases || []).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">No active escalations.</div>
              ) : (
                (managerData?.escalated_cases || []).map((ec: any) => (
                  <div key={ec.collection_id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{ec.customer?.name} ({ec.customer?.customer_id})</div>
                      <div className="text-[11px] text-rose-700 mt-0.5 font-medium">
                        Reason: {ec.escalation_reason || 'High delinquency default risk'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Loan: {ec.loan?.loan_number} • Overdue: ₹{(ec.overdue_amount || 0).toLocaleString()} • DPD: {ec.dpd} • Officer: {ec.assigned_officer}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReassignCase(ec)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
                      >
                        Reassign Officer
                      </button>
                      <button
                        onClick={() => handleOpenActionModal(ec, 'PAYMENT')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Settle & Recover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: CUSTOMER COMMUNICATION CENTER */}
      {activeTab === 'communications' && (
        <div className="space-y-6">
          {/* Customer Selection Bar */}
          <div className="finsight-card p-4 bg-white border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Borrower Communication Center & Multi-Channel History</h3>
                <p className="text-xs text-slate-500">
                  Consolidated chronological record of In-App Messages, Simulated SMS, Simulated Email, System Notices, and Staff Notes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Customer ID (e.g. CUST-NBFC-10294 or 1)..."
                value={commCustomerQuery}
                onChange={(e) => setCommCustomerQuery(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 w-64 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                onClick={() => {
                  if (commCustomerQuery) setActiveCommCustomerId(commCustomerQuery);
                }}
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
              >
                Inspect History
              </button>
            </div>
          </div>

          {/* Timeline of events */}
          <div className="finsight-card p-6 bg-white border-slate-200">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {commHistoryData?.customer_name || 'Borrower'} (ID: {activeCommCustomerId})
                </h4>
                <p className="text-xs text-slate-500">Total Recorded Events: {commHistoryData?.total_events || 0}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> In-App
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Simulated SMS
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Simulated Email
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Staff Note
                </span>
              </div>
            </div>

            {isCommLoading ? (
              <div className="text-center py-12 text-slate-400">Loading communication timeline...</div>
            ) : !commHistoryData?.events || commHistoryData?.events.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No communications found for this customer.
              </div>
            ) : (
              <div className="space-y-4">
                {commHistoryData.events.map((ev: any, idx: number) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="mt-1">
                      {ev.channel === 'SMS' || ev.channel === 'SIMULATED_SMS' ? (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                          <Smartphone className="w-4 h-4" />
                        </div>
                      ) : ev.channel === 'EMAIL' || ev.channel === 'SIMULATED_EMAIL' ? (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                          <Mail className="w-4 h-4" />
                        </div>
                      ) : ev.is_internal ? (
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{ev.subject}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                            {ev.channel}
                          </span>
                          {ev.is_simulated && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              SIMULATED
                            </span>
                          )}
                          {ev.is_internal && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              INTERNAL STAFF ONLY
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{ev.message}</p>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Sender: <strong className="text-slate-700">{ev.sender}</strong></span>
                        <span>Recipient: {ev.recipient}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL: CASE DOSSIER & ML INTELLIGENCE */}
      {activeCaseId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Collections Case Dossier: {activeCaseId}</h3>
                  <p className="text-xs text-slate-500">Comprehensive borrower profile, ML models, and repayment ledger</p>
                </div>
              </div>
              <button
                onClick={() => setActiveCaseId(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {isDetailsLoading ? (
                <div className="text-center py-12 text-slate-400">Loading intelligence dossier...</div>
              ) : (
                <>
                  {/* ML Intelligence Card */}
                  <div className="p-5 rounded-xl bg-gradient-to-br from-teal-950 to-slate-900 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping"></span>
                        <h4 className="font-bold text-sm text-teal-300">Collections Intelligence Agent ML Evaluation</h4>
                      </div>
                      <Badge variant="positive">Active Model</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                        <div className="text-slate-400">P(Payment 7d)</div>
                        <div className="text-xl font-bold text-teal-400 mt-1">
                          {((caseDetailsData?.ml_intelligence?.payment_probability_7d || 0.85) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                        <div className="text-slate-400">P(Default 90d)</div>
                        <div className="text-xl font-bold text-rose-400 mt-1">
                          {((caseDetailsData?.ml_intelligence?.default_probability || 0.15) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                        <div className="text-slate-400">Expected Recovery</div>
                        <div className="text-xl font-bold text-emerald-400 mt-1">
                          {((caseDetailsData?.ml_intelligence?.expected_recovery_pct || 0.80) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                        <div className="text-slate-400">Dynamic Priority</div>
                        <div className="text-xl font-bold text-amber-400 mt-1">
                          {caseDetailsData?.ml_intelligence?.priority || 'MEDIUM'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs">
                      <span className="text-slate-400">Ethical Strategy Recommendation:</span>{' '}
                      <strong className="text-white">
                        {caseDetailsData?.ml_intelligence?.strategy || 'Standard Tele-Outreach + Payment Link'}
                      </strong>
                    </div>
                  </div>

                  {/* Repayment Installment Schedule */}
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-3">Installment Repayment Schedule</h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3">Inst #</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3">EMI Amount</th>
                            <th className="py-2.5 px-3">Principal</th>
                            <th className="py-2.5 px-3">Interest</th>
                            <th className="py-2.5 px-3">Paid</th>
                            <th className="py-2.5 px-3">Outstanding</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(caseDetailsData?.repayment_schedule || []).map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-bold text-slate-700">#{r.installment_number}</td>
                              <td className="py-2 px-3">{r.due_date}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">₹{(r.amount || 0).toLocaleString()}</td>
                              <td className="py-2 px-3 text-slate-500">₹{(r.principal || 0).toLocaleString()}</td>
                              <td className="py-2 px-3 text-slate-500">₹{(r.interest || 0).toLocaleString()}</td>
                              <td className="py-2 px-3 text-emerald-700 font-semibold">₹{(r.paid || 0).toLocaleString()}</td>
                              <td className="py-2 px-3 text-amber-700 font-semibold">₹{(r.outstanding || 0).toLocaleString()}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  r.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                  r.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Promises to Pay History */}
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-3">Promise to Pay (PTP) History</h4>
                    <div className="space-y-2">
                      {(caseDetailsData?.promises || []).length === 0 ? (
                        <div className="text-xs text-slate-400 py-3">No promises registered.</div>
                      ) : (
                        (caseDetailsData?.promises || []).map((p: any) => (
                          <div key={p.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-slate-900">₹{(p.amount || 0).toLocaleString()} by {p.promise_date}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">Recorded by {p.recorded_by} • Note: {p.notes || 'None'}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'KEPT' ? 'bg-emerald-100 text-emerald-800' :
                              p.status === 'BROKEN' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: LOG ACTION (Call, Message, Promise, Payment, Escalate) */}
      {interactionModalCase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Execute Collection Action: {interactionType}
                </h3>
                <p className="text-xs text-slate-500">
                  Case: {interactionModalCase.collection_id} • Borrower: {interactionModalCase.customer?.name}
                </p>
              </div>
              <button
                onClick={() => setInteractionModalCase(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAction} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Action Type</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(['CALL', 'MESSAGE', 'PROMISE', 'PAYMENT', 'ESCALATE', 'NOTE'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setInteractionType(t)}
                      className={`py-1.5 rounded-lg font-semibold border transition-all ${
                        interactionType === t
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Selector for Message */}
              {interactionType === 'MESSAGE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Channel</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {(['SMS', 'EMAIL', 'IN_APP'] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setInteractionChannel(ch)}
                        className={`py-1.5 rounded-lg font-semibold border transition-all ${
                          interactionChannel === ch
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {ch === 'SMS' ? 'Simulated SMS' : ch === 'EMAIL' ? 'Simulated Email' : 'In-App Message'}
                      </button>
                    ))}
                  </div>
                  {interactionChannel !== 'IN_APP' && (
                    <p className="text-[11px] text-amber-600 mt-1 font-semibold">
                      * Demo Simulated Delivery: Dispatches through simulated NBFC gateway.
                    </p>
                  )}
                </div>
              )}

              {/* Promise Fields */}
              {interactionType === 'PROMISE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Promised Amount (₹)</label>
                    <input
                      type="number"
                      value={promiseAmount}
                      onChange={(e) => setPromiseAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Promise Date</label>
                    <input
                      type="date"
                      value={promiseDate}
                      onChange={(e) => setPromiseDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {/* Payment Fields */}
              {interactionType === 'PAYMENT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Collection Recovery Amount (₹)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold text-emerald-700"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Synchronizes directly with Loan outstanding, Repayment schedule, and Finance transactions ledger.
                  </p>
                </div>
              )}

              {/* Escalate Fields */}
              {interactionType === 'ESCALATE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Escalation Reason</label>
                  <textarea
                    rows={2}
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}

              {/* Notes / Message Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {interactionType === 'MESSAGE' ? 'Message Body' : 'Officer Notes / Summary'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    interactionType === 'MESSAGE' 
                      ? 'Dear borrower, this is a reminder regarding your overdue payment...' 
                      : 'Spoke with borrower, requested extension, agreed to partial payment...'
                  }
                  value={interactionNotes}
                  onChange={(e) => setInteractionNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInteractionModalCase(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {actionMutation.isPending ? 'Recording...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: REASSIGN CASE (MANAGER) */}
      {reassignCase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reassign Collection Case</h3>
                <p className="text-xs text-slate-500">Case {reassignCase.collection_id}</p>
              </div>
              <button
                onClick={() => setReassignCase(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500">Current Officer:</span>{' '}
                <strong className="text-slate-800">{reassignCase.assigned_officer}</strong>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">New Officer</label>
                <select
                  value={newOfficerName}
                  onChange={(e) => setNewOfficerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Rahul Sharma">Rahul Sharma (Collections Officer)</option>
                  <option value="Pooja Nair">Pooja Nair (Senior Recovery)</option>
                  <option value="Amit Desai">Amit Desai (Special Assets)</option>
                  <option value="Priya Patel">Priya Patel (Field Recovery)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Reassignment Notes</label>
                <textarea
                  rows={2}
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  placeholder="Reason for reassignment..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignCase(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reassignMutation.mutate({
                      collection_id: reassignCase.collection_id,
                      new_officer: newOfficerName,
                      notes: reassignNotes
                    });
                  }}
                  disabled={reassignMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {reassignMutation.isPending ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionsPage;
