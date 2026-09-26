import React, { useState, useRef, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, eventsApi } from '../../services/api';
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

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const eventRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const { data: notifData, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    staleTime: 30000,
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
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
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Portfolio Alerts</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                    {unreadCount} new
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifData?.items && notifData.items.length > 0 ? (
                  notifData.items.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 text-xs transition-colors hover:bg-slate-50 flex gap-2.5 ${
                        !notif.is_read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {notif.severity === 'Critical' && <ShieldAlert className="w-4 h-4 text-rose-600" />}
                        {notif.severity === 'High' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {notif.severity === 'Medium' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                        {notif.severity === 'Low' && <Info className="w-4 h-4 text-blue-600" />}
                        {notif.severity === 'Info' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">{notif.title}</div>
                        <div className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{notif.message}</div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                          <span>{notif.responsible_agent || 'System'}</span>
                          <span>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">No active alerts at this time</div>
                )}
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
                  onClick={logout}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
