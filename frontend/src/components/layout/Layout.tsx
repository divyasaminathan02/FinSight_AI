import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bot, MessageSquare } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CopilotWidget } from '../copilot/CopilotWidget';

interface LayoutProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ onRefresh, isRefreshing }) => {
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      {/* Persistent Left Sidebar ~240px */}
      <Sidebar />

      {/* Main Content Area Desktop-First 1440px */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onRefresh={onRefresh} isRefreshing={isRefreshing} />
        
        <main className="flex-1 p-6 max-w-[1560px] w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>

      {/* Persistent Bottom-Right Copilot Launcher */}
      <div className="fixed bottom-6 right-6 z-50">
        {isCopilotOpen ? (
          <CopilotWidget isFloating={true} onClose={() => setIsCopilotOpen(false)} />
        ) : (
          <button
            id="floating-copilot-trigger"
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-full shadow-2xl border border-blue-400/40 hover:scale-105 transition-all cursor-pointer group"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
            </div>
            <span>FinSight Copilot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </button>
        )}
      </div>
    </div>
  );
};
