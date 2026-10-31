'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import TransferModal from '@/components/TransferModal';
import { api } from '@/services/api';
import {
  Send,
  Calendar,
  Users,
  UserCheck,
  Plus,
  MoreVertical,
  Shield,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  CreditCard,
  Building,
  User,
  Sparkles,
} from 'lucide-react';

export default function CustomerTransferPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddBenOpen, setIsAddBenOpen] = useState(false);

  // Quick Inline Transfer Form State (Image 1 Right Column)
  const [selectedSourceId, setSelectedSourceId] = useState<number>(0);
  const [destAccount, setDestAccount] = useState('1000202601');
  const [amount, setAmount] = useState('1000');
  const [remarks, setRemarks] = useState('rent');
  const [transferLoading, setTransferLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineSuccess, setInlineSuccess] = useState<any | null>(null);

  // Add Beneficiary form state
  const [benName, setBenName] = useState('');
  const [benAccNum, setBenAccNum] = useState('');
  const [benBank, setBenBank] = useState('ABMS Bank Downtown');
  const [benIfsc, setBenIfsc] = useState('ABMS0001001');
  const [benLimit, setBenLimit] = useState('50000');
  const [benSuccess, setBenSuccess] = useState(false);
  const [benError, setBenError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const accs = await api.getAccounts();
      setAccounts(accs);
      if (accs.length > 0 && selectedSourceId === 0) {
        setSelectedSourceId(accs[0].id);
      }
      try {
        const bens = await api.getBeneficiaries();
        setBeneficiaries(bens);
      } catch (e) {
        console.warn('Beneficiaries error', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedSource = accounts.find((a) => a.id === selectedSourceId) || accounts[0];
  const numAmount = parseFloat(amount);
  const isInsufficient = !isNaN(numAmount) && selectedSource && numAmount > selectedSource.balance;

  const handleInlineTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    setInlineSuccess(null);

    if (isNaN(numAmount) || numAmount <= 0) {
      setInlineError('Please enter a valid transfer amount greater than 0.');
      return;
    }

    if (selectedSource && numAmount > selectedSource.balance) {
      setInlineError(`Insufficient balance. Current balance is ₹${selectedSource.balance.toLocaleString('en-IN')}`);
      return;
    }

    const trimmedDest = destAccount.trim();
    if (!trimmedDest) {
      setInlineError('Please provide a destination account number or ID.');
      return;
    }

    setTransferLoading(true);
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
      setInlineSuccess(res);
      loadData();
    } catch (err: any) {
      setInlineError(err.message || 'Transfer failed. Transaction rolled back atomically.');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setBenError(null);
    setBenSuccess(false);

    try {
      await api.addBeneficiary({
        beneficiary_name: benName,
        account_number: benAccNum,
        bank_name: benBank,
        ifsc_code: benIfsc,
        transfer_limit: parseFloat(benLimit) || 50000,
      });
      setBenSuccess(true);
      setBenName('');
      setBenAccNum('');
      setIsAddBenOpen(false);
      loadData();
    } catch (err: any) {
      setBenError(err.message || 'Failed to add beneficiary.');
    }
  };

  // Default demo beneficiaries if list is empty
  const displayBeneficiaries =
    beneficiaries.length > 0
      ? beneficiaries
      : [
          {
            id: 1,
            beneficiary_name: 'Sarah Connor',
            account_number: '1000202601',
            bank_name: 'ABMS Bank Downtown',
            initials: 'SC',
            color: 'emerald',
          },
          {
            id: 2,
            beneficiary_name: 'Vikram Singh',
            account_number: '1000202602',
            bank_name: 'ABMS Bank Tech Corridor',
            initials: 'VS',
            color: 'blue',
          },
          {
            id: 3,
            beneficiary_name: 'Elena Rostova',
            account_number: '1000202605',
            bank_name: 'ABMS Bank MG Road',
            initials: 'ER',
            color: 'purple',
          },
        ];

  return (
    <div className="flex-1 flex flex-col bg-cream-100 min-h-screen">
      <TopNav />

      <main className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Breadcrumb matching Image 1 */}
        <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
          <Send className="w-3.5 h-3.5 text-stone-400 rotate-45" />
          <span>Transfer & Pay</span>
        </div>

        {/* Hero Section Banner matching Image 1 */}
        <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-stone-200/80 shadow-soft relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Subtle warm lighting gradient backdrop */}
          <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-emerald-50/70 via-cream-50/40 to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              Transfer & Beneficiaries
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
              Send money instantly to your saved beneficiaries or any bank account.
            </p>
          </div>

          {/* Right Banner Card with plant ambient styling */}
          <div className="relative z-10 p-4 sm:p-5 rounded-2xl bg-cream-50/80 border border-stone-200/70 flex items-center gap-4">
            <div>
              <div className="text-sm font-bold text-forest-900">
                Simple Transfers.
              </div>
              <div className="text-sm font-bold text-emerald-700">
                Stronger Connections.
              </div>
              <div className="w-10 h-0.5 bg-emerald-600 rounded-full mt-1.5" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/60 flex items-center justify-center text-emerald-700 text-xl font-serif flex-shrink-0">
              🌿
            </div>
          </div>
        </div>

        {/* 3 Top Action Cards matching Image 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Instant Transfer */}
          <button
            type="button"
            onClick={() => setIsTransferOpen(true)}
            className="p-4 rounded-2xl bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200/80 transition-all text-left flex items-center justify-between group shadow-sm hover:shadow"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Send className="w-5 h-5 -rotate-12 translate-x-0.5 text-emerald-700" />
              </div>
              <div>
                <div className="text-xs font-bold text-forest-900">Instant Transfer</div>
                <div className="text-[11px] text-stone-500">To bank or UPI</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Scheduled Transfer */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 transition-all text-left flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Calendar className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <div className="text-xs font-bold text-forest-900">Scheduled Transfer</div>
                <div className="text-[11px] text-stone-500">One-time or recurring</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-700" />
          </div>

          {/* Manage Beneficiaries */}
          <button
            type="button"
            onClick={() => setIsAddBenOpen(true)}
            className="p-4 rounded-2xl bg-purple-50/60 hover:bg-purple-50 border border-purple-200/80 transition-all text-left flex items-center justify-between group shadow-sm hover:shadow"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Users className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <div className="text-xs font-bold text-forest-900">Manage Beneficiaries</div>
                <div className="text-[11px] text-stone-500">Add, edit or remove</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-700 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 2-Column Main Section matching Image 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Beneficiaries + Security Guarantee (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-[24px] p-6 border border-stone-200/80 shadow-soft">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-forest-900">
                      Your Beneficiaries ({displayBeneficiaries.length})
                    </h3>
                    <p className="text-xs text-stone-500">Verified and trusted payees for quick transfers</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddBenOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-forest-900 hover:bg-forest-800 text-white shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Beneficiary</span>
                </button>
              </div>

              {/* Beneficiary List */}
              <div className="space-y-3">
                {displayBeneficiaries.map((b, idx) => {
                  const initials =
                    b.initials ||
                    b.beneficiary_name
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) ||
                    'PA';

                  const badgeColor =
                    idx % 3 === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : idx % 3 === 1
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800';

                  return (
                    <div
                      key={b.id || b.account_number}
                      className="p-3.5 sm:p-4 rounded-2xl border border-stone-200/70 bg-cream-50/50 hover:bg-cream-50 hover:border-emerald-300 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl ${badgeColor} font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-forest-900 truncate">
                            {b.beneficiary_name}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono truncate">
                            A/C: {b.account_number} &bull; {b.bank_name || 'ABMS Bank'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          Verified
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDestAccount(b.account_number);
                            setIsTransferOpen(true);
                          }}
                          title="Transfer"
                          className="p-1 rounded-lg text-stone-400 hover:text-forest-900 hover:bg-white"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Security Guarantee Card matching Image 1 */}
            <div className="p-5 rounded-[24px] bg-white border border-stone-200/80 shadow-soft flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="text-xs font-bold text-forest-900">
                  Secure Transfers, Always
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Every transfer is protected with InnoDB row-level locks with ACID guarantees to ensure zero race conditions and zero deadlocks.
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-cream-100 flex items-center justify-center text-xl flex-shrink-0">
                🛡️
              </div>
            </div>
          </div>

          {/* Right Column: Send Money Card matching Image 1 (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[24px] p-6 border border-stone-200/80 shadow-soft space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-forest-900">Send Money</h3>
                  <p className="text-xs text-stone-500">Transfer funds securely in just a few seconds.</p>
                </div>
              </div>

              {/* Success Notification */}
              {inlineSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <div className="font-bold">Transfer Committed Successfully!</div>
                    <div className="text-[11px] font-mono text-emerald-700">
                      Ref: {inlineSuccess.reference_no}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Notification */}
              {(inlineError || isInsufficient) && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <div>
                    <div className="font-bold">
                      {isInsufficient ? 'Insufficient balance' : 'Transfer Alert'}
                    </div>
                    <div className="text-[11px]">
                      {isInsufficient
                        ? `Current balance is ₹${selectedSource?.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : inlineError}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleInlineTransfer} className="space-y-3.5">
                {/* From Account */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1 font-mono">
                    From Account
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSourceId}
                      onChange={(e) => setSelectedSourceId(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-forest-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_number} ({acc.account_type}) &mdash; Balance: ₹{acc.balance.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedSource && (
                    <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
                      <span>Available Balance:</span>
                      <span className="font-bold font-mono text-emerald-700">
                        ₹{selectedSource.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                {/* To Account */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1 font-mono">
                    To Account (ID or Number)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="1000202601"
                      value={destAccount}
                      onChange={(e) => setDestAccount(e.target.value)}
                      required
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-forest-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <Users className="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>

                  {/* Quick Select Payee Pills */}
                  <div className="flex flex-wrap items-center gap-1 mt-2">
                    <span className="text-[10px] text-stone-400 font-medium">Quick Select Payee:</span>
                    <button
                      type="button"
                      onClick={() => setDestAccount('1000202601')}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-medium"
                    >
                      <User className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Sarah Connor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestAccount('1000202602')}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[10px] font-medium"
                    >
                      <User className="w-2.5 h-2.5 text-blue-600" />
                      <span>Vikram Singh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestAccount('1000202605')}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[10px] font-medium"
                    >
                      <User className="w-2.5 h-2.5 text-purple-600" />
                      <span>Elena Rostova</span>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1 font-mono">
                    Amount (₹)
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
                      className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-forest-900 text-sm font-mono font-bold focus:outline-none focus:ring-2 ${
                        isInsufficient
                          ? 'border-rose-300 bg-rose-50/60 focus:ring-rose-400/20'
                          : 'border-stone-200 bg-stone-50/70 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1 font-mono">
                    Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="rent, utilities..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-forest-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {transferLoading ? (
                    <span>Executing ACID Row Lock...</span>
                  ) : (
                    <>
                      <span>Authorize Transfer</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Modal for popup transfer */}
        <TransferModal
          isOpen={isTransferOpen}
          onClose={() => setIsTransferOpen(false)}
          sourceAccounts={accounts}
          onSuccess={loadData}
        />

        {/* Modal for adding beneficiary */}
        {isAddBenOpen && (
          <div className="fixed inset-0 bg-forest-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-stone-200/80 animate-in fade-in zoom-in-95">
              <h3 className="text-base font-bold text-forest-900 mb-1">
                Add New Beneficiary
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                Register a verified destination bank account for fast payments.
              </p>

              {benError && (
                <div className="mb-3 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">
                  {benError}
                </div>
              )}

              <form onSubmit={handleAddBeneficiary} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                    Beneficiary Name
                  </label>
                  <input
                    type="text"
                    required
                    value={benName}
                    onChange={(e) => setBenName(e.target.value)}
                    placeholder="e.g. David Miller"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={benAccNum}
                    onChange={(e) => setBenAccNum(e.target.value)}
                    placeholder="1000202606"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={benBank}
                      onChange={(e) => setBenBank(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={benIfsc}
                      onChange={(e) => setBenIfsc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase font-mono mb-1">
                    Daily Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={benLimit}
                    onChange={(e) => setBenLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddBenOpen(false)}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-bold"
                  >
                    Save Payee
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
