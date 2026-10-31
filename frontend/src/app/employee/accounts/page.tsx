'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import { api } from '@/services/api';
import {
  CreditCard,
  Lock,
  Unlock,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

export default function EmployeeAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cash transaction modal
  const [txnModal, setTxnModal] = useState<{ open: boolean; type: 'DEPOSIT' | 'WITHDRAWAL'; account: any | null }>({
    open: false,
    type: 'DEPOSIT',
    account: null,
  });
  const [txnAmount, setTxnAmount] = useState('5000');
  const [txnRemarks, setTxnRemarks] = useState('Cash transaction at teller');
  const [txnLoading, setTxnLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const accs = await api.getAccounts();
      setAccounts(accs);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleFreeze = async (accountId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    try {
      await api.updateAccountStatus(accountId, newStatus, 'Officer status toggle');
      setActionMsg(`Account #${accountId} is now ${newStatus}.`);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Status toggle failed');
    }
  };

  const handleCashTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnModal.account) return;
    setTxnLoading(true);
    setErrorMsg(null);

    try {
      const amt = parseFloat(txnAmount);
      if (txnModal.type === 'DEPOSIT') {
        await api.depositFunds({
          account_id: txnModal.account.id,
          amount: amt,
          description: txnRemarks,
        });
        setActionMsg(`Cash deposit of ₹${amt.toLocaleString('en-IN')} committed successfully!`);
      } else {
        await api.withdrawFunds({
          account_id: txnModal.account.id,
          amount: amt,
          description: txnRemarks,
        });
        setActionMsg(`Cash withdrawal of ₹${amt.toLocaleString('en-IN')} processed successfully!`);
      }
      setTxnModal({ open: false, type: 'DEPOSIT', account: null });
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Cash transaction failed');
    } finally {
      setTxnLoading(false);
    }
  };

  const filtered = accounts.filter((a) => {
    return (
      a.account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.account_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="flex-1 flex flex-col bg-cream-100 min-h-screen">
      <TopNav
        actions={
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Teller & Cash Desk</span>
          </div>
        }
      />

      <main className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Customer Account Administration & Teller Desk
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            Cash deposit, cash withdrawal, account freeze/unfreeze overrides, and ledger audits
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

        <div className="bg-white rounded-[26px] border border-stone-200/80 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-forest-900">All Branch Accounts ({accounts.length})</h3>
              <p className="text-xs text-stone-500">Row-locked accounts with double-entry clearing</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search account number..."
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
                  <th className="py-3.5 px-6">Account Number</th>
                  <th className="py-3.5 px-6">Account Type</th>
                  <th className="py-3.5 px-6">Customer ID</th>
                  <th className="py-3.5 px-6 text-right">Available Balance</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-center">Teller Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((acc) => (
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
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTxnModal({ open: true, type: 'DEPOSIT', account: acc })}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all flex items-center gap-1"
                        >
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          <span>Deposit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTxnModal({ open: true, type: 'WITHDRAWAL', account: acc })}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-all flex items-center gap-1"
                        >
                          <ArrowUpRight className="w-3 h-3 text-blue-600" />
                          <span>Withdraw</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleFreeze(acc.id, acc.status)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            acc.status === 'ACTIVE'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title={acc.status === 'ACTIVE' ? 'Freeze Account' : 'Unfreeze Account'}
                        >
                          {acc.status === 'ACTIVE' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash Deposit / Withdrawal Modal */}
        {txnModal.open && txnModal.account && (
          <div className="fixed inset-0 bg-forest-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[28px] max-w-md w-full p-7 shadow-2xl border border-stone-200/80 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      txnModal.type === 'DEPOSIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {txnModal.type === 'DEPOSIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-forest-900">
                      Teller Cash {txnModal.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                    </h3>
                    <p className="text-xs text-stone-500 font-mono">
                      Account #{txnModal.account.account_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTxnModal({ open: false, type: 'DEPOSIT', account: null })}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCashTransaction} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                    Transaction Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={txnAmount}
                    onChange={(e) => setTxnAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 font-mono font-bold text-sm text-forest-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="text-[11px] text-stone-400 mt-1">
                    Current Balance: ₹{Number(txnModal.account.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                    Teller Remarks / Audit Reason
                  </label>
                  <input
                    type="text"
                    required
                    value={txnRemarks}
                    onChange={(e) => setTxnRemarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-forest-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="p-3 bg-cream-100 rounded-xl text-[11px] text-stone-600 space-y-0.5">
                  <div className="font-semibold text-forest-900">Clearing Mechanism:</div>
                  <div>Settled atomically through SYS-CLEARING account with double-entry balancing.</div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTxnModal({ open: false, type: 'DEPOSIT', account: null })}
                    className="px-5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={txnLoading}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-white font-bold shadow-md shadow-emerald-950/20 disabled:opacity-50"
                  >
                    {txnLoading ? 'Settling...' : 'Post Transaction'}
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
