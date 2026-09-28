import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Shield,
  ArrowRight,
  TrendingUp,
  FileText,
  Clock,
  Zap,
  Building,
  UserCheck,
  HelpCircle,
  FileCheck,
  Send,
  X,
  Upload,
  ChevronRight,
  Sparkles,
  RefreshCw,
  LogOut,
  ChevronLeft,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Layers,
  Check,
  MessageSquare,
  Bell,
  Eye,
  ArrowUpRight,
  ShieldCheck,
  FileUp,
  Info,
  Sliders,
  CheckSquare
} from 'lucide-react';
import { customerPortalApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CustomerDashboardData,
  CustomerProfileData,
  CustomerProductItem,
  CustomerLoanDetail
} from '../types';

// Real Application Lifecycle Stages (15 states)
const WORKFLOW_STAGES = [
  { key: 'DRAFT', label: 'Draft', desc: 'Application in drafting phase' },
  { key: 'SUBMITTED', label: 'Submitted', desc: 'Received by NBFC intake desk' },
  { key: 'DOCUMENT_VERIFICATION', label: 'Doc Verification', desc: 'Identity & income docs parsing' },
  { key: 'KYC_REVIEW', label: 'KYC Review', desc: 'Aadhaar / PAN biometric match' },
  { key: 'FRAUD_REVIEW', label: 'Fraud Review', desc: 'Device, network & AML anomaly scan' },
  { key: 'CREDIT_REVIEW', label: 'Credit Review', desc: 'XGBoost scoring & bureau pull' },
  { key: 'RISK_REVIEW', label: 'Risk Review', desc: 'Portfolio concentration & stress check' },
  { key: 'APPROVAL_PENDING', label: 'Approval Pending', desc: 'Committee / policy rule sign-off' },
  { key: 'APPROVED', label: 'Approved', desc: 'Credit limit sanctioned' },
  { key: 'OFFER_SENT', label: 'Offer Sent', desc: 'Sanction letter issued to borrower' },
  { key: 'CUSTOMER_ACCEPTED', label: 'Customer Accepted', desc: 'Borrower e-signed offer terms' },
  { key: 'DISBURSEMENT_PENDING', label: 'Disbursement Pending', desc: 'Treasury NACH/NEFT queuing' },
  { key: 'DISBURSED', label: 'Disbursed', desc: 'Funds released into bank account' },
];

