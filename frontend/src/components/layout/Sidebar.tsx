import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  ShieldAlert,
  Users,
  PiggyBank,
  Activity,
  Coins,
  Bot,
  FileText,
  Settings,
  UserCheck,
  ChevronRight,
  Sparkles,
  Cpu,
  ClipboardCheck,
  Layers,
  DollarSign,
  TrendingUp,
  Shield,
  Briefcase,
  CheckSquare,
  LifeBuoy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Executive Command', path: '/executive', icon: TrendingUp, badge: 'C-Suite' },
  { name: 'Sales & Origination', path: '/sales', icon: Briefcase, badge: 'Origination' },
  { name: 'Relationship Desk', path: '/relationship', icon: Users, badge: 'RM' },
  { name: 'KYC & Compliance', path: '/kyc/dashboard', icon: UserCheck, badge: 'AML' },
  { name: 'Fraud Intelligence', path: '/fraud/dashboard', icon: ShieldAlert, alert: true },
  { name: 'Task & Approval Center', path: '/tasks', icon: CheckSquare, badge: 'Tasks' },
  { name: 'Underwriting Queue', path: '/underwriting-queue', icon: ClipboardCheck, badge: 'Queue' },
  { name: 'Credit Intelligence', path: '/credit', icon: CreditCard },
  { name: 'Credit Manager Desk', path: '/credit-manager', icon: Shield, badge: 'Sanctions' },
  { name: 'Risk Intelligence', path: '/risk', icon: Activity },
  { name: 'Risk Manager Desk', path: '/risk-manager/dashboard', icon: Shield, badge: 'Risk Desk' },
  { name: 'Operations Desk', path: '/operations', icon: Layers },
  { name: 'Finance & Treasury', path: '/finance', icon: DollarSign },
  { name: 'Customer Intelligence', path: '/customer', icon: Users },
  { name: 'Collections', path: '/collections', icon: PiggyBank },
  { name: 'Liquidity Intelligence', path: '/liquidity', icon: Coins },
  { name: 'Loan Analysis', path: '/loan-analysis', icon: Cpu, badge: 'LangGraph' },
  { name: 'AI Copilot', path: '/copilot', icon: Bot, isSpecial: true },
  { name: 'Audit Trail', path: '/audit-logs', icon: Shield },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Support Desk', path: '/support', icon: LifeBuoy, badge: 'Helpdesk' },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Admin Portal', path: '/admin', icon: Shield, badge: 'Governance' },
];

export const Sidebar: React.FC = () => {
  const { user, switchRole } = useAuth();

  return (
    <aside className="w-60 min-w-60 bg-[#0B132B] text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800 select-none z-30">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-white tracking-tight">FinSight AI</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">NBFC Intelligence Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core Intelligence
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-2.5 py-2 rounded-md text-[13px] font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : item.isSpecial ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {item.alert && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  )}

                  {item.isSpecial && !isActive && (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        <div className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Borrower Facing
        </div>
        <NavLink
          to="/customer-portal"
          className="flex items-center justify-between px-2.5 py-2 rounded-md text-[13px] font-medium text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-all border border-emerald-900/30"
        >
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Borrower Portal</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-900/60 text-emerald-300 rounded font-bold">
            Live
          </span>
        </NavLink>
      </div>

      {/* Bottom Profile / Role Section */}
      <div className="p-3 border-t border-slate-800/80 bg-[#090F22]">
        <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white border border-slate-600 shrink-0">
                AM
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'Arjun Mehta'}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.role?.replace('_', ' ') || 'Risk Manager'}</div>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400" title="Active Connection" />
          </div>

          {/* Quick RBAC Role Selector */}
          <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">RBAC Role:</span>
            <select
              value={user?.role || 'RISK_MANAGER'}
              onChange={(e) => switchRole(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-[11px] outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="CUSTOMER">Customer (Borrower)</option>
              <option value="SALES_OFFICER">Sales Officer</option>
              <option value="RELATIONSHIP_MANAGER">Relationship Manager</option>
              <option value="CREDIT_ANALYST">Credit Analyst</option>
              <option value="CREDIT_MANAGER">Credit Manager</option>
              <option value="FRAUD_OFFICER">Fraud Officer</option>
              <option value="KYC_OFFICER">KYC Officer</option>
              <option value="COLLECTIONS_OFFICER">Collections Officer</option>
              <option value="COLLECTIONS_MANAGER">Collections Manager</option>
              <option value="OPERATIONS_OFFICER">Operations Officer</option>
              <option value="OPERATIONS_MANAGER">Operations Manager</option>
              <option value="FINANCE_OFFICER">Finance Officer</option>
              <option value="FINANCE_MANAGER">Finance Manager</option>
              <option value="RISK_ANALYST">Risk Analyst</option>
              <option value="RISK_MANAGER">Risk Manager</option>
              <option value="ADMIN">Admin (Full Access)</option>
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
};
