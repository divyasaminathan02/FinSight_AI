import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShieldAlert, Fingerprint, Smartphone, AlertTriangle, Network, Search, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { fraudApi } from '../services/api';
import { Badge } from '../components/common/Badge';

export const FraudIntelligencePage: React.FC = () => {
  const [targetCustomerId, setTargetCustomerId] = useState(1);
  const [customDevice, setCustomDevice] = useState('DEV-SHR-FINGERPRINT-8492');
  const [customVelocity, setCustomVelocity] = useState(4);
  const [customAmount, setCustomAmount] = useState(450000);

  // Queries
  const { data: alerts } = useQuery({
    queryKey: ['fraud-alerts'],
    queryFn: fraudApi.getAlerts,
  });

  const { data: networkData, isLoading: isNetworkLoading } = useQuery({
    queryKey: ['fraud-network', targetCustomerId],
    queryFn: () => fraudApi.getNetwork(targetCustomerId),
  });

  // Anomaly Analyzer Mutation
  const analyzeMutation = useMutation({
    mutationFn: fraudApi.analyze,
  });

  const handleRunAnalysis = () => {
    analyzeMutation.mutate({
      customer_id: targetCustomerId,
      device_id: customDevice,
      requested_amount: customAmount,
      application_velocity: customVelocity,
      income: 45000,
    });
  };

  const analysisResult = analyzeMutation.data;

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
                Isolation Forest Anomaly Detection & NetworkX Bipartite Entity Relationship Forensics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Active Alerts:</span>{' '}
              <strong className="text-orange-400">14 alerts</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">High-Risk Collisions:</span>{' '}
              <strong className="text-rose-400">3 clusters</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Analyzer & SVG Network Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Live Fraud Anomaly Analyzer */}
        <div className="lg:col-span-5 finsight-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-orange-600" />
              <span>Multi-Entity Collision & Velocity Analyzer</span>
            </h3>
            <button
              onClick={handleRunAnalysis}
              disabled={analyzeMutation.isPending}
              className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{analyzeMutation.isPending ? 'Analyzing...' : 'Audit Entity'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-600 font-semibold block mb-1">Target Customer ID</label>
              <input
                type="number"
                value={targetCustomerId}
                onChange={(e) => setTargetCustomerId(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">Device Hardware Fingerprint Hash</label>
              <input
                type="text"
                value={customDevice}
                onChange={(e) => setCustomDevice(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Application Velocity (7d)</label>
                <input
                  type="number"
                  value={customVelocity}
                  onChange={(e) => setCustomVelocity(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Loan Amount (₹)</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Analysis Result Output */}
          {analysisResult && (
            <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  analysisResult.fraud_risk === 'Critical' || analysisResult.fraud_risk === 'High'
                    ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                    : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Fraud Assessment</span>
                  <div className="text-base font-extrabold">{analysisResult.fraud_risk} Risk</div>
                  <div className="text-[11px] font-semibold">{analysisResult.recommendation}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black">{analysisResult.fraud_probability_pct}</div>
                  <div className="text-[10px] text-slate-500">Anomaly: {analysisResult.anomaly_score}</div>
                </div>
              </div>

              {analysisResult.risk_signals.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700">Triggered Forensic Signals:</span>
                  {analysisResult.risk_signals.map((sig: any, idx: number) => (
                    <div key={idx} className="p-2 bg-orange-50 rounded border border-orange-200 text-[11px]">
                      <span className="font-bold text-orange-950">{sig.signal}: </span>
                      <span className="text-slate-700">{sig.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Interactive SVG Fraud Network Graph */}
        <div className="lg:col-span-7 finsight-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900">NetworkX Multi-Entity Relationship Graph</h3>
              </div>
              <Badge variant={networkData?.is_syndicate_cluster ? 'critical' : 'info'}>
                {networkData?.cluster_type || 'Standard Entity'}
              </Badge>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Inspecting 2-hop connected graph around Customer #{targetCustomerId}. Red nodes indicate shared entities linked to syndicate behavior.
            </p>

            {/* SVG Graph Visualizer */}
            <div className="w-full h-64 bg-slate-900 rounded-lg border border-slate-800 p-4 relative overflow-hidden flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 500 240">
                {/* Edges */}
                <line x1="250" y1="120" x2="140" y2="60" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 2" />
                <line x1="250" y1="120" x2="360" y2="60" stroke="#F97316" strokeWidth="2" />
                <line x1="250" y1="120" x2="250" y2="200" stroke="#10B981" strokeWidth="2" strokeDasharray="2 2" />
                <line x1="360" y1="60" x2="440" y2="120" stroke="#EF4444" strokeWidth="2" />
                <line x1="360" y1="60" x2="440" y2="40" stroke="#EF4444" strokeWidth="2" />

                {/* Nodes */}
                {/* Center: Target Customer */}
                <circle cx="250" cy="120" r="18" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                <text x="250" y="124" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
                  CUST #{targetCustomerId}
                </text>

                {/* Node: Phone */}
                <circle cx="140" cy="60" r="14" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1.5" />
                <text x="140" y="64" fill="#FFFFFF" fontSize="8" textAnchor="middle">PHONE</text>

                {/* Node: Shared Device (Collision Highlight) */}
                <circle cx="360" cy="60" r="20" fill="#EA580C" stroke="#FEF08A" strokeWidth="2" className="animate-pulse" />
                <text x="360" y="64" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">DEVICE</text>

                {/* Node: Address */}
                <circle cx="250" cy="200" r="14" fill="#059669" stroke="#FFFFFF" strokeWidth="1.5" />
                <text x="250" y="204" fill="#FFFFFF" fontSize="8" textAnchor="middle">ADDR</text>

                {/* Colliding Linked Customers */}
                <circle cx="440" cy="40" r="12" fill="#DC2626" />
                <text x="440" y="44" fill="#FFFFFF" fontSize="7" textAnchor="middle">CUST B</text>

                <circle cx="440" cy="120" r="12" fill="#DC2626" />
                <text x="440" y="124" fill="#FFFFFF" fontSize="7" textAnchor="middle">CUST C</text>
              </svg>

              {/* Overlay Legend */}
              <div className="absolute bottom-2 right-2 bg-slate-950/80 border border-slate-800 rounded p-1.5 text-[9px] text-slate-300 space-y-0.5">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Target Applicant</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Shared Hardware Device</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Colliding Syndicate Profiles</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Graph nodes: {networkData?.total_nodes || 4} entities • {networkData?.total_links || 3} relations</span>
            <span className="font-semibold text-blue-600">Active Syndicate Quarantine Enabled</span>
          </div>
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="finsight-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">Active Fraud Forensics & Syndicate Cases</h3>
          <span className="text-[11px] text-slate-500">Autonomous Triaged by Fraud Intelligence Agent</span>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {(Array.isArray(alerts) ? alerts : alerts?.alerts || []).map((alert: any) => (
            <div key={alert.id} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Badge variant={alert.severity === 'Critical' ? 'critical' : 'warning'} pulse>
                  {alert.severity}
                </Badge>
                <div>
                  <div className="font-bold text-slate-900">{alert.rule_triggered || alert.message}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Category: {alert.type || 'Identity Collision'} • Detected: {alert.created_at || 'Today'}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                  Exposure: {alert.exposure_formatted || '₹84,500'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
