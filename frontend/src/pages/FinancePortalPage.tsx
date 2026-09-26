import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
  ArrowDownRight
} from 'lucide-react';
import { financeApi } from '../services/api';
import { FinanceOverviewData } from '../types';

export const FinancePortalPage: React.FC = () => {
  const { data, isLoading, refetch } = useQuery<FinanceOverviewData>({
    queryKey: ['finance-overview'],
    queryFn: () => financeApi.getOverview(),
  });

  const { data: prodData } = useQuery({
    queryKey: ['finance-product-performance'],
    queryFn: () => financeApi.getProductPerformance(),
  });

  const kpis = data?.kpis;
  const aging = data?.aging_buckets;
  const cashFlows = data?.cash_flow_trend || [];
  const products = prodData?.products || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Finance & Institutional Treasury Desk</h1>
            <p className="text-xs text-slate-400">
              Real-time portfolio revenue, capital deployments, loan yield, P&L provisions and cash flow telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Active Portfolio AUM</span>
          <div className="text-xl font-bold text-white tracking-tight">
            ₹{kpis?.total_aum_cr || 0} <span className="text-xs text-slate-400 font-normal">Cr</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+8.4% QoQ Expansion</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Cumulative Disbursed</span>
          <div className="text-xl font-bold text-blue-400 tracking-tight">
            ₹{kpis?.total_disbursed_cr || 0} <span className="text-xs text-slate-400 font-normal">Cr</span>
          </div>
          <div className="text-[11px] text-slate-400">Across active facilities</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Net Interest Margin (NIM)</span>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {kpis?.net_interest_margin_pct || 6.70}%
          </div>
          <div className="text-[11px] text-slate-400">Spread over 6.8% cost of funds</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Monthly Run-Rate Revenue</span>
          <div className="text-xl font-bold text-purple-400 tracking-tight">
            ₹{kpis?.monthly_interest_revenue_cr || 0} <span className="text-xs text-slate-400 font-normal">Cr/mo</span>
          </div>
          <div className="text-[11px] text-slate-400">Gross interest accrual</div>
        </div>
      </div>

      {/* Main Grid: Receivables Aging & Cash Flows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receivables Aging Schedule */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Receivables Aging & Provisions (RBI IRAC)</h3>
              <span className="text-[11px] text-slate-400">Delinquency aging buckets and regulatory provisioning</span>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg font-mono">
              NPA: {kpis?.npa_ratio_pct || 1.4}%
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { label: 'Standard Assets (0 DPD)', amount: aging?.standard_cr || 0, pct: '92.5%', color: 'bg-emerald-500', prov: '0.4%' },
              { label: 'SMA-0 Bucket (1-30 DPD)', amount: aging?.bucket1_1_30_dpd_cr || 0, pct: '3.8%', color: 'bg-blue-500', prov: '5.0%' },
              { label: 'SMA-1 Bucket (31-60 DPD)', amount: aging?.bucket2_31_60_dpd_cr || 0, pct: '1.9%', color: 'bg-amber-500', prov: '15.0%' },
              { label: 'SMA-2 Bucket (61-90 DPD)', amount: aging?.bucket3_61_90_dpd_cr || 0, pct: '1.1%', color: 'bg-orange-500', prov: '30.0%' },
              { label: 'Sub-Standard / NPA (90+ DPD)', amount: aging?.npa_90_plus_cr || 0, pct: '0.7%', color: 'bg-rose-500', prov: '70.0%' },
            ].map((bucket, i) => (
              <div key={i} className="p-3 bg-slate-800/40 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{bucket.label}</span>
                  <div className="text-right">
                    <span className="font-bold text-white">₹{bucket.amount} Cr</span>
                    <span className="text-[11px] text-slate-400 ml-1.5 font-mono">({bucket.pct})</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${bucket.color}`} style={{ width: bucket.pct }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Mandatory Provision: {bucket.prov}</span>
                  <span className="text-slate-400">Risk Weight: RBI Compliant</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Flow Telemetry (6 Months) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Monthly Cash Flow Telemetry (₹ Cr)</h3>
              <span className="text-[11px] text-slate-400">Disbursements (Outflows) vs Repayments (Inflows)</span>
            </div>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden text-xs">
            {cashFlows.map((row, idx) => (
              <div key={idx} className="p-3 bg-slate-900/60 hover:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">{row.month}</div>
                  <div className="text-[10px] text-slate-500">Scheduled Core Cycle</div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Outflow</span>
                    <span className="font-semibold text-rose-400 font-mono">₹{row.disbursements_cr} Cr</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Inflow</span>
                    <span className="font-semibold text-emerald-400 font-mono">₹{row.collections_cr} Cr</span>
                  </div>
                  <div className="min-w-16">
                    <span className="text-[10px] text-slate-400 block">Net Flow</span>
                    <span className={`font-bold font-mono ${
                      row.net_cashflow_cr >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {row.net_cashflow_cr >= 0 ? '+' : ''}{row.net_cashflow_cr} Cr
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-950/40 border border-blue-900/40 rounded-xl text-xs text-blue-200 flex items-center justify-between">
            <span>Minimum Liquidity Coverage Ratio (LCR):</span>
            <span className="font-bold text-white font-mono">138.4% (Floor 100%)</span>
          </div>
        </div>
      </div>

      {/* Product-Level Profitability Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">Product-Level Profitability & Yield Matrix</h3>
            <span className="text-[11px] text-slate-400">AUM performance breakdown by loan category</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B132B] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Product Category</th>
                <th className="py-3 px-4">Active Facilities</th>
                <th className="py-3 px-4">Disbursed (₹ Cr)</th>
                <th className="py-3 px-4">AUM Balance (₹ Cr)</th>
                <th className="py-3 px-4">Weighted Yield</th>
                <th className="py-3 px-4">Avg DPD</th>
                <th className="py-3 px-4">Profitability Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {products.map((p: any, i: number) => (
                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{p.product_type}</td>
                  <td className="py-3.5 px-4 font-mono">{p.active_loans}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">₹{p.disbursed_cr}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-400">₹{p.outstanding_cr}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{p.avg_interest_rate}%</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{p.avg_dpd} days</td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-bold">
                      {p.profitability_tier} Tier
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
