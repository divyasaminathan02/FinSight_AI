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
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
  
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

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

  const unreadCount = notifData?.unread_count || 0;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          Financial Intelligence Overview
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </h1>
        <p className="text-xs text-slate-500 font-normal">
          AI-powered portfolio intelligence across credit, fraud, customers, collections and liquidity.
        </p>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors">
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
          title="Refresh real-time intelligence data"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
        </button>

        {/* Notifications Trigger */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            aria-label="System Notifications"
            className="relative p-2 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
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
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-md hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white font-semibold flex items-center justify-center text-xs shadow-2xs">
              AM
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">Arjun Mehta</div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">Risk Manager</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">Arjun Mehta</p>
                <p className="text-[11px] text-slate-500 truncate">arjun.mehta@finsight.ai</p>
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
                <button
                  onClick={logout}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
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
