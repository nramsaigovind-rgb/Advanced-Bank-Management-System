'use client';

import React from 'react';
import TopNav from '@/components/TopNav';
import ConcurrencyStation from '@/components/diagnostics/ConcurrencyStation';

export default function ConcurrencyLabPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#F8F9F5]">
      <TopNav
        title="ACID Concurrency & Lock Laboratory"
        subtitle="InnoDB Row-Level Locking, Race Condition Verification & Fault-Injection Rollbacks"
      />

      <main className="p-8 max-w-7xl mx-auto w-full">
        <ConcurrencyStation />
      </main>
    </div>
  );
}
