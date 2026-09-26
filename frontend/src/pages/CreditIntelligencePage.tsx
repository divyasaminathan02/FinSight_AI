import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CreditCard, Search, Sliders, CheckCircle2, AlertTriangle, XCircle, Sparkles, BarChart2, Info } from 'lucide-react';
import { customersApi, creditApi } from '../services/api';
import { Badge } from '../components/common/Badge';
import { CustomerItem } from '../types';

export const CreditIntelligencePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [riskTier, setRiskTier] = useState('');
  const [page, setPage] = useState(1);

  // Simulation state
  const [simIncome, setSimIncome] = useState(75000);
  const [simCreditScore, setSimCreditScore] = useState(740);
  const [simLoanAmount, setSimLoanAmount] = useState(500000);
  const [simTenure, setSimTenure] = useState(36);
  const [simTotalEmi, setSimTotalEmi] = useState(12000);
  const [simEmployment, setSimEmployment] = useState('Salaried');
  const [simUtilization, setSimUtilization] = useState(0.28);
  const [simDpd, setSimDpd] = useState(0);

  // Model info & metrics queries
  const { data: metrics } = useQuery({
    queryKey: ['credit-metrics'],
    queryFn: creditApi.getMetrics,
  });

  const { data: modelInfo } = useQuery({
    queryKey: ['credit-model-info'],
    queryFn: creditApi.getModelInfo,
  });

  // Evaluate Mutation
  const evalMutation = useMutation({
    mutationFn: creditApi.evaluate,
  });

  // Run initial evaluation on load
  useEffect(() => {
    evalMutation.mutate({
      income: simIncome,
      credit_score: simCreditScore,
      loan_amount: simLoanAmount,
      tenure: simTenure,
      total_emi: simTotalEmi,
      employment_type: simEmployment,
      credit_utilization: simUtilization,
      previous_dpd: simDpd,
    });
  }, []);

  const handleSimulate = () => {
    evalMutation.mutate({
      income: simIncome,
      credit_score: simCreditScore,
      loan_amount: simLoanAmount,
      tenure: simTenure,
      total_emi: simTotalEmi,
      employment_type: simEmployment,
      credit_utilization: simUtilization,
      previous_dpd: simDpd,
    });
  };

  // Customers table query
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers-credit', page, search, riskTier],
    queryFn: () => customersApi.list({ page, page_size: 10, search: search || undefined, risk_tier: riskTier || undefined }),
  });

  const evalResult = evalMutation.data;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="finsight-card p-5 bg-gradient-to-r from-blue-900 to-indigo-950 text-white border-blue-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Credit Intelligence Agent</h2>
                <Badge variant="positive">Model: XGBoost + SHAP</Badge>
              </div>
              <p className="text-xs text-blue-200">
                Probability of Default Engine with Real-Time SHAP Feature Attribution
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-blue-800/60 px-3 py-1.5 rounded border border-blue-700">
              <span className="text-blue-300">Model AUC-ROC:</span>{' '}
              <strong className="text-emerald-300">{metrics?.auc_roc || 0.942}</strong>
            </div>
            <div className="bg-blue-800/60 px-3 py-1.5 rounded border border-blue-700">
              <span className="text-blue-300">Baseline (Logistic):</span>{' '}
              <strong className="text-white">{metrics?.baseline_auc_roc || 0.885}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Live Interactive Underwriting Simulator with SHAP Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive Input Panel */}
        <div className="lg:col-span-5 finsight-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Interactive Underwriting Simulator</span>
            </h3>
            <button
              onClick={handleSimulate}
              disabled={evalMutation.isPending}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{evalMutation.isPending ? 'Calculating...' : 'Run Inference'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Monthly Income (₹)</label>
                <input
                  type="number"
                  value={simIncome}
                  onChange={(e) => setSimIncome(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-1">CIBIL Score (300-900)</label>
                <input
                  type="number"
                  value={simCreditScore}
                  onChange={(e) => setSimCreditScore(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Loan Amount (₹)</label>
                <input
                  type="number"
                  value={simLoanAmount}
                  onChange={(e) => setSimLoanAmount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Tenure (Months)</label>
                <select
                  value={simTenure}
                  onChange={(e) => setSimTenure(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-medium outline-none focus:border-blue-500"
                >
                  <option value={12}>12 Months</option>
                  <option value={24}>24 Months</option>
                  <option value={36}>36 Months</option>
                  <option value={48}>48 Months</option>
                  <option value={60}>60 Months</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Current Monthly EMI (₹)</label>
                <input
                  type="number"
                  value={simTotalEmi}
                  onChange={(e) => setSimTotalEmi(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Employment Type</label>
                <select
                  value={simEmployment}
                  onChange={(e) => setSimEmployment(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-medium outline-none focus:border-blue-500"
                >
                  <option value="Salaried">Salaried</option>
                  <option value="Self-Employed MSME">Self-Employed MSME</option>
                  <option value="Gig Economy Worker">Gig Economy Worker</option>
                  <option value="Professional / Doctor / CA">Professional / Doctor / CA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Credit Utilization (0-1)</label>
                <input
                  type="number"
                  step="0.05"
                  value={simUtilization}
                  onChange={(e) => setSimUtilization(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Historical Max DPD</label>
                <input
                  type="number"
                  value={simDpd}
                  onChange={(e) => setSimDpd(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Real-time Decision & SHAP Attribution Output */}
        <div className="lg:col-span-7 finsight-card p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <span>XGBoost Decision & SHAP Explainability Engine</span>
              </h3>
              {evalResult && (
                <span className="text-[11px] text-slate-400">
                  Evaluated at {new Date(evalResult.evaluation_timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>

            {evalResult ? (
              <div className="space-y-4">
                {/* Decision Banner */}
                <div
                  className={`p-4 rounded-lg border flex items-center justify-between ${
                    evalResult.decision === 'APPROVE'
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : evalResult.decision === 'REVIEW'
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-rose-50/60 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {evalResult.decision === 'APPROVE' && <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
                    {evalResult.decision === 'REVIEW' && <AlertTriangle className="w-7 h-7 text-amber-600" />}
                    {evalResult.decision === 'REJECT' && <XCircle className="w-7 h-7 text-rose-600" />}
                    <div>
                      <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">AI Recommendation</div>
                      <div className="text-lg font-black text-slate-900">{evalResult.decision}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-medium">Probability of Default (PD)</div>
                    <div className="text-lg font-extrabold text-slate-900">{evalResult.probability_of_default_pct}</div>
                    <div className="text-[11px] text-slate-600">Risk Score: {evalResult.risk_score}/100</div>
                  </div>
                </div>

                {/* Recommended Amount */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">Recommended Loan Disbursal Limit:</span>
                  <span className="text-sm font-bold text-slate-900">{evalResult.recommended_amount_formatted}</span>
                </div>

                {/* SHAP Factor Attributions */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2">
                    Key SHAP Risk Factor Contributions
                  </h4>
                  <div className="space-y-2 text-xs">
                    {/* Top Positive Contributors (Increases Risk) */}
                    {evalResult.shap_explanation.top_positive_contributors.slice(0, 3).map((feat: any) => (
                      <div key={feat.feature} className="flex items-center justify-between p-2 bg-rose-50/40 rounded border border-rose-100">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="font-semibold text-slate-800">{feat.display_name}</span>
                        </div>
                        <div className="text-right font-mono font-bold text-rose-700">
                          +{feat.shap_value} (Increases Risk)
                        </div>
                      </div>
                    ))}

                    {/* Top Negative Contributors (Decreases Risk) */}
                    {evalResult.shap_explanation.top_negative_contributors.slice(0, 3).map((feat: any) => (
                      <div key={feat.feature} className="flex items-center justify-between p-2 bg-emerald-50/40 rounded border border-emerald-100">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-semibold text-slate-800">{feat.display_name}</span>
                        </div>
                        <div className="text-right font-mono font-bold text-emerald-700">
                          {feat.shap_value} (Lowers Risk)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Click 'Run Inference' to evaluate applicant data.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Decision policy: PD ≤ 4.5% Approve, ≤ 15.0% Review, &gt; 15.0% Reject</span>
          </div>
        </div>
      </div>

      {/* Active Borrowers Database Table */}
      <div className="finsight-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <span className="text-xs font-bold text-slate-900">
              Active Borrower Credit Profiles ({customersData?.total || 0})
            </span>
            <p className="text-[11px] text-slate-500">Live credit registry with CIBIL score tracking</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search borrower..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={riskTier}
              onChange={(e) => setRiskTier(e.target.value)}
              className="px-2 py-1 text-xs bg-white border border-slate-200 rounded outline-none font-medium"
            >
              <option value="">All Tiers</option>
              <option value="Low">Low (Prime)</option>
              <option value="Moderate">Moderate (Near-Prime)</option>
              <option value="High">High (Subprime)</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Customer ID</th>
                <th className="px-4 py-2.5">Borrower Name</th>
                <th className="px-4 py-2.5">Employment</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5 text-right">Income</th>
                <th className="px-4 py-2.5 text-center">Credit Score</th>
                <th className="px-4 py-2.5 text-center">Risk Tier</th>
                <th className="px-4 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading credit profiles...</td>
                </tr>
              ) : customersData?.items?.map((cust: CustomerItem) => (
                <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2.5 font-mono font-medium text-blue-600">{cust.customer_id}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{cust.full_name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{cust.employment_type}</td>
                  <td className="px-4 py-2.5 text-slate-600">{cust.location}, {cust.state}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                    ₹{cust.income?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2.5 text-center font-bold">
                    <span className={`px-2 py-0.5 rounded ${
                      (cust.credit_score || 0) >= 750 ? 'bg-emerald-50 text-emerald-700' :
                      (cust.credit_score || 0) >= 650 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {cust.credit_score}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant={cust.risk_tier === 'Low' ? 'positive' : cust.risk_tier === 'Moderate' ? 'info' : 'warning'}>
                      {cust.risk_tier}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => {
                        setSimIncome(cust.income || 50000);
                        setSimCreditScore(cust.credit_score || 700);
                        setSimEmployment(cust.employment_type || 'Salaried');
                        setSimUtilization(cust.credit_utilization || 0.3);
                        handleSimulate();
                      }}
                      className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded font-semibold transition-colors cursor-pointer"
                    >
                      Load into AI
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Page {page} of {Math.ceil((customersData?.total || 10) / 10)}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(customersData?.items?.length || 0) < 10}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
