'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TopNav from '@/components/TopNav';
import ConcurrencyStation from '@/components/diagnostics/ConcurrencyStation';
import ExplainStation from '@/components/diagnostics/ExplainStation';
import FraudGraphStation from '@/components/diagnostics/FraudGraphStation';
import CacheStation from '@/components/diagnostics/CacheStation';
import AuditStation from '@/components/diagnostics/AuditStation';
import {
  Activity,
  RotateCcw,
  Database,
  ShieldAlert,
  Zap,
  FileCheck,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

type TabType = 'concurrency' | 'rollback' | 'explain' | 'fraud' | 'cache' | 'audit';

function DiagnosticsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'concurrency';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam && ['concurrency', 'rollback', 'explain', 'fraud', 'cache', 'audit'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const tabs: { id: TabType; label: string; icon: any; count: string }[] = [
    { id: 'concurrency', label: '1. Concurrency Race & Row Locking', icon: Activity, count: 'Pessimistic' },
    { id: 'rollback', label: '2. Fault-Injection & Rollback', icon: RotateCcw, count: 'ACID' },
    { id: 'explain', label: '3. SQL EXPLAIN & Query Plan', icon: Database, count: 'Cost: 0.35' },
    { id: 'fraud', label: '4. MongoDB Fraud Graph Cycles', icon: ShieldAlert, count: 'NetworkX' },
    { id: 'cache', label: '5. Redis Cache Benchmark', icon: Zap, count: 'Sub-ms' },
    { id: 'audit', label: '6. SHA-256 Audit Verifier', icon: FileCheck, count: 'Ledger' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#F8F9F5]">
      <TopNav
        title="DBMS Architecture Observatory"
        subtitle="Real-Time Concurrency, ACID Rollback, SQL Query Optimization & Distributed Caching"
      />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Ambient Hero Banner */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#06231C] via-[#09352B] to-emerald-950 text-white p-7 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 max-w-xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
              <Cpu className="w-3.5 h-3.5" />
              Core Engine Observatory &bull; Live Telemetry & Verification
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              DBMS Diagnostics & Concurrency Lab.
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Verify database engine invariants in real-time: InnoDB pessimistic row-level locking,
              transactional outbox synchronization, EXPLAIN execution tree cost models, and SHA-256 ledger integrity.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[120px]">
              <span className="block text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Storage Engine</span>
              <span className="text-sm font-black text-white">InnoDB 8.0</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[120px]">
              <span className="block text-[10px] text-teal-300 font-bold uppercase tracking-wider">Isolation Level</span>
              <span className="text-sm font-black text-white">REPEATABLE READ</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#06231C] text-emerald-300 shadow-md ring-1 ring-emerald-500/50'
                    : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200/80 shadow-soft'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-md ${
                    isActive ? 'bg-emerald-900/60 text-emerald-200' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="mt-4">
          {activeTab === 'concurrency' && <ConcurrencyStation defaultView="concurrency" />}
          {activeTab === 'rollback' && <ConcurrencyStation defaultView="rollback" />}
          {activeTab === 'explain' && <ExplainStation />}
          {activeTab === 'fraud' && <FraudGraphStation />}
          {activeTab === 'cache' && <CacheStation />}
          {activeTab === 'audit' && <AuditStation />}
        </div>
      </main>
    </div>
  );
}

export default function DiagnosticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9F5] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <DiagnosticsContent />
    </Suspense>
  );
}
