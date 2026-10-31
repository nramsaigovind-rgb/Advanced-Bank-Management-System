'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import { api } from '@/services/api';
import {
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Percent,
} from 'lucide-react';

export default function CustomerLoansPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [repayMessage, setRepayMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const accs = await api.getAccounts();
      setAccounts(accs);

      const loansData = await api.getLoans();
      setLoans(loansData);
      if (loansData.length > 0) {
        setSelectedLoan(loansData[0]);
        loadInstallments(loansData[0].id);
      }
    } catch (e) {
      console.error('Error loading loans', e);
    } finally {
      setLoading(false);
    }
  };

  const loadInstallments = async (loanId: number) => {
    try {
      const data = await api.getLoanInstallments(loanId);
      setInstallments(data);
    } catch (e) {
      console.error('Failed to load installments', e);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const handleSelectLoan = (loan: any) => {
    setSelectedLoan(loan);
    loadInstallments(loan.id);
  };

  const handleRepay = async (installmentId: number) => {
    const sourceAcc = accounts[0];
    if (!sourceAcc) {
      setErrorMessage('No source account available to debit payment.');
      return;
    }

    try {
      setPayingId(installmentId);
      setRepayMessage(null);
      setErrorMessage(null);
      await api.repayLoanInstallment(installmentId, sourceAcc.id);
      setRepayMessage('Installment payment settled successfully via Double-Entry Ledger.');
      if (selectedLoan) {
        loadInstallments(selectedLoan.id);
        const loansData = await api.getLoans();
        setLoans(loansData);
        const updated = loansData.find((l) => l.id === selectedLoan.id);
        if (updated) setSelectedLoan(updated);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Repayment failed.');
    } finally {
      setPayingId(null);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amt);
  };

  return (
    <div className="flex-1 flex flex-col bg-cream-100 min-h-screen">
      <TopNav
        actions={
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
            <Percent className="w-3.5 h-3.5 text-emerald-600" />
            <span>Reducing-Balance Engine</span>
          </div>
        }
      />

      <main className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Loans & Amortization Schedules
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            Mathematical EMI calculation, monthly reducing balance formulas, and atomic payment settlement
          </p>
        </div>

        {repayMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{repayMessage}</span>
            </div>
            <button onClick={() => setRepayMessage(null)} className="font-bold">&times;</button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 text-rose-600 font-bold">&times;</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="font-bold">&times;</button>
          </div>
        )}

        {/* Loan Selection Tabs */}
        {loans.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {loans.map((loan) => (
              <button
                key={loan.id}
                onClick={() => handleSelectLoan(loan)}
                className={`px-5 py-3.5 rounded-[22px] border text-left transition-all ${
                  selectedLoan?.id === loan.id
                    ? 'bg-white border-emerald-500 shadow-card'
                    : 'bg-white/60 border-stone-200/80 hover:bg-white text-stone-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-forest-900">{loan.loan_number}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                    {loan.loan_type}
                  </span>
                </div>
                <div className="text-xs text-stone-500 mt-1 font-mono">
                  Principal: {formatCurrency(loan.principal_amount)} &bull; O/S:{' '}
                  <span className="font-bold text-rose-600">{formatCurrency(loan.outstanding_principal || loan.outstanding_balance)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedLoan ? (
          <div className="space-y-6">
            {/* Loan Specs Card */}
            <div className="bg-white rounded-[26px] p-6 sm:p-7 border border-stone-200/80 shadow-soft grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-mono">Sanctioned Principal</span>
                <div className="text-xl font-extrabold font-mono text-forest-900 mt-1">
                  {formatCurrency(selectedLoan.principal_amount)}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-mono">Annual Rate</span>
                <div className="text-xl font-extrabold font-mono text-emerald-700 mt-1">
                  {selectedLoan.interest_rate}% <span className="text-xs font-normal text-stone-400 font-sans">p.a.</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-mono">Tenure & Model</span>
                <div className="text-xl font-extrabold text-forest-900 mt-1">
                  {selectedLoan.term_months} Months
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold font-mono">Reducing Balance</div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-mono">Outstanding Balance</span>
                <div className="text-xl font-extrabold font-mono text-rose-600 mt-1">
                  {formatCurrency(selectedLoan.outstanding_principal || selectedLoan.outstanding_balance)}
                </div>
              </div>
            </div>

            {/* Amortization Schedule Table */}
            <div className="bg-white rounded-[26px] border border-stone-200/80 shadow-soft overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-forest-900">Reducing-Balance EMI Amortization Schedule</h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Monthly breakdown of Principal vs. Interest component and diminishing loan balance
                  </p>
                </div>
                <div className="text-xs text-stone-600 font-mono bg-cream-100 px-3 py-1.5 rounded-xl border border-stone-200">
                  Installments: {installments.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-cream-100/75 border-b border-stone-100 text-stone-500 font-semibold uppercase tracking-wider font-mono text-[10px]">
                    <tr>
                      <th className="py-3.5 px-6">#</th>
                      <th className="py-3.5 px-6">Due Date</th>
                      <th className="py-3.5 px-6 text-right">Principal</th>
                      <th className="py-3.5 px-6 text-right">Interest</th>
                      <th className="py-3.5 px-6 text-right">Total EMI</th>
                      <th className="py-3.5 px-6 text-right">Remaining Principal</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                      <th className="py-3.5 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {installments.map((inst) => {
                      const isPaid = inst.status === 'PAID';
                      return (
                        <tr
                          key={inst.id}
                          className={`hover:bg-emerald-50/20 transition-colors ${
                            isPaid ? 'bg-emerald-50/15' : ''
                          }`}
                        >
                          <td className="py-3.5 px-6 font-bold text-forest-900 font-mono">
                            #{inst.installment_number}
                          </td>
                          <td className="py-3.5 px-6 font-medium text-stone-600 font-mono">
                            {inst.due_date || '2026-11-30'}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono font-medium text-stone-700">
                            {formatCurrency(inst.principal_component)}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono font-medium text-amber-700">
                            {formatCurrency(inst.interest_component)}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono font-bold text-forest-900 text-sm">
                            {formatCurrency(inst.total_amount)}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono text-stone-500">
                            {formatCurrency(inst.remaining_principal || 0)}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                PAID
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                PENDING
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            {!isPaid ? (
                              <button
                                type="button"
                                onClick={() => handleRepay(inst.id)}
                                disabled={payingId === inst.id}
                                className="px-3.5 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-white shadow-sm transition-all disabled:opacity-50"
                              >
                                {payingId === inst.id ? 'Settling...' : 'Pay EMI'}
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium text-stone-400">Settled</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[26px] p-12 text-center border border-stone-200/80 shadow-soft">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-forest-900">No Active Loans</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              You do not have any active loans. Loan applications can be requested at your branch or reviewed by officers.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
