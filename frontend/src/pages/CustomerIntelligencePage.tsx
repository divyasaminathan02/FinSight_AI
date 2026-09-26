import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, HeartPulse, UserMinus, Award, Zap } from 'lucide-react';
import { customersApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { CustomerItem } from '../types';

export const CustomerIntelligencePage: React.FC = () => {
  const { data: customerData } = useQuery({
    queryKey: ['customers-intel'],
    queryFn: () => customersApi.list({ page: 1, page_size: 10 }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="finsight-card p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-[#0B132B] text-white border-emerald-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Customer Intelligence Agent</h2>
                <Badge variant="positive">Status: Healthy</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Borrower Lifetime Financial Health, Behavioral Engagement & Churn Risk Predictor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Avg Financial Health:</span>{' '}
              <strong className="text-emerald-400">82/100</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Churn Risk:</span>{' '}
              <strong className="text-blue-400">6.8%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Prime Segment Retention</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">96.4%</div>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">+2.1% YoY customer loyalty</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Cross-Sell Propensity</span>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">34.2%</div>
          <p className="text-[11px] text-blue-600 mt-1 font-semibold">Gold loan & top-up readiness</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Average Wallet Share</span>
            <HeartPulse className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">₹1.84L</div>
          <p className="text-[11px] text-slate-500 mt-1">Per active borrower account</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Early Warning Churn</span>
            <UserMinus className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700">142 Accounts</div>
          <p className="text-[11px] text-amber-600 mt-1 font-semibold">Flagged for retention outreach</p>
        </div>
      </div>

      {/* Customer Segments Table */}
      <div className="finsight-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">Borrower Behavioral Profiles & Financial Health</h3>
          <span className="text-[11px] text-slate-500">Autonomous Customer Health Scores</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Customer ID</th>
                <th className="px-4 py-2.5">Borrower</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5 text-center">Health Score</th>
                <th className="px-4 py-2.5 text-center">Churn Risk</th>
                <th className="px-4 py-2.5 text-center">Risk Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerData?.items?.map((cust: CustomerItem) => (
                <tr key={cust.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-blue-600 font-medium">{cust.customer_id}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{cust.full_name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{cust.location}, {cust.state}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                      {cust.financial_health_score}/100
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center font-medium text-slate-700">
                    {((cust.churn_risk || 0.05) * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant={cust.risk_tier === 'Low' ? 'positive' : 'info'}>
                      {cust.risk_tier}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
