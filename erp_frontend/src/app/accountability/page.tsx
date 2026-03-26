'use client';

import { Suspense, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AccountabilityDashboard } from '../../components/accountability/AccountabilityDashboard';

/* ─────────────────────── filter bar ─────────────────────── */

function FilterBar({
  project, site, department,
  onChange,
}: {
  project: string; site: string; department: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        type="text"
        placeholder="Filter by project…"
        value={project}
        onChange={(e) => onChange('project', e.target.value)}
        className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] w-44"
      />
      <input
        type="text"
        placeholder="Filter by site…"
        value={site}
        onChange={(e) => onChange('site', e.target.value)}
        className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] w-40"
      />
      <input
        type="text"
        placeholder="Filter by department…"
        value={department}
        onChange={(e) => onChange('department', e.target.value)}
        className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] w-44"
      />
      <button
        onClick={() => { onChange('project', ''); onChange('site', ''); onChange('department', ''); }}
        className="h-8 rounded-lg border border-[var(--border)] px-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        Clear
      </button>
    </div>
  );
}

/* ─────────────────────── page ─────────────────────── */

export default function AccountabilityPage() {
  const [filters, setFilters] = useState({ project: '', site: '', department: '' });

  function handleChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Accountability &amp; Traceability</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Director / RCA command center — track ownership, blocks, escalations, and rejections across all projects
          </p>
        </div>
        <FilterBar {...filters} onChange={handleChange} />
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        }
      >
        <AccountabilityDashboard
          project={filters.project || undefined}
          site={filters.site || undefined}
          department={filters.department || undefined}
        />
      </Suspense>
    </div>
  );
}
