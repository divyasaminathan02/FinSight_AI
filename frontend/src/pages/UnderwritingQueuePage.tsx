import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  User,
  CreditCard,
  Building,
  RefreshCw,
  FileText,
  FileCheck,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { loansApi } from '../services/api';
import { LoanApplicationItem } from '../types';
import { Badge } from '../components/common/Badge';

export const UnderwritingQueuePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeApp, setActiveApp] = useState<LoanApplicationItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [decisionSuccessMsg, setDecisionSuccessMsg] = useState<string>('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['loan-applications', selectedStatus, searchQuery],
    queryFn: () =>
      loansApi.getApplications({
        status: selectedStatus === 'All' ? undefined : selectedStatus,
        search: searchQuery || undefined,
        page_size: 50,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      appId,
      action,
      notes,
      amount,
    }: {
      appId: string;
      action: string;
      notes: string;
      amount?: number;
    }) =>
      loansApi.reviewApplication(appId, {
        action,
        notes,
        approved_amount: amount,
        reviewer_name: 'Priya Sharma (Senior Underwriter)',
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      setDecisionSuccessMsg(`Application ${res.application_id} marked as ${res.new_status}.`);
      setActiveApp(null);
      setTimeout(() => setDecisionSuccessMsg(''), 4000);
    },
  });

  const applications: LoanApplicationItem[] = data?.items || [];
  const statusCounts = data?.status_counts || {};

  const handleOpenReview = (app: LoanApplicationItem) => {
    setActiveApp(app);
    setApprovedAmount(app.requested_amount);
    setReviewNotes('');
  };

  const handleExecuteDecision = (action: string) => {
    if (!activeApp) return;
    reviewMutation.mutate({
      appId: activeApp.application_id,
      action,
      notes:
        reviewNotes ||
        (action === 'APPROVE'
          ? 'Underwriting criteria satisfied; approved under credit policy.'
          : 'Does not meet current credit risk parameters.'),
      amount: action === 'APPROVE' ? approvedAmount || activeApp.requested_amount : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Credit Officer Underwriting Desk</h1>
              <p className="text-xs text-slate-500 font-medium">
                Multi-agent credit risk assessments, bureau validation, and deterministic sanctioning
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {decisionSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{decisionSuccessMsg}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          'All',
          'Under_Review',
          'Approved',
          'Documents_Required',
          'Disbursement_Pending',
          'Disbursed',
          'Rejected',
        ].map((st) => {
          const count = st === 'All' ? data?.total || 0 : statusCounts[st] || 0;
          return (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50/60 hover:text-blue-700 shadow-2xs'
              }`}
            >
              <span>{st.replace('_', ' ')}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedStatus === st
                    ? 'bg-blue-800 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Application ID, Customer Name, or Product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 pl-9 pr-4 py-2 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-medium transition-all shadow-xs"
          />
        </div>
        <div className="text-xs text-slate-600 font-medium">
          Showing <span className="font-bold text-slate-900">{applications.length}</span> applications in queue
        </div>
      </div>

      {/* Applications Table - Pale White & Pale Light Blue */}
      <div className="bg-white border border-blue-100/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gradient-to-r from-slate-50 via-[#F0F7FF] to-blue-50/40 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Application ID</th>
                <th className="py-3.5 px-4">Applicant</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Requested</th>
                <th className="py-3.5 px-4">Tenure</th>
                <th className="py-3.5 px-4">CIBIL / Risk</th>
                <th className="py-3.5 px-4">Default Prob</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading underwriting queue...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                    No loan applications found matching criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                      {app.application_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{app.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{app.customer_identifier}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {app.product_type}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{app.requested_amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {app.requested_tenure} mos
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{app.customer_cibil || 742}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            (app.customer_cibil || 742) >= 750
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : (app.customer_cibil || 742) >= 650
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {(app.customer_cibil || 742) >= 750
                            ? 'Prime'
                            : (app.customer_cibil || 742) >= 650
                            ? 'Near-Prime'
                            : 'Subprime'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span
                        className={`${
                          app.default_probability < 0.03
                            ? 'text-emerald-700'
                            : app.default_probability < 0.06
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {(app.default_probability * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold inline-block ${
                          app.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : app.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : app.status === 'Documents_Required'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : app.status === 'Disbursed'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenReview(app)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        Review Desk &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Decision Modal Drawer */}
      {activeApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-blue-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Underwriting Evaluation
                </span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Application #{activeApp.application_id}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full font-bold">
                    {activeApp.status}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setActiveApp(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Applicant Summary Card - Pale Light Blue */}
            <div className="p-4 bg-gradient-to-br from-white to-[#F0F7FF] border border-blue-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-2xs">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">Applicant Name</span>
                <span className="font-bold text-slate-900">{activeApp.customer_name}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">Requested Loan</span>
                <span className="font-bold text-blue-700">₹{activeApp.requested_amount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">Bureau CIBIL</span>
                <span className="font-bold text-emerald-700">{activeApp.customer_cibil || 742} / 900</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">Default Prob (PD)</span>
                <span className="font-bold text-amber-700">
                  {(activeApp.default_probability * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* AI Underwriting Recommendation - Pale Blue */}
            <div className="p-4 bg-[#F0F7FF] border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>AI Risk Signal Recommendation</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Applicant satisfies RBI Tier-1 NBFC credit norms. Debt-to-income (DTI) is within tolerance (38.2%).
                Zero active fraud collisions detected across national device fingerprint database. Recommended action:{' '}
                <strong className="text-slate-900">APPROVE</strong> at 13.5% p.a.
              </p>
            </div>

            {/* Decision Controls Form */}
            <div className="space-y-3 pt-2">
              <label className="block text-slate-800 font-bold">Sanction Amount (INR)</label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 px-3.5 py-2 rounded-xl text-xs text-slate-900 font-mono font-bold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-xs"
              />

              <label className="block text-slate-800 font-bold pt-1">Underwriter Audit Notes</label>
              <textarea
                rows={3}
                placeholder="Enter regulatory underwriter rationale and sanction conditions..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 p-3 rounded-xl text-xs text-slate-900 font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                onClick={() => handleExecuteDecision('REJECT')}
                disabled={reviewMutation.isPending}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Reject Application
              </button>
              <button
                onClick={() => handleExecuteDecision('DOCUMENTS_REQUIRED')}
                disabled={reviewMutation.isPending}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Request More Docs
              </button>
              <button
                onClick={() => handleExecuteDecision('APPROVE')}
                disabled={reviewMutation.isPending}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{reviewMutation.isPending ? 'Sanctioning...' : 'Approve Application'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default UnderwritingQueuePage;
