'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  Sun,
  Bell,
  ChevronDown,
  Database,
  Zap,
  Shield,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface TopNavProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function TopNav({ title, subtitle, actions }: TopNavProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || 'Alex Turner';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-cream-50/80 backdrop-blur-md border-b border-stone-200/70 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Search Bar - matching Image 1 */}
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions, beneficiaries, or anything..."
            className="w-full pl-10 pr-16 py-2 rounded-full border border-stone-200/90 bg-white/90 text-xs text-forest-900 placeholder:text-stone-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all"
          />
          <span className="absolute right-3 py-0.5 px-1.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-mono font-semibold text-stone-500">
            Ctrl K
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 ml-4">
        {/* DBMS System Health Indicator */}
        <div className="hidden xl:flex items-center gap-2 bg-white/90 border border-stone-200/80 px-3 py-1.5 rounded-full text-[11px] shadow-sm">
          <div className="flex items-center gap-1.5 text-forest-800 font-medium">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>MySQL 8.0</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-stone-300">|</span>
          <div className="flex items-center gap-1.5 text-forest-800 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Redis</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-stone-300">|</span>
          <div className="flex items-center gap-1.5 text-forest-800 font-medium">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>Mongo Graph</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Custom actions slot if provided */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Theme mode toggle */}
        <button
          type="button"
          title="Theme Toggle"
          className="w-8 h-8 rounded-full border border-stone-200/80 bg-white/90 hover:bg-stone-50 flex items-center justify-center text-stone-600 shadow-sm transition-colors"
        >
          <Sun className="w-4 h-4" />
        </button>

        {/* Notifications with badge */}
        <button
          type="button"
          title="Notifications"
          className="w-8 h-8 rounded-full border border-stone-200/80 bg-white/90 hover:bg-stone-50 flex items-center justify-center text-stone-600 shadow-sm relative transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border border-white">
            1
          </span>
        </button>

        {/* User profile dropdown pill */}
        <div className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-stone-200/80 bg-white/90 shadow-sm hover:border-emerald-300 transition-colors cursor-pointer">
          <div className="w-6 h-6 rounded-full bg-stone-700 text-white font-bold text-[11px] flex items-center justify-center">
            {initial}
          </div>
          <span className="text-xs font-semibold text-forest-900 hidden sm:inline truncate max-w-[120px]">
            {displayName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
        </div>
      </div>
    </header>
  );
}
