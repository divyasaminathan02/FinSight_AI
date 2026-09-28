import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Activity, ShieldAlert, Sliders, TrendingUp, AlertTriangle, 
  Layers, MapPin, PieChart as PieIcon, RefreshCw, CheckCircle,
  FileText, User, ArrowRight, ShieldCheck, XCircle, Clock, Search, X
} from 'lucide-react';
import { riskApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { RiskTrendChart } from '../components/dashboard/RiskTrendChart';
import { useAuth } from '../context/AuthContext';

export const RiskIntelligencePage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const [activeTab, setActiveTab] = useState<'macro' | 'analyst_queue' | 'assessment'>('macro');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Queue state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Analyst Action Modal state
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Configurable policy weights
  const [weights, setWeights] = useState({
    w_credit: 0.35,
    w_delinquency: 0.25,
    w_fraud: 0.15,
    w_liquidity: 0.15,
    w_concentration: 0.10,
  });

  const [activeWeights, setActiveWeights] = useState(weights);

  // Fetch macro portfolio risk
  const { data: portfolioRisk, isLoading: isRiskLoading, refetch: refetchPortfolio } = useQuery({
    queryKey: ['risk-portfolio', activeWeights],
    queryFn: () => riskApi.getPortfolio(activeWeights),
  });

  // Fetch emerging risk signals
  const { data: signalsData, isLoading: isSignalsLoading } = useQuery({
    queryKey: ['risk-signals'],
    queryFn: () => riskApi.getSignals(),
  });

  // Fetch 30-day historical trend
  const { data: trendData } = useQuery({
    queryKey: ['risk-trends'],
    queryFn: () => riskApi.getTrends(),
  });

  // Fetch Risk Analyst Dashboard (/risk/dashboard)
  const { data: analystDash } = useQuery({
    queryKey: ['risk-analyst-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/risk/dashboard', { headers });
      if (!res.ok) throw new Error('Failed to load Risk Analyst Dashboard');
      return res.json();
    }
  });

  // Fetch Risk Work Queue (/risk/cases)
  const { data: casesData } = useQuery({
    queryKey: ['risk-cases', statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (categoryFilter !== 'ALL') params.append('risk_category', categoryFilter);

      const res = await fetch(`/api/risk/cases?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to load Risk Cases');
      return res.json();
    }
  });

  // Fetch Application Risk Assessment (/risk/assessment/{app_id})
  const { data: assessmentData, isLoading: isAssessmentLoading, refetch: refetchAssessment } = useQuery({
    queryKey: ['risk-assessment', selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return null;
      const res = await fetch(`/api/risk/assessment/${selectedAppId}`, { headers });
      if (!res.ok) throw new Error('Failed to load Risk Assessment');
      return res.json();
    },
    enabled: !!selectedAppId
  });

  // Analyst Action Mutation
  const actionMutation = useMutation({
    mutationFn: async (payload: { action: string; reason?: string; notes?: string }) => {
      if (!selectedAppId) throw new Error('No application selected');
      const res = await fetch(`/api/risk/assessment/${selectedAppId}/action`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Risk Analyst action failed');
      }
      return res.json();
    },
    onSuccess: (res) => {
      setFeedbackMsg({ type: 'success', text: res.message });
      setActionType(null);
      setActionReason('');
      setActionNotes('');
      queryClient.invalidateQueries({ queryKey: ['risk-analyst-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['risk-cases'] });
      refetchAssessment();
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message });
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  });

  const handleApplyPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveWeights({ ...weights });
  };

  const resetDefaultWeights = () => {
    const defaults = {
      w_credit: 0.35,
      w_delinquency: 0.25,
      w_fraud: 0.15,
      w_liquidity: 0.15,
      w_concentration: 0.10,
    };
    setWeights(defaults);
    setActiveWeights(defaults);
  };

  const cases = casesData?.cases || [];
  const filteredCases = cases.filter((c: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.customer_name?.toLowerCase().includes(q) ||
      c.application_id?.toLowerCase().includes(q) ||
      c.customer_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="finsight-card p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-[#0B132B] text-white border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Risk Intelligence & Portfolio Review</h1>
                <Badge variant={portfolioRisk?.risk_category === 'LOW' ? 'positive' : portfolioRisk?.risk_category === 'MODERATE' ? 'warning' : 'critical'}>
                  Risk Tier: {portfolioRisk?.risk_category || 'MODERATE'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Macro Portfolio Risk, HHI Concentration Indices, Underwriting Risk Assessment & Multi-Agent Signals
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('macro')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'macro'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Macro Risk & HHI
            </button>
            <button
              onClick={() => setActiveTab('analyst_queue')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'analyst_queue'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Analyst Queue ({cases.length})
            </button>
            {selectedAppId && (
              <button
                onClick={() => setActiveTab('assessment')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'assessment'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>Assessment: {selectedAppId}</span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
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
            {feedbackMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: MACRO RISK & HHI */}
      {activeTab === 'macro' && (
        <div className="space-y-6">
          {/* KPI Concentration & Pillar Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="finsight-card p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Product HHI Index</span>
                <PieIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">
                {portfolioRisk?.concentration?.product_hhi || 0.28}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {portfolioRisk?.concentration?.product_status || 'Concentrated'}
              </div>
            </div>

            <div className="finsight-card p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Geographic HHI</span>
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">
                {portfolioRisk?.concentration?.geographic_hhi || 1012.2}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                {portfolioRisk?.concentration?.geographic_status || 'Moderately Concentrated'}
              </div>
            </div>

            <div className="finsight-card p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Expected Loss</span>
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">
                {analystDash?.expected_loss_indicators?.expected_loss_formatted || '₹14.2 Lakhs'}
              </div>
              <div className="text-[11px] text-amber-600 mt-1">
                Avg PD: {analystDash?.default_risk_indicators?.average_pd_pct || '3.2%'}
              </div>
            </div>

            <div className="finsight-card p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Active Risk Signals</span>
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">
                {signalsData?.total_signals || 3} Detected
              </div>
              <div className="text-[11px] text-rose-600 mt-1">
                Continuous Multi-Agent Sync
              </div>
            </div>
          </div>

          {/* Historical Trend Chart */}
          <RiskTrendChart data={trendData?.series || []} />
        </div>
      )}

      {/* TAB 2: RISK ANALYST QUEUE */}
      {activeTab === 'analyst_queue' && (
        <div className="space-y-4">
          {/* Queue Filters */}
          <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by customer name, application ID, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
              >
                <option value="ALL">All Risk Tiers</option>
                <option value="LOW">Low</option>
                <option value="MODERATE">Moderate</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
              >
                <option value="ALL">All Application Statuses</option>
                <option value="Under_Review">Under Review</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="finsight-card bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Application</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Requested</th>
                    <th className="py-3 px-4">LTI / DTI</th>
                    <th className="py-3 px-4">Risk Category</th>
                    <th className="py-3 px-4">AI Rec</th>
                    <th className="py-3 px-4">Analyst Rec</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400">
                        No applications match filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c: any) => (
                      <tr key={c.application_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.application_id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{c.customer_name}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">₹{c.requested_amount?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {c.lti_ratio}x / {(c.dti_ratio * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.risk_category === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800'
                                : c.risk_category === 'HIGH'
                                ? 'bg-orange-100 text-orange-800'
                                : c.risk_category === 'MODERATE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.risk_category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-indigo-700">{c.ai_recommendation}</td>
                        <td className="py-3 px-4 text-slate-500">{c.analyst_recommendation || 'Pending'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedAppId(c.application_id);
                              setActiveTab('assessment');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-xs transition-colors"
                          >
                            Assess Risk
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

      {/* TAB 3: APPLICATION RISK ASSESSMENT */}
      {activeTab === 'assessment' && selectedAppId && (
        <div className="space-y-6">
          {isAssessmentLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">Calculating multi-agent risk assessment...</div>
          ) : !assessmentData ? (
            <div className="p-12 text-center text-xs text-rose-500">Assessment not found.</div>
          ) : (
            <div className="space-y-6">
              {/* Header Dossier */}
              <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-bold text-slate-900">
                        Risk Appraisal: {assessmentData.application_id}
                      </h2>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        Tier: {assessmentData.risk_category}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Score: {assessmentData.overall_risk_score} / 100
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Customer: {assessmentData.customer?.name} ({assessmentData.customer?.customer_id}) • Monthly Income: ₹{assessmentData.customer?.monthly_income?.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Analyst Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActionType('APPROVE_RISK')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      Approve Risk
                    </button>
                    <button
                      onClick={() => setActionType('REQUEST_INFORMATION')}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      Request Info
                    </button>
                    <button
                      onClick={() => setActionType('ESCALATE')}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      Escalate to Manager
                    </button>
                    <button
                      onClick={() => setActionType('RECOMMEND_REJECTION')}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      Recommend Rejection
                    </button>
                  </div>
                </div>
              </div>

              {/* Ratios & Exposures Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 block">Requested Amount</span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    ₹{assessmentData.requested_amount?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-400">Tenure: {assessmentData.requested_tenure}m</span>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 block">AI Recommended Limit</span>
                  <span className="text-xl font-bold text-emerald-600 mt-0.5 block">
                    ₹{assessmentData.recommended_amount?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-emerald-600">Max Affordability Cap</span>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 block">Loan-to-Income (LTI)</span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {assessmentData.loan_to_income_ratio}x
                  </span>
                  <span className="text-[11px] text-slate-500">Benchmark: &lt; 3.0x</span>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 block">Debt-to-Income (DTI)</span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {(assessmentData.debt_to_income_ratio * 100).toFixed(0)}%
                  </span>
                  <span className="text-[11px] text-slate-500">Benchmark: &lt; 50%</span>
                </div>
              </div>

              {/* Multi-Component Risk Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Credit Risk Pillar</h4>
                  <div className="text-xl font-bold text-slate-900">
                    CIBIL {assessmentData.credit_risk?.score} ({assessmentData.credit_risk?.level})
                  </div>
                  <p className="text-xs text-slate-500">
                    Default Probability (PD): {(assessmentData.credit_risk?.probability_of_default * 100).toFixed(2)}%
                  </p>
                </div>

                <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Fraud Anomaly Pillar</h4>
                  <div className="text-xl font-bold text-slate-900">
                    Score {assessmentData.fraud_risk?.score} ({assessmentData.fraud_risk?.level})
                  </div>
                  <p className="text-xs text-slate-500">
                    Active Collisions / Alerts: {assessmentData.fraud_risk?.active_alerts}
                  </p>
                </div>

                <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Exposure & Concentration</h4>
                  <div className="text-xl font-bold text-slate-900">
                    {assessmentData.exposure_pct}% Portfolio Share
                  </div>
                  <p className="text-xs text-slate-500">
                    Prerequisites: KYC {assessmentData.workflow_status?.kyc_status} • Fraud {assessmentData.workflow_status?.fraud_status}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTION MODAL */}
      {actionType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Confirm Action: {actionType.replace('_', ' ')}</span>
              </h3>
              <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {(actionType === 'RECOMMEND_REJECTION' || actionType === 'ESCALATE') && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Specify clear risk rationale for audit records..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Analyst Observations / Notes</label>
              <textarea
                rows={2}
                placeholder="Optional risk notes..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setActionType(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {actionMutation.isPending ? 'Recording...' : 'Commit Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
