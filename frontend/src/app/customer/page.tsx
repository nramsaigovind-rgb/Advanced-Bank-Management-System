'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import HeroBalanceCard from '@/components/HeroBalanceCard';
import KPICard from '@/components/KPICard';
import TransactionTable, { TransactionItem } from '@/components/TransactionTable';
import TransferModal from '@/components/TransferModal';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  Wallet,
  CreditCard,
  FileText,
  TrendingUp,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowRight,
  Send,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { SpendingDonutChart, BalanceTrendLine } from '@/components/AnalyticsWidgets';
import { formatMaskedCardNumber } from '@/utils/display';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [cardActionLoading, setCardActionLoading] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const accs = await api.getAccounts();
      setAccounts(accs);

      const primary = accs[0];
      if (primary) {
        try {
          const cardsData = await api.getAccountCards(primary.id);
          setCards(cardsData);
        } catch (e) {
          console.warn('Cards fetch error', e);
        }
      }

      const txHistory = await api.getTransactionHistory({ limit: 10 });
      if (txHistory && txHistory.items) {
        setTransactions(txHistory.items);
      }

      try {
        const loansData = await api.getLoans();
        setLoans(loansData);
      } catch (e) {
        console.warn('Loans fetch error', e);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleCard = async (cardId: number, currentlyBlocked: boolean) => {
    try {
      setCardActionLoading(cardId);
      await api.toggleCardBlock(cardId, !currentlyBlocked);
      if (accounts[0]) {
        const cardsData = await api.getAccountCards(accounts[0].id);
        setCards(cardsData);
      }
    } catch (err) {
      console.error('Failed to update card status', err);
    } finally {
      setCardActionLoading(null);
    }
  };

  const primaryAccount = accounts[0] || {
    id: 1,
    account_number: '1000202600',
    account_type: 'SAVINGS',
    balance: 1000.0,
    status: 'ACTIVE',
  };

  const totalBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-cream-100 min-h-screen">
      <TopNav
        actions={
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-white shadow-md shadow-emerald-950/20 transition-all active:scale-[0.98]"
          >
            <Send className="w-3.5 h-3.5 -rotate-12" />
            <span>Instant Transfer</span>
          </button>
        }
      />

      <main className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Welcome header strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-forest-900 tracking-tight">
              Customer Portfolio Overview
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Welcome back, {user?.first_name || user?.username || 'Customer'} &bull; Real-time balances & ACID transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ACID Row Lock Engine Active</span>
            </span>
          </div>
        </div>

        {/* Bento Grid: Hero Card + KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <HeroBalanceCard
              accountNumber={primaryAccount.account_number}
              accountType={primaryAccount.account_type}
              balance={primaryAccount.balance}
              status={primaryAccount.status}
              onTransferClick={() => setIsTransferOpen(true)}
              onRefresh={fetchDashboardData}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <KPICard
              title="Total Portfolio Value"
              value={`₹${totalBalance.toLocaleString('en-IN')}`}
              subtitle={`${accounts.length} Active Bank Accounts`}
              icon={Wallet}
              accentColor="emerald"
              trend={{ value: '8.4%', isPositive: true }}
            />
            <KPICard
              title="Active Bank Cards"
              value={`${cards.length} Cards`}
              subtitle={`${cards.filter((c) => !c.is_blocked).length} Unlocked & Active`}
              icon={CreditCard}
              accentColor="teal"
            />
          </div>
        </div>

        {/* Analytics Widgets: Donut + 30-Day Trajectory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SpendingDonutChart />
          <BalanceTrendLine currentBalance={totalBalance || primaryAccount.balance} />
        </div>

        {/* Middle Section: Cards & Loan Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Management Widget */}
          <div className="bg-white rounded-[24px] p-6 border border-stone-200/80 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-forest-900">Active Bank Cards</h3>
                <p className="text-[11px] text-stone-500">Contactless EMV debit cards</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Encrypted
              </span>
            </div>

            {cards.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 bg-cream-50 rounded-2xl border border-dashed border-stone-200">
                No cards attached to this account.
              </div>
            ) : (
              <div className="space-y-3.5">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="p-5 rounded-[22px] bg-gradient-to-br from-forest-950 via-forest-900 to-forest-850 text-white shadow-md relative overflow-hidden border border-forest-800/80"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400">
                          {card.card_type} &bull; {card.network || 'VISA'}
                        </div>
                        <div className="font-mono text-sm sm:text-base tracking-widest mt-1 font-bold">
                          {formatMaskedCardNumber(card.card_number_masked || card.masked_card_number)}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          !card.is_blocked
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                        }`}
                      >
                        {!card.is_blocked ? 'ACTIVE' : 'BLOCKED'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-forest-800/80 text-xs">
                      <div className="text-stone-400 text-[10px] font-mono">
                        EXP: <span className="text-white font-bold">{card.expiry_month}/{card.expiry_year}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleCard(card.id, !!card.is_blocked)}
                        disabled={cardActionLoading === card.id}
                        className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
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
                            <span>Unlock Card</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Loans & EMI Widget */}
          <div className="lg:col-span-2 bg-white rounded-[24px] p-6 border border-stone-200/80 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-forest-900">Active Loans & Amortization</h3>
                  <p className="text-xs text-stone-500">Fixed rate reducing-balance portfolio</p>
                </div>
                <Link
                  href="/customer/loans"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-mono"
                >
                  <span>View All Loans</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loans.length === 0 ? (
                <div className="p-8 text-center bg-cream-50 rounded-2xl border border-dashed border-stone-200">
                  <FileText className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                  <p className="text-xs text-stone-500 font-medium">No active loans for this customer profile.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {loans.slice(0, 2).map((loan) => (
                    <div
                      key={loan.id}
                      className="p-4 rounded-2xl border border-stone-200/80 bg-cream-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-forest-900">{loan.loan_number}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                            {loan.loan_type}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                            {loan.status}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 mt-1">
                          Principal: ₹{Number(loan.principal_amount).toLocaleString('en-IN')} &bull; Rate:{' '}
                          {loan.annual_interest_rate}% p.a. &bull; Term: {loan.tenure_months} Mo
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <div className="text-[10px] text-stone-400 font-medium uppercase font-mono">
                          Outstanding Balance
                        </div>
                        <div className="font-mono font-bold text-base text-rose-600">
                          ₹{Number(loan.outstanding_principal || loan.outstanding_balance || loan.principal_amount).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-500 text-[11px]">Need additional capital?</span>
              <Link
                href="/customer/loans"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Apply for Instant Loan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section: Transaction Table */}
        <TransactionTable
          transactions={transactions}
          currentAccountId={primaryAccount.id}
          title="Account Transaction Ledger"
        />
      </main>

      {/* Transfer Funds Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        sourceAccounts={accounts}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
}
