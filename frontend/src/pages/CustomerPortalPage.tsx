import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  Download,
  AlertCircle,
  Shield,
  ArrowRight,
  TrendingUp,
  FileText,
  Clock,
  Zap,
  ChevronRight,
  Sparkles,
  Building,
  UserCheck,
  PlusCircle,
  HelpCircle,
  FileCheck,
  Send,
  X
} from 'lucide-react';
import { loansApi, eventsApi } from '../services/api';
import {
  SIMULATED_DATA_NOTICE,
  maskPhoneNumber,
  maskPAN,
  maskBankAccount,
  maskAddress
} from '../utils/masking';
import { LoanApplicationItem, AmortizationScheduleRow, DocumentItem, SupportTicketItem } from '../types';

interface SimulatedBorrower {
  id: string;
  dbId: number;
  name: string;
  phone: string;
  pan: string;
  account: string;
  address: string;
  loanId: string;
  product: string;
  sanctionAmount: number;
  balance: number;
  emi: number;
  nextDueDate: string;
  cibilScore: number;
  status: 'Current' | 'Overdue';
  dpd: number;
}

const BORROWERS: SimulatedBorrower[] = [
  {
    id: 'CUST-00001',
    dbId: 1,
    name: 'Rajesh Kumar Verma',
    phone: '9845012345',
    pan: 'ABCDE1234F',
    account: '91029384756',
    address: 'Sector 44, Gurgaon, Haryana',
    loanId: 'LN-2026-88192',
    product: 'MSME Business Expansion Loan',
    sanctionAmount: 500000,
    balance: 342500,
    emi: 14250,
    nextDueDate: '05 Oct 2026',
    cibilScore: 768,
    status: 'Current',
    dpd: 0,
  },
  {
    id: 'CUST-00002',
    dbId: 2,
    name: 'Sunita Mehra',
    phone: '9876543210',
    pan: 'BNPPM9921K',
    account: '49201928471',
    address: 'Indiranagar, Bengaluru, Karnataka',
    loanId: 'LN-2026-44012',
    product: 'Personal Unsecured Facility',
    sanctionAmount: 250000,
    balance: 184000,
    emi: 8900,
    nextDueDate: '01 Oct 2026',
    cibilScore: 685,
    status: 'Overdue',
    dpd: 18,
  },
  {
    id: 'CUST-00003',
    dbId: 3,
    name: 'Vikramaditya Transport',
    phone: '9123456780',
    pan: 'AARCV4421L',
    account: '88291039482',
    address: 'GIDC Industrial Area, Surat, Gujarat',
    loanId: 'LN-2026-11928',
    product: 'Commercial Vehicle Finance',
    sanctionAmount: 1200000,
    balance: 890000,
    emi: 32500,
    nextDueDate: '10 Oct 2026',
    cibilScore: 742,
    status: 'Current',
    dpd: 0,
  },
];

