'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  customer_id?: number;
  employee_id?: number;
  branch_id?: number;
  permissions?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('abms_token');
    const savedUser = localStorage.getItem('abms_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user', e);
        localStorage.removeItem('abms_token');
        localStorage.removeItem('abms_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.login({ username, password });
      const accessToken = data.access_token;
      
      // Robustly construct user profile from either nested user or flat token response fields
      const rawUser = data.user || {};
      const userData: UserProfile = {
        id: rawUser.id || data.user_id || 1,
        username: rawUser.username || data.username || username,
        email: rawUser.email || `${data.username || username}@abmsbank.com`,
        role: rawUser.role || data.role || 'customer',
        first_name: rawUser.display_name || data.display_name || username,
        last_name: rawUser.last_name || '',
        customer_id: rawUser.customer_id,
        employee_id: rawUser.employee_id,
        branch_id: rawUser.branch_id || 1,
        permissions: rawUser.permissions || data.permissions || [],
      };

      setToken(accessToken);
      setUser(userData);

      localStorage.setItem('abms_token', accessToken);
      localStorage.setItem('abms_user', JSON.stringify(userData));

      // Redirect based on role
      const role = (userData.role || '').toLowerCase();
      if (role.includes('admin')) {
        router.push('/admin/diagnostics');
      } else if (role.includes('manager')) {
        router.push('/manager');
      } else if (role.includes('employee')) {
        router.push('/employee');
      } else {
        router.push('/customer');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('abms_token');
    localStorage.removeItem('abms_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

