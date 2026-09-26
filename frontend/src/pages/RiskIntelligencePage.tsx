import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, ShieldAlert, Sliders, TrendingUp, AlertTriangle, 
  Layers, MapPin, PieChart as PieIcon, RefreshCw, CheckCircle
} from 'lucide-react';
import { riskApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { RiskTrendChart } from '../components/dashboard/RiskTrendChart';

export const RiskIntelligencePage: React.FC = () => {
  // Configurable policy weights
  const [weights, setWeights] = useState({
    w_credit: 0.35,
    w_delinquency: 0.25,
    w_fraud: 0.15,
    w_liquidity: 0.15,
    w_concentration: 0.10,
  });

  const [activeWeights, setActiveWeights] = useState(weights);

  // Fetch macro portfolio risk
  const { data: portfolioRisk, isLoading: isRiskLoading, refetch: refetchPortfolio } = useQuery({
    queryKey: ['risk-portfolio', activeWeights],
    queryFn: () => riskApi.getPortfolio(activeWeights),
  });

  // Fetch emerging risk signals
  const { data: signalsData, isLoading: isSignalsLoading } = useQuery({
    queryKey: ['risk-signals'],
    queryFn: () => riskApi.getSignals(),
  });

  // Fetch 30-day historical trend
  const { data: trendData } = useQuery({
    queryKey: ['risk-trends'],
    queryFn: () => riskApi.getTrends(),
  });

  const handleApplyPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveWeights({ ...weights });
  };

  const resetDefaultWeights = () => {
    const defaults = {
      w_credit: 0.35,
      w_delinquency: 0.25,
      w_fraud: 0.15,
      w_liquidity: 0.15,
      w_concentration: 0.10,
    };
    setWeights(defaults);
    setActiveWeights(defaults);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="finsight-card p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-[#0B132B] text-white border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Risk Intelligence Agent (Portfolio Aggregator)</h2>
                <Badge variant={portfolioRisk?.risk_category === 'LOW' ? 'positive' : portfolioRisk?.risk_category === 'MODERATE' ? 'warning' : 'critical'}>
                  Risk Tier: {portfolioRisk?.risk_category || 'MODERATE'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                Institutional Macro Risk, HHI Concentration Indices, Multi-Agent Signal Synthesis & Dynamic Policy Tuning
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Composite Score:</span>{' '}
              <strong className="text-indigo-300">{portfolioRisk?.portfolio_risk_score?.toFixed(1) || 35.6} / 100</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Total Portfolio:</span>{' '}
              <strong className="text-emerald-400">₹{((portfolioRisk?.total_exposure_amount || 48000000) / 10000000).toFixed(2)} Cr</strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Concentration & Pillar Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Product HHI Index</span>
            <PieIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {portfolioRisk?.concentration?.product_hhi || 0.28}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">Moderate diversification</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Geographic HHI Index</span>
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {portfolioRisk?.concentration?.geo_hhi || 0.22}
          </div>
          <p className="text-[11px] text-blue-600 mt-1 font-medium">5 States diversified</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Gross Delinquency Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700">
            {portfolioRisk?.risk_drivers?.delinquency_rate_pct || 2.4}%
          </div>
          <p className="text-[11px] text-amber-600 mt-1 font-semibold">1-89 DPD book</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Severe Stress Signals</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700">
            {signalsData?.signals?.length || 3} Active
          </div>
          <p className="text-[11px] text-rose-600 mt-1 font-semibold">Under surveillance</p>
        </div>
      </div>

      {/* Interactive Risk Policy Configurator & Risk Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configurable Policy Weights Tuner (5 cols) */}
        <div className="lg:col-span-5 finsight-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" /> Configurable Policy Weights
              </h3>
              <p className="text-[11px] text-slate-500">Tune institutional risk weighting formula dynamically</p>
            </div>
            <button 
              onClick={resetDefaultWeights}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Reset
            </button>
          </div>

          <form onSubmit={handleApplyPolicy} className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Credit Default Weight (PD)</span>
                <span className="font-mono text-indigo-700 font-bold">{(weights.w_credit * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.05" max="0.60" step="0.05"
                value={weights.w_credit}
                onChange={(e) => setWeights({ ...weights, w_credit: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Delinquency Flow Weight</span>
                <span className="font-mono text-indigo-700 font-bold">{(weights.w_delinquency * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.05" max="0.60" step="0.05"
                value={weights.w_delinquency}
                onChange={(e) => setWeights({ ...weights, w_delinquency: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Fraud Anomaly Exposure</span>
                <span className="font-mono text-indigo-700 font-bold">{(weights.w_fraud * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.05" max="0.50" step="0.05"
                value={weights.w_fraud}
                onChange={(e) => setWeights({ ...weights, w_fraud: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Liquidity Buffer Stress</span>
                <span className="font-mono text-indigo-700 font-bold">{(weights.w_liquidity * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.05" max="0.50" step="0.05"
                value={weights.w_liquidity}
                onChange={(e) => setWeights({ ...weights, w_liquidity: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>HHI Concentration Penalty</span>
                <span className="font-mono text-indigo-700 font-bold">{(weights.w_concentration * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.00" max="0.40" step="0.05"
                value={weights.w_concentration}
                onChange={(e) => setWeights({ ...weights, w_concentration: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 mt-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-aggregate Portfolio Risk
            </button>
          </form>

          {/* Breakdown of Current Aggregated Drivers */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
            <div className="text-[11px] font-bold text-slate-700">Synthesized Risk Sub-Scores:</div>
            <div className="flex justify-between text-slate-600">
              <span>Credit Sub-Score:</span>
              <strong className="text-slate-900">{portfolioRisk?.sub_scores?.credit?.toFixed(1) || '32.0'}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delinquency Sub-Score:</span>
              <strong className="text-slate-900">{portfolioRisk?.sub_scores?.delinquency?.toFixed(1) || '24.0'}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Fraud Sub-Score:</span>
              <strong className="text-slate-900">{portfolioRisk?.sub_scores?.fraud?.toFixed(1) || '15.0'}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Liquidity Sub-Score:</span>
              <strong className="text-slate-900">{portfolioRisk?.sub_scores?.liquidity?.toFixed(1) || '30.0'}</strong>
            </div>
          </div>
        </div>

        {/* Right: Emerging Signals & Risk Drivers (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Risk Signals Alert Board */}
          <div className="finsight-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Early Warning Risk Signals
              </h3>
              <span className="text-[11px] text-slate-500">Autonomous multi-agent surveillance</span>
            </div>

            <div className="space-y-2.5">
              {isSignalsLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading risk signals...</div>
              ) : signalsData?.signals?.length ? (
                signalsData.signals.map((sig: any) => (
                  <div 
                    key={sig.id}
                    className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                      sig.severity === 'HIGH' || sig.severity === 'CRITICAL'
                        ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                        : sig.severity === 'MEDIUM'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : 'bg-blue-50/70 border-blue-200 text-blue-950'
                    }`}
                  >
                    <div className="mt-0.5">
                      <ShieldAlert className={`w-4 h-4 ${
                        sig.severity === 'HIGH' ? 'text-rose-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold">{sig.title}</span>
                        <Badge variant={sig.severity === 'HIGH' ? 'critical' : 'warning'}>
                          {sig.severity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed mb-1.5">
                        {sig.description}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-500 font-medium">
                        <span>Pillar: <strong>{sig.pillar}</strong></span>
                        <span>Exposure: <strong>₹{((sig.affected_exposure_cr || 1.2) * 10000000).toLocaleString('en-IN')}</strong></span>
                        <span>Action: <strong>{sig.recommended_action}</strong></span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">No high severity risk signals detected.</div>
              )}
            </div>
          </div>

          {/* Historical Trend Chart */}
          <div className="finsight-card p-4">
            <h3 className="text-xs font-bold text-slate-900 mb-2">30-Day Historical Risk Index Trajectory</h3>
            {trendData && <RiskTrendChart data={trendData} />}
          </div>
        </div>
      </div>
    </div>
  );
};
