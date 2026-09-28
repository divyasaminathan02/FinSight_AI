import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Fingerprint,
  Smartphone,
  AlertTriangle,
  Network,
  Search,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Layers,
  Clock,
  RotateCcw,
  XCircle,
  Eye,
  Plus,
  ArrowRight,
  User,
  X
} from 'lucide-react';
import { fraudApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';

export const FraudIntelligencePage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('finsight_token') || localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'cases' | 'forensics' | 'network'>('dashboard');

  // Case Queue state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Action Modal State
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Forensic simulator state
  const [targetCustomerId, setTargetCustomerId] = useState(1);
  const [customDevice, setCustomDevice] = useState('DEV-SHR-FINGERPRINT-8492');
  const [customVelocity, setCustomVelocity] = useState(4);
  const [customAmount, setCustomAmount] = useState(450000);

  // 1. Fraud Dashboard Query
  const { data: dashboardData, isLoading: dashLoading } = useQuery({
    queryKey: ['fraud-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/fraud/dashboard', { headers });
      if (!res.ok) throw new Error('Failed to load Fraud Dashboard');
      return res.json();
    }
  });

  // 2. Fraud Cases Queue Query
  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: ['fraud-cases', statusFilter, severityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);

      const res = await fetch(`/api/fraud/cases?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to load Fraud Cases');
      return res.json();
    }
  });

  // 3. Fraud Case Detail Query
  const { data: caseDetail, isLoading: caseDetailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ['fraud-case-detail', selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return null;
      const res = await fetch(`/api/fraud/cases/${selectedCaseId}`, { headers });
      if (!res.ok) throw new Error('Failed to load Fraud Case details');
      return res.json();
    },
    enabled: !!selectedCaseId
  });

  // 4. Alerts Query
  const { data: alerts } = useQuery({
    queryKey: ['fraud-alerts'],
    queryFn: fraudApi.getAlerts,
  });

  // 5. Network Forensics Query
  const { data: networkData, isLoading: isNetworkLoading } = useQuery({
    queryKey: ['fraud-network', targetCustomerId],
    queryFn: () => fraudApi.getNetwork(targetCustomerId),
  });

  // 6. Simulator Mutation
  const analyzeMutation = useMutation({
    mutationFn: fraudApi.analyze,
  });

  // 7. Case Action Mutation
  const actionMutation = useMutation({
    mutationFn: async (payload: { action: string; reason?: string; notes?: string }) => {
      if (!selectedCaseId) throw new Error('No case selected');
      const res = await fetch(`/api/fraud/cases/${selectedCaseId}/action`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Fraud action execution failed');
      }
      return res.json();
    },
    onSuccess: (res) => {
      setFeedbackMsg({ type: 'success', text: res.message });
      setActionType(null);
      setActionReason('');
      setActionNotes('');
      queryClient.invalidateQueries({ queryKey: ['fraud-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['fraud-cases'] });
      refetchDetail();
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message });
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  });

  const handleRunAnalysis = () => {
    analyzeMutation.mutate({
      customer_id: targetCustomerId,
      device_id: customDevice,
      requested_amount: customAmount,
      application_velocity: customVelocity,
      income: 45000,
    });
  };

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
      <div className="p-6 bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20 text-white">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Fraud Forensics & Investigation Desk</h1>
                <Badge variant="elevated" pulse>
                  Isolation Forest ML
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Multi-entity graph collisions, device/IP clustering, velocity surge detection, and syndicate audits
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'cases'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Investigation Queue ({cases.length})
            </button>
            <button
              onClick={() => setActiveTab('forensics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'forensics'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Forensics Sandbox
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'network'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Entity Graph
            </button>
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

      {/* TAB 1: FRAUD OFFICER DASHBOARD (/fraud/dashboard) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pending Cases</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{dashboardData?.pending_fraud_cases ?? 0}</div>
              <span className="text-[11px] text-amber-600 font-medium">Under active investigation</span>
            </div>

            <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">High-Risk Apps</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">{dashboardData?.high_risk_applications ?? 0}</div>
              <span className="text-[11px] text-slate-500 font-medium">Score &gt;= 70.0</span>
            </div>

            <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Alerts</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{dashboardData?.fraud_alerts ?? 0}</div>
              <span className="text-[11px] text-rose-500 font-medium">Syndicate & collision alerts</span>
            </div>

            <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Confirmed Fraud</span>
              <div className="text-2xl font-bold text-rose-700 mt-1">{dashboardData?.confirmed_fraud ?? 0}</div>
              <span className="text-[11px] text-slate-500 font-medium">Flagged & blocked</span>
            </div>

            <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cleared Cases</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{dashboardData?.cleared_cases ?? 0}</div>
              <span className="text-[11px] text-emerald-600 font-medium">Verified bona fide</span>
            </div>
          </div>

          {/* Forensic Indicator Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium block">Suspicious Transactions</span>
              <span className="text-lg font-bold text-slate-800 mt-0.5 block">{dashboardData?.suspicious_transactions ?? 0}</span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium block">Duplicate Identity Alerts</span>
              <span className="text-lg font-bold text-slate-800 mt-0.5 block">{dashboardData?.duplicate_identity_indicators ?? 0}</span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium block">Device / IP Anomalies</span>
              <span className="text-lg font-bold text-slate-800 mt-0.5 block">{dashboardData?.device_ip_anomalies ?? 0}</span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium block">Velocity Surge Alerts</span>
              <span className="text-lg font-bold text-slate-800 mt-0.5 block">{dashboardData?.velocity_alerts ?? 0}</span>
            </div>
          </div>

          {/* Active Alerts List */}
          <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-600" />
                Live Real-Time Fraud & Anomaly Alerts ({alerts?.total_alerts || 0})
              </h3>
              <button
                onClick={() => setActiveTab('cases')}
                className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
              >
                View Investigation Queue &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {alerts?.alerts?.map((a: any) => (
                <div key={a.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{a.type}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          a.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : a.severity === 'HIGH'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{a.rule_triggered}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-800 block">{a.exposure_formatted}</span>
                    <span className="text-[10px] text-slate-400">{a.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FRAUD CASE MANAGEMENT (/fraud/cases) */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search cases by customer, case ID, or application..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="UNDER_INVESTIGATION">Under Investigation</option>
                <option value="ADDITIONAL_INFORMATION_REQUIRED">Info Required</option>
                <option value="CLEARED">Cleared</option>
                <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
                <option value="ESCALATED">Escalated</option>
                <option value="CLOSED">Closed</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
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
                    <th className="py-3 px-4">Risk Score</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Officer</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        No fraud cases match filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c: any) => (
                      <tr key={c.case_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.case_id}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{c.customer_name}</div>
                          <span className="text-[11px] text-slate-500">{c.application_id || c.customer_id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">{c.risk_score}</span>
                          <span className="text-[10px] text-slate-400">/100</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800'
                                : c.severity === 'HIGH'
                                ? 'bg-orange-100 text-orange-800'
                                : c.severity === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {c.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{c.assigned_officer}</td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">{c.created_date}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedCaseId(c.case_id)}
                            className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded text-xs transition-colors"
                          >
                            Inspect
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

      {/* TAB 3: FORENSIC SANDBOX */}
      {activeTab === 'forensics' && (
        <div className="space-y-6">
          <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Isolation Forest Live Scoring</h3>
            <p className="text-xs text-slate-500 mb-4">
              Simulate loan application attributes to evaluate multi-factor fraud anomaly scoring.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Target Customer ID</label>
                <input
                  type="number"
                  value={targetCustomerId}
                  onChange={(e) => setTargetCustomerId(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Device Hardware Hash</label>
                <input
                  type="text"
                  value={customDevice}
                  onChange={(e) => setCustomDevice(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Application Velocity (7 Days)</label>
                <input
                  type="number"
                  value={customVelocity}
                  onChange={(e) => setCustomVelocity(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Requested Amount (₹)</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={analyzeMutation.isPending}
              className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              {analyzeMutation.isPending ? 'Scoring...' : 'Run Forensic Anomaly Evaluation'}
            </button>

            {analyzeMutation.data && (
              <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Fraud Score Result:</span>
                  <span className="text-base font-bold text-orange-600">
                    {analyzeMutation.data.fraud_risk_score} / 100 ({analyzeMutation.data.risk_category})
                  </span>
                </div>
                <p className="text-slate-600">{analyzeMutation.data.model_explanation}</p>
                <p className="font-semibold text-slate-800">
                  Recommended Action: {analyzeMutation.data.recommended_action}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ENTITY NETWORK GRAPH */}
      {activeTab === 'network' && (
        <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Network className="w-4 h-4 text-orange-600" />
            NetworkX Multi-Entity Collision Graph
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Audits shared device fingerprints, phone collisions, and shared geographical postal coordinates.
          </p>
          <div className="p-8 bg-slate-900 rounded-xl text-center text-white space-y-3">
            <Fingerprint className="w-12 h-12 text-orange-400 mx-auto animate-pulse" />
            <div className="text-xs font-mono text-slate-300">
              Active Graph Nodes: {networkData?.nodes?.length || 18} | Connected Edges: {networkData?.links?.length || 24}
            </div>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Automated topological traversals flag synthetic identity clusters and multi-account hardware collisions in real time.
            </p>
          </div>
        </div>
      )}

      {/* CASE INSPECTION MODAL */}
      {selectedCaseId && caseDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-600" />
                  <span>Fraud Investigation: {caseDetail.case_id}</span>
                </h3>
                <span className="text-[11px] text-slate-500">Customer: {caseDetail.customer?.name} ({caseDetail.customer?.customer_id})</span>
              </div>
              <button onClick={() => setSelectedCaseId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score & Category */}
            <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800">Fraud Anomaly Score</span>
                <div className="text-2xl font-bold text-orange-700 mt-0.5">{caseDetail.fraud_risk_score} / 100</div>
                <span className="text-xs font-semibold text-orange-800">Severity: {caseDetail.severity}</span>
              </div>
              <div className="text-right max-w-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recommended Action</span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{caseDetail.recommended_action}</p>
                <p className="text-[11px] text-slate-500 mt-1">{caseDetail.model_explanation}</p>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-700 block mb-2">Execute Investigation Decision:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActionType('CLEAR_CASE')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Clear Case
                </button>
                <button
                  onClick={() => setActionType('REQUEST_INFORMATION')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Request Info
                </button>
                <button
                  onClick={() => setActionType('ESCALATE_CASE')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Escalate Case
                </button>
                <button
                  onClick={() => setActionType('CONFIRM_FRAUD')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Confirm Fraud
                </button>
                <button
                  onClick={() => setActionType('CLOSE_CASE')}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Close Case
                </button>
              </div>
            </div>

            {/* Reason / Notes Input if Action Selected */}
            {actionType && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Confirm Decision: {actionType.replace('_', ' ')}
                </span>
                {(actionType === 'CONFIRM_FRAUD' || actionType === 'ESCALATE_CASE') && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Mandatory Reason <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="State explicit evidence / justification for the audit trail..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Optional investigation notes..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setActionType(null)} className="px-3 py-1.5 text-xs text-slate-600">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      actionMutation.mutate({
                        action: actionType,
                        reason: actionReason,
                        notes: actionNotes
                      });
                    }}
                    disabled={actionMutation.isPending}
                    className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg"
                  >
                    {actionMutation.isPending ? 'Executing...' : 'Submit Decision'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
