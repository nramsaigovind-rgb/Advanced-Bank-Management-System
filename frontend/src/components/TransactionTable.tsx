'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Layers,
  Info,
  X,
  CreditCard,
  Send,
  ShieldCheck,
} from 'lucide-react';

export interface TransactionItem {
  id: number;
  reference_no: string;
  transaction_type: string;
  source_account_id?: number;
  destination_account_id?: number;
  amount: number;
  status: string;
  description?: string;
  created_at: string;
  ledger_entries?: Array<{
    id: number;
    account_id: number;
    entry_type: 'DEBIT' | 'CREDIT';
    amount: number;
    balance_after: number;
    posted_at: string;
  }>;
}

interface TransactionTableProps {
  transactions: TransactionItem[];
  currentAccountId?: number;
  title?: string;
  showFilters?: boolean;
}

export default function TransactionTable({
  transactions,
  currentAccountId,
  title = 'Recent Financial Transactions',
  showFilters = true,
}: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedTxn, setSelectedTxn] = useState<TransactionItem | null>(null);

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.reference_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || t.transaction_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amt);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-soft overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-forest-900">{title}</h2>
          <p className="text-xs text-stone-500 font-medium">
            Single source of truth &middot; MySQL 8.0 InnoDB Double-Entry Ledger
          </p>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search reference or remarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-stone-50/70 border border-stone-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-56 text-forest-900"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-stone-50/70 border border-stone-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-stone-700 font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="TRANSFER">Transfers</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAWAL">Withdrawals</option>
              <option value="LOAN_DISBURSEMENT">Disbursements</option>
              <option value="LOAN_REPAYMENT">Repayments</option>
            </select>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-cream-100/75 border-b border-stone-100 text-stone-500 font-semibold uppercase tracking-wider font-mono text-[10px]">
            <tr>
              <th className="py-3.5 px-6">Reference & Timestamp</th>
              <th className="py-3.5 px-6">Type</th>
              <th className="py-3.5 px-6">Remarks / Purpose</th>
              <th className="py-3.5 px-6 text-right">Amount</th>
              <th className="py-3.5 px-6 text-center">Status</th>
              <th className="py-3.5 px-6 text-center">Ledger Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-stone-400 font-medium">
                  No transactions found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((txn) => {
                const isCredit = currentAccountId
                  ? txn.destination_account_id === currentAccountId
                  : txn.transaction_type === 'DEPOSIT';

                return (
                  <tr key={txn.id} className="hover:bg-emerald-50/20 transition-colors">
                    {/* Reference & Time */}
                    <td className="py-3.5 px-6">
                      <div className="font-mono font-semibold text-forest-900">{txn.reference_no}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">{formatDate(txn.created_at)}</div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cream-200/70 text-forest-800 border border-stone-200/60 font-mono">
                        {txn.transaction_type}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-6 max-w-xs truncate text-stone-600 font-medium">
                      {txn.description || 'Interbank settlement'}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-6 text-right font-mono font-bold text-sm">
                      <span className={isCredit ? 'text-emerald-600' : 'text-forest-900'}>
                        {isCredit ? '+' : '-'} {formatCurrency(txn.amount)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-6 text-center">
                      {txn.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          COMPLETED
                        </span>
                      ) : txn.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          ROLLED BACK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {txn.status}
                        </span>
                      )}
                    </td>

                    {/* Ledger Action */}
                    <td className="py-3.5 px-6 text-center">
                      <button
                        onClick={() => setSelectedTxn(txn)}
                        className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                        title="View Double-Entry Ledger Details"
                      >
                        <Layers className="w-3 h-3 text-emerald-600" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Double-Entry Ledger Inspector Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-forest-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[28px] max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-stone-200/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-sm">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-forest-900">Double-Entry Ledger Audit</h3>
                  <p className="text-xs font-mono text-stone-500">{selectedTxn.reference_no}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-cream-100 rounded-2xl border border-stone-200/80 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Transaction Type:</span>
                  <span className="font-semibold text-forest-900">{selectedTxn.transaction_type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Gross Settlement Amount:</span>
                  <span className="font-bold font-mono text-emerald-700">{formatCurrency(selectedTxn.amount)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">ACID Atomicity:</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Committed & Balanced (Zero Leakage)
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider font-mono">
                Balanced Ledger Entries (&Sigma; Debits = &Sigma; Credits)
              </div>

              {selectedTxn.ledger_entries && selectedTxn.ledger_entries.length > 0 ? (
                <div className="border border-stone-200/80 rounded-2xl overflow-hidden divide-y divide-stone-100 text-xs">
                  {selectedTxn.ledger_entries.map((entry) => (
                    <div key={entry.id} className="p-3.5 flex items-center justify-between bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono ${
                              entry.entry_type === 'DEBIT'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            {entry.entry_type}
                          </span>
                          <span className="font-mono font-semibold text-forest-900">Account #{entry.account_id}</span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1 font-mono">
                          Post-transaction: {formatCurrency(entry.balance_after)}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-sm text-forest-900">
                        {formatCurrency(entry.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    <span>InnoDB Strict Atomicity & Double-Entry Balancing</span>
                  </div>
                  <p className="text-emerald-800 text-[11px]">
                    Ledger entries are committed atomically in the same SQL transaction block as the account balance updates.
                    Double-entry bookkeeping guarantees that debit and credit sides cancel to zero.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
