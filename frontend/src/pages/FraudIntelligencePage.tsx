import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, Fingerprint, Smartphone } from 'lucide-react';
import { dashboardApi } from '../services/api';
import { Badge } from '../components/common/Badge';

export const FraudIntelligencePage: React.FC = () => {
  const { data: alerts } = useQuery({
    queryKey: ['fraud-alerts'],
    queryFn: dashboardApi.getAlerts,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="finsight-card p-5 bg-gradient-to-r from-orange-950 via-slate-900 to-[#0B132B] text-white border-orange-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Fraud Intelligence Agent</h2>
                <Badge variant="elevated" pulse>
                  Status: Elevated
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                Device Fingerprint Collision, Syndicate Detection & Application Velocity Monitor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Active Alerts:</span>{' '}
              <strong className="text-orange-400">14 alerts</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">High-Risk Cases:</span>{' '}
              <strong className="text-rose-400">3 cases</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Fraud Clusters & Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="finsight-card p-4.5 border-orange-200 bg-orange-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-orange-900">Device Fingerprint Cluster</span>
            <Fingerprint className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-xl font-extrabold text-orange-950">12 Applications</div>
          <p className="text-[11px] text-slate-600 mt-1">
            Sharing identical hardware hash <code>DEV-SHR-FINGERPRINT-8492</code> across Tier 2 regions.
          </p>
        </div>

        <div className="finsight-card p-4.5 border-rose-200 bg-rose-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-900">Velocity Surge Flag</span>
            <Smartphone className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-extrabold text-rose-950">7 Applications / 48h</div>
          <p className="text-[11px] text-slate-600 mt-1">
            High velocity spike from single IP subnet in Western Region.
          </p>
        </div>

        <div className="finsight-card p-4.5 border-blue-200 bg-blue-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-900">Prevented Fraud Loss</span>
            <ShieldAlert className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-950">₹84.5 Lakhs</div>
          <p className="text-[11px] text-slate-600 mt-1">
            Auto-intercepted applications before loan disbursement.
          </p>
        </div>
      </div>

      {/* Fraud Cases List */}
      <div className="finsight-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">Active Fraud & Syndicate Cases</h3>
          <span className="text-[11px] text-slate-500">Autonomous Triaged by Fraud Intelligence Agent</span>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {alerts?.map((alert) => (
            <div key={alert.id} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Badge variant={alert.severity === 'Critical' ? 'critical' : 'warning'} pulse>
                  {alert.severity}
                </Badge>
                <div>
                  <div className="font-bold text-slate-900">{alert.message}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Category: {alert.category} • Detected: {alert.timestamp}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                  {alert.impact_metric || 'Action Required'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
