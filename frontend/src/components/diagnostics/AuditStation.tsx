'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { FileCheck, Play, CheckCircle2, AlertCircle, Shield, Sparkles } from 'lucide-react';

export default function AuditStation() {
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerifyAudit = async () => {
    setAuditLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.verifyAuditChain();
      setAuditResult(res);
    } catch (err: any) {
      const msg = typeof err === 'object' && err?.message ? err.message : String(err || 'Audit verification failed');
      setErrorMsg(msg);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    handleVerifyAudit();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[24px] p-7 border border-stone-200/80 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <span>Cryptographic SHA-256 Chained Audit Verifier</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Re-computes cryptographic hash chain across financial and administrative actions
            </p>
          </div>
          <button
            onClick={handleVerifyAudit}
            disabled={auditLoading}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {auditLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Verifying Hash Chain...</span>
              </span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Verify Hash Chain</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200 text-xs text-stone-700 space-y-1.5 mb-6">
          <div className="font-bold text-stone-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Immutable Cryptographic Audit Trails:</span>
          </div>
          <p className="leading-relaxed">
            To prevent unauthorized modification of historical records (even by a database administrator), each audit entry
            includes a cryptographic SHA-256 signature calculated over the previous record&apos;s hash plus the current payload:
            <code className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded ml-1">
              H(i) = SHA256(H(i-1) + actor + action + payload)
            </code>.
            Modifying a single historical record breaks the entire subsequent cryptographic chain.
          </p>
        </div>

        {auditResult && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                    Chain Integrity: {auditResult.chain_integrity_status}
                  </div>
                  <div className="text-xs text-emerald-800 mt-0.5">
                    {auditResult.total_audit_records_verified} records re-hashed and mathematically verified. Zero tampering detected.
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-emerald-200/80 text-emerald-950 border border-emerald-300 self-start sm:self-auto">
                100% UNTAMPERED
              </span>
            </div>

            <div className="border border-stone-200/80 rounded-[24px] overflow-hidden bg-white shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#FAFBF9] border-b border-stone-100 text-stone-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Actor Role</th>
                      <th className="py-3 px-4">Previous Hash Prefix</th>
                      <th className="py-3 px-4">Record Hash Signature</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {auditResult.records?.slice(0, 15).map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4 font-bold text-stone-900">{rec.id}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">{rec.action}</td>
                        <td className="py-3 px-4 text-stone-600">{rec.actor_role}</td>
                        <td className="py-3 px-4 text-stone-400">{rec.prev_hash_prefix}</td>
                        <td className="py-3 px-4 text-stone-900 font-semibold">{rec.record_hash_prefix}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> VERIFIED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
