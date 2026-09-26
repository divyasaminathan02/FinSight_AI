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
      color: 'border-blue-500/40 bg-blue-950/20 text-blue-300'
    },
    CREDIT_OFFICER: {
      title: 'Retail & MSME Underwriting Desk',
      desc: 'Auto-underwriting active: Mean PD 4.8%, straight-through approval rate 76.4%. Ready for multi-agent loan assessment.',
      icon: CreditCard,
      link: '/loan-analysis',
      linkText: 'Open Loan Underwriting Engine',
      color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
    },
    COLLECTION_MANAGER: {
      title: 'Delinquency & Remediation Operations',
      desc: '12 accounts in early 1-30 DPD bucket (₹12.5L). Automated voice bot calls scheduled under RBI Fair Practices Code.',
      icon: PiggyBank,
      link: '/collections',
      linkText: 'Review Collections Priority Queue',
      color: 'border-amber-500/40 bg-amber-950/20 text-amber-300'
    },
    FINANCE_MANAGER: {
      title: 'Treasury & ALM Liquidity Management',
      desc: 'LCR standing at 138.4% (statutory floor 100%). Next 30-day net liquidity surplus projected at +₹42.0 Lakhs.',
      icon: Coins,
      link: '/liquidity',
      linkText: 'View ALM Gap Analysis',
      color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
    },
    ANALYST: {
      title: 'Portfolio Intelligence & Model Analytics',
      desc: 'Active loan book ₹842.6 Cr across 6 retail products. 6/6 ML models evaluated and verified via MLflow.',
      icon: Sparkles,
      link: '/reports',
      linkText: 'Access Enterprise Reports',
      color: 'border-purple-500/40 bg-purple-950/20 text-purple-300'
    },
    AUDITOR: {
      title: 'Compliance & Algorithmic Audit Station',
      desc: '100% of AI underwriting decisions explainable via SHAP factor attributions. Immutable decision log enabled.',
      icon: FileText,
      link: '/reports',
      linkText: 'Inspect Regulatory Filings',
      color: 'border-indigo-500/40 bg-indigo-950/20 text-indigo-300'
    },
    ADMIN: {
      title: 'Executive Risk Committee Control Center',
      desc: 'Full administrative orchestration: Event simulation engine, dynamic risk thresholds, and self-service borrower portal active.',
      icon: UserCheck,
      link: '/settings',
      linkText: 'Configure System Thresholds',
      color: 'border-blue-500/40 bg-blue-950/20 text-blue-300'
    },
  };

  const currentFocus = ROLE_FOCUS_CONFIG[role] || ROLE_FOCUS_CONFIG.RISK_MANAGER;
  const FocusIcon = currentFocus.icon;

  return (
    <div className="space-y-6">
      {/* Role-Specific Institutional Focus Banner */}
      <div className={`p-4 rounded-2xl border ${currentFocus.color} flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <FocusIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">{currentFocus.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono font-semibold">
                Officer: {user?.full_name} ({role.replace('_', ' ')})
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{currentFocus.desc}</p>
          </div>
        </div>

        <Link
          to={currentFocus.link}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors shrink-0"
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
