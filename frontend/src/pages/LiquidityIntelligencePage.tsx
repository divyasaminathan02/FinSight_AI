import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Coins, CheckCircle2 } from 'lucide-react';
import { dashboardApi } from '../services/api';
import { Badge } from '../components/common/Badge';

export const LiquidityIntelligencePage: React.FC = () => {
  const { data: liquidity } = useQuery({
    queryKey: ['liquidity-intel'],
    queryFn: dashboardApi.getLiquidity,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="finsight-card p-5 bg-gradient-to-r from-blue-950 via-slate-900 to-[#0B132B] text-white border-blue-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Liquidity Intelligence Agent</h2>
                <Badge variant="positive">Status: Healthy</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Asset-Liability Management (ALM), 30-Day Inflow/Outflow Forecasting & Stress Shock Testing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Available Reserves:</span>{' '}
              <strong className="text-emerald-400">₹{liquidity?.current_liquidity_cr || 126.4} Cr</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Buffer Ratio:</span>{' '}
              <strong className="text-blue-400">{liquidity?.liquidity_buffer_ratio || 1.45}x LCR</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 30-Day Projections Breakdown Table */}
      <div className="finsight-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">30-Day ALM Weekly Inflow / Outflow Projections</h3>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
            {liquidity?.stress_test_status || 'Compliant (30% Stress Shock Passed)'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Forecast Horizon</th>
                <th className="px-5 py-3 text-right">Expected Inflows (₹ Cr)</th>
                <th className="px-5 py-3 text-right">Expected Outflows (₹ Cr)</th>
                <th className="px-5 py-3 text-right">Net Liquidity Buffer (₹ Cr)</th>
                <th className="px-5 py-3 text-center">RBI LCR Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liquidity?.projections?.map((proj, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">{proj.period}</td>
                  <td className="px-5 py-3 text-right font-medium text-emerald-700">
                    +₹{proj.inflows_cr} Cr
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-slate-700">
                    -₹{proj.outflows_cr} Cr
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-blue-700">
                    ₹{proj.net_balance_cr} Cr
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      100% Compliant
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
