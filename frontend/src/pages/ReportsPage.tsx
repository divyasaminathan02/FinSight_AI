import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  Filter,
  SlidersHorizontal,
  Bookmark,
  Building2,
  Users,
  Eye,
  Check,
  Search,
  X
} from 'lucide-react';
import { reportsApi } from '../services/api';
import { SIMULATED_DATA_NOTICE } from '../utils/masking';

const REPORT_DEFINITIONS = [
  { id: 'portfolio', title: 'Portfolio Risk & Asset Quality', tag: 'AUM & DPD', category: 'Risk & Portfolio' },
  { id: 'loans', title: 'Active Loans & Facilities Ledger', tag: 'Facilities', category: 'Credit Operations' },
  { id: 'applications', title: 'Loan Underwriting Funnel', tag: 'Pipelines', category: 'Credit Operations' },
  { id: 'disbursement', title: 'Disbursement & Treasury Outflows', tag: 'Bank Rails', category: 'Finance & Treasury' },
  { id: 'collections', title: 'Collections & Recovery Performance', tag: 'PTP & Field', category: 'Collections' },
  { id: 'delinquency', title: 'Delinquency Aging & DPD Roll Rates', tag: 'NPA & SMA', category: 'Risk & Portfolio' },
  { id: 'fraud', title: 'Fraud & Forensic Intelligence', tag: 'AML & Abuse', category: 'Risk & Compliance' },
  { id: 'credit', title: 'Credit Underwriting & Model Decisions', tag: 'PD & Scoring', category: 'Credit Operations' },
  { id: 'customer-segments', title: 'Customer Segments & Tier Spread', tag: 'Demographics', category: 'Strategic Growth' },
  { id: 'liquidity', title: 'Liquidity & ALM Structural Gap', tag: 'LCR & Headroom', category: 'Finance & Treasury' },
  { id: 'finance', title: 'Financial Accounting & P&L Statement', tag: 'NIM & Margin', category: 'Finance & Treasury' },
  { id: 'branch-performance', title: 'Branch Performance & Targets', tag: 'Regional', category: 'Executive' },
  { id: 'product-performance', title: 'Product Performance & Economics', tag: 'Yields', category: 'Strategic Growth' },
];

const DEFAULT_SAVED_VIEWS: Record<string, { label: string; desc: string; filters: any }> = {
  default: {
    label: 'Standard Executive View',
    desc: 'Unfiltered organization-wide perspective across all standard facilities',
    filters: { dateRange: 'All', branch: 'All', product: 'All', status: 'All', segment: 'All', risk: 'All', manager: 'All', officer: 'All' },
  },
  high_risk: {
    label: 'High Risk & Delinquency Audit',
    desc: 'Focus on high-risk borrowers, SMA buckets, and critical accounts',
    filters: { dateRange: 'Last 30 Days', branch: 'All', product: 'All', status: 'OVERDUE', segment: 'All', risk: 'High', manager: 'All', officer: 'All' },
  },
  retail_focus: {
    label: 'Retail Personal & Home Loans',
    desc: 'Filter to consumer retail lending products and standard assets',
    filters: { dateRange: 'All', branch: 'All', product: 'Personal Loan', status: 'ACTIVE', segment: 'Prime', risk: 'All', manager: 'All', officer: 'All' },
  },
};

