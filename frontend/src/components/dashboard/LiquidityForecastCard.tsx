import React from 'react';
import { Coins, ShieldCheck, TrendingUp, ArrowRight } from 'lucide-react';
import { LiquidityForecastData } from '../../types';
import { Badge } from '../common/Badge';

interface LiquidityForecastCardProps {
  data: LiquidityForecastData;
}

export const LiquidityForecastCard: React.FC<LiquidityForecastCardProps> = ({ data }) => {
  return (
    <div className="finsight-card p-5 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Liquidity Forecast</h2>
              <p className="text-xs text-slate-500">30-Day ALM cash flow & regulatory buffer</p>
            </div>
          </div>
          <Badge variant="positive" pulse>
            {data?.forecast_status || 'Stable'}
          </Badge>
        </div>

        {/* Big Highlight Banner: Current Liquidity ₹126.4 Cr */}
        <div className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-lg border border-blue-200/80 mb-4">
          <div className="text-[11px] uppercase font-bold text-blue-900 tracking-wider">
            Available Liquidity Buffer
          </div>
          <div className="text-2xl font-black text-blue-950 mt-0.5 flex items-baseline gap-2">
            <span>{data?.current_liquidity_formatted || '₹126.4 Cr'}</span>
            <span className="text-xs font-semibold text-blue-700">1.45x RBI LCR buffer</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-blue-800 font-medium mt-2 pt-1.5 border-t border-blue-200/60">
            <span>Stress Test Status:</span>
            <span className="font-bold text-emerald-700">{data?.stress_test_status || 'Compliant (Shock-Proof)'}</span>
          </div>
        </div>

        {/* 4 Metrics: Inflows, Outflows, Forecasted */}
        <div className="grid grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 bg-gradient-to-br from-white to-[#F0F7FF] rounded-xl border border-blue-100 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-600">Expected Inflows</div>
            <div className="text-sm font-bold text-emerald-700 mt-0.5">₹{data?.expected_inflows_cr || 94.8} Cr</div>
            <div className="text-[10px] text-slate-500 mt-0.5">EMI Repayments</div>
          </div>
          <div className="p-3 bg-gradient-to-br from-white to-[#F0F7FF] rounded-xl border border-blue-100 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-600">Expected Outflows</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">₹{data?.expected_outflows_cr || 94.8} Cr</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Disbursements & Debt</div>
          </div>
          <div className="p-3 bg-gradient-to-br from-white to-[#F0F7FF] rounded-xl border border-blue-100 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-600">30-Day Forecast</div>
            <div className="text-sm font-bold text-blue-700 mt-0.5">₹{data?.forecasted_liquidity_cr || 126.4} Cr</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Net Surplus</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Coverage Ratio: <strong className="text-slate-900">{data?.liquidity_buffer_ratio || 1.45}x</strong></span>
        <span className="text-blue-600 font-semibold cursor-pointer hover:underline flex items-center gap-1">
          <span>ALM Schedule</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
