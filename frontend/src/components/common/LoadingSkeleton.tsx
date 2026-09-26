import React from 'react';

export const KPISkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-pulse">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 h-32 flex flex-col justify-between">
        <div className="h-3.5 bg-slate-200 rounded w-24 mb-2" />
        <div className="h-7 bg-slate-200 rounded w-20" />
        <div className="h-3 bg-slate-100 rounded w-32 mt-2" />
      </div>
    ))}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <KPISkeleton />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-lg border border-slate-200 h-44 flex flex-col justify-between">
          <div className="flex justify-between">
            <div className="h-4 bg-slate-200 rounded w-32" />
            <div className="h-4 bg-slate-200 rounded w-16" />
          </div>
          <div className="space-y-2">
            <div className="h-6 bg-slate-200 rounded w-28" />
            <div className="h-3 bg-slate-100 rounded w-36" />
          </div>
          <div className="h-8 bg-slate-100 rounded w-full" />
        </div>
      ))}
    </div>
  </div>
);
