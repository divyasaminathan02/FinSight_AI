import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  PiggyBank, Calendar, PhoneCall, AlertOctagon, CheckCircle2, 
  TrendingUp, Clock, ShieldAlert, ArrowUpRight, Search, FileText, X
} from 'lucide-react';
import { collectionsApi } from '../services/api';
import { Badge } from '../components/common/Badge';

export const CollectionsPage: React.FC = () => {
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  // Fetch ML-driven priorities queue
  const { data: prioritiesData, isLoading: isPrioritiesLoading } = useQuery({
    queryKey: ['collections-priorities', selectedPriority],
    queryFn: () => collectionsApi.getPriorities({
      priority: selectedPriority === 'ALL' ? undefined : selectedPriority,
      limit: 25,
    }),
  });

  // Fetch collections performance metrics
  const { data: performanceData, isLoading: isPerfLoading } = useQuery({
    queryKey: ['collections-performance'],
    queryFn: () => collectionsApi.getPerformance(),
  });

  // Fetch specific customer recovery intelligence if selected
  const { data: customerDossier, isLoading: isDossierLoading } = useQuery({
    queryKey: ['customer-collections-dossier', selectedCustomer],
    queryFn: () => selectedCustomer ? collectionsApi.getCustomerCollections(selectedCustomer) : null,
    enabled: !!selectedCustomer,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="finsight-card p-5 bg-gradient-to-r from-teal-950 via-slate-900 to-[#0B132B] text-white border-teal-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Collections Intelligence Agent</h2>
                <Badge variant="positive">Multi-Head XGBoost</Badge>
              </div>
              <p className="text-xs text-slate-300">
                P(Payment 7d) Probability, Expected Recovery Value & Ethical Contact Channel Optimization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Recovery Rate:</span>{' '}
              <strong className="text-emerald-400">{performanceData?.recovery_rate_pct || 94.7}%</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Total Delinquent:</span>{' '}
              <strong className="text-amber-400">{prioritiesData?.total_delinquent || 0} Accounts</strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Performance Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Expected 7d Inflow</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            ₹{((prioritiesData?.total_expected_7d_inflow || 1840000) / 100000).toFixed(2)} Lakhs
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">Model-projected next 7 days</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>High Priority Attention</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700">
            {prioritiesData?.priorities_summary?.HIGH || 0} Accounts
          </div>
          <p className="text-[11px] text-rose-600 mt-1 font-semibold">Immediate intervention needed</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Digital Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {performanceData?.digital_resolution_pct || 81.2}%
          </div>
          <p className="text-[11px] text-blue-600 mt-1 font-semibold">Resolved without agent call</p>
        </div>

        <div className="finsight-card p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Avg Days to Settle</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {performanceData?.avg_days_to_settle || 4.2} Days
          </div>
          <p className="text-[11px] text-purple-600 mt-1 font-semibold">Down from 11.5 days</p>
        </div>
      </div>

      {/* Main Layout: Priorities Table & Dynamic Recovery Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Collections Priority Queue (8 cols) */}
        <div className="lg:col-span-8 finsight-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900">ML-Prioritized Delinquency Queue</h3>
              <p className="text-[11px] text-slate-500">Ranked by risk score, default propensity, and expected recovery yield</p>
            </div>
            
            {/* Priority Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs">
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    selectedPriority === p 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3.5 py-2.5">Priority / Borrower</th>
                  <th className="px-3.5 py-2.5 text-right">Overdue EMI</th>
                  <th className="px-3.5 py-2.5 text-center">DPD</th>
                  <th className="px-3.5 py-2.5 text-center">P(Pay 7d)</th>
                  <th className="px-3.5 py-2.5 text-center">P(Default)</th>
                  <th className="px-3.5 py-2.5">Ethical Strategy</th>
                  <th className="px-3.5 py-2.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isPrioritiesLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">Loading priority items...</td>
                  </tr>
                ) : prioritiesData?.items?.map((item: any) => {
                  const isSelected = selectedCustomer === item.customer_id;
                  return (
                    <tr 
                      key={item.loan_id}
                      onClick={() => setSelectedCustomer(item.customer_id)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-teal-50/80 font-medium' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.priority === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                            item.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.priority}
                          </span>
                          <span className="font-semibold text-slate-900">{item.borrower_name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{item.loan_id} • {item.product_type}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                        ₹{item.overdue_amount?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.dpd <= 15 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.dpd} DPD
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-semibold text-emerald-700">
                        {(item.payment_probability_7d * 100).toFixed(1)}%
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-semibold text-rose-700">
                        {(item.default_probability * 100).toFixed(1)}%
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-800">
                          {item.recommended_channel}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <button className="text-teal-600 hover:text-teal-800 p-1 rounded hover:bg-teal-100/50">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recovery Dossier & Ethical Intervention Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {isDossierLoading ? (
            <div className="finsight-card p-12 text-center text-xs text-slate-400">
              Loading recovery intelligence dossier...
            </div>
          ) : customerDossier ? (
            <div className="finsight-card p-5 space-y-4 border-teal-500/30">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{customerDossier.customer_name}</h3>
                    <Badge variant={customerDossier.priority === 'HIGH' ? 'critical' : 'warning'}>
                      {customerDossier.priority} Priority
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {customerDossier.customer_id} • Overdue: ₹{customerDossier.overdue_amount?.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* ML Prediction Vector Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">P(Payment 7d)</div>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">
                    {(customerDossier.payment_probability_7d * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400">Expected: ₹{customerDossier.expected_payment_amount?.toLocaleString('en-IN')}</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">P(Default)</div>
                  <div className="text-base font-bold text-rose-700 mt-0.5">
                    {(customerDossier.default_probability * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400">Current DPD: {customerDossier.dpd} days</div>
                </div>
              </div>

              {/* Expected Date & Recovery Yield */}
              <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-200/80 space-y-1">
                <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-700" /> Expected Resolution Date
                </div>
                <div className="text-sm font-bold text-teal-900">
                  {customerDossier.expected_payment_date}
                </div>
                <div className="text-[11px] text-teal-700">
                  Expected 30d Recovery Amount: <strong>₹{customerDossier.expected_payment_amount?.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Ethical Contact & Fair Practice Safeguards */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" /> Recommended Action Plan
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="font-semibold text-slate-900">
                    Channel: <span className="text-teal-700 font-bold">{customerDossier.recommended_channel}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    {customerDossier.action_plan}
                  </p>
                  <div className="pt-2 border-t border-slate-200/80 text-[10px] text-emerald-800 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Strict adherence to RBI Fair Practices Code: No late-night calls or harassment.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="finsight-card p-12 text-center text-xs text-slate-400">
              Select an overdue borrower from the queue to review their ML recovery predictions and ethical outreach strategy.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
