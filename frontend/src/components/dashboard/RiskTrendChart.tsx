import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingDown, Info } from 'lucide-react';
import { RiskTrendData } from '../../types';

interface RiskTrendChartProps {
  data: RiskTrendData;
}

export const RiskTrendChart: React.FC<RiskTrendChartProps> = ({ data }) => {
  return (
    <div className="finsight-card p-5 h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Portfolio Risk Trend</h2>
            <p className="text-xs text-slate-500">6-Month multi-agent risk telemetry & default trajectories</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-xs font-semibold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>-13.7% Stress</span>
          </div>
        </div>

        {/* Legend summary */}
        <div className="flex items-center gap-4 my-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="font-semibold">Overall Risk Score (48.5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Credit Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Collection Risk</span>
          </div>
        </div>
      </div>

      {/* Recharts LineChart */}
      <div className="w-full h-56 my-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data?.series || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="month_label"
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
            />
            <YAxis
              domain={[35, 70]}
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                border: 'none',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '11px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
              itemStyle={{ color: '#FFFFFF', padding: '2px 0' }}
            />
            <Line
              type="monotone"
              dataKey="overall_risk_score"
              name="Overall Risk"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#2563EB' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="credit_risk_score"
              name="Credit Risk"
              stroke="#F59E0B"
              strokeWidth={1.75}
              strokeDasharray="4 4"
              dot={{ r: 2.5, fill: '#F59E0B' }}
            />
            <Line
              type="monotone"
              dataKey="collection_risk_score"
              name="Collection Risk"
              stroke="#10B981"
              strokeWidth={1.75}
              strokeDasharray="3 3"
              dot={{ r: 2.5, fill: '#10B981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Summary Bar */}
      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="truncate">{data?.trend_summary || 'Portfolio risk continues downward trajectory.'}</span>
      </div>
    </div>
  );
};
