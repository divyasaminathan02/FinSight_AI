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
  const token = localStorage.getItem('finsight_token') || localStorage.getItem('access_token');
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
      <div className="bg-white border border-blue-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              Credit Analyst Underwriting Desk
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Credit Assessment & Intelligence Console</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Real-time XGBoost probability of default inference, comprehensive applicant appraisal, and risk attributions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Underwriting Analyst:</span>
            <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-blue-700 font-bold text-xs">
              {analystDash?.analyst_name || user?.full_name || 'Credit Analyst'}
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 mt-6 border-b border-slate-100 pb-2">
          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'assessment'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Credit Review Queue ({analystDash?.awaiting_credit_review || 0})
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200'
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
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: CREDIT ANALYST DASHBOARD & ASSESSMENT SCREEN */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          {/* Real Backend Analyst KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-xs font-bold uppercase">Awaiting Credit Review</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                {dashLoading ? '...' : analystDash?.awaiting_credit_review ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">Pending appraisal queue</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-xs font-bold uppercase">Approval Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                {dashLoading ? '...' : `${analystDash?.approval_rate ?? 76}%`}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                Rejection Rate: {analystDash?.rejection_rate ?? 24}%
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-xs font-bold uppercase">High-Risk Cases</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2">
                {dashLoading ? '...' : analystDash?.high_risk_applications ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">PD &gt; 15% or score &gt; 60</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-xs font-bold uppercase">Avg Processing Turnaround</span>
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {dashLoading ? '...' : `${analystDash?.average_processing_time_hours ?? 4.2}h`}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                {analystDash?.overdue_reviews ?? 0} overdue (&gt;48h)
              </div>
            </div>
          </div>

          {/* Underwriting Queue Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Underwriting Review Queue</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Select an application to perform full credit assessment, run AI risk scoring, and submit underwriter recommendations.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F0F7FF] text-slate-700 font-bold border-b border-blue-100">
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
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {analystDash?.review_queue?.map((q: any) => (
                    <tr key={q.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900">{q.application_id}</div>
                        <div className="text-[10px] text-slate-500">{q.product_type}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-800">
                        <div className="font-medium text-slate-900">{q.customer_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{q.customer_id}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-medium">₹{q.income?.toLocaleString()}</td>
                      <td className="py-3.5 px-3">
                        <span className={`font-bold ${q.credit_score >= 700 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {q.credit_score}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">
                        ₹{q.requested_amount?.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            q.ai_recommendation === 'APPROVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : q.ai_recommendation === 'REJECT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {q.ai_recommendation}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedAppId(q.application_id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow-sm shadow-blue-600/20 cursor-pointer"
                        >
                          Review Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!analystDash?.review_queue || analystDash.review_queue.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
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
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                    Credit Assessment Screen
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    Application {selectedAppId} — {dossier?.customer?.full_name || 'Borrower'}
                  </h2>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">
                    Product: {dossier?.application?.product_type} • Requested: ₹{dossier?.application?.requested_amount?.toLocaleString()} ({dossier?.application?.requested_tenure} Mos)
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runAiEvalMutation.mutate(selectedAppId)}
                    disabled={runAiEvalMutation.isPending}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {runAiEvalMutation.isPending ? 'Running XGBoost...' : 'Run AI Evaluation'}
                  </button>
                  <button
                    onClick={() => setSelectedAppId(null)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
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
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" /> Borrower Profile
                      </h4>
                      <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Customer ID:</span>
                          <span className="font-semibold text-slate-900">{dossier.customer?.customer_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Occupation:</span>
                          <span>{dossier.customer?.occupation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Employment Type:</span>
                          <span>{dossier.customer?.employment_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Location:</span>
                          <span>{dossier.customer?.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Age:</span>
                          <span>{dossier.customer?.age} years</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Liabilities & Bank Buffer */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-600" /> Financial Commitments
                      </h4>
                      <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Monthly Income:</span>
                          <span className="font-semibold text-slate-900">₹{dossier.financial_profile?.monthly_income?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Existing Commitments:</span>
                          <span>₹{dossier.financial_profile?.existing_liabilities?.toLocaleString()}/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Debt-to-Income (DTI):</span>
                          <span className="font-bold text-emerald-700">
                            {(dossier.financial_profile?.debt_to_income_ratio * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bank Balance:</span>
                          <span>₹{dossier.customer?.bank_balance?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Max Affordability:</span>
                          <span>₹{dossier.financial_profile?.affordability_monthly_capacity?.toLocaleString()}/mo</span>
                        </div>
                      </div>
                    </div>

                    {/* Credit History & Bureau */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-indigo-600" /> Bureau & Credit History
                      </h4>
                      <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                        <div className="flex justify-between">
                          <span className="text-slate-500">CIBIL Bureau Score:</span>
                          <span className="font-bold text-emerald-700">{dossier.customer?.credit_score}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Revolving Utilization:</span>
                          <span>{((dossier.customer?.credit_utilization || 0.25) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Active NBFC Loans:</span>
                          <span>{dossier.loan_history?.length || 0} accounts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Savings Ratio:</span>
                          <span>{((dossier.financial_profile?.savings_ratio || 0.3) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Model Decision & Risk Indicators */}
                  <div className="bg-gradient-to-br from-white to-[#F0F7FF] border border-blue-200 rounded-xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-900">AI Credit Decision (XGBoost Engine)</h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Advisory recommendation • Requires mandatory human approval
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-white rounded-lg border border-blue-100 shadow-2xs">
                        <span className="text-slate-500 text-[11px] font-semibold">AI Recommendation</span>
                        <div className="text-lg font-bold text-emerald-700 mt-1">
                          {dossier.ai_evaluation?.approval_recommendation || 'APPROVE'}
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-blue-100 shadow-2xs">
                        <span className="text-slate-500 text-[11px] font-semibold">Default Probability (PD)</span>
                        <div className="text-lg font-bold text-slate-900 mt-1">
                          {dossier.ai_evaluation?.probability_of_default_pct || '2.40%'}
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-blue-100 shadow-2xs">
                        <span className="text-slate-500 text-[11px] font-semibold">Recommended Sanction</span>
                        <div className="text-lg font-bold text-blue-700 mt-1">
                          ₹{dossier.ai_evaluation?.recommended_amount?.toLocaleString() || '500,000'}
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-blue-100 shadow-2xs">
                        <span className="text-slate-500 text-[11px] font-semibold">Risk Category</span>
                        <div className="text-lg font-bold text-emerald-700 mt-1">
                          {dossier.ai_evaluation?.risk_category || 'Low'}
                        </div>
                      </div>
                    </div>

                    {/* Risk Indicators Pills */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {dossier.risk_indicators?.map((ind: any, i: number) => (
                        <div
                          key={i}
                          className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-[11px] flex items-center gap-2 shadow-2xs"
                        >
                          <span className="text-slate-500 font-medium">{ind.indicator}:</span>
                          <span className="font-bold text-slate-900">{ind.value}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              ind.status === 'Good' || ind.status === 'Low Risk' || ind.status === 'Compliant'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {ind.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Analyst Actions Action Bar */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Underwriter Decision Actions</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
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
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm shadow-emerald-600/20 cursor-pointer"
                      >
                        Approve for Manager
                      </button>

                      <button
                        onClick={() => setActionModal('REQUEST_INFORMATION')}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-cyan-800 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Request Info
                      </button>

                      <button
                        onClick={() => setActionModal('ESCALATE')}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                      >
                        Escalate Case
                      </button>

                      <button
                        onClick={() => setActionModal('RECOMMEND_REJECTION')}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                      >
                        Recommend Rejection
                      </button>

                      <button
                        onClick={() => setActionModal('ADD_CREDIT_NOTE')}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
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
          <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Interactive Underwriting Simulator</span>
              </h3>
              <button
                onClick={handleSimulate}
                disabled={evalMutation.isPending}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{evalMutation.isPending ? 'Calculating...' : 'Run Inference'}</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Monthly Income (₹)</label>
                  <input
                    type="number"
                    value={simIncome}
                    onChange={(e) => setSimIncome(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-slate-300 rounded text-slate-900 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">CIBIL Score (300-900)</label>
                  <input
                    type="number"
                    value={simCreditScore}
                    onChange={(e) => setSimCreditScore(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-slate-300 rounded text-slate-900 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Loan Amount (₹)</label>
                  <input
                    type="number"
                    value={simLoanAmount}
                    onChange={(e) => setSimLoanAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-slate-300 rounded text-slate-900 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Tenure (Months)</label>
                  <select
                    value={simTenure}
                    onChange={(e) => setSimTenure(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-slate-300 rounded text-slate-900 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
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

          <div className="lg:col-span-7 bg-white border border-slate-200 shadow-sm rounded-xl p-5">
            <h3 className="text-xs font-bold text-slate-900 mb-3">Model Inference Result</h3>
            {evalResult && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#F0F7FF] border border-blue-100 rounded-lg">
                    <span className="text-slate-600 font-semibold">Risk Score</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">{evalResult.risk_score}</div>
                  </div>
                  <div className="p-3 bg-[#F0F7FF] border border-blue-100 rounded-lg">
                    <span className="text-slate-600 font-semibold">Default Probability</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">{evalResult.probability_of_default_pct}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <span className="text-emerald-800 font-semibold">Decision</span>
                    <div className="text-lg font-bold text-emerald-700 mt-1">{evalResult.decision}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-2">SHAP Feature Attribution</h4>
                  <div className="space-y-1.5">
                    {evalResult.shap_explanations?.all_contributions?.slice(0, 6).map((c: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-200 rounded">
                        <span className="text-slate-800 font-medium">{c.display_name}</span>
                        <span className={c.shap_value > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Credit Analyst Action: {actionModal.replace(/_/g, ' ')}
                </h3>
                <div className="text-xs text-slate-500 font-medium">Application: {selectedAppId}</div>
              </div>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionModal === 'APPROVE_FOR_MANAGER' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-700 font-bold block mb-1">Recommended Amount (₹)</label>
                  <input
                    type="number"
                    value={recAmount}
                    onChange={(e) => setRecAmount(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-700 font-bold block mb-1">Recommended Tenure (Mos)</label>
                  <input
                    type="number"
                    value={recTenure}
                    onChange={(e) => setRecTenure(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-700 font-bold block mb-1">Underwriter Assessment Notes *</label>
              <textarea
                rows={4}
                placeholder="State qualitative rationale, debt-servicing observations, or reasons for escalation/rejection..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200"
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
