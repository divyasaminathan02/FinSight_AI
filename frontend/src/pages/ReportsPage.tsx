import React from 'react';
import { FileText, Download, CheckCircle2, Shield, Calendar, Layers } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const REPORTS = [
    {
      id: 'REP-01',
      title: 'RBI Liquidity Coverage Ratio (LCR) Return',
      category: 'Regulatory Filing',
      period: 'August 2026',
      status: 'Generated',
      fileSize: '2.4 MB PDF',
      generatedBy: 'Liquidity Intelligence',
    },
    {
      id: 'REP-02',
      title: 'Portfolio Delinquency & DPD Flow-to-Loss Analysis',
      category: 'Risk Committee',
      period: 'Q2 FY 2026-27',
      status: 'Generated',
      fileSize: '4.8 MB PDF',
      generatedBy: 'Collections & Risk Intelligence',
    },
    {
      id: 'REP-03',
      title: 'Syndicate Fraud & Device Collision Forensic Report',
      category: 'Audit & Compliance',
      period: 'Past 30 Days',
      status: 'Generated',
      fileSize: '1.9 MB PDF',
      generatedBy: 'Fraud Intelligence',
    },
    {
      id: 'REP-04',
      title: 'MSME Portfolio Credit Underwriting Performance',
      category: 'Credit Operations',
      period: 'Monthly (Sep 2026)',
      status: 'Ready',
      fileSize: '3.1 MB PDF',
      generatedBy: 'Credit Intelligence',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="finsight-card p-5 bg-gradient-to-r from-slate-900 to-[#0B132B] text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Institutional Reports & Regulatory Filings</h2>
            <p className="text-xs text-slate-300">
              Automated portfolio exports for RBI compliance, Risk Committee, and Executive Board
            </p>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="finsight-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">Available Portfolio Intelligence Dossiers</h3>
          <span className="text-[11px] text-slate-500">Auto-Compiled by Coordinated AI Agents</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {REPORTS.map((rep) => (
            <div key={rep.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{rep.title}</h4>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{rep.category}</span>
                    <span>•</span>
                    <span>Period: {rep.period}</span>
                    <span>•</span>
                    <span>Agent: {rep.generatedBy}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-slate-500">{rep.fileSize}</span>
                <button
                  onClick={() => alert(`Downloading institutional report: ${rep.title}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
