import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { RiskAlert } from '../../types';
import { Badge } from '../common/Badge';

interface AIRiskAlertsPanelProps {
  alerts: RiskAlert[];
}

export const AIRiskAlertsPanel: React.FC<AIRiskAlertsPanelProps> = ({ alerts }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity.toUpperCase() === filterSeverity;
  });

  return (
    <div className="finsight-card p-5 h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">AI Risk & Anomaly Alerts</h2>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {alerts.length} Active
            </span>
          </div>

          {/* Severity Filters */}
          <div className="flex items-center gap-1 text-[11px]">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  filterSeverity === sev
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Items List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'Critical';
            const isHigh = alert.severity === 'High';
            const isMedium = alert.severity === 'Medium';

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border transition-all text-xs flex flex-col gap-1.5 hover:shadow-2xs ${
                  isCritical
                    ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                    : isHigh
                    ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        isCritical
                          ? 'critical'
                          : isHigh
                          ? 'warning'
                          : isMedium
                          ? 'elevated'
                          : 'info'
                      }
                      size="sm"
                      pulse={isCritical}
                    >
                      {alert.severity}
                    </Badge>
                    <span className="text-[11px] font-bold text-slate-700">
                      {alert.responsible_agent}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{alert.timestamp}</span>
                </div>

                <p className="text-xs font-semibold text-slate-900 leading-snug">
                  {alert.message}
                </p>

                {alert.impact_metric && (
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-500 font-medium">Impact Indicator:</span>
                    <span className="font-bold text-slate-800 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                      {alert.impact_metric}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Continuous agent auditing across 6 intelligence domains</span>
        <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
          View full alert log →
        </span>
      </div>
    </div>
  );
};
