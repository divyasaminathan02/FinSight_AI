import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  CheckCircle,
  Clock,
  Zap,
  Building,
  CreditCard,
  FileCheck,
  RefreshCw,
  Search,
  ExternalLink,
  Shield,
  FileText,
  AlertCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  DollarSign,
  UserCheck,
  Send,
  HelpCircle,
  Check,
  ChevronRight
} from 'lucide-react';
import { operationsApi } from '../services/api';

export const OperationsPortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'queue' | 'manager'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');

  // Selected app modals
  const [checkAppId, setCheckAppId] = useState<string | null>(null);
  const [disburseAppId, setDisburseAppId] = useState<string | null>(null);
  const [actionModalApp, setActionModalApp] = useState<{ id: string; action: string } | null>(null);
  const [actionNotes, setActionNotes] = useState<string>('');
  const [actionReason, setActionReason] = useState<string>('');
  const [targetOfficer, setTargetOfficer] = useState<string>('');

  // 1. Fetch Operations Dashboard KPIs
  const { data: dashData, isLoading: dashLoading, refetch: refetchDash } = useQuery({
    queryKey: ['operations-dashboard'],
    queryFn: () => operationsApi.getDashboard()
  });

  // 2. Fetch Operations Cases Work Queue
  const { data: casesData, isLoading: casesLoading, refetch: refetchCases } = useQuery({
    queryKey: ['operations-cases', statusFilter, productFilter, riskFilter],
    queryFn: () => operationsApi.getCases({
      status: statusFilter || undefined,
      loan_product: productFilter || undefined,
      risk_level: riskFilter || undefined
    })
  });

  // 3. Pre-disbursement check query
  const { data: checkData, isLoading: checkLoading, refetch: refetchCheck } = useQuery({
    queryKey: ['operations-precheck', checkAppId],
    queryFn: () => checkAppId ? operationsApi.getPreDisbursementCheck(checkAppId) : null,
    enabled: !!checkAppId
  });

  // 4. Disbursement details query
  const { data: disbDetails, isLoading: disbDetailsLoading } = useQuery({
    queryKey: ['operations-disb-details', disburseAppId],
    queryFn: () => disburseAppId ? operationsApi.getDisbursementDetails(disburseAppId) : null,
    enabled: !!disburseAppId
  });

  // 5. Operations Manager Dashboard query
  const { data: mgrData } = useQuery({
    queryKey: ['operations-manager-dashboard'],
    queryFn: () => operationsApi.getManagerDashboard(),
    enabled: activeTab === 'manager'
  });

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: ({ appId, payload }: { appId: string; payload: any }) =>
      operationsApi.action(appId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['operations-cases'] });
      setActionModalApp(null);
      setActionNotes('');
      setActionReason('');
    }
  });

  // Disbursement mutation
  const disburseMutation = useMutation({
    mutationFn: ({ appId, payload }: { appId: string; payload: any }) =>
      operationsApi.disburse(appId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['operations-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['operations-cases'] });
      setDisburseAppId(null);
      alert(`Demo Disbursement Executed Successfully!\n\nLoan ID: ${res.loan?.loan_id}\nAmount: ₹${res.loan?.net_disbursed_amount?.toLocaleString()}\nTransaction Ref: ${res.transaction?.reference}`);
    },
    onError: (err: any) => {
      alert(`Disbursement Error: ${err?.response?.data?.detail || err.message}`);
    }
  });

  const cases = casesData?.cases || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Operations, Pre-Disbursement & Booking Desk</h1>
            <p className="text-xs text-slate-500">
              Institutional pre-disbursement verification, regulatory checks, demo core disbursement & loan account booking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'queue' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operations Queue
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'manager' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Executive Console
            </button>
          </div>

          <button
            onClick={() => { refetchDash(); refetchCases(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
            <span>Sync Ops</span>
          </button>
        </div>
      </div>

      {/* Real Backend Operational KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Awaiting Operations
          </span>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {dashData?.applications_awaiting_operations ?? 0}
          </div>
          <div className="text-[10px] text-slate-500">Approved facilities</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-500" /> Disbursement Pending
          </span>
          <div className="text-2xl font-bold text-blue-700 tracking-tight">
            {dashData?.disbursement_pending ?? 0}
          </div>
          <div className="text-[10px] text-slate-500">Pre-checks active</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-500" /> Pending Documents
          </span>
          <div className="text-2xl font-bold text-purple-700 tracking-tight">
            {dashData?.documents_pending ?? 0}
          </div>
          <div className="text-[10px] text-slate-500">Awaiting verification</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Today's Disbursed
          </span>
          <div className="text-xl font-bold text-emerald-700 tracking-tight">
            ₹{((dashData?.today_disbursements?.amount || 0) / 100000).toFixed(1)}L
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold">
            {dashData?.today_disbursements?.count ?? 0} facilities booked
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Ops Exceptions
          </span>
          <div className="text-2xl font-bold text-rose-600 tracking-tight">
            {dashData?.operational_exceptions ?? 0}
          </div>
          <div className="text-[10px] text-slate-500">Flagged for escalation</div>
        </div>
      </div>

      {activeTab === 'queue' && (
        <div className="bg-[#F0F7FF] border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-200">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-blue-950 font-bold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-700" /> Filters:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-blue-200 text-slate-800 font-medium rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 shadow-xs"
              >
                <option value="">All Workflow Stages</option>
                <option value="APPROVED">Approved by Risk</option>
                <option value="OFFER_SENT">Offer Sent</option>
                <option value="CUSTOMER_ACCEPTED">Customer Accepted</option>
                <option value="OPERATIONS_REVIEW">Operations Review</option>
                <option value="READY_FOR_DISBURSEMENT">Ready For Disbursement</option>
                <option value="DISBURSED">Disbursed</option>
              </select>

              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="bg-white border border-blue-200 text-slate-800 font-medium rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 shadow-xs"
              >
                <option value="">All Products</option>
                <option value="MSME Business Loan">MSME Business Loan</option>
                <option value="Vehicle Loan">Vehicle Loan</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Gold Loan">Gold Loan</option>
              </select>

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-white border border-blue-200 text-slate-800 font-medium rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 shadow-xs"
              >
                <option value="">All Risk Tiers</option>
                <option value="LOW">Low Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="HIGH">High Risk</option>
              </select>

              {(statusFilter || productFilter || riskFilter) && (
                <button
                  onClick={() => { setStatusFilter(''); setProductFilter(''); setRiskFilter(''); }}
                  className="text-xs text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer ml-1"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="text-xs text-blue-950 font-semibold">
              Showing <span className="text-blue-950 font-extrabold">{cases.length}</span> active operations cases
            </div>
          </div>

          {/* Cases Table in Light Pale Blue Shade */}
          <div className="overflow-x-auto rounded-xl border border-blue-200 shadow-xs bg-[#F0F7FF]">
            <table className="w-full text-left text-xs bg-white">
              <thead className="bg-[#E1EFFF] text-blue-950 uppercase text-[11px] font-extrabold tracking-wider border-b border-blue-200">
                <tr>
                  <th className="py-3.5 px-3 text-blue-950 font-bold">Application</th>
                  <th className="py-3.5 px-3 text-blue-950 font-bold">Customer</th>
                  <th className="py-3.5 px-3 text-blue-950 font-bold">Product</th>
                  <th className="py-3.5 px-3 text-blue-950 font-bold">Approved Sanction</th>
                  <th className="py-3.5 px-3 text-blue-950 font-bold">Cross-Module Gates</th>
                  <th className="py-3.5 px-3 text-blue-950 font-bold">Stage / Disb Status</th>
                  <th className="py-3.5 px-3 text-blue-950 font-bold">Assigned Ops</th>
                  <th className="py-3.5 px-3 text-right text-blue-950 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {casesLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-blue-900 font-semibold">
                      Loading operations queue from database...
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-600 font-medium">
                      No applications found matching the selected operations filters.
                    </td>
                  </tr>
                ) : (
                  cases.map((c: any) => (
                    <tr key={c.application_id} className="bg-white hover:bg-[#F0F7FF] transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-blue-950">
                        {c.application_id}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 text-xs">{c.customer_name}</div>
                        <div className="text-[11px] text-slate-600 font-mono font-medium">{c.customer_id}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-800 font-semibold">
                        {c.loan_product}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        ₹{c.approved_amount?.toLocaleString() || '0'}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.kyc_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            KYC: {c.kyc_status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.fraud_status === 'CLEARED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}>
                            Fraud: {c.fraud_status}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                            Risk: {c.risk_status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.workflow_stage === 'DISBURSED' || c.disbursement_status === 'DISBURSED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : c.workflow_stage === 'READY_FOR_DISBURSEMENT'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300 animate-pulse'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {c.workflow_stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-800 font-semibold">
                        {c.assigned_officer}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Pre-check button */}
                          <button
                            onClick={() => setCheckAppId(c.application_id)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                            title="Run Pre-Disbursement Checklist"
                          >
                            <Shield className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pre-Check</span>
                          </button>

                          {/* Disburse Button */}
                          {c.workflow_stage !== 'DISBURSED' && (
                            <button
                              onClick={() => setDisburseAppId(c.application_id)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Disburse</span>
                            </button>
                          )}

                          {/* Actions Dropdown */}
                          <button
                            onClick={() => setActionModalApp({ id: c.application_id, action: 'ADD_NOTE' })}
                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                            title="Add Note or Assign"
                          >
                            •••
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Executive Manager Console Tab */}
      {activeTab === 'manager' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs text-slate-600 font-bold">Total Portfolio Disbursed</span>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                ₹{((mgrData?.total_disbursed_volume || 0) / 10000000).toFixed(2)} <span className="text-xs font-semibold text-slate-500">Cr</span>
              </div>
              <p className="text-xs text-slate-600 font-medium">Core capital released across facilities</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs text-slate-600 font-bold">Active Live Facilities</span>
              <div className="text-3xl font-extrabold text-emerald-700 tracking-tight">
                {mgrData?.active_loans || 0}
              </div>
              <p className="text-xs text-slate-600 font-medium">Currently servicing loan accounts</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-xs text-slate-600 font-bold">Pending Operations Review</span>
              <div className="text-3xl font-extrabold text-purple-700 tracking-tight">
                {mgrData?.pending_operations_review || 0}
              </div>
              <p className="text-xs text-slate-600 font-medium">Applications awaiting pre-check or disbursement</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Operations Officer Workload Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(mgrData?.team_activity || []).map((t: any, idx: number) => (
                <div key={idx} className="p-3 bg-[#F0F7FF] rounded-xl border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-900">{t.officer}</span>
                  </div>
                  <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                    {t.assigned_cases} Cases
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: PRE-DISBURSEMENT CHECKLIST MODAL */}
      {/* ============================================================== */}
      {checkAppId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Pre-Disbursement Validation Checklist</h3>
              </div>
              <button
                onClick={() => setCheckAppId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {checkLoading ? (
              <div className="py-8 text-center text-xs text-slate-600 font-semibold">Verifying conditions...</div>
            ) : checkData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs bg-[#F0F7FF] p-3 rounded-xl border border-blue-200">
                  <div>
                    <span className="text-slate-600 font-medium">Application: </span>
                    <span className="font-mono font-bold text-blue-950">{checkData.application_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium">Borrower: </span>
                    <span className="font-bold text-slate-900">{checkData.customer_name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800">Mandatory Regulatory & Policy Conditions:</span>
                  <div className="space-y-1.5">
                    {checkData.checklist.map((item: any) => (
                      <div
                        key={item.code}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                          item.passed
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                            : 'bg-rose-50 border-rose-200 text-rose-900 font-semibold'
                        }`}
                      >
                        <span className="font-semibold">{item.label}</span>
                        {item.passed ? (
                          <span className="flex items-center gap-1 font-bold text-emerald-700 text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" /> PASSED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-bold text-rose-700 text-[11px]">
                            <XCircle className="w-3.5 h-3.5" /> MISSING
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {checkData.all_passed ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>All mandatory conditions verified! Application is formally cleared for core capital disbursement.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-700">
                      <AlertTriangle className="w-4 h-4" /> Disbursement Blocked
                    </div>
                    <p className="text-[11px] font-semibold">
                      The following mandatory requirement(s) must be fulfilled:
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-rose-800 font-medium">
                      {checkData.missing_conditions.map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => refetchCheck()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 cursor-pointer"
                  >
                    Re-Verify Checks
                  </button>
                  {checkData.can_disburse && (
                    <button
                      onClick={() => {
                        const targetId = checkAppId;
                        setCheckAppId(null);
                        setDisburseAppId(targetId);
                      }}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Proceed to Disburse</span>
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DISBURSEMENT DETAILS & DEMO EXECUTION MODAL */}
      {/* ============================================================== */}
      {disburseAppId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Execute Demo Core Disbursement</h3>
              </div>
              <button
                onClick={() => setDisburseAppId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {disbDetailsLoading ? (
              <div className="py-8 text-center text-xs text-slate-600 font-semibold">Calculating financial terms...</div>
            ) : disbDetails ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900 text-sm">{disbDetails.customer_name}</div>
                  <div className="text-slate-600 text-[11px] font-medium">
                    Product: <span className="text-purple-900 font-semibold">{disbDetails.product_type}</span> | Account Ref:{' '}
                    <span className="font-mono font-bold text-purple-800">{disbDetails.loan_number}</span>
                  </div>
                </div>

                {/* Financial Ledger Details */}
                <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">Sanctioned Principal:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{disbDetails.approved_amount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">Processing Fee ({disbDetails.processing_fee_pct}%):</span>
                    <span className="text-rose-600 font-bold">
                      - ₹{disbDetails.processing_fee?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-800 font-bold">Net Credited Capital:</span>
                    <span className="font-extrabold text-emerald-600 text-sm">
                      ₹{disbDetails.net_disbursement_amount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600 font-medium">Monthly EMI (P+I):</span>
                    <span className="font-bold text-purple-700">
                      ₹{disbDetails.monthly_emi?.toLocaleString()} / mo ({disbDetails.tenure_months} mos @ {disbDetails.interest_rate}%)
                    </span>
                  </div>
                </div>

                {/* Bank Account Mandate */}
                <div className="p-3 bg-[#F0F7FF] rounded-xl border border-blue-200 space-y-1">
                  <span className="text-[11px] font-bold text-blue-950 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600" /> Borrower Bank Account Mandate:
                  </span>
                  <div className="text-[11px] text-blue-900 font-mono font-medium">
                    {disbDetails.bank_details.bank_name} - A/C: {disbDetails.bank_details.account_number} (IFSC: {disbDetails.bank_details.ifsc})
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600">
                  <span className="font-bold text-slate-800">Atomic Process:</span> Executes demo RTGS/NEFT transaction, creates active Loan account in core ledger, generates {disbDetails.tenure_months}-installment repayment schedule, updates Customer Portal, and generates audit trail.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => setDisburseAppId(null)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => disburseMutation.mutate({ appId: disburseAppId, payload: { channel: 'NEFT/RTGS' } })}
                    disabled={disburseMutation.isPending}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{disburseMutation.isPending ? 'Processing Core Disbursal...' : 'Confirm Demo Disbursement'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: OPERATIONS ACTION MODAL (ASSIGN, ESCALATE, ADD NOTE) */}
      {/* ============================================================== */}
      {actionModalApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Operations Action — {actionModalApp.id}</h3>
              <button
                onClick={() => setActionModalApp(null)}
                className="text-slate-400 hover:text-slate-600 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-700 font-bold text-[11px] block mb-1">Select Action</label>
                <select
                  value={actionModalApp.action}
                  onChange={(e) => setActionModalApp({ ...actionModalApp, action: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-slate-300 text-slate-900 font-medium rounded-xl p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ADD_NOTE">Add Operational Note</option>
                  <option value="ASSIGN">Assign Officer</option>
                  <option value="REQUEST_INFORMATION">Request Information from Borrower</option>
                  <option value="ESCALATE">Escalate Exception to Operations Manager</option>
                  <option value="VERIFY">Mark Pre-Checks Verified</option>
                </select>
              </div>

              {actionModalApp.action === 'ASSIGN' && (
                <div>
                  <label className="text-slate-700 font-bold text-[11px] block mb-1">Target Officer Name</label>
                  <input
                    type="text"
                    value={targetOfficer}
                    onChange={(e) => setTargetOfficer(e.target.value)}
                    placeholder="e.g., Rajesh Operations"
                    className="w-full bg-[#F8FAFC] border border-slate-300 text-slate-900 font-medium rounded-xl p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {actionModalApp.action === 'ESCALATE' && (
                <div>
                  <label className="text-slate-700 font-bold text-[11px] block mb-1">Mandatory Escalation Reason</label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="e.g., Bank mandate mismatch / KYC anomaly detected"
                    className="w-full bg-[#F8FAFC] border border-slate-300 text-slate-900 font-medium rounded-xl p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-700 font-bold text-[11px] block mb-1">Notes / Instructions</label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Enter detailed remarks for audit trail..."
                  className="w-full bg-[#F8FAFC] border border-slate-300 text-slate-900 font-medium rounded-xl p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setActionModalApp(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => actionMutation.mutate({
                  appId: actionModalApp.id,
                  payload: {
                    action: actionModalApp.action,
                    notes: actionNotes,
                    reason: actionReason,
                    assigned_officer: targetOfficer
                  }
                })}
                disabled={actionMutation.isPending}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
              >
                {actionMutation.isPending ? 'Saving...' : 'Submit Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsPortalPage;
