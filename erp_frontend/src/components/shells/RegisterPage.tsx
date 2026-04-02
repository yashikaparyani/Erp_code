'use client';

import { ReactNode } from 'react';
import { DataState } from '@/components/ui/DataState';

// ── Types ──────────────────────────────────────────────────────────────────

export interface StatItem {
  label: string;
  value: string | number;
  /** Optional colour key that maps to CSS variables. */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export interface FilterBarSlot {
  /** Render prop — the shell provides nothing; the consumer provides filters. */
  children: ReactNode;
}

export interface RegisterPageProps {
  /** Page title shown in the header. */
  title: string;
  /** Short description below the title (optional). */
  description?: string;

  // ── data state ──
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;

  // ── optional stat cards row ──
  stats?: StatItem[];

  // ── filter bar (render slot) ──
  filterBar?: ReactNode;

  // ── header-right actions (e.g. Create button) ──
  headerActions?: ReactNode;

  // ── main content (the table / register) ──
  children: ReactNode;
}

// ── Stat variant colours ───────────────────────────────────────────────────

const STAT_RING: Record<string, string> = {
  default: 'border-[var(--border-subtle)]',
  success: 'border-[var(--success-border)]',
  warning: 'border-[var(--warning-border)]',
  error: 'border-[var(--error-border)]',
  info: 'border-[var(--info-border)]',
};

const STAT_VALUE_COLOUR: Record<string, string> = {
  default: 'text-[var(--text-main)]',
  success: 'text-[var(--success-text)]',
  warning: 'text-[var(--warning-text)]',
  error: 'text-[var(--error-text)]',
  info: 'text-[var(--info-text)]',
};

// ── Component ──────────────────────────────────────────────────────────────

export default function RegisterPage({
  title,
  description,
  loading,
  error,
  empty,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  stats,
  filterBar,
  headerActions,
  children,
}: RegisterPageProps) {
  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 sm:px-6">
      {/* ── Header ── */}
      <div className="shell-panel flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div>
          <div className="shell-section-title mb-1">Workspace</div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
          )}
          <div className="mt-3 h-1.5 w-20 rounded-full bg-gradient-to-r from-[var(--brand-orange)] to-orange-200" />
        </div>
        {headerActions && <div className="flex flex-wrap gap-2">{headerActions}</div>}
      </div>

      {/* ── Stats row ── */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {stats.map((s) => {
            const variant = s.variant ?? 'default';
            return (
              <div
                key={s.label}
                className={`stat-card border-l-4 ${STAT_RING[variant]}`}
              >
                <div className={`stat-value ${STAT_VALUE_COLOUR[variant]}`}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filter bar ── */}
      {filterBar && (
        <div className="shell-panel flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
          {filterBar}
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="shell-panel overflow-hidden px-0 py-0">
        <DataState
          loading={loading}
          error={error}
          empty={empty}
          onRetry={onRetry}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyIcon={emptyIcon}
          emptyAction={emptyAction}
        >
          {children}
        </DataState>
      </div>
    </section>
  );
}
