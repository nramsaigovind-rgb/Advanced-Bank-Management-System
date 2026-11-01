'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  FileCheck,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  RefreshCw,
  Building2,
  ShieldCheck,
  User,
  ArrowRight,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

export default function ManagerApprovalsPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'ACTIVE'>('ALL');
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadLoans = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getLoans();
      setLoans(data);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const handleApproveLoan = async (loanId: number) => {
    try {
      await api.approveLoan(loanId, `Approved by Branch Manager ${user?.username}`);
      setActionMsg(`Loan #${loanId} approved successfully.`);
      setErrorMsg(null);
      loadLoans();
    } catch (e: any) {
      setErrorMsg(e.message || 'Approval failed');
    }
  };

  const handleDisburseLoan = async (loanId: number, targetAccountId: number) => {
    try {
      await api.disburseLoan(loanId, targetAccountId);
      setActionMsg(`Loan #${loanId} disbursed successfully to Account #${targetAccountId}.`);
      setErrorMsg(null);
      loadLoans();
    } catch (e: any) {
      setErrorMsg(e.message || 'Disbursement failed');
    }
  };

  const filteredLoans = loans.filter((l) => {
    if (filter === 'ALL') return true;
    return l.status === filter;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#F8F9F5]">
      <TopNav
        title="Credit Approvals & Sanctions"
        subtitle="Review, approve, and disburse branch retail and commercial loan applications"
        actions={
          <button
            onClick={loadLoans}
            className="p-2 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 shadow-soft transition-colors"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
          </button>
        }
      />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Header Breadcrumb & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Link href="/manager" className="hover:text-emerald-700 font-semibold">
              Branch Manager
            </Link>
            <span>/</span>
            <span className="text-stone-900 font-bold">Credit Approvals</span>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-stone-200/80 shadow-soft">
            {(['ALL', 'PENDING', 'APPROVED', 'ACTIVE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === tab
                    ? 'bg-[#06231C] text-emerald-300 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-soft">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{actionMsg}</span>
            </div>
            <button onClick={() => setActionMsg(null)} className="text-emerald-700 hover:text-emerald-900">&times;</button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between shadow-soft">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900">&times;</button>
          </div>
        )}

        {/* Loan Queue Table */}
        <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900">Sanction Queue</h3>
              <p className="text-xs text-stone-500">
                Displaying {filteredLoans.length} loan applications matching status filter: {filter}
              </p>
            </div>
            <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {filteredLoans.length} Loans
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFBF9] border-b border-stone-100 text-stone-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Loan Number</th>
                  <th className="py-3.5 px-6">Customer & Type</th>
                  <th className="py-3.5 px-6 text-right">Principal</th>
                  <th className="py-3.5 px-6 text-right">Tenure & Rate</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400">
                      No loan applications found matching this status filter.
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((l) => (
                    <tr key={l.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-stone-900">
                        {l.loan_number}
                        <span className="block text-[10px] text-stone-400 font-normal">ID #{l.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-stone-800">Customer #{l.customer_id}</div>
                        <div className="text-[10px] text-stone-400 font-semibold">{l.loan_type} FACILITY</div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-emerald-700 text-sm">
                        ₹{Number(l.principal_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-stone-600">
                        <div>{l.annual_interest_rate}% p.a.</div>
                        <div className="text-[10px] text-stone-400">{l.tenure_months} Months</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                            l.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : l.status === 'APPROVED'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {l.status === 'PENDING' ? (
                          <button
                            onClick={() => handleApproveLoan(l.id)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all"
                          >
                            Approve Loan
                          </button>
                        ) : l.status === 'APPROVED' ? (
                          <button
                            onClick={() => handleDisburseLoan(l.id, 1)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-sm transition-all"
                          >
                            Disburse Funds
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active & Disbursed
                          </span>
                        )}
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
