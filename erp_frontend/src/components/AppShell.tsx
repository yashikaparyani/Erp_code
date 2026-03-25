'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import RouteGuard from './RouteGuard';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname() || '';
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
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="shell-panel flex flex-col items-center gap-4 px-10 py-12">
          <div className="animate-spin w-10 h-10 border-4 border-[var(--brand-orange)] border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect is in progress
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden overflow-x-clip bg-transparent">
      <Sidebar />
      <div className="flex-1 flex min-h-0 flex-col min-w-0">
        <TopHeader />
        <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-2 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
          <RouteGuard>
            {children}
          </RouteGuard>
        </main>
      </div>
    </div>
  );
}
