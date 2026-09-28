import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  FileText,
  UserCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  ArrowRight,
  Shield,
  Layers,
  Send,
  Eye,
  Calendar,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  X,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const KYCPortalPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'cases' | 'review'>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Filters for Cases Queue
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [actionModal, setActionModal] = useState<string | null>(null); // 'VERIFY_KYC', 'REJECT_KYC', 'REQUEST_DOCUMENT', 'REQUEST_REPLACEMENT', 'ESCALATE'
  const [modalReason, setModalReason] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalDocType, setModalDocType] = useState('PAN_CARD');

  // Document verification modal state
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docActionType, setDocActionType] = useState<'VERIFY' | 'REJECT' | 'REQUEST_REPLACEMENT' | null>(null);
  const [docActionReason, setDocActionReason] = useState('');
  const [docActionNotes, setDocActionNotes] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch KYC Dashboard Metrics
  const { data: dashboardData, isLoading: dashLoading } = useQuery({
    queryKey: ['kyc-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/kyc/dashboard', { headers });
      if (!res.ok) throw new Error('Failed to load KYC Dashboard');
      return res.json();
    }
  });

  // 2. Fetch KYC Work Queue Cases
  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: ['kyc-cases', statusFilter, docTypeFilter, riskFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (docTypeFilter !== 'ALL') params.append('doc_type', docTypeFilter);
      if (riskFilter !== 'ALL') params.append('risk_level', riskFilter);

      const res = await fetch(`/api/kyc/cases?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to load KYC Cases');
      return res.json();
    }
  });

  // 3. Fetch KYC Review Details for Selected Case
  const { data: reviewData, isLoading: reviewLoading, refetch: refetchReview } = useQuery({
    queryKey: ['kyc-review', selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return null;
      const res = await fetch(`/api/kyc/review/${selectedCaseId}`, { headers });
      if (!res.ok) throw new Error('Failed to load KYC Review Detail');
      return res.json();
    },
    enabled: !!selectedCaseId
  });

  // 4. KYC Action Mutation (Case-level)
  const actionMutation = useMutation({
    mutationFn: async (payload: { action: string; reason?: string; notes?: string; doc_type?: string }) => {
      if (!selectedCaseId) throw new Error('No case selected');
      const res = await fetch(`/api/kyc/cases/${selectedCaseId}/action`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'KYC action failed');
      }
      return res.json();
    },
    onSuccess: (res) => {
      setFeedbackMsg({ type: 'success', text: res.message });
      setActionModal(null);
      setModalReason('');
      setModalNotes('');
      queryClient.invalidateQueries({ queryKey: ['kyc-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['kyc-cases'] });
      refetchReview();
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message });
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  });

  // 5. Document Verification Mutation
  const verifyDocMutation = useMutation({
    mutationFn: async (payload: { doc_id: string; action: string; reason?: string; notes?: string }) => {
      if (!selectedCaseId) throw new Error('No case selected');
      const res = await fetch(`/api/kyc/cases/${selectedCaseId}/verify-document`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Document verification failed');
      }
      return res.json();
    },
    onSuccess: (res) => {
      setFeedbackMsg({ type: 'success', text: res.message });
      setSelectedDoc(null);
      setDocActionType(null);
      setDocActionReason('');
      setDocActionNotes('');
      queryClient.invalidateQueries({ queryKey: ['kyc-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['kyc-cases'] });
      refetchReview();
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message });
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  });

  const cases = casesData?.cases || [];
  const filteredCases = cases.filter((c: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.customer_name?.toLowerCase().includes(q) ||
      c.case_id?.toLowerCase().includes(q) ||
      c.application_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="finsight-card p-6 bg-gradient-to-r from-[#071E22] via-[#0B132B] to-[#1D2D44] text-white border-teal-900/60 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white">KYC & Compliance Verification Desk</h1>
                <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Compliance RBAC
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Government Identity Verification, Anti-Money Laundering (AML) Screening & Document Auditing
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'cases'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Work Queue ({cases.length})
            </button>
            {selectedCaseId && (
              <button
                onClick={() => setActiveTab('review')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'review'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>Dossier: {selectedCaseId}</span>
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: KYC OFFICER DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Cases</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{dashboardData?.pending_kyc_cases ?? 0}</div>
              <p className="text-[11px] text-slate-500 mt-1">Awaiting compliance verification</p>
            </div>

            <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Cases</span>
                <UserCheck className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{dashboardData?.assigned_cases ?? 0}</div>
              <p className="text-[11px] text-slate-500 mt-1">Assigned to your desk</p>
            </div>

            <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified Cases</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">{dashboardData?.completed_cases ?? 0}</div>
              <p className="text-[11px] text-slate-500 mt-1">Completion rate: {dashboardData?.kyc_completion_rate ?? 0}%</p>
            </div>

            <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Docs Awaiting</span>
                <FileText className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{dashboardData?.documents_awaiting_verification ?? 0}</div>
              <p className="text-[11px] text-rose-500 mt-1">{dashboardData?.documents_requiring_replacement ?? 0} require replacement</p>
            </div>
          </div>

          {/* Quick Metrics & Pending Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Verification Performance */}
            <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Operational Velocity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">Avg Verification Turnaround</span>
                  <span className="text-xs font-bold text-slate-900">{dashboardData?.average_verification_time || '3.8 hours'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">High Priority Cases</span>
                  <span className="text-xs font-bold text-rose-600">{dashboardData?.high_priority_cases ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-600">Rejected Rate</span>
                  <span className="text-xs font-bold text-slate-900">{dashboardData?.rejected_cases ?? 0} cases</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('cases')}
                className="mt-4 w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 transition-colors flex items-center justify-center gap-2"
              >
                <span>Open Work Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pending Tasks */}
            <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Compliance Tasks ({dashboardData?.pending_tasks?.length || 0})
              </h3>
              <div className="space-y-2.5">
                {(!dashboardData?.pending_tasks || dashboardData.pending_tasks.length === 0) ? (
                  <div className="text-center py-6 text-xs text-slate-400">All compliance tasks completed</div>
                ) : (
                  dashboardData.pending_tasks.map((t: any) => (
                    <div key={t.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 truncate">{t.title}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {t.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Compliance Notifications */}
            <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                Live Desk Notifications
              </h3>
              <div className="space-y-2.5">
                {(!dashboardData?.notifications || dashboardData.notifications.length === 0) ? (
                  <div className="text-center py-6 text-xs text-slate-400">No unread notifications</div>
                ) : (
                  dashboardData.notifications.map((n: any) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 truncate">{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KYC WORK QUEUE (/kyc/cases) */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          {/* Queue Filters */}
          <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by customer name, case ID, or application..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-500"
                >
                  <option value="ALL">All KYC Statuses</option>
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="DOCUMENTS_PENDING">Documents Pending</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="ADDITIONAL_INFORMATION_REQUIRED">Info Required</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REJECTED">Rejected</option>
                </select>

                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-500"
                >
                  <option value="ALL">All Document Types</option>
                  <option value="PAN_CARD">PAN Card</option>
                  <option value="AADHAAR">Aadhaar</option>
                  <option value="BANK_STATEMENT">Bank Statement</option>
                  <option value="SALARY_SLIP">Salary Slip</option>
                  <option value="ITR">ITR</option>
                </select>

                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-500"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cases Table */}
          <div className="finsight-card bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Case ID</th>
                    <th className="py-3 px-4">Customer & Application</th>
                    <th className="py-3 px-4">KYC Status</th>
                    <th className="py-3 px-4">Doc Status</th>
                    <th className="py-3 px-4">Assigned Officer</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        No KYC cases match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c: any) => (
                      <tr key={c.case_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {c.case_id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{c.customer_name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span>{c.customer_id}</span>
                            {c.application_id && (
                              <>
                                <span>•</span>
                                <span className="text-teal-600 font-medium">{c.application_id}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.kyc_status === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.kyc_status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : c.kyc_status === 'ADDITIONAL_INFORMATION_REQUIRED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {c.kyc_status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              c.document_status === 'ALL_VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : c.document_status === 'REPLACEMENT_REQUIRED'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.document_status?.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {c.verified_documents}/{c.total_documents} verified
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{c.assigned_officer}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              c.risk_level === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800'
                                : c.risk_level === 'HIGH'
                                ? 'bg-orange-100 text-orange-800'
                                : c.risk_level === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.risk_level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{c.last_updated}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedCaseId(c.case_id);
                              setActiveTab('review');
                            }}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded text-xs transition-colors"
                          >
                            Review
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

      {/* TAB 3: DETAILED KYC REVIEW SCREEN */}
      {activeTab === 'review' && selectedCaseId && (
        <div className="space-y-6">
          {reviewLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading complete compliance dossier...</div>
          ) : !reviewData ? (
            <div className="p-12 text-center text-xs text-rose-500">Case details not found</div>
          ) : (
            <div className="space-y-6">
              {/* Header Profile Card */}
              <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-bold text-slate-900">
                        {reviewData.customer.first_name} {reviewData.customer.last_name}
                      </h2>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          reviewData.kyc_status === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : reviewData.kyc_status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        KYC: {reviewData.kyc_status?.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Risk: {reviewData.risk_level}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-4">
                      <span>ID: {reviewData.customer.customer_id}</span>
                      <span>Case: {reviewData.case_id}</span>
                      <span>Income: ₹{reviewData.customer.income?.toLocaleString('en-IN')}/mo</span>
                      <span>Credit Score: {reviewData.customer.credit_score}</span>
                      <span>Location: {reviewData.customer.location}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActionModal('VERIFY_KYC')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify KYC</span>
                    </button>
                    <button
                      onClick={() => setActionModal('REQUEST_DOCUMENT')}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Doc</span>
                    </button>
                    <button
                      onClick={() => setActionModal('ESCALATE')}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Escalate</span>
                    </button>
                    <button
                      onClick={() => setActionModal('REJECT_KYC')}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject KYC</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Grid */}
              <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-teal-600" />
                    Uploaded Verification Documents ({reviewData.documents?.length || 0})
                  </h3>
                  <button
                    onClick={() => setActionModal('REQUEST_DOCUMENT')}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
                  >
                    + Request Additional Document
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {reviewData.documents?.map((doc: any) => (
                    <div
                      key={doc.doc_id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-slate-900">{doc.document_type || doc.doc_type}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              doc.status === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : doc.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : doc.status === 'REPLACEMENT_REQUIRED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <p>File: <span className="font-mono text-slate-700">{doc.file_name}</span></p>
                          <p>Uploaded: {doc.uploaded_at}</p>
                          {doc.verified_by && <p>Verified By: {doc.verified_by}</p>}
                          {doc.rejection_reason && (
                            <p className="text-rose-600 font-medium">Rejection Reason: {doc.rejection_reason}</p>
                          )}
                          {doc.replacement_reason && (
                            <p className="text-amber-600 font-medium">Replacement: {doc.replacement_reason}</p>
                          )}
                        </div>
                      </div>

                      {/* Document Actions */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedDoc(doc);
                            setDocActionType('VERIFY');
                          }}
                          className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDoc(doc);
                            setDocActionType('REQUEST_REPLACEMENT');
                          }}
                          className="text-[11px] font-bold text-amber-600 hover:text-amber-700"
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDoc(doc);
                            setDocActionType('REJECT');
                          }}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Portfolio Data: Loans, Fraud Alerts, History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Loans & Prior Applications */}
                <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Existing Loans & Credit Engagements
                  </h4>
                  {(!reviewData.existing_loans || reviewData.existing_loans.length === 0) ? (
                    <p className="text-xs text-slate-400">No active loans with NBFC.</p>
                  ) : (
                    reviewData.existing_loans.map((l: any) => (
                      <div key={l.loan_id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{l.loan_id}</span>
                          <span className="text-[11px] text-slate-500 block">{l.product_type}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">₹{l.amount?.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-emerald-600 block">{l.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Fraud Screening Alerts */}
                <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Connected Fraud Forensics Alerts
                  </h4>
                  {(!reviewData.fraud_alerts || reviewData.fraud_alerts.length === 0) ? (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Zero active fraud collisions detected for this profile.</span>
                    </div>
                  ) : (
                    reviewData.fraud_alerts.map((fa: any) => (
                      <div key={fa.alert_id} className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-rose-800">{fa.type}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
                            {fa.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-700">{fa.rule_triggered}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: KYC Case Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Confirm KYC Action: {actionModal.replace('_', ' ')}</span>
              </h3>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionModal === 'REQUEST_DOCUMENT' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Document Required</label>
                <select
                  value={modalDocType}
                  onChange={(e) => setModalDocType(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="PAN_CARD">PAN Card</option>
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="BANK_STATEMENT">Bank Statement</option>
                  <option value="SALARY_SLIP">Salary Slip</option>
                  <option value="ITR">Income Tax Return</option>
                  <option value="UTILITY_BILL">Utility Bill</option>
                </select>
              </div>
            )}

            {(actionModal === 'REJECT_KYC' || actionModal === 'ESCALATE' || actionModal === 'REQUEST_DOCUMENT') && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="State the explicit justification for compliance audit records..."
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Supporting Officer Notes</label>
              <textarea
                rows={2}
                placeholder="Optional verification observations..."
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  actionMutation.mutate({
                    action: actionModal,
                    reason: modalReason,
                    notes: modalNotes,
                    doc_type: modalDocType
                  });
                }}
                disabled={actionMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {actionMutation.isPending ? 'Processing...' : 'Execute Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Document Verification Modal */}
      {selectedDoc && docActionType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {docActionType === 'VERIFY' ? 'Verify Document' : docActionType === 'REJECT' ? 'Reject Document' : 'Request Replacement'}
              </h3>
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setDocActionType(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Document: <span className="font-bold text-slate-900">{selectedDoc.document_type || selectedDoc.doc_type}</span> ({selectedDoc.file_name})
            </p>

            {(docActionType === 'REJECT' || docActionType === 'REQUEST_REPLACEMENT') && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder={docActionType === 'REJECT' ? 'Specify why this document is rejected...' : 'Explain why replacement is needed (e.g., blurry image, expired)...'}
                  value={docActionReason}
                  onChange={(e) => setDocActionReason(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Officer Notes</label>
              <textarea
                rows={2}
                placeholder="Optional notes for audit logs..."
                value={docActionNotes}
                onChange={(e) => setDocActionNotes(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setDocActionType(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  verifyDocMutation.mutate({
                    doc_id: selectedDoc.doc_id,
                    action: docActionType,
                    reason: docActionReason,
                    notes: docActionNotes
                  });
                }}
                disabled={verifyDocMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {verifyDocMutation.isPending ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
