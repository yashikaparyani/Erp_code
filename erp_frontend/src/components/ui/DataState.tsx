'use client';

import { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw, LinkIcon } from 'lucide-react';

// ── Loading ────────────────────────────────────────────────────────────────

interface LoadingProps {
  /** Optional label — defaults to "Loading…" */
  label?: string;
  className?: string;
}

export function Loading({ label = 'Loading\u2026', className = '' }: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-20 text-[var(--text-muted)] ${className}`}>
      <Loader2 className="h-7 w-7 animate-spin opacity-60" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

// ── Empty ──────────────────────────────────────────────────────────────────

interface EmptyProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function Empty({
  icon,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}: EmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-20 text-center ${className}`}>
      <div className="mb-1 text-[var(--text-soft)]">
        {icon ?? <Inbox className="h-10 w-10" />}
      </div>
      <h3 className="text-base font-semibold text-[var(--text-main)]">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-[var(--text-muted)]">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ── ErrorBlock ─────────────────────────────────────────────────────────────

interface ErrorBlockProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorBlock({
  message = 'Something went wrong.',
  onRetry,
  className = '',
}: ErrorBlockProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-20 text-center ${className}`}>
      <div className="rounded-full bg-[var(--error-bg)] p-3">
        <AlertTriangle className="h-6 w-6 text-[var(--error-text)]" />
      </div>
      <p className="max-w-md text-sm text-[var(--text-muted)]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-[var(--text-main)] shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

// ── RelinkWarning ──────────────────────────────────────────────────────────

interface RelinkWarningProps {
  /** The legacy text field that couldn't be linked. */
  legacySiteName?: string;
  className?: string;
}

export function RelinkWarning({ legacySiteName, className = '' }: RelinkWarningProps) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-text)] ${className}`}
    >
      <LinkIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <span className="font-medium">Needs relink</span>
        {legacySiteName && (
          <span>
            {' \u2014 '}legacy site name: <code className="rounded bg-white/60 px-1 py-0.5 text-xs">{legacySiteName}</code>
          </span>
        )}
        <p className="mt-0.5 text-xs opacity-80">
          This record has a free-text site name but is not properly linked to its site record.
          It can still be viewed, but actions may be limited until it is relinked.
        </p>
      </div>
    </div>
  );
}

// ── DataState wrapper ──────────────────────────────────────────────────────

interface DataStateProps {
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}

/**
 * Convenience wrapper that renders the correct state component.
 *
 * Usage:
 * ```tsx
 * <DataState loading={loading} error={error} empty={items.length === 0}>
 *   <MyContent items={items} />
 * </DataState>
 * ```
 */
export function DataState({
  loading,
  error,
  empty,
  loadingLabel,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRetry,
  children,
}: DataStateProps) {
  if (loading) return <Loading label={loadingLabel} />;
  if (error) return <ErrorBlock message={error} onRetry={onRetry} />;
  if (empty) {
    return (
      <Empty
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }
  return <>{children}</>;
}
