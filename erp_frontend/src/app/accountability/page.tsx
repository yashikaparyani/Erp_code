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
        className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
      />
      <input
        type="text"
        placeholder="Filter by site…"
        value={site}
        onChange={(e) => onChange('site', e.target.value)}
        className="h-8 w-40 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
      />
      <input
        type="text"
        placeholder="Filter by department…"
        value={department}
        onChange={(e) => onChange('department', e.target.value)}
        className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
      />
      <button
        onClick={() => { onChange('project', ''); onChange('site', ''); onChange('department', ''); }}
        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/40 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Command Center</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Accountability &amp; Traceability</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Director / RCA command center — track ownership, blocks, escalations, and rejections across all projects
              </p>
            </div>
            <FilterBar {...filters} onChange={handleChange} />
          </div>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
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
    </div>
  );
}
