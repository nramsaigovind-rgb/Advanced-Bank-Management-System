'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  Database,
  Cpu,
  Zap,
  CheckCircle2,
  Building2,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      const msg = typeof err === 'object' && err?.message ? err.message : String(err || 'Login failed');
      setError(msg || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9F5] text-stone-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle ambient lighting gradients */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none -mt-32"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-teal-100/40 rounded-full blur-3xl pointer-events-none -mb-32"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Logo & Header */}
        <div className="inline-flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-[#06231C] border border-[#0B3B2F] flex items-center justify-center shadow-lg shadow-emerald-950/20 relative overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-emerald-400/80 -translate-x-1"></div>
            <div className="w-6 h-6 rounded-full bg-teal-300/80 translate-x-1 mix-blend-screen absolute"></div>
          </div>
          <div className="text-left">
            <span className="text-2xl font-extrabold tracking-tight text-[#06231C]">
              ABMS <span className="text-emerald-700">Bank</span>
            </span>
            <span className="block text-[11px] text-stone-500 font-medium tracking-wide">
              Your Trust. Our Technology.
            </span>
          </div>
        </div>

        <p className="mt-2 text-xs text-stone-500 font-medium">
          Advanced DBMS &bull; Double-Entry Ledger &bull; ACID Concurrency Lab
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-[28px] border border-stone-200/80 shadow-[0_12px_40px_-15px_rgba(6,35,28,0.08)]">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 flex-shrink-0 animate-ping"></span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="pl-13 pr-4 py-3 w-full rounded-2xl border border-stone-200 bg-[#FDFEFC] text-stone-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-13 pr-11 py-3 w-full rounded-2xl border border-stone-200 bg-[#FDFEFC] text-stone-900 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-stone-400 hover:text-stone-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-700/25 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Authenticating with Argon2id...</span>
                </div>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-Fill Accounts */}
          <div className="mt-6 pt-5 border-t border-stone-100">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Quick Demo Persona Logins</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials('admin', 'Admin@123')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  username === 'admin'
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-sm text-emerald-950 ring-1 ring-emerald-500'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Cpu className="w-3 h-3" />
                  </div>
                  <span>System Admin</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1 font-medium">DBMS Diagnostics Lab</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('manager_br1', 'Manager@123')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  username === 'manager_br1'
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-sm text-emerald-950 ring-1 ring-emerald-500'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                    <Building2 className="w-3 h-3" />
                  </div>
                  <span>Branch Manager</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1 font-medium">Delhi CP &bull; Branch #1</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('emp_rahul', 'Employee@123')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  username === 'emp_rahul'
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-sm text-emerald-950 ring-1 ring-emerald-500'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
                    <Shield className="w-3 h-3" />
                  </div>
                  <span>Bank Officer</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1 font-medium">KYC Desk &bull; Teller Ops</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('alex_turner', 'Customer@123')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  username === 'alex_turner'
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-sm text-emerald-950 ring-1 ring-emerald-500'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Zap className="w-3 h-3" />
                  </div>
                  <span>Customer (Alex)</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1 font-medium">Savings A/C &bull; Live Txns</div>
              </button>
            </div>
          </div>
        </div>

        {/* System Trust Badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-stone-500 font-semibold flex-wrap">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            MySQL 8.0 (InnoDB)
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Pessimistic Row Locks
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Double-Entry Ledger
          </span>
        </div>
      </div>
    </div>
  );
}