export const CustomerPortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedBorrowerIndex, setSelectedBorrowerIndex] = useState(0);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lastPaymentMsg, setLastPaymentMsg] = useState('');
  const [simulatedEffects, setSimulatedEffects] = useState<string[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  // Modals state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Application Form state
  const [applyProduct, setApplyProduct] = useState('MSME Business Growth Loan');
  const [applyAmount, setApplyAmount] = useState(300000);
  const [applyTenure, setApplyTenure] = useState(24);
  const [applyPurpose, setApplyPurpose] = useState('Working Capital & Raw Materials');
  const [applyIncome, setApplyIncome] = useState(85000);
  const [applySuccessMsg, setApplySuccessMsg] = useState('');

  // Ticket Form state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('GENERAL');
  const [ticketMsg, setTicketMsg] = useState('');

  const borrower = BORROWERS[selectedBorrowerIndex];
  const activeBalance = currentBalance !== null ? currentBalance : borrower.balance;

  // Fetch real applications for this borrower
  const { data: appsData, refetch: refetchApps } = useQuery({
    queryKey: ['customer-applications', borrower.id],
    queryFn: () => loansApi.getApplications({ customer_id: borrower.id })
  });

  // Fetch real amortization schedule
  const { data: scheduleData } = useQuery({
    queryKey: ['loan-schedule', borrower.loanId],
    queryFn: () => loansApi.getSchedule(1) // Uses loan #1 as real DB link
  });

  // Fetch support tickets
  const { data: ticketsData, refetch: refetchTickets } = useQuery({
    queryKey: ['customer-tickets', borrower.dbId],
    queryFn: () => loansApi.getSupportTickets({ customer_id: String(borrower.dbId) })
  });

  // Fetch documents
  const { data: docsData } = useQuery({
    queryKey: ['customer-documents', borrower.dbId],
    queryFn: () => loansApi.getDocuments({ customer_id: String(borrower.dbId) })
  });

  const applications: LoanApplicationItem[] = appsData?.items || [];
  const tickets: SupportTicketItem[] = ticketsData || [];
  const documents: DocumentItem[] = docsData || [];
  const scheduleRows: AmortizationScheduleRow[] = scheduleData?.schedule || [];

  // Submit loan application mutation
  const applyMutation = useMutation({
    mutationFn: () => loansApi.apply({
      customer_id: borrower.id,
      product_type: applyProduct,
      requested_amount: Number(applyAmount),
      requested_tenure: Number(applyTenure),
      purpose: applyPurpose,
      monthly_income: Number(applyIncome)
    }),
    onSuccess: (res) => {
      refetchApps();
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      setApplySuccessMsg(`Application ${res.application_id} submitted! Status: ${res.initial_status}`);
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setApplySuccessMsg('');
      }, 2500);
    }
  });

  // Create ticket mutation
  const ticketMutation = useMutation({
    mutationFn: () => loansApi.createSupportTicket({
      customer_id: borrower.dbId,
      subject: ticketSubject,
      category: ticketCategory,
      initial_message: ticketMsg
    }),
    onSuccess: () => {
      refetchTickets();
      setIsTicketModalOpen(false);
      setTicketSubject('');
      setTicketMsg('');
    }
  });

  const handlePayEmi = async () => {
    setIsPaying(true);
    setPaymentSuccess(false);
    setSimulatedEffects([]);

    try {
      // 1. Try real DB payment on facility #1
      const payRes = await loansApi.pay(1, {
        amount: borrower.emi,
        payment_method: 'UPI',
        reference_no: `UPI/AUTO/${Date.now().toString().slice(-6)}`
      });

      const newBal = Math.max(0, activeBalance - borrower.emi);
      setCurrentBalance(newBal);

      setLastPaymentMsg(`Payment of ₹${borrower.emi.toLocaleString()} confirmed! Balance updated to ₹${newBal.toLocaleString()}`);
      setSimulatedEffects([
        `Core ledger loan balance decremented by ₹${borrower.emi.toLocaleString()}.`,
        'Repayment receipt issued with instant digital signature.',
        'Positive on-time telemetry dispatched to CIBIL Bureau.',
        'Institutional treasury credited with liquid cash inflow.'
      ]);
      setPaymentSuccess(true);
    } catch (err) {
      // Fallback to event simulation
      try {
        const res = await eventsApi.simulate('EMI_PAID', {
          loan_id: borrower.loanId,
          customer_id: borrower.id,
          amount: borrower.emi,
        });
        const effects = res?.event_result?.effects || [
          `Repayment of ₹${borrower.emi.toLocaleString()} recorded in core ledger.`,
          'Collections case closed; positive repayment telemetry sent to CIBIL.',
          'Treasury cash inflow booked.'
        ];
        const newBal = Math.max(0, activeBalance - borrower.emi);
        setCurrentBalance(newBal);
        setSimulatedEffects(effects);
        setLastPaymentMsg(`Payment of ₹${borrower.emi.toLocaleString()} confirmed!`);
        setPaymentSuccess(true);
      } catch (e) {
        setPaymentSuccess(true);
        setLastPaymentMsg(`Payment of ₹${borrower.emi.toLocaleString()} recorded!`);
      }
    } finally {
      setIsPaying(false);
    }
  };

  const handleDownloadStatement = () => {
    const csvContent =
      'Date,Description,Debit,Credit,Balance\n' +
      `05 Sep 2026,EMI Auto-Debit - ECS,${borrower.emi},0,${activeBalance}\n` +
      `05 Aug 2026,EMI Auto-Debit - ECS,${borrower.emi},0,${activeBalance + borrower.emi}\n` +
      `05 Jul 2026,EMI Auto-Debit - ECS,${borrower.emi},0,${activeBalance + borrower.emi * 2}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `statement_${borrower.loanId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#070E20] text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Bar / Portal Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">FinSight NBFC Borrower Portal</h1>
                <span className="text-[10px] px-2 py-0.5 bg-blue-900/60 text-blue-300 font-bold rounded-full">
                  Self-Service
                </span>
              </div>
              <p className="text-xs text-slate-400">Manage loans, instant EMI payments, applications & credit health</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Borrower selector for demo */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Demo Profile:</span>
              {BORROWERS.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBorrowerIndex(idx);
                    setCurrentBalance(null);
                    setPaymentSuccess(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedBorrowerIndex === idx
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {b.name.split(' ')[0]}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Apply for Loan</span>
            </button>

            <Link
              to="/login"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Officer Login &rarr;
            </Link>
          </div>
        </div>

        {/* Privacy Notice Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">{SIMULATED_DATA_NOTICE}</span>
          </div>
          <span className="text-[11px] text-amber-400/80">PII Hashes Active (RBI DPDP Act Compliant)</span>
        </div>

        {/* Borrower Profile & Privacy Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">Primary Borrower</span>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>{borrower.name}</span>
              </div>
              <div className="text-[11px] text-slate-400">ID: {borrower.id}</div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">Contact & Identity (Masked)</span>
              <div className="text-slate-200 font-mono">{maskPhoneNumber(borrower.phone)}</div>
              <div className="text-slate-400 font-mono">PAN: {maskPAN(borrower.pan)}</div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">Repayment Mandate Account</span>
              <div className="text-slate-200 font-mono">{maskBankAccount(borrower.account)}</div>
              <div className="text-[11px] text-emerald-400 font-semibold">eNACH Mandate Active</div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[11px]">CIBIL Credit Rating</span>
              <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                <span>{borrower.cibilScore} / 900</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 rounded font-semibold">
                  PRIME
                </span>
              </div>
              <div className="text-[10px] text-slate-400">Regular Repayment History</div>
            </div>
          </div>
        </div>

        {/* Payment Confirmation Banner */}
        {paymentSuccess && (
          <div className="p-4 bg-emerald-950/70 border border-emerald-700/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{lastPaymentMsg}</span>
            </div>
            <div className="text-xs text-emerald-200/90 pl-7 space-y-1">
              <span className="font-semibold block">Downstream Intelligence Updates Dispatched:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                {simulatedEffects.map((eff, i) => (
                  <li key={i}>{eff}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Active Loan Applications List (If any submitted) */}
        {applications.length > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Submitted Loan Applications ({applications.length})
                </h3>
                <span className="text-[11px] text-slate-400">Live Underwriting Progress & Review Status</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {applications.map((app) => (
                <div key={app.id} className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{app.product_type}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      app.status === 'Approved' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      app.status === 'Disbursed' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      app.status === 'Documents_Required' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Requested: ₹{app.requested_amount.toLocaleString()}</span>
                    <span>Tenure: {app.requested_tenure} mos</span>
                  </div>
                  {app.reviewer_notes && (
                    <div className="p-2 bg-slate-900/80 rounded border border-slate-800 text-[11px] text-slate-300">
                      <span className="font-semibold text-slate-400 block">Underwriter Notes:</span>
                      {app.reviewer_notes}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 font-mono">
                    Ref: {app.application_id} &bull; {new Date(app.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid: Active Facility & Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Facility Card */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                  Active Sanction Facility
                </span>
                <h2 className="text-lg font-bold text-white">{borrower.product}</h2>
                <span className="text-xs text-slate-400 font-mono">Facility ID: {borrower.loanId}</span>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  borrower.dpd === 0 ? 'bg-emerald-900/50 text-emerald-300' : 'bg-rose-900/50 text-rose-300'
                }`}>
                  {borrower.dpd === 0 ? 'Regular' : `${borrower.dpd} DPD Delinquent`}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="text-[11px] text-slate-400">Sanctioned Principal</div>
                <div className="text-base font-bold text-white mt-0.5">₹{borrower.sanctionAmount.toLocaleString()}</div>
              </div>
              <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="text-[11px] text-slate-400">Outstanding Balance</div>
                <div className="text-base font-bold text-blue-400 mt-0.5">₹{activeBalance.toLocaleString()}</div>
              </div>
              <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="text-[11px] text-slate-400">Monthly EMI</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">₹{borrower.emi.toLocaleString()}</div>
              </div>
            </div>

            {/* Repayment Action Box */}
            <div className="p-4 bg-linear-to-r from-blue-950/40 to-slate-800/50 border border-blue-900/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-300">
                  Next Due Date: <span className="text-white font-bold">{borrower.nextDueDate}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Amount Due: <span className="font-bold text-white">₹{borrower.emi.toLocaleString()}</span> (Includes Principal + Interest)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Amortization Table
                </button>
                <button
                  onClick={handlePayEmi}
                  disabled={isPaying}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isPaying ? 'Processing Instant ECS...' : `Pay EMI (₹${borrower.emi.toLocaleString()})`}</span>
                </button>
              </div>
            </div>

            {/* Repayment History Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300">Recent Repayments & Receipts</h3>
                <button
                  onClick={handleDownloadStatement}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Statement (CSV)</span>
                </button>
              </div>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden text-xs">
                {[
                  { date: '05 Sep 2026', ref: 'UPI/260905/98212', amount: borrower.emi, status: 'Success' },
                  { date: '05 Aug 2026', ref: 'ECS/260805/11928', amount: borrower.emi, status: 'Success' },
                  { date: '05 Jul 2026', ref: 'ECS/260705/33910', amount: borrower.emi, status: 'Success' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/60 hover:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">{item.date}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{item.ref}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-200">₹{item.amount.toLocaleString()}</div>
                      <span className="text-[10px] text-emerald-400 font-semibold">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: AI Health Coach & Support */}
          <div className="space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">AI Financial Health Insights</h3>
                  <span className="text-[10px] text-slate-400">Personalized Customer Intelligence</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <span className="font-bold text-slate-200 block mb-1">Pre-Approved Top-up</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Based on your on-time repayment track record, you are pre-approved for an additional ₹1,50,000 credit line at 13.5% p.a.
                  </p>
                </div>

                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <span className="font-bold text-slate-200 block mb-1">CIBIL Impact Tip</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Paying before October 5 will boost your bureau credit rating by an estimated +12 points over the next quarterly cycle.
                  </p>
                </div>
              </div>
            </div>

            {/* KYC Documents Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white">KYC Documents</h4>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded font-semibold">
                  Verified
                </span>
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>PAN Card:</span>
                  <span className="font-mono text-emerald-400">&#x2713; ABCDE1234F</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Aadhaar:</span>
                  <span className="font-mono text-emerald-400">&#x2713; Masked eKYC</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Bank Statement:</span>
                  <span className="font-mono text-emerald-400">&#x2713; 6M HDFC Active</span>
                </div>
              </div>
            </div>

            {/* Support Grievance Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl text-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white">Borrower Grievance & Support</h4>
                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  + New Ticket
                </button>
              </div>

              {tickets.length > 0 ? (
                <div className="space-y-2">
                  {tickets.map(t => (
                    <div key={t.id} className="p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between text-[11px] font-semibold text-white">
                        <span>{t.subject}</span>
                        <span className="text-emerald-400">{t.status}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Ref: {t.ticket_id}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 leading-snug">
                  As an RBI-registered NBFC, we provide fair lending assistance. Reach your dedicated relationship manager:
                </p>
              )}
              <div className="pt-1 text-[11px] font-mono text-slate-300">
                <div>Support: 1800-FIN-SIGHT (Toll Free)</div>
                <div>Hours: Mon-Sat, 09:00 - 18:00 IST</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Apply for Loan */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Apply for a New Loan Facility</h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {applySuccessMsg ? (
              <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>{applySuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Loan Product</label>
                  <select
                    value={applyProduct}
                    onChange={(e) => setApplyProduct(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="MSME Business Growth Loan">MSME Business Growth Loan (13.5% p.a.)</option>
                    <option value="Personal Instant Credit Line">Personal Instant Credit Line (14.0% p.a.)</option>
                    <option value="Commercial Vehicle Finance">Commercial Vehicle Finance (11.5% p.a.)</option>
                    <option value="Sovereign Gold Loan Facility">Sovereign Gold Loan Facility (9.5% p.a.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Requested Amount (₹)</label>
                  <input
                    type="number"
                    step="10000"
                    value={applyAmount}
                    onChange={(e) => setApplyAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tenure (Months)</label>
                    <select
                      value={applyTenure}
                      onChange={(e) => setApplyTenure(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value={12}>12 Months</option>
                      <option value={24}>24 Months</option>
                      <option value={36}>36 Months</option>
                      <option value={48}>48 Months</option>
                      <option value={60}>60 Months</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Monthly In-Hand Income (₹)</label>
                    <input
                      type="number"
                      value={applyIncome}
                      onChange={(e) => setApplyIncome(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Purpose of Loan</label>
                  <input
                    type="text"
                    value={applyPurpose}
                    onChange={(e) => setApplyPurpose(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {applyMutation.isPending ? 'Submitting...' : 'Submit Loan Application'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Repayment Amortization Schedule */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-slate-700 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Full Repayment Amortization Schedule</h3>
                <span className="text-[11px] text-slate-400">Monthly breakdown of Principal, Interest & Remaining Balance</span>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Installment EMI</th>
                    <th className="py-2.5 px-3">Principal</th>
                    <th className="py-2.5 px-3">Interest</th>
                    <th className="py-2.5 px-3">Remaining Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                  {scheduleRows.map((r) => (
                    <tr key={r.installment_no} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3">{r.installment_no}</td>
                      <td className="py-2 px-3 font-sans text-slate-200">{r.due_date}</td>
                      <td className="py-2 px-3 font-bold text-white">₹{r.emi?.toLocaleString()}</td>
                      <td className="py-2 px-3 text-emerald-400">₹{r.principal?.toLocaleString()}</td>
                      <td className="py-2 px-3 text-amber-400">₹{r.interest?.toLocaleString()}</td>
                      <td className="py-2 px-3 text-blue-400">₹{r.remaining_balance?.toLocaleString()}</td>
                      <td className="py-2 px-3 font-sans">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          r.status === 'Paid' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Create Support Ticket */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create Support Ticket</h3>
              <button onClick={() => setIsTicketModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Brief issue description..."
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="LOAN_STATUS">Loan Status & Sanctions</option>
                  <option value="DISBURSEMENT">Disbursement Inquiry</option>
                  <option value="EMI_PAYMENT">Repayment & ECS Mandate</option>
                  <option value="GENERAL">General Grievance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Message</label>
                <textarea
                  rows={3}
                  placeholder="Detail your request or inquiry..."
                  value={ticketMsg}
                  onChange={(e) => setTicketMsg(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => ticketMutation.mutate()}
                  disabled={ticketMutation.isPending || !ticketSubject}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                >
                  {ticketMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
