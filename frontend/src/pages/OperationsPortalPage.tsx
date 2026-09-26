import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  CheckCircle,
  Clock,
  Zap,
  Building,
  CreditCard,
  FileCheck,
  RefreshCw,
  Search,
  ExternalLink,
  Shield,
  FileText,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { loansApi } from '../services/api';
import { LoanApplicationItem, DocumentItem } from '../types';

export const OperationsPortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'disbursements' | 'documents'>('disbursements');
  const [disbursingApp, setDisbursingApp] = useState<LoanApplicationItem | null>(null);
  const [interestRate, setInterestRate] = useState<number>(13.5);
  const [disbSuccessMsg, setDisbSuccessMsg] = useState<string>('');
  const [disbResult, setDisbResult] = useState<any>(null);

  // 1. Fetch Approved Applications ready for disbursement
  const { data: appsData, isLoading: appsLoading, refetch: refetchApps } = useQuery({
    queryKey: ['operations-approved-apps'],
    queryFn: () => loansApi.getApplications({ status: 'Approved', page_size: 50 })
  });

  // 2. Fetch KYC Documents pending review
  const { data: docsData, isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ['operations-documents'],
    queryFn: () => loansApi.getDocuments()
  });

  // Disbursement mutation
  const disburseMutation = useMutation({
    mutationFn: ({ appId, rate }: { appId: string; rate: number }) =>
      loansApi.disburseApplication(appId, {
        interest_rate: rate,
        remarks: 'Operations verification passed; capital released via RTGS/NEFT.'
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['operations-approved-apps'] });
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setDisbResult(res);
      setDisbSuccessMsg(`Disbursement executed! Core Loan ID: ${res.loan_id} activated.`);
      setDisbursingApp(null);
    }
  });

  // Document verification mutation
  const verifyDocMutation = useMutation({
    mutationFn: ({ docId, action }: { docId: string; action: 'VERIFIED' | 'REJECTED' }) =>
      loansApi.verifyDocument(docId, action, 'Verified by Operations Desk'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations-documents'] });
    }
  });

  const approvedApps: LoanApplicationItem[] = appsData?.items || [];
  const documents: DocumentItem[] = docsData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Loan Operations & Servicing Desk</h1>
            <p className="text-xs text-slate-400">
              Sanction verification, KYC document authentication, core ledger account setup & disbursement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetchApps(); refetchDocs(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span>Sync Ops Tasks</span>
          </button>
        </div>
      </div>

      {disbSuccessMsg && disbResult && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl text-emerald-200 text-xs space-y-1 shadow-lg">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>{disbSuccessMsg}</span>
          </div>
          <div className="pl-7 text-[11px] space-y-0.5 text-emerald-200/90">
            <div>Principal Sanctioned: ₹{disbResult.disbursed_amount?.toLocaleString()}</div>
            <div>Tenure: {disbResult.tenure_months} months @ {disbResult.interest_rate}% p.a.</div>
            <div>Monthly EMI: ₹{disbResult.monthly_emi?.toLocaleString()} (Auto-Debit Mandate Generated)</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('disbursements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'disbursements'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Disbursement Queue ({approvedApps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>KYC Document Verification ({documents.filter(d => d.status !== 'VERIFIED').length} Pending)</span>
        </button>
      </div>

      {/* Tab 1: Disbursements Queue */}
      {activeTab === 'disbursements' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Approved Applications Awaiting Capital Release</h3>
                <span className="text-[11px] text-slate-400">Applications sanctioned by Credit Underwriting requiring operations release</span>
              </div>
              <span className="text-xs px-2.5 py-1 bg-purple-950 text-purple-300 border border-purple-800 rounded-full font-bold">
                {approvedApps.length} Ready for Disbursal
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B132B] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Application ID</th>
                    <th className="py-3 px-4">Borrower</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Sanction Amount</th>
                    <th className="py-3 px-4">Approved By</th>
                    <th className="py-3 px-4">Mandate Status</th>
                    <th className="py-3 px-4 text-right">Operations Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {appsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                        Loading disbursement queue...
                      </td>
                    </tr>
                  ) : approvedApps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No pending approved loans ready for disbursement.
                      </td>
                    </tr>
                  ) : (
                    approvedApps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-purple-400">
                          {app.application_id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{app.customer_name}</div>
                          <div className="text-[11px] text-slate-500">{app.customer_identifier}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {app.product_type}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">
                          ₹{(app.approved_amount || app.requested_amount).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {app.reviewed_by || 'Credit Officer'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-semibold">
                            eNACH Validated
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setDisbursingApp(app);
                              setInterestRate(13.5);
                            }}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer"
                          >
                            Release Capital &rarr;
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Documents Verification */}
      {activeTab === 'documents' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Borrower KYC & Compliance Documents</h3>
              <span className="text-[11px] text-slate-400">Authenticate identity and income documents in accordance with RBI DPDP Act</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B132B] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Doc ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-300">{doc.doc_id}</td>
                    <td className="py-3.5 px-4 font-semibold text-blue-400">{doc.doc_type}</td>
                    <td className="py-3.5 px-4 text-slate-200">{doc.file_name}</td>
                    <td className="py-3.5 px-4 text-slate-400">{doc.file_size_kb} KB</td>
                    <td className="py-3.5 px-4 text-slate-400">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        doc.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        doc.status === 'REJECTED' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {doc.status !== 'VERIFIED' && (
                        <button
                          onClick={() => verifyDocMutation.mutate({ docId: doc.doc_id, action: 'VERIFIED' })}
                          className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Verify
                        </button>
                      )}
                      {doc.status !== 'REJECTED' && (
                        <button
                          onClick={() => verifyDocMutation.mutate({ docId: doc.doc_id, action: 'REJECTED' })}
                          className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-300 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disbursement Execution Modal */}
      {disbursingApp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Core Ledger Activation
                </span>
                <h3 className="text-base font-bold text-white">
                  Execute Capital Disbursement
                </h3>
              </div>
              <button
                onClick={() => setDisbursingApp(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Borrower:</span>
                <span className="font-bold text-white">{disbursingApp.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Principal Amount:</span>
                <span className="font-bold text-emerald-400">₹{(disbursingApp.approved_amount || disbursingApp.requested_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tenure:</span>
                <span className="font-bold text-white">{disbursingApp.requested_tenure} Months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Disbursement Channel:</span>
                <span className="font-mono text-purple-300">RBI RTGS Direct Mandate</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-slate-300 font-semibold">
                Sanction Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white font-mono outline-none focus:border-purple-500"
              />
            </div>

            <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-[11px] text-purple-200">
              Upon clicking "Confirm & Disburse", the core ledger will generate a new active loan facility, adjust institutional treasury reserves, and dispatch repayment schedules.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDisbursingApp(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => disburseMutation.mutate({
                  appId: disbursingApp.application_id,
                  rate: interestRate
                })}
                disabled={disburseMutation.isPending}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
              >
                {disburseMutation.isPending ? 'Releasing Funds...' : 'Confirm & Disburse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
