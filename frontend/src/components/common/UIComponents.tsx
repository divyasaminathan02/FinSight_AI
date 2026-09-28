import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Shield,
  Filter,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  HelpCircle,
  LucideIcon
} from 'lucide-react';

// ==========================================
// 1. PAGE HEADER & SECTION HEADER
// ==========================================

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
}) => {
  return (
    <div className="mb-6 pb-4 border-b border-slate-200">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              <span className={idx === breadcrumbs.length - 1 ? 'font-semibold text-slate-700' : 'hover:text-slate-900 cursor-pointer'}>
                {b.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-[#172033] tracking-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-[#4B5563] mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

export interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  badge,
  action,
}) => {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#172033]">{title}</h2>
          {badge}
        </div>
        {description && <p className="text-[11px] text-[#4B5563] mt-0.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// ==========================================
// 2. STAT CARD
// ==========================================

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  subtext?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  trend,
  subtext,
  icon: Icon,
  badge,
  className = '',
}) => {
  return (
    <div className={`finsight-card p-4.5 bg-white border border-[#E2E8F0] rounded-xl relative overflow-hidden ${className}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-[#4B5563] tracking-wide">{title}</span>
        {Icon ? (
          <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-[#1F2937] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        ) : badge}
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-[#172033] tracking-tight">{value}</span>
        {unit && <span className="text-xs font-semibold text-[#64748B]">{unit}</span>}
      </div>

      {(trend || subtext) && (
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-bold ${
                trend.direction === 'up'
                  ? 'text-emerald-700'
                  : trend.direction === 'down'
                  ? 'text-rose-700'
                  : 'text-slate-600'
              }`}
            >
              {trend.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
              {trend.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
              {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
              <span>{Math.abs(trend.value)}%</span>
            </span>
          )}
          {trend?.label && <span className="text-[#64748B]">{trend.label}</span>}
          {subtext && !trend && <span className="text-[#64748B]">{subtext}</span>}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. STATUS BADGE & RISK BADGE
// ==========================================

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const s = (status || '').toUpperCase().replace('-', '_');

  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (['APPROVED', 'ACTIVE', 'COMPLETED', 'RESOLVED', 'NORMAL', 'VERIFIED'].includes(s)) {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    dotColor = 'bg-emerald-500';
  } else if (['UNDER_REVIEW', 'PENDING', 'DOCUMENTS_REQUIRED', 'IN_PROGRESS', 'CONTACTED'].includes(s)) {
    style = 'bg-amber-50 text-amber-800 border-amber-200/80';
    dotColor = 'bg-amber-500';
  } else if (['REJECTED', 'DELINQUENT', 'DEFAULT', 'CRITICAL', 'CANCELLED', 'HIGH_RISK'].includes(s)) {
    style = 'bg-rose-50 text-rose-800 border-rose-200/80';
    dotColor = 'bg-rose-500';
  } else if (['NEW', 'QUALIFIED', 'DISBURSEMENT_PENDING', 'FLAGGED'].includes(s)) {
    style = 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
    dotColor = 'bg-indigo-500';
  }

  const sz = size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[11px] px-2 py-0.5';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${style} ${sz}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="capitalize">{status?.toLowerCase().replace('_', ' ')}</span>
    </span>
  );
};

export interface RiskBadgeProps {
  tier: 'Low' | 'Moderate' | 'High' | 'Critical' | string;
  score?: number;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ tier, score, size = 'sm' }) => {
  const t = (tier || '').toLowerCase();

  let style = 'bg-slate-100 text-slate-700 border-slate-300';
  if (t === 'low') {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  } else if (t === 'moderate') {
    style = 'bg-amber-50 text-amber-800 border-amber-300';
  } else if (t === 'high') {
    style = 'bg-orange-50 text-orange-800 border-orange-300';
  } else if (t === 'critical') {
    style = 'bg-rose-50 text-rose-800 border-rose-300';
  }

  const sz = size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[11px] px-2 py-0.5';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded border ${style} ${sz}`}>
      <span>{tier}</span>
      {score !== undefined && <span className="opacity-75 font-mono text-[10px]">({score})</span>}
    </span>
  );
};

// ==========================================
// 4. EMPTY, LOADING & ERROR STATES
// ==========================================

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = HelpCircle,
  action,
}) => {
  return (
    <div className="p-8 text-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl my-4">
      <div className="w-12 h-12 rounded-full bg-slate-200/70 border border-slate-300 text-slate-600 mx-auto flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-[#172033]">{title}</h3>
      <p className="text-xs text-[#4B5563] max-w-sm mx-auto mt-1 mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading financial intelligence...',
}) => {
  return (
    <div className="p-10 flex flex-col items-center justify-center text-center bg-white border border-[#E2E8F0] rounded-xl my-4">
      <Loader2 className="w-7 h-7 text-slate-700 animate-spin mb-3" />
      <span className="text-xs font-semibold text-[#172033]">{message}</span>
      <span className="text-[11px] text-[#4B5563] mt-0.5">Querying synchronized NBFC data pipeline</span>
    </div>
  );
};

