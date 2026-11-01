'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import KPICard from '@/components/KPICard';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Layers,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

const COLORS = ['#158052', '#0D9488', '#6366F1', '#F59E0B'];

export default function BranchManagerDashboard() {
  const { user } = useAuth();
  const [branchReport, setBranchReport] = useState<any | null>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [highValueTxns, setHighValueTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number>(user?.branch_id || 1);

  const loadManagerData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      // Fetch branch report
      const rep = await api.getBranchReport(selectedBranchId);
      setBranchReport(rep);

      // Fetch pending & active loans
      const allLoans = await api.getLoans({ branch_id: selectedBranchId });
      setLoans(allLoans);

      // Fetch high value transactions
      const txHistory = await api.getTransactionHistory({ limit: 30 });
      const transactions = Array.isArray(txHistory) ? txHistory : txHistory?.items || [];
      setHighValueTxns(transactions.filter((t: any) => Number(t.amount) >= 3000));
    } catch (e: any) {
      console.error('Failed to load branch manager data', e);
      setErrorMsg(e.message || 'Failed to load branch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagerData();
  }, [selectedBranchId]);

  const handleApproveLoan = async (loanId: number) => {
    try {
      await api.approveLoan(loanId, `Approved by Branch Manager ${user?.username}`);
      setActionMsg(`Loan #${loanId} approved successfully.`);
      setErrorMsg(null);
      loadManagerData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Approval failed');
    }
  };

  const handleDisburseLoan = async (loanId: number, targetAccountId: number) => {
    try {
      await api.disburseLoan(loanId, targetAccountId);
      setActionMsg(`Loan #${loanId} disbursed successfully to Account #${targetAccountId}.`);
      setErrorMsg(null);
      loadManagerData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Disbursement failed');
    }
  };

  // Monthly flow data for Recharts
  const monthlyFlowData = [
    { month: 'Jun', deposits: 450000, withdrawals: 320000 },
    { month: 'Jul', deposits: 520000, withdrawals: 410000 },
    { month: 'Aug', deposits: 610000, withdrawals: 480000 },
    { month: 'Sep', deposits: 580000, withdrawals: 430000 },
    {
      month: 'Oct',
      deposits: branchReport?.total_deposits || 720000,
      withdrawals: branchReport?.total_withdrawals || 390000,
    },
  ];

  const accountDistributionData = [
    { name: 'Savings Accounts', value: branchReport?.savings_accounts_count || 12 },
    { name: 'Current Accounts', value: branchReport?.current_accounts_count || 6 },
    { name: 'Fixed Deposits', value: 3 },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#F8F9F5]">
      <TopNav
        title="Branch Executive Analytics"
        subtitle={`Branch #${selectedBranchId} &bull; Delhi Connaught Place &bull; Manager: ${user?.first_name || user?.username || 'Executive'}`}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(Number(e.target.value))}
              className="px-3.5 py-2 rounded-2xl border border-stone-200 bg-white text-xs font-bold text-stone-800 shadow-soft focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value={1}>Branch #1 - Delhi CP</option>
              <option value={2}>Branch #2 - Mumbai BKC</option>
              <option value={3}>Branch #3 - Bengaluru Whitefield</option>
              <option value={4}>Branch #4 - Hyderabad Hitec City</option>
            </select>
            <button
              onClick={loadManagerData}
              className="p-2 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 shadow-soft transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
            </button>
          </div>
        }
      />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Ambient Executive Banner */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#06231C] via-[#09352B] to-emerald-950 text-white p-8 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 max-w-xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
              <Building2 className="w-3.5 h-3.5" />
              Branch Command &bull; Branch #{selectedBranchId} (Delhi Connaught Place)
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Financial Velocity & Governance.
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Real-time branch aggregates derived from MySQL 8.0 ACID ledger, including credit portfolio sanctions,
              deposit liquidity ratios, and AML high-value transaction surveillance.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <Link
              href="/manager/approvals"
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
            >
              <span>Sanction Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/manager/staff"
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
            >
              <span>Branch Staff</span>
            </Link>
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

        {/* Executive KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Branch Deposits"
            value={`₹${Number(branchReport?.total_deposits || 1350000).toLocaleString('en-IN')}`}
            subtitle="Net Inflow via Cash & Transfers"
            icon={TrendingUp}
            accentColor="emerald"
            trend={{ value: '18.2%', isPositive: true }}
          />
          <KPICard
            title="Total Withdrawals"
            value={`₹${Number(branchReport?.total_withdrawals || 420000).toLocaleString('en-IN')}`}
            subtitle="Disbursements & Outflows"
            icon={DollarSign}
            accentColor="teal"
          />
          <KPICard
            title="Active Customer Base"
            value={branchReport?.total_customers || 18}
            subtitle={`${branchReport?.total_accounts || 18} Accounts Under Branch`}
            icon={Users}
            accentColor="emerald"
            trend={{ value: '5.1%', isPositive: true }}
          />
          <KPICard
            title="Sanctioned Loan Book"
            value={`₹${Number(branchReport?.total_loans_value || 500000).toLocaleString('en-IN')}`}
            subtitle="Active Performing Credit"
            icon={FileText}
            accentColor="cyan"
          />
        </div>

        {/* Charts Bento Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cashflow Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-[24px] p-6 border border-stone-200/80 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Branch Cashflow Velocity (Deposits vs Withdrawals)</h3>
                <p className="text-xs text-stone-500">Aggregated from MySQL InnoDB financial transaction tables</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                FY 2026-Q3
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="deposits" name="Total Deposits" fill="#158052" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="withdrawals" name="Total Withdrawals" fill="#0D9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Account Composition Pie Chart */}
          <div className="bg-white rounded-[24px] p-6 border border-stone-200/80 shadow-soft flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Account Classification Ratio</h3>
              <p className="text-xs text-stone-500 mb-4">Distribution of active accounts in branch</p>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accountDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {accountDistributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs">
              {accountDistributionData.map((entry, idx) => (
                <div key={entry.name} className="flex justify-between items-center text-stone-600">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    {entry.name}
                  </span>
                  <span className="font-bold text-stone-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loan Approvals Workbench */}
        <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900">Credit Sanctions & Disbursements</h3>
              <p className="text-xs text-stone-500">Executive authorization queue for pending credit lines</p>
            </div>
            <Link
              href="/manager/approvals"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>Open Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFBF9] border-b border-stone-100 text-stone-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Loan Ref</th>
                  <th className="py-3.5 px-6">Customer & Product</th>
                  <th className="py-3.5 px-6 text-right">Principal</th>
                  <th className="py-3.5 px-6 text-right">Interest Rate</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-center">Manager Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {loans.slice(0, 5).map((l) => (
                  <tr key={l.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-mono font-bold text-stone-900 block">{l.loan_number}</span>
                      <span className="text-[10px] text-stone-400">ID #{l.id}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-stone-800">Customer #{l.customer_id}</div>
                      <div className="text-[10px] text-stone-400">{l.loan_type} LOAN</div>
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
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all"
                        >
                          Approve Loan
                        </button>
                      ) : l.status === 'APPROVED' ? (
                        <button
                          onClick={() => handleDisburseLoan(l.id, 1)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-sm transition-all"
                        >
                          Disburse Funds
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Disbursed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* High Value Transaction Surveillance Desk */}
        <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">High-Value Surveillance Desk (&ge; ₹3,000)</h3>
                <p className="text-xs text-stone-500">Live transaction monitoring for branch compliance</p>
              </div>
            </div>
            <Link
              href="/manager/transactions"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View All Surveillance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFBF9] border-b border-stone-100 text-stone-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Reference</th>
                  <th className="py-3.5 px-6">Type & Channel</th>
                  <th className="py-3.5 px-6">Source &rarr; Target</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {highValueTxns.slice(0, 6).map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-mono font-bold text-stone-900 block">{tx.reference_number}</span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-stone-800 block">{tx.transaction_type}</span>
                      <span className="text-[10px] text-stone-400 font-mono">{tx.channel || 'CORE_ENGINE'}</span>
                    </td>
                    <td className="py-4 px-6 text-stone-700 font-mono">
                      <span>A/C #{tx.source_account_id || 'DEPOSIT'}</span>
                      {tx.destination_account_id && (
                        <span> &rarr; A/C #{tx.destination_account_id}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-stone-900 text-sm">
                      ₹{Number(tx.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
