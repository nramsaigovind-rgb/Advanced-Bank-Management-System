'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import TransactionTable, { TransactionItem } from '@/components/TransactionTable';
import { api } from '@/services/api';
import { History, ShieldCheck, Download, FileText } from 'lucide-react';

export default function CustomerTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [txData, accData] = await Promise.all([
          api.getTransactionHistory({ limit: 50 }),
          api.getAccounts(),
        ]);
        setTransactions(Array.isArray(txData) ? txData : txData?.items || []);
        if (accData && accData.length > 0) {
          setAccounts(accData);
          setSelectedAccountId(accData[0].id);
        }
      } catch (err) {
        console.error('Failed to load transaction history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownload = async (format: 'pdf' | 'csv') => {
    if (!selectedAccountId) return;
    try {
      setDownloading(true);
      await api.downloadAccountStatement(selectedAccountId, format);
    } catch (e: any) {
      alert(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              Transaction History & Double-Entry Ledger
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
              Immutable financial audit records persisted in MySQL 8.0 InnoDB with double-entry balancing
            </p>
          </div>

          {/* Statement Export Control */}
          {accounts.length > 0 && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-stone-200/80 shadow-sm">
              <select
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 font-mono text-forest-900 focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_number} ({acc.account_type})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={downloading}
                onClick={() => handleDownload('pdf')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 transition-colors disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                <span>PDF Statement</span>
              </button>

              <button
                type="button"
                disabled={downloading}
                onClick={() => handleDownload('csv')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                <FileText className="w-3 h-3" />
                <span>CSV</span>
              </button>
            </div>
          )}
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
