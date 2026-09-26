import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  FileText, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, 
  HelpCircle, ArrowRight, Play, Activity, Cpu, Sparkles, RefreshCw,
  TrendingDown, TrendingUp, Users, Compass, ExternalLink, ChevronDown, ChevronUp, Lock
} from 'lucide-react';
import { orchestrationApi, customersApi } from '../services/api';
import { Badge } from '../components/common/Badge';

interface AgentStep {
  id: string;
  name: string;
  domain: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Warning' | 'Failed';
}

export const LoanAnalysisPage: React.FC = () => {
  // Application Intake State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CUST-00001');
  const [loanAmount, setLoanAmount] = useState<number>(450000);
  const [tenure, setTenure] = useState<number>(36);
  const [loanPurpose, setLoanPurpose] = useState<string>('Personal');
  const [monthlyIncome, setMonthlyIncome] = useState<number>(75000);
  const [creditScore, setCreditScore] = useState<number>(740);
  const [existingLoans, setExistingLoans] = useState<number>(1);
  const [totalEmi, setTotalEmi] = useState<number>(12000);
  const [bankBalance, setBankBalance] = useState<number>(65000);

  // Agent Steps during Execution
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([
    { id: 'credit', name: 'Credit Intelligence', domain: 'XGBoost + TreeSHAP Risk Model', status: 'Pending' },
    { id: 'fraud', name: 'Fraud Intelligence', domain: 'Isolation Forest & Entity Collision', status: 'Pending' },
    { id: 'customer', name: 'Customer Intelligence', domain: 'Borrower 360 & Financial Stress', status: 'Pending' },
    { id: 'collections', name: 'Collections Intelligence', domain: 'Recovery Probability & Ethical Action', status: 'Pending' },
    { id: 'risk', name: 'Portfolio Risk & Liquidity', domain: 'Concentration HHI & ALM Cash Buffer', status: 'Pending' },
    { id: 'decision', name: 'Decision Engine', domain: 'Auditable Business Policy Evaluation', status: 'Pending' },
  ]);

  const [activeAnalysisResult, setActiveAnalysisResult] = useState<any>(null);
  const [showShapDetails, setShowShapDetails] = useState<boolean>(true);

  // Fetch customer directory for quick selection
  const { data: customerData } = useQuery({
    queryKey: ['customers-list-intake'],
    queryFn: () => customersApi.list({ page: 1, page_size: 20 }),
  });

  // Orchestration Mutation
  const analysisMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Step simulation for visual progression
      const stepIds = ['credit', 'fraud', 'customer', 'collections', 'risk', 'decision'];
      for (let i = 0; i < stepIds.length; i++) {
        setAgentSteps(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: 'Running' } : idx < i ? { ...s, status: 'Completed' } : s
        ));
        await new Promise(r => setTimeout(r, 220));
      }

      const res = await orchestrationApi.analyzeLoan(payload);
      return res;
    },
    onSuccess: (data) => {
      setAgentSteps(prev => prev.map(s => ({ ...s, status: 'Completed' })));
      setActiveAnalysisResult(data);
    },
    onError: (err: any) => {
      setAgentSteps(prev => prev.map(s => ({ ...s, status: s.status === 'Running' ? 'Failed' : s.status })));
      alert(`Workflow error: ${err?.message || 'Failed to complete orchestration'}`);
    }
  });

  const handleStartAnalysis = () => {
    const payload = {
      customer_id: selectedCustomerId,
      loan_amount: loanAmount,
      tenure: tenure,
      loan_purpose: loanPurpose,
      income: monthlyIncome,
      credit_score: creditScore,
      existing_loans: existingLoans,
      total_emi: totalEmi,
      bank_balance: bankBalance,
      income_stability: 0.85,
    };
    analysisMutation.mutate(payload);
  };

  // Quick preset test loaders
  const loadPreset = (type: 'prime' | 'high_dti' | 'fraud_risk') => {
    if (type === 'prime') {
      setSelectedCustomerId('CUST-00001');
      setLoanAmount(350000);
      setTenure(36);
      setMonthlyIncome(90000);
      setCreditScore(780);
      setTotalEmi(12000);
      setLoanPurpose('Home Improvement');
    } else if (type === 'high_dti') {
      setSelectedCustomerId('CUST-00002');
      setLoanAmount(750000);
      setTenure(48);
      setMonthlyIncome(40000);
      setCreditScore(640);
      setTotalEmi(26000);
      setLoanPurpose('Debt Consolidation');
    } else {
      setSelectedCustomerId('CUST-00003');
      setLoanAmount(950000);
      setTenure(36);
      setMonthlyIncome(55000);
      setCreditScore(610);
      setTotalEmi(22000);
      setLoanPurpose('Business Expansion');
    }
  };

  const calculatedDti = Math.round((totalEmi / Math.max(monthlyIncome, 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="finsight-card p-5 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white border-blue-900/60 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">LangGraph Multi-Agent Loan Underwriting Engine</h2>
                <Badge variant="positive">Phase 3 Live</Badge>
              </div>
              <p className="text-xs text-slate-300">
                Autonomous Coordinated Decisioning: ML Signals → Policy Engine → Explainability & Audit
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
            <button 
              onClick={() => loadPreset('prime')}
              className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/30 transition-colors"
            >
              Prime Borrower
            </button>
            <button 
              onClick={() => loadPreset('high_dti')}
              className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-amber-400 px-2.5 py-1 rounded border border-amber-500/30 transition-colors"
            >
              High DTI Review
            </button>
            <button 
              onClick={() => loadPreset('fraud_risk')}
              className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-rose-400 px-2.5 py-1 rounded border border-rose-500/30 transition-colors"
            >
              High Risk / Decline
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Application Intake + Live Orchestration Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 Cols): Intake Form & Coordinated Flow */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Intake Card */}
          <div className="finsight-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Loan Application Intake
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">DTI: {calculatedDti}%</span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Customer Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Borrower Roster</label>
                <select 
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    const found = customerData?.items?.find((c: any) => c.customer_id === e.target.value);
                    if (found) {
                      setMonthlyIncome(found.income || 60000);
                      setCreditScore(found.credit_score || 720);
                      setExistingLoans(found.existing_loans || 1);
                    }
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:ring-1 focus:ring-blue-500"
                >
                  {customerData?.items?.map((cust: any) => (
                    <option key={cust.customer_id} value={cust.customer_id}>
                      {cust.customer_id} - {cust.full_name} ({cust.location})
                    </option>
                  )) || (
                    <option value="CUST-00001">CUST-00001 - Arun Kumar (Chennai)</option>
                  )}
                </select>
              </div>

              {/* Loan Amount */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-semibold text-slate-700">Requested Principal</span>
                  <span className="text-xs font-bold text-blue-700 font-mono">₹{loanAmount.toLocaleString()}</span>
                </div>
                <input 
                  type="range"
                  min="50000"
                  max="2000000"
                  step="25000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Tenure and Purpose */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tenure (Months)</label>
                  <select 
                    value={tenure}
                    onChange={(e) => setTenure(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value={12}>12 Months (1 Yr)</option>
                    <option value={24}>24 Months (2 Yrs)</option>
                    <option value={36}>36 Months (3 Yrs)</option>
                    <option value={48}>48 Months (4 Yrs)</option>
                    <option value={60}>60 Months (5 Yrs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Loan Purpose</label>
                  <select 
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value="Personal">Personal / Medical</option>
                    <option value="Home Improvement">Home Renovation</option>
                    <option value="Business">MSME Working Capital</option>
                    <option value="Auto">Vehicle Financing</option>
                    <option value="Debt Consolidation">Debt Consolidation</option>
                  </select>
                </div>
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold uppercase">Net Monthly Income</label>
                  <input 
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold uppercase">Bureau Credit Score</label>
                  <input 
                    type="number"
                    value={creditScore}
                    onChange={(e) => setCreditScore(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold uppercase">Total Current EMIs</label>
                  <input 
                    type="number"
                    value={totalEmi}
                    onChange={(e) => setTotalEmi(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold uppercase">Average Bank Balance</label>
                  <input 
                    type="number"
                    value={bankBalance}
                    onChange={(e) => setBankBalance(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button 
              onClick={handleStartAnalysis}
              disabled={analysisMutation.isPending}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {analysisMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Orchestrating 6 Agents...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white text-white" />
                  Analyze Application
                </>
              )}
            </button>
          </div>

          {/* Coordinated Agent Flow Progress Tracker */}
          <div className="finsight-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                Live Agent Coordination Pipeline
              </span>
              <span className="text-[10px] text-slate-400">Sequential StateGraph</span>
            </div>

            <div className="space-y-2">
              {agentSteps.map((step, idx) => (
                <div 
                  key={step.id} 
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                    step.status === 'Running' ? 'bg-blue-50 border-blue-400 shadow-xs' :
                    step.status === 'Completed' ? 'bg-slate-50/80 border-slate-200' :
                    step.status === 'Failed' ? 'bg-rose-50 border-rose-300' : 'bg-slate-50/40 border-slate-100 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{step.name}</div>
                      <div className="text-[10px] text-slate-500">{step.domain}</div>
                    </div>
                  </div>

                  <div>
                    {step.status === 'Running' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Running
                      </span>
                    )}
                    {step.status === 'Completed' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                    {step.status === 'Pending' && (
                      <span className="text-[10px] text-slate-400 font-mono">Queued</span>
                    )}
                    {step.status === 'Failed' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Decision Hero Banner & In-Depth Rationale */}
        <div className="lg:col-span-7 space-y-6">
          {activeAnalysisResult ? (
            <div className="space-y-6">
              
              {/* Final Decision Hero Card */}
              <div className={`finsight-card p-6 border-2 transition-all ${
                activeAnalysisResult.decision?.decision === 'APPROVE' 
                  ? 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 border-emerald-500 shadow-emerald-500/10 shadow-lg' 
                  : activeAnalysisResult.decision?.decision === 'REVIEW REQUIRED'
                  ? 'bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 border-amber-500 shadow-amber-500/10 shadow-lg'
                  : 'bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 border-rose-500 shadow-rose-500/10 shadow-lg'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                  <div>
                    <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                      Coordinated Multi-Agent Verdict
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {activeAnalysisResult.decision?.decision === 'APPROVE' && (
                        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                      )}
                      {activeAnalysisResult.decision?.decision === 'REVIEW REQUIRED' && (
                        <AlertTriangle className="w-7 h-7 text-amber-600" />
                      )}
                      {activeAnalysisResult.decision?.decision === 'REJECT' && (
                        <XCircle className="w-7 h-7 text-rose-600" />
                      )}
                      <h2 className={`text-2xl font-black tracking-tight ${
                        activeAnalysisResult.decision?.decision === 'APPROVE' ? 'text-emerald-800' :
                        activeAnalysisResult.decision?.decision === 'REVIEW REQUIRED' ? 'text-amber-800' : 'text-rose-800'
                      }`}>
                        {activeAnalysisResult.decision?.decision}
                      </h2>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-semibold">POLICY ENGINE</div>
                    <Badge variant="neutral">
                      {activeAnalysisResult.decision?.policy_version || 'FINSIGHT-POL-2026.1'}
                    </Badge>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Audit: {activeAnalysisResult.audit_metadata?.audit_id || 'AUD-RECORD'}
                    </div>
                  </div>
                </div>

                {/* Recommended Action Box */}
                <div className="mt-4 p-3.5 bg-white/80 rounded-lg border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                    Mandated Operational Action
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {activeAnalysisResult.recommended_action || activeAnalysisResult.decision?.recommended_action}
                  </p>
                </div>

                {/* Primary Decision Reasons */}
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Underwriting Reasons
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {activeAnalysisResult.reasons?.map((reason: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Two Column Factors: Positive Strengths vs Risk Vectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Positive Factors */}
                <div className="finsight-card p-4 border-l-4 border-l-emerald-500 space-y-2">
                  <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Credit-Enhancing Strengths
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {activeAnalysisResult.positive_factors?.length > 0 ? (
                      activeAnalysisResult.positive_factors.map((p: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{p}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[11px] text-slate-400">Standard criteria baseline met</li>
                    )}
                  </ul>
                </div>

                {/* Risk Vectors */}
                <div className="finsight-card p-4 border-l-4 border-l-amber-500 space-y-2">
                  <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-amber-600" />
                    Underwriting Risk Flags
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {activeAnalysisResult.risk_factors?.length > 0 ? (
                      activeAnalysisResult.risk_factors.map((r: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[11px] text-slate-400">Zero critical risk vectors detected</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* SHAP Explanation Waterfall Card */}
              {activeAnalysisResult.shap_explanation && (
                <div className="finsight-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      TreeSHAP Explainability Waterfall (Feature Attribution)
                    </span>
                    <button 
                      onClick={() => setShowShapDetails(!showShapDetails)}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      {showShapDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {showShapDetails && (
                    <div className="space-y-3 text-xs">
                      <p className="text-[11px] text-slate-500">
                        Exact SHAP values computed on the primary XGBoost credit classifier. Positive SHAP values increase default probability; negative values enhance approval.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Positive Risk Contributors */}
                        <div className="space-y-1.5 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                          <span className="text-[10px] font-bold text-rose-800 uppercase">Top Risk Drivers (Increases PD)</span>
                          {activeAnalysisResult.shap_explanation.top_positive_risk_contributors?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-[11px]">
                              <span className="font-medium text-slate-800 capitalize">{item.feature?.replace('_', ' ')}</span>
                              <span className="font-mono text-rose-600 font-bold">+{item.shap_value?.toFixed(4)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Negative Risk Contributors */}
                        <div className="space-y-1.5 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase">Credit Enhancers (Lowers PD)</span>
                          {activeAnalysisResult.shap_explanation.top_negative_risk_contributors?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-[11px]">
                              <span className="font-medium text-slate-800 capitalize">{item.feature?.replace('_', ' ')}</span>
                              <span className="font-mono text-emerald-600 font-bold">{item.shap_value?.toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* RAG Policy Context Card */}
              {activeAnalysisResult.policy_context?.length > 0 && (
                <div className="finsight-card p-4 space-y-2 bg-slate-50/60 border-slate-200">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    Regulatory & Policy Grounding (RAG Context)
                  </div>
                  <div className="space-y-2">
                    {activeAnalysisResult.policy_context.map((chunk: any, i: number) => (
                      <div key={i} className="p-2.5 bg-white rounded border border-slate-200 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-slate-800">{chunk.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{chunk.source}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-3">
                          {chunk.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Blank Slate Welcome */
            <div className="finsight-card p-12 text-center space-y-4 border-dashed border-2 border-slate-300">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <Cpu className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Coordinated Multi-Agent Decisioning</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Select a borrower application on the left and trigger the LangGraph orchestration. 
                  All 6 machine learning models will sequentially evaluate credit, fraud, customer 360, collections, and risk before generating a deterministic policy decision.
                </p>
              </div>
              <div className="pt-2">
                <button 
                  onClick={handleStartAnalysis}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  Run Sample Underwriting
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
