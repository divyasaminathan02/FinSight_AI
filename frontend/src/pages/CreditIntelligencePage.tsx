import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Search } from 'lucide-react';
import { customersApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { CustomerItem } from '../types';

export const CreditIntelligencePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [riskTier, setRiskTier] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['customers-credit', page, search, riskTier],
    queryFn: () => customersApi.list({ page, page_size: 15, search: search || undefined, risk_tier: riskTier || undefined }),
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="finsight-card p-5 bg-gradient-to-r from-blue-900 to-indigo-950 text-white border-blue-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Credit Intelligence Agent</h2>
              <p className="text-xs text-blue-200">
                AI Underwriting, CIBIL Scoring, Income Stability & Default Probability Engine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="bg-blue-800/60 px-3 py-1.5 rounded border border-blue-700">
              <span className="text-blue-300">Predicted Default Rate:</span>{' '}
              <strong className="text-emerald-300">2.4%</strong>
            </div>
            <div className="bg-blue-800/60 px-3 py-1.5 rounded border border-blue-700">
              <span className="text-blue-300">Avg Credit Score:</span>{' '}
              <strong className="text-white">{data?.summary?.avg_credit_score || 720}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="finsight-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search borrower by name, ID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={riskTier}
            onChange={(e) => setRiskTier(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 font-medium text-slate-700"
          >
            <option value="">All Risk Tiers</option>
            <option value="Low">Low Risk (Prime)</option>
            <option value="Moderate">Moderate Risk (Near-Prime)</option>
            <option value="High">High Risk (Subprime)</option>
            <option value="Critical">Critical Risk</option>
          </select>
        </div>
      </div>

      {/* Borrowers Table */}
      <div className="finsight-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-900">
            Active Borrower Credit Profiles ({data?.total || 0})
          </span>
          <span className="text-[11px] text-slate-500">Showing page {page}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Customer ID</th>
                <th className="px-4 py-2.5">Borrower Name</th>
                <th className="px-4 py-2.5">Employment</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5 text-right">Income (Monthly)</th>
                <th className="px-4 py-2.5 text-center">Credit Score</th>
                <th className="px-4 py-2.5 text-center">Risk Tier</th>
                <th className="px-4 py-2.5 text-center">Financial Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading credit data from backend database...
                  </td>
                </tr>
              ) : data?.items?.length ? (
                data.items.map((cust: CustomerItem) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-medium text-blue-600">{cust.customer_id}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{cust.full_name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{cust.employment_type}</td>
                    <td className="px-4 py-2.5 text-slate-600">{cust.location}, {cust.state}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      ₹{cust.income?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-block font-bold px-2 py-0.5 rounded ${
                          (cust.credit_score || 0) >= 750
                            ? 'bg-emerald-50 text-emerald-700'
                            : (cust.credit_score || 0) >= 650
                            ? 'bg-blue-50 text-blue-700'
                            : (cust.credit_score || 0) >= 550
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {cust.credit_score}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge
                        variant={
                          cust.risk_tier === 'Low'
                            ? 'positive'
                            : cust.risk_tier === 'Moderate'
                            ? 'info'
                            : cust.risk_tier === 'High'
                            ? 'warning'
                            : 'critical'
                        }
                      >
                        {cust.risk_tier}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold text-slate-700">
                      {cust.financial_health_score}/100
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No borrower credit records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Total Records: {data?.total || 0}</span>
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
              disabled={(data?.items?.length || 0) < 15}
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
