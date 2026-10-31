'use client';

import React, { useState } from 'react';
import { api } from '@/services/api';
import {
  Send,
  X,
  CreditCard,
  User,
  Users,
  MessageSquare,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  IndianRupee,
  Printer,
} from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAccounts: Array<{ id: number; account_number: string; balance: number; account_type: string }>;
  onSuccess: () => void;
}

export default function TransferModal({
  isOpen,
  onClose,
  sourceAccounts,
  onSuccess,
}: TransferModalProps) {
  const [sourceAccountId, setSourceAccountId] = useState<number>(sourceAccounts[0]?.id || 0);
  const [destAccountNumber, setDestAccountNumber] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);

  if (!isOpen) return null;

  const selectedSource = sourceAccounts.find((a) => a.id === sourceAccountId) || sourceAccounts[0];
  const numAmount = parseFloat(amount);
  const isInsufficient = !isNaN(numAmount) && selectedSource && numAmount > selectedSource.balance;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid transfer amount greater than 0.');
      return;
    }

    if (selectedSource && numAmount > selectedSource.balance) {
      setError(`Insufficient balance. Current balance is ₹${selectedSource.balance.toLocaleString('en-IN')}`);
      return;
    }

    const trimmedDest = destAccountNumber.trim();
    if (!trimmedDest) {
      setError('Please provide a destination account number or account ID.');
      return;
    }

    setLoading(true);
    try {
      const parsedId = /^\d+$/.test(trimmedDest) && parseInt(trimmedDest, 10) < 1000 ? parseInt(trimmedDest, 10) : undefined;
      const res = await api.transferFunds({
        source_account_id: selectedSource?.id || 5,
        destination_account_number: trimmedDest,
        destination_account_id: parsedId,
        amount: numAmount,
        description: remarks.trim() || 'Funds transfer via web banking',
        remarks: remarks.trim() || 'Funds transfer via web banking',
      });
      setReceipt(res);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Transfer failed. Transaction rolled back atomically.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setReceipt(null);
    setAmount('');
    setRemarks('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-forest-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[28px] max-w-lg w-full p-8 shadow-2xl border border-stone-200/80 animate-in fade-in zoom-in-95 duration-150 relative overflow-hidden">
        {receipt ? (
          /* Receipt Screen */
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-forest-900">Transfer Successful</h3>
              <p className="text-xs text-stone-500 mt-1 font-mono">
                Ref: {receipt.reference_no || receipt.reference_number || 'TXN-SUCCESS'}
              </p>
            </div>

            <div className="bg-cream-100 rounded-2xl p-5 border border-stone-200/80 text-left text-xs space-y-2.5">
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Transferred Amount:</span>
                <span className="font-bold font-mono text-emerald-700 text-sm">
                  ₹{parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Source Account:</span>
                <span className="font-mono font-medium text-forest-900">{selectedSource?.account_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Destination Account:</span>
                <span className="font-mono font-medium text-forest-900">
                  {receipt.destination_account_number || destAccountNumber}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-500">ACID Guarantee:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Committed & Ledger Synchronized
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-stone-500" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-700/20"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Transfer Form - matching Image 2 */
          <div>
            {/* Header with Paper Airplane and Close */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-5 mb-5 relative">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-emerald-100">
                  <Send className="w-5 h-5 -rotate-12 translate-x-0.5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-forest-900">Transfer Funds</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Pessimistic row-locked instant settlement</p>
                </div>
              </div>

              {/* Decorative Paper Plane Flight Trail */}
              <div className="absolute right-12 top-1 pointer-events-none opacity-40">
                <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
                  <path
                    d="M5 30C15 10 35 35 48 15"
                    stroke="#10B981"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <polygon points="50,12 45,20 55,18" fill="#10B981" />
                </svg>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {(error || isInsufficient) && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 font-bold">
                  !
                </div>
                <div>
                  <div className="font-bold text-rose-800">
                    {isInsufficient ? 'Insufficient balance' : 'Transfer Alert'}
                  </div>
                  <div className="text-[11px] text-rose-600">
                    {isInsufficient
                      ? `Current balance is ₹${selectedSource?.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : error}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-4">
              {/* Row 1: From Account */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-6 shadow-sm">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5 font-mono">
                    From Account
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200/90 bg-stone-50/70 text-forest-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {sourceAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_number} ({acc.account_type}) &mdash; Balance: ₹{acc.balance.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: To Account */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-6 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5 font-mono">
                    To Account (ID or Number)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="1000202601"
                      value={destAccountNumber}
                      onChange={(e) => setDestAccountNumber(e.target.value)}
                      required
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl border border-stone-200/90 bg-stone-50/70 text-forest-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <Users className="w-4 h-4 text-stone-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>

                  {/* Quick Select Payee Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <span className="text-[10px] text-stone-400 font-medium">Quick Select Payee:</span>
                    <button
                      type="button"
                      onClick={() => setDestAccountNumber('1000202601')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold border transition-all ${
                        destAccountNumber === '1000202601'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                          : 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}
                    >
                      <User className="w-3 h-3 text-emerald-600" />
                      <span>Sarah Connor (1000202601)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestAccountNumber('1000202602')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold border transition-all ${
                        destAccountNumber === '1000202602'
                          ? 'bg-blue-50 border-blue-400 text-blue-800'
                          : 'bg-blue-50/50 hover:bg-blue-50 border-blue-200 text-blue-700'
                      }`}
                    >
                      <User className="w-3 h-3 text-blue-600" />
                      <span>Vikram Singh (1000202602)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestAccountNumber('1000202605')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold border transition-all ${
                        destAccountNumber === '1000202605'
                          ? 'bg-purple-50 border-purple-400 text-purple-800'
                          : 'bg-purple-50/50 hover:bg-purple-50 border-purple-200 text-purple-700'
                      }`}
                    >
                      <User className="w-3 h-3 text-purple-600" />
                      <span>Elena Rostova (1000202605)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1.5 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-stone-400" />
                    <span>Enter any 10-digit account number (e.g. 1000202601) or account ID (e.g. 6).</span>
                  </p>
                </div>
              </div>

              {/* Row 3: Transfer Amount */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-6 shadow-sm font-bold text-sm">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5 font-mono">
                    Transfer Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-stone-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="1,000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className={`w-full pl-8 pr-3.5 py-2.5 rounded-2xl border text-forest-900 text-sm font-mono font-bold focus:outline-none focus:ring-2 transition-all ${
                        isInsufficient
                          ? 'border-rose-300 bg-rose-50/60 focus:ring-rose-400/20'
                          : 'border-stone-200/90 bg-stone-50/70 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Remarks */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-stone-100 border border-stone-200 text-stone-600 flex items-center justify-center flex-shrink-0 mt-6 shadow-sm">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider font-mono">
                      Remarks / Purpose
                    </label>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {remarks.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="rent, dinner, utility bill..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200/90 bg-stone-50/70 text-forest-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Invariant Row Locking Notice */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-[11px] text-emerald-900 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lock className="w-3 h-3" />
                </div>
                <div>
                  <div className="font-semibold text-emerald-950">
                    Protected by <code>SELECT ... FOR UPDATE</code>
                  </div>
                  <div className="text-emerald-800 text-[10px]">
                    Row lock ordered by Account ID ascending to eliminate deadlocks.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white transition-all shadow-md shadow-emerald-700/25 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Acquiring Lock...</span>
                  ) : (
                    <>
                      <span>Authorize Transfer</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
