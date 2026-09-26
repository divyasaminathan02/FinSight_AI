import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Shield,
  Calendar,
  Layers,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Printer,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { reportsApi } from '../services/api';
import { SIMULATED_DATA_NOTICE } from '../utils/masking';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('portfolio-risk');
  const [reportData, setReportData] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchReportList();
  }, []);

  useEffect(() => {
    if (selectedReportId) {
      loadReportDetails(selectedReportId);
    }
  }, [selectedReportId]);

  const fetchReportList = async () => {
    setLoadingList(true);
    try {
      const res = await reportsApi.getList();
      setReports(res.reports);
      if (res.reports && res.reports.length > 0 && !selectedReportId) {
        setSelectedReportId(res.reports[0].id);
      }
    } catch (err) {
      console.error('Error fetching report list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const loadReportDetails = async (reportId: string) => {
    setLoadingData(true);
    try {
      const res = await reportsApi.getData(reportId);
      setReportData(res);
    } catch (err) {
      console.error('Error loading report details:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDownloadCsv = (reportId: string) => {
    setDownloading(true);
    const token = localStorage.getItem('finsight_token');
    const url = reportsApi.downloadCsvUrl(reportId);
    
    // Create an anchor and trigger browser download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `finsight_${reportId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 800);
  };

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="font-semibold">{SIMULATED_DATA_NOTICE}</span>
        </div>
        <span className="text-[11px] text-amber-400/80">PII Masked • RBI Governance Compliant</span>
      </div>

      {/* Header */}
      <div className="finsight-card p-5 bg-gradient-to-r from-slate-900 to-[#0B132B] text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Institutional Reports & Regulatory Dossiers</h2>
              <p className="text-xs text-slate-300">
                Automated multi-agent reporting suite for RBI compliance, Risk Committee, and NBFC Board
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadReportDetails(selectedReportId)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
            <button
              onClick={() => handleDownloadCsv(selectedReportId)}
              disabled={downloading}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Report Selectors & Active Report View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Report Navigation List */}
        <div className="lg:col-span-1 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
            Enterprise Dossiers
          </span>

          <div className="space-y-1.5">
            {[
              { id: 'portfolio-risk', title: 'Portfolio Risk Report', tag: 'AUM & DPD' },
              { id: 'credit', title: 'Credit Underwriting Report', tag: 'PD & Scoring' },
              { id: 'fraud', title: 'Fraud & AML Intelligence', tag: 'Forensics' },
              { id: 'collections', title: 'Collections & Recovery', tag: 'Delinquency' },
              { id: 'liquidity', title: 'Liquidity & ALM Gap', tag: 'LCR & Cash Flow' },
              { id: 'executive-summary', title: 'Executive Board Summary', tag: 'KPI Overview' }
            ].map((r) => {
              const isSelected = selectedReportId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReportId(r.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/50 text-white shadow-sm'
                      : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className={`text-xs font-bold ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                      {r.title}
                    </div>
                    <div className="text-[10px] text-slate-500">{r.tag}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Report View & Preview */}
        <div className="lg:col-span-3 space-y-4">
          {loadingData ? (
            <div className="finsight-card p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs font-semibold">Compiling live institutional analytics...</span>
            </div>
          ) : reportData ? (
            <div className="finsight-card p-5 space-y-5">
              {/* Report Meta Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
                    {reportData.report_id || 'REPORT DOSSIER'}
                  </span>
                  <h3 className="text-base font-bold text-white">{reportData.title}</h3>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <div>Generated: <span className="text-slate-200 font-medium">{new Date(reportData.generated_at).toLocaleString()}</span></div>
                  <div>Sign-off: <span className="text-slate-200 font-medium">{reportData.generated_by}</span></div>
                </div>
              </div>

              {/* Dynamic Content Rendering based on report type */}
              {selectedReportId === 'portfolio-risk' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Total Loans</div>
                      <div className="text-lg font-bold text-white">{reportData.summary?.total_loans || 100}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Active AUM</div>
                      <div className="text-lg font-bold text-white">₹{(reportData.summary?.total_aum / 10000000).toFixed(2)} Cr</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Delinquent Accounts</div>
                      <div className="text-lg font-bold text-amber-400">{reportData.summary?.delinquent_loans || 8}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Gross NPA Ratio</div>
                      <div className="text-lg font-bold text-emerald-400">{reportData.summary?.gross_npa_pct || 1.82}%</div>
                    </div>
                  </div>

                  {/* Delinquency Aging Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2">Portfolio Delinquency Aging</h4>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <div className="text-slate-400 text-[10px]">1-30 DPD (B1)</div>
                        <div className="text-sm font-bold text-slate-200 mt-1">{reportData.delinquency_breakdown?.dpd_0_30 || 12} Cases</div>
                      </div>
                      <div className="p-2.5 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <div className="text-slate-400 text-[10px]">31-60 DPD (B2)</div>
                        <div className="text-sm font-bold text-amber-400 mt-1">{reportData.delinquency_breakdown?.dpd_31_60 || 6} Cases</div>
                      </div>
                      <div className="p-2.5 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <div className="text-slate-400 text-[10px]">61-90 DPD (B3)</div>
                        <div className="text-sm font-bold text-orange-400 mt-1">{reportData.delinquency_breakdown?.dpd_61_90 || 3} Cases</div>
                      </div>
                      <div className="p-2.5 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <div className="text-slate-400 text-[10px]">90+ DPD (NPA)</div>
                        <div className="text-sm font-bold text-rose-400 mt-1">{reportData.delinquency_breakdown?.npa_90_plus || 2} Cases</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReportId === 'credit' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Total Assessments</div>
                      <div className="text-lg font-bold text-white">{reportData.metrics?.total_assessments || 120}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Auto-Approval Rate</div>
                      <div className="text-lg font-bold text-emerald-400">{((reportData.metrics?.approved_rate || 0.76) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Average Default Prob.</div>
                      <div className="text-lg font-bold text-blue-400">{((reportData.metrics?.average_pd || 0.048) * 100).toFixed(2)}%</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Mean Credit Score</div>
                      <div className="text-lg font-bold text-white">{reportData.metrics?.average_risk_score || 684}</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReportId === 'fraud' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Flagged Incidents</div>
                      <div className="text-lg font-bold text-amber-400">{reportData.metrics?.flagged_transactions_30d || 14}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Capital Protected</div>
                      <div className="text-lg font-bold text-emerald-400">₹{(reportData.metrics?.blocked_amount / 100000).toFixed(1)} L</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">High Risk Borrowers</div>
                      <div className="text-lg font-bold text-rose-400">{reportData.metrics?.high_risk_borrowers || 3}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">AML Escalations</div>
                      <div className="text-lg font-bold text-purple-400">{reportData.metrics?.aml_alerts_active || 4}</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReportId === 'collections' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Total Delinquent Sum</div>
                      <div className="text-lg font-bold text-rose-400">₹{(reportData.metrics?.total_overdue_portfolio / 100000).toFixed(1)} L</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Resolution Rate</div>
                      <div className="text-lg font-bold text-emerald-400">{reportData.metrics?.resolution_rate_30d || '64.2%'}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">PTP Compliance</div>
                      <div className="text-lg font-bold text-blue-400">{reportData.metrics?.ptp_compliance_rate || '78.5%'}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Accounts in Default</div>
                      <div className="text-lg font-bold text-white">{reportData.metrics?.delinquent_accounts_count || 23}</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReportId === 'liquidity' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Liquidity Coverage Ratio (LCR)</div>
                      <div className="text-lg font-bold text-emerald-400">{reportData.alm_ratios?.liquidity_coverage_ratio || 138.4}%</div>
                      <span className="text-[10px] text-slate-500">RBI Regulatory Floor: 100%</span>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Treasury Cash Reserves</div>
                      <div className="text-lg font-bold text-white">₹{(reportData.alm_ratios?.treasury_cash_surplus / 10000000).toFixed(2)} Cr</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] text-slate-400">Next 30D Cash Buffer</div>
                      <div className="text-lg font-bold text-blue-400">+₹{(reportData.alm_ratios?.next_30d_cash_gap / 100000).toFixed(1)} L</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReportId === 'executive-summary' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {reportData.highlights?.map((h: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="text-[11px] text-slate-400">{h.metric}</div>
                        <div className="text-base font-bold text-white mt-0.5">{h.value}</div>
                        <span className="text-[10px] text-emerald-400 font-semibold">{h.trend}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3.5 bg-blue-950/30 border border-blue-900/50 rounded-xl text-xs text-blue-200">
                    <span className="font-bold text-blue-300 block mb-1">Board Assessment:</span>
                    {reportData.risk_assessment}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="finsight-card p-8 text-center text-slate-500 text-xs">
              Select a report from the left navigation panel to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
