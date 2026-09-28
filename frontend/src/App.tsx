import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { OverviewPage } from './pages/OverviewPage';
import { CreditIntelligencePage } from './pages/CreditIntelligencePage';
import { FraudIntelligencePage } from './pages/FraudIntelligencePage';
import { CustomerIntelligencePage } from './pages/CustomerIntelligencePage';
import { CollectionsPage } from './pages/CollectionsPage';
import { RiskIntelligencePage } from './pages/RiskIntelligencePage';
import { LiquidityIntelligencePage } from './pages/LiquidityIntelligencePage';
import { AICopilotPage } from './pages/AICopilotPage';
import { LoanAnalysisPage } from './pages/LoanAnalysisPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { UnderwritingQueuePage } from './pages/UnderwritingQueuePage';
import { OperationsPortalPage } from './pages/OperationsPortalPage';
import { FinancePortalPage } from './pages/FinancePortalPage';
import { ExecutivePortalPage } from './pages/ExecutivePortalPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SalesPortalPage } from './pages/SalesPortalPage';
import { TaskCenterPage } from './pages/TaskCenterPage';
import { RelationshipPortalPage } from './pages/RelationshipPortalPage';
import { CreditManagerPortalPage } from './pages/CreditManagerPortalPage';
import { KYCPortalPage } from './pages/KYCPortalPage';
import { RiskManagerPortalPage } from './pages/RiskManagerPortalPage';
import { AdminPortalPage } from './pages/AdminPortalPage';
import { SupportPortalPage } from './pages/SupportPortalPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const AppRoutes: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/customer/dashboard" element={<CustomerPortalPage />} />
      <Route path="/customer-portal" element={<CustomerPortalPage />} />

      {/* Main Shell Layout */}
      <Route element={<Layout onRefresh={handleRefresh} isRefreshing={isRefreshing} />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/executive" element={<ExecutivePortalPage />} />
        <Route path="/sales" element={<SalesPortalPage />} />
        <Route path="/sales/dashboard" element={<SalesPortalPage />} />
        <Route path="/sales/applications" element={<SalesPortalPage />} />
        <Route path="/relationship" element={<RelationshipPortalPage />} />
        <Route path="/relationship/dashboard" element={<RelationshipPortalPage />} />
        <Route path="/tasks" element={<TaskCenterPage />} />
        <Route path="/underwriting-queue" element={<UnderwritingQueuePage />} />
        <Route path="/operations" element={<OperationsPortalPage />} />
        <Route path="/operations/dashboard" element={<OperationsPortalPage />} />
        <Route path="/operations/cases" element={<OperationsPortalPage />} />
        <Route path="/operations-manager" element={<OperationsPortalPage />} />
        <Route path="/operations-manager/dashboard" element={<OperationsPortalPage />} />
        <Route path="/finance" element={<FinancePortalPage />} />
        <Route path="/finance/dashboard" element={<FinancePortalPage />} />
        <Route path="/finance/transactions" element={<FinancePortalPage />} />
        <Route path="/finance/reconciliation" element={<FinancePortalPage />} />
        <Route path="/finance-manager" element={<FinancePortalPage />} />
        <Route path="/finance-manager/dashboard" element={<FinancePortalPage />} />
        <Route path="/credit" element={<CreditIntelligencePage />} />
        <Route path="/credit/dashboard" element={<CreditIntelligencePage />} />
        <Route path="/credit-intelligence" element={<CreditIntelligencePage />} />
        <Route path="/credit-manager" element={<CreditManagerPortalPage />} />
        <Route path="/credit-manager/dashboard" element={<CreditManagerPortalPage />} />
        <Route path="/kyc" element={<KYCPortalPage />} />
        <Route path="/kyc/dashboard" element={<KYCPortalPage />} />
        <Route path="/kyc/cases" element={<KYCPortalPage />} />
        <Route path="/fraud" element={<FraudIntelligencePage />} />
        <Route path="/fraud/dashboard" element={<FraudIntelligencePage />} />
        <Route path="/fraud/cases" element={<FraudIntelligencePage />} />
        <Route path="/fraud-intelligence" element={<FraudIntelligencePage />} />
        <Route path="/customer" element={<CustomerIntelligencePage />} />
        <Route path="/customer-intelligence" element={<CustomerIntelligencePage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/dashboard" element={<CollectionsPage />} />
        <Route path="/collections/cases" element={<CollectionsPage />} />
        <Route path="/collections/manager" element={<CollectionsPage />} />
        <Route path="/collections/manager/dashboard" element={<CollectionsPage />} />
        <Route path="/collections-manager" element={<CollectionsPage />} />
        <Route path="/risk" element={<RiskIntelligencePage />} />
        <Route path="/risk/dashboard" element={<RiskIntelligencePage />} />
        <Route path="/risk/cases" element={<RiskIntelligencePage />} />
        <Route path="/risk-intelligence" element={<RiskIntelligencePage />} />
        <Route path="/risk-manager" element={<RiskManagerPortalPage />} />
        <Route path="/risk-manager/dashboard" element={<RiskManagerPortalPage />} />
        <Route path="/liquidity" element={<LiquidityIntelligencePage />} />
        <Route path="/liquidity-intelligence" element={<LiquidityIntelligencePage />} />
        <Route path="/loan-analysis" element={<LoanAnalysisPage />} />
        <Route path="/copilot" element={<AICopilotPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPortalPage />} />
        <Route path="/admin/dashboard" element={<AdminPortalPage />} />
        <Route path="/admin/users" element={<AdminPortalPage />} />
        <Route path="/admin/roles" element={<AdminPortalPage />} />
        <Route path="/admin/organization" element={<AdminPortalPage />} />
        <Route path="/admin/loan-products" element={<AdminPortalPage />} />
        <Route path="/admin/approval-rules" element={<AdminPortalPage />} />
        <Route path="/admin/health" element={<AdminPortalPage />} />
        <Route path="/support" element={<SupportPortalPage />} />
        <Route path="/support/tickets" element={<SupportPortalPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
