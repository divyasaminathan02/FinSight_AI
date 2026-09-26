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
    <div className="finsight-card p-4 bg-linear-to-r from-[#0B132B] via-[#111C3D] to-[#0B132B] text-white border-slate-800 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-tight">Coordinated Intelligence Pipeline</span>
            <span className="text-[11px] text-slate-400 ml-2">Shared Financial Data Layer (Event-Driven Synchronization)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-300">Sync: {network?.sync_rate || 99.8}%</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Latency: ~90ms avg</span>
        </div>
      </div>

      {/* Pipeline Sequence */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {DEFAULT_ORDER.map((step, idx) => {
          const isLast = idx === DEFAULT_ORDER.length - 1;
          return (
            <div key={step.name} className="relative">
              <div className="bg-slate-900/80 border border-slate-700/80 hover:border-blue-500/80 rounded-md p-2.5 transition-all group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                    {step.name}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1 rounded border border-emerald-800/40">
                    {step.latency}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1 group-hover:text-slate-300">
                  {step.desc}
                </p>
              </div>

              {!isLast && (
                <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-500">
                  <ArrowRight className="w-3 h-3 text-blue-400/80" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
