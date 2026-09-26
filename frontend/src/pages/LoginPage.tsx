import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('arjun.mehta@finsight.ai');
  const [password, setPassword] = useState('FinSight@2026');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  const QUICK_LOGINS = [
    { name: 'Arjun Mehta', role: 'Risk Manager', email: 'arjun.mehta@finsight.ai' },
    { name: 'Priya Sharma', role: 'Credit Officer', email: 'priya.sharma@finsight.ai' },
    { name: 'Vikram Singh', role: 'Collection Manager', email: 'vikram.singh@finsight.ai' },
    { name: 'Chief Risk Officer', role: 'CRO / Admin', email: 'admin@finsight.ai' },
  ];

  return (
    <div className="min-h-screen bg-[#0B132B] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-linear-to-b from-slate-900 to-[#111C3D] text-white text-center border-b border-slate-800">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">FinSight AI</h1>
          <p className="text-xs text-slate-300 mt-0.5">NBFC Institutional Intelligence Platform</p>
        </div>

        {/* Login Form */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md outline-none focus:border-blue-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md outline-none focus:border-blue-600 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Personas */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Quick Institutional Demo Logins
            </span>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_LOGINS.map((q) => (
                <button
                  key={q.email}
                  type="button"
                  onClick={() => {
                    setEmail(q.email);
                    setPassword(q.email === 'admin@finsight.ai' ? 'FinSight@Admin2026' : 'FinSight@2026');
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-left transition-colors cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-slate-900 truncate">{q.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{q.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
