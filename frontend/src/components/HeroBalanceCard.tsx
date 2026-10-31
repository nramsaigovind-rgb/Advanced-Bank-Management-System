'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, ShieldCheck, CreditCard, RefreshCw, Sparkles } from 'lucide-react';

interface HeroBalanceCardProps {
  accountNumber: string;
  accountType: string;
  balance: number;
  currency?: string;
  status?: string;
  onTransferClick?: () => void;
  onDepositClick?: () => void;
  onWithdrawClick?: () => void;
  onRefresh?: () => void;
}

export default function HeroBalanceCard({
  accountNumber,
  accountType,
  balance,
  currency = 'INR',
  status = 'ACTIVE',
  onTransferClick,
  onDepositClick,
  onWithdrawClick,
  onRefresh,
}: HeroBalanceCardProps) {
  const [showAccountNum, setShowAccountNum] = useState(false);

  const maskedAccount = showAccountNum
    ? accountNumber
    : `•••• •••• ${accountNumber.slice(-4) || '0000'}`;

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(balance);

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-forest-950 via-forest-900 to-forest-850 p-7 sm:p-8 text-white shadow-card border border-forest-800/80">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Decorative leaf / watermark contour */}
      <div className="absolute -right-6 -bottom-6 w-48 h-48 rounded-full border border-white/5 pointer-events-none" />
      <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
        {/* Top bar: Account type & chip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
              {accountType} Account
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{status}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-200 border border-white/10 transition-colors"
                title="Refresh Balance"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Realistic EMV Metallic Chip */}
            <div className="w-11 h-8 rounded-lg bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-200 border border-amber-300/80 shadow-sm flex items-center justify-center p-1">
              <div className="w-full h-full border border-amber-600/40 rounded flex flex-col justify-between p-0.5">
                <div className="w-full h-0.5 bg-amber-600/40" />
                <div className="w-full h-0.5 bg-amber-600/40" />
              </div>
            </div>
          </div>
        </div>

        {/* Middle: Available Balance */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-200/60 mb-1 font-mono">
            Total Available Balance
          </div>
          <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
            {formattedBalance}
          </div>
          <div className="flex items-center gap-2 mt-2.5 text-xs text-stone-400">
            <span className="text-emerald-200/50">A/C:</span>
            <span className="font-mono text-stone-200 font-semibold tracking-wider">{maskedAccount}</span>
            <button
              type="button"
              onClick={() => setShowAccountNum(!showAccountNum)}
              className="text-stone-400 hover:text-emerald-300 transition-colors ml-1 p-0.5"
              title={showAccountNum ? 'Hide Account Number' : 'Show Account Number'}
            >
              {showAccountNum ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          {onTransferClick && (
            <button
              type="button"
              onClick={onTransferClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-forest-950 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              <span>Send Money</span>
            </button>
          )}

          {onDepositClick && (
            <button
              type="button"
              onClick={onDepositClick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-[0.98]"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              <span>Deposit Funds</span>
            </button>
          )}

          {onWithdrawClick && (
            <button
              type="button"
              onClick={onWithdrawClick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-[0.98]"
            >
              <CreditCard className="w-4 h-4 text-amber-300" />
              <span>Withdraw</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
