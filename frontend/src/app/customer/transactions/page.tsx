'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import TransactionTable, { TransactionItem } from '@/components/TransactionTable';
import { api } from '@/services/api';
import { History, ShieldCheck, Download } from 'lucide-react';

export default function CustomerTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await api.getTransactionHistory({ limit: 50 });
        if (data && data.items) {
          setTransactions(data.items);
        }
      } catch (err) {
        console.error('Failed to load transaction history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-cream-100 min-h-screen">
      <TopNav
        actions={
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cryptographic Ledger Trail</span>
          </div>
        }
      />

      <main className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Transaction History & Double-Entry Ledger
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            Immutable financial audit records persisted in MySQL 8.0 InnoDB with double-entry balancing
          </p>
        </div>

        <TransactionTable
          transactions={transactions}
          title="Account Statement & Settlement Logs"
          showFilters={true}
        />
      </main>
    </div>
  );
}
