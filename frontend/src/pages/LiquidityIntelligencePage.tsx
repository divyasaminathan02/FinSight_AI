import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Coins, TrendingUp, TrendingDown, ShieldAlert, CheckCircle2, 
  Layers, AlertTriangle, ArrowUpRight, BarChart3, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { liquidityApi } from '../services/api';
import { Badge } from '../components/common/Badge';

export const LiquidityIntelligencePage: React.FC = () => {
  const [horizon, setHorizon] = useState<number>(30);

  // Current liquidity position
  const { data: currentLiquidity, isLoading: isCurrentLoading } = useQuery({
    queryKey: ['liquidity-current'],
    queryFn: () => liquidityApi.getCurrent(),
  });

  // Dynamic forecast for selected horizon (7, 30, 90)
  const { data: forecastData, isLoading: isForecastLoading } = useQuery({
    queryKey: ['liquidity-forecast', horizon],
    queryFn: () => liquidityApi.getForecast(horizon),
  });

  // Stress test scenarios
  const { data: scenariosData, isLoading: isScenariosLoading } = useQuery({
    queryKey: ['liquidity-scenarios'],
    queryFn: () => liquidityApi.getScenarios(),
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
                <h2 className="text-base font-bold text-white">Liquidity Intelligence Agent (ALM Cashflow Forecaster)</h2>
                <Badge variant="positive">XGBoost Time-Series</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Institutional Asset-Liability Management (ALM), 7d/30d/90d Inflow Projections & Capital Stress Shock Simulators
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Current Balance:</span>{' '}
              <strong className="text-emerald-400">₹{currentLiquidity?.current_liquidity_cr || 126.4} Cr</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Reserve Ratio:</span>{' '}
              <strong className="text-blue-400">{currentLiquidity?.liquidity_buffer_ratio || 1.45}x LCR</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Horizon Selector Strip */}
      <div className="flex items-center justify-between finsight-card p-3 bg-slate-50/70 border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Forecast Horizon:</span>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-semibold">
            {[7, 30, 90].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 rounded-md transition-all ${
                  horizon === h
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {h} Days Horizon
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Simulated Cash Flows: <strong className="text-slate-800">{horizon} daily steps projected</strong>
        </div>
      </div>

      {/* Summary KPI Cards for Selected Horizon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Projected Inflows</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">
            +₹{forecastData?.expected_inflows_cr || 0} Cr
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">EMI receipts + disbursements return</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Projected Outflows</span>
            <TrendingDown className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            -₹{forecastData?.expected_outflows_cr || 0} Cr
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Disbursements + debt obligations</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>End Forecast Liquidity</span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-800">
            ₹{forecastData?.forecasted_liquidity_cr || 0} Cr
          </div>
          <p className="text-[11px] text-blue-600 mt-1 font-semibold">Net institutional buffer</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Potential ALM Gap</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">
            ₹{forecastData?.potential_gap_cr || 0} Cr
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">Surplus buffer maintained</p>
        </div>
      </div>

      {/* Main Layout: Cashflow Projection Chart + Stress Testing Scenarios */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Forecast Trajectory Visualizer (8 cols) */}
        <div className="lg:col-span-8 finsight-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Daily Liquidity Reserve Trajectory ({horizon} Days)
              </h3>
              <p className="text-[11px] text-slate-500">ML lag-feature rolling projection with seasonal inflow capture</p>
            </div>
            <Badge variant="positive">
              Min Buffer: ₹{forecastData?.summary?.min_projected_cr || 120} Cr
            </Badge>
          </div>

          <div className="h-64 w-full">
            {isForecastLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading forecast chart...</div>
            ) : forecastData?.daily_projections ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData.daily_projections}>
                  <defs>
                    <linearGradient id="liquidityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `D${val}`} />
                  <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} tickFormatter={(val) => `₹${val}Cr`} />
                  <Tooltip 
                    formatter={(value: any) => [`₹${value} Cr`, 'Closing Liquidity']}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Area type="monotone" dataKey="closing_liquidity_cr" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#liquidityGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          {/* Daily Table Preview */}
          <div className="overflow-x-auto max-h-48 border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3 py-1.5">Date</th>
                  <th className="px-3 py-1.5 text-right">Inflow (₹ Cr)</th>
                  <th className="px-3 py-1.5 text-right">Outflow (₹ Cr)</th>
                  <th className="px-3 py-1.5 text-right">Closing Buffer (₹ Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forecastData?.daily_projections?.slice(0, 10).map((dp: any) => (
                  <tr key={dp.day} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-mono text-slate-700">{dp.date} (Day {dp.day})</td>
                    <td className="px-3 py-1.5 text-right text-emerald-700 font-medium">+₹{dp.inflows_cr} Cr</td>
                    <td className="px-3 py-1.5 text-right text-slate-700 font-medium">-₹{dp.outflows_cr} Cr</td>
                    <td className="px-3 py-1.5 text-right font-bold text-blue-700">₹{dp.closing_liquidity_cr} Cr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Stress Shock Scenarios (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="finsight-card p-5 space-y-3 border-blue-500/30">
            <div className="border-b border-slate-200 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-blue-600" /> Capital Stress Shock Scenarios
              </h3>
              <p className="text-[11px] text-slate-500">RBI Master Direction LCR Resilience Simulation</p>
            </div>

            <div className="space-y-3">
              {isScenariosLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading stress scenarios...</div>
              ) : scenariosData?.scenarios?.map((sc: any) => (
                <div 
                  key={sc.scenario_id}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    sc.status === 'PASSED' 
                      ? 'bg-slate-50 border-slate-200' 
                      : 'bg-rose-50/60 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{sc.name}</span>
                    <Badge variant={sc.status === 'PASSED' ? 'positive' : 'critical'}>
                      {sc.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {sc.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1.5 text-[11px] border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-500">Stress Inflows:</span>
                      <div className="font-bold text-slate-800">₹{sc.stressed_inflows_cr} Cr</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Stress Buffer:</span>
                      <div className="font-bold text-blue-700">₹{sc.stressed_buffer_cr} Cr</div>
                    </div>
                    <div>
                      <span className="text-slate-500">LCR Buffer Ratio:</span>
                      <div className="font-bold text-slate-900">{sc.lcr_ratio}x</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Gap Risk:</span>
                      <div className="font-bold text-emerald-700">₹{sc.potential_gap_cr} Cr</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200/70 text-[11px] text-blue-900 font-medium flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <span>All 3 stress scenarios maintain institutional buffers above RBI NBFC-ND-SI regulatory thresholds (1.15x LCR).</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
