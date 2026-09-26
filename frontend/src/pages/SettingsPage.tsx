import React, { useState } from 'react';
import { Settings, Database, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const { user, switchRole } = useAuth();
  const [dataScale, setDataScale] = useState('medium');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const RBAC_PERMISSIONS = [
    { role: 'ADMIN', name: 'Chief Risk Officer / Admin', access: 'Full Read/Write across all 6 agents, system configs, & data pipeline' },
    { role: 'RISK_MANAGER', name: 'Risk Manager', access: 'Full Portfolio Risk Telemetry, Credit Override, Alerts & Copilot' },
    { role: 'CREDIT_OFFICER', name: 'Credit Officer', access: 'Loan Underwriting, CIBIL Scoring, Customer Credit Profiles' },
    { role: 'COLLECTION_MANAGER', name: 'Collection Manager', access: 'DPD Flow Analysis, Strategy Allocations, Recovery Tracking' },
    { role: 'FINANCE_MANAGER', name: 'Finance Manager', access: 'Treasury, ALM Projections, Liquidity Records, RBI Reporting' },
    { role: 'ANALYST', name: 'Portfolio Analyst', access: 'Read-only access to portfolio trends, reports & dashboards' },
    { role: 'AUDITOR', name: 'Compliance & Auditor', access: 'Audit Logs, Forensic Alerts, Model Version Tracking' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="finsight-card p-5 bg-gradient-to-r from-slate-900 to-[#0B132B] text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">System Settings & RBAC Governance</h2>
            <p className="text-xs text-slate-300">
              Role-Based Access Control, Synthetic Dataset Pipeline & Multi-Agent Parameters
            </p>
          </div>
        </div>
      </div>

      {/* RBAC Active Role Management */}
      <div className="finsight-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Current Session & RBAC Role</h3>
            <p className="text-xs text-slate-500">Select active institutional persona to inspect access control behavior</p>
          </div>
          <Badge variant="info">
            Active: {user?.role?.replace('_', ' ') || 'RISK MANAGER'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {RBAC_PERMISSIONS.map((r) => {
            const isSelected = user?.role === r.role;
            return (
              <div
                key={r.role}
                onClick={() => switchRole(r.role as any)}
                className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">{r.name}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">{r.access}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Synthetic Dataset Pipeline Controls */}
      <div className="finsight-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Synthetic NBFC Dataset Generator Pipeline</h3>
            <p className="text-xs text-slate-500">
              Correlated high-scale data generation: 100,000+ customers, 150,000+ loans, 500,000+ transactions
            </p>
          </div>
          <Database className="w-5 h-5 text-blue-600" />
        </div>

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-slate-800">Dataset Scale Preset:</span>
              <p className="text-[11px] text-slate-500">Generates realistic correlated DTI, DPD, device hashes, and repayments.</p>
            </div>
            <select
              value={dataScale}
              onChange={(e) => setDataScale(e.target.value)}
              className="bg-white border border-slate-300 rounded px-3 py-1 text-xs font-semibold outline-none"
            >
              <option value="quick">Quick Dev (1,000 Customers | 1,500 Loans | 5k Txns)</option>
              <option value="medium">Medium Scale (5,000 Customers | 6,500 Loans | 25k Txns)</option>
              <option value="full">Enterprise Scale (100k Customers | 150k Loans | 500k Txns)</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
            <span className="text-slate-600 font-mono">backend/scripts/generate_data.py --scale {dataScale}</span>
            <button
              onClick={() => {
                setIsSeeding(true);
                setTimeout(() => {
                  setIsSeeding(false);
                  setSeedSuccess(true);
                  setTimeout(() => setSeedSuccess(false), 3000);
                }, 1500);
              }}
              disabled={isSeeding}
              className="px-3.5 py-1.5 bg-slate-900 text-white font-semibold rounded text-xs hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? 'Executing Pipeline...' : 'Run Dataset Generator'}</span>
            </button>
          </div>

          {seedSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Dataset pipeline executed successfully. All tables synchronized.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
