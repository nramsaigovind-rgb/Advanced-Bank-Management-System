'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '@/components/TopNav';
import { api } from '@/services/api';
import { Users, Shield, Building2, RefreshCw, Mail, Phone, CheckCircle2, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function ManagerStaffPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployees(1);
      setEmployees(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#F8F9F5]">
      <TopNav
        title="Branch Personnel & Officers"
        subtitle="Active bank officers, branch managers, and teller staff stationed at Branch #1"
        actions={
          <button
            onClick={load}
            className="p-2 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 shadow-soft transition-colors"
            title="Refresh Personnel"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
          </button>
        }
      />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Link href="/manager" className="hover:text-emerald-700 font-semibold">
            Branch Manager
          </Link>
          <span>/</span>
          <span className="text-stone-900 font-bold">Personnel Directory</span>
        </div>

        {/* Staff Directory Table */}
        <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Stationed Bank Officers</h3>
                <p className="text-xs text-stone-500">Authorized personnel operating at Branch #1 (Delhi Connaught Place)</p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {employees.length} Officers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFBF9] border-b border-stone-100 text-stone-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Officer Code</th>
                  <th className="py-3.5 px-6">Staff Member</th>
                  <th className="py-3.5 px-6">Branch Assignment</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-stone-400">
                      No officers currently returned for Branch #1.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-stone-900">
                        {emp.employee_code}
                        <span className="block text-[10px] text-stone-400 font-normal">Officer ID #{emp.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                            {emp.first_name?.[0] || 'O'}
                          </div>
                          <div>
                            <span className="font-bold text-stone-900 block text-xs">
                              {emp.first_name} {emp.last_name || ''}
                            </span>
                            <span className="text-[10px] text-stone-400">Authorized Bank Teller / KYC Officer</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-stone-600">
                        <div className="font-semibold text-stone-800">Branch #{emp.branch_id || 1}</div>
                        <div className="text-[10px] text-stone-400">Connaught Place Central</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {emp.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
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