export const ReportsPage: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string>('portfolio');
  const [reportData, setReportData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Filters State
  const [dateRange, setDateRange] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [productFilter, setProductFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [segmentFilter, setSegmentFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [managerFilter, setManagerFilter] = useState<string>('All');
  const [officerFilter, setOfficerFilter] = useState<string>('All');

  // Saved Views State
  const [savedViews, setSavedViews] = useState<Record<string, { label: string; desc: string; filters: any }>>(DEFAULT_SAVED_VIEWS);
  const [activeSavedView, setActiveSavedView] = useState<string>('default');
  const [isSavingCustomView, setIsSavingCustomView] = useState(false);
  const [customViewName, setCustomViewName] = useState('');

  // Personalization: Configurable Table Columns
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, boolean>>({});
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('finsight_reports_preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hiddenColumns) setHiddenColumns(parsed.hiddenColumns);
        if (parsed.customViews) {
          setSavedViews({ ...DEFAULT_SAVED_VIEWS, ...parsed.customViews });
        }
        if (parsed.savedView) {
          applySavedView(parsed.savedView, { ...DEFAULT_SAVED_VIEWS, ...(parsed.customViews || {}) });
        }
      }
    } catch (e) {
      console.warn('Could not load report preferences:', e);
    }
  }, []);

  const savePreferences = (columns: Record<string, boolean>, view: string, customViewsList?: any) => {
    try {
      const viewsToStore = customViewsList || savedViews;
      localStorage.setItem(
        'finsight_reports_preferences',
        JSON.stringify({ hiddenColumns: columns, savedView: view, customViews: viewsToStore })
      );
    } catch (e) {
      console.warn('Could not save report preferences:', e);
    }
  };

  const applySavedView = (viewKey: string, viewsDictionary = savedViews) => {
    setActiveSavedView(viewKey);
    const view = viewsDictionary[viewKey];
    if (view && view.filters) {
      setDateRange(view.filters.dateRange || 'All');
      setBranchFilter(view.filters.branch || 'All');
      setProductFilter(view.filters.product || 'All');
      setStatusFilter(view.filters.status || 'All');
      setSegmentFilter(view.filters.segment || 'All');
      setRiskFilter(view.filters.risk || 'All');
      setManagerFilter(view.filters.manager || 'All');
      setOfficerFilter(view.filters.officer || 'All');
      savePreferences(hiddenColumns, viewKey, viewsDictionary);
    }
  };

  const handleSaveCustomView = () => {
    if (!customViewName.trim()) return;
    const viewKey = 'custom_' + Date.now();
    const newView = {
      label: customViewName.trim(),
      desc: `User configured view: ${branchFilter !== 'All' ? branchFilter : 'All branches'}, ${productFilter !== 'All' ? productFilter : 'All products'}`,
      filters: {
        dateRange,
        branch: branchFilter,
        product: productFilter,
        status: statusFilter,
        segment: segmentFilter,
        risk: riskFilter,
        manager: managerFilter,
        officer: officerFilter,
      }
    };
    const updatedViews = { ...savedViews, [viewKey]: newView };
    setSavedViews(updatedViews);
    setActiveSavedView(viewKey);
    savePreferences(hiddenColumns, viewKey, updatedViews);
    setCustomViewName('');
    setIsSavingCustomView(false);
  };

  const toggleColumnVisibility = (colName: string) => {
    setHiddenColumns((prev) => {
      const updated = { ...prev, [colName]: !prev[colName] };
      savePreferences(updated, activeSavedView);
      return updated;
    });
  };

  useEffect(() => {
    loadReportDetails(selectedReportId);
  }, [selectedReportId, dateRange, branchFilter, productFilter, statusFilter, segmentFilter, riskFilter, managerFilter, officerFilter]);

  const currentFilterParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (dateRange === 'Today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      params.start_date = start.toISOString();
    } else if (dateRange === 'Last 7 Days') {
      const start = new Date(Date.now() - 7 * 86400000);
      params.start_date = start.toISOString();
    } else if (dateRange === 'Last 30 Days') {
      const start = new Date(Date.now() - 30 * 86400000);
      params.start_date = start.toISOString();
    }
    if (branchFilter !== 'All') params.branch = branchFilter;
    if (productFilter !== 'All') params.product = productFilter;
    if (statusFilter !== 'All') params.status = statusFilter;
    if (segmentFilter !== 'All') params.customer_segment = segmentFilter;
    if (riskFilter !== 'All') params.risk = riskFilter;
    if (managerFilter !== 'All') params.manager = managerFilter;
    if (officerFilter !== 'All') params.officer = officerFilter;
    return params;
  }, [dateRange, branchFilter, productFilter, statusFilter, segmentFilter, riskFilter, managerFilter, officerFilter]);

  const loadReportDetails = async (reportId: string) => {
    setLoadingData(true);
    try {
      const res = await reportsApi.getData(reportId, currentFilterParams);
      setReportData(res);
    } catch (err) {
      console.error('Error loading report details:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDownloadCsv = () => {
    setDownloading(true);
    const url = reportsApi.downloadCsvUrl(selectedReportId, currentFilterParams);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `finsight_${selectedReportId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 800);
  };

  const handleDownloadPdf = () => {
    const url = reportsApi.downloadPdfUrl(selectedReportId, currentFilterParams);
    window.open(url, '_blank');
  };

  const rawRows: any[] = reportData?.rows || [];
  const rawHeaders: string[] = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  const visibleHeaders = rawHeaders.filter((h) => !hiddenColumns[h]);

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="font-semibold">{SIMULATED_DATA_NOTICE}</span>
        </div>
        <span className="text-[11px] text-amber-400/80">
          Strict RBAC Enforced • PII Masked for Non-Privileged Exports
        </span>
      </div>

      {/* Header Banner */}
      <div className="finsight-card p-5 bg-gradient-to-r from-slate-900 to-[#0B132B] text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Enterprise Reporting & Dossier Engine</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  13 Canonical Reports
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Live database aggregation, multi-dimensional filtering, customizable views, and regulatory export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadReportDetails(selectedReportId)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              disabled={downloading}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Generating...' : 'Export CSV'}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF / Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Navigator & Right Detailed View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: 13 Reports Navigator */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Report Catalog (13)
            </span>
          </div>

          <div className="space-y-1.5 max-h-[75vh] overflow-y-auto pr-1">
            {REPORT_DEFINITIONS.map((r) => {
              const isSelected = selectedReportId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReportId(r.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/50 text-blue-400 font-semibold shadow-xs'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs truncate">{r.title}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span>{r.category}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                      isSelected
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {r.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 3 Columns: Filters, Personalization & Report Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Personalization & Filter Matrix Bar */}
          <div className="finsight-card p-4 bg-slate-900/60 border-slate-800 space-y-3">
            {/* Row 1: Saved View Presets & Column Picker */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Bookmark className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold text-slate-300">Saved View:</span>
                <div className="flex flex-wrap rounded-md bg-slate-800/70 p-0.5 border border-slate-700 gap-0.5">
                  {Object.entries(savedViews).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => applySavedView(k)}
                      className={`px-2.5 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                        activeSavedView === k
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                {!isSavingCustomView ? (
                  <button
                    onClick={() => setIsSavingCustomView(true)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                    title="Save current filters and column preferences as a reusable preset"
                  >
                    <span>+ Save View</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-md border border-slate-700">
                    <input
                      type="text"
                      placeholder="View Name..."
                      value={customViewName}
                      onChange={(e) => setCustomViewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomView(); }}
                      className="px-2 py-0.5 text-xs bg-slate-900 text-white rounded border border-slate-600 outline-none w-32"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveCustomView}
                      disabled={!customViewName.trim()}
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-bold rounded cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setIsSavingCustomView(false); setCustomViewName(''); }}
                      className="text-slate-400 hover:text-slate-200 text-xs px-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Column Configurator Toggle */}
              <div className="relative">
                <button
                  onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configure Columns ({visibleHeaders.length}/{rawHeaders.length})</span>
                </button>

                {isColumnPickerOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-3 z-30 animate-in fade-in duration-100">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-bold text-white">Visible Columns</span>
                      <button
                        onClick={() => setIsColumnPickerOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="py-2 max-h-48 overflow-y-auto space-y-1">
                      {rawHeaders.map((col) => {
                        const isVisible = !hiddenColumns[col];
                        return (
                          <label
                            key={col}
                            className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-800/60 p-1 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => toggleColumnVisibility(col)}
                              className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">{col.replace(/_/g, ' ').toUpperCase()}</span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => {
                        setHiddenColumns({});
                        savePreferences({}, activeSavedView);
                      }}
                      className="w-full text-center text-[10px] text-blue-400 hover:text-blue-300 pt-2 border-t border-slate-800 cursor-pointer"
                    >
                      Reset All Columns
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Comprehensive 8-Dimension Filter Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs"
                >
                  <option value="All">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Branch
                </label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs"
                >
                  <option value="All">All Branches</option>
                  <option value="BR-MUM-01">Mumbai Central</option>
                  <option value="BR-DEL-01">New Delhi Hub</option>
                  <option value="BR-BLR-01">Bengaluru Tech</option>
                  <option value="BR-PUN-01">Pune Industrial</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Product
                </label>
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs"
                >
                  <option value="All">All Products</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Home Loan">Home Loan</option>
                  <option value="MSME Business Loan">MSME Loan</option>
                  <option value="Loan Against Property">Loan Against Property</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs"
                >
                  <option value="All">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="OVERDUE">OVERDUE</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Segment
                </label>
                <select
                  value={segmentFilter}
                  onChange={(e) => setSegmentFilter(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs"
                >
                  <option value="All">All Segments</option>
                  <option value="Prime">Prime Tier</option>
                  <option value="Near Prime">Near Prime</option>
                  <option value="Sub Prime">Sub Prime</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Risk Tier
                </label>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs"
                >
                  <option value="All">All Risk Tiers</option>
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Manager
                </label>
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs"
                >
                  <option value="All">All Managers</option>
                  <option value="Rajesh Verma">Rajesh Verma</option>
                  <option value="Amitabh Saxena">Amitabh Saxena</option>
                  <option value="Siddharth Rao">Siddharth Rao</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Officer
                </label>
                <select
                  value={officerFilter}
                  onChange={(e) => setOfficerFilter(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs"
                >
                  <option value="All">All Officers</option>
                  <option value="Priya Sharma">Priya Sharma</option>
                  <option value="Vikram Malhotra">Vikram Malhotra</option>
                  <option value="Ananya Deshmukh">Ananya Deshmukh</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Report Header & KPIs */}
          <div className="finsight-card p-5 bg-slate-900 border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{reportData?.title || 'Report Details'}</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    (ID: {reportData?.report_id || selectedReportId})
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generated at {reportData?.generated_at ? new Date(reportData.generated_at).toLocaleString() : 'Live'}
                </p>
              </div>
            </div>

            {/* Summary KPI Cards */}
            {reportData?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(reportData.summary).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 truncate block">
                      {k.replace(/_/g, ' ')}
                    </span>
                    <div className="text-base font-bold text-white mt-0.5">
                      {typeof v === 'number' && v > 1000 ? `₹${v.toLocaleString()}` : String(v)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Detailed Rows Table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="max-h-[50vh] overflow-x-auto overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-[11px] text-slate-400 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-700">
                    <tr>
                      {visibleHeaders.map((h) => (
                        <th key={h} className="p-2.5 whitespace-nowrap">
                          {h.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {rawRows.length > 0 ? (
                      rawRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          {visibleHeaders.map((h) => (
                            <td key={h} className="p-2.5 whitespace-nowrap font-mono text-[11px]">
                              {typeof r[h] === 'number' && r[h] > 1000 ? `₹${r[h].toLocaleString()}` : String(r[h] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={visibleHeaders.length || 1} className="py-8 text-center text-slate-500">
                          {loadingData ? 'Loading report data...' : 'No records match the selected filter criteria.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-500">
              Showing {rawRows.length} rows • Generated from live SQLite primary datastore
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
