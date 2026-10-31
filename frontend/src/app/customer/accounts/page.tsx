'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import { api } from '@/services/api';
import {
  CreditCard,
  Wallet,
  ShieldCheck,
  Lock,
  Unlock,
  Plus,
  AlertCircle,
  Building,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function CustomerAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const accs = await api.getAccounts();
      setAccounts(accs);
      if (accs[0]) {
        const c = await api.getAccountCards(accs[0].id);
        setCards(c);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Accounts load error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleCard = async (cardId: number, currentlyBlocked: boolean) => {
    try {
      setActionLoading(cardId);
      setErrorMsg(null);
      await api.toggleCardBlock(cardId, !currentlyBlocked);
      if (accounts[0]) {
        const c = await api.getAccountCards(accounts[0].id);
        setCards(c);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Card update failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-cream-100 min-h-screen">
      <TopNav
        actions={
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Multi-Account Protection</span>
          </div>
        }
      />

      <main className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Accounts & Payment Cards
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            Active deposit accounts, debit cards, and instant cryptographic card freezing
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="font-bold">&times;</button>
          </div>
        )}

        {/* Accounts List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-forest-900 font-mono uppercase tracking-wider">
              Deposit & Transaction Accounts ({accounts.length})
            </h3>
            <span className="text-[11px] text-stone-500 font-mono">Single Source of Truth: MySQL 8.0</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white rounded-[26px] p-6 border border-stone-200/80 shadow-soft hover:shadow-card transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                      {acc.account_type} ACCOUNT
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{acc.status}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-400 font-mono uppercase">Account Number</div>
                  <div className="text-xl font-bold font-mono text-forest-900 tracking-wider mt-0.5">
                    {acc.account_number}
                  </div>

                  <div className="mt-5 pt-4 border-t border-stone-100 flex justify-between items-baseline">
                    <span className="text-xs text-stone-500 font-medium">Available Balance</span>
                    <span className="text-2xl font-extrabold font-mono text-emerald-700">
                      ₹{Number(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-stone-400 font-mono">
                    <span>Branch #{acc.branch_id || 1} &bull; Delhi CP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => api.downloadAccountStatement(acc.id, 'pdf')}
                      className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                      title="Download PDF Statement"
                    >
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => api.downloadAccountStatement(acc.id, 'csv')}
                      className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 text-[11px] font-semibold hover:bg-stone-100 transition-colors flex items-center gap-1"
                      title="Download CSV Statement"
                    >
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cards Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-forest-900 font-mono uppercase tracking-wider">
              Linked Debit & ATM Cards ({cards.length})
            </h3>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero Liability Protection</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className="p-6 rounded-[26px] bg-gradient-to-br from-forest-950 via-forest-900 to-forest-850 text-white shadow-card border border-forest-800/80 flex flex-col justify-between h-56 relative overflow-hidden"
              >
                {/* Metallic shine reflection */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
                      {card.network || 'VISA'} PLATINUM
                    </span>
                    <div className="text-[11px] text-stone-400 mt-0.5">{card.card_type} CARD</div>
                  </div>

                  {/* EMV Chip */}
                  <div className="w-10 h-7 rounded-lg bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-200 border border-amber-300/80 shadow-sm flex items-center justify-center p-0.5">
                    <div className="w-full h-full border border-amber-600/30 rounded flex flex-col justify-between p-0.5">
                      <div className="w-full h-0.5 bg-amber-600/40" />
                      <div className="w-full h-0.5 bg-amber-600/40" />
                    </div>
                  </div>
                </div>

                <div className="font-mono text-base sm:text-lg tracking-widest font-bold my-2 relative z-10">
                  {card.card_number_masked || card.masked_card_number || '•••• •••• •••• 8821'}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-forest-800/80 text-xs relative z-10">
                  <div>
                    <span className="text-[9px] text-stone-400 block uppercase font-mono">Expires</span>
                    <span className="font-mono font-bold text-white">{card.expiry_month}/{card.expiry_year}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCard(card.id, !!card.is_blocked)}
                    disabled={actionLoading === card.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      !card.is_blocked
                        ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                    }`}
                  >
                    {!card.is_blocked ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Lock Card</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>Unlock</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
