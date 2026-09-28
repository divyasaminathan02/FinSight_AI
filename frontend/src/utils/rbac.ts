export const getRoleHome = (role?: string): string => {
  switch (role) {
    case 'CUSTOMER':
      return '/customer-portal';
    case 'SALES_OFFICER':
    case 'SALES':
      return '/sales';
    case 'RELATIONSHIP_MANAGER':
      return '/relationship';
    case 'CREDIT_ANALYST':
    case 'ANALYST':
      return '/loan-analysis';
    case 'CREDIT_MANAGER':
    case 'CREDIT_OFFICER':
      return '/credit-manager';
    case 'FRAUD_OFFICER':
      return '/fraud';
    case 'KYC_OFFICER':
      return '/kyc';
    case 'COLLECTIONS_OFFICER':
    case 'COLLECTIONS_MANAGER':
    case 'COLLECTION_MANAGER':
      return '/collections';
    case 'OPERATIONS_OFFICER':
    case 'OPERATIONS_MANAGER':
    case 'OPERATIONS':
      return '/operations';
    case 'FINANCE_OFFICER':
    case 'FINANCE_MANAGER':
      return '/finance';
    case 'RISK_ANALYST':
      return '/risk';
    case 'RISK_MANAGER':
      return '/';
    case 'ADMIN':
      return '/admin';
    default:
      return '/';
  }
};

export interface DemoRoleCredential {
  role: string;
  title: string;
  email: string;
  password: string;
  homeUrl: string;
  department: string;
  badge: string;
}

export const DEMO_ROLE_CREDENTIALS: DemoRoleCredential[] = [
  {
    role: 'CUSTOMER',
    title: 'Customer / Retail Borrower',
    email: 'customer.demo@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/customer-portal',
    department: 'Retail Borrower Self-Service',
    badge: 'Borrower',
  },
  {
    role: 'SALES_OFFICER',
    title: 'Sales & Origination Officer',
    email: 'sales.officer@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/sales',
    department: 'Direct Sales & Lead Origination',
    badge: 'Origination',
  },
  {
    role: 'RELATIONSHIP_MANAGER',
    title: 'Relationship Manager (RM)',
    email: 'relationship.manager@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/relationship',
    department: 'Commercial & MSME Banking',
    badge: 'Commercial',
  },
  {
    role: 'CREDIT_ANALYST',
    title: 'Credit Analyst',
    email: 'credit.analyst@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/loan-analysis',
    department: 'Credit Appraisal & Underwriting',
    badge: 'Appraisal',
  },
  {
    role: 'CREDIT_MANAGER',
    title: 'Credit Manager',
    email: 'credit.manager@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/credit-manager',
    department: 'Credit Sanctions & Policy Exceptions',
    badge: 'Sanctions',
  },
  {
    role: 'FRAUD_OFFICER',
    title: 'Fraud & Forensics Officer',
    email: 'fraud.officer@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/fraud',
    department: 'Fraud Forensics & Investigation',
    badge: 'Forensics',
  },
  {
    role: 'KYC_OFFICER',
    title: 'KYC & AML Compliance Officer',
    email: 'kyc.officer@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/kyc',
    department: 'Identity & AML Verification Desk',
    badge: 'AML/KYC',
  },
  {
    role: 'COLLECTIONS_OFFICER',
    title: 'Collections Officer',
    email: 'collections.officer@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/collections',
    department: 'Field & Tele-Collections',
    badge: 'Recovery',
  },
  {
    role: 'COLLECTIONS_MANAGER',
    title: 'Collections Manager',
    email: 'collections.manager@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/collections',
    department: 'NPA Recovery & Remediation',
    badge: 'Remediation',
  },
  {
    role: 'OPERATIONS_OFFICER',
    title: 'Operations Officer',
    email: 'operations.officer@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/operations',
    department: 'Loan Booking & Mandate Verification',
    badge: 'Disbursement',
  },
  {
    role: 'OPERATIONS_MANAGER',
    title: 'Operations Manager',
    email: 'operations.manager@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/operations',
    department: 'Back-Office Settlement & Rail Control',
    badge: 'Settlement',
  },
  {
    role: 'FINANCE_OFFICER',
    title: 'Finance & Accounting Officer',
    email: 'finance.officer@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/finance',
    department: 'Payment Reconciliation & Accounting',
    badge: 'Reconciliation',
  },
  {
    role: 'FINANCE_MANAGER',
    title: 'Finance & Treasury Manager',
    email: 'finance.manager@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/finance',
    department: 'Treasury & ALM Operations',
    badge: 'Treasury',
  },
  {
    role: 'RISK_ANALYST',
    title: 'Risk Analyst',
    email: 'risk.analyst@finsight.ai',
    password: 'FinSight@Demo2026',
    homeUrl: '/risk',
    department: 'Portfolio Risk & Quantitative Modeling',
    badge: 'Quant Risk',
  },
  {
    role: 'RISK_MANAGER',
    title: 'Risk Manager (Primary)',
    email: 'arjun.mehta@finsight.ai',
    password: 'FinSight@2026',
    homeUrl: '/',
    department: 'Enterprise Portfolio Risk Management',
    badge: 'Enterprise Risk',
  },
  {
    role: 'ADMIN',
    title: 'Platform Administrator',
    email: 'admin.demo@finsight.ai',
    password: 'FinSight@Admin2026',
    homeUrl: '/admin',
    department: 'Executive Governance & Administration',
    badge: 'Full Access',
  },
];
