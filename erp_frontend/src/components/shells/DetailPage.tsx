'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DataState } from '@/components/ui/DataState';
import { RelinkWarning } from '@/components/ui/DataState';
import type { ResolvedContext } from '@/lib/context';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DetailSection {
  key: string;
  label: string;
  content: ReactNode;
}

export interface DetailPageProps {
  /** Page title — typically the record name or number. */
  title: string;
  /** Short kicker label above the title (e.g. "Survey", "Purchase Order"). */
  kicker?: string;

  // ── navigation ──
  backHref: string;
  backLabel?: string;

  // ── data state ──
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;

  // ── context ──
  context?: ResolvedContext | null;

  // ── status badge ──
  status?: string;
  statusVariant?: 'default' | 'success' | 'warning' | 'error' | 'info';

  // ── header actions (e.g. Edit, Delete, Submit) ──
  headerActions?: ReactNode;

  // ── core identity block (custom metadata card) ──
  identityBlock?: ReactNode;

  // ── side panels (documents, accountability, linked records) ──
  sidePanels?: ReactNode;

  // ── main content ──
  children: ReactNode;
}

// ── Status colours ─────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]',
  error: 'bg-[var(--error-bg)] text-[var(--error-text)] border border-[var(--error-border)]',
  info: 'bg-[var(--info-bg)] text-[var(--info-text)] border border-[var(--info-border)]',
};

// ── Component ──────────────────────────────────────────────────────────────

export default function DetailPage({
  title,
  kicker,
  backHref,
  backLabel = 'Back',
  loading,
  error,
  onRetry,
  context,
  status,
  statusVariant = 'default',
  headerActions,
  identityBlock,
  sidePanels,
  children,
}: DetailPageProps) {
  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 sm:px-6">
      {/* ── Breadcrumb / back link ── */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {/* ── Header ── */}
      <div className="shell-panel px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {kicker && <div className="shell-section-title mb-1">{kicker}</div>}
            <h1 className="text-2xl font-bold text-[var(--text-main)] sm:text-3xl break-words">
              {title}
            </h1>
            <div className="mt-3 h-1.5 w-20 rounded-full bg-gradient-to-r from-[var(--brand-orange)] to-orange-200" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status && (
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[statusVariant]}`}
              >
                {status}
              </span>
            )}
            {headerActions}
          </div>
        </div>
      </div>

      {/* ── Relink warning ── */}
      {context?.needsRelink && (
        <RelinkWarning />
      )}

      {/* ── Body ── */}
      <DataState loading={loading} error={error} onRetry={onRetry}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ── Main column ── */}
          <div className="space-y-5 lg:col-span-2">
            {/* Identity / summary card */}
            {identityBlock && (
              <div className="shell-panel px-5 py-4 sm:px-6">{identityBlock}</div>
            )}

            {/* Primary content */}
            {children}
          </div>

          {/* ── Side column ── */}
          {sidePanels && (
            <div className="space-y-5">{sidePanels}</div>
          )}
        </div>
      </DataState>
    </section>
  );
}
