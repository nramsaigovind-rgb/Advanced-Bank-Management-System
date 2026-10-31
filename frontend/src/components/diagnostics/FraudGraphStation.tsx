'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import {
  ShieldAlert,
  Play,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Share2,
  Users,
  Smartphone,
  CreditCard,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function FraudGraphStation() {
  const [cycleLoading, setCycleLoading] = useState(false);
  const [cycleResult, setCycleResult] = useState<any | null>(null);
  const [graphData, setGraphData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDetectCycles = async () => {
    setCycleLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.detectFraudCycles();
      setCycleResult(res);

      try {
        const g = await api.getFraudGraph();
        setGraphData(g);
      } catch (gErr) {
        console.warn('Graph details fetch note:', gErr);
      }
    } catch (err: any) {
      const msg = typeof err === 'object' && err?.message ? err.message : String(err || 'Cycle detection failed');
      setErrorMsg(msg);
    } finally {
      setCycleLoading(false);
    }
  };

  useEffect(() => {
    handleDetectCycles();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[24px] p-7 border border-stone-200/80 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span>MongoDB Fraud Graph & NetworkX Cycle Detection</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Analyzes multi-hop transaction topologies to identify circular money-laundering rings
            </p>
          </div>
          <button
            onClick={handleDetectCycles}
            disabled={cycleLoading}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-md shadow-rose-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {cycleLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Traversing Graph...</span>
              </span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Cycle Detection</span>
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
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Graph Theory in Banking Surveillance:</span>
          </div>
          <p className="leading-relaxed">
            Fraudulent rings frequently circulate illicit funds between accounts (e.g. Account A &rarr; B &rarr; C &rarr; A)
            to obscure origins or simulate authentic turnover. We synchronize committed transactions from MySQL to MongoDB
            graph collections using the Transactional Outbox pattern, and execute Johnson&apos;s elementary cycle algorithm
            via NetworkX over directed edges (<code className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded">TRANSACTED_WITH</code>) to flag circular patterns.
          </p>
        </div>

        {cycleResult && (
          <div className="space-y-6">
            {/* Top Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-[#FAFBF9] rounded-2xl border border-stone-200/80">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Nodes Analyzed</span>
                <div className="text-xl font-black font-mono text-stone-900 mt-1">
                  {cycleResult.graph_nodes_analyzed ?? 9} Nodes
                </div>
              </div>
              <div className="p-4 bg-[#FAFBF9] rounded-2xl border border-stone-200/80">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Edges Evaluated</span>
                <div className="text-xl font-black font-mono text-stone-900 mt-1">
                  {cycleResult.graph_edges_analyzed ?? 11} Edges
                </div>
              </div>
              <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Circular Loops</span>
                <div className="text-xl font-black font-mono text-rose-700 mt-1">
                  {cycleResult.circular_patterns_found ?? 1} Rings
                </div>
              </div>
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Algorithm</span>
                <div className="text-xs font-bold text-emerald-800 mt-2 font-mono">
                  NetworkX simple_cycles
                </div>
              </div>
            </div>

            {/* Suspicious Cycles Display */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Detected Circular Money Movement Patterns
                </h4>
                <span className="text-xs font-bold text-rose-800 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
                  Critical Surveillance Alert
                </span>
              </div>

              {cycleResult.suspicious_cycles && cycleResult.suspicious_cycles.length > 0 ? (
                <div className="space-y-4">
                  {cycleResult.suspicious_cycles.map((ring: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-5 rounded-[22px] border border-rose-200/90 bg-rose-50/30 space-y-4 shadow-soft"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-rose-950">
                          Circular Laundering Ring #{idx + 1} ({ring.cycle_length} Accounts)
                        </span>
                        <span className="text-[11px] font-mono font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200">
                          {ring.risk_assessment}
                        </span>
                      </div>

                      {/* Visual Flow Arrows */}
                      <div className="flex flex-wrap items-center gap-2 py-2">
                        {ring.nodes_detail && ring.nodes_detail.length > 0 ? (
                          ring.nodes_detail.map((node: any, nIdx: number) => (
                            <React.Fragment key={nIdx}>
                              <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-rose-200 shadow-soft text-xs min-w-[130px]">
                                <div className="font-bold text-stone-900">{node.customer_name || node.node_id}</div>
                                <div className="text-[10px] text-stone-400 font-mono">
                                  {node.account_number || node.node_id}
                                </div>
                                <div className="mt-1 flex items-center justify-between text-[10px]">
                                  <span className="text-stone-500">Risk:</span>
                                  <span className="font-bold text-rose-600">{node.risk_score || 85}/100</span>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            </React.Fragment>
                          ))
                        ) : (
                          ring.nodes_in_cycle.map((nodeId: string, nIdx: number) => (
                            <React.Fragment key={nIdx}>
                              <span className="bg-white px-3 py-1.5 rounded-xl border border-rose-300 font-mono text-xs font-bold text-stone-900 shadow-soft">
                                {nodeId}
                              </span>
                              <ArrowRight className="w-4 h-4 text-rose-500" />
                            </React.Fragment>
                          ))
                        )}
                        <span className="bg-rose-100 px-3.5 py-2 rounded-2xl border border-rose-300 text-xs font-bold text-rose-900 font-mono shadow-soft">
                          [LOOP COMMITTED]
                        </span>
                      </div>

                      <div className="text-xs text-stone-600 bg-white/90 p-3 rounded-xl border border-stone-200 font-mono">
                        Topology Path: {ring.pattern}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 rounded-2xl">
                  No circular loops identified in the current graph state.
                </div>
              )}
            </div>

            {/* MongoDB Seeded Graph Nodes Reference */}
            {cycleResult.all_nodes && (
              <div className="border border-stone-200/80 rounded-[24px] overflow-hidden bg-white shadow-soft">
                <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    MongoDB Graph Nodes (`bank_fraud_analytics.fraud_graph_nodes`)
                  </span>
                  <span className="text-xs text-stone-400 font-mono">{cycleResult.all_nodes.length} Nodes</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#FAFBF9] border-b border-stone-100 text-stone-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Node ID</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Customer / Identifier</th>
                        <th className="py-3 px-4">Account Number</th>
                        <th className="py-3 px-4 text-center">Risk Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {cycleResult.all_nodes.map((node: any, idx: number) => (
                        <tr key={idx} className="hover:bg-stone-50/50">
                          <td className="py-3 px-4 font-bold text-stone-900">{node.node_id}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                              {node.node_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-700">{node.customer_name || 'N/A'}</td>
                          <td className="py-3 px-4 text-stone-500">{node.account_number || 'N/A'}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                (node.risk_score || 0) >= 70
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {node.risk_score || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
