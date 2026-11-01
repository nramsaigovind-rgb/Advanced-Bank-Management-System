'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import { api } from '@/services/api';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function ManagerTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minAmount, setMinAmount] = useState('1000');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTxns = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.getTransactionHistory({ limit: 50 });
      setTransactions(Array.isArray(res) ? res : res?.items || []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to fetch transaction surveillance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTxns();
  }, []);

  const filteredTxns = transactions.filter((tx) => {
    const amt = Number(tx.amount) || 0;
    const threshold = parseFloat(minAmount) || 0;
    if (amt < threshold) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (tx.reference_number || '').toLowerCase().includes(q) ||
        (tx.transaction_type || '').toLowerCase().includes(q) ||
        (tx.channel || '').toLowerCase().includes(q) ||
        String(tx.source_account_id || '').includes(q) ||
        String(tx.destination_account_id || '').includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#F8F9F5]">
      <TopNav
        title="High-Value Transaction Surveillance"
        subtitle="Real-time AML monitoring & threshold auditing for Branch #1"
        actions={
          <button
            onClick={loadTxns}
            className="p-2 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 shadow-soft transition-colors"
            title="Refresh Transactions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
          </button>
        }
      />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Breadcrumb & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Link href="/manager" className="hover:text-emerald-700 font-semibold">
              Branch Manager
            </Link>
            <span>/</span>
            <span className="text-stone-900 font-bold">Surveillance Desk</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3" />
              <input
                type="text"
                placeholder="Search reference, account..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs rounded-2xl border border-stone-200 bg-white font-medium shadow-soft focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-stone-200/80 shadow-soft text-xs">
              <span className="text-stone-500 font-medium">Min Amount:</span>
              <select
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="font-bold text-stone-800 bg-transparent focus:outline-none"
              >
                <option value="0">All Amounts</option>
                <option value="500">&ge; ₹500</option>
                <option value="1000">&ge; ₹1,000</option>
                <option value="5000">&ge; ₹5,000</option>
                <option value="10000">&ge; ₹10,000</option>
              </select>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between shadow-soft">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900">&times;</button>
          </div>
        )}

        {/* Surveillance Table */}
        <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900">Branch Ledger Audit Stream</h3>
              <p className="text-xs text-stone-500">
                Displaying {filteredTxns.length} transactions exceeding ₹{Number(minAmount).toLocaleString('en-IN')}
              </p>
            </div>
            <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {filteredTxns.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFBF9] border-b border-stone-100 text-stone-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Timestamp & Ref</th>
                  <th className="py-3.5 px-6">Operation Type</th>
                  <th className="py-3.5 px-6">Accounts Involved</th>
                  <th className="py-3.5 px-6 text-right">Settled Amount</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-stone-400">
                      No transactions found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTxns.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-stone-900 block">{tx.reference_number}</span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(tx.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-stone-800">{tx.transaction_type}</div>
                        <div className="text-[10px] text-stone-400 font-mono">{tx.channel || 'CORE_ENGINE'}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-stone-700">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700">
                            A/C #{tx.source_account_id || 'CASH_DESK'}
                          </span>
                          {tx.destination_account_id && (
                            <>
                              <span className="text-stone-400">&rarr;</span>
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold">
                                A/C #{tx.destination_account_id}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-stone-900 text-sm">
                        ₹{Number(tx.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
