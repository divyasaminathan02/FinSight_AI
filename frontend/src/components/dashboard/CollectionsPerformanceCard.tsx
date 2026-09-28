import React from 'react';
import { PiggyBank, ArrowUpRight, TrendingUp, CheckCircle2 } from 'lucide-react';
import { CollectionsPerformanceData } from '../../types';

interface CollectionsPerformanceCardProps {
  data: CollectionsPerformanceData;
}

export const CollectionsPerformanceCard: React.FC<CollectionsPerformanceCardProps> = ({ data }) => {
  const efficiency = data?.collection_efficiency_pct || 94.7;
  const target = data?.efficiency_target_pct || 96.0;

  return (
    <div className="finsight-card p-5 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Collections Performance</h2>
              <p className="text-xs text-slate-500">Autonomous recovery & DPD resolution rate</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +1.8% vs Target
            </span>
          </div>
        </div>

        {/* Big Highlight Banner: ₹42.8 Cr collected this month */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 rounded-lg border border-emerald-200/80 mb-4">
          <div className="text-[11px] uppercase font-bold text-emerald-900 tracking-wider">
            Monthly Recovery Target
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-0.5 flex items-baseline gap-2">
            <span>{data?.current_month_collected_formatted || '₹42.8 Cr'}</span>
            <span className="text-xs font-semibold text-emerald-700">collected this month</span>
          </div>
          <div className="w-full bg-emerald-200/60 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (data?.actual_collections_cr / (data?.expected_collections_cr || 45.2)) * 100)}%` }}
            />
          </div>
        </div>

        {/* 3 Metrics: Expected, Actual, At-Risk */}
        <div className="grid grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 bg-gradient-to-br from-white to-[#F0F7FF] rounded-xl border border-blue-100 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-600">Expected</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">₹{data?.expected_collections_cr || 45.2} Cr</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Due book</div>
          </div>
          <div className="p-3 bg-gradient-to-br from-white to-[#F0F7FF] rounded-xl border border-blue-100 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-600">Actual</div>
            <div className="text-sm font-bold text-emerald-700 mt-0.5">₹{data?.actual_collections_cr || 42.8} Cr</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Resolved</div>
          </div>
          <div className="p-3 bg-gradient-to-br from-white to-[#F0F7FF] rounded-xl border border-blue-100 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-600">At-Risk</div>
            <div className="text-sm font-bold text-amber-700 mt-0.5">₹{data?.at_risk_receivables_cr || 18.4} Cr</div>
            <div className="text-[10px] text-slate-500 mt-0.5">DPD 30+</div>
          </div>
        </div>
      </div>

      {/* Bucket distribution */}
      <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Collection Efficiency: <strong className="text-slate-900">{efficiency}%</strong></span>
        <span>Resolution Rate: <strong className="text-slate-900">{data?.resolution_rate_pct || 88.4}%</strong></span>
      </div>
    </div>
  );
};
