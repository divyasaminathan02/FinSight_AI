import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ onRefresh, isRefreshing }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Persistent Left Sidebar ~240px */}
      <Sidebar />

      {/* Main Content Area Desktop-First 1440px */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onRefresh={onRefresh} isRefreshing={isRefreshing} />
        
        <main className="flex-1 p-6 max-w-[1560px] w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