// ==========================================
// 5. DATA TABLE
// ==========================================

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyTitle = 'No Records Found',
  emptyDescription = 'There are no active records matching the current parameters.',
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState message="Fetching data records..." />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`py-3 px-3.5 font-bold text-[#172033] uppercase text-[11px] tracking-wider ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {data.map((item, idx) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`hover:bg-[#F8FAFC] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 px-3.5 text-[#1F2937] font-medium ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.render ? col.render(item, idx) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==========================================
// 6. MODALS & DIALOGS
// ==========================================

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isDestructive ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-800'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#172033]">{title}</h3>
            <p className="text-xs text-[#4B5563] mt-1">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-900 shadow-sm'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface FormModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  maxWidth = 'md',
}) => {
  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className={`w-full ${widthClass} bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden`}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h3 className="text-sm font-bold text-[#172033]">{title}</h3>
            {description && <p className="text-[11px] text-[#4B5563] mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-200 bg-[#F8FAFC]">{footer}</div>}
      </div>
    </div>
  );
};

// ==========================================
// 7. DRAWER (SLIDE-OVER PANEL)
// ==========================================

export interface DrawerProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'w-full sm:max-w-md',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
      <div className={`${width} h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col`}>
        <div className="p-4 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#172033]">{title}</h3>
            {subtitle && <p className="text-[11px] text-[#4B5563] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="p-3 border-t border-slate-200 bg-[#F8FAFC]">{footer}</div>}
      </div>
    </div>
  );
};

// ==========================================
// 8. TIMELINE & ACTIVITY FEED
// ==========================================

export interface TimelineItem {
  id: string | number;
  title: string;
  description?: string;
  timestamp: string;
  author?: string;
  status?: string;
}

