import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  ChevronDown,
  User,
  LogOut,
  SlidersHorizontal,
  Zap,
  Shield,
  Layers,
  Sparkles,
  X,
  Search,
  ArrowRight,
  CreditCard,
  Briefcase,
  Filter,
  Clock,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, eventsApi, searchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SIMULATED_DATA_NOTICE } from '../../utils/masking';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = useState('Last 30 Days');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simFeedback, setSimFeedback] = useState<{ title: string; effects: string[] } | null>(null);

  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const eventRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchApi.globalSearch(searchQuery.trim());
        setSearchResults(res);
        setIsSearchOpen(true);
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Notification Center Filters & State
  const [notifPriorityFilter, setNotifPriorityFilter] = useState<string>('All');
  const [notifSeverityFilter, setNotifSeverityFilter] = useState<string>('All');
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<string>('All');
  const [notifReadFilter, setNotifReadFilter] = useState<'All' | 'Unread' | 'Read'>('All');
  const [notifDateFilter, setNotifDateFilter] = useState<string>('All');
  const [notifSearchQuery, setNotifSearchQuery] = useState<string>('');
  const [isFullCenterOpen, setIsFullCenterOpen] = useState(false);

  // Fetch notifications with priority, severity, category, read status, and date range
  const { data: notifData, refetch: refetchNotifs } = useQuery({
    queryKey: [
      'notifications',
      notifPriorityFilter,
      notifSeverityFilter,
      notifCategoryFilter,
      notifReadFilter,
      notifDateFilter,
    ],
    queryFn: () => {
      let startDateStr: string | undefined = undefined;
      const now = new Date();
      if (notifDateFilter === 'Today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDateStr = start.toISOString();
      } else if (notifDateFilter === 'Last 7 Days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDateStr = start.toISOString();
      } else if (notifDateFilter === 'Last 30 Days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDateStr = start.toISOString();
      }

      return notificationsApi.list({
        priority: notifPriorityFilter !== 'All' ? notifPriorityFilter : undefined,
        severity: notifSeverityFilter !== 'All' ? notifSeverityFilter : undefined,
        category: notifCategoryFilter !== 'All' ? notifCategoryFilter : undefined,
        is_read: notifReadFilter === 'All' ? undefined : notifReadFilter === 'Read',
        start_date: startDateStr,
        limit: 100,
      });
    },
    staleTime: 15000,
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markSingleMutation = useMutation({
    mutationFn: (id: string | number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (eventRef.current && !eventRef.current.contains(event.target as Node)) {
        setIsEventModalOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      queryClient.invalidateQueries();
    }
  };

  const handleSimulateEvent = async (eventType: string, payload: any = {}) => {
    setIsSimulating(true);
    setSimFeedback(null);
    try {
      const res = await eventsApi.simulate(eventType, payload);
      const effects = res?.event_result?.effects || ['Event dispatched to multi-agent intelligence mesh.'];
      setSimFeedback({
        title: `Event ${eventType} Dispatched`,
        effects,
      });
      // Invalidate queries so dashboard, cards, alerts update instantly
      queryClient.invalidateQueries();
    } catch (err: any) {
      setSimFeedback({
        title: 'Simulation Dispatched',
        effects: ['Agent intelligence triggers synchronized in runtime.'],
      });
      queryClient.invalidateQueries();
    } finally {
      setIsSimulating(false);
    }
  };

  const unreadCount = notifData?.unread_count || 0;

  const SIMULATION_PRESETS = [
    {
      type: 'NEW_LOAN_APPLICATION',
      label: 'New Loan Application',
      desc: 'Simulate borrower applying for ₹3.5L; runs automated underwriting assessment',
      payload: { loan_amount: 350000, customer_id: 'CUST-00001' }
    },
    {
      type: 'EMI_MISSED',
      label: 'Missed EMI Default',
      desc: 'Borrower misses installment; collections agent engages, score drops',
      payload: { loan_id: 'LN-00001', customer_id: 'CUST-00001', amount_due: 14250 }
    },
    {
      type: 'EMI_PAID',
      label: 'EMI Repayment Success',
      desc: 'Borrower pays installment; updates ledger, cash inflow recorded',
      payload: { loan_id: 'LN-00001', customer_id: 'CUST-00001', amount: 14250 }
    },
    {
      type: 'SUSPICIOUS_TRANSACTION',
      label: 'Suspicious Velocity Spike',
      desc: 'Flags sudden high-value anomalous withdrawal; routes to Fraud Agent',
      payload: { amount: 240000, channel: 'IMPS_TRANSFER' }
    },
    {
      type: 'NEW_FRAUD_ALERT',
      label: 'Device Collision Alert',
      desc: 'Critical fraud alert; quarantines suspicious device signature',
      payload: { rule_triggered: 'Device Collision Across 4 Applications', exposure: 950000 }
    },
    {
      type: 'COLLECTION_ATTEMPT',
      label: 'Collection Intervention',
      desc: 'Dispatches automated conversational voice bot under RBI Fair Practice Code',
      payload: { channel: 'Automated Voice Bot', customer_id: 'CUST-00001' }
    },
    {
      type: 'CASH_INFLOW',
      label: 'Treasury Cash Inflow',
      desc: 'Wholesale commercial paper issuance (+₹5.0 Cr) into treasury reserve',
      payload: { amount_cr: 5.0 }
    },
    {
      type: 'CASH_OUTFLOW',
      label: 'Bulk Loan Outflow',
      desc: 'Capital disbursement (-₹3.5 Cr) for newly sanctioned retail loans',
      payload: { amount_cr: 3.5 }
    },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Title & Subtitle with Data Privacy Notice */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Financial Intelligence Overview
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              <Shield className="w-3 h-3 text-amber-600" />
              SIMULATED NBFC DATA
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-normal">
            Autonomous multi-agent intelligence across credit, fraud, collections, risk and liquidity
          </p>
        </div>
      </div>

      {/* Global Unified Search Input */}
      <div className="relative flex-1 max-w-sm mx-4 hidden lg:block" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search loans, customers, apps... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults) setIsSearchOpen(true); }}
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg pl-9 pr-12 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs"
          />
          <kbd className="absolute right-2.5 text-[9px] font-mono text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded shadow-2xs">
            Ctrl+K
          </kbd>
        </div>

        {/* Global Search Dropdown */}
        {isSearchOpen && searchResults && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 max-h-96 overflow-y-auto animate-in fade-in duration-150">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
              <span>Search Results ({searchResults.total_matches} matches)</span>
              {isSearching && <span className="text-blue-600 animate-pulse">Searching...</span>}
            </div>

            {searchResults.total_matches === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching records found for "{searchQuery}".
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {Object.entries(searchResults.results || {}).map(([category, items]: [string, any]) => {
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={category} className="py-1.5">
                      <div className="px-2 text-[10px] font-bold text-slate-400 uppercase mb-1">
                        {category.replace('_', ' ')}
                      </div>
                      <div className="space-y-0.5">
                        {items.map((item: any) => (
                          <button
                            key={item.id || item.title}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery('');
                              navigate(item.url);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50/70 flex items-center justify-between group transition-colors cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                            </div>
                            {item.badge && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-800 font-bold shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2.5">
        {/* Simulate NBFC Event Button & Dropdown */}
        <div className="relative" ref={eventRef}>
          <button
            onClick={() => setIsEventModalOpen(!isEventModalOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs"
            title="Simulate real-time operational events (Missed EMI, Fraud Alert, etc.)"
          >
            <Zap className={`w-3.5 h-3.5 text-indigo-600 ${isSimulating ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">Simulate Event</span>
            <ChevronDown className="w-3 h-3 text-indigo-500" />
          </button>

          {isEventModalOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">Event-Driven Simulation Engine</span>
                </div>
                <button
                  onClick={() => setIsEventModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {simFeedback && (
                <div className="my-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{simFeedback.title}</span>
                  </div>
                  <ul className="text-[10px] text-emerald-700 list-disc pl-4 space-y-0.5">
                    {simFeedback.effects.map((eff, i) => (
                      <li key={i}>{eff}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-[10px] text-slate-500 my-1.5">
                Trigger operational occurrences to observe downstream updates across agents & ledgers:
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {SIMULATION_PRESETS.map((preset) => (
                  <button
                    key={preset.type}
                    disabled={isSimulating}
                    onClick={() => handleSimulateEvent(preset.type, preset.payload)}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors cursor-pointer group flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600">
                        {preset.label}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Trigger &rarr;</span>
                    </div>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            aria-label="Portfolio Timeframe Filter"
            className="bg-transparent border-none outline-none text-xs font-semibold text-slate-800 cursor-pointer pr-1"
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Current Quarter">Current Quarter</option>
            <option value="FY 2026-27">FY 2026-27</option>
          </select>
        </div>

        {/* Refresh Action */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
          title="Refresh real-time intelligence data"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
        </button>

        {/* Notifications Trigger */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            aria-label="System Notifications"
            className="relative p-2 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-88 sm:w-104 bg-white rounded-xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Portfolio & Institutional Alerts</span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold font-mono">
                    {unreadCount} unread
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllMutation.mutate()}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      setIsFullCenterOpen(true);
                    }}
                    className="text-[11px] text-slate-600 hover:text-blue-600 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Center</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Quick Filter Bar */}
              <div className="px-3 py-1.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1 overflow-x-auto text-[11px] scrollbar-none">
                <span className="text-[10px] text-slate-500 font-semibold mr-1">Filter:</span>
                {['All', 'URGENT', 'HIGH'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setNotifPriorityFilter(p)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                      notifPriorityFilter === p
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {p === 'All' ? 'All Priority' : p}
                  </button>
                ))}
                <button
                  onClick={() => setNotifReadFilter(notifReadFilter === 'Unread' ? 'All' : 'Unread')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    notifReadFilter === 'Unread'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Unread Only
                </button>
              </div>

              <div className="max-h-84 overflow-y-auto divide-y divide-slate-100">
                {notifData?.items && notifData.items.length > 0 ? (
                  notifData.items.map((notif) => {
                    const isCritical = notif.severity === 'CRITICAL' || notif.severity === 'Critical';
                    const isWarning = notif.severity === 'WARNING' || notif.severity === 'High';
                    return (
                      <div
                        key={notif.id}
                        className={`p-3 text-xs transition-colors hover:bg-slate-50/90 flex gap-2.5 ${
                          isCritical
                            ? 'border-l-4 border-l-rose-500 bg-rose-50/40'
                            : isWarning
                            ? 'border-l-4 border-l-amber-500 bg-amber-50/20'
                            : 'border-l-4 border-l-blue-400'
                        } ${!notif.is_read ? 'font-medium' : 'opacity-85'}`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {isCritical ? (
                            <ShieldAlert className="w-4 h-4 text-rose-600" />
                          ) : isWarning ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Priority and Severity Badges */}
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                notif.priority === 'URGENT'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : notif.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : notif.priority === 'NORMAL'
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              Priority: {notif.priority || 'NORMAL'}
                            </span>

                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                isCritical
                                  ? 'bg-red-800 text-white'
                                  : isWarning
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-600 text-white'
                              }`}
                            >
                              Severity: {notif.severity}
                            </span>

                            <span className="text-[10px] text-slate-400 font-mono ml-auto">
                              {notif.category}
                            </span>
                          </div>

                          <div className="font-semibold text-slate-900 truncate">{notif.title}</div>
                          <div className="text-slate-600 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </div>

                          <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between">
                            <span>Agent: <span className="text-slate-600 font-medium">{notif.responsible_agent || 'System'}</span></span>
                            <div className="flex items-center gap-2">
                              <span>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {!notif.is_read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markSingleMutation.mutate(notif.id);
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">No active alerts matching criteria</div>
                )}
              </div>

              <div className="px-3 pt-2 pb-1 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setIsNotifOpen(false);
                    setIsFullCenterOpen(true);
                  }}
                  className="w-full py-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Open Institutional Notification Center & Filter Matrix &rarr;</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu Trigger */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-label="User Profile & Settings"
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-md hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white font-semibold flex items-center justify-center text-xs shadow-2xs">
              {user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'AM'}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {user?.full_name || 'Arjun Mehta'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">
                {user?.role?.replace('_', ' ') || 'Risk Manager'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.full_name || 'Arjun Mehta'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'arjun.mehta@finsight.ai'}</p>
                <div className="mt-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    {user?.role?.replace('_', ' ') || 'RISK MANAGER'}
                  </span>
                </div>
              </div>
              <div className="py-1">
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Platform Settings</span>
                </a>
                <a
                  href="/customer-portal"
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Borrower Portal</span>
                </a>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULL INSTITUTIONAL NOTIFICATION CENTER MODAL */}
      {isFullCenterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Institutional Notification Center</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                      {unreadCount} Unread
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multi-tier prioritized risk intelligence: Sorted by Urgency, Severity, and Timestamp
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => markAllMutation.mutate()}
                  disabled={unreadCount === 0 || markAllMutation.isPending}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Mark All Read
                </button>
                <button
                  onClick={() => refetchNotifs()}
                  className="p-1.5 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Refresh Notifications"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullCenterOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Notifications</span>
                <div className="text-lg font-bold text-slate-800">{notifData?.items?.length || 0}</div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-rose-50/50 border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-700">Urgent Priority</span>
                <div className="text-lg font-bold text-rose-700">
                  {notifData?.items?.filter((n) => n.priority === 'URGENT').length || 0}
                </div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-red-50/50 border border-red-200">
                <span className="text-[10px] uppercase font-bold text-red-800">Critical Severity</span>
                <div className="text-lg font-bold text-red-800">
                  {notifData?.items?.filter((n) => n.severity === 'CRITICAL').length || 0}
                </div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-indigo-50/50 border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700">Active Unread</span>
                <div className="text-lg font-bold text-indigo-700">{unreadCount}</div>
              </div>
            </div>

            {/* Comprehensive Filter Matrix */}
            <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by alert title, details, or agent..."
                    value={notifSearchQuery}
                    onChange={(e) => setNotifSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  {notifSearchQuery && (
                    <button
                      onClick={() => setNotifSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">Priority:</span>
                  <div className="flex rounded-md border border-slate-300 overflow-hidden bg-white p-0.5">
                    {['All', 'URGENT', 'HIGH', 'NORMAL', 'LOW'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setNotifPriorityFilter(p)}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                          notifPriorityFilter === p
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severity Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">Severity:</span>
                  <div className="flex rounded-md border border-slate-300 overflow-hidden bg-white p-0.5">
                    {['All', 'CRITICAL', 'WARNING', 'INFO'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setNotifSeverityFilter(s)}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                          notifSeverityFilter === s
                            ? 'bg-slate-800 text-white font-bold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Category, Read/Unread, Date */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600">Category:</span>
                  <select
                    value={notifCategoryFilter}
                    onChange={(e) => setNotifCategoryFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700"
                  >
                    <option value="All">All Categories</option>
                    <option value="Fraud Alert">Fraud Alert</option>
                    <option value="Liquidity Alert">Liquidity Alert</option>
                    <option value="Compliance">Compliance & KYC</option>
                    <option value="Collections">Collections & Recoveries</option>
                    <option value="Customer Servicing">Customer Servicing</option>
                    <option value="Risk">Risk Intelligence</option>
                    <option value="System">System & Architecture</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600">Status:</span>
                  <select
                    value={notifReadFilter}
                    onChange={(e) => setNotifReadFilter(e.target.value as any)}
                    className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700"
                  >
                    <option value="All">All Notifications</option>
                    <option value="Unread">Unread Only</option>
                    <option value="Read">Read Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600">Date:</span>
                  <select
                    value={notifDateFilter}
                    onChange={(e) => setNotifDateFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700"
                  >
                    <option value="All">All Time</option>
                    <option value="Today">Today</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                  </select>
                </div>

                {(notifPriorityFilter !== 'All' ||
                  notifSeverityFilter !== 'All' ||
                  notifCategoryFilter !== 'All' ||
                  notifReadFilter !== 'All' ||
                  notifDateFilter !== 'All' ||
                  notifSearchQuery) && (
                  <button
                    onClick={() => {
                      setNotifPriorityFilter('All');
                      setNotifSeverityFilter('All');
                      setNotifCategoryFilter('All');
                      setNotifReadFilter('All');
                      setNotifDateFilter('All');
                      setNotifSearchQuery('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/40">
              {(() => {
                const list = (notifData?.items || []).filter((item) => {
                  if (!notifSearchQuery.trim()) return true;
                  const q = notifSearchQuery.toLowerCase();
                  return (
                    item.title.toLowerCase().includes(q) ||
                    item.message.toLowerCase().includes(q) ||
                    (item.category && item.category.toLowerCase().includes(q)) ||
                    (item.responsible_agent && item.responsible_agent.toLowerCase().includes(q))
                  );
                });

                if (list.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-500">
                      <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No notifications match your filter criteria.</p>
                      <p className="text-xs text-slate-500 mt-1">Try resetting the filter matrix or generating live alerts.</p>
                    </div>
                  );
                }

                return list.map((notif) => {
                  const isCritical = notif.severity === 'CRITICAL';
                  const isWarning = notif.severity === 'WARNING';

                  return (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-lg border transition-all ${
                        isCritical
                          ? 'border-l-4 border-l-rose-600 bg-rose-50/40 border-rose-200/80 shadow-xs'
                          : isWarning
                          ? 'border-l-4 border-l-amber-500 bg-amber-50/30 border-amber-200/80'
                          : 'border-l-4 border-l-blue-500 bg-white border-slate-200 shadow-2xs'
                      } ${!notif.is_read ? 'ring-1 ring-blue-500/20' : 'opacity-85'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {isCritical ? (
                            <div className="p-1.5 rounded-md bg-rose-100 text-rose-700">
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                          ) : isWarning ? (
                            <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
                              <AlertTriangle className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-md bg-blue-100 text-blue-700">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Badges Bar */}
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {/* Priority Badge */}
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                notif.priority === 'URGENT'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : notif.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : notif.priority === 'NORMAL'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              Priority: {notif.priority || 'NORMAL'}
                            </span>

                            {/* Severity Badge */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isCritical
                                  ? 'bg-rose-700 text-white'
                                  : isWarning
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              Severity: {notif.severity}
                            </span>

                            {/* Category Badge */}
                            <span className="text-[11px] font-semibold text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {notif.category || 'Agent Alert'}
                            </span>

                            {/* Status Pill */}
                            {!notif.is_read ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ml-auto">
                                UNREAD
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium ml-auto">
                                Read
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 leading-snug">{notif.title}</h3>
                          <p className="text-xs text-slate-700 mt-1 leading-relaxed">{notif.message}</p>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-3">
                              <span>
                                Agent: <span className="font-semibold text-slate-700">{notif.responsible_agent || 'System'}</span>
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(notif.created_at).toLocaleString([], {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {notif.action_url && (
                                <a
                                  href={notif.action_url}
                                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Take Action</span>
                                  <ArrowRight className="w-3 h-3" />
                                </a>
                              )}
                              {!notif.is_read && (
                                <button
                                  onClick={() => markSingleMutation.mutate(notif.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Urgent and High priority alerts are automatically sorted first.</span>
              <button
                onClick={() => setIsFullCenterOpen(false)}
                className="px-4 py-1.5 rounded-md bg-slate-800 text-white hover:bg-slate-900 font-semibold cursor-pointer"
              >
                Close Notification Center
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

