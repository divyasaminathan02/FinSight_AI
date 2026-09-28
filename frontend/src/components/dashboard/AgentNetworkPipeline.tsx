import React from 'react';
import { ArrowRight, CheckCircle2, Zap, RefreshCw } from 'lucide-react';
import { AgentNetworkStatus } from '../../types';

interface AgentNetworkPipelineProps {
  network?: AgentNetworkStatus;
}

const DEFAULT_ORDER = [
  { name: 'Credit', desc: 'Risk Scores & DTI', latency: '84ms' },
  { name: 'Fraud', desc: 'Device & Velocity Hash', latency: '46ms' },
  { name: 'Customer', desc: 'Financial Health & Churn', latency: '112ms' },
  { name: 'Risk', desc: 'Macro Portfolio Signals', latency: '142ms' },
  { name: 'Collections', desc: 'DPD Strategy & Recovery', latency: '95ms' },
  { name: 'Liquidity', desc: 'ALM Inflows & Buffer', latency: '63ms' },
];

export const AgentNetworkPipeline: React.FC<AgentNetworkPipelineProps> = ({ network }) => {
  return (
    <div className="p-4 bg-linear-to-r from-blue-50/90 via-white to-blue-50/80 text-slate-800 border border-blue-200/80 rounded-xl shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shadow-2xs">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 tracking-tight">Coordinated Intelligence Pipeline</span>
            <span className="text-[11px] text-slate-500 ml-2 font-medium">Shared Financial Data Layer (Event-Driven Synchronization)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 bg-white border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-700">Sync: {network?.sync_rate || 99.8}%</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-medium">Latency: ~90ms avg</span>
        </div>
      </div>

      {/* Pipeline Sequence */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {DEFAULT_ORDER.map((step, idx) => {
          const isLast = idx === DEFAULT_ORDER.length - 1;
          return (
            <div key={step.name} className="relative">
              <div className="bg-white border border-blue-100 hover:border-blue-400 rounded-lg p-2.5 transition-all group shadow-2xs hover:shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {step.name}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                    {step.latency}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1 group-hover:text-slate-700 font-medium">
                  {step.desc}
                </p>
              </div>

              {!isLast && (
                <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
