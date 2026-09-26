import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, HeartPulse, UserMinus, Award, Zap, Search, ShieldCheck, 
  TrendingUp, AlertTriangle, ChevronRight, Activity, DollarSign, X
} from 'lucide-react';
import { customerApi, customersApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { CustomerItem } from '../types';

export const CustomerIntelligencePage: React.FC = () => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CUST-00001');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Fetch list of customers
  const { data: customerData, isLoading: isListLoading } = useQuery({
    queryKey: ['customers-intel'],
    queryFn: () => customersApi.list({ page: 1, page_size: 20 }),
  });

  // Fetch K-Means segments
  const { data: segmentsData, isLoading: isSegmentsLoading } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: () => customerApi.getSegments(),
  });

  // Fetch selected customer 360 profile
  const { data: customer360, isLoading: is360Loading } = useQuery({
    queryKey: ['customer-360', selectedCustomerId],
    queryFn: () => customerApi.get360(selectedCustomerId),
    enabled: !!selectedCustomerId,
  });

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setIsDrawerOpen(true);
  };

  const filteredCustomers = customerData?.items?.filter((c: CustomerItem) => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <h2 className="text-base font-bold text-white">Customer Intelligence Agent (Customer 360)</h2>
                <Badge variant="positive">K-Means Clustered</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Borrower Lifetime Financial Health, Repayment Behavior, Stress Indices & Churn Predictor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Total Analyzed:</span>{' '}
              <strong className="text-emerald-400">{segmentsData?.total_customers || 1000}</strong>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
              <span className="text-slate-400">Model Clusters:</span>{' '}
              <strong className="text-blue-400">{segmentsData?.k_clusters || 4} Segments</strong>
            </div>
          </div>
        </div>
      </div>

      {/* K-Means Customer Segments Summary Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            K-Means Behavioral Segments Distribution
          </h3>
          <span className="text-[11px] text-slate-500">Unsupervised Cluster Profiling</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isSegmentsLoading ? (
            <div className="col-span-4 p-8 text-center text-xs text-slate-400">Loading K-Means Segments...</div>
          ) : (
            segmentsData?.segments?.map((seg: any) => (
              <div key={seg.segment_id} className="finsight-card p-4 hover:border-emerald-400/50 transition-all border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">{seg.name}</span>
                  <Badge variant={seg.segment_id === 0 ? 'positive' : seg.segment_id === 1 ? 'info' : seg.segment_id === 2 ? 'warning' : 'critical'}>
                    {seg.share_pct}%
                  </Badge>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mb-2">{seg.count} <span className="text-xs font-normal text-slate-500">borrowers</span></div>
                
                <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Avg Income:</span>
                    <span className="font-semibold text-slate-800">₹{(seg.avg_income / 1000).toFixed(0)}k/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Avg Health Score:</span>
                    <span className="font-semibold text-emerald-600">{seg.avg_financial_health.toFixed(1)}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Avg Churn Risk:</span>
                    <span className="font-semibold text-amber-600">{(seg.avg_churn_risk * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Layout: Customer List + Customer 360 Deep-Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Customer Directory Table (7 cols) */}
        <div className="lg:col-span-7 finsight-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Borrower 360 Intelligence Roster</h3>
              <p className="text-[11px] text-slate-500">Click any borrower to load their ML financial profile</p>
            </div>
            
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3.5 py-2.5">ID / Name</th>
                  <th className="px-3.5 py-2.5">Segment</th>
                  <th className="px-3.5 py-2.5 text-center">Health</th>
                  <th className="px-3.5 py-2.5 text-center">Churn</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isListLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">Loading roster...</td>
                  </tr>
                ) : filteredCustomers?.map((cust: CustomerItem) => {
                  const isSelected = selectedCustomerId === cust.customer_id;
                  return (
                    <tr 
                      key={cust.id} 
                      onClick={() => handleSelectCustomer(cust.customer_id)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50/80 font-medium' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-900">{cust.full_name}</div>
                        <div className="font-mono text-[10px] text-blue-600">{cust.customer_id} • {cust.location}</div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Badge variant={cust.risk_tier === 'Low' ? 'positive' : cust.risk_tier === 'Medium' ? 'warning' : 'critical'}>
                          {(cust as any).customer_segment || 'General'}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          (cust.financial_health_score ?? 70) >= 80 ? 'bg-emerald-100 text-emerald-800' :
                          (cust.financial_health_score ?? 70) >= 60 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {cust.financial_health_score ?? 'N/A'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-600 font-medium">
                        {((cust.churn_risk || 0.05) * 100).toFixed(1)}%
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <button className="text-emerald-600 hover:text-emerald-800 p-1 rounded hover:bg-emerald-100/50">
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
            <div className="finsight-card p-12 text-center text-xs text-slate-400">
              Loading 360 Intelligence Profile...
            </div>
          ) : customer360 ? (
            <div className="finsight-card p-5 space-y-4 border-emerald-500/30">
              {/* Profile Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{customer360.full_name}</h3>
                    <Badge variant="positive">{customer360.customer_segment}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {customer360.customer_id} • {customer360.employment_type} • {customer360.location}, {customer360.state}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-semibold">FINANCIAL HEALTH</div>
                  <div className="text-2xl font-black text-emerald-600">
                    {customer360.financial_health_score.toFixed(1)}<span className="text-xs text-slate-400 font-normal">/100</span>
                  </div>
                </div>
              </div>

              {/* 6 Core Intelligence Health Vectors */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" /> Credit Health
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    {customer360.credit_health.credit_score} <span className="text-[10px] text-slate-500 font-normal">Score</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Tier: {customer360.credit_health.risk_tier}</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                    <Activity className="w-3 h-3 text-emerald-600" /> Repayment Rate
                  </div>
                  <div className="text-base font-bold text-emerald-700 mt-1">
                    {customer360.repayment_behavior.repayment_rate.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500">Avg DPD: {customer360.repayment_behavior.avg_dpd.toFixed(1)} days</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Financial Stress
                  </div>
                  <div className="text-base font-bold text-amber-700 mt-1">
                    {customer360.financial_stress.stress_score.toFixed(0)} <span className="text-[10px] text-slate-500 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Status: {customer360.financial_stress.stress_level}</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                    <UserMinus className="w-3 h-3 text-red-600" /> Churn Probability
                  </div>
                  <div className="text-base font-bold text-red-700 mt-1">
                    {(customer360.churn_risk.churn_probability * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500">Level: {customer360.churn_risk.churn_risk_level}</div>
                </div>
              </div>

              {/* Engagement & Cross-sell Recommendation Box */}
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-lg border border-blue-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-600" /> Cross-Sell Strategy
                  </span>
                  <Badge variant="info">
                    {customer360.cross_sell.potential} Potential ({(customer360.cross_sell.propensity_score * 100).toFixed(0)}%)
                  </Badge>
                </div>
                <p className="text-[11px] text-blue-900 font-medium">
                  {customer360.cross_sell.recommendation}
                </p>
                <div className="text-[10px] text-blue-700 pt-1 flex items-center justify-between border-t border-blue-200/50">
                  <span>Engagement: <strong>{customer360.engagement.engagement_level}</strong></span>
                  <span>Monthly Income: <strong>₹{customer360.monthly_income?.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Loan Portfolios Snapshot */}
              <div>
                <div className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                  <span>Active Credit Exposure</span>
                  <span className="text-[11px] text-slate-500">{customer360.loans?.length || 0} Facilities</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {customer360.loans?.map((loan: any) => (
                    <div key={loan.loan_id} className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] flex items-center justify-between">
                      <div>
                        <span className="font-mono font-semibold text-slate-800">{loan.loan_id}</span>
                        <span className="text-slate-500 ml-1.5">({loan.product_type})</span>
                      </div>
                      <div className="text-right font-medium">
                        <span className="text-slate-900 font-semibold">₹{loan.amount?.toLocaleString()}</span>
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                          loan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>{loan.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="finsight-card p-12 text-center text-xs text-slate-400">
              Select a customer from the roster to inspect their 360 intelligence profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
