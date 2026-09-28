import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Layers,
  Clock,
  TrendingUp,
  Activity,
  DollarSign,
  FileText,
  User,
  History,
  X,
  Sparkles,
  ChevronRight,
  Shield,
  HelpCircle,
  PieChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RiskManagerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('finsight_token') || localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [decisionModalAction, setDecisionModalAction] = useState<string | null>(null); // 'APPROVE', 'REJECT', 'REQUEST_INFO', 'RETURN_TO_ANALYST', 'OVERRIDE'
  const [decisionReason, setDecisionReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [sanctionedAmount, setSanctionedAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const [historyModalAppId, setHistoryModalAppId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Risk Manager Dashboard
  const { data: managerData, isLoading } = useQuery({
    queryKey: ['risk-manager-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/risk-manager/dashboard', { headers });
      if (!res.ok) throw new Error('Failed to load Risk Manager Dashboard');
      return res.json();
    }
  });

  // 2. Fetch Immutable History for Selected App
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['risk-history', historyModalAppId],
    queryFn: async () => {
      if (!historyModalAppId) return null;
      const res = await fetch(`/api/risk/applications/${historyModalAppId}/history`, { headers });
      if (!res.ok) throw new Error('Failed to load risk history');
      return res.json();
    },
    enabled: !!historyModalAppId
  });

  // 3. Risk Decision Mutation
  const decisionMutation = useMutation({
    mutationFn: async (payload: {
      decision: string;
      decision_reason: string;
      override_reason?: string;
      sanctioned_amount?: number;
      notes?: string;
    }) => {
      if (!selectedCase) throw new Error('No application selected');
      const res = await fetch(`/api/risk-manager/${selectedCase.application_id}/decision`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Risk Manager decision failed');
      }
      return res.json();
    },
    onSuccess: (res) => {
      setFeedbackMsg({ type: 'success', text: res.message });
      setDecisionModalAction(null);
      setSelectedCase(null);
      setDecisionReason('');
      setOverrideReason('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['risk-manager-dashboard'] });
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message });
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  });

  const pendingApprovals = managerData?.pending_approvals || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-white border border-purple-200/80 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shadow-md shadow-purple-600/20 text-white">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Risk Manager Decision Console</h1>
                <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Senior Authority
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Enterprise Portfolio Sanctions, Analyst Overrides, Concentration Audits & Risk Sign-offs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Authority:</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">Enterprise Sanction Limit: ₹10.0 Cr</span>
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

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pending Sanctions</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{managerData?.pending_approvals_count ?? 0}</div>
          <span className="text-[11px] text-amber-600 font-medium">Requiring senior risk sign-off</span>
        </div>

        <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">High-Risk Cases</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{managerData?.high_risk_cases ?? 0}</div>
          <span className="text-[11px] text-slate-500 font-medium">Critical/Elevated tier</span>
        </div>

        <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Policy Overrides</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{managerData?.exceptions_count ?? 0}</div>
          <span className="text-[11px] text-slate-500 font-medium">Audited executive exceptions</span>
        </div>

        <div className="finsight-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Portfolio Risk Index</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{managerData?.portfolio_risk?.portfolio_risk_score ?? 48.5}</div>
          <span className="text-[11px] text-emerald-600 font-medium">{managerData?.portfolio_risk?.risk_category ?? 'MODERATE'}</span>
        </div>
      </div>

      {/* Pending Sanctions Queue */}
      <div className="finsight-card bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            Pending Risk Approvals Queue ({pendingApprovals.length})
          </h3>
          <span className="text-xs text-slate-500">Analyst Recommendations Awaiting Final Sanction</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Application</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Requested Amount</th>
                <th className="py-3 px-4">Analyst Recommendation</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No applications currently awaiting senior risk manager approval.
                  </td>
                </tr>
              ) : (
                pendingApprovals.map((pa: any) => (
                  <tr key={pa.application_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{pa.application_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{pa.customer_name}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{pa.requested_amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          pa.analyst_recommendation === 'APPROVE_RISK'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pa.analyst_recommendation === 'RECOMMEND_REJECTION'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {pa.analyst_recommendation}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{pa.risk_score}</span>
                      <span className="text-[10px] text-slate-400">/100</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{pa.date}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setHistoryModalAppId(pa.application_id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                        title="View Immutable Audit History"
                      >
                        <History className="w-3.5 h-3.5 inline" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCase(pa);
                          setSanctionedAmount(pa.requested_amount);
                          setDecisionModalAction('APPROVE');
                        }}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded text-xs transition-colors"
                      >
                        Sanction
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DECISION MODAL */}
      {selectedCase && decisionModalAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Risk Sanction: {selectedCase.application_id}</span>
                </h3>
                <span className="text-xs text-slate-500">Customer: {selectedCase.customer_name}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedCase(null);
                  setDecisionModalAction(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Decision Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Decision</label>
              <select
                value={decisionModalAction}
                onChange={(e) => setDecisionModalAction(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-800"
              >
                <option value="APPROVE">Approve / Sanction Risk</option>
                <option value="REJECT">Reject Application</option>
                <option value="RETURN_TO_ANALYST">Return to Analyst for Reanalysis</option>
                <option value="OVERRIDE">Executive Policy Override</option>
              </select>
            </div>

            {decisionModalAction === 'APPROVE' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Sanctioned Amount (₹)</label>
                <input
                  type="number"
                  value={sanctionedAmount}
                  onChange={(e) => setSanctionedAmount(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Decision Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="State institutional risk rationale for decision records..."
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
              />
            </div>

            {decisionModalAction === 'OVERRIDE' && (
              <div>
                <label className="text-xs font-semibold text-rose-700 block mb-1">
                  Mandatory Policy Override Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Detail explicit justification for overriding analyst recommendation..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full text-xs p-2 bg-rose-50 border border-rose-200 rounded-lg outline-none text-rose-900"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedCase(null);
                  setDecisionModalAction(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  decisionMutation.mutate({
                    decision: decisionModalAction,
                    decision_reason: decisionReason,
                    override_reason: overrideReason,
                    sanctioned_amount: sanctionedAmount,
                    notes: notes
                  });
                }}
                disabled={decisionMutation.isPending || !decisionReason}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {decisionMutation.isPending ? 'Recording Decision...' : 'Commit Sanction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMMUTABLE DECISION HISTORY DRAWER / MODAL */}
      {historyModalAppId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                <span>Immutable Risk Decision History: {historyModalAppId}</span>
              </h3>
              <button onClick={() => setHistoryModalAppId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {historyLoading ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading audit records...</div>
              ) : (!historyData?.history || historyData.history.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400">No prior risk decisions on record.</div>
              ) : (
                historyData.history.map((h: any) => (
                  <div key={h.history_id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900">{h.final_decision}</span>
                      <span className="text-[10px] text-slate-400">{h.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-3">
                      <span>Analyst: {h.analyst}</span>
                      <span>Manager: {h.manager}</span>
                      <span>Risk Score: {h.risk_score}</span>
                    </div>
                    {h.decision_reason && (
                      <p className="text-[11px] text-slate-700">Reason: {h.decision_reason}</p>
                    )}
                    {h.override_reason && (
                      <p className="text-[11px] text-rose-700 font-semibold">Override Reason: {h.override_reason}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
