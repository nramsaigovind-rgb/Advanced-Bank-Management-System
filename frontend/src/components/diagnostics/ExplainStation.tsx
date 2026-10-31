'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Database, Play, AlertCircle, CheckCircle2, Clock, Layers, Sparkles } from 'lucide-react';

export default function ExplainStation() {
  const [queriesList, setQueriesList] = useState<any[]>([]);
  const [selectedQueryKey, setSelectedQueryKey] = useState<string>('account_statement_indexed');
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainResult, setExplainResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchQueries = async () => {
      try {
        const q = await api.getDiagnosticsQueries();
        setQueriesList(q);
        if (q.length > 0) {
          handleRunExplain(q[0].query_key);
        }
      } catch (e: any) {
        setErrorMsg(e.message || 'Failed to load analytical queries');
      }
    };
    fetchQueries();
  }, []);

  const handleRunExplain = async (keyToRun?: string) => {
    const qKey = keyToRun || selectedQueryKey;
    setExplainLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.explainQuery(qKey);
      setExplainResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'EXPLAIN ANALYZE execution failed');
    } finally {
      setExplainLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[24px] p-7 border border-stone-200/80 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <span>MySQL 8.0 Query Plan Optimizer & EXPLAIN ANALYZE</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Live cost tree, index usage verification, and actual runtime milliseconds on InnoDB tables
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 self-start sm:self-auto font-mono">
            Engine: MySQL 8.0.36
          </span>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Allowlisted Queries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
          {queriesList.map((q) => (
            <button
              key={q.query_key}
              onClick={() => {
                setSelectedQueryKey(q.query_key);
                handleRunExplain(q.query_key);
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedQueryKey === q.query_key
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                  : 'border-stone-200 bg-white hover:bg-stone-50/80'
              }`}
            >
              <div className="font-bold text-xs text-stone-900">{q.title}</div>
              <div className="text-[11px] text-stone-500 mt-1 leading-relaxed line-clamp-2">{q.description}</div>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => handleRunExplain()}
            disabled={explainLoading}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-700/20 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {explainLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Executing Plan...</span>
              </span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Re-Run EXPLAIN ANALYZE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Plan Results */}
      {explainResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-[24px] p-5 border border-stone-200/80 shadow-soft">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Execution Duration</span>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {explainResult.execution_time_ms} ms
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 border border-stone-200/80 shadow-soft">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Rows Returned</span>
              <div className="text-2xl font-black font-mono text-stone-900 mt-1">
                {explainResult.rows_returned} Rows
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 border border-stone-200/80 shadow-soft">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Optimization Time</span>
              <div className="text-2xl font-black font-mono text-teal-700 mt-1">
                {explainResult.explain_time_ms} ms
              </div>
            </div>
          </div>

          <div className="bg-[#06231C] text-emerald-100 rounded-[24px] p-5 border border-[#0B3B2F] font-mono text-xs overflow-x-auto shadow-card">
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5">
              Executed SQL Query
            </div>
            <code className="text-emerald-200 leading-relaxed">{explainResult.actual_sql}</code>
          </div>

          {explainResult.explain_plan && (
            <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-soft overflow-hidden">
              <div className="p-5 border-b border-stone-100 font-bold text-xs text-stone-900 flex items-center justify-between">
                <span>Standard EXPLAIN Operator Tree</span>
                <span className="text-[10px] font-mono text-stone-400 uppercase">Access Path Analysis</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#FAFBF9] border-b border-stone-100 text-stone-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Select Type</th>
                      <th className="py-3 px-4">Table</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Possible Keys</th>
                      <th className="py-3 px-4">Key Used</th>
                      <th className="py-3 px-4">Rows</th>
                      <th className="py-3 px-4">Extra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {explainResult.explain_plan.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4">{row.select_type}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">{row.table}</td>
                        <td className="py-3 px-4">{row.type}</td>
                        <td className="py-3 px-4 text-stone-500">{row.possible_keys || 'NULL'}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">
                          {row.key ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {row.key}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                              Full Scan
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">{row.rows}</td>
                        <td className="py-3 px-4 text-stone-500">{row.Extra}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {explainResult.explain_analyze && (
            <div className="bg-[#051E18] text-emerald-300 rounded-[24px] p-6 border border-[#0B3B2F] font-mono text-xs overflow-x-auto shadow-card">
              <div className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider mb-2">
                MySQL 8.0 EXPLAIN ANALYZE Execution Cost Tree
              </div>
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap text-emerald-200">
                {explainResult.explain_analyze}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
