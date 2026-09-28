import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Layers,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  User,
  History,
  X,
  Sparkles,
  ChevronRight,
  Shield,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CreditManagerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('finsight_token') || localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [decisionModalAction, setDecisionModalAction] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [sanctionedAmount, setSanctionedAmount] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(11.5);
  const [tenureMonths, setTenureMonths] = useState<number>(36);
  const [historyModalAppId, setHistoryModalAppId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Credit Manager Dashboard Data
  const { data: managerData, isLoading } = useQuery({
    queryKey: ['credit-manager-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/credit-manager/dashboard', { headers });
      if (!res.ok) throw new Error('Failed to load credit manager console');
      return res.json();
    }
  });

  // 2. Fetch Decision History for Selected Application
  const { data: decisionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['credit-decision-history', historyModalAppId],
    queryFn: async () => {
      if (!historyModalAppId) return [];
      const res = await fetch(`/api/credit/applications/${historyModalAppId}/history`, { headers });
      if (!res.ok) throw new Error('Failed to load decision history');
      return res.json();
    },
    enabled: !!historyModalAppId
  });

  // 3. Manager Decision Mutation
  const decisionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/credit-manager/${payload.appId}/decision`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Decision submission failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setFeedbackMsg({
        type: 'success',
        text: `Application decision '${data.final_status}' recorded to immutable audit history (#${data.history_id})`
      });
      setDecisionModalAction(null);
      setSelectedCase(null);
      setDecisionReason('');
      setOverrideReason('');
      queryClient.invalidateQueries({ queryKey: ['credit-manager-dashboard'] });
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Operation failed' });
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Banner - Pale White & Pale Light Blue */}
      <div className="bg-gradient-to-r from-white via-blue-50/60 to-indigo-50/40 border border-blue-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold mb-2">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Credit Committee & Risk Sanctioning
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Credit Manager Approval Console</h1>
            <p className="text-slate-600 text-sm mt-1 font-medium">
              Final sanctioning authority for high-value loans, underwriter recommendation reviews, and policy overrides.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Credit Authority:</span>
            <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-blue-700 font-bold text-xs shadow-2xs">
              {user?.full_name || 'Credit Committee Manager'}
            </span>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-2xs'
              : 'bg-rose-50 border-rose-200 text-rose-800 shadow-2xs'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards - Pale White & Pale Light Blue */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-[#F0F7FF] border border-blue-100 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 text-xs font-bold uppercase">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {isLoading ? '...' : managerData?.pending_approvals_count ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Requiring manager sign-off</div>
        </div>

        <div className="bg-gradient-to-br from-white to-[#F0F7FF] border border-blue-100 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 text-xs font-bold uppercase">Approved Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {isLoading ? '...' : managerData?.approval_volume_formatted ?? '₹0'}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-bold">
            {managerData?.approval_count ?? 0} approved this cycle
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-[#F0F7FF] border border-blue-100 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 text-xs font-bold uppercase">Rejection Volume</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {isLoading ? '...' : managerData?.rejection_volume_formatted ?? '₹0'}
          </div>
          <div className="text-[11px] text-rose-700 mt-1 font-bold">
            {managerData?.rejection_count ?? 0} declined applications
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-[#F0F7FF] border border-blue-100 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 text-xs font-bold uppercase">Avg Processing Turnaround</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {isLoading ? '...' : managerData?.processing_time ?? '3.5 hrs'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Within standard credit SLA</div>
        </div>
      </div>

      {/* Main Approval Queue & Analyst Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-blue-100/90 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Underwriting Recommendation Queue</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {managerData?.pending_approvals?.length || 0} applications awaiting final decision
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F0F7FF] text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Application</th>
                  <th className="py-2.5 px-3">Borrower</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Analyst Recommendation</th>
                  <th className="py-2.5 px-3">AI Score</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {managerData?.pending_approvals?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{c.application_id}</div>
                      <div className="text-[10px] text-slate-500">{c.product_type}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{c.customer_name}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      ₹{c.requested_amount?.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          c.analyst_recommendation === 'APPROVE_FOR_MANAGER'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {c.analyst_recommendation || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-semibold text-indigo-600">
                        {c.ai_score ? `${c.ai_score}/100` : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setHistoryModalAppId(c.application_id)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded border border-slate-200"
                          title="View Decision History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCase(c);
                            setSanctionedAmount(c.requested_amount);
                            setDecisionModalAction('APPROVE');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold shadow-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCase(c);
                            setDecisionModalAction('REJECT');
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-semibold shadow-xs"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCase(c);
                            setDecisionModalAction('OVERRIDE');
                          }}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-semibold shadow-xs"
                        >
                          Override
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!managerData?.pending_approvals || managerData.pending_approvals.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No applications currently awaiting credit manager sign-off.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Performance & Exceptions Side Panel */}
        <div className="space-y-6">
          <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Underwriting Team Productivity</h3>
            <div className="space-y-3">
              {managerData?.team_performance?.map((t: any, idx: number) => (
                <div key={idx} className="p-3 bg-gradient-to-br from-white to-[#F0F7FF] rounded-lg border border-blue-100 text-xs shadow-2xs">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{t.role}</span>
                    <span className="text-emerald-700 font-bold">{t.approval_rate}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-medium">
                    <span>Reviewed: {t.reviewed_count} cases</span>
                    <span>Avg TAT: {t.avg_turnaround_hours}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-amber-200/90 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-amber-700">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Policy Override Protocol</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Any decision overruling the AI recommendation or analyst submission triggers an immutable audit log and mandatory reason requirement under NBFC prudential guidelines.
            </p>
          </div>
        </div>
      </div>

      {/* DECISION ACTION MODAL */}
      {decisionModalAction && selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-blue-200 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Credit Sanction: {decisionModalAction} ({selectedCase.application_id})
                </h3>
                <div className="text-xs text-slate-400">
                  Borrower: {selectedCase.customer_name} • Requested: ₹{selectedCase.requested_amount?.toLocaleString()}
                </div>
              </div>
              <button onClick={() => setDecisionModalAction(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {decisionModalAction === 'APPROVE' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-600 font-medium block mb-1">Sanctioned Amount</label>
                  <input
                    type="number"
                    value={sanctionedAmount}
                    onChange={(e) => setSanctionedAmount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 font-medium block mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 font-medium block mb-1">Tenure (Mos)</label>
                  <input
                    type="number"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">Decision Reason / Sanction Notes</label>
              <textarea
                rows={3}
                placeholder="State basis for decision (e.g., strong debt-servicing, verified assets)..."
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {decisionModalAction === 'OVERRIDE' && (
              <div>
                <label className="text-xs text-rose-700 block mb-1 font-semibold">
                  Mandatory Policy Override Rationale *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why analyst recommendation or AI model risk score is being overridden..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDecisionModalAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  decisionMutation.mutate({
                    appId: selectedCase.application_id,
                    decision: decisionModalAction,
                    decision_reason: decisionReason || `Approved by Credit Manager`,
                    override_reason: overrideReason || undefined,
                    sanctioned_amount: sanctionedAmount,
                    interest_rate: interestRate,
                    tenure_months: tenureMonths
                  })
                }
                disabled={decisionModalAction === 'OVERRIDE' && !overrideReason.trim()}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50 ${
                  decisionModalAction === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : decisionModalAction === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-purple-600 hover:bg-purple-500'
                }`}
              >
                Commit {decisionModalAction} Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMMUTABLE CREDIT DECISION HISTORY MODAL */}
      {historyModalAppId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  Immutable Decision Audit History
                </h3>
                <div className="text-xs text-slate-500 font-medium">Application: {historyModalAppId}</div>
              </div>
              <button onClick={() => setHistoryModalAppId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {historyLoading ? (
                <div className="text-center py-6 text-slate-500 text-xs">Loading audit records...</div>
              ) : decisionHistory && decisionHistory.length > 0 ? (
                decisionHistory.map((h: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{h.history_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                        {h.final_decision}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-500 text-[11px]">
                      <div>Underwriter Analyst: <span className="text-slate-800 font-medium">{h.analyst}</span></div>
                      <div>Credit Manager: <span className="text-slate-800 font-medium">{h.manager}</span></div>
                      <div>AI Risk Score: <span className="text-indigo-600 font-semibold">{h.ai_score}/100</span></div>
                      <div>AI Recommendation: <span className="text-indigo-600 font-semibold">{h.ai_recommendation}</span></div>
                    </div>
                    {h.override_reason && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-700">
                        <span className="font-bold">Override Rationale:</span> {h.override_reason}
                      </div>
                    )}
                    <div className="text-slate-700 text-[11px]">{h.decision_reason}</div>
                    <div className="text-[10px] text-slate-400">
                      Timestamp: {new Date(h.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No decision history logged for this application yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
