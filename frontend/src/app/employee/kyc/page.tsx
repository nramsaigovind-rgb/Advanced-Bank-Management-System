'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import { api } from '@/services/api';
import {
  CheckCircle2,
  XCircle,
  UserCheck,
  Shield,
  FileText,
  Search,
  AlertCircle,
} from 'lucide-react';

export default function EmployeeKycPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load customer KYC data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpdate = async (id: number, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await api.updateKYC(id, { kyc_status: status });
      setMsg(`Customer #${id} KYC updated to ${status}.`);
      setErrorMsg(null);
      load();
    } catch (e: any) {
      setErrorMsg(e.message || 'Update failed');
    }
  };

  const filtered = customers.filter((c) => {
    const full = `${c.first_name} ${c.last_name || ''} ${c.email} ${c.pan_number || ''}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col bg-cream-100 min-h-screen">
      <TopNav
        actions={
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tier-1 Compliance Desk</span>
          </div>
        }
      />

      <main className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Customer KYC Verification Workbench
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            Tier-1 Government identity verification, PAN card compliance, and AML KYC status records
          </p>
        </div>

        {msg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{msg}</span>
            </div>
            <button onClick={() => setMsg(null)} className="font-bold">&times;</button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="font-bold">&times;</button>
          </div>
        )}

        <div className="bg-white rounded-[26px] border border-stone-200/80 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-forest-900">All Registered Customers ({customers.length})</h3>
              <p className="text-xs text-stone-500">Aadhaar UID and PAN card status audit</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-stone-50/70 border border-stone-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-56 text-forest-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100/75 border-b border-stone-100 text-stone-500 font-semibold uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">PAN Identifier</th>
                  <th className="py-3.5 px-6">Aadhaar UID</th>
                  <th className="py-3.5 px-6">Contact Email</th>
                  <th className="py-3.5 px-6 text-center">KYC Status</th>
                  <th className="py-3.5 px-6 text-center">Compliance Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-forest-900">
                      {c.first_name} {c.last_name || ''}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-medium text-stone-700">{c.pan_number || 'N/A'}</td>
                    <td className="py-3.5 px-6 font-mono text-stone-400">
                      {c.aadhaar_number ? `•••• •••• ${c.aadhaar_number.slice(-4)}` : '•••• •••• 9812'}
                    </td>
                    <td className="py-3.5 px-6 text-stone-600">{c.email}</td>
                    <td className="py-3.5 px-6 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          c.kyc_status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : c.kyc_status === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {c.kyc_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {c.kyc_status !== 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdate(c.id, 'VERIFIED')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
                          >
                            Approve
                          </button>
                        )}
                        {c.kyc_status !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdate(c.id, 'REJECTED')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all"
                          >
                            Reject
                          </button>
                        )}
                      </div>
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
