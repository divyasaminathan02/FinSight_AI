import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, HeartPulse, UserMinus, Award, Zap, Search, ShieldCheck, 
  TrendingUp, AlertTriangle, ChevronRight, Activity, DollarSign, X, CheckCircle2
} from 'lucide-react';
import { customerApi, customersApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { CustomerItem } from '../types';

export const CustomerIntelligencePage: React.FC = () => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CUST-00001');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Fetch list of customers
  const { data: customerData, isLoading: isListLoading, error: listError } = useQuery({
    queryKey: ['customers-intel'],
    queryFn: () => customersApi.list({ page: 1, page_size: 50 }),
  });

  // Fetch K-Means segments
  const { data: segmentsData, isLoading: isSegmentsLoading, error: segmentsError } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: () => customerApi.getSegments(),
  });

  // Fetch selected customer 360 profile
  const { data: customer360, isLoading: is360Loading, error: customer360Error } = useQuery({
    queryKey: ['customer-360', selectedCustomerId],
    queryFn: () => customerApi.get360(selectedCustomerId),
    enabled: !!selectedCustomerId,
  });

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setIsDrawerOpen(true);
  };

  const rawItems = Array.isArray(customerData?.items) ? customerData.items : [];
  const filteredCustomers = rawItems.filter((c: CustomerItem) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = c.full_name?.toLowerCase().includes(term);
    const idMatch = c.customer_id?.toLowerCase().includes(term);
    return nameMatch || idMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner - Pale White Card with high contrast text */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-700 flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Customer Intelligence Agent (Customer 360)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  K-Means Clustered
                </span>
              </div>
              <p className="text-xs text-slate-700 font-semibold mt-0.5">
                Borrower Lifetime Financial Health, Repayment Behavior, Stress Indices & Churn Predictor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-[#F0F7FF] px-3.5 py-2 rounded-lg border border-blue-200 text-blue-950 font-bold shadow-xs">
              <span className="text-slate-600 font-medium">Total Analyzed:</span>{' '}
              <strong className="text-blue-900 font-black">{segmentsData?.total_customers ?? rawItems.length ?? 1000}</strong>
            </div>
            <div className="bg-[#F0F7FF] px-3.5 py-2 rounded-lg border border-blue-200 text-blue-950 font-bold shadow-xs">
              <span className="text-slate-600 font-medium">Model Clusters:</span>{' '}
              <strong className="text-indigo-900 font-black">{segmentsData?.k_clusters ?? 4} Segments</strong>
            </div>
          </div>
        </div>
      </div>

      {/* K-Means Customer Segments Summary Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            K-Means Behavioral Segments Distribution
          </h3>
          <span className="text-[11px] text-slate-600 font-bold">Unsupervised Cluster Profiling</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isSegmentsLoading ? (
            <div className="col-span-4 p-8 text-center text-xs font-semibold text-slate-600 bg-white rounded-xl border border-slate-200">
              Loading K-Means Segments...
            </div>
          ) : segmentsData?.segments && Array.isArray(segmentsData.segments) ? (
            segmentsData.segments.map((seg: any) => {
              const avgHealthVal = seg.avg_health ?? seg.avg_financial_health ?? 75;
              const churnRiskText = typeof seg.churn_risk === 'string' 
                ? seg.churn_risk 
                : typeof seg.churn_risk === 'number' 
                  ? `${(seg.churn_risk * 100).toFixed(1)}%` 
                  : 'Low (3.5%)';
              const avgIncomeVal = seg.avg_income 
                ? `₹${(seg.avg_income / 1000).toFixed(0)}k/mo` 
                : seg.segment_id === 0 ? '₹140k/mo' : seg.segment_id === 1 ? '₹85k/mo' : seg.segment_id === 2 ? '₹45k/mo' : '₹25k/mo';

              return (
                <div key={seg.segment_id ?? seg.name} className="bg-[#F0F7FF] p-4 rounded-xl border border-blue-200 hover:border-blue-400 transition-all shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-blue-950">{seg.name}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">
                      {seg.share_pct ?? 25}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-950 mb-2">
                    {seg.count ?? '--'} <span className="text-xs font-semibold text-slate-600">borrowers</span>
                  </div>
                  
                  <div className="space-y-1.5 text-[11px] pt-2 border-t border-blue-200/80 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-semibold">Avg Income:</span>
                      <span className="font-bold text-slate-900">{avgIncomeVal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-semibold">Avg Health Score:</span>
                      <span className="font-black text-emerald-800">{typeof avgHealthVal === 'number' ? avgHealthVal.toFixed(1) : avgHealthVal}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-semibold">Avg Churn Risk:</span>
                      <span className="font-bold text-amber-800">{churnRiskText}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-4 p-6 text-center text-xs text-slate-600 bg-white rounded-xl border border-slate-200">
              No segment data available.
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout: Customer List + Customer 360 Deep-Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Customer Directory Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">Borrower 360 Intelligence Roster</h3>
              <p className="text-[11px] text-slate-600 font-medium">Click any borrower to load their ML financial profile</p>
            </div>
            
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input 
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 w-52 shadow-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E4F0FF] text-blue-950 font-extrabold border-b border-blue-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3.5 py-3 tracking-wide">ID / NAME</th>
                  <th className="px-3.5 py-3 tracking-wide">SEGMENT</th>
                  <th className="px-3.5 py-3 text-center tracking-wide">HEALTH</th>
                  <th className="px-3.5 py-3 text-center tracking-wide">CHURN</th>
                  <th className="px-3.5 py-3 text-right tracking-wide">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isListLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-600 font-semibold">Loading roster...</td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-600 font-semibold">No customers match search.</td>
                  </tr>
                ) : filteredCustomers.map((cust: CustomerItem) => {
                  const isSelected = selectedCustomerId === cust.customer_id;
                  const healthScore = cust.financial_health_score ?? 70;
                  const churnVal = typeof cust.churn_risk === 'number' 
                    ? `${(cust.churn_risk * 100).toFixed(1)}%` 
                    : typeof cust.churn_risk === 'string' 
                      ? cust.churn_risk 
                      : '5.0%';

                  return (
                    <tr 
                      key={cust.id ?? cust.customer_id} 
                      onClick={() => handleSelectCustomer(cust.customer_id)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/90 font-semibold' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-slate-900">{cust.full_name}</div>
                        <div className="font-mono text-[10px] text-blue-700 font-semibold">{cust.customer_id} • {cust.location}</div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          cust.risk_tier === 'Low' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 
                          cust.risk_tier === 'Medium' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 
                          'bg-red-100 text-red-900 border border-red-300'
                        }`}>
                          {(cust as any).customer_segment || cust.risk_tier || 'General'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                          healthScore >= 80 ? 'bg-emerald-100 text-emerald-900' :
                          healthScore >= 60 ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {healthScore}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-800 font-bold">
                        {churnVal}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <button className="text-blue-700 hover:text-blue-900 p-1 rounded hover:bg-blue-100/70 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Live Customer 360 Deep-Dive Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {is360Loading ? (
            <div className="bg-white rounded-xl p-12 text-center text-xs font-semibold text-slate-600 border border-slate-200">
              Loading 360 Intelligence Profile...
            </div>
          ) : customer360 ? (
            <div className="bg-white rounded-xl p-5 space-y-4 border border-blue-200 shadow-sm">
              {/* Profile Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{customer360.full_name}</h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                      {customer360.customer_segment ?? 'Prime'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold font-mono mt-0.5">
                    {customer360.customer_id} • {customer360.employment_type} • {customer360.location}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">FINANCIAL HEALTH</div>
                  <div className="text-2xl font-black text-emerald-700">
                    {typeof customer360.financial_health_score === 'number' 
                      ? customer360.financial_health_score.toFixed(1) 
                      : (customer360.financial_health?.score ?? 75)}
                    <span className="text-xs text-slate-500 font-normal">/100</span>
                  </div>
                </div>
              </div>

              {/* 4 Core Intelligence Health Vectors - Pale Blue Shade */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-[#F0F7FF] p-3 rounded-lg border border-blue-200 shadow-2xs">
                  <div className="text-[10px] text-blue-900 font-bold uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-700" /> Credit Health
                  </div>
                  <div className="text-base font-black text-blue-950 mt-1">
                    {customer360.credit_health?.credit_score ?? customer360.credit_score ?? 750}{' '}
                    <span className="text-[10px] text-slate-600 font-semibold">Score</span>
                  </div>
                  <div className="text-[10px] text-slate-700 font-medium">
                    Tier: <strong className="text-blue-950">{customer360.credit_health?.risk_tier ?? 'Low'}</strong>
                  </div>
                </div>

                <div className="bg-[#F0F7FF] p-3 rounded-lg border border-blue-200 shadow-2xs">
                  <div className="text-[10px] text-emerald-900 font-bold uppercase flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-700" /> Repayment Behavior
                  </div>
                  <div className="text-base font-black text-emerald-900 mt-1">
                    {customer360.repayment_behavior?.savings_ratio_pct ?? '100%'}
                  </div>
                  <div className="text-[10px] text-slate-700 font-medium">
                    Active Loans: <strong className="text-slate-900">{customer360.repayment_behavior?.active_loans ?? 1}</strong>
                  </div>
                </div>

                <div className="bg-[#F0F7FF] p-3 rounded-lg border border-blue-200 shadow-2xs">
                  <div className="text-[10px] text-amber-900 font-bold uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Financial Stress
                  </div>
                  <div className="text-base font-black text-amber-900 mt-1">
                    {typeof customer360.financial_stress_score === 'number' 
                      ? customer360.financial_stress_score.toFixed(0) 
                      : (customer360.financial_stress?.score ?? 35)}{' '}
                    <span className="text-[10px] text-slate-600 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] text-slate-700 font-medium">
                    Status: <strong className="text-slate-900">{customer360.financial_stress?.stress_level ?? 'Normal'}</strong>
                  </div>
                </div>

                <div className="bg-[#F0F7FF] p-3 rounded-lg border border-blue-200 shadow-2xs">
                  <div className="text-[10px] text-rose-900 font-bold uppercase flex items-center gap-1">
                    <UserMinus className="w-3.5 h-3.5 text-rose-700" /> Churn Probability
                  </div>
                  <div className="text-base font-black text-rose-900 mt-1">
                    {customer360.churn_probability_pct ?? 
                      (customer360.churn_risk?.probability ? `${(customer360.churn_risk.probability * 100).toFixed(1)}%` : '2.5%')}
                  </div>
                  <div className="text-[10px] text-slate-700 font-medium">
                    Level: <strong className="text-slate-900">{customer360.churn_risk?.risk_tier ?? 'Low'}</strong>
                  </div>
                </div>
              </div>

              {/* Engagement & Cross-sell Recommendation Box */}
              <div className="p-3.5 bg-gradient-to-br from-blue-50 via-sky-50/50 to-indigo-50/40 rounded-xl border border-blue-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-blue-950 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-blue-600" /> Cross-Sell Strategy
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                    Propensity {customer360.cross_sell_potential ?? 60}%
                  </span>
                </div>
                <p className="text-[11px] text-blue-950 font-semibold leading-relaxed">
                  {Array.isArray(customer360.cross_sell_products) && customer360.cross_sell_products.length > 0
                    ? `Recommended product: ${customer360.cross_sell_products.join(', ')} tailored to credit score and cash-flow profile.`
                    : 'Recommended: Pre-approved revolving credit line enhancement based on healthy debt-to-income.'}
                </p>
                <div className="text-[10px] text-blue-900 font-bold pt-1.5 flex items-center justify-between border-t border-blue-200">
                  <span>Engagement Score: <strong>{customer360.engagement_score ?? customer360.engagement ?? 75}/100</strong></span>
                  <span>Monthly Income: <strong>{customer360.income_monthly_formatted ?? `₹${customer360.income_monthly?.toLocaleString() ?? '100,000'}`}</strong></span>
                </div>
              </div>

              {/* Active Exposure Snapshot */}
              <div>
                <div className="text-xs font-black text-slate-900 mb-2 flex items-center justify-between">
                  <span>Active Credit Exposure</span>
                  <span className="text-[11px] text-slate-600 font-semibold">
                    {customer360.repayment_behavior?.active_loans ?? 1} Facilities
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="p-2.5 bg-[#F0F7FF] rounded-lg border border-blue-200 text-[11px] flex items-center justify-between font-semibold">
                    <div>
                      <span className="font-mono font-bold text-blue-950">{customer360.customer_identifier ?? 'FAC-2026-001'}</span>
                      <span className="text-slate-600 ml-1.5">({customer360.customer_segment ?? 'Standard Credit'})</span>
                    </div>
                    <div className="text-right font-medium">
                      <span className="text-slate-950 font-black">Utilization: {customer360.repayment_behavior?.credit_utilization_pct ?? '45%'}</span>
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center text-xs font-semibold text-slate-600 border border-slate-200">
              Select a customer from the roster to inspect their 360 intelligence profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