export const CustomerPortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'profile' | 'products' | 'apply' | 'loans' | 'documents' | 'support' | 'notifications'
  >('dashboard');

  // Modals & Panels
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isDocUploadModalOpen, setIsDocUploadModalOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  // Pay EMI form
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payChannel, setPayChannel] = useState('UPI_SIMULATED');
  const [paySuccessMsg, setPaySuccessMsg] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Edit Profile Form
  const [profileForm, setProfileForm] = useState({
    phone: '',
    address_line: '',
    city: '',
    state: '',
    pincode: '',
    employment_type: '',
    occupation: '',
    employer_name: '',
    designation: '',
    income: 0,
    other_income: 0,
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: '',
  });

  // Support Ticket Form
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Payment');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketMessage, setTicketMessage] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketReplyMsg, setTicketReplyMsg] = useState('');

  // Document Upload Form
  const [uploadDocType, setUploadDocType] = useState('IDENTITY_PROOF');
  const [uploadFileName, setUploadFileName] = useState('pan_card_verified.pdf');

  // Multi-Step Loan Application State (Steps 1 to 9)
  const [applyStep, setApplyStep] = useState(1);
  const [draftAppId, setDraftAppId] = useState<string | null>(null);
  const [appForm, setAppForm] = useState({
    product_type: 'MSME Business Growth Loan',
    requested_amount: 500000,
    requested_tenure: 24,
    purpose: 'Working Capital & Inventory',
    employment_type: 'Self-Employed MSME',
    employer_name: 'Verma Enterprises',
    monthly_income: 145000,
    other_income: 25000,
    existing_emis: 12500,
    existing_debt: 200000,
    bank_name: 'HDFC Bank',
    bank_account_number: '50100492817492',
    bank_ifsc: 'HDFC0001234',
    account_type: 'Current Account',
    uploaded_doc_types: ['IDENTITY_PROOF', 'BANK_STATEMENT'],
  });
  const [applySuccessData, setApplySuccessData] = useState<any>(null);

  // Fetch Dashboard data
  const {
    data: dashboardData,
    isLoading: isDashLoading,
    refetch: refetchDashboard,
  } = useQuery<CustomerDashboardData>({
    queryKey: ['customer-dashboard'],
    queryFn: () => customerPortalApi.getDashboard(),
  });

  // Fetch Profile data
  const {
    data: profileData,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery<CustomerProfileData>({
    queryKey: ['customer-profile'],
    queryFn: () => customerPortalApi.getProfile(),
  });

  // Fetch Products data
  const { data: productsData, isLoading: isProductsLoading } = useQuery<CustomerProductItem[]>({
    queryKey: ['customer-products'],
    queryFn: () => customerPortalApi.getProducts(),
  });

  // Fetch Applications data
  const {
    data: applicationsData,
    isLoading: isAppsLoading,
    refetch: refetchApplications,
  } = useQuery({
    queryKey: ['customer-applications'],
    queryFn: () => customerPortalApi.getApplications(),
  });

  // Fetch Selected Application Details
  const activeAppId = selectedApplicationId || dashboardData?.current_application?.application_id;
  const { data: appDetails, refetch: refetchAppDetails } = useQuery({
    queryKey: ['customer-app-details', activeAppId],
    queryFn: () => customerPortalApi.getApplicationDetails(activeAppId!),
    enabled: !!activeAppId,
  });

  // Fetch Loans data
  const {
    data: loansData,
    isLoading: isLoansLoading,
    refetch: refetchLoans,
  } = useQuery({
    queryKey: ['customer-loans'],
    queryFn: () => customerPortalApi.getLoans(),
  });

  // Fetch Selected Loan Details
  const activeLoanFacilityId = selectedLoanId || (loansData && loansData.length > 0 ? loansData[0].loan_id : null);
  const { data: loanDetails, refetch: refetchLoanDetails } = useQuery<CustomerLoanDetail>({
    queryKey: ['customer-loan-details', activeLoanFacilityId],
    queryFn: () => customerPortalApi.getLoanDetails(activeLoanFacilityId!),
    enabled: !!activeLoanFacilityId,
  });

  // Fetch Documents
  const {
    data: documentsData,
    isLoading: isDocsLoading,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ['customer-documents'],
    queryFn: () => customerPortalApi.getDocuments(),
  });

  // Fetch Support Tickets
  const {
    data: ticketsData,
    isLoading: isTicketsLoading,
    refetch: refetchTickets,
  } = useQuery({
    queryKey: ['customer-support-tickets'],
    queryFn: () => customerPortalApi.getSupportTickets(),
  });

  // Fetch Notifications
  const {
    data: notificationsData,
    isLoading: isNotifsLoading,
    refetch: refetchNotifs,
  } = useQuery({
    queryKey: ['customer-notifications'],
    queryFn: () => customerPortalApi.getNotifications(),
  });

  // Initialize profile form when data loads
  React.useEffect(() => {
    if (profileData) {
      setProfileForm({
        phone: profileData.personal_info.phone || '',
        address_line: profileData.contact_info.address_line || '',
        city: profileData.contact_info.city || '',
        state: profileData.contact_info.state || '',
        pincode: profileData.contact_info.pincode || '',
        employment_type: profileData.employment_info.employment_type || '',
        occupation: profileData.employment_info.occupation || '',
        employer_name: profileData.employment_info.employer_name || '',
        designation: profileData.employment_info.designation || '',
        income: profileData.employment_info.monthly_income || 0,
        other_income: profileData.employment_info.other_income || 0,
        bank_name: profileData.bank_info.bank_name || '',
        bank_account_number: profileData.bank_info.bank_account_number || '',
        bank_ifsc: profileData.bank_info.bank_ifsc || '',
      });
    }
  }, [profileData]);

  // When pay modal opens, set amount to next EMI
  const handleOpenPayModal = (loanId?: string, emi?: number) => {
    setSelectedLoanId(loanId || activeLoanFacilityId);
    setPayAmount(emi || dashboardData?.overview?.next_emi_amount || 14250);
    setPaySuccessMsg('');
    setIsPayModalOpen(true);
  };

  // Payment Execution Mutation
  const handleExecutePayment = async () => {
    if (!activeLoanFacilityId || payAmount <= 0) return;
    setIsPaying(true);
    try {
      const res = await customerPortalApi.simulatePayment({
        loan_id: activeLoanFacilityId,
        amount: payAmount,
        payment_channel: payChannel,
        remarks: 'Customer Self-Service EMI Payment',
      });
      setPaySuccessMsg(res.message);
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customer-loans'] });
      queryClient.invalidateQueries({ queryKey: ['customer-loan-details'] });
      queryClient.invalidateQueries({ queryKey: ['customer-notifications'] });
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Payment simulation failed.');
    } finally {
      setIsPaying(false);
    }
  };

  // Update Profile Mutation
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await customerPortalApi.updateProfile(profileForm);
      setIsEditProfileOpen(false);
      refetchProfile();
      refetchDashboard();
      alert('Profile updated successfully and logged to institutional audit trail.');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update profile.');
    }
  };

  // Save Draft Application
  const handleSaveDraft = async () => {
    try {
      const res = await customerPortalApi.saveDraft({
        application_id: draftAppId || undefined,
        product_type: appForm.product_type,
        requested_amount: Number(appForm.requested_amount),
        requested_tenure: Number(appForm.requested_tenure),
        purpose: appForm.purpose,
        step: applyStep,
        employment_details: {
          employment_type: appForm.employment_type,
          employer_name: appForm.employer_name,
          monthly_income: appForm.monthly_income,
        },
        existing_liabilities: {
          existing_emis: appForm.existing_emis,
          existing_debt: appForm.existing_debt,
        },
        bank_details: {
          bank_name: appForm.bank_name,
          bank_account_number: appForm.bank_account_number,
          bank_ifsc: appForm.bank_ifsc,
        },
      });
      setDraftAppId(res.application_id);
      alert(`Draft saved successfully at Step ${applyStep}! (App #${res.application_id})`);
      refetchApplications();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to save draft.');
    }
  };

  // Step Validation Helper
  const validateCurrentStep = (step: number): boolean => {
    if (step === 1) {
      if (!appForm.product_type) {
        alert('Please select a loan product to proceed.');
        return false;
      }
    } else if (step === 2) {
      if (!appForm.requested_amount || appForm.requested_amount < 25000) {
        alert('Please specify a valid requested principal amount (Minimum ₹25,000).');
        return false;
      }
    } else if (step === 3) {
      if (!appForm.requested_tenure || appForm.requested_tenure <= 0) {
        alert('Please select a valid tenure in months.');
        return false;
      }
    } else if (step === 4) {
      if (!appForm.employer_name || !appForm.monthly_income || appForm.monthly_income <= 0) {
        alert('Please enter employer/business name and monthly net income.');
        return false;
      }
    } else if (step === 5) {
      if (appForm.existing_emis < 0 || appForm.existing_debt < 0) {
        alert('Existing obligations cannot be negative values.');
        return false;
      }
    } else if (step === 6) {
      if (!appForm.bank_name || !appForm.bank_account_number || !appForm.bank_ifsc) {
        alert('Please provide complete bank account details for loan disbursement.');
        return false;
      }
    } else if (step === 7) {
      if (!appForm.uploaded_doc_types || appForm.uploaded_doc_types.length === 0) {
        alert('Please ensure verification documents are confirmed.');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep(applyStep)) {
      setApplyStep(applyStep + 1);
    }
  };

  // Submit Loan Application (Step 9)
  const handleSubmitApplication = async () => {
    if (!validateCurrentStep(6)) return;
    try {
      const res = await customerPortalApi.submitApplication({
        draft_application_id: draftAppId || undefined,
        product_type: appForm.product_type,
        requested_amount: Number(appForm.requested_amount),
        requested_tenure: Number(appForm.requested_tenure),
        purpose: appForm.purpose,
        employment_details: {
          employment_type: appForm.employment_type,
          employer_name: appForm.employer_name,
          monthly_income: appForm.monthly_income,
          other_income: appForm.other_income,
        },
        existing_liabilities: {
          existing_emis: appForm.existing_emis,
          existing_debt: appForm.existing_debt,
        },
        bank_details: {
          bank_name: appForm.bank_name,
          bank_account_number: appForm.bank_account_number,
          bank_ifsc: appForm.bank_ifsc,
          account_type: appForm.account_type,
        },
      });
      setApplySuccessData(res);
      setApplyStep(9);
      refetchApplications();
      refetchDashboard();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Application submission failed.');
    }
  };

  // Offer Decision (Accept / Reject)
  const handleOfferDecision = async (appId: string, action: 'ACCEPT' | 'REJECT') => {
    if (!window.confirm(`Are you sure you want to ${action} this sanction offer?`)) return;
    try {
      const res = await customerPortalApi.decideOffer(appId, action);
      alert(res.message);
      refetchAppDetails();
      refetchApplications();
      refetchDashboard();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to record offer decision.');
    }
  };

  // Advance Workflow Simulation (Demo / Testing feature)
  const handleAdvanceWorkflow = async (appId: string, targetStatus: string) => {
    try {
      const res = await customerPortalApi.advanceWorkflow(appId, targetStatus);
      alert(res.message);
      refetchAppDetails();
      refetchApplications();
      refetchDashboard();
      refetchLoans();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Workflow transition failed.');
    }
  };

  // Document Upload
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await customerPortalApi.uploadDocument(uploadDocType, uploadFileName, 450);
      alert(res.message);
      setIsDocUploadModalOpen(false);
      refetchDocs();
      refetchDashboard();
      refetchProfile();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Document upload failed.');
    }
  };

  // Support Ticket Submission
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;
    try {
      const res = await customerPortalApi.createSupportTicket({
        subject: ticketSubject,
        category: ticketCategory,
        priority: ticketPriority,
        message: ticketMessage,
      });
      alert(res.message);
      setIsTicketModalOpen(false);
      setTicketSubject('');
      setTicketMessage('');
      refetchTickets();
      refetchDashboard();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create ticket.');
    }
  };

  // Reply to ticket
  const handleReplyTicket = async (ticketId: string) => {
    if (!ticketReplyMsg) return;
    try {
      await customerPortalApi.replySupportTicket(ticketId, ticketReplyMsg);
      setTicketReplyMsg('');
      refetchTickets();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to send reply.');
    }
  };

  // Mark all notifications read
  const handleMarkNotificationsRead = async () => {
    try {
      await customerPortalApi.markNotificationsRead();
      refetchNotifs();
      refetchDashboard();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Format currency helper
  const fmt = (val: number | undefined | null) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Customer Portal Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/customer/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/40">
                FS
              </div>
              <div>
                <span className="font-bold text-lg text-white tracking-tight">FinSight AI</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                  Borrower Self-Service
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'loans'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Active Facilities
            </button>
            <button
              onClick={() => setActiveTab('apply')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'apply'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Apply for Loan
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'products'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Loan Products
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'documents'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'support'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Support
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium relative transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Bell className="w-4 h-4 inline-block mr-1" />
              Alerts
              {dashboardData?.notifications?.filter((n) => !n.is_read).length ? (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-xs">
                  {dashboardData.notifications.filter((n) => !n.is_read).length}
                </span>
              ) : null}
            </button>
          </nav>

          {/* User badge and actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              title="Return to Staff Underwriting & Management Console"
            >
              Staff Portal
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                {dashboardData?.customer?.name ? dashboardData.customer.name.charAt(0) : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-200">
                  {dashboardData?.customer?.name || 'Borrower Account'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {dashboardData?.customer?.customer_id || 'CUST-00001'}
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ============================================================== */}
        {/* VIEW 1: CUSTOMER DASHBOARD                                    */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Customer Welcome & KYC Overview Banner */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">
                    Welcome back, {dashboardData?.customer?.name || 'Valued Customer'}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      dashboardData?.customer?.kyc_status === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    KYC: {dashboardData?.customer?.kyc_status || 'PENDING'}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Account ID: <span className="font-mono text-slate-300">{dashboardData?.customer?.customer_id}</span> •
                  Credit Score: <span className="font-semibold text-emerald-400">{dashboardData?.customer?.credit_score}</span> •
                  Risk Tier: <span className="text-slate-300">{dashboardData?.customer?.risk_tier}</span>
                </p>
              </div>

              {/* Profile Completion Bar */}
              <div className="w-full md:w-64 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-400 font-medium">Profile Completion</span>
                  <span className="text-emerald-400 font-bold">
                    {dashboardData?.customer?.profile_completion || 75}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${dashboardData?.customer?.profile_completion || 75}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    Complete Profile <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setIsEditProfileOpen(true)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Edit Info
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Facilities */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>ACTIVE LOANS</span>
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {dashboardData?.overview?.active_loans_count ?? 0}
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                  <span>Credit Facilities</span>
                  <button
                    onClick={() => setActiveTab('loans')}
                    className="text-emerald-400 hover:underline text-[11px]"
                  >
                    View All &rarr;
                  </button>
                </div>
              </div>

              {/* Card 2: Outstanding Principal */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>OUTSTANDING PRINCIPAL</span>
                  <DollarSign className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {fmt(dashboardData?.overview?.outstanding_principal)}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Total live institutional exposure
                </div>
              </div>

              {/* Card 3: Next EMI & Due Date */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>NEXT EMI AMOUNT</span>
                  <Calendar className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {fmt(dashboardData?.overview?.next_emi_amount)}
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                  <span>Due: {dashboardData?.overview?.next_emi_date || 'N/A'}</span>
                  <button
                    onClick={() => handleOpenPayModal()}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Pay EMI &rarr;
                  </button>
                </div>
              </div>

              {/* Card 4: Payment Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>PAYMENT STATUS</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-semibold ${
                      dashboardData?.overview?.payment_status === 'OVERDUE'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : dashboardData?.overview?.payment_status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {dashboardData?.overview?.payment_status || 'REGULAR'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  DPD: 0 Days • Bureau clean
                </div>
              </div>
            </div>

            {/* Current Application Stepper Banner (If any application exists) */}
            {dashboardData?.current_application && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs uppercase font-semibold tracking-wider text-emerald-400">
                      Live Application Tracking
                    </span>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                      #{dashboardData.current_application.application_id} —{' '}
                      {dashboardData.current_application.product_type}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Amount: {fmt(dashboardData.current_application.requested_amount)} • Tenure:{' '}
                      {dashboardData.current_application.requested_tenure} Months • Submitted:{' '}
                      {dashboardData.current_application.created_at || 'Recent'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-white">
                      Status: {dashboardData.current_application.status}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedApplicationId(dashboardData.current_application!.application_id);
                        setActiveTab('apply');
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition"
                    >
                      View Full Details
                    </button>
                  </div>
                </div>

                {/* Real 15-Stage Workflow Stepper View */}
                {(() => {
                  const curStatus = (dashboardData.current_application.status || 'SUBMITTED').toUpperCase();
                  const isRejected = curStatus === 'REJECTED';
                  const isCancelled = curStatus === 'CANCELLED';

                  return (
                    <div className="space-y-4">
                      {/* Terminal Status Warning Banners */}
                      {isRejected && (
                        <div className="p-4 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                            <div>
                              <strong className="text-white text-sm">Application Status: REJECTED</strong>
                              <p className="text-[11px] text-rose-300 mt-0.5">
                                This application could not be sanctioned at this time under algorithmic credit policy parameters.
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 font-bold font-mono text-[10px]">
                            REJECTED
                          </span>
                        </div>
                      )}

                      {isCancelled && (
                        <div className="p-4 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                            <div>
                              <strong className="text-white text-sm">Application Status: CANCELLED</strong>
                              <p className="text-[11px] text-amber-300 mt-0.5">
                                This credit facility application was cancelled prior to disbursement.
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold font-mono text-[10px]">
                            CANCELLED
                          </span>
                        </div>
                      )}

                      {/* Complete Sequential Stepper */}
                      <div className="overflow-x-auto py-2">
                        <div className="flex items-center min-w-[1100px] justify-between relative px-2">
                          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-800 -z-0" />
                          {WORKFLOW_STAGES.map((stage, idx) => {
                            const curIdx = WORKFLOW_STAGES.findIndex((s) => s.key === curStatus);
                            const isCompleted = curIdx > idx;
                            const isCurrent = curIdx === idx || (curIdx === -1 && idx === 0);

                            return (
                              <div key={stage.key} className="flex flex-col items-center relative z-10 text-center w-20">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition ${
                                    isCompleted
                                      ? 'bg-emerald-600 text-white shadow'
                                      : isCurrent
                                      ? 'bg-emerald-500 ring-4 ring-emerald-500/20 text-white font-extrabold animate-pulse'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                                  }`}
                                  title={stage.desc}
                                >
                                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                </div>
                                <span
                                  className={`mt-1.5 text-[10px] font-medium leading-tight line-clamp-2 ${
                                    isCurrent ? 'text-emerald-400 font-bold' : isCompleted ? 'text-slate-200' : 'text-slate-400'
                                  }`}
                                >
                                  {stage.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Demo Workflow Simulation Toolbar (To test transitions) */}
                      <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mr-1">
                          <Sliders className="w-3.5 h-3.5" /> Move Workflow Demo:
                        </span>
                        {[
                          'DOCUMENT_VERIFICATION',
                          'KYC_REVIEW',
                          'FRAUD_REVIEW',
                          'CREDIT_REVIEW',
                          'RISK_REVIEW',
                          'APPROVAL_PENDING',
                          'APPROVED',
                          'OFFER_SENT',
                          'CUSTOMER_ACCEPTED',
                          'DISBURSEMENT_PENDING',
                          'DISBURSED',
                        ].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleAdvanceWorkflow(dashboardData.current_application!.application_id, st)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition border ${
                              curStatus === st
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {st.replace(/_/g, ' ')}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAdvanceWorkflow(dashboardData.current_application!.application_id, 'REJECTED')}
                          className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-semibold transition"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdvanceWorkflow(dashboardData.current_application!.application_id, 'CANCELLED')}
                          className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[10px] font-semibold transition"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* CUSTOMER OFFER: Comprehensive Sanction Details (When Approved / Offer Sent) */}
                      {['APPROVED', 'OFFER_SENT'].includes(curStatus) && (() => {
                        const approvedAmt = dashboardData.current_application.approved_amount || dashboardData.current_application.requested_amount;
                        const tenure = dashboardData.current_application.requested_tenure || 24;
                        const rate = 13.5;
                        const emi = Math.round((approvedAmt * (rate / 1200) * Math.pow(1 + rate / 1200, tenure)) / (Math.pow(1 + rate / 1200, tenure) - 1));
                        const procFee = Math.round(approvedAmt * 0.015);

                        return (
                          <div className="bg-linear-to-b from-emerald-950/50 to-slate-900 border-2 border-emerald-500/50 rounded-xl p-5 shadow-xl space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/30 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    Formal Sanction Letter & Credit Offer
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px]">
                                      ACTION REQUIRED
                                    </span>
                                  </h3>
                                  <p className="text-xs text-slate-300">
                                    Application #{dashboardData.current_application.application_id} • Review all sanctioned credit terms
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOfferDecision(dashboardData.current_application!.application_id, 'ACCEPT')}
                                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition shadow-lg shadow-emerald-500/30 flex items-center gap-1.5"
                                >
                                  <Check className="w-4 h-4" /> ACCEPT OFFER
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOfferDecision(dashboardData.current_application!.application_id, 'REJECT')}
                                  className="px-4 py-2.5 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700 font-bold rounded-lg text-xs transition"
                                >
                                  REJECT OFFER
                                </button>
                              </div>
                            </div>

                            {/* 7 Required Sanction Offer Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                <span className="text-slate-400 font-medium">Approved Amount</span>
                                <div className="text-sm font-black text-emerald-400 mt-1">{fmt(approvedAmt)}</div>
                              </div>
                              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                <span className="text-slate-400 font-medium">Interest Rate</span>
                                <div className="text-sm font-black text-white mt-1">{rate}% p.a.</div>
                              </div>
                              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                <span className="text-slate-400 font-medium">Sanctioned Tenure</span>
                                <div className="text-sm font-black text-white mt-1">{tenure} Months</div>
                              </div>
                              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                <span className="text-slate-400 font-medium">Monthly Installment</span>
                                <div className="text-sm font-black text-emerald-400 mt-1">{fmt(emi)} / mo</div>
                              </div>
                              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                <span className="text-slate-400 font-medium">Processing Fee (1.5%)</span>
                                <div className="text-sm font-semibold text-slate-200 mt-1">{fmt(procFee)}</div>
                              </div>
                              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-2">
                                <span className="text-slate-400 font-medium">Repayment Schedule Summary</span>
                                <div className="text-[11px] font-semibold text-slate-200 mt-1">
                                  {tenure} EMIs of {fmt(emi)} starting next month
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-2 lg:col-span-7">
                                <div className="flex justify-between items-center text-[11px]">
                                  <span className="text-slate-400 font-medium">Offer Expiry:</span>
                                  <span className="font-bold text-amber-400">7 Days from Issuance (Valid until next 7 days)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Quick Actions & Recent Payments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Recent Payment Transactions */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">Recent Payments & Ledger History</h3>
                    <p className="text-xs text-slate-400">Live repayments credited to institutional accounts</p>
                  </div>
                  <button
                    onClick={() => handleOpenPayModal()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay EMI
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                        <th className="py-2.5 px-3">Transaction ID</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Channel</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {dashboardData?.recent_payments && dashboardData.recent_payments.length > 0 ? (
                        dashboardData.recent_payments.map((p) => (
                          <tr key={p.transaction_id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 font-mono text-slate-300">{p.transaction_id}</td>
                            <td className="py-2.5 px-3 text-slate-400">{p.date || 'Today'}</td>
                            <td className="py-2.5 px-3 font-semibold text-emerald-400">{fmt(p.amount)}</td>
                            <td className="py-2.5 px-3 text-slate-300">{p.type}</td>
                            <td className="py-2.5 px-3 text-slate-400">{p.channel}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No payment transactions recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Col: Active Notifications & Help Desk */}
              <div className="space-y-6">
                {/* Notifications Widget */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-bold text-white text-sm">Notifications</h3>
                    </div>
                    <button
                      onClick={handleMarkNotificationsRead}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {dashboardData?.notifications && dashboardData.notifications.length > 0 ? (
                      dashboardData.notifications.slice(0, 4).map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-lg border text-xs space-y-1 transition ${
                            n.is_read
                              ? 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                              : 'bg-slate-800/60 border-slate-700 text-slate-200'
                          }`}
                        >
                          <div className="flex justify-between font-semibold">
                            <span>{n.title}</span>
                            <span className="text-[10px] text-slate-400">{n.created_at || 'Just now'}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">No new alerts</p>
                    )}
                  </div>
                </div>

                {/* Support Tickets Widget */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-sky-400" />
                      <h3 className="font-bold text-white text-sm">Support Tickets</h3>
                    </div>
                    <button
                      onClick={() => setIsTicketModalOpen(true)}
                      className="text-[11px] text-sky-400 hover:underline font-semibold"
                    >
                      + New Ticket
                    </button>
                  </div>
                  <div className="space-y-2">
                    {dashboardData?.support_tickets && dashboardData.support_tickets.length > 0 ? (
                      dashboardData.support_tickets.slice(0, 3).map((t) => (
                        <div
                          key={t.ticket_id}
                          className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 text-xs flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold text-slate-200">{t.subject}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              #{t.ticket_id} • {t.category}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              t.status === 'OPEN'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-2">No tickets active</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: CUSTOMER PROFILE (PERSONAL, CONTACT, WORK, BANK, KYC) */}
        {/* ============================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Borrower Profile & Verification Record</h1>
                <p className="text-sm text-slate-400">
                  Institutional KYC, contact, employment and banking details with tamper-evident audit history
                </p>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow flex items-center gap-1.5 self-start"
              >
                <Sliders className="w-4 h-4" />
                Edit Permitted Fields
              </button>
            </div>

            {isProfileLoading ? (
              <div className="p-12 text-center text-slate-400">Loading profile data from backend...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Personal Information */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-white text-base">Personal Information</h3>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium">Customer ID</dt>
                      <dd className="font-mono text-slate-200 mt-0.5">{profileData?.personal_info.customer_id}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Full Name</dt>
                      <dd className="text-slate-200 font-semibold mt-0.5">
                        {profileData?.personal_info.first_name} {profileData?.personal_info.last_name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Email Address</dt>
                      <dd className="text-slate-200 mt-0.5">{profileData?.personal_info.email}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Phone</dt>
                      <dd className="text-slate-200 mt-0.5">{profileData?.personal_info.phone || '+91 98450 12345'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">PAN (Masked)</dt>
                      <dd className="font-mono text-slate-200 mt-0.5">{profileData?.personal_info.pan_masked}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Aadhaar (Masked)</dt>
                      <dd className="font-mono text-slate-200 mt-0.5">{profileData?.personal_info.aadhaar_masked}</dd>
                    </div>
                  </dl>
                </div>

                {/* 2. Contact & Address Information */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Building className="w-5 h-5 text-sky-400" />
                    <h3 className="font-bold text-white text-base">Contact Information</h3>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <dt className="text-slate-400 font-medium">Address Line</dt>
                      <dd className="text-slate-200 mt-0.5">{profileData?.contact_info.address_line}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">City</dt>
                      <dd className="text-slate-200 mt-0.5">{profileData?.contact_info.city}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">State</dt>
                      <dd className="text-slate-200 mt-0.5">{profileData?.contact_info.state}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Pincode</dt>
                      <dd className="font-mono text-slate-200 mt-0.5">{profileData?.contact_info.pincode}</dd>
                    </div>
                  </dl>
                </div>

                {/* 3. Employment & Income */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Briefcase className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-white text-base">Employment & Income</h3>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium">Employment Type</dt>
                      <dd className="text-slate-200 mt-0.5">{profileData?.employment_info.employment_type}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Employer / Business</dt>
                      <dd className="text-slate-200 mt-0.5">{profileData?.employment_info.employer_name}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Designation</dt>
                      <dd className="text-slate-200 mt-0.5">{profileData?.employment_info.designation}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Monthly Income</dt>
                      <dd className="text-emerald-400 font-semibold mt-0.5">
                        {fmt(profileData?.employment_info.monthly_income)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* 4. Bank Information */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-white text-base">Bank Account Details</h3>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium">Bank Name</dt>
                      <dd className="text-slate-200 mt-0.5">{profileData?.bank_info.bank_name}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Account Number</dt>
                      <dd className="font-mono text-slate-200 mt-0.5">{profileData?.bank_info.bank_account_number}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">IFSC Code</dt>
                      <dd className="font-mono text-slate-200 mt-0.5">{profileData?.bank_info.bank_ifsc}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Account Type</dt>
                      <dd className="text-slate-200 mt-0.5">{profileData?.bank_info.account_type}</dd>
                    </div>
                  </dl>
                </div>

                {/* 5. KYC Status & Verification Records */}
                <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-white text-base">KYC Compliance & Verification Summary</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Overall: {profileData?.kyc_info.kyc_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400">PAN Verification</span>
                      <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Verified (NSDL)
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400">Aadhaar Verification</span>
                      <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Verified (UIDAI)
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400">Bureau CIBIL Score</span>
                      <div className="text-sm font-bold text-white mt-1">
                        {profileData?.kyc_info.cibil_score} / 900
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400">Verified Documents</span>
                      <div className="text-sm font-bold text-sky-400 mt-1">
                        {profileData?.kyc_info.verified_documents_count} Files on Record
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Profile Audit Trail */}
                {profileData?.audit_history && profileData.audit_history.length > 0 && (
                  <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                    <h3 className="font-bold text-white text-base">Profile Modification Audit History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                            <th className="py-2 px-3">Timestamp</th>
                            <th className="py-2 px-3">Action</th>
                            <th className="py-2 px-3">Resource</th>
                            <th className="py-2 px-3">Changed Fields</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {profileData.audit_history.map((a, i) => (
                            <tr key={i} className="hover:bg-slate-800/40">
                              <td className="py-2 px-3 font-mono text-slate-400">{a.timestamp}</td>
                              <td className="py-2 px-3 font-semibold text-emerald-400">{a.action}</td>
                              <td className="py-2 px-3 font-mono text-slate-300">{a.resource}</td>
                              <td className="py-2 px-3 text-slate-400">
                                {typeof a.details === 'object' ? JSON.stringify(a.details) : a.details}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: LOAN PRODUCTS CATALOG (FROM DB CONFIGURATION)          */}
        {/* ============================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Available Institutional Loan Products</h1>
              <p className="text-sm text-slate-400">
                Explore our portfolio of retail and MSME credit facilities configured directly by NBFC risk policies
              </p>
            </div>

            {isProductsLoading ? (
              <div className="p-12 text-center text-slate-400">Loading product catalog...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {productsData?.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-700 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {prod.category}
                        </span>
                        <span className="text-xs font-mono text-slate-400">#{prod.product_code}</span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{prod.name}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{prod.description}</p>

                      <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Loan Amount Range:</span>
                          <span className="font-semibold text-white">
                            {fmt(prod.min_amount)} – {fmt(prod.max_amount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tenure Range:</span>
                          <span className="font-semibold text-white">
                            {prod.min_tenure_months} – {prod.max_tenure_months} Months
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Annual Interest Rate:</span>
                          <span className="font-semibold text-emerald-400">{prod.interest_rate_pa}% p.a.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Processing Fee:</span>
                          <span className="font-semibold text-slate-300">{prod.processing_fee_pct}% of principal</span>
                        </div>
                      </div>

                      <div className="mt-2 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
                        <span className="font-semibold text-emerald-400">Eligibility: </span>
                        {prod.eligibility_summary}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setAppForm({ ...appForm, product_type: prod.name });
                        setApplyStep(1);
                        setActiveTab('apply');
                      }}
                      className="mt-6 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow flex items-center justify-center gap-1.5"
                    >
                      Apply for {prod.name.split(' ')[0]} Facility <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: MULTI-STEP LOAN APPLICATION (STEPS 1 TO 9)             */}
        {/* ============================================================== */}
        {activeTab === 'apply' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Multi-Step Credit Facility Application</h1>
                <p className="text-sm text-slate-400">
                  Step {applyStep} of 9 • Complete each step or save as draft to continue later
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraft}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
                >
                  Save as Draft
                </button>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="grid grid-cols-9 gap-1 text-center">
                {[
                  '1. Product',
                  '2. Amount',
                  '3. Tenure',
                  '4. Income',
                  '5. Debts',
                  '6. Bank',
                  '7. Docs',
                  '8. Review',
                  '9. Finish',
                ].map((st, i) => (
                  <div
                    key={st}
                    className={`py-2 rounded text-[11px] font-semibold transition ${
                      applyStep === i + 1
                        ? 'bg-emerald-600 text-white shadow'
                        : applyStep > i + 1
                        ? 'bg-slate-800 text-emerald-400'
                        : 'bg-slate-950/60 text-slate-500'
                    }`}
                  >
                    {st}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Form Containers */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
              {/* STEP 1: Select Loan Product */}
              {applyStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-base">Step 1: Select Credit Product</h3>
                  <p className="text-xs text-slate-400">Choose the financing program that best aligns with your goals.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      'MSME Business Growth Loan',
                      'Personal Unsecured Credit Facility',
                      'Commercial Vehicle Financing',
                      'Sovereign Gold Loan Facility',
                      'Micro-Enterprise Community Loan',
                    ].map((p) => (
                      <label
                        key={p}
                        className={`p-4 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                          appForm.product_type === p
                            ? 'bg-emerald-950/30 border-emerald-500 text-white'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="prod"
                            value={p}
                            checked={appForm.product_type === p}
                            onChange={(e) => setAppForm({ ...appForm, product_type: e.target.value })}
                            className="text-emerald-500 focus:ring-0"
                          />
                          <span className="text-xs font-semibold">{p}</span>
                        </div>
                        {appForm.product_type === p && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Requested Amount */}
              {applyStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-base">Step 2: Requested Loan Amount</h3>
                  <p className="text-xs text-slate-400">Specify principal amount required for this facility.</p>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="text-xs text-slate-400 font-medium">Principal Amount (₹)</label>
                      <input
                        type="number"
                        min={50000}
                        max={5000000}
                        step={10000}
                        value={appForm.requested_amount}
                        onChange={(e) => setAppForm({ ...appForm, requested_amount: Number(e.target.value) })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <input
                      type="range"
                      min={50000}
                      max={5000000}
                      step={25000}
                      value={appForm.requested_amount}
                      onChange={(e) => setAppForm({ ...appForm, requested_amount: Number(e.target.value) })}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Min: ₹50,000</span>
                      <span>Selected: {fmt(appForm.requested_amount)}</span>
                      <span>Max: ₹50,00,000</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Tenure */}
              {applyStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-base">Step 3: Repayment Tenure</h3>
                  <p className="text-xs text-slate-400">Select preferred repayment period in months.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg">
                    {[12, 24, 36, 48, 60].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAppForm({ ...appForm, requested_tenure: t })}
                        className={`p-3 rounded-lg border text-xs font-bold transition text-center ${
                          appForm.requested_tenure === t
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                            : 'bg-slate-950/40 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {t} Months
                      </button>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 max-w-md space-y-1">
                    <span className="text-xs text-slate-400">Estimated Monthly EMI preview (at 13.5% p.a.):</span>
                    <div className="text-xl font-bold text-emerald-400">
                      {fmt(
                        Math.round(
                          (appForm.requested_amount *
                            (13.5 / 1200) *
                            Math.pow(1 + 13.5 / 1200, appForm.requested_tenure)) /
                            (Math.pow(1 + 13.5 / 1200, appForm.requested_tenure) - 1)
                        )
                      )}{' '}
                      / month
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Employment & Income */}
              {applyStep === 4 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-base">Step 4: Employment & Income Verification</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400">Employment Type</label>
                      <select
                        value={appForm.employment_type}
                        onChange={(e) => setAppForm({ ...appForm, employment_type: e.target.value })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="Self-Employed MSME">Self-Employed MSME / Business Owner</option>
                        <option value="Salaried">Salaried Enterprise Employee</option>
                        <option value="Professional">Independent Professional / Consultant</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Employer / Enterprise Name</label>
                      <input
                        type="text"
                        value={appForm.employer_name}
                        onChange={(e) => setAppForm({ ...appForm, employer_name: e.target.value })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Monthly Net Income (₹)</label>
                      <input
                        type="number"
                        value={appForm.monthly_income}
                        onChange={(e) => setAppForm({ ...appForm, monthly_income: Number(e.target.value) })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Other Monthly Inflows (₹)</label>
                      <input
                        type="number"
                        value={appForm.other_income}
                        onChange={(e) => setAppForm({ ...appForm, other_income: Number(e.target.value) })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Existing Liabilities */}
              {applyStep === 5 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-base">Step 5: Existing Liabilities & Commitments</h3>
                  <p className="text-xs text-slate-400">
                    Declare all active EMI obligations across all scheduled banks and NBFCs.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400">Total Monthly EMIs Currently Paid (₹)</label>
                      <input
                        type="number"
                        value={appForm.existing_emis}
                        onChange={(e) => setAppForm({ ...appForm, existing_emis: Number(e.target.value) })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Total Outstanding Debt Balance (₹)</label>
                      <input
                        type="number"
                        value={appForm.existing_debt}
                        onChange={(e) => setAppForm({ ...appForm, existing_debt: Number(e.target.value) })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: Bank Details */}
              {applyStep === 6 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-base">Step 6: Bank Account for Disbursement</h3>
                  <p className="text-xs text-slate-400">Funds will be disbursed to this verified bank account.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400">Bank Name</label>
                      <input
                        type="text"
                        value={appForm.bank_name}
                        onChange={(e) => setAppForm({ ...appForm, bank_name: e.target.value })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Account Number</label>
                      <input
                        type="text"
                        value={appForm.bank_account_number}
                        onChange={(e) => setAppForm({ ...appForm, bank_account_number: e.target.value })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">IFSC Code</label>
                      <input
                        type="text"
                        value={appForm.bank_ifsc}
                        onChange={(e) => setAppForm({ ...appForm, bank_ifsc: e.target.value })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Account Type</label>
                      <select
                        value={appForm.account_type}
                        onChange={(e) => setAppForm({ ...appForm, account_type: e.target.value })}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="Current Account">Current Account</option>
                        <option value="Savings Account">Savings Account</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: Document Upload */}
              {applyStep === 7 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-base">Step 7: Supporting Documents</h3>
                  <p className="text-xs text-slate-400">
                    Verify required documents for this application. Existing verified documents are automatically linked.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { type: 'PAN_CARD', label: 'PAN Card (Identity)', status: 'VERIFIED' },
                      { type: 'AADHAAR', label: 'Aadhaar Card (Address)', status: 'VERIFIED' },
                      { type: 'BANK_STATEMENT', label: '6 Months Bank Statement', status: 'UPLOADED' },
                      { type: 'ITR_RETURN', label: 'Latest 2 Years ITR', status: 'PENDING' },
                    ].map((doc) => (
                      <div
                        key={doc.type}
                        className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">{doc.label}</div>
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-semibold ${
                              doc.status === 'VERIFIED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : doc.status === 'UPLOADED'
                                ? 'bg-sky-500/20 text-sky-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadDocType(doc.type);
                            setIsDocUploadModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                        >
                          Upload
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 8: Comprehensive Review */}
              {applyStep === 8 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-base">Step 8: Final Review & Consent</h3>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400">Selected Product:</span>
                        <div className="font-semibold text-white">{appForm.product_type}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Requested Amount:</span>
                        <div className="font-semibold text-emerald-400">{fmt(appForm.requested_amount)}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Tenure:</span>
                        <div className="font-semibold text-white">{appForm.requested_tenure} Months</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Disbursement Account:</span>
                        <div className="font-mono text-slate-300">
                          {appForm.bank_name} ({appForm.bank_account_number})
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>
                      I hereby authorize FinSight AI NBFC to retrieve my bureau credit scores and perform automated
                      AI-assisted underwriting for this credit facility application.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 9: Submission Confirmation */}
              {applyStep === 9 && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Application Submitted Successfully!</h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Your application{' '}
                    <span className="font-mono text-emerald-400 font-bold">
                      #{applySuccessData?.application_id || 'APP-260927-101'}
                    </span>{' '}
                    has been submitted to the automated intake pipeline.
                  </p>
                  <div className="p-3 bg-slate-950 rounded-lg max-w-sm mx-auto text-xs text-slate-300 border border-slate-800">
                    Estimated Decision Time: <strong>15 minutes (Autonomous Multi-Agent AI Underwriting)</strong>
                  </div>
                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                    >
                      Return to Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setSelectedApplicationId(applySuccessData?.application_id);
                        setActiveTab('dashboard');
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                    >
                      Track Live Progress
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Button Bar for Steps 1-8 */}
              {applyStep < 9 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={applyStep === 1}
                    onClick={() => setApplyStep(applyStep - 1)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-semibold transition"
                  >
                    Previous Step
                  </button>

                  {applyStep < 8 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitApplication}
                      className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-900/40 flex items-center gap-1.5"
                    >
                      Submit Application <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 5: ACTIVE LOANS & AMORTIZATION REPAYMENT SCHEDULE        */}
        {/* ============================================================== */}
        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Active Loan Facilities & Repayment Schedule</h1>
                <p className="text-sm text-slate-400">
                  Track sanctioned principal, amortization schedule, paid installments, and payment ledger
                </p>
              </div>
              <button
                onClick={() => handleOpenPayModal()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow flex items-center gap-1.5 self-start"
              >
                <CreditCard className="w-4 h-4" />
                Pay Monthly EMI
              </button>
            </div>

            {/* Loan Selector Tabs if multiple loans exist */}
            {loansData && loansData.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {loansData.map((l: any) => (
                  <button
                    key={l.loan_id}
                    onClick={() => setSelectedLoanId(l.loan_id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      activeLoanFacilityId === l.loan_id
                        ? 'bg-slate-800 text-white border-emerald-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    #{l.loan_id} — {l.product_type}
                  </button>
                ))}
              </div>
            )}

            {isLoansLoading ? (
              <div className="p-12 text-center text-slate-400">Loading active loan facilities...</div>
            ) : loanDetails ? (
              <div className="space-y-6">
                {/* Facility Summary Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-semibold text-emerald-400">Sanctioned Facility</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {loanDetails.status}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-white mt-1">
                        #{loanDetails.loan_id} — {loanDetails.product_type}
                      </h2>
                      <div className="text-xs text-slate-400">
                        Disbursed: {loanDetails.disbursed_date || '2026-09-01'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Remaining Balance</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        {fmt(loanDetails.outstanding_amount)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 text-xs">
                    <div>
                      <span className="text-slate-400">Original Principal:</span>
                      <div className="font-semibold text-white mt-0.5">{fmt(loanDetails.principal)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Interest Rate:</span>
                      <div className="font-semibold text-white mt-0.5">{loanDetails.interest_rate}% p.a.</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Monthly EMI:</span>
                      <div className="font-semibold text-emerald-400 mt-0.5">{fmt(loanDetails.emi)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Next Due Date:</span>
                      <div className="font-semibold text-amber-400 mt-0.5">
                        {loanDetails.next_due_date || dashboardData?.overview?.next_emi_date || '2026-10-05'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Tenure:</span>
                      <div className="font-semibold text-white mt-0.5">{loanDetails.tenure_months} Months</div>
                    </div>
                  </div>
                </div>

                {/* Repayment Schedule Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-white text-base">Amortization & Installment Schedule</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                          <th className="py-2.5 px-3">Repayment ID</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3">Amount Due</th>
                          <th className="py-2.5 px-3">Amount Paid</th>
                          <th className="py-2.5 px-3">Payment Date</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {loanDetails.repayment_schedule && loanDetails.repayment_schedule.length > 0 ? (
                          loanDetails.repayment_schedule.map((r) => (
                            <tr key={r.repayment_id} className="hover:bg-slate-800/40 transition">
                              <td className="py-2.5 px-3 font-mono text-slate-300">{r.repayment_id}</td>
                              <td className="py-2.5 px-3 text-slate-400">{r.due_date}</td>
                              <td className="py-2.5 px-3 font-semibold text-white">{fmt(r.amount_due)}</td>
                              <td className="py-2.5 px-3 text-slate-300">{fmt(r.amount_paid)}</td>
                              <td className="py-2.5 px-3 text-slate-400">{r.payment_date || '—'}</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    r.status === 'Paid'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {r.status !== 'Paid' && (
                                  <button
                                    onClick={() => handleOpenPayModal(loanDetails.loan_id, r.amount_due)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold"
                                  >
                                    Pay Now
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400">
                              No repayment records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Historical Payment Ledger */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-white text-base">Facility Transaction Ledger</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                          <th className="py-2 px-3">Transaction ID</th>
                          <th className="py-2 px-3">Timestamp</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Channel</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {loanDetails.payment_history && loanDetails.payment_history.length > 0 ? (
                          loanDetails.payment_history.map((tx) => (
                            <tr key={tx.transaction_id} className="hover:bg-slate-800/40">
                              <td className="py-2 px-3 font-mono text-slate-300">{tx.transaction_id}</td>
                              <td className="py-2 px-3 text-slate-400">{tx.timestamp || 'Recent'}</td>
                              <td className="py-2 px-3 text-slate-300">{tx.type}</td>
                              <td className="py-2 px-3 text-slate-400">{tx.channel}</td>
                              <td className="py-2 px-3 font-semibold text-emerald-400">{fmt(tx.amount)}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {tx.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-slate-400">
                              No ledger transactions recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
                <Briefcase className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-bold text-white">No Active Credit Facilities Disbursed</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  You do not currently have any active loan facilities. Browse our loan products and submit an
                  application to get started.
                </p>
                <button
                  onClick={() => setActiveTab('apply')}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                >
                  Apply for Credit Facility &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 6: DOCUMENTS REPOSITORY & UPLOAD CENTER                  */}
        {/* ============================================================== */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Borrower Document Center</h1>
                <p className="text-sm text-slate-400">
                  Manage required KYC, income, and bank verification documents with real compliance statuses
                </p>
              </div>
              <button
                onClick={() => setIsDocUploadModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow flex items-center gap-1.5 self-start"
              >
                <FileUp className="w-4 h-4" />
                Upload New Document
              </button>
            </div>

            {isDocsLoading ? (
              <div className="p-12 text-center text-slate-400">Loading documents from database...</div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                        <th className="py-2.5 px-3">Document ID</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">File Name</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Uploaded At</th>
                        <th className="py-2.5 px-3">Verified By</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {documentsData && documentsData.length > 0 ? (
                        documentsData.map((d: any) => (
                          <tr key={d.doc_id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 font-mono text-slate-300">{d.doc_id}</td>
                            <td className="py-2.5 px-3 font-semibold text-white">{d.doc_type}</td>
                            <td className="py-2.5 px-3 text-slate-300">{d.file_name}</td>
                            <td className="py-2.5 px-3 text-slate-400">{d.file_size_kb} KB</td>
                            <td className="py-2.5 px-3 text-slate-400">{d.uploaded_at || 'Recent'}</td>
                            <td className="py-2.5 px-3 text-slate-400">{d.verified_by || 'Automated Parser'}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                                  d.status === 'VERIFIED'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : d.status === 'REJECTED'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : d.status === 'REUPLOAD_REQUIRED' || d.status === 'Needs replacement'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                }`}
                              >
                                {d.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            No documents on record. Upload required files to expedite underwriting.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 7: SUPPORT TICKETING & MESSAGING SYSTEM                   */}
        {/* ============================================================== */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Customer Support & Grievance Desk</h1>
                <p className="text-sm text-slate-400">
                  Open support requests across Payment, Loan Application, Documents, and Account issues
                </p>
              </div>
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow flex items-center gap-1.5 self-start"
              >
                <HelpCircle className="w-4 h-4" />
                Raise Support Ticket
              </button>
            </div>

            {isTicketsLoading ? (
              <div className="p-12 text-center text-slate-400">Loading support tickets...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tickets List */}
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
                  <h3 className="font-bold text-white text-sm">Ticket History</h3>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {ticketsData && ticketsData.length > 0 ? (
                      ticketsData.map((t: any) => (
                        <div
                          key={t.ticket_id}
                          onClick={() => setActiveTicketId(t.ticket_id)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                            activeTicketId === t.ticket_id
                              ? 'bg-slate-800 border-emerald-500/50 text-white'
                              : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-slate-100">{t.subject}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                t.status === 'OPEN'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400 font-mono">
                            #{t.ticket_id} • {t.category}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500">{t.created_at}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-6">No support tickets found.</p>
                    )}
                  </div>
                </div>

                {/* Ticket Message Thread */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[400px]">
                  {activeTicketId ? (
                    (() => {
                      const selTicket = ticketsData?.find((t: any) => t.ticket_id === activeTicketId);
                      if (!selTicket) return <div>Ticket details unavailable.</div>;
                      return (
                        <div className="flex flex-col h-full justify-between space-y-4">
                          <div className="border-b border-slate-800 pb-3">
                            <div className="flex justify-between items-center">
                              <h3 className="font-bold text-white text-base">{selTicket.subject}</h3>
                              <span className="text-xs font-mono text-slate-400">#{selTicket.ticket_id}</span>
                            </div>
                            <p className="text-xs text-slate-400">
                              Category: {selTicket.category} • Priority: {selTicket.priority} • Assigned Desk:{' '}
                              {selTicket.assigned_to || 'Relationship Officer'}
                            </p>
                          </div>

                          <div className="flex-1 space-y-3 overflow-y-auto max-h-72 p-2">
                            {selTicket.messages && selTicket.messages.length > 0 ? (
                              selTicket.messages.map((m: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg text-xs max-w-[85%] ${
                                    m.sender === 'customer'
                                      ? 'ml-auto bg-emerald-950/50 border border-emerald-500/30 text-emerald-200'
                                      : 'mr-auto bg-slate-800/80 border border-slate-700 text-slate-200'
                                  }`}
                                >
                                  <div className="text-[10px] text-slate-400 font-semibold mb-1 flex justify-between">
                                    <span>{m.sender === 'customer' ? 'You' : 'NBFC Helpdesk'}</span>
                                    <span>{m.time || 'Recent'}</span>
                                  </div>
                                  <p className="leading-relaxed">{m.text}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400">No message history.</p>
                            )}
                          </div>

                          {/* Reply Box */}
                          <div className="pt-3 border-t border-slate-800 flex gap-2">
                            <input
                              type="text"
                              placeholder="Type your response to the officer..."
                              value={ticketReplyMsg}
                              onChange={(e) => setTicketReplyMsg(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleReplyTicket(selTicket.ticket_id);
                              }}
                              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => handleReplyTicket(selTicket.ticket_id)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
                            >
                              <Send className="w-3.5 h-3.5" /> Reply
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-12">
                      <MessageSquare className="w-10 h-10" />
                      <p className="text-xs">Select a support ticket from the list to view the message thread.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 8: NOTIFICATIONS HUB                                      */}
        {/* ============================================================== */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Borrower Notification Hub</h1>
                <p className="text-sm text-slate-400">
                  Institutional alerts regarding application approvals, sanction letters, EMI dates, and support updates
                </p>
              </div>
              <button
                onClick={handleMarkNotificationsRead}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition"
              >
                Mark All as Read
              </button>
            </div>

            {isNotifsLoading ? (
              <div className="p-12 text-center text-slate-400">Loading alerts...</div>
            ) : (
              <div className="space-y-3">
                {notificationsData && notificationsData.length > 0 ? (
                  notificationsData.map((n: any) => (
                    <div
                      key={n.id}
                      className={`p-4 rounded-xl border flex items-start gap-4 transition ${
                        n.is_read
                          ? 'bg-slate-900 border-slate-800 text-slate-300'
                          : 'bg-slate-900/90 border-emerald-500/40 text-white shadow-sm'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          n.severity === 'Critical'
                            ? 'bg-rose-500/20 text-rose-400'
                            : n.severity === 'Warning'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-white">{n.title}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">{n.created_at || 'Recent'}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                          Category: {n.category}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
                    No notifications on record.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: SIMULATED EMI PAYMENT (DEMO FUNCTIONALITY)            */}
      {/* ============================================================== */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsPayModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-semibold mb-2">
                <AlertCircle className="w-3.5 h-3.5" />
                SIMULATED NBFC SANDBOX PAYMENT
              </div>
              <h3 className="text-lg font-bold text-white">Simulate EMI Payment</h3>
              <p className="text-xs text-slate-400">
                Executes a live ledger repayment transaction, updates outstanding balances, clears DPD, and triggers
                finance audit events.
              </p>
            </div>

            {paySuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">Payment Successful!</h4>
                <p className="text-xs text-emerald-300">{paySuccessMsg}</p>
                <button
                  onClick={() => setIsPayModalOpen(false)}
                  className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                >
                  Close & Refresh Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Repayment Amount (₹)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium">Simulated Channel</label>
                  <select
                    value={payChannel}
                    onChange={(e) => setPayChannel(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="UPI_SIMULATED">Unified Payments Interface (UPI Sandbox)</option>
                    <option value="NETBANKING_SIMULATED">Internet Banking / RTGS</option>
                    <option value="NACH_AUTO_DEBIT">e-NACH Recurring Mandate</option>
                  </select>
                </div>

                <div className="p-3 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div>• Validates amount & allocates to active repayment schedule</div>
                  <div>• Deducts principal from live SQLite database balance</div>
                  <div>• Generates institutional audit log & customer SMS/Email notification</div>
                </div>

                <button
                  type="button"
                  disabled={isPaying || payAmount <= 0}
                  onClick={handleExecutePayment}
                  className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
                >
                  {isPaying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processing Ledger Entry...
                    </>
                  ) : (
                    <>Confirm Simulated EMI Payment ({fmt(payAmount)})</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT PERMITTED PROFILE FIELDS                         */}
      {/* ============================================================== */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditProfileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white">Edit Profile Information</h3>
              <p className="text-xs text-slate-400">
                Only fields permitted by NBFC workflow policy can be modified directly. All updates are logged.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">City</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-400">Address Line</label>
                  <input
                    type="text"
                    value={profileForm.address_line}
                    onChange={(e) => setProfileForm({ ...profileForm, address_line: e.target.value })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">State</label>
                  <input
                    type="text"
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Pincode</label>
                  <input
                    type="text"
                    value={profileForm.pincode}
                    onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Employer Name</label>
                  <input
                    type="text"
                    value={profileForm.employer_name}
                    onChange={(e) => setProfileForm({ ...profileForm, employer_name: e.target.value })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Monthly Net Income (₹)</label>
                  <input
                    type="number"
                    value={profileForm.income}
                    onChange={(e) => setProfileForm({ ...profileForm, income: Number(e.target.value) })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Bank Name</label>
                  <input
                    type="text"
                    value={profileForm.bank_name}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_name: e.target.value })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Account Number</label>
                  <input
                    type="text"
                    value={profileForm.bank_account_number}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_account_number: e.target.value })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DOCUMENT UPLOAD MODAL                                 */}
      {/* ============================================================== */}
      {isDocUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsDocUploadModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white">Upload Verification Document</h3>
              <p className="text-xs text-slate-400">Files are parsed by OCR and validated against institutional rules.</p>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400">Document Type</label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="IDENTITY_PROOF">Identity Document (PAN Card / Passport)</option>
                  <option value="ADDRESS_PROOF">Address Document (Aadhaar / Utility Bill)</option>
                  <option value="INCOME_PROOF">Income Document (Salary Slip / Form 16 / ITR)</option>
                  <option value="BANK_STATEMENT">Bank Statement (6 Months NetBanking PDF)</option>
                  <option value="BUSINESS_PROOF">Business Registration / GST Certificate</option>
                  <option value="OTHER">Other Required Document</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400">File Name</label>
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-400">
                <Upload className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <span>Drag & drop PDF / JPG or click to browse (Demo mode: Simulated file payload)</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow"
                >
                  Upload & Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CREATE SUPPORT TICKET                                 */}
      {/* ============================================================== */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsTicketModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white">Raise New Support Ticket</h3>
              <p className="text-xs text-slate-400">Our relationship officers respond within 24 operational hours.</p>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400">Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Payment">Payment</option>
                  <option value="Loan application">Loan application</option>
                  <option value="Documents">Documents</option>
                  <option value="Account">Account</option>
                  <option value="Technical issue">Technical issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400">Subject</label>
                <input
                  type="text"
                  placeholder="Summary of issue..."
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  required
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400">Priority</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400">Detailed Message</label>
                <textarea
                  rows={4}
                  placeholder="Describe your inquiry or grievance..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  required
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortalPage;
