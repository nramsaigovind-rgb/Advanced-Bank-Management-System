'use client';

import React from 'react';
import TopNav from '@/components/TopNav';
import FraudGraphStation from '@/components/diagnostics/FraudGraphStation';

export default function FraudGraphPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#F8F9F5]">
      <TopNav
        title="MongoDB Fraud Graph & NetworkX Topology"
        subtitle="Graph-Based Money Movement Surveillance & Circular Transfer Loop Detection"
      />

      <main className="p-8 max-w-7xl mx-auto w-full">
        <FraudGraphStation />
      </main>
    </div>
  );
}
