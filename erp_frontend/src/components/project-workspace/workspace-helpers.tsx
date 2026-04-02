'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════════
   Shared UI helpers used across workspace tabs
   ═══════════════════════════════════════════════════════════ */

export function StatPill({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'error' }) {
  const toneClass = {
    default: 'bg-[var(--surface-raised)] text-[var(--text-main)]',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-rose-50 text-rose-700',
  }[tone];
  return (
    <div className={`rounded-2xl border border-[var(--border-subtle)] px-4 py-3 ${toneClass}`}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-[var(--text-main)]">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>}
    </div>
  );
}

export class TabErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="py-12 text-center">
          <p className="text-sm text-rose-600 mb-2">Something went wrong rendering this tab.</p>
          <button className="text-sm text-[var(--accent)] hover:underline" onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
