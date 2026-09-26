import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PiggyBank } from 'lucide-react';
import { loansApi, dashboardApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { LoanItem } from '../types';

export const CollectionsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: loansData, isLoading } = useQuery({
    queryKey: ['loans-collections', page, statusFilter],
    queryFn: () => loansApi.list({ page, page_size: 15, status: statusFilter || undefined }),
  });

  const { data: collectionsMetrics } = useQuery({
    queryKey: ['collections-metrics'],
    queryFn: dashboardApi.getCollections,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="finsight-card p-5 bg-gradient-to-r from-teal-950 via-slate-900 to-[#0B132B] text-white border-teal-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Collections Intelligence Agent</h2>
                <Badge variant="positive">Status: Improving</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Autonomous Recovery Optimization, DPD Flow-to-Loss Control & Smart Contact Allocator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Collection Efficiency:</span>{' '}
              <strong className="text-emerald-400">{collectionsMetrics?.collection_efficiency_pct || 94.7}%</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">At-Risk Receivables:</span>{' '}
              <strong className="text-amber-400">₹{collectionsMetrics?.at_risk_receivables_cr || 18.4} Cr</strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="finsight-card p-4.5 bg-emerald-50/20 border-emerald-200">
          <div className="text-xs font-bold text-emerald-900">Current Month Recoveries</div>
          <div className="text-2xl font-black text-emerald-950 mt-1">₹42.8 Cr</div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">88.4% first-pass resolution rate</p>
        </div>

        <div className="finsight-card p-4.5 bg-amber-50/20 border-amber-200">
          <div className="text-xs font-bold text-amber-900">Bucket 1 (1-30 DPD) Book</div>
          <div className="text-2xl font-black text-amber-950 mt-1">₹3.4 Cr</div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">Automated WhatsApp & Voice Bots active</p>
        </div>

        <div className="finsight-card p-4.5 bg-blue-50/20 border-blue-200">
          <div className="text-xs font-bold text-blue-900">NPA Recovery Velocity</div>
          <div className="text-2xl font-black text-blue-950 mt-1">+14.2%</div>
          <p className="text-[11px] text-blue-700 font-medium mt-1">Faster time-to-settlement vs manual</p>
        </div>
      </div>

      {/* Overdue Loans Portfolio Table */}
      <div className="finsight-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">Active Loan Repayments & DPD Tracking</h3>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none font-medium"
            >
              <option value="">All Loans</option>
              <option value="Active">Active (Current)</option>
              <option value="Delinquent">Delinquent (1-89 DPD)</option>
              <option value="NPA">NPA (90+ DPD)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Loan ID</th>
                <th className="px-4 py-2.5">Borrower</th>
                <th className="px-4 py-2.5">Product Type</th>
                <th className="px-4 py-2.5 text-right">Loan Amount</th>
                <th className="px-4 py-2.5 text-right">EMI</th>
                <th className="px-4 py-2.5 text-center">DPD</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-center">Recovery Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading loan portfolio data...
                  </td>
                </tr>
              ) : loansData?.items?.length ? (
                loansData.items.map((loan: LoanItem) => (
                  <tr key={loan.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-blue-600 font-medium">{loan.loan_id}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{loan.customer_name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{loan.product_type}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      ₹{loan.loan_amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      ₹{loan.emi?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          loan.dpd === 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : loan.dpd <= 30
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {loan.dpd} DPD
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge
                        variant={
                          loan.status === 'Active'
                            ? 'positive'
                            : loan.status === 'Delinquent'
                            ? 'warning'
                            : 'critical'
                        }
                      >
                        {loan.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600 text-[11px]">
                      {loan.dpd === 0
                        ? 'Auto-Debit NACH'
                        : loan.dpd <= 30
                        ? 'WhatsApp + Voice Bot'
                        : 'Field Visit & Notice'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No loan records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Total Records: {loansData?.total || 0}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-800">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(loansData?.items?.length || 0) < 15}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
