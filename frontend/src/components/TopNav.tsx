'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  Search,
  Sun,
  Bell,
  ChevronDown,
  Database,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Info,
  KeyRound,
  LogOut,
  X,
  Check,
} from 'lucide-react';

interface TopNavProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export default function TopNav({ title, subtitle, actions }: TopNavProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const displayName = user?.display_name || user?.username || 'Alex Turner';
  const initial = displayName.charAt(0).toUpperCase();

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwdSuccess('Password changed successfully!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPwdSuccess('');
      }, 1500);
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <header className="min-h-16 bg-cream-50/90 backdrop-blur-md border-b border-stone-200/70 pl-16 pr-3 sm:px-8 py-2 flex items-center justify-between gap-2 sticky top-0 z-20">
      {/* Search Bar */}
      <div className="hidden sm:block flex-1 max-w-md min-w-0">
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
      <div className="flex items-center gap-1.5 sm:gap-3 ml-auto min-w-0">
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
        {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}

        {/* Theme mode toggle */}
        <button
          type="button"
          title="Theme Toggle"
          className="hidden sm:flex w-8 h-8 rounded-full border border-stone-200/80 bg-white/90 hover:bg-stone-50 items-center justify-center text-stone-600 shadow-sm transition-colors"
        >
          <Sun className="w-4 h-4" />
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 rounded-full border border-stone-200/80 bg-white/90 hover:bg-stone-50 flex items-center justify-center text-stone-600 shadow-sm relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border border-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200/80 py-3 z-50 text-forest-900 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 pb-2.5 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-forest-900 tracking-wide uppercase">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs">
                    No notifications right now.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 hover:bg-stone-50/80 transition-colors flex items-start gap-3 ${
                        !n.is_read ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <div className="mt-0.5">
                        {n.type === 'FRAUD_ALERT' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        ) : n.type === 'TRANSFER_RECEIVED' || n.type === 'LOAN_APPROVED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Info className="w-4 h-4 text-teal-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold ${!n.is_read ? 'text-forest-900' : 'text-stone-600'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-stone-400 whitespace-nowrap">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed break-words">
                          {n.message}
                        </p>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          title="Mark as read"
                          className="text-stone-400 hover:text-emerald-600 p-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile dropdown */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-stone-200/80 bg-white/90 shadow-sm hover:border-emerald-300 transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-forest-900 text-white font-bold text-[11px] flex items-center justify-center">
              {initial}
            </div>
            <span className="text-xs font-semibold text-forest-900 hidden sm:inline truncate max-w-[120px]">
              {displayName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-stone-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-stone-100">
                <p className="text-xs font-bold text-forest-900 truncate">{displayName}</p>
                <p className="text-[10px] font-mono font-medium text-emerald-700 uppercase">{user?.role || 'CUSTOMER'}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowPasswordModal(true);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-emerald-50/50 hover:text-emerald-800 flex items-center gap-2 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-stone-400" />
                  Change Password
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-forest-900">Change Password</h3>
                  <p className="text-[11px] text-stone-500">Update security credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
              {pwdError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                  {pwdSuccess}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-4 py-1.5 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 disabled:opacity-50"
                >
                  {pwdLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
