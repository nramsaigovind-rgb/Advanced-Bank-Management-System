'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        const role = user.role?.toLowerCase() || '';
        if (role.includes('admin')) {
          router.replace('/admin/diagnostics');
        } else if (role.includes('manager')) {
          router.replace('/manager');
        } else if (role.includes('employee')) {
          router.replace('/employee');
        } else {
          router.replace('/customer');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen bg-[#F8F9F5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-stone-700">Connecting to ABMS Core Engine...</p>
      </div>
    </div>
  );
}
