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
      <Route path="/customer-portal" element={<CustomerPortalPage />} />

      {/* Main Shell Layout */}
      <Route element={<Layout onRefresh={handleRefresh} isRefreshing={isRefreshing} />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/credit" element={<CreditIntelligencePage />} />
        <Route path="/credit-intelligence" element={<CreditIntelligencePage />} />
        <Route path="/fraud" element={<FraudIntelligencePage />} />
        <Route path="/fraud-intelligence" element={<FraudIntelligencePage />} />
        <Route path="/customer" element={<CustomerIntelligencePage />} />
        <Route path="/customer-intelligence" element={<CustomerIntelligencePage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/risk" element={<RiskIntelligencePage />} />
        <Route path="/risk-intelligence" element={<RiskIntelligencePage />} />
        <Route path="/liquidity" element={<LiquidityIntelligencePage />} />
        <Route path="/liquidity-intelligence" element={<LiquidityIntelligencePage />} />
        <Route path="/loan-analysis" element={<LoanAnalysisPage />} />
        <Route path="/copilot" element={<AICopilotPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
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
