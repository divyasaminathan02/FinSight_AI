import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  ShieldCheck,
  RefreshCw,
  Coins,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Eye,
  SlidersHorizontal,
  UserCheck,
  Flag,
  PlusCircle,
  HelpCircle,
  Check
} from 'lucide-react';
import { financeApi } from '../services/api';
import { FinanceOverviewData } from '../types';

export const FinancePortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reconciliation' | 'manager' | 'overview'>('dashboard');

  // Filters for Transactions
  const [txTypeFilter, setTxTypeFilter] = useState<string>('');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('');

  // Selected Transaction Modals
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [adjustmentTxnId, setAdjustmentTxnId] = useState<string | null>(null);
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjType, setAdjType] = useState<string>('CREDIT_ADJUSTMENT');
  const [adjReason, setAdjReason] = useState<string>('');

  // 1. Finance Overview (Original endpoint preserved)
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<FinanceOverviewData>({
    queryKey: ['finance-overview'],
    queryFn: () => financeApi.getOverview(),
  });

  // 2. Product Performance
  const { data: prodData } = useQuery({
    queryKey: ['finance-product-performance'],
    queryFn: () => financeApi.getProductPerformance(),
  });

  // 3. Finance Real Dashboard KPIs (Prompt 5)
  const { data: dashData, isLoading: dashLoading, refetch: refetchDash } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: () => financeApi.getDashboard(),
  });

  // 4. Finance Transactions Ledger
  const { data: txData, isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ['finance-transactions', txTypeFilter, txStatusFilter],
    queryFn: () => financeApi.getTransactions({
      transaction_type: txTypeFilter || undefined,
      status: txStatusFilter || undefined,
      page_size: 30
    }),
  });

  // 5. Transaction Details Dossier
  const { data: txnDetails, isLoading: txnDetailsLoading } = useQuery({
    queryKey: ['finance-txn-details', selectedTxnId],
    queryFn: () => selectedTxnId ? financeApi.getTransactionDetails(selectedTxnId) : null,
    enabled: !!selectedTxnId
  });

  // 6. Reconciliation Batch Items
  const { data: reconData, refetch: refetchRecon } = useQuery({
    queryKey: ['finance-reconciliation'],
    queryFn: () => financeApi.getReconciliation(),
    enabled: activeTab === 'reconciliation'
  });

  // 7. Finance Manager Dashboard
  const { data: mgrData } = useQuery({
    queryKey: ['finance-manager-dashboard'],
    queryFn: () => financeApi.getManagerDashboard(),
    enabled: activeTab === 'manager'
  });

  // Actions Mutations
  const verifyTxnMutation = useMutation({
    mutationFn: (txnId: string) => financeApi.verifyTransaction(txnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      if (selectedTxnId) setSelectedTxnId(null);
    }
  });

  const flagTxnMutation = useMutation({
    mutationFn: ({ txnId, reason }: { txnId: string; reason: string }) =>
      financeApi.flagTransaction(txnId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      if (selectedTxnId) setSelectedTxnId(null);
    }
  });

  const adjustmentMutation = useMutation({
    mutationFn: ({ txnId, amount, type, reason }: { txnId: string; amount: number; type: string; reason: string }) =>
      financeApi.addAdjustment(txnId, { amount, adjustment_type: type, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      setAdjustmentTxnId(null);
      setAdjAmount('');
      setAdjReason('');
      alert('Financial adjustment posted and immutable audit event recorded.');
    },
    onError: (err: any) => {
      alert(`Adjustment Failed: ${err?.response?.data?.detail || err.message}`);
    }
  });

  const overdueMutation = useMutation({
    mutationFn: () => financeApi.detectOverdue(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      alert(res.message);
    }
  });

  const kpis = overviewData?.kpis;
  const aging = overviewData?.aging_buckets;
  const cashFlows = overviewData?.cash_flow_trend || [];
  const products = prodData?.products || [];
  const transactions = txData?.transactions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Finance, Treasury & Ledger Portal</h1>
            <p className="text-xs text-slate-400">
              Institutional disbursements, transaction verification, bank reconciliation, financial adjustments & ledger balance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'transactions' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ledger Transactions
            </button>
            <button
              onClick={() => setActiveTab('reconciliation')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'reconciliation' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Reconciliation
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'manager' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Finance Manager
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'overview' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              P&L & Analytics
            </button>
          </div>

          <button
            onClick={() => { refetchDash(); refetchTx(); refetchOverview(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Real Backend Finance KPI Grid (Prompt 5) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Total Capital Disbursed</span>
          <div className="text-xl font-bold text-white tracking-tight">
            ₹{((dashData?.total_disbursed || 0) / 10000000).toFixed(2)} <span className="text-xs font-normal text-slate-400">Cr</span>
          </div>
          <div className="text-[10px] text-emerald-400">₹{((dashData?.today_disbursement || 0) / 100000).toFixed(1)}L today</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Active Outstanding AUM</span>
          <div className="text-xl font-bold text-blue-400 tracking-tight">
            ₹{((dashData?.outstanding_principal || 0) / 10000000).toFixed(2)} <span className="text-xs font-normal text-slate-400">Cr</span>
          </div>
          <div className="text-[10px] text-slate-500">{dashData?.active_loans ?? 0} active loans</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Payments Collected</span>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            ₹{((dashData?.payments_received || 0) / 100000).toFixed(1)} <span className="text-xs font-normal text-slate-400">Lakh</span>
          </div>
          <div className="text-[10px] text-emerald-400/80">EMI repayments</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Overdue Repayments</span>
          <div className="text-xl font-bold text-amber-400 tracking-tight">
            ₹{((dashData?.overdue_amount || 0) / 100000).toFixed(1)} <span className="text-xs font-normal text-slate-400">Lakh</span>
          </div>
          <div className="text-[10px] text-amber-400/80">Awaiting clearance</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Pending Reconciliation</span>
          <div className="text-xl font-bold text-purple-400 tracking-tight">
            {dashData?.pending_reconciliation ?? 0}
          </div>
          <div className="text-[10px] text-slate-500">{dashData?.failed_payments?.count ?? 0} failed attempts</div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: FINANCE OFFICER DASHBOARD */}
      {/* ============================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Monthly Capital Deployment</span>
                <span className="text-xs font-semibold text-emerald-400">This Month</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ₹{((dashData?.monthly_disbursement || 0) / 100000).toFixed(1)} Lakh
              </div>
              <p className="text-[11px] text-slate-400">Sum of successful demo disbursements credited to borrower bank accounts</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Interest Receivable</span>
                <span className="text-xs font-semibold text-purple-400">Accrued</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">
                ₹{((dashData?.interest_receivable || 0) / 100000).toFixed(1)} Lakh
              </div>
              <p className="text-[11px] text-slate-400">Estimated interest accrual across active portfolio schedules</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Automated Overdue Audit</span>
                <button
                  onClick={() => overdueMutation.mutate()}
                  disabled={overdueMutation.isPending}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  {overdueMutation.isPending ? 'Auditing...' : 'Run Scan'}
                </button>
              </div>
              <div className="text-2xl font-bold text-amber-400">
                ₹{((dashData?.overdue_amount || 0) / 100000).toFixed(1)} L
              </div>
              <p className="text-[11px] text-slate-400">Identifies installments where current date &gt; due date and flags collections</p>
            </div>
          </div>

          {/* Quick Recent Transactions Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" /> Recent Core Ledger Transactions
              </h3>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                View Full Ledger &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Transaction Ref</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {transactions.slice(0, 6).map((tx: any) => (
                    <tr key={tx.transaction_id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-medium text-white">{tx.transaction_id}</td>
                      <td className="py-2.5 px-3 text-slate-200">{tx.customer_name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.transaction_type === 'DISBURSEMENT' ? 'bg-purple-950 text-purple-300' : 'bg-emerald-950 text-emerald-300'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">₹{tx.amount?.toLocaleString()}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{tx.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: TRANSACTIONS LEDGER (PROMPT 5) */}
      {/* ============================================================== */}
      {activeTab === 'transactions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filters:
              </span>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs"
              >
                <option value="">All Types</option>
                <option value="DISBURSEMENT">Disbursement</option>
                <option value="EMI_PAYMENT">EMI Repayment</option>
                <option value="REFUND">Refund</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="FEE">Fee</option>
                <option value="PENALTY">Penalty</option>
              </select>

              <select
                value={txStatusFilter}
                onChange={(e) => setTxStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="FLAGGED">Flagged</option>
              </select>

              {(txTypeFilter || txStatusFilter) && (
                <button
                  onClick={() => { setTxTypeFilter(''); setTxStatusFilter(''); }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer ml-1"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Showing <span className="text-white font-bold">{transactions.length}</span> financial ledger transactions
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3">Transaction ID</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Loan Account</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Reconciliation</th>
                  <th className="py-3 px-3">Reference / UTR</th>
                  <th className="py-3 px-3">Created By</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {txLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-500">
                      Loading ledger transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-500">
                      No transactions found matching current filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx: any) => (
                    <tr key={tx.transaction_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-white">
                        {tx.transaction_id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-white">{tx.customer_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tx.customer_id}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-purple-300">
                        {tx.loan_id}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.transaction_type === 'DISBURSEMENT'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : tx.transaction_type.includes('EMI')
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        ₹{tx.amount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tx.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tx.reconciliation_status === 'MATCHED'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {tx.reconciliation_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {tx.reference}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {tx.created_by}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTxnId(tx.transaction_id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs cursor-pointer"
                            title="View Transaction Dossier"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          <button
                            onClick={() => setAdjustmentTxnId(tx.transaction_id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs cursor-pointer flex items-center gap-1"
                            title="Post Financial Adjustment"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                            <span>Adjust</span>
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

      {/* ============================================================== */}
      {/* TAB 3: RECONCILIATION WORKFLOW */}
      {/* ============================================================== */}
      {activeTab === 'reconciliation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" /> Bank Statement Reconciliation Batch
              </h3>
              <p className="text-xs text-slate-400">Automated matching of core ledger records against bank clearing feeds</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-xl border border-amber-800">
                {reconData?.unmatched_count || 0} Unmatched / Exceptions
              </span>
              <button
                onClick={() => refetchRecon()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Re-Run Batch
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Batch Ref</th>
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">UTR Reference</th>
                  <th className="py-2.5 px-3">Expected Amount</th>
                  <th className="py-2.5 px-3">Received Amount</th>
                  <th className="py-2.5 px-3">Difference</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(reconData?.reconciliation_items || []).map((r: any) => (
                  <tr key={r.recon_id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-300">{r.recon_id}</td>
                    <td className="py-2.5 px-3 font-mono text-purple-300">{r.transaction_id}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{r.reference}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">₹{r.expected_amount?.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">₹{r.received_amount?.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-bold">
                      {r.difference === 0 ? (
                        <span className="text-emerald-400">₹0.00</span>
                      ) : (
                        <span className="text-rose-400">-₹{r.difference?.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.reconciliation_status === 'MATCHED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400 animate-pulse'
                      }`}>
                        {r.reconciliation_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {r.reconciliation_status !== 'MATCHED' && (
                        <button
                          onClick={() => verifyTxnMutation.mutate(r.transaction_id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Clear Variance
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: FINANCE MANAGER EXECUTIVE DESK */}
      {/* ============================================================== */}
      {activeTab === 'manager' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
              <span className="text-xs text-slate-400">Total Capital Disbursed</span>
              <div className="text-2xl font-bold text-white">
                ₹{((mgrData?.total_disbursement || 0) / 10000000).toFixed(2)} Cr
              </div>
              <p className="text-[10px] text-slate-500">Cumulative sanctioned volume</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
              <span className="text-xs text-slate-400">Total Collections</span>
              <div className="text-2xl font-bold text-emerald-400">
                ₹{((mgrData?.total_collections || 0) / 100000).toFixed(1)} Lakh
              </div>
              <p className="text-[10px] text-slate-500">Recovered principal & interest</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
              <span className="text-xs text-slate-400">Overdue Portfolio</span>
              <div className="text-2xl font-bold text-rose-400">
                ₹{((mgrData?.overdue_portfolio || 0) / 100000).toFixed(1)} Lakh
              </div>
              <p className="text-[10px] text-slate-500">Non-standard facilities</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
              <span className="text-xs text-slate-400">Pending Finance Exceptions</span>
              <div className="text-2xl font-bold text-purple-400">
                {mgrData?.finance_exceptions || 0}
              </div>
              <p className="text-[10px] text-slate-500">Adjustments awaiting sign-off</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white">Finance Team Activity & Verification Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(mgrData?.team_activity || []).map((t: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{t.officer}</div>
                    <div className="text-[10px] text-slate-400">{t.role}</div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                    {t.verified_txns} Verified
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: P&L AND PRODUCT ANALYTICS (ORIGINAL PRESERVED) */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aging Buckets */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" /> IRAC Aging & Provisioning Buckets (RBI Norms)
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs p-2 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-300">Standard Assets (0 DPD, 0.4% Provision)</span>
                  <span className="font-bold text-emerald-400">₹{aging?.standard_cr || 0} Cr</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-300">SMA-1 (1-30 DPD, 5% Provision)</span>
                  <span className="font-bold text-blue-400">₹{aging?.bucket1_1_30_dpd_cr || 0} Cr</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-300">SMA-2 (31-60 DPD, 15% Provision)</span>
                  <span className="font-bold text-amber-400">₹{aging?.bucket2_31_60_dpd_cr || 0} Cr</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-300">SMA-3 (61-90 DPD, 30% Provision)</span>
                  <span className="font-bold text-orange-400">₹{aging?.bucket3_61_90_dpd_cr || 0} Cr</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-300">NPA (90+ DPD, 70% Provision)</span>
                  <span className="font-bold text-rose-400">₹{aging?.npa_90_plus_cr || 0} Cr</span>
                </div>
              </div>
            </div>

            {/* Product Performance Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" /> Facility Yield & Performance Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-2.5">Product Line</th>
                      <th className="py-2 px-2.5">Disbursed</th>
                      <th className="py-2 px-2.5">Yield</th>
                      <th className="py-2 px-2.5">Avg DPD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {products.map((p: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 px-2.5 font-medium text-white">{p.product_type}</td>
                        <td className="py-2 px-2.5">₹{p.disbursed_cr} Cr</td>
                        <td className="py-2 px-2.5 font-bold text-emerald-400">{p.avg_interest_rate}%</td>
                        <td className="py-2 px-2.5 text-slate-400">{p.avg_dpd}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: TRANSACTION DETAILS & AUDIT TRAIL DOSSIER */}
      {/* ============================================================== */}
      {selectedTxnId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm">Transaction Dossier — {selectedTxnId}</h3>
              <button
                onClick={() => setSelectedTxnId(null)}
                className="text-slate-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {txnDetailsLoading ? (
              <div className="py-8 text-center text-slate-400">Loading ledger record...</div>
            ) : txnDetails ? (
              <div className="space-y-3">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Borrower:</span>
                    <span className="font-semibold text-white">{txnDetails.customer?.name} ({txnDetails.customer?.customer_id})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Loan Facility:</span>
                    <span className="font-mono text-purple-300">{txnDetails.loan?.loan_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount:</span>
                    <span className="font-bold text-emerald-400 text-sm">₹{txnDetails.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Transaction Type:</span>
                    <span className="font-semibold text-white">{txnDetails.transaction_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Channel / Reference:</span>
                    <span className="font-mono text-slate-300">{txnDetails.channel} ({txnDetails.reference})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="text-slate-300">{txnDetails.timestamp}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-slate-300">Immutable Audit Trail:</span>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 max-h-36 overflow-y-auto space-y-1.5">
                    {txnDetails.audit_history?.length === 0 ? (
                      <div className="text-slate-500 text-[11px]">No audit logs recorded for this transaction.</div>
                    ) : (
                      txnDetails.audit_history?.map((a: any, i: number) => (
                        <div key={i} className="text-[11px] border-b border-slate-900 pb-1">
                          <span className="font-bold text-purple-300">{a.action}</span> -{' '}
                          <span className="text-slate-400">{a.timestamp}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    onClick={() => flagTxnMutation.mutate({ txnId: selectedTxnId, reason: 'Flagged by Finance Officer' })}
                    className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl cursor-pointer"
                  >
                    Flag Transaction
                  </button>
                  <button
                    onClick={() => verifyTxnMutation.mutate(selectedTxnId)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Mark Verified
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: FINANCIAL ADJUSTMENT MODAL (MANDATORY REASON + AUDIT) */}
      {/* ============================================================== */}
      {adjustmentTxnId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm">Post Financial Adjustment</h3>
              <button
                onClick={() => setAdjustmentTxnId(null)}
                className="text-slate-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Adjustment Type</label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2 text-xs"
                >
                  <option value="CREDIT_ADJUSTMENT">Credit Adjustment (Reduce Balance / Waiver)</option>
                  <option value="DEBIT_ADJUSTMENT">Debit Adjustment (Charge Correction)</option>
                  <option value="FEE_WAIVER">Processing / Late Fee Waiver</option>
                  <option value="INTEREST_CORRECTION">Interest Rate Correction</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Adjustment Amount (INR)</label>
                <input
                  type="number"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Mandatory Business Reason</label>
                <textarea
                  rows={3}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="State the regulatory or operational rationale for this adjustment..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setAdjustmentTxnId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => adjustmentMutation.mutate({
                  txnId: adjustmentTxnId,
                  amount: parseFloat(adjAmount || '0'),
                  type: adjType,
                  reason: adjReason
                })}
                disabled={adjustmentMutation.isPending || !adjAmount || !adjReason}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {adjustmentMutation.isPending ? 'Posting...' : 'Post Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePortalPage;
