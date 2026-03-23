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
    <header className="sticky top-0 z-30 h-20 flex items-center justify-between px-4 lg:px-6">
      {/* Left section */}
      <div className="flex items-center gap-2 lg:gap-6 min-w-0 flex-1">
        <div className="shell-glass flex items-center gap-3 px-4 py-3 rounded-[24px] transition-colors min-w-0 border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)]">
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)] font-semibold">
            TS
          </div>
          <div className="min-w-0 text-left">
            <div className="shell-section-title text-[10px] mb-0.5">Lifecycle Workspace</div>
            <span className="block text-sm text-[var(--text-main)] max-w-[160px] sm:max-w-[260px] lg:max-w-[420px] truncate font-semibold">
              {currentRole === 'Director' || currentRole === 'Project Head'
                ? 'Cross-stage project visibility'
                : `${currentRole} project-stage view`}
            </span>
          </div>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--accent)]" />
          <input
            type="text"
            placeholder="Search modules, records, people"
            className="shell-glass pl-10 pr-4 py-3 w-44 lg:w-72 rounded-[22px] text-sm focus:bg-white"
          />
        </div>

        {/* Notifications */}
        <AlertBell />

        {/* User Menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="shell-glass flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 hover:bg-[var(--surface-hover)] rounded-[24px] px-2 py-2 transition-colors"
          >
            <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold bg-gradient-to-br from-[#aeb0ff] to-[var(--brand-orange)] shadow-md">
              {getRoleInitials(currentUser.role)}
            </div>
            <div className="text-left min-w-0 hidden sm:block">
              <div className="text-sm font-semibold text-[var(--text-main)] truncate max-w-[90px] lg:max-w-[130px]">
                {currentUser.name}
              </div>
              <div className="text-xs text-[var(--text-muted)] truncate max-w-[90px] lg:max-w-[130px]">
                {currentUser.role}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 shell-panel py-2 z-50">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 bg-gradient-to-br from-[#aeb0ff] to-[var(--brand-orange)]">
                      {getRoleInitials(currentUser.role)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-main)] truncate">{currentUser.name}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{currentUser.email}</div>
                    </div>
                  </div>
                <div className="mt-2.5 px-2.5 py-1 bg-[var(--accent-soft)] rounded-full text-xs text-[var(--accent-strong)] font-medium inline-block">
                  {currentUser.role}
                </div>
              </div>

              {/* Profile placeholder */}
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm text-[var(--text-main)] hover:bg-[var(--surface-hover)]"
              >
                <User className="w-4 h-4 text-[var(--text-muted)]" />
                View Profile
              </Link>

              {/* Logout */}
              <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="mx-2 w-[calc(100%-1rem)] rounded-xl text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
