'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
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
  Mail,
  Phone,
  FileText,
  UserPlus,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Registration form state
  const [regData, setRegData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    pan_number: '',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    let active = true;

    fetch('http://127.0.0.1:8000/', { signal: AbortSignal.timeout(2500) })
      .then((response) => {
        if (active) setApiStatus(response.ok ? 'online' : 'offline');
      })
      .catch(() => {
        if (active) setApiStatus('offline');
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRegSuccess(null);

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(regData.pan_number.toUpperCase().trim())) {
      setError('Invalid PAN format (e.g. ABCDE1234F). Must match ^[A-Z]{5}[0-9]{4}[A-Z]{1}$');
      return;
    }

    setRegLoading(true);
    try {
      const res = await api.registerSelf(regData);
      setRegSuccess(`Account registered successfully! Assigned ID: ${res.customer_number}. You can now sign in.`);
      setUsername(regData.username);
      setPassword(regData.password);
      setTimeout(() => {
        setActiveTab('login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  const setDemoCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9F5] text-stone-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle ambient lighting gradients */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none -mt-32"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-teal-100/40 rounded-full blur-3xl pointer-events-none -mb-32"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Logo & Header */}
        <div className="inline-flex items-center justify-center gap-3 mb-2">
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

        <p className="mt-1 text-xs text-stone-500 font-medium">
          Advanced DBMS &bull; Double-Entry Ledger &bull; ACID Concurrency Lab
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-6 px-6 sm:px-8 rounded-[28px] border border-stone-200/80 shadow-[0_12px_40px_-15px_rgba(6,35,28,0.08)]">
          {/* Tab Switcher */}
          <div className="flex bg-stone-100/80 p-1 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-forest-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-forest-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Open Account
            </button>
          </div>

          <div
            className={`mb-4 rounded-2xl border px-3.5 py-3 ${
              apiStatus === 'online'
                ? 'border-emerald-200 bg-emerald-50/70'
                : apiStatus === 'offline'
                  ? 'border-amber-200 bg-amber-50/80'
                  : 'border-stone-200 bg-stone-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  apiStatus === 'online'
                    ? 'bg-emerald-500'
                    : apiStatus === 'offline'
                      ? 'bg-amber-500'
                      : 'bg-stone-400 animate-pulse'
                }`}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                {apiStatus === 'online'
                  ? 'API online'
                  : apiStatus === 'offline'
                    ? 'API unavailable'
                    : 'Checking API'}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-stone-600">
              {apiStatus === 'online'
                ? 'The server is reachable. MySQL and demo data are still required for sign-in.'
                : apiStatus === 'offline'
                  ? 'Start the FastAPI server on port 8000. Sign-in will not work until the API is running.'
                  : 'Checking the local FastAPI server...'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 flex-shrink-0 animate-ping"></span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {regSuccess && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="flex-1">{regSuccess}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
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
                    className="pl-13 pr-4 py-2.5 w-full rounded-2xl border border-stone-200 bg-[#FDFEFC] text-stone-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">
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
                    className="pl-13 pr-11 py-2.5 w-full rounded-2xl border border-stone-200 bg-[#FDFEFC] text-stone-900 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
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
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-700/25 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
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
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regData.first_name}
                    onChange={(e) => setRegData({ ...regData, first_name: e.target.value })}
                    placeholder="Jane"
                    className="px-3 py-2 w-full rounded-xl border border-stone-200 bg-[#FDFEFC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regData.last_name}
                    onChange={(e) => setRegData({ ...regData, last_name: e.target.value })}
                    placeholder="Doe"
                    className="px-3 py-2 w-full rounded-xl border border-stone-200 bg-[#FDFEFC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={regData.username}
                  onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                  placeholder="jane_doe"
                  className="px-3 py-2 w-full rounded-xl border border-stone-200 bg-[#FDFEFC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  placeholder="jane.doe@example.com"
                  className="px-3 py-2 w-full rounded-xl border border-stone-200 bg-[#FDFEFC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Phone (10 digits)
                </label>
                <input
                  type="tel"
                  required
                  value={regData.phone}
                  onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                  placeholder="9876543210"
                  className="px-3 py-2 w-full rounded-xl border border-stone-200 bg-[#FDFEFC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  PAN Number (10 alphanumeric)
                </label>
                <input
                  type="text"
                  required
                  value={regData.pan_number}
                  onChange={(e) => setRegData({ ...regData, pan_number: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  className="px-3 py-2 w-full rounded-xl border border-stone-200 bg-[#FDFEFC] text-xs font-mono font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  placeholder="••••••••"
                  className="px-3 py-2 w-full rounded-xl border border-stone-200 bg-[#FDFEFC] text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-sm transition-all disabled:opacity-60"
              >
                {regLoading ? 'Registering customer...' : 'Submit Application'}
              </button>
            </form>
          )}

          {/* Quick Demo Pre-Fill Accounts (Only on login tab) */}
          {activeTab === 'login' && (
            <div className="mt-5 pt-4 border-t border-stone-100">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2.5 text-center flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Quick Demo Persona Logins</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDemoCredentials('admin', 'Admin@123')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    username === 'admin'
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-sm text-emerald-950 ring-1 ring-emerald-500'
                      : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1">
                    <div className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Cpu className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-[11px]">System Admin</span>
                  </div>
                  <div className="text-[9px] text-stone-500 mt-0.5">DBMS Diagnostics</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDemoCredentials('manager_br1', 'Manager@123')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    username === 'manager_br1'
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-sm text-emerald-950 ring-1 ring-emerald-500'
                      : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1">
                    <div className="w-4 h-4 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center">
                      <Building2 className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-[11px]">Branch Manager</span>
                  </div>
                  <div className="text-[9px] text-stone-500 mt-0.5">Branch #1 (Delhi)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDemoCredentials('emp_rahul', 'Employee@123')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    username === 'emp_rahul'
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-sm text-emerald-950 ring-1 ring-emerald-500'
                      : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1">
                    <div className="w-4 h-4 rounded-md bg-sky-100 text-sky-800 flex items-center justify-center">
                      <Shield className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-[11px]">Bank Officer</span>
                  </div>
                  <div className="text-[9px] text-stone-500 mt-0.5">KYC & Teller Desk</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDemoCredentials('alex_turner', 'Customer@123')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    username === 'alex_turner'
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-sm text-emerald-950 ring-1 ring-emerald-500'
                      : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1">
                    <div className="w-4 h-4 rounded-md bg-purple-100 text-purple-800 flex items-center justify-center">
                      <Zap className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-[11px]">Customer (Alex)</span>
                  </div>
                  <div className="text-[9px] text-stone-500 mt-0.5">Live Account</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* System Trust Badges */}
        <div className="mt-5 flex items-center justify-center gap-3 text-[10px] text-stone-500 font-semibold flex-wrap">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            MySQL 8.0 InnoDB
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Row-Level FOR UPDATE
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Double-Entry Balancing
          </span>
        </div>
      </div>
    </div>
  );
}
