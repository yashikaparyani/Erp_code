'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DataState } from '@/components/ui/DataState';

// ── Types ──────────────────────────────────────────────────────────────────

export interface WorkspaceTab {
  key: string;
  label: string;
  icon?: ReactNode;
  /** If provided, a badge count is shown on the tab. */
  badge?: number;
  content: ReactNode;
}

export interface WorkspacePageProps {
  /** Who this workspace is for — e.g. "Project Head Workspace", "PM Workspace". */
  title: string;
  /** Additional subtitle — e.g. the project name. */
  subtitle?: string;
  /** Kicker above the title — e.g. "Project Workspace". */
  kicker?: string;

  // ── navigation ──
  backHref: string;
  backLabel?: string;

  // ── data state (for initial load of workspace context) ──
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;

  // ── tabs ──
  tabs: WorkspaceTab[];
  /** Controlled active tab key. If omitted, uses internal state starting from first tab. */
  activeTab?: string;
  onTabChange?: (key: string) => void;

  // ── header-right actions ──
  headerActions?: ReactNode;

  /** Slot for context info shown below header (e.g. project summary card). */
  contextCard?: ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function WorkspacePage({
  title,
  subtitle,
  kicker,
  backHref,
  backLabel = 'Back',
  loading,
  error,
  onRetry,
  tabs,
  activeTab: controlledTab,
  onTabChange,
  headerActions,
  contextCard,
}: WorkspacePageProps) {
  const [internalTab, setInternalTab] = useState(tabs[0]?.key ?? '');
  const activeKey = controlledTab ?? internalTab;

  const handleTabClick = (key: string) => {
    if (onTabChange) {
      onTabChange(key);
    } else {
      setInternalTab(key);
    }
  };

  const activeContent = tabs.find((t) => t.key === activeKey)?.content ?? null;

  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 sm:px-6">
      {/* ── Back link ── */}
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
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
            )}
            <div className="mt-3 h-1.5 w-20 rounded-full bg-gradient-to-r from-[var(--brand-orange)] to-orange-200" />
          </div>
          {headerActions && <div className="flex flex-wrap gap-2">{headerActions}</div>}
        </div>
      </div>

      {/* ── Context card ── */}
      {contextCard && (
        <div className="shell-panel px-5 py-4 sm:px-6">{contextCard}</div>
      )}

      {/* ── Body (loading / error / tabs) ── */}
      <DataState loading={loading} error={error} onRetry={onRetry}>
        {/* ── Tab bar ── */}
        {tabs.length > 0 && (
          <div className="shell-panel overflow-hidden px-0 py-0">
            <nav
              className="flex overflow-x-auto border-b border-[var(--border-subtle)]"
              role="tablist"
            >
              {tabs.map((tab) => {
                const isActive = tab.key === activeKey;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => handleTabClick(tab.key)}
                    className={`
                      relative flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors
                      ${isActive
                        ? 'text-[var(--accent-strong)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }
                    `}
                  >
                    {tab.icon && <span className="h-4 w-4">{tab.icon}</span>}
                    {tab.label}
                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                      <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent-soft)] px-1.5 text-[10px] font-bold text-[var(--accent-strong)]">
                        {tab.badge}
                      </span>
                    )}
                    {/* Active indicator line */}
                    {isActive && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--accent-strong)]" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* ── Tab content ── */}
            <div className="px-5 py-5 sm:px-6">{activeContent}</div>
          </div>
        )}
      </DataState>
    </section>
  );
}
