'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Search, AlertCircle } from 'lucide-react';
import { formatPercent } from '../dashboards/shared';

/* ─── types ──────────────────────────────────────────────── */

type ProjectListItem = {
  name: string;
  project_name?: string;
  customer?: string;
  current_project_stage?: string;
  project_head?: string;
  project_manager_user?: string;
  total_sites?: number;
  spine_progress_pct?: number;
  spine_blocked?: number;
  blocker_summary?: string;
  status?: string;
};

export type DeptProjectListConfig = {
  departmentKey: string;
  departmentLabel: string;
  workspaceBasePath: string;   // e.g. '/engineering/projects'
  parentHref: string;          // e.g. '/engineering'
  parentLabel: string;         // e.g. 'Engineering'
  accentColor: string;         // tailwind bg class for the dept badge
  allowedStages?: string[];
};

/* ─── API helper ─────────────────────────────────────────── */

async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to load data');
  }
  return (payload.data ?? payload) as T;
}

/* ─── Component ──────────────────────────────────────────── */

export default function DepartmentProjectList({ config }: { config: DeptProjectListConfig }) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await callOps<ProjectListItem[]>('get_project_spine_list', {
          ...(config.departmentKey !== 'all' ? { department: config.departmentKey } : {}),
        });
        if (active) setProjects(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [config.departmentKey]);

  const filtered = search
    ? projects.filter((p) => {
        const q = search.toLowerCase();
        return (
          (p.project_name || '').toLowerCase().includes(q) ||
          (p.customer || '').toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
        );
      })
    : projects;

  const departmentFiltered = filtered;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="workspace-hero">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link href={config.parentHref} className="hover:text-[var(--text-main)]">{config.parentLabel}</Link>
          <span>/</span>
          <span className="text-[var(--text-main)]">Projects</span>
        </div>
        <div className="workspace-kicker mt-3">{config.departmentLabel}</div>
        <h1 className="mt-2 text-[clamp(1.5rem,2.2vw,2.2rem)] font-semibold tracking-tight text-[var(--text-main)]">
          Project Workspace
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Select a project to open the {config.departmentLabel.toLowerCase()} iteration of the workspace.
        </p>
      </div>

      {/* Search + count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-muted)]">{departmentFiltered.length} relevant projects</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-[var(--border-subtle)] bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Project cards */}
      {!departmentFiltered.length ? (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">No department-relevant projects found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departmentFiltered.map((p) => (
            <Link
              key={p.name}
              href={`${config.workspaceBasePath}/${encodeURIComponent(p.name)}`}
              className="group card transition-shadow hover:shadow-md"
            >
              <div className="card-body">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-[var(--text-main)] group-hover:text-[var(--accent-strong)]">
                      {p.project_name || p.name}
                    </h3>
                    <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{p.customer || 'No customer'}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-strong)]" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-block rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    {(p.current_project_stage || 'SURVEY').replaceAll('_', ' ')}
                  </span>
                  <span className="inline-block rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    {p.total_sites || 0} sites
                  </span>
                  {(p.spine_blocked ?? 0) > 0 && (
                    <span className="inline-block rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">Blocked</span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(p.spine_progress_pct || 0, 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-[var(--text-muted)]">{formatPercent(p.spine_progress_pct || 0)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
