import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'teal' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'blue' | 'purple';
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'emerald',
}: KPICardProps) {
  const colorStyles = {
    teal: {
      iconBg: 'bg-teal-50 text-teal-700 border border-teal-200/60',
    },
    cyan: {
      iconBg: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    },
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
    },
    blue: {
      iconBg: 'bg-blue-50 text-blue-700 border border-blue-200/60',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-700 border border-purple-200/60',
    },
  }[accentColor] || {
    iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  };

  return (
    <div className="bg-white rounded-[24px] p-6 border border-stone-200/80 shadow-soft hover:shadow-card transition-all duration-300 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">
          {title}
        </span>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${colorStyles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-extrabold text-forest-900 tracking-tight font-mono">{value}</div>
        {trend && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {trend.isPositive ? '+' : ''}
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-stone-500 mt-2 font-medium">{subtitle}</p>}
    </div>
  );
}
