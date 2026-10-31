'use client';

import React from 'react';
import { PieChart, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface CategorySpending {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

export function SpendingDonutChart() {
  const categories: CategorySpending[] = [
    { name: 'Transfers & Remittance', amount: 35000, color: '#047857', percentage: 42 },
    { name: 'Investments & Savings', amount: 20000, color: '#0d9488', percentage: 24 },
    { name: 'Utilities & Bills', amount: 18000, color: '#0284c7', percentage: 22 },
    { name: 'Loan EMI & Finance', amount: 10000, color: '#f59e0b', percentage: 12 },
  ];

  const total = categories.reduce((sum, c) => sum + c.amount, 0);

  // Calculate SVG stroke dashes for donut segments
  // Circumference = 2 * PI * r = 2 * 3.14159 * 40 = 251.32
  const r = 40;
  const c = 2 * Math.PI * r;
  let accumulatedPercent = 0;

  return (
    <div className="bg-white rounded-[24px] p-6 border border-stone-200/80 shadow-soft flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-forest-900">Spending Breakdown</h3>
          <p className="text-[11px] text-stone-500">30-day categorized outflows</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <PieChart className="w-4 h-4" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={r}
              className="text-stone-100"
              strokeWidth="14"
              stroke="currentColor"
              fill="transparent"
            />
            {categories.map((cat, idx) => {
              const dashLength = (cat.percentage / 100) * c;
              const dashOffset = -((accumulatedPercent / 100) * c);
              accumulatedPercent += cat.percentage;

              return (
                <circle
                  key={cat.name}
                  cx="50"
                  cy="50"
                  r={r}
                  stroke={cat.color}
                  strokeWidth="14"
                  strokeDasharray={`${dashLength} ${c - dashLength}`}
                  strokeDashoffset={dashOffset}
                  fill="transparent"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-stone-400 font-bold uppercase font-mono">Outflow</span>
            <span className="text-sm font-black font-mono text-forest-900">
              ₹{(total / 1000).toFixed(0)}k
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2">
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-stone-600 font-medium truncate max-w-[120px]">{cat.name}</span>
              </div>
              <div className="font-mono font-semibold text-forest-900">
                {cat.percentage}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
        <span>Highest category: Transfers (42%)</span>
        <span className="text-emerald-700 font-semibold">&bull; Healthy Margin</span>
      </div>
    </div>
  );
}

export function BalanceTrendLine({ currentBalance = 150000 }: { currentBalance?: number }) {
  // 30-day mock balance trend points
  const points = [
    120000, 122000, 118000, 125000, 124000, 130000, 128000,
    135000, 134000, 139000, 142000, 140000, 145000, 148000,
    144000, 146000, 149000, 151000, 150000, 154000, 153000,
    currentBalance,
  ];

  const min = Math.min(...points) * 0.95;
  const max = Math.max(...points) * 1.05;
  const width = 360;
  const height = 100;

  const getCoordinates = (val: number, idx: number) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - ((val - min) / (max - min)) * height;
    return `${x},${y}`;
  };

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getCoordinates(p, i)}`).join(' ');
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="bg-white rounded-[24px] p-6 border border-stone-200/80 shadow-soft flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-forest-900">30-Day Balance Trajectory</h3>
          <p className="text-[11px] text-stone-500">Dynamic ledger-weighted net worth</p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>+6.8%</span>
        </div>
      </div>

      <div className="my-2">
        <div className="h-28 w-full overflow-hidden relative">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#balanceGradient)" />
            <path d={pathD} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-stone-400 uppercase font-mono block">Month Low</span>
          <span className="font-bold font-mono text-stone-700">₹{(min).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-stone-400 uppercase font-mono block">Current Balance</span>
          <span className="font-bold font-mono text-emerald-700">₹{currentBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
    </div>
  );
}
