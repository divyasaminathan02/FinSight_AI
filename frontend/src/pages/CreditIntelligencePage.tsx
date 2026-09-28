import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Search,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  BarChart2,
  Info,
  Clock,
  Shield,
  FileText,
  User,
  Activity,
  Layers,
  Send,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  X
} from 'lucide-react';
import { customersApi, creditApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';

export const CreditIntelligencePage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const [activeTab, setActiveTab] = useState<'assessment' | 'simulator'>('assessment');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<string | null>(null); // 'APPROVE_FOR_MANAGER', 'REQUEST_INFORMATION', etc.
  const [actionNotes, setActionNotes] = useState('');
  const [recAmount, setRecAmount] = useState<number>(0);
  const [recTenure, setRecTenure] = useState<number>(36);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Credit Analyst Dashboard (/credit/dashboard)
  const { data: analystDash, isLoading: dashLoading } = useQuery({
    queryKey: ['credit-analyst-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/credit/dashboard', { headers });
      if (!res.ok) throw new Error('Failed to load analyst dashboard');
      return res.json();
    }
  });

  // 2. Fetch Credit Review Dossier for Selected App
  const { data: dossier, isLoading: dossierLoading, refetch: refetchDossier } = useQuery({
    queryKey: ['credit-review-dossier', selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return null;
      const res = await fetch(`/api/credit/review/${selectedAppId}`, { headers });
      if (!res.ok) throw new Error('Failed to load review dossier');
      return res.json();
    },
    enabled: !!selectedAppId
  });

  // 3. Trigger Real-time AI Evaluation
  const runAiEvalMutation = useMutation({
    mutationFn: async (appId: string) => {
      const res = await fetch(`/api/credit/review/${appId}/ai-evaluate`, {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error('AI credit evaluation failed');
      return res.json();
    },
    onSuccess: (data) => {
      setFeedbackMsg({
        type: 'success',
        text: `AI Credit Evaluation Complete: Recommendation '${data.approval_recommendation}' (Score: ${data.credit_score})`
      });
      refetchDossier();
      queryClient.invalidateQueries({ queryKey: ['credit-analyst-dashboard'] });
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  });

  // 4. Submit Credit Analyst Action
  const analystActionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/credit/review/${payload.appId}/analyst-action`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to submit analyst action');
      return res.json();
    },
    onSuccess: (data) => {
      setFeedbackMsg({
        type: 'success',
        text: `Analyst Action '${data.message}' submitted. Application moved to ${data.current_status}.`
      });
      setActionModal(null);
      setSelectedAppId(null);
      setActionNotes('');
      queryClient.invalidateQueries({ queryKey: ['credit-analyst-dashboard'] });
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  });

  // Simulator state
  const [simIncome, setSimIncome] = useState(75000);
  const [simCreditScore, setSimCreditScore] = useState(740);
  const [simLoanAmount, setSimLoanAmount] = useState(500000);
  const [simTenure, setSimTenure] = useState(36);
  const [simTotalEmi, setSimTotalEmi] = useState(12000);
  const [simEmployment, setSimEmployment] = useState('Salaried');
  const [simUtilization, setSimUtilization] = useState(0.28);
  const [simDpd, setSimDpd] = useState(0);

  const { data: metrics } = useQuery({
    queryKey: ['credit-metrics'],
    queryFn: creditApi.getMetrics,
  });

  const evalMutation = useMutation({
    mutationFn: creditApi.evaluate,
  });

  useEffect(() => {
    evalMutation.mutate({
      income: simIncome,
      credit_score: simCreditScore,
      loan_amount: simLoanAmount,
      tenure: simTenure,
      total_emi: simTotalEmi,
      employment_type: simEmployment,
      credit_utilization: simUtilization,
      previous_dpd: simDpd,
    });
  }, []);

  const handleSimulate = () => {
    evalMutation.mutate({
      income: simIncome,
      credit_score: simCreditScore,
      loan_amount: simLoanAmount,
      tenure: simTenure,
      total_emi: simTotalEmi,
      employment_type: simEmployment,
      credit_utilization: simUtilization,
      previous_dpd: simDpd,
    });
  };

  const evalResult = evalMutation.data;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <CreditCard className="w-3.5 h-3.5" />
              Credit Analyst Underwriting Desk
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Credit Assessment & Intelligence Console</h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time XGBoost probability of default inference, comprehensive applicant appraisal, and risk attributions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Underwriting Analyst:</span>
            <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-blue-400 font-semibold text-xs">
              {analystDash?.analyst_name || user?.full_name || 'Credit Analyst'}
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 mt-6 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'assessment'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Credit Review Queue ({analystDash?.awaiting_credit_review || 0})
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'simulator'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            XGBoost ML Sandbox
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

      {/* VIEW 1: CREDIT ANALYST DASHBOARD & ASSESSMENT SCREEN */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          {/* Real Backend Analyst KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Awaiting Credit Review</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-2">
                {dashLoading ? '...' : analystDash?.awaiting_credit_review ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Pending appraisal queue</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Approval Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">
                {dashLoading ? '...' : `${analystDash?.approval_rate ?? 76}%`}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Rejection Rate: {analystDash?.rejection_rate ?? 24}%
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">High-Risk Cases</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400 mt-2">
                {dashLoading ? '...' : analystDash?.high_risk_applications ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">PD &gt; 15% or score &gt; 60</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Avg Processing Turnaround</span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {dashLoading ? '...' : `${analystDash?.average_processing_time_hours ?? 4.2}h`}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {analystDash?.overdue_reviews ?? 0} overdue (&gt;48h)
              </div>
            </div>
          </div>

          {/* Underwriting Queue Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Underwriting Review Queue</h3>
                <p className="text-xs text-slate-400">
                  Select an application to perform full credit assessment, run AI risk scoring, and submit underwriter recommendations.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="py-3 px-3 rounded-l-lg">Application</th>
                    <th className="py-3 px-3">Borrower</th>
                    <th className="py-3 px-3">Monthly Income</th>
                    <th className="py-3 px-3">CIBIL Score</th>
                    <th className="py-3 px-3">Requested Amount</th>
                    <th className="py-3 px-3">AI Recommendation</th>
                    <th className="py-3 px-3 rounded-r-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {analystDash?.review_queue?.map((q: any) => (
                    <tr key={q.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white">{q.application_id}</div>
                        <div className="text-[10px] text-slate-400">{q.product_type}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-200">
                        <div className="font-medium">{q.customer_name}</div>
                        <div className="text-[10px] text-slate-500">{q.customer_id}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">₹{q.income?.toLocaleString()}</td>
                      <td className="py-3.5 px-3">
                        <span className={`font-semibold ${q.credit_score >= 700 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {q.credit_score}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-white">
                        ₹{q.requested_amount?.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            q.ai_recommendation === 'APPROVE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : q.ai_recommendation === 'REJECT'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {q.ai_recommendation}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedAppId(q.application_id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-md shadow-blue-600/20"
                        >
                          Review Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!analystDash?.review_queue || analystDash.review_queue.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No applications waiting in credit review queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* COMPLETE CREDIT ASSESSMENT SCREEN (When an application is selected) */}
          {selectedAppId && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                    Credit Assessment Screen
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">
                    Application {selectedAppId} — {dossier?.customer?.full_name || 'Borrower'}
                  </h2>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Product: {dossier?.application?.product_type} • Requested: ₹{dossier?.application?.requested_amount?.toLocaleString()} ({dossier?.application?.requested_tenure} Mos)
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runAiEvalMutation.mutate(selectedAppId)}
                    disabled={runAiEvalMutation.isPending}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {runAiEvalMutation.isPending ? 'Running XGBoost...' : 'Run AI Evaluation'}
                  </button>
                  <button
                    onClick={() => setSelectedAppId(null)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {dossierLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading credit dossier...</div>
              ) : dossier ? (
                <div className="space-y-6">
                  {/* Grid 1: Customer Profile, Employment, Financials */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Customer & Employment */}
                    <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-400" /> Borrower Profile
                      </h4>
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Customer ID:</span>
                          <span className="font-semibold text-white">{dossier.customer?.customer_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Occupation:</span>
                          <span>{dossier.customer?.occupation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Employment Type:</span>
                          <span>{dossier.customer?.employment_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Location:</span>
                          <span>{dossier.customer?.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Age:</span>
                          <span>{dossier.customer?.age} years</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Liabilities & Bank Buffer */}
                    <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" /> Financial Commitments
                      </h4>
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Monthly Income:</span>
                          <span className="font-semibold text-white">₹{dossier.financial_profile?.monthly_income?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Existing Commitments:</span>
                          <span>₹{dossier.financial_profile?.existing_liabilities?.toLocaleString()}/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Debt-to-Income (DTI):</span>
                          <span className="font-bold text-emerald-400">
                            {(dossier.financial_profile?.debt_to_income_ratio * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Bank Balance:</span>
                          <span>₹{dossier.customer?.bank_balance?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Max Affordability:</span>
                          <span>₹{dossier.financial_profile?.affordability_monthly_capacity?.toLocaleString()}/mo</span>
                        </div>
                      </div>
                    </div>

                    {/* Credit History & Bureau */}
                    <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-indigo-400" /> Bureau & Credit History
                      </h4>
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">CIBIL Bureau Score:</span>
                          <span className="font-bold text-emerald-400">{dossier.customer?.credit_score}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Revolving Utilization:</span>
                          <span>{((dossier.customer?.credit_utilization || 0.25) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Active NBFC Loans:</span>
                          <span>{dossier.loan_history?.length || 0} accounts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Savings Ratio:</span>
                          <span>{((dossier.financial_profile?.savings_ratio || 0.3) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Model Decision & Risk Indicators */}
                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white">AI Credit Decision (XGBoost Engine)</h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Advisory recommendation • Requires mandatory human approval
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[11px]">AI Recommendation</span>
                        <div className="text-lg font-bold text-emerald-400 mt-1">
                          {dossier.ai_evaluation?.approval_recommendation || 'APPROVE'}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[11px]">Default Probability (PD)</span>
                        <div className="text-lg font-bold text-white mt-1">
                          {dossier.ai_evaluation?.probability_of_default_pct || '2.40%'}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[11px]">Recommended Sanction</span>
                        <div className="text-lg font-bold text-indigo-400 mt-1">
                          ₹{dossier.ai_evaluation?.recommended_amount?.toLocaleString() || '500,000'}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[11px]">Risk Category</span>
                        <div className="text-lg font-bold text-emerald-400 mt-1">
                          {dossier.ai_evaluation?.risk_category || 'Low'}
                        </div>
                      </div>
                    </div>

                    {/* Risk Indicators Pills */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {dossier.risk_indicators?.map((ind: any, i: number) => (
                        <div
                          key={i}
                          className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] flex items-center gap-2"
                        >
                          <span className="text-slate-400">{ind.indicator}:</span>
                          <span className="font-semibold text-white">{ind.value}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] ${
                              ind.status === 'Good' || ind.status === 'Low Risk' || ind.status === 'Compliant'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {ind.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Analyst Actions Action Bar */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-white">Underwriter Decision Actions</h4>
                      <p className="text-[11px] text-slate-400">
                        Submit recommendation forward to Credit Committee or request further clarifications.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setRecAmount(dossier.application?.requested_amount || 500000);
                          setRecTenure(dossier.application?.requested_tenure || 36);
                          setActionModal('APPROVE_FOR_MANAGER');
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20"
                      >
                        Approve for Manager
                      </button>

                      <button
                        onClick={() => setActionModal('REQUEST_INFORMATION')}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold"
                      >
                        Request Info
                      </button>

                      <button
                        onClick={() => setActionModal('ESCALATE')}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Escalate Case
                      </button>

                      <button
                        onClick={() => setActionModal('RECOMMEND_REJECTION')}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Recommend Rejection
                      </button>

                      <button
                        onClick={() => setActionModal('ADD_CREDIT_NOTE')}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                      >
                        + Credit Note
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: XGBOOST SIMULATOR SANDBOX */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-500" />
                <span>Interactive Underwriting Simulator</span>
              </h3>
              <button
                onClick={handleSimulate}
                disabled={evalMutation.isPending}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{evalMutation.isPending ? 'Calculating...' : 'Run Inference'}</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Monthly Income (₹)</label>
                  <input
                    type="number"
                    value={simIncome}
                    onChange={(e) => setSimIncome(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">CIBIL Score (300-900)</label>
                  <input
                    type="number"
                    value={simCreditScore}
                    onChange={(e) => setSimCreditScore(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Loan Amount (₹)</label>
                  <input
                    type="number"
                    value={simLoanAmount}
                    onChange={(e) => setSimLoanAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Tenure (Months)</label>
                  <select
                    value={simTenure}
                    onChange={(e) => setSimTenure(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                  >
                    <option value={12}>12 Months</option>
                    <option value={24}>24 Months</option>
                    <option value={36}>36 Months</option>
                    <option value={48}>48 Months</option>
                    <option value={60}>60 Months</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-bold text-white mb-3">Model Inference Result</h3>
            {evalResult && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-400">Risk Score</span>
                    <div className="text-lg font-bold text-white mt-1">{evalResult.risk_score}</div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-400">Default Probability</span>
                    <div className="text-lg font-bold text-white mt-1">{evalResult.probability_of_default_pct}</div>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-400">Decision</span>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{evalResult.decision}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-300 mb-2">SHAP Feature Attribution</h4>
                  <div className="space-y-1.5">
                    {evalResult.shap_explanations?.all_contributions?.slice(0, 6).map((c: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-slate-800/60 rounded">
                        <span className="text-slate-300">{c.display_name}</span>
                        <span className={c.shap_value > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                          {c.shap_value > 0 ? `+${c.shap_value}` : c.shap_value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT ANALYST ACTION */}
      {actionModal && selectedAppId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Credit Analyst Action: {actionModal.replace(/_/g, ' ')}
                </h3>
                <div className="text-xs text-slate-400">Application: {selectedAppId}</div>
              </div>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionModal === 'APPROVE_FOR_MANAGER' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Recommended Amount (₹)</label>
                  <input
                    type="number"
                    value={recAmount}
                    onChange={(e) => setRecAmount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Recommended Tenure (Mos)</label>
                  <input
                    type="number"
                    value={recTenure}
                    onChange={(e) => setRecTenure(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 block mb-1">Underwriter Assessment Notes *</label>
              <textarea
                rows={4}
                placeholder="State qualitative rationale, debt-servicing observations, or reasons for escalation/rejection..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  analystActionMutation.mutate({
                    appId: selectedAppId,
                    action: actionModal,
                    notes: actionNotes,
                    recommended_amount: recAmount || undefined,
                    recommended_tenure: recTenure || undefined
                  })
                }
                disabled={!actionNotes.trim()}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg disabled:opacity-50 ${
                  actionModal === 'APPROVE_FOR_MANAGER'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : actionModal === 'RECOMMEND_REJECTION'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                Submit Recommendation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
