'use client';

import React from 'react';
import TopNav from '@/components/TopNav';
import ExplainStation from '@/components/diagnostics/ExplainStation';

export default function ExplainPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#F8F9F5]">
      <TopNav
        title="SQL Query Execution Plan Analyzer"
        subtitle="MySQL 8.0 Cost Estimator, Index Optimization & EXPLAIN ANALYZE Trees"
      />

      <main className="p-8 max-w-7xl mx-auto w-full">
        <ExplainStation />
      </main>
    </div>
  );
}
