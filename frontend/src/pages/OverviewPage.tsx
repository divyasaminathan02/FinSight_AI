import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
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

  return (
    <div className="space-y-6">
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
