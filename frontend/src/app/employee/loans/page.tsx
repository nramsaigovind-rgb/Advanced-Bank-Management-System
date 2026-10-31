'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import { api } from '@/services/api';
import {
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  User,
  Percent,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function EmployeeLoansPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply form state
  const [customerId, setCustomerId] = useState('1');
  const [loanType, setLoanType] = useState('PERSONAL');
  const [amount, setAmount] = useState('50000');
  const [rate, setRate] = useState('11.5');
  const [term, setTerm] = useState('12');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getLoans();
      setLoans(data);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to load loan portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Compute estimated monthly EMI
  const p = parseFloat(amount) || 0;
  const r = (parseFloat(rate) || 0) / 12 / 100;
  const n = parseInt(term, 10) || 1;
  const estimatedEmi =
    r > 0 ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : p / n;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    setErrorMsg(null);
    try {
      await api.applyLoan({
        customer_id: Number(customerId),
        branch_id: 1,
        loan_type: loanType,
        principal_amount: parseFloat(amount),
        interest_rate: parseFloat(rate),
        term_months: parseInt(term, 10),
      });
      setMsg(`Loan application created successfully and queued for Manager approval.`);
      load();
    } catch (err: any) {
      setErrorMsg(err.message || 'Loan origination failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8F9F5]">
      <TopNav
        title="Credit Origination & Loans"
        subtitle="Originate credit applications & view branch loan portfolio"
        actions={
          <button
            onClick={load}
            className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 shadow-soft transition-all"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
          </button>
        }
      />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Ambient Hero Banner */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-stone-900 via-[#06231C] to-emerald-950 text-white p-8 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 max-w-xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Credit Desk &bull; Amortized Fixed & Reducing Schedule
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Originate & Sanction Credit Products.
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Process customer loan applications backed by reducing-balance amortization schedules,
              risk profile underwriting, and branch manager sanctions.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[120px]">
              <span className="block text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Total Loans</span>
              <span className="text-2xl font-black text-white">{loans.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[120px]">
              <span className="block text-[10px] text-teal-300 font-bold uppercase tracking-wider">Active Portfolio</span>
              <span className="text-xl font-black text-white">
                ₹{loans.reduce((acc, l) => acc + (l.status === 'ACTIVE' ? Number(l.principal_amount) : 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {msg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-soft">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{msg}</span>
            </div>
            <button onClick={() => setMsg(null)} className="text-emerald-700 hover:text-emerald-900">&times;</button>
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

        {/* 2-Column Grid: Portfolio Table & Application Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolio Table */}
          <div className="lg:col-span-2 bg-white rounded-[24px] border border-stone-200/80 shadow-soft overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">Branch Credit Portfolio</h3>
                <p className="text-xs text-stone-500">Live credit facilities, sanctions, and amortizations</p>
              </div>
              <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {loans.length} Facilities
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFBF9] border-b border-stone-100 text-stone-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-6">Loan Ref</th>
                    <th className="py-3.5 px-6">Customer</th>
                    <th className="py-3.5 px-6 text-right">Principal</th>
                    <th className="py-3.5 px-6 text-right">Rate & Tenure</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {loans.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-400">
                        No loan facilities found. Originate one using the form.
                      </td>
                    </tr>
                  ) : (
                    loans.map((l) => (
                      <tr key={l.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-mono font-bold text-stone-900 block">{l.loan_number}</span>
                          <span className="text-[10px] text-stone-400 font-semibold">{l.loan_type}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                              C{l.customer_id}
                            </div>
                            <div>
                              <span className="font-bold text-stone-800 block">Customer #{l.customer_id}</span>
                              <span className="text-[10px] text-stone-400">Branch #{l.branch_id || 1}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-emerald-700 text-sm">
                          ₹{Number(l.principal_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-stone-600">
                          <div>{l.interest_rate}% p.a.</div>
                          <div className="text-[10px] text-stone-400">{l.term_months} Months</div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                              l.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : l.status === 'APPROVED'
                                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                : l.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-stone-100 text-stone-700 border border-stone-200'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Loan Application Form */}
          <div className="bg-white rounded-[24px] p-6 border border-stone-200/80 shadow-soft h-fit">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Originate Loan</h3>
                <p className="text-[11px] text-stone-500">Initiate new credit facility</p>
              </div>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              {/* Customer ID */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Customer ID
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="number"
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="pl-12 pr-3 py-2.5 w-full rounded-2xl border border-stone-200 bg-[#FDFEFC] text-stone-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Loan Type */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Loan Product Type
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                    className="pl-12 pr-3 py-2.5 w-full rounded-2xl border border-stone-200 bg-[#FDFEFC] text-stone-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="PERSONAL">Personal Unsecured Loan</option>
                    <option value="HOME">Residential Home Loan</option>
                    <option value="VEHICLE">Automobile Vehicle Loan</option>
                    <option value="BUSINESS">Commercial Working Capital</option>
                  </select>
                </div>
              </div>

              {/* Principal Amount */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Principal Amount (₹)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-12 pr-3 py-2.5 w-full rounded-2xl border border-stone-200 bg-[#FDFEFC] text-stone-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Rate & Tenure */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Rate (% p.a.)
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 w-6 h-6 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center">
                      <Percent className="w-3 h-3" />
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="pl-10 pr-2.5 py-2.5 w-full rounded-2xl border border-stone-200 bg-[#FDFEFC] text-stone-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Tenure (Months)
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 w-6 h-6 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center">
                      <Calendar className="w-3 h-3" />
                    </div>
                    <input
                      type="number"
                      required
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      className="pl-10 pr-2.5 py-2.5 w-full rounded-2xl border border-stone-200 bg-[#FDFEFC] text-stone-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Live EMI Preview Box */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-950">Estimated Monthly EMI</span>
                  <span className="font-mono font-extrabold text-emerald-800 text-sm">
                    ₹{Math.round(estimatedEmi).toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  Amortized on reducing balance formula across {term} installments
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 px-4 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <span>Queuing Application...</span>
                ) : (
                  <>
                    <span>Submit for Manager Sanction</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
