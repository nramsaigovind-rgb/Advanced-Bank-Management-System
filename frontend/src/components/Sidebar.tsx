'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Home,
  LayoutDashboard,
  ArrowRightLeft,
  History,
  Users,
  CreditCard,
  FileText,
  ShieldAlert,
  Cpu,
  BarChart3,
  UserCheck,
  Building2,
  LogOut,
  ChevronRight,
  Database,
  Activity,
  Shield,
  Menu,
  X,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role?.toUpperCase() || 'CUSTOMER';
  const isAdmin = role.includes('ADMIN');
  const isManager = role.includes('MANAGER');
  const isEmployee = role.includes('EMPLOYEE');
  const isCustomer = !isAdmin && !isManager && !isEmployee;

  const navItems = [
    // Customer items
    ...(isCustomer
      ? [
          { name: 'Home', href: '/customer', icon: Home },
          { name: 'Accounts & Cards', href: '/customer/accounts', icon: CreditCard },
          { name: 'Transfer & Pay', href: '/customer/transfer', icon: ArrowRightLeft },
          { name: 'Transactions', href: '/customer/transactions', icon: History },
          { name: 'Loans & EMI', href: '/customer/loans', icon: FileText },
        ]
      : []),

    // Employee items
    ...(isEmployee
      ? [
          { name: 'Desk Overview', href: '/employee', icon: LayoutDashboard },
          { name: 'KYC Verifications', href: '/employee/kyc', icon: UserCheck },
          { name: 'Customer Accounts', href: '/employee/accounts', icon: Users },
          { name: 'Loan Applications', href: '/employee/loans', icon: FileText },
        ]
      : []),

    // Manager items
    ...(isManager
      ? [
          { name: 'Branch Analytics', href: '/manager', icon: BarChart3 },
          { name: 'High-Value Txns', href: '/manager/transactions', icon: ArrowRightLeft },
          { name: 'Loan Approvals', href: '/manager/approvals', icon: FileText },
          { name: 'Branch Staff', href: '/manager/staff', icon: Users },
        ]
      : []),

    // Admin items (DBMS Diagnostics Lab)
    ...(isAdmin
      ? [
          { name: 'DBMS Observatory', href: '/admin/diagnostics', icon: Cpu },
          { name: 'Concurrency Lab', href: '/admin/concurrency', icon: Activity },
          { name: 'SQL Query Plan Analyzer', href: '/admin/explain', icon: Database },
          { name: 'Fraud Graph (MongoDB)', href: '/admin/fraud-graph', icon: ShieldAlert },
          { name: 'Ledger Audit Verifier', href: '/admin/audit', icon: FileText },
          { name: 'Branch Reports', href: '/manager', icon: BarChart3 },
        ]
      : []),
  ];

  // User display name & initials
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || 'Alex Turner';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-3 left-4 z-40 p-2.5 rounded-2xl bg-forest-900 text-white shadow-lg border border-forest-800"
        title="Toggle Menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-30"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-30 h-screen w-64 bg-forest-900 text-stone-200 flex flex-col flex-shrink-0 border-r border-forest-800/80 shadow-2xl transition-transform duration-300 ease-in-out overflow-hidden select-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
      {/* Subtle organic botanical ambient texture in bottom-left corner */}
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-gradient-to-tr from-emerald-600/15 to-transparent rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-1/4 -right-12 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-forest-800/60 bg-forest-950/30 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-forest-950 shadow-lg shadow-emerald-500/25 flex-shrink-0">
            <svg
              className="w-5 h-5 text-forest-950"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-white tracking-tight text-base leading-tight">
              ABMS Bank
            </div>
            <div className="text-[10px] text-emerald-200/70 font-medium tracking-wide">
              Your Trust. Our Technology.
            </div>
          </div>
        </div>
      </div>

      {/* Engine Status Badge Card */}
      <div className="px-4 pt-4 pb-2 relative z-10">
        <div className="p-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 rounded-2xl backdrop-blur-md flex items-center gap-3 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-white truncate">ACID Engine Online</span>
            </div>
            <div className="text-[10px] text-emerald-200/70 font-mono truncate">
              MySQL 8.0 &bull; InnoDB
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-3 relative z-10">
        <div className="text-[10px] font-bold text-emerald-200/40 uppercase tracking-wider px-3 mb-2 font-mono">
          {isAdmin
            ? 'DBMS Diagnostics Lab'
            : isManager
            ? 'Branch Operations'
            : isEmployee
            ? 'Employee Desk'
            : 'Personal Banking'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-400/30 text-white shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                  : 'text-stone-300/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-stone-400 group-hover:text-emerald-300'
                }`}
              />
              <span className="flex-1">{item.name}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400/80" />}
            </Link>
          );
        })}
      </nav>

      {/* Demo Persona Switcher & User Profile */}
      <div className="p-4 border-t border-forest-800/80 bg-forest-950/40 space-y-3 relative z-10">
        <div className="text-[10px] text-emerald-200/50 uppercase tracking-wider font-semibold font-mono">
          Quick Switch Persona
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <Link
            href="/customer"
            className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-stone-200 text-center font-medium transition-colors border border-white/5 hover:border-emerald-400/30"
          >
            Customer
          </Link>
          <Link
            href="/employee"
            className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-stone-200 text-center font-medium transition-colors border border-white/5 hover:border-emerald-400/30"
          >
            Employee
          </Link>
          <Link
            href="/manager"
            className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-stone-200 text-center font-medium transition-colors border border-white/5 hover:border-emerald-400/30"
          >
            Manager
          </Link>
          <Link
            href="/admin/diagnostics"
            className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-stone-200 text-center font-medium transition-colors border border-white/5 hover:border-emerald-400/30"
          >
            DBMS Lab
          </Link>
        </div>

        {/* User Badge matching Image 1 */}
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-stone-700/80 text-emerald-300 font-bold text-xs flex items-center justify-center border border-white/10 flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{displayName}</div>
              <div className="text-[10px] text-emerald-300/80 font-medium capitalize truncate">
                {role.toLowerCase().replace('_', ' ')}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
