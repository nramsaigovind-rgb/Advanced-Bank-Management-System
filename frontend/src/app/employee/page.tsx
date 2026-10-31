'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import KPICard from '@/components/KPICard';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  PlusCircle,
  Shield,
  FileCheck,
  Lock,
  Unlock,
  X,
  CreditCard,
  UserPlus,
} from 'lucide-react';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Customer Form
  const [showRegModal, setShowRegModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pan, setPan] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('10000');
  const [accountType, setAccountType] = useState('SAVINGS');

  const loadData = async () => {
    try {
      setLoading(true);
      const custs = await api.getCustomers();
      setCustomers(custs);
      const accs = await api.getAccounts();
      setAccounts(accs);
    } catch (e) {
      console.error('Failed to load employee desk data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleKycAction = async (customerId: number, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await api.updateKYC(customerId, {
        kyc_status: status,
        remarks: `Employee verification decision by ${user?.username || 'Officer'}`,
      });
      setActionMsg(`Customer #${customerId} KYC status updated to ${status}. Event logged to Audit Trail.`);
      setErrorMsg(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'KYC update failed');
    }
  };

  const handleToggleAccountStatus = async (accountId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    try {
      await api.updateAccountStatus(accountId, newStatus, `Employee status override by ${user?.username}`);
      setActionMsg(`Account #${accountId} status updated to ${newStatus}.`);
      setErrorMsg(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Status update failed');
    }
  };

  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.registerCustomer({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        pan_number: pan,
        aadhaar_number: aadhaar,
        branch_id: user?.branch_id || 1,
        initial_account_type: accountType,
        initial_deposit: parseFloat(initialDeposit) || 0,
      });
      setActionMsg(`Customer ${firstName} ${lastName} registered successfully with new ${accountType} account!`);
      setErrorMsg(null);
      setShowRegModal(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPan('');
      setAadhaar('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register customer');
    }
  };

  const pendingKycs = customers.filter((c) => c.kyc_status === 'PENDING');
  const verifiedKycs = customers.filter((c) => c.kyc_status === 'VERIFIED');

  const filteredCustomers = customers.filter((c) => {
    const full = `${c.first_name} ${c.last_name || ''} ${c.email} ${c.pan_number || ''}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col bg-cream-100 min-h-screen">
      <TopNav
        actions={
          <button
            onClick={() => setShowRegModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-white shadow-md shadow-emerald-950/20 transition-all active:scale-[0.98]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard Customer</span>
          </button>
        }
      />

      <main className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Branch Officer Operations Desk
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            Officer: {user?.first_name || user?.username || 'Bank Officer'} &bull; Branch #{user?.branch_id || 1} &bull; KYC compliance & customer onboarding
          </p>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionMsg}</span>
            </div>
            <button onClick={() => setActionMsg(null)} className="font-bold">&times;</button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="font-bold">&times;</button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="KYC Pending Queue"
            value={pendingKycs.length}
            subtitle="Tier-1 Identity Queue"
            icon={UserCheck}
            accentColor="amber"
          />
          <KPICard
            title="Branch Customers"
            value={customers.length}
            subtitle="Profiles in MySQL"
            icon={Users}
            accentColor="emerald"
          />
          <KPICard
            title="Total Accounts"
            value={accounts.length}
            subtitle="Active Ledgers"
            icon={FileCheck}
            accentColor="teal"
          />
          <KPICard
            title="Verified Customers"
            value={verifiedKycs.length}
            subtitle="Compliant & Active"
            icon={Shield}
            accentColor="blue"
          />
        </div>

        {/* KYC Verification Queue Table */}
        <div className="bg-white rounded-[26px] border border-stone-200/80 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-forest-900">Tier-1 KYC Verification Queue</h3>
              <p className="text-xs text-stone-500">Government ID & PAN verification required for banking operations</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter by name, email, PAN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-stone-50/70 border border-stone-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-60 text-forest-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100/75 border-b border-stone-100 text-stone-500 font-semibold uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Customer Name</th>
                  <th className="py-3.5 px-6">PAN Number</th>
                  <th className="py-3.5 px-6">Aadhaar UID</th>
                  <th className="py-3.5 px-6">Email & Contact</th>
                  <th className="py-3.5 px-6 text-center">KYC Status</th>
                  <th className="py-3.5 px-6 text-center">Officer Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400 font-medium">
                      No customer profiles found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-forest-900">
                        {cust.first_name} {cust.last_name || ''}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-medium text-stone-700">
                        {cust.pan_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-stone-400">
                        {cust.aadhaar_number ? `•••• •••• ${cust.aadhaar_number.slice(-4)}` : '•••• •••• 9812'}
                      </td>
                      <td className="py-3.5 px-6 text-stone-600">{cust.email}</td>
                      <td className="py-3.5 px-6 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            cust.kyc_status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : cust.kyc_status === 'PENDING'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {cust.kyc_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {cust.kyc_status !== 'VERIFIED' && (
                            <button
                              type="button"
                              onClick={() => handleKycAction(cust.id, 'VERIFIED')}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
                            >
                              Verify
                            </button>
                          )}
                          {cust.kyc_status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => handleKycAction(cust.id, 'REJECTED')}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Accounts & Status Management */}
        <div className="bg-white rounded-[26px] border border-stone-200/80 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-forest-900">Customer Bank Accounts & Security Status</h3>
              <p className="text-xs text-stone-500">Live row locks & freeze overrides</p>
            </div>
            <span className="text-xs font-mono font-semibold text-stone-500">
              Accounts: {accounts.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100/75 border-b border-stone-100 text-stone-500 font-semibold uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Account Number</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Customer ID</th>
                  <th className="py-3.5 px-6 text-right">Available Balance</th>
                  <th className="py-3.5 px-6 text-center">State</th>
                  <th className="py-3.5 px-6 text-center">Officer Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-forest-900">{acc.account_number}</td>
                    <td className="py-3.5 px-6 font-mono text-stone-600">{acc.account_type}</td>
                    <td className="py-3.5 px-6 font-mono text-stone-500">Cust #{acc.customer_id}</td>
                    <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-700">
                      ₹{Number(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          acc.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAccountStatus(acc.id, acc.status)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                          acc.status === 'ACTIVE'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {acc.status === 'ACTIVE' ? (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Freeze</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3" />
                            <span>Unfreeze</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Onboard Customer Modal */}
        {showRegModal && (
          <div className="fixed inset-0 bg-forest-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[28px] max-w-lg w-full p-7 shadow-2xl border border-stone-200/80 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-forest-900">Onboard New Customer</h3>
                    <p className="text-xs text-stone-500">Atomic profile & account creation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRegModal(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRegisterCustomer} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.doe@bank.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                      PAN Card (10 chars)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={pan}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                      Aadhaar UID
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={aadhaar}
                      onChange={(e) => setAadhaar(e.target.value)}
                      placeholder="123456789012"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                      Account Type
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="SAVINGS">Savings Account</option>
                      <option value="CHECKING">Current Account</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                      Initial Deposit (₹)
                    </label>
                    <input
                      type="number"
                      min="1000"
                      value={initialDeposit}
                      onChange={(e) => setInitialDeposit(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRegModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-white font-bold shadow-md shadow-emerald-950/20"
                  >
                    Register & Open Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
