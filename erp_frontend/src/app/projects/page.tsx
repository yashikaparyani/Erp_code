'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  FolderTree,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { formatPercent } from '../../components/dashboards/shared';

type ProjectListItem = {
  name: string;
  project_name?: string;
  customer?: string;
  current_project_stage?: string;
  current_stage_status?: string;
  project_head?: string;
  project_manager_user?: string;
  total_sites?: number;
  spine_progress_pct?: number;
  spine_blocked?: number;
  blocker_summary?: string;
  status?: string;
};

async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to load projects');
  }
  return (payload.data ?? payload) as T;
}

const STAGE_LABELS: Record<string, string> = {
  SURVEY: 'Survey',
  BOQ_DESIGN: 'BOQ / Design',
  COSTING: 'Costing',
  PROCUREMENT: 'Procurement',
  STORES_DISPATCH: 'Stores / Dispatch',
  EXECUTION: 'Execution / I&C',
  BILLING_PAYMENT: 'Billing / Payment',
  OM_RMA: 'O&M / RMA',
  CLOSED: 'Closed',
};

function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'warning' | 'error';
}) {
  const toneClasses = {
    default: 'border-[var(--border-subtle)] bg-white text-[var(--text-main)]',
    success: 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50/70 text-amber-800',
    error: 'border-rose-200 bg-rose-50/70 text-rose-800',
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function ProjectsDashboardPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await callOps<ProjectListItem[]>('get_project_spine_list');
        if (active) setProjects(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((project) =>
      [project.project_name, project.name, project.customer, project.project_head, project.project_manager_user]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [projects, search]);

  const blockedProjects = projects.filter((project) => (project.spine_blocked || 0) > 0).length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + (project.spine_progress_pct || 0), 0) / projects.length)
    : 0;
  const activeProjects = projects.filter((project) => (project.status || 'Open') !== 'Completed').length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading project dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="workspace-hero">
        <div className="workspace-kicker">Project Command Center</div>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[clamp(1.7rem,2.5vw,2.5rem)] font-semibold tracking-tight text-[var(--text-main)]">
              Projects Dashboard
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Project Manager and Project Head start here. Open any project to see overview, site list, site board, files, and activity in one workspace.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-white px-3 py-2 shadow-sm">
            <Sparkles className="h-4 w-4 text-[var(--accent-strong)]" />
            <span className="text-xs font-medium text-[var(--text-muted)]">RISE-style list → overview → site list flow</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Projects" value={projects.length} />
        <MetricCard label="Active" value={activeProjects} tone="success" />
        <MetricCard label="Blocked" value={blockedProjects} tone={blockedProjects ? 'error' : 'default'} />
        <MetricCard label="Avg Progress" value={formatPercent(avgProgress)} tone="warning" />
      </div>

      <div className="rounded-3xl border border-[var(--border-subtle)] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-main)]">Projects</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Click a row to open the project workspace with overview and site list.
            </p>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search projects, client, PM..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        {!filteredProjects.length ? (
          <div className="px-6 py-20 text-center text-sm text-[var(--text-muted)]">
            No projects match the current search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-6 py-4 font-medium">Project</th>
                  <th className="px-4 py-4 font-medium">Client</th>
                  <th className="px-4 py-4 font-medium">Stage</th>
                  <th className="px-4 py-4 font-medium">Sites</th>
                  <th className="px-4 py-4 font-medium">Progress</th>
                  <th className="px-4 py-4 font-medium">Project Manager</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredProjects.map((project) => {
                  const href = `/projects/${encodeURIComponent(project.name)}`;
                  const blocked = (project.spine_blocked || 0) > 0;
                  return (
                    <tr key={project.name} className="group hover:bg-[var(--surface-raised)]/55 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={href} className="block">
                          <div className="font-semibold text-[var(--text-main)] group-hover:text-[var(--accent-strong)]">
                            {project.project_name || project.name}
                          </div>
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            {project.project_head || 'No project head'}{blocked && ` · ${project.blocker_summary || 'Blocked'}`}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-[var(--text-muted)]">{project.customer || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {STAGE_LABELS[project.current_project_stage || ''] || (project.current_project_stage || 'SURVEY').replaceAll('_', ' ')}
                          </span>
                          {project.current_stage_status && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600">
                              {project.current_stage_status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-2 text-[var(--text-main)]">
                          <FolderTree className="h-4 w-4 text-[var(--text-muted)]" />
                          <span className="font-medium">{project.total_sites || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[140px] items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${blocked ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(project.spine_progress_pct || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[var(--text-muted)]">
                            {formatPercent(project.spine_progress_pct || 0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[var(--text-muted)]">{project.project_manager_user || '—'}</td>
                      <td className="px-4 py-4">
                        {blocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                            <ShieldAlert className="h-3.5 w-3.5" />Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            {project.status || 'Open'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-main)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                        >
                          Open workspace <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
