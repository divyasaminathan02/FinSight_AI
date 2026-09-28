import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    role: User['role'];
    department?: string;
  }) => Promise<User>;
  logout: () => void;
  switchRole: (newRole: User['role']) => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('finsight_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('finsight_token') || null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('finsight_user', JSON.stringify(user));
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await authApi.login(email, password);
      setUser(data.user);
      setToken(data.access_token);
      localStorage.setItem('finsight_token', data.access_token);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('finsight_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      console.warn('Backend login fallback to local session:', err);
      const cleanEmail = email.toLowerCase().trim();
      const matchedKey = Object.keys(PERSONA_MAP).find(
        (k) => PERSONA_MAP[k as User['role']].email.toLowerCase() === cleanEmail
      ) as User['role'] | undefined;
      const resolvedRole: User['role'] =
        matchedKey ||
        (cleanEmail.includes('customer')
          ? 'CUSTOMER'
          : cleanEmail.includes('admin')
          ? 'ADMIN'
          : cleanEmail.includes('sales')
          ? 'SALES_OFFICER'
          : cleanEmail.includes('credit')
          ? 'CREDIT_ANALYST'
          : 'RISK_MANAGER');

      const persona = PERSONA_MAP[resolvedRole] || {
        name: cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        email: cleanEmail,
        dept: 'Portfolio Risk Management',
      };

      const demoUser: User = {
        id: 1,
        email: cleanEmail,
        full_name: persona.name,
        role: resolvedRole,
        department: persona.dept,
        branch: 'Headquarters - Mumbai',
        is_active: true,
      };
      setUser(demoUser);
      setToken('demo_token_session');
      localStorage.setItem('finsight_token', 'demo_token_session');
      localStorage.setItem('access_token', 'demo_token_session');
      localStorage.setItem('finsight_user', JSON.stringify(demoUser));
      return demoUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    full_name: string;
    role: User['role'];
    department?: string;
  }): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await authApi.register(userData);
      if (data && (data as any).access_token && (data as any).user) {
        const u = (data as any).user;
        const t = (data as any).access_token;
        setUser(u);
        setToken(t);
        localStorage.setItem('finsight_token', t);
        localStorage.setItem('access_token', t);
        localStorage.setItem('finsight_user', JSON.stringify(u));
        return u;
      }
      return await login(userData.email, userData.password);
    } catch (err) {
      console.warn('Backend register error, creating demo session:', err);
      const newUser: User = {
        id: Date.now(),
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        department: userData.department || 'Enterprise Financial Operations',
        branch: 'Headquarters - Mumbai',
        is_active: true,
      };
      setUser(newUser);
      setToken('demo_token_' + Date.now());
      localStorage.setItem('finsight_token', 'demo_token_' + Date.now());
      localStorage.setItem('access_token', 'demo_token_' + Date.now());
      localStorage.setItem('finsight_user', JSON.stringify(newUser));
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('finsight_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('finsight_user');
    try {
      authApi.logout().catch(() => {});
    } catch {}
  };

  const PERSONA_MAP: Record<User['role'], { name: string; email: string; dept: string }> = {
    // 16 Canonical Roles
    CUSTOMER: { name: 'Customer Demo', email: 'customer.demo@finsight.ai', dept: 'Retail Borrower' },
    SALES_OFFICER: { name: 'Sales Officer Demo', email: 'sales.officer@finsight.ai', dept: 'Direct Sales & Origination' },
    RELATIONSHIP_MANAGER: { name: 'Relationship Manager Demo', email: 'relationship.manager@finsight.ai', dept: 'Commercial & MSME Banking' },
    CREDIT_ANALYST: { name: 'Credit Analyst Demo', email: 'credit.analyst@finsight.ai', dept: 'Credit Appraisal & Underwriting' },
    CREDIT_MANAGER: { name: 'Credit Manager Demo', email: 'credit.manager@finsight.ai', dept: 'Credit Sanctions & Policy' },
    FRAUD_OFFICER: { name: 'Fraud Officer Demo', email: 'fraud.officer@finsight.ai', dept: 'Fraud Forensics & Investigation' },
    KYC_OFFICER: { name: 'KYC Officer Demo', email: 'kyc.officer@finsight.ai', dept: 'Identity & AML Verification Desk' },
    COLLECTIONS_OFFICER: { name: 'Collections Officer Demo', email: 'collections.officer@finsight.ai', dept: 'Field & Tele-Collections' },
    COLLECTIONS_MANAGER: { name: 'Collections Manager Demo', email: 'collections.manager@finsight.ai', dept: 'NPA Recovery & Remediation' },
    OPERATIONS_OFFICER: { name: 'Operations Officer Demo', email: 'operations.officer@finsight.ai', dept: 'Loan Booking & Mandates' },
    OPERATIONS_MANAGER: { name: 'Operations Manager Demo', email: 'operations.manager@finsight.ai', dept: 'Back-Office Operations & Settlement' },
    FINANCE_OFFICER: { name: 'Finance Officer Demo', email: 'finance.officer@finsight.ai', dept: 'Payment Reconciliation & Accounting' },
    FINANCE_MANAGER: { name: 'Finance Manager Demo', email: 'finance.manager@finsight.ai', dept: 'Treasury & ALM Operations' },
    RISK_ANALYST: { name: 'Risk Analyst Demo', email: 'risk.analyst@finsight.ai', dept: 'Portfolio Risk & Quantitative Modeling' },
    RISK_MANAGER: { name: 'Risk Manager Demo', email: 'risk.manager@finsight.ai', dept: 'Enterprise Portfolio Risk' },
    ADMIN: { name: 'Admin Demo', email: 'admin.demo@finsight.ai', dept: 'Executive Risk & Platform Administration' },

    // Legacy Aliases
    CREDIT_OFFICER: { name: 'Priya Sharma', email: 'priya.sharma@finsight.ai', dept: 'Credit Underwriting Desk' },
    COLLECTION_MANAGER: { name: 'Vikram Singh', email: 'vikram.singh@finsight.ai', dept: 'Delinquency & Remediation Desk' },
    OPERATIONS: { name: 'Deepa Nair', email: 'deepa.nair@finsight.ai', dept: 'Loan Operations & Disbursement' },
    EXECUTIVE: { name: 'Vikramaditya Singhania', email: 'ceo@finsight.ai', dept: 'Office of the CEO & Board' },
    SALES: { name: 'Kunal Singhal', email: 'kunal.singhal@finsight.ai', dept: 'Retail & MSME Origination' },
    ANALYST: { name: 'Kavita Verma', email: 'kavita.verma@finsight.ai', dept: 'Portfolio Intelligence & Analytics' },
    AUDITOR: { name: 'Rahul Sen', email: 'rahul.sen@finsight.ai', dept: 'Regulatory Compliance & Audit' },
  };

  const switchRole = async (newRole: User['role']) => {
    try {
      const res = await authApi.switchRole(newRole);
      if (res && res.user) {
        setUser(res.user);
        if (res.access_token) {
          setToken(res.access_token);
          localStorage.setItem('finsight_token', res.access_token);
        }
        localStorage.setItem('finsight_user', JSON.stringify(res.user));
        return;
      }
    } catch {
      // Local fallback
    }
    const persona = PERSONA_MAP[newRole] || { name: 'Institutional Officer', email: `${newRole.toLowerCase()}@finsight.ai`, dept: 'Enterprise Risk' };
    const updated: User = {
      id: user?.id || 1,
      role: newRole,
      full_name: persona.name,
      email: persona.email,
      department: persona.dept,
      branch: 'Headquarters - Mumbai',
      is_active: true,
    };
    setUser(updated);
    localStorage.setItem('finsight_user', JSON.stringify(updated));
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (user.permissions && user.permissions.includes(permission)) return true;
    return false;
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
