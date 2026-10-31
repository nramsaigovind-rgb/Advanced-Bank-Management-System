'use client';

import React from 'react';
import TopNav from '@/components/TopNav';
import AuditStation from '@/components/diagnostics/AuditStation';

export default function AuditVerifierPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#F8F9F5]">
      <TopNav
        title="Ledger Audit Trail & Cryptographic Verifier"
        subtitle="Mathematical SHA-256 Hash Chain Verification & Tamper-Evident History"
      />

      <main className="p-8 max-w-7xl mx-auto w-full">
        <AuditStation />
      </main>
    </div>
  );
}
