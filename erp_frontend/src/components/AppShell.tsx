'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
    if (!isLoading && isAuthenticated && pathname === '/login') {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Login page — render without shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Still checking session storage
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect is in progress
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
