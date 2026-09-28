import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  CreditCard,
  PiggyBank,
  Coins,
  Activity,
  FileText,
  UserCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ExecutiveKPICards } from '../components/dashboard/ExecutiveKPICards';
import { AgentIntelligenceCards } from '../components/dashboard/AgentIntelligenceCards';
import { AgentNetworkPipeline } from '../components/dashboard/AgentNetworkPipeline';
import { RiskTrendChart } from '../components/dashboard/RiskTrendChart';
import { AIRiskAlertsPanel } from '../components/dashboard/AIRiskAlertsPanel';
import { CollectionsPerformanceCard } from '../components/dashboard/CollectionsPerformanceCard';
import { LiquidityForecastCard } from '../components/dashboard/LiquidityForecastCard';
import { DashboardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';

export const OverviewPage: React.FC = () => {
  const { user } = useAuth();

  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !overview) {
    return (
      <ErrorState
        title="Unable to load Portfolio Intelligence"
        message={error ? (error as Error).message : 'Could not fetch live dashboard overview from backend.'}
        onRetry={() => refetch()}
      />
    );
  }

  const role = user?.role || 'RISK_MANAGER';

  const ROLE_FOCUS_CONFIG: Record<string, { title: string; desc: string; icon: any; link: string; linkText: string; color: string }> = {
    RISK_MANAGER: {
      title: 'Portfolio Risk Management Desk',
      desc: 'Active monitoring: Gross NPA at 1.82%, macro stress simulations active, and cross-agent risk alerts synchronized.',
      icon: Activity,
      link: '/risk',
      linkText: 'Inspect Risk Telemetry',
      color: 'border-blue-200 bg-gradient-to-r from-white via-blue-50/70 to-indigo-50/40 text-slate-900'
    },
    CREDIT_OFFICER: {
      title: 'Retail & MSME Underwriting Desk',
      desc: 'Auto-underwriting active: Mean PD 4.8%, straight-through approval rate 76.4%. Ready for multi-agent loan assessment.',
      icon: CreditCard,
      link: '/loan-analysis',
      linkText: 'Open Loan Underwriting Engine',
      color: 'border-emerald-200 bg-gradient-to-r from-white via-emerald-50/60 to-teal-50/40 text-slate-900'
    },
    COLLECTION_MANAGER: {
      title: 'Delinquency & Remediation Operations',
      desc: '12 accounts in early 1-30 DPD bucket (₹12.5L). Automated voice bot calls scheduled under RBI Fair Practices Code.',
      icon: PiggyBank,
      link: '/collections',
      linkText: 'Review Collections Priority Queue',
      color: 'border-amber-200 bg-gradient-to-r from-white via-amber-50/60 to-yellow-50/40 text-slate-900'
    },
    FINANCE_MANAGER: {
      title: 'Treasury & ALM Liquidity Management',
      desc: 'LCR standing at 138.4% (statutory floor 100%). Next 30-day net liquidity surplus projected at +₹42.0 Lakhs.',
      icon: Coins,
      link: '/liquidity',
      linkText: 'View ALM Gap Analysis',
      color: 'border-cyan-200 bg-gradient-to-r from-white via-cyan-50/60 to-blue-50/40 text-slate-900'
    },
    ANALYST: {
      title: 'Portfolio Intelligence & Model Analytics',
      desc: 'Active loan book ₹842.6 Cr across 6 retail products. 6/6 ML models evaluated and verified via MLflow.',
      icon: Sparkles,
      link: '/reports',
      linkText: 'Access Enterprise Reports',
      color: 'border-purple-200 bg-gradient-to-r from-white via-purple-50/60 to-indigo-50/40 text-slate-900'
    },
    AUDITOR: {
      title: 'Compliance & Algorithmic Audit Station',
      desc: '100% of AI underwriting decisions explainable via SHAP factor attributions. Immutable decision log enabled.',
      icon: FileText,
      link: '/reports',
      linkText: 'Inspect Regulatory Filings',
      color: 'border-indigo-200 bg-gradient-to-r from-white via-indigo-50/60 to-blue-50/40 text-slate-900'
    },
    ADMIN: {
      title: 'Executive Risk Committee Control Center',
      desc: 'Full administrative orchestration: Event simulation engine, dynamic risk thresholds, and self-service borrower portal active.',
      icon: UserCheck,
      link: '/settings',
      linkText: 'Configure System Thresholds',
      color: 'border-blue-200 bg-gradient-to-r from-white via-blue-50/70 to-slate-50 text-slate-900'
    },
  };

  const currentFocus = ROLE_FOCUS_CONFIG[role] || ROLE_FOCUS_CONFIG.RISK_MANAGER;
  const FocusIcon = currentFocus.icon;

  return (
    <div className="space-y-6">
      {/* Role-Specific Institutional Focus Banner */}
      <div className={`p-4 rounded-2xl border ${currentFocus.color} flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FocusIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{currentFocus.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono font-bold">
                Officer: {user?.full_name} ({role.replace('_', ' ')})
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">{currentFocus.desc}</p>
          </div>
        </div>

        <Link
          to={currentFocus.link}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-xs shrink-0"
        >
          <span>{currentFocus.linkText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 1. Executive KPI Cards */}
      <ExecutiveKPICards kpis={overview.kpis} />

      {/* 2. Coordinated Agent Network Pipeline Indicator */}
      <AgentNetworkPipeline network={overview.network} />

      {/* 3. Six AI Intelligence Agent Cards */}
      <AgentIntelligenceCards agents={overview.agents} />

      {/* 4. Middle Analytics Grid: Risk Trend Chart & AI Risk Alerts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <RiskTrendChart data={overview.risk_trend} />
        </div>
        <div className="lg:col-span-5">
          <AIRiskAlertsPanel alerts={overview.risk_alerts} />
        </div>
      </div>

      {/* 5. Bottom Analytics Grid: Collections Performance & Liquidity Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CollectionsPerformanceCard data={overview.collections} />
        <LiquidityForecastCard data={overview.liquidity} />
      </div>
    </div>
  );
};
