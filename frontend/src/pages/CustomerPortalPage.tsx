import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  UserCheck
} from 'lucide-react';
import { eventsApi } from '../services/api';
import {
  SIMULATED_DATA_NOTICE,
  maskPhoneNumber,
  maskPAN,
  maskBankAccount,
  maskAddress
} from '../utils/masking';

interface SimulatedBorrower {
  id: string;
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
  const [selectedBorrowerIndex, setSelectedBorrowerIndex] = useState(0);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lastPaymentMsg, setLastPaymentMsg] = useState('');
  const [simulatedEffects, setSimulatedEffects] = useState<string[]>([]);

  const borrower = BORROWERS[selectedBorrowerIndex];

  const handlePayEmi = async () => {
    setIsPaying(true);
    setPaymentSuccess(false);
    setSimulatedEffects([]);

    try {
      // Dispatch live NBFC event through backend event bus
      const res = await eventsApi.simulate('EMI_PAID', {
        loan_id: borrower.loanId,
        customer_id: borrower.id,
        amount: borrower.emi,
      });

      const effects = res?.event_result?.effects || [
        `Repayment of ₹${borrower.emi.toLocaleString()} recorded in core ledger.`,
        'Collections case closed; positive repayment telemetry sent to CIBIL.',
        'Treasury cash inflow booked (+₹' + borrower.emi.toLocaleString() + ').'
      ];

      setSimulatedEffects(effects);
      setLastPaymentMsg(`Payment of ₹${borrower.emi.toLocaleString()} confirmed!`);
      setPaymentSuccess(true);
    } catch (err) {
      console.warn('Backend simulate offline fallback:', err);
      setLastPaymentMsg(`Payment of ₹${borrower.emi.toLocaleString()} confirmed (Demo Mode)!`);
      setSimulatedEffects([
        `Repayment of ₹${borrower.emi.toLocaleString()} posted to loan account.`,
        'Loan ledger updated. Next installment scheduled.',
      ]);
      setPaymentSuccess(true);
    } finally {
      setIsPaying(false);
    }
  };

  const handleDownloadStatement = () => {
    const csvContent =
      'Date,Description,Debit,Credit,Balance\n' +
      `05 Sep 2026,EMI Auto-Debit - ECS,${borrower.emi},0,${borrower.balance}\n` +
      `05 Aug 2026,EMI Auto-Debit - ECS,${borrower.emi},0,${borrower.balance + borrower.emi}\n` +
      `05 Jul 2026,EMI Auto-Debit - ECS,${borrower.emi},0,${borrower.balance + borrower.emi * 2}\n`;

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
              <p className="text-xs text-slate-400">Manage loans, instant EMI payments & credit health</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Borrower selector for demo */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Demo Profile:</span>
              {BORROWERS.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBorrowerIndex(idx);
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
              <div className="text-[11px] text-emerald-400 font-semibold">eNACH Active</div>
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
                <div className="text-base font-bold text-blue-400 mt-0.5">₹{borrower.balance.toLocaleString()}</div>
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

              <button
                onClick={handlePayEmi}
                disabled={isPaying}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isPaying ? 'Processing Instant ECS...' : `Pay EMI (₹${borrower.emi.toLocaleString()})`}</span>
              </button>
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

          {/* AI Customer Financial Health Coach */}
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

            {/* Need Assistance Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl text-xs space-y-2">
              <h4 className="font-bold text-white">Borrower Grievance & Support</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                As an RBI-registered NBFC, we provide fair lending assistance. Reach your dedicated relationship manager:
              </p>
              <div className="pt-1 text-[11px] font-mono text-slate-300">
                <div>Support: 1800-FIN-SIGHT (Toll Free)</div>
                <div>Hours: Mon-Sat, 09:00 - 18:00 IST</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
