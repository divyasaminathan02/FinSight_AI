import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Sparkles,
  Bot,
  Building,
  ShieldAlert,
  Users,
  CreditCard,
  Send,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  FileText,
  DollarSign,
  PieChart
} from 'lucide-react';
import { dashboardApi, financeApi, copilotApi } from '../services/api';

export const ExecutivePortalPage: React.FC = () => {
  const [selectedQuestion, setSelectedQuestion] = useState<string>('Why did loan approvals change?');
  const [aiAnswer, setAiAnswer] = useState<any>(null);
  const [isAsking, setIsAsking] = useState<boolean>(false);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['executive-overview'],
    queryFn: () => dashboardApi.getOverview(),
  });

  const { data: financeData } = useQuery({
    queryKey: ['executive-finance'],
    queryFn: () => financeApi.getOverview(),
  });

  const handleAskExecutiveAi = async (q: string) => {
    setSelectedQuestion(q);
    setIsAsking(true);
    try {
      const res = await copilotApi.chat(q);
      setAiAnswer(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAsking(false);
    }
  };

  const EXECUTIVE_PROMPTS = [
    'Why did loan approvals change?',
    'Which portfolio segments require attention?',
    'Where are collections deteriorating?',
    'What unusual patterns have appeared?',
    'Show cumulative disbursements.',
    'What is the 30-day liquidity outlook?'
  ];

  const kpis = financeData?.kpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Executive Management Command Center</h1>
            <p className="text-xs text-slate-400">
              Institutional C-Suite overview, capital deployment telemetry, and AI Financial Intelligence briefing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 bg-blue-900/40 text-blue-300 border border-blue-800 rounded-full font-bold">
            Executive View
          </span>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Total Portfolio AUM</span>
          <div className="text-xl font-bold text-white tracking-tight">
            ₹{kpis?.total_aum_cr || 718.2} <span className="text-xs text-slate-400 font-normal">Cr</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold">+8.4% YoY Expansion</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Underwriting Approval Rate</span>
          <div className="text-xl font-bold text-blue-400 tracking-tight">
            68.4%
          </div>
          <div className="text-[11px] text-slate-400">Target 65-72% (Risk Adjusted)</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Gross NPA Ratio</span>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {kpis?.npa_ratio_pct || 1.42}%
          </div>
          <div className="text-[11px] text-slate-400">Ceiling: 1.82% (RBI Mandate)</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
          <span className="text-[11px] text-slate-400">Net Interest Margin (NIM)</span>
          <div className="text-xl font-bold text-purple-400 tracking-tight">
            {kpis?.net_interest_margin_pct || 6.70}%
          </div>
          <div className="text-[11px] text-slate-400">High Tier Spread</div>
        </div>
      </div>

      {/* AI Financial Intelligence Executive Section */}
      <div className="bg-linear-to-b from-slate-900 to-[#0B132B] border border-blue-900/50 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Financial Intelligence Engine</h2>
              <span className="text-[11px] text-slate-400">
                Natural-language institutional analysis synthesized from 6 domain agents & database state
              </span>
            </div>
          </div>

          <span className="text-[10px] px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded-full font-bold">
            Live Synchronized
          </span>
        </div>

        {/* Executive Prompt Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {EXECUTIVE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleAskExecutiveAi(prompt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedQuestion === prompt
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* AI Answer Card */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-300">
              <Bot className="w-4 h-4 text-blue-400" />
              <span>Executive Briefing: "{selectedQuestion}"</span>
            </div>
            {isAsking && (
              <span className="flex items-center gap-1.5 text-blue-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing real database telemetry...
              </span>
            )}
          </div>

          <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line pl-6">
            {aiAnswer ? (
              aiAnswer.text
            ) : (
              "Underwriting approval rate stabilized at 68.4% this quarter following calibrated credit tightening in South Region commercial vehicle portfolios. " +
              "Meanwhile, MSME working capital demand increased by +12.3%, driven by seasonal inventory stocking in textile and light manufacturing clusters. " +
              "Overall capital deployment remains within RBI Tier-1 NBFC liquidity bounds."
            )}
          </div>

          {aiAnswer?.financialData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
              {aiAnswer.financialData.metrics?.map((m: any, i: number) => (
                <div key={i} className="p-2.5 bg-slate-800/50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">{m.label}</span>
                  <span className="text-xs font-bold text-white font-mono">{m.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Governance & Cross-Department Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Credit Desk Telemetry</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Avg Approved CIBIL:</span>
              <span className="font-bold text-white">764 / 900</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Median Turnaround Time:</span>
              <span className="font-bold text-white">4.2 Hours</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Rejection Rationale:</span>
              <span className="text-rose-400 font-semibold">High DTI (&gt;55%)</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Risk & Fraud Matrix</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Quarantined Collisions:</span>
              <span className="font-bold text-rose-400">12 Devices</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Protected Capital:</span>
              <span className="font-bold text-emerald-400">₹84.5 Lakhs</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Concentration HHI:</span>
              <span className="text-white font-mono">0.14 (&lt; 0.18 Cap)</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Collections Recovery</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Monthly Efficiency:</span>
              <span className="font-bold text-emerald-400">94.70%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">PTP Compliance:</span>
              <span className="font-bold text-white">78.5%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Primary Recovery Channel:</span>
              <span className="text-blue-400 font-semibold">Automated NACH (81%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
