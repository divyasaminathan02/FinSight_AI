import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Briefcase, UserPlus, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

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
  const [regRole, setRegRole] = useState<User['role']>('CREDIT_OFFICER');
  const [regDepartment, setRegDepartment] = useState('Retail Lending Operations');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid email or password');
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
      await register({
        email: regEmail,
        password: regPassword,
        full_name: regName,
        role: regRole,
        department: regDepartment,
      });
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => navigate('/'), 800);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed. Please check inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  const QUICK_PERSONAS = [
    { name: 'Arjun Mehta', role: 'RISK_MANAGER', label: 'Risk Manager', email: 'arjun.mehta@finsight.ai', pass: 'FinSight@2026' },
    { name: 'Priya Sharma', role: 'CREDIT_OFFICER', label: 'Credit Officer', email: 'priya.sharma@finsight.ai', pass: 'FinSight@2026' },
    { name: 'Vikram Singh', role: 'COLLECTION_MANAGER', label: 'Collection Mgr', email: 'vikram.singh@finsight.ai', pass: 'FinSight@2026' },
    { name: 'Sanjay Rao', role: 'FINANCE_MANAGER', label: 'Finance Manager', email: 'sanjay.rao@finsight.ai', pass: 'FinSight@2026' },
    { name: 'Kavita Verma', role: 'ANALYST', label: 'Financial Analyst', email: 'kavita.verma@finsight.ai', pass: 'FinSight@2026' },
    { name: 'Rahul Sen', role: 'AUDITOR', label: 'Compliance Auditor', email: 'rahul.sen@finsight.ai', pass: 'FinSight@2026' },
    { name: 'Deepa Nair', role: 'OPERATIONS', label: 'Operations Desk', email: 'deepa.nair@finsight.ai', pass: 'FinSight@2026' },
    { name: 'Vikramaditya Singhania', role: 'EXECUTIVE', label: 'Executive / CEO', email: 'ceo@finsight.ai', pass: 'FinSight@2026' },
    { name: 'Rajesh Kumar Verma', role: 'CUSTOMER', label: 'Borrower', email: 'rajesh.verma@customer.finsight.ai', pass: 'FinSight@2026' },
    { name: 'Chief Risk Officer', role: 'ADMIN', label: 'CRO / Admin', email: 'admin@finsight.ai', pass: 'FinSight@Admin2026' },
  ];

  return (
    <div className="min-h-screen bg-[#070E20] flex flex-col items-center justify-center p-4">
      {/* Privacy Notice Banner */}
      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-semibold tracking-wide">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>SIMULATED NBFC DATA - SYNTHETIC ENTERPRISE ENVIRONMENT</span>
      </div>

      <div className="max-w-md w-full bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-linear-to-b from-slate-900 to-[#0F1D3D] text-white text-center border-b border-slate-800">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">FinSight AI</h1>
          <p className="text-xs text-slate-400 mt-0.5">Autonomous NBFC Financial Intelligence Platform</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Staff Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Personnel</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-lg">
              {success}
            </div>
          )}

          {tab === 'login' ? (
            /* Sign In Tab */
            <>
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Institutional Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@finsight.ai"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/80 border border-slate-700 text-slate-100 rounded-lg outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/80 border border-slate-700 text-slate-100 rounded-lg outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Authenticating...' : 'Sign In to FinSight AI'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Quick Persona Logins for Demo */}
              <div className="pt-4 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                  Instant Demo Switcher (7 Institutional Roles)
                </span>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {QUICK_PERSONAS.map((q) => (
                    <button
                      key={q.email}
                      type="button"
                      onClick={() => {
                        setEmail(q.email);
                        setPassword(q.pass);
                      }}
                      className="p-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-left transition-colors cursor-pointer group"
                    >
                      <div className="text-[11px] font-semibold text-slate-200 group-hover:text-blue-400 truncate">{q.name}</div>
                      <div className="text-[9px] text-slate-400 truncate">{q.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Register Tab */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Deepak Verma"
                  className="w-full px-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 text-slate-100 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="deepak.verma@finsight.ai"
                  className="w-full px-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 text-slate-100 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role & Permissions</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as User['role'])}
                    className="w-full px-2 py-1.5 text-xs bg-slate-800/80 border border-slate-700 text-slate-100 rounded-lg outline-none focus:border-blue-500"
                  >
                    <option value="CREDIT_OFFICER">Credit Officer</option>
                    <option value="RISK_MANAGER">Risk Manager</option>
                    <option value="COLLECTION_MANAGER">Collection Manager</option>
                    <option value="FINANCE_MANAGER">Finance Manager</option>
                    <option value="ANALYST">Analyst</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="ADMIN">Admin (Full Access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    placeholder="Underwriting Desk"
                    className="w-full px-2 py-1.5 text-xs bg-slate-800/80 border border-slate-700 text-slate-100 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-2 py-1.5 text-xs bg-slate-800/80 border border-slate-700 text-slate-100 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-2 py-1.5 text-xs bg-slate-800/80 border border-slate-700 text-slate-100 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                <span>{isLoading ? 'Creating Officer Profile...' : 'Complete Registration'}</span>
                <UserCheck className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Customer / Borrower Portal Direct Switcher */}
          <div className="pt-3 border-t border-slate-800 text-center">
            <Link
              to="/customer-portal"
              className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Looking for Borrower Portal? Open Self-Service Portal &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
