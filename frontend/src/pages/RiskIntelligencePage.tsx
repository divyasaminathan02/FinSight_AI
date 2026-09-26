import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { dashboardApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { RiskTrendChart } from '../components/dashboard/RiskTrendChart';

export const RiskIntelligencePage: React.FC = () => {
  const { data: trendData } = useQuery({
    queryKey: ['risk-trend'],
    queryFn: dashboardApi.getRiskTrend,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="finsight-card p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-[#0B132B] text-white border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Risk Intelligence Agent</h2>
                <Badge variant="neutral">Status: Monitoring</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Institutional Portfolio Macro Risk, Segmental Concentration & Early Stress Signals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Portfolio Stress:</span>{' '}
              <strong className="text-emerald-400">Moderate (48.5)</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Emerging Signals:</span>{' '}
              <strong className="text-amber-400">4 Signals</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          {trendData && <RiskTrendChart data={trendData} />}
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="finsight-card p-4.5">
            <h3 className="text-xs font-bold text-slate-900 mb-2">Regional Risk Concentration</h3>
            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>South Region (TN / KA)</span>
                  <span className="font-bold text-amber-600">38.4% Book</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '38.4%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>West Region (MH / GJ)</span>
                  <span className="font-bold text-emerald-600">31.2% Book</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '31.2%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>North Region (NCR / RJ)</span>
                  <span className="font-bold text-blue-600">22.1% Book</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '22.1%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="finsight-card p-4.5 bg-blue-50/30 border-blue-200">
            <h3 className="text-xs font-bold text-blue-950 mb-1">Autonomous Risk Hedging</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Risk agent calibrated underwriting LTV caps down 5% for South Region vehicle loans to contain localized delinquency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
