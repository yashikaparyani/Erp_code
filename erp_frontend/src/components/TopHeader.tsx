'use client';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoleInitials, useRole } from '../context/RoleContext';
import AlertBell from './alerts/AlertBell';

export default function TopHeader() {
  const { currentUser, logout } = useAuth();
  const { currentRole } = useRole();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [userMenuOpen]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-30 px-3 py-3 sm:px-4 lg:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-6">
          <div className="shell-glass flex min-w-0 items-center gap-3 rounded-[24px] border border-[var(--border-subtle)] px-3 py-3 shadow-[var(--shadow-subtle)] transition-colors sm:px-4">
            <div className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)] font-semibold sm:flex">
              TS
            </div>
            <div className="min-w-0 text-left">
              <div className="mb-0.5 text-[10px] shell-section-title">Lifecycle Workspace</div>
              <span className="block max-w-[160px] truncate text-sm font-semibold text-[var(--text-main)] sm:max-w-[260px] lg:max-w-[420px]">
                {currentRole === 'Director' || currentRole === 'Project Head'
                  ? 'Cross-stage project visibility'
                  : `${currentRole} project-stage view`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 lg:gap-4">
          <div className="relative hidden min-[900px]:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--accent)]" />
            <input
              type="text"
              placeholder="Search modules, records, people"
              className="shell-glass w-44 rounded-[22px] py-3 pl-10 pr-4 text-sm focus:bg-white lg:w-72"
            />
          </div>

          <AlertBell />

          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label={userMenuOpen ? 'Close user menu' : 'Open user menu'}
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="shell-glass flex max-w-full items-center gap-2 rounded-[24px] px-2 py-2 transition-colors hover:bg-[var(--surface-hover)] sm:px-3 lg:gap-3 lg:pl-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#aeb0ff] to-[var(--brand-orange)] text-xs font-semibold text-white shadow-md">
                {getRoleInitials(currentUser.role)}
              </div>
              <div className="hidden min-w-0 text-left sm:block">
                <div className="max-w-[90px] truncate text-sm font-semibold text-[var(--text-main)] lg:max-w-[130px]">
                  {currentUser.name}
                </div>
                <div className="max-w-[90px] truncate text-xs text-[var(--text-muted)] lg:max-w-[130px]">
                  {currentUser.role}
                </div>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
            </button>

            {userMenuOpen && (
              <div className="shell-panel absolute top-full right-0 z-50 mt-2 w-[min(16rem,calc(100vw-1.5rem))] py-2">
                <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#aeb0ff] to-[var(--brand-orange)] text-xs font-semibold text-white">
                      {getRoleInitials(currentUser.role)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--text-main)]">{currentUser.name}</div>
                      <div className="truncate text-xs text-[var(--text-muted)]">{currentUser.email}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 inline-block rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent-strong)]">
                    {currentUser.role}
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm text-[var(--text-main)] hover:bg-[var(--surface-hover)]"
                >
                  <User className="h-4 w-4 text-[var(--text-muted)]" />
                  View Profile
                </Link>

                <div className="mt-1 border-t border-[var(--border-subtle)] pt-1">
                  <button
                    onClick={handleLogout}
                    className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
