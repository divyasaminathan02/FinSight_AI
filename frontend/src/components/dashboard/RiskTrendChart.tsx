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
  const chartSeries = Array.isArray(data)
    ? data
    : (data?.series && data.series.length > 0)
    ? data.series
    : [
        { month_label: 'Apr 26', overall_risk_score: 56.2, credit_risk_score: 58.0, collection_risk_score: 54.5 },
        { month_label: 'May 26', overall_risk_score: 54.8, credit_risk_score: 56.5, collection_risk_score: 53.1 },
        { month_label: 'Jun 26', overall_risk_score: 53.0, credit_risk_score: 54.2, collection_risk_score: 51.8 },
        { month_label: 'Jul 26', overall_risk_score: 51.4, credit_risk_score: 52.8, collection_risk_score: 50.0 },
        { month_label: 'Aug 26', overall_risk_score: 49.6, credit_risk_score: 50.9, collection_risk_score: 48.2 },
        { month_label: 'Sep 26', overall_risk_score: 48.5, credit_risk_score: 49.4, collection_risk_score: 47.1 },
      ];

  const summary = (!Array.isArray(data) && data?.trend_summary) || 'Portfolio risk continues downward trajectory.';

  return (
    <div className="finsight-card p-5 h-full flex flex-col justify-between bg-white border border-slate-200 shadow-sm rounded-xl">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Portfolio Risk Trend</h2>
            <p className="text-xs text-slate-600 font-medium">6-Month multi-agent risk telemetry & default trajectories</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-xs font-bold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>-13.7% Stress</span>
          </div>
        </div>

        {/* Legend summary */}
        <div className="flex items-center gap-4 my-2.5 text-xs text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-xs" />
            <span className="font-bold text-slate-900">Overall Risk Score (48.5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-xs" />
            <span className="font-semibold text-slate-800">Credit Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shadow-xs" />
            <span className="font-semibold text-slate-800">Collection Risk</span>
          </div>
        </div>
      </div>

      {/* Recharts LineChart */}
      <div className="w-full h-56 my-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="month_label"
              tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              domain={[35, 70]}
              tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              }}
              itemStyle={{ color: '#FFFFFF', padding: '2px 0' }}
            />
            <Line
              type="monotone"
              dataKey="overall_risk_score"
              name="Overall Risk"
              stroke="#2563EB"
              strokeWidth={3}
              dot={{ r: 4, fill: '#2563EB' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="credit_risk_score"
              name="Credit Risk"
              stroke="#D97706"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#D97706' }}
            />
            <Line
              type="monotone"
              dataKey="collection_risk_score"
              name="Collection Risk"
              stroke="#059669"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={{ r: 3, fill: '#059669' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Summary Bar */}
      <div className="pt-2 border-t border-slate-200 text-xs text-slate-700 font-medium flex items-center justify-between">
        <span className="truncate">{summary}</span>
      </div>
    </div>
  );
};