export const Timeline: React.FC<{ items: TimelineItem[] }> = ({ items }) => {
  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {items.map((item) => (
        <div key={item.id} className="relative">
          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white ring-1 ring-slate-300" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172033]">{item.title}</span>
              <span className="text-[10px] text-[#64748B] font-mono">{item.timestamp}</span>
            </div>
            {item.description && <p className="text-xs text-[#4B5563] mt-0.5">{item.description}</p>}
            {item.author && <span className="text-[10px] text-slate-500 font-medium">By: {item.author}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ActivityFeed: React.FC<{ items: TimelineItem[] }> = ({ items }) => {
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.id} className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            {it.author ? it.author.slice(0, 2).toUpperCase() : 'AI'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172033] truncate">{it.title}</span>
              <span className="text-[10px] text-[#64748B] shrink-0 font-mono">{it.timestamp}</span>
            </div>
            {it.description && <p className="text-[11px] text-[#4B5563] mt-0.5">{it.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ==========================================
// 9. NOTIFICATION ITEM & USER AVATAR
// ==========================================

export interface NotificationItemProps {
  id: string | number;
  title: string;
  message: string;
  type: string;
  isRead?: boolean;
  createdAt: string;
  onClick?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  title,
  message,
  type,
  isRead = false,
  createdAt,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        !isRead
          ? 'bg-[#F8FAFC] border-slate-300'
          : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
          <span className="text-xs font-bold text-[#172033]">{title}</span>
        </div>
        <span className="text-[10px] text-[#64748B] font-mono shrink-0">{createdAt}</span>
      </div>
      <p className="text-xs text-[#4B5563] mt-1 pl-3">{message}</p>
    </div>
  );
};

export const UserAvatar: React.FC<{
  name: string;
  role?: string;
  size?: 'sm' | 'md' | 'lg';
  isOnline?: boolean;
}> = ({ name, role, size = 'md', isOnline = true }) => {
  const initials = (name || 'User')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sz = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm font-bold',
  }[size];

  return (
    <div className="relative inline-flex shrink-0">
      <div className={`${sz} rounded-full bg-slate-700 text-white font-semibold flex items-center justify-center border border-slate-600`}>
        {initials}
      </div>
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
      )}
    </div>
  );
};

// ==========================================
// 10. SEARCH BOX, FILTER BAR & PAGINATION
// ==========================================

export interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'Search by name, ID, or phone...',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#1F2937] placeholder-slate-400 pl-8.5 pr-8 py-1.5 text-xs rounded-lg outline-none focus:border-slate-600 focus:bg-white transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children, onReset }) => {
  return (
    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2.5 flex-1">{children}</div>
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs font-semibold text-slate-600 hover:text-[#172033] transition-colors cursor-pointer"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
};

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between py-3 px-2 text-xs text-[#4B5563]">
      <span>
        Showing <span className="font-semibold text-[#172033]">{Math.min(total, (page - 1) * pageSize + 1)}</span> to{' '}
        <span className="font-semibold text-[#172033]">{Math.min(total, page * pageSize)}</span> of{' '}
        <span className="font-semibold text-[#172033]">{total}</span> records
      </span>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-[#172033] px-2">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1 rounded bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 11. TABS & TOAST
// ==========================================

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
}

export const Tabs: React.FC<{
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex items-center gap-1 border-b border-[#E2E8F0] mb-4">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-3.5 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              isActive
                ? 'border-slate-800 text-[#172033]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const Toast: React.FC<{
  title: string;
  message?: string;
  variant?: 'success' | 'error' | 'info';
  onClose: () => void;
}> = ({ title, message, variant = 'success', onClose }) => {
  const style = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    error: 'bg-rose-50 border-rose-300 text-rose-900',
    info: 'bg-slate-50 border-slate-300 text-slate-900',
  }[variant];

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm p-3.5 rounded-xl border shadow-lg ${style} flex items-start gap-2.5`}>
      {variant === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
      {variant === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
      {variant === 'info' && <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold">{title}</h4>
        {message && <p className="text-[11px] opacity-90 mt-0.5">{message}</p>}
      </div>
      <button onClick={onClose} className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ==========================================
// 12. STEPPER & APPROVAL TIMELINE
// ==========================================

export interface StepItem {
  id: string | number;
  label: string;
  status: 'complete' | 'current' | 'upcoming';
  description?: string;
}

export const Stepper: React.FC<{ steps: StepItem[] }> = ({ steps }) => {
  return (
    <div className="flex items-center justify-between w-full my-4">
      {steps.map((st, idx) => (
        <React.Fragment key={st.id}>
          <div className="flex flex-col items-center text-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                st.status === 'complete'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : st.status === 'current'
                  ? 'bg-slate-800 text-white ring-4 ring-slate-200'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {st.status === 'complete' ? <Check className="w-3.5 h-3.5" /> : idx + 1}
            </div>
            <span className={`text-[11px] font-semibold mt-1.5 ${st.status === 'current' ? 'text-[#172033]' : 'text-[#64748B]'}`}>
              {st.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${
                st.status === 'complete' ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export interface ApprovalStage {
  stage: string;
  approver: string;
  role: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'SKIPPED';
  timestamp?: string;
  notes?: string;
}

export const ApprovalTimeline: React.FC<{ stages: ApprovalStage[] }> = ({ stages }) => {
  return (
    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
      <h4 className="text-xs font-bold text-[#172033] uppercase tracking-wider">Institutional Approval Chain</h4>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        {stages.map((st, idx) => {
          let badgeStyle = 'bg-slate-200 text-slate-700';
          if (st.status === 'APPROVED') badgeStyle = 'bg-emerald-100 text-emerald-800';
          else if (st.status === 'PENDING') badgeStyle = 'bg-amber-100 text-amber-800';
          else if (st.status === 'REJECTED') badgeStyle = 'bg-rose-100 text-rose-800';

          return (
            <div key={idx} className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{st.stage}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${badgeStyle}`}>{st.status}</span>
              </div>
              <div className="text-xs font-bold text-[#172033] truncate">{st.approver}</div>
              <div className="text-[10px] text-[#64748B] truncate">{st.role}</div>
              {st.notes && <div className="text-[10px] text-[#4B5563] mt-1 line-clamp-2 italic">"{st.notes}"</div>}
              {st.timestamp && <div className="text-[9px] text-slate-400 font-mono mt-1">{st.timestamp}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
