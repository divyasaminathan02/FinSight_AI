import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { ExecutiveKPICardData } from '../../types';

interface ExecutiveKPICardsProps {
  kpis: ExecutiveKPICardData[];
}

export const ExecutiveKPICards: React.FC<ExecutiveKPICardsProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {kpis.map((kpi) => {
        const isPositive = kpi.status === 'positive';
        const isWarning = kpi.status === 'warning';
        const isNegative = kpi.status === 'negative';

        return (
          <div
            key={kpi.id}
            className="finsight-card p-4 flex flex-col justify-between hover:border-slate-300 transition-all group"
          >
            {/* Header: Title + Delta Indicator */}
            <div className="flex items-start justify-between gap-1 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 line-clamp-1">
                {kpi.title}
              </span>
              {kpi.change_pct !== 0 ? (
                <span
                  className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    isPositive
                      ? 'text-emerald-700 bg-emerald-50'
                      : isWarning
                      ? 'text-amber-700 bg-amber-50'
                      : isNegative
                      ? 'text-rose-700 bg-rose-50'
                      : 'text-slate-600 bg-slate-100'
                  }`}
                >
                  {kpi.change_direction === 'up' ? (
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  ) : kpi.change_direction === 'down' ? (
                    <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  ) : (
                    <Minus className="w-3 h-3 mr-0.5" />
                  )}
                  {Math.abs(kpi.change_pct)}%
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  Stable
                </span>
              )}
            </div>

            {/* Main Value */}
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                {kpi.value}
              </span>
            </div>

            {/* Subtext */}
            <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="truncate">{kpi.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
