import React from 'react';

interface BadgeProps {
  variant?: 'positive' | 'warning' | 'critical' | 'neutral' | 'info' | 'elevated';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  size = 'sm',
  pulse = false,
}) => {
  const variantStyles = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    critical: 'bg-rose-50 text-rose-700 border-rose-200/80',
    elevated: 'bg-orange-50 text-orange-700 border-orange-200/80',
    info: 'bg-blue-50 text-blue-700 border-blue-200/80',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200/80',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const dotColors = {
    positive: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-rose-500',
    elevated: 'bg-orange-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded border ${variantStyles[variant]} ${sizeStyles[size]} transition-colors`}
    >
      {pulse && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${pulse ? 'animate-pulse' : ''}`} />
      )}
      {children}
    </span>
  );
};
