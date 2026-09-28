import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Briefcase,
  UserPlus,
  Building2,
  Sparkles,
  KeyRound,
  CheckCircle2,
  Shield,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { authApi } from '../services/api';
import { getRoleHome, DEMO_ROLE_CREDENTIALS, DemoRoleCredential } from '../utils/rbac';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('arjun.mehta@finsight.ai');
  const [password, setPassword] = useState('FinSight@2026');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<User['role']>('CREDIT_ANALYST');
  const [regDepartment, setRegDepartment] = useState('Credit Appraisal & Underwriting');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('ALL');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const u = await login(email, password);
      const targetHome = getRoleHome(u.role);
      navigate(targetHome);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantDemoLogin = async (cred: DemoRoleCredential) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError('');
    setIsLoading(true);
    try {
      const u = await login(cred.email, cred.password);
      const targetHome = getRoleHome(u.role);
      navigate(targetHome);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const newUser = await register({
        email: regEmail,
        password: regPassword,
        full_name: regName,
        role: regRole,
        department: regDepartment,
      });
      setSuccess(`Account created for ${newUser.full_name}! Redirecting to ${regRole.replace('_', ' ')} workspace...`);
      setTimeout(() => {
        navigate(getRoleHome(newUser.role));
      }, 700);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed. Please check inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-[#EDF4FF] to-blue-50/80 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900">
      {/* Privacy Notice Banner */}
      <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-200/90 rounded-full text-blue-800 text-xs font-semibold shadow-xs">
        <ShieldCheck className="w-4 h-4 text-blue-600" />
        <span>SIMULATED NBFC ENVIRONMENT • SECURE RBAC MULTI-ROLE GOVERNANCE</span>
      </div>

      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-blue-100/90 overflow-hidden">
        {/* Header - Crisp Institutional Brand Banner */}
        <div className="p-6 bg-gradient-to-r from-[#0F1D3D] via-[#1E3A8A] to-[#1D4ED8] text-white text-center">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-xs rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-md">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">FinSight AI</h1>
          <p className="text-xs text-blue-100 mt-1 font-medium">
            Autonomous NBFC Financial Intelligence & Credit Decisioning Engine
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center justify-center gap-2 ${
              tab === 'login'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Staff Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center justify-center gap-2 ${
              tab === 'register'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Personnel</span>
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {tab === 'login' ? (
            /* Sign In Tab */
            <>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Institutional Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@finsight.ai"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 text-slate-900 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium placeholder-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">Password</label>
                    <span className="text-[11px] text-slate-500">Default: FinSight@2026 / Demo2026</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 text-slate-900 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium placeholder-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50 active:scale-[0.99]"
                >
                  <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to FinSight AI'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* 16 Seeded Institutional Roles Matrix - Quick 1-Click Access */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Role-Based Demo Accounts (16 Personas)
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 font-semibold px-2 py-0.5 rounded-full">
                    1-Click Fast Login
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mb-3">
                  Click any role card below to instantly sign in with pre-seeded permissions, or click the fill icon to load credentials.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {DEMO_ROLE_CREDENTIALS.map((cred) => (
                    <div
                      key={cred.email}
                      className="p-2.5 bg-gradient-to-br from-white via-white to-blue-50/40 hover:from-blue-50/80 hover:to-indigo-50/80 border border-blue-100 hover:border-blue-300 rounded-xl transition-all shadow-xs flex items-center justify-between group"
                    >
                      <button
                        type="button"
                        onClick={() => handleInstantDemoLogin(cred)}
                        className="text-left flex-1 min-w-0 cursor-pointer pr-2"
                        title={`Sign in as ${cred.title}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                            {cred.title}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{cred.email}</div>
                        <div className="text-[9px] text-blue-600 font-mono mt-0.5">{cred.password}</div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEmail(cred.email);
                            setPassword(cred.password);
                          }}
                          className="px-2 py-1 text-[10px] font-semibold bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                          title="Fill form only"
                        >
                          Fill
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInstantDemoLogin(cred)}
                          className="px-2 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                          title="Instant 1-Click Login"
                        >
                          Go
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Register Personnel Tab */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 text-slate-900 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-medium placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Institutional Email Address
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ramesh.kulkarni@finsight.ai"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 text-slate-900 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-medium placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Role & RBAC Authority</label>
                  <select
                    value={regRole}
                    onChange={(e) => {
                      const newR = e.target.value as User['role'];
                      setRegRole(newR);
                      const matchingCred = DEMO_ROLE_CREDENTIALS.find((c) => c.role === newR);
                      if (matchingCred) {
                        setRegDepartment(matchingCred.department);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 text-slate-900 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-medium cursor-pointer"
                  >
                    <option value="CUSTOMER">Customer / Retail Borrower</option>
                    <option value="SALES_OFFICER">Sales Officer</option>
                    <option value="RELATIONSHIP_MANAGER">Relationship Manager</option>
                    <option value="CREDIT_ANALYST">Credit Analyst</option>
                    <option value="CREDIT_MANAGER">Credit Manager</option>
                    <option value="FRAUD_OFFICER">Fraud Officer</option>
                    <option value="KYC_OFFICER">KYC Officer</option>
                    <option value="COLLECTIONS_OFFICER">Collections Officer</option>
                    <option value="COLLECTIONS_MANAGER">Collections Manager</option>
                    <option value="OPERATIONS_OFFICER">Operations Officer</option>
                    <option value="OPERATIONS_MANAGER">Operations Manager</option>
                    <option value="FINANCE_OFFICER">Finance Officer</option>
                    <option value="FINANCE_MANAGER">Finance Manager</option>
                    <option value="RISK_ANALYST">Risk Analyst</option>
                    <option value="RISK_MANAGER">Risk Manager</option>
                    <option value="ADMIN">Platform Admin (Full Access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Department / Branch</label>
                  <input
                    type="text"
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    placeholder="Credit Appraisal & Underwriting"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 text-slate-900 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-medium placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 text-slate-900 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-medium placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 text-slate-900 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-medium placeholder-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <span>{isLoading ? 'Provisioning Account...' : 'Complete Institutional Registration'}</span>
                <UserCheck className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Customer / Borrower Portal Direct Switcher */}
          <div className="pt-3 border-t border-slate-200 text-center">
            <Link
              to="/customer-portal"
              className="inline-flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900 font-bold transition-colors"
            >
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Looking for Borrower Self-Service? Open Customer Portal &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
