'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Zap, Play, AlertCircle, CheckCircle2, Server, Database, Sparkles } from 'lucide-react';

export default function CacheStation() {
  const [cacheLoading, setCacheLoading] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<any | null>(null);
  const [cacheStats, setCacheStats] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunBenchmark = async () => {
    setCacheLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.benchmarkCache(20);
      setBenchmarkResult(res);
      const stats = await api.getCacheStats();
      setCacheStats(stats);
    } catch (err: any) {
      const msg = typeof err === 'object' && err?.message ? err.message : String(err || 'Cache benchmark failed');
      setErrorMsg(msg);
    } finally {
      setCacheLoading(false);
    }
  };

  useEffect(() => {
    handleRunBenchmark();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[24px] p-7 border border-stone-200/80 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <span>Redis Cache-Aside Benchmark & Diagnostics</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Live comparative latency: Direct MySQL 8.0 query vs In-Memory Redis read
            </p>
          </div>
          <button
            onClick={handleRunBenchmark}
            disabled={cacheLoading}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {cacheLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Benchmarking 20 Queries...</span>
              </span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Benchmark</span>
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

        {benchmarkResult && (
          <div className="space-y-6">
            <div className="p-7 rounded-[26px] bg-gradient-to-r from-[#06231C] via-[#09352B] to-emerald-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-card">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-300 font-bold tracking-wider">
                  Measured Acceleration Factor
                </span>
                <div className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-white">
                  {benchmarkResult.speedup_factor}
                </div>
                <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                  Over {benchmarkResult.iterations} consecutive iterations testing branch KPI view retrieval
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center px-4 py-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[120px]">
                  <div className="text-[10px] text-stone-300 font-mono uppercase">MySQL Latency</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {benchmarkResult.avg_mysql_query_ms} ms
                  </div>
                </div>
                <div className="text-center px-4 py-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 backdrop-blur-sm min-w-[120px]">
                  <div className="text-[10px] text-emerald-300 font-mono uppercase">Redis Latency</div>
                  <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                    {benchmarkResult.avg_redis_cache_ms} ms
                  </div>
                </div>
              </div>
            </div>

            {cacheStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 bg-white rounded-[22px] border border-stone-200/80 shadow-soft">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total Hits</span>
                  <div className="text-2xl font-black font-mono text-emerald-700 mt-1">{cacheStats.hits}</div>
                </div>
                <div className="p-5 bg-white rounded-[22px] border border-stone-200/80 shadow-soft">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total Misses</span>
                  <div className="text-2xl font-black font-mono text-stone-700 mt-1">{cacheStats.misses}</div>
                </div>
                <div className="p-5 bg-white rounded-[22px] border border-stone-200/80 shadow-soft">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Hit Ratio</span>
                  <div className="text-2xl font-black font-mono text-teal-700 mt-1">
                    {cacheStats.hit_ratio_pct}%
                  </div>
                </div>
                <div className="p-5 bg-white rounded-[22px] border border-stone-200/80 shadow-soft">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Cache Strategy</span>
                  <div className="text-xs font-bold text-stone-900 mt-2 font-mono">Cache-Aside Pattern</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
