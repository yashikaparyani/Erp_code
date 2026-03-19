'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Columns3,
  FileText,
  Flag,
  FolderTree,
  History,
  LayoutDashboard,
  Loader2,
  Search,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';
import { formatPercent } from '../dashboards/shared';
import { usePermissions } from '../../context/PermissionContext';
import { useWorkspacePermissions, WorkspacePermissions } from '../../context/WorkspacePermissionContext';

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

export type ProjectSummary = {
  name: string;
  project_name?: string;
  status?: string;
  customer?: string;
  company?: string;
  linked_tender?: string;
  project_head?: string;
  project_manager_user?: string;
  current_project_stage?: string;
  current_stage_status?: string;
  current_stage_owner_department?: string;
  spine_progress_pct?: number;
  spine_blocked?: number;
  blocker_summary?: string;
  total_sites?: number;
  expected_start_date?: string;
  expected_end_date?: string;
};

export type SiteRow = {
  name: string;
  site_code?: string;
  site_name?: string;
  status?: string;
  current_site_stage?: string;
  department_lane?: string;
  site_blocked?: number;
  blocker_reason?: string;
  current_owner_role?: string;
  current_owner_user?: string;
  site_progress_pct?: number;
  milestone_count?: number;
  open_milestone_count?: number;
  latest_planned_end_date?: string;
  latest_dpr_date?: string;
  modified?: string;
};

export type DepartmentLane = {
  department: string;
  label: string;
  allowed_stages: string[];
  site_count: number;
  blocked_count: number;
  avg_progress_pct: number;
  stage_coverage: Record<string, number>;
  sites: SiteRow[];
};

export type ProjectDetail = {
  project_summary: ProjectSummary;
  site_count: number;
  sites: SiteRow[];
  stage_coverage: Record<string, number>;
  department_lanes: Record<string, DepartmentLane>;
  selected_department_lane?: DepartmentLane | null;
  action_queue: {
    blocked_count: number;
    pending_count: number;
    overdue_count: number;
  };
  team_members: Array<{ name: string; user?: string; role_in_project?: string; linked_site?: string; is_active?: number }>;
  project_assets: Array<{ name: string; asset_name?: string; asset_type?: string; status?: string; linked_site?: string; assigned_to?: string }>;
};

export type ProjectDocument = {
  name: string;
  document_name?: string;
  category?: string;
  status?: string;
  linked_project?: string;
  linked_site?: string;
  file_url?: string;
  version?: string;
  expiry_date?: string;
  owner?: string;
  creation?: string;
  modified?: string;
};

export type ActivityEntry = {
  type: 'version' | 'comment' | 'site_comment' | 'workflow';
  ref_doctype: string;
  ref_name: string;
  actor: string;
  timestamp: string;
  summary: string;
  comment_type?: string;
  stage?: string;
  action?: string;
  detail?: string[];
};

export type TabKey = 'overview' | 'sites' | 'board' | 'milestones' | 'files' | 'activity';

export type DepartmentConfig = {
  departmentKey: string;
  departmentLabel: string;
  backHref: string;
  backLabel: string;
  kickerLabel: string;
  /** stages this department can see – undefined means all */
  allowedStages?: string[];
  tabs: TabKey[];
};

/* ═══════════════════════════════════════════════════════════
   API helper
   ═══════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════
   Tabs config
   ═══════════════════════════════════════════════════════════ */

const TAB_META: Record<TabKey, { label: string; icon: typeof LayoutDashboard }> = {
  overview:   { label: 'Overview',   icon: LayoutDashboard },
  sites:      { label: 'Sites',      icon: FolderTree },
  board:      { label: 'Site Board', icon: Columns3 },
  milestones: { label: 'Milestones', icon: Flag },
  files:      { label: 'Files',      icon: FileText },
  activity:   { label: 'Activity',   icon: History },
};

const SPINE_STAGES = [
  'SURVEY',
  'BOQ_DESIGN',
  'COSTING',
  'PROCUREMENT',
  'STORES_DISPATCH',
  'EXECUTION',
  'BILLING_PAYMENT',
  'OM_RMA',
  'CLOSED',
];

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

/* ═══════════════════════════════════════════════════════════
   Shared helpers
   ═══════════════════════════════════════════════════════════ */

function StatPill({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'error' }) {
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-[var(--text-main)]">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Overview Tab
   ═══════════════════════════════════════════════════════════ */

function OverviewTab({ detail, config, deptSites, projectId, onTabChange, wp }: { detail: ProjectDetail; config: DepartmentConfig; deptSites: SiteRow[]; projectId: string; onTabChange: (tab: TabKey) => void; wp: WorkspacePermissions | null }) {
  const ps = detail.project_summary;
  const aq = detail.action_queue;
  const allLanes = Object.values(detail.department_lanes || {});
  // Filter department lanes by workspace permissions when available
  const lanes = wp?.department_access
    ? allLanes.filter((lane) => {
        const access = wp.department_access[lane.department];
        return !access || access.can_view; // allow if no access entry (not gated)
      })
    : allLanes;
  const isDept = config.departmentKey !== 'all';

  const blockedCount = isDept
    ? deptSites.filter((s) => s.site_blocked).length
    : aq.blocked_count;
  const progressAvg = isDept
    ? (deptSites.reduce((sum, s) => sum + (s.site_progress_pct || 0), 0) / (deptSites.length || 1))
    : (ps.spine_progress_pct || 0);

  // Stage coverage — filtered to department stages if applicable
  const visibleCoverage = useMemo(() => {
    if (!config.allowedStages) return detail.stage_coverage || {};
    const filtered: Record<string, number> = {};
    for (const stage of config.allowedStages) {
      if ((detail.stage_coverage || {})[stage] !== undefined) {
        filtered[stage] = detail.stage_coverage[stage];
      }
    }
    return filtered;
  }, [detail.stage_coverage, config.allowedStages]);

  return (
    <div className="space-y-8">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <button onClick={() => onTabChange('sites')} className="text-left">
          <StatPill label={isDept ? `${config.departmentLabel} Sites` : 'Total Sites'} value={isDept ? deptSites.length : detail.site_count} />
        </button>
        <StatPill label={isDept ? 'Avg Progress' : 'Spine Progress'} value={formatPercent(progressAvg)} tone="success" />
        <button onClick={() => onTabChange('sites')} className="text-left">
          <StatPill label="Blocked" value={blockedCount} tone={blockedCount ? 'error' : 'default'} />
        </button>
        {!isDept && <StatPill label="Overdue" value={aq.overdue_count} tone={aq.overdue_count ? 'warning' : 'default'} />}
        {isDept && <StatPill label="Total Project Sites" value={detail.site_count} />}
      </div>

      {/* Project metadata + team */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header"><h4 className="font-semibold text-[var(--text-main)]">Project Details</h4></div>
          <div className="card-body">
            <dl className="space-y-2 text-sm">
              {([
                ['Customer', ps.customer],
                ['Company', ps.company],
                ['Project Head', ps.project_head],
                ['Project Manager', ps.project_manager_user],
                ['Current Stage', ps.current_project_stage],
                ['Stage Status', ps.current_stage_status],
                ['Owner Dept', ps.current_stage_owner_department],
                ['Linked Tender', ps.linked_tender],
                ['Dates', `${ps.expected_start_date || '?'} → ${ps.expected_end_date || '?'}`],
                ['Status', ps.status],
              ] as [string, string | undefined][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">{k}</dt>
                  <dd className="font-medium text-[var(--text-main)] text-right">{v || '-'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><h4 className="font-semibold text-[var(--text-main)]">Team</h4></div>
            <div className="card-body">
              {!detail.team_members?.length ? (
                <p className="text-sm text-[var(--text-muted)]">No team members assigned.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {detail.team_members.slice(0, 10).map((m) => (
                    <div key={m.name} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                      <span className="font-medium text-[var(--text-main)]">{m.user || 'Unknown'}</span>
                      <span className="text-[var(--text-muted)]">{(m.role_in_project || '-').replaceAll('_', ' ')}</span>
                    </div>
                  ))}
                  {detail.team_members.length > 10 && (
                    <p className="text-xs text-[var(--text-muted)]">+ {detail.team_members.length - 10} more</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {ps.blocker_summary && (
            <div className="card border-rose-200 bg-rose-50/50">
              <div className="card-body">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-500" />
                  <div>
                    <h4 className="text-sm font-semibold text-rose-700">Blocker Summary</h4>
                    <p className="mt-1 text-sm text-rose-600">{ps.blocker_summary}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stage distribution */}
      {Object.keys(visibleCoverage).length > 0 && (
        <div>
          <SectionHeader title="Stage Distribution" subtitle={isDept ? `Stages within ${config.departmentLabel} lane` : 'How sites are distributed across the lifecycle'} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Object.entries(visibleCoverage).map(([stage, count]) => (
              <div key={stage} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 text-center">
                <div className="text-xs font-medium text-[var(--text-muted)]">{stage.replaceAll('_', ' ')}</div>
                <div className="mt-1 text-xl font-bold text-[var(--text-main)]">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department lanes — show all lanes for 'all', highlight own lane for department view */}
      {lanes.length > 0 && (
        <div>
          <SectionHeader
            title={isDept ? 'All Department Lanes' : 'Department Lanes'}
            subtitle="Each department operates on sites within its stage window"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lanes.map((lane) => {
              const isOwn = isDept && lane.department === config.departmentKey;
              return (
                <div key={lane.department} className={`card ${isOwn ? 'ring-2 ring-[var(--accent)]' : ''}`}>
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-[var(--text-main)]">
                        {lane.label}
                        {isOwn && <span className="ml-2 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">Current</span>}
                      </h5>
                      <span className="text-xs text-[var(--text-muted)]">{lane.site_count} sites</span>
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">{lane.allowed_stages.join(' → ')}</div>
                    <div className="mt-3 flex gap-4 text-sm">
                      <span>Avg {formatPercent(lane.avg_progress_pct || 0)}</span>
                      {lane.blocked_count > 0 && <span className="text-rose-600">{lane.blocked_count} blocked</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity Preview */}
      <RecentActivityPreview projectId={projectId} onViewAll={() => onTabChange('activity')} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Recent Activity Preview (used in Overview)
   ═══════════════════════════════════════════════════════════ */

function RecentActivityPreview({ projectId, onViewAll }: { projectId: string; onViewAll: () => void }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await callOps<ActivityEntry[]>('get_project_activity', { project: projectId, limit: 5 });
        if (active) setEntries(data);
      } catch {
        // Silently skip — overview still works without activity
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  const typeLabel: Record<string, string> = { version: 'Update', comment: 'Comment', site_comment: 'Site', workflow: 'Workflow' };
  const typeBg: Record<string, string> = { version: 'bg-blue-50 text-blue-700', comment: 'bg-violet-50 text-violet-700', site_comment: 'bg-amber-50 text-amber-700', workflow: 'bg-emerald-50 text-emerald-700' };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionHeader title="Recent Activity" subtitle="Latest changes across the project" />
        <button onClick={onViewAll} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">View all</button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-sm text-[var(--text-muted)]">No recent activity.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={`${entry.type}-${entry.timestamp}-${idx}`} className="flex gap-3 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5">
              <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeBg[entry.type] || 'bg-gray-100 text-gray-600'}`}>
                {typeLabel[entry.type] || entry.type}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--text-main)]">{entry.summary}</p>
                <div className="mt-0.5 flex gap-3 text-[11px] text-[var(--text-muted)]">
                  <span>{entry.actor}</span>
                  <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Sites Tab
   ═══════════════════════════════════════════════════════════ */

function SitesTab({ sites, config }: { sites: SiteRow[]; config: DepartmentConfig }) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  const stages = useMemo(() => [...new Set(sites.map((s) => s.current_site_stage || 'SURVEY'))].sort(), [sites]);

  const filtered = useMemo(() => {
    let result = sites;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          (s.site_name || '').toLowerCase().includes(q) ||
          (s.site_code || '').toLowerCase().includes(q) ||
          (s.name || '').toLowerCase().includes(q),
      );
    }
    if (stageFilter) {
      result = result.filter((s) => (s.current_site_stage || 'SURVEY') === stageFilter);
    }
    return result;
  }, [sites, search, stageFilter]);

  const isDept = config.departmentKey !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {filtered.length} of {sites.length} sites{isDept ? ` in ${config.departmentLabel} lane` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search sites..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">All Stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {!filtered.length ? (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">No sites match the current filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Dept Lane</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Milestones</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Target Date</th>
                <th className="px-4 py-3 font-medium">Last Updated</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((site) => (
                <tr key={site.name} className="hover:bg-[var(--surface-raised)]/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-main)]">{site.site_name || site.site_code || site.name}</div>
                    {site.site_code && site.site_name && <div className="text-xs text-[var(--text-muted)]">{site.site_code}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {(site.current_site_stage || 'SURVEY').replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{(site.department_lane || '-').replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-gray-200">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(site.site_progress_pct || 0, 100)}%` }} />
                      </div>
                      <span className="text-xs">{formatPercent(site.site_progress_pct || 0)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {site.open_milestone_count || 0} open / {site.milestone_count || 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[var(--text-main)]">{(site.current_owner_role || '-').replaceAll('_', ' ')}</div>
                    <div className="text-xs text-[var(--text-muted)]">{site.current_owner_user || 'Unassigned'}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{site.latest_planned_end_date || '-'}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {site.modified
                      ? new Date(site.modified).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : site.latest_dpr_date || '-'
                    }
                  </td>
                  <td className="px-4 py-3">
                    {site.site_blocked ? (
                      <span className="inline-block rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">Blocked</span>
                    ) : (
                      <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{site.status || 'Active'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Files Tab
   ═══════════════════════════════════════════════════════════ */

function FilesTab({ projectId, wp }: { projectId: string; wp: WorkspacePermissions | null }) {
  const canUpload = wp?.can_upload_files ?? true;
  const canDelete = wp?.can_delete_files ?? false;
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await callOps<ProjectDocument[]>('get_project_documents', { project: projectId });
        if (active) setDocs(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading documents...</div>;
  if (error) return <p className="py-12 text-center text-sm text-rose-600">{error}</p>;
  if (!docs.length) return <p className="py-12 text-center text-sm text-[var(--text-muted)]">No documents are linked to this project yet.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">Document</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Site</th>
            <th className="px-4 py-3 font-medium">Version</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Uploaded By</th>
            <th className="px-4 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {docs.map((doc) => (
            <tr key={doc.name} className="hover:bg-[var(--surface-raised)]/60">
              <td className="px-4 py-3">
                <div className="font-medium text-[var(--text-main)]">{doc.document_name || doc.name}</div>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                    View file
                  </a>
                )}
              </td>
              <td className="px-4 py-3 text-[var(--text-muted)]">{doc.category || '-'}</td>
              <td className="px-4 py-3 text-[var(--text-muted)]">{doc.linked_site || 'Project-level'}</td>
              <td className="px-4 py-3 text-[var(--text-muted)]">{doc.version || '-'}</td>
              <td className="px-4 py-3">
                <span className="inline-block rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {doc.status || 'Active'}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--text-muted)]">{doc.owner || '-'}</td>
              <td className="px-4 py-3 text-[var(--text-muted)]">{doc.creation ? new Date(doc.creation).toLocaleDateString('en-IN') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Activity Tab
   ═══════════════════════════════════════════════════════════ */

function ActivityTab({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await callOps<ActivityEntry[]>('get_project_activity', { project: projectId, limit: 50 });
        if (active) setEntries(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading activity...</div>;
  if (error) return <p className="py-12 text-center text-sm text-rose-600">{error}</p>;
  if (!entries.length) return <p className="py-12 text-center text-sm text-[var(--text-muted)]">No activity recorded for this project yet.</p>;

  const typeLabel: Record<string, string> = { version: 'Update', comment: 'Comment', site_comment: 'Site', workflow: 'Workflow' };
  const typeBg: Record<string, string> = { version: 'bg-blue-50 text-blue-700', comment: 'bg-violet-50 text-violet-700', site_comment: 'bg-amber-50 text-amber-700', workflow: 'bg-emerald-50 text-emerald-700' };

  return (
    <div className="space-y-3">
      {entries.map((entry, idx) => (
        <div key={`${entry.type}-${entry.timestamp}-${idx}`} className="flex gap-4 rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3">
          <div className="pt-0.5">
            <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeBg[entry.type] || 'bg-gray-100 text-gray-600'}`}>
              {typeLabel[entry.type] || entry.type}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[var(--text-main)]">{entry.summary}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
              <span>{entry.actor}</span>
              <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
              {entry.ref_doctype === 'GE Site' && <span>Site: {entry.ref_name}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Site Board Tab
   ═══════════════════════════════════════════════════════════ */

const STAGE_COLUMN_COLORS: Record<string, string> = {
  SURVEY: 'border-t-sky-400',
  BOQ_DESIGN: 'border-t-indigo-400',
  COSTING: 'border-t-amber-400',
  PROCUREMENT: 'border-t-orange-400',
  STORES_DISPATCH: 'border-t-lime-500',
  EXECUTION: 'border-t-teal-500',
  BILLING_PAYMENT: 'border-t-emerald-500',
  OM_RMA: 'border-t-violet-400',
  CLOSED: 'border-t-gray-400',
};

function SiteBoardTab({ sites, config }: { sites: SiteRow[]; config: DepartmentConfig }) {
  const visibleStages = config.allowedStages || SPINE_STAGES;

  const columns = useMemo(() => {
    const grouped: Record<string, SiteRow[]> = {};
    for (const stage of visibleStages) grouped[stage] = [];
    for (const site of sites) {
      const stage = site.current_site_stage || 'SURVEY';
      if (grouped[stage]) grouped[stage].push(site);
    }
    return visibleStages.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage] || stage.replaceAll('_', ' '),
      sites: grouped[stage] || [],
    }));
  }, [sites, visibleStages]);

  if (!sites.length) {
    return <p className="py-12 text-center text-sm text-[var(--text-muted)]">No sites to display on the board.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        {sites.length} sites grouped by lifecycle stage
        {config.departmentKey !== 'all' ? ` (${config.departmentLabel} lane)` : ''}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map(({ stage, label, sites: colSites }) => (
          <div
            key={stage}
            className={`flex w-64 flex-shrink-0 flex-col rounded-xl border border-[var(--border-subtle)] border-t-4 bg-white ${STAGE_COLUMN_COLORS[stage] || 'border-t-gray-300'}`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-main)]">{label}</h4>
              <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                {colSites.length}
              </span>
            </div>
            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2 p-2" style={{ minHeight: '5rem' }}>
              {colSites.length === 0 && (
                <p className="py-4 text-center text-[11px] text-[var(--text-muted)]">No sites</p>
              )}
              {colSites.map((site) => (
                <div
                  key={site.name}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm"
                >
                  <div className="font-medium text-[var(--text-main)] truncate">
                    {site.site_name || site.site_code || site.name}
                  </div>
                  {site.site_code && site.site_name && (
                    <div className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate">{site.site_code}</div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(site.site_progress_pct || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                      {formatPercent(site.site_progress_pct || 0)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">
                      {(site.current_owner_role || '-').replaceAll('_', ' ')}
                    </span>
                    {site.site_blocked ? (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">Blocked</span>
                    ) : (
                      <span className="text-emerald-600">{site.status || 'Active'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Milestones Tab
   ═══════════════════════════════════════════════════════════ */

type MilestoneRecord = {
  name: string;
  milestone_name?: string;
  status?: string;
  linked_project?: string;
  linked_site?: string;
  planned_date?: string;
  actual_date?: string;
  owner_user?: string;
};

function MilestonesTab({ sites, projectId, config }: { sites: SiteRow[]; projectId: string; config: DepartmentConfig }) {
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [msLoading, setMsLoading] = useState(true);
  const [msError, setMsError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setMsLoading(true);
      try {
        const data = await callOps<MilestoneRecord[]>('get_milestones', { project: projectId });
        if (active) setMilestones(data);
      } catch (err) {
        if (active) setMsError(err instanceof Error ? err.message : 'Failed to load milestones');
      } finally {
        if (active) setMsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  const visibleStages = config.allowedStages || SPINE_STAGES;

  // Build stage-level milestone rows from real site data
  const stageRows = useMemo(() => {
    return visibleStages.map((stage) => {
      const label = STAGE_LABELS[stage] || stage.replaceAll('_', ' ');
      const stageIdx = SPINE_STAGES.indexOf(stage);

      // Sites currently in this stage
      const inStage = sites.filter((s) => (s.current_site_stage || 'SURVEY') === stage);
      // Sites past this stage (higher index)
      const pastStage = sites.filter((s) => {
        const idx = SPINE_STAGES.indexOf(s.current_site_stage || 'SURVEY');
        return idx > stageIdx;
      });
      const blocked = inStage.filter((s) => s.site_blocked);

      // Find related milestones
      const relatedMs = milestones.filter((m) =>
        (m.milestone_name || '').toUpperCase().includes(stage.replaceAll('_', ' ')) ||
        (m.milestone_name || '').toUpperCase().includes(stage)
      );

      return { stage, label, inStage, pastStage, blocked, relatedMs };
    });
  }, [sites, milestones, visibleStages]);

  const totalSites = sites.length;

  if (msLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading milestones...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Could not load milestone records: {msError}. Showing stage-based overview.
        </div>
      )}

      <p className="text-sm text-[var(--text-muted)]">
        Lifecycle milestone progress across {totalSites} sites
        {config.departmentKey !== 'all' ? ` (${config.departmentLabel} lane)` : ''}
      </p>

      <div className="space-y-3">
        {stageRows.map(({ stage, label, inStage, pastStage, blocked, relatedMs }) => {
          const completedPct = totalSites > 0 ? Math.round((pastStage.length / totalSites) * 100) : 0;
          return (
            <div
              key={stage}
              className="rounded-xl border border-[var(--border-subtle)] bg-white"
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-[var(--text-main)]">{label}</h4>
                    {blocked.length > 0 && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                        {blocked.length} blocked
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 w-40 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${completedPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{completedPct}% passed</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{inStage.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">In Stage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600">{pastStage.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${blocked.length ? 'text-rose-600' : 'text-[var(--text-muted)]'}`}>{blocked.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Blocked</div>
                  </div>
                </div>
              </div>

              {/* Related milestone records */}
              {relatedMs.length > 0 && (
                <div className="border-t border-[var(--border-subtle)] px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    {relatedMs.map((m) => (
                      <div key={m.name} className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface-raised)] px-2.5 py-1 text-xs">
                        <Flag className="h-3 w-3 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-main)]">{m.milestone_name}</span>
                        <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                          m.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                          m.status === 'Overdue' ? 'bg-rose-50 text-rose-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {m.status || 'Open'}
                        </span>
                        {m.planned_date && <span className="text-[var(--text-muted)]">{m.planned_date}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Shell
   ═══════════════════════════════════════════════════════════ */

export default function WorkspaceShell({ projectId, config }: { projectId: string; config: DepartmentConfig }) {
  const { permissions, isLoaded: isPermissionLoaded } = usePermissions();
  const { wp, isLoaded: isWpLoaded, loadForProject, canViewDepartment } = useWorkspacePermissions();

  // Load workspace permissions for this project
  useEffect(() => {
    if (projectId) { void loadForProject(projectId); }
  }, [projectId, loadForProject]);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>(config.tabs[0] || 'overview');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!projectId) return;
      setLoading(true);
      setError('');
      try {
        const data = await callOps<ProjectDetail>('get_project_spine_detail', {
          project: projectId,
          ...(config.departmentKey !== 'all' ? { department: config.departmentKey } : {}),
        });
        if (!active) return;
        setDetail(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load project workspace');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [projectId, reloadKey]);

  // Filter sites by department's allowed stages
  const deptSites = useMemo(() => {
    if (!detail?.sites) return [];
    if (config.departmentKey !== 'all' && detail.selected_department_lane?.sites?.length) {
      return detail.selected_department_lane.sites;
    }
    if (!config.allowedStages) return detail.sites;
    const allowed = new Set(config.allowedStages);
    return detail.sites.filter((s) => allowed.has(s.current_site_stage || 'SURVEY'));
  }, [detail?.sites, detail?.selected_department_lane, config.allowedStages, config.departmentKey]);

  /* –– Loading / Error states –– */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading {config.kickerLabel.toLowerCase()}...</span>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-rose-600">{error || 'Project not found'}</p>
        <button onClick={() => setReloadKey((k) => k + 1)} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  const ps = detail.project_summary;
  const visibleTabs = useMemo(() => {
    const configured = config.tabs;
    // Prefer project-scoped workspace permissions when loaded
    const tabSource = isWpLoaded && wp?.visible_tabs?.length
      ? wp.visible_tabs
      : (isPermissionLoaded && permissions?.visible_tabs?.length
        ? permissions.visible_tabs
        : null);

    if (!tabSource) return configured;

    const backendVisible = new Set(
      tabSource.filter((tab): tab is TabKey => configured.includes(tab as TabKey)),
    );

    const intersected = configured.filter((tab) => backendVisible.has(tab));
    return intersected.length ? intersected : configured;
  }, [config.tabs, isPermissionLoaded, permissions?.visible_tabs, isWpLoaded, wp?.visible_tabs]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] || 'overview');
    }
  }, [activeTab, visibleTabs]);

  return (
    <div className="space-y-0">
      {/* ── Workspace Header ── */}
      <div className="workspace-hero mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link href={config.backHref} className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">
              <ArrowLeft className="h-3.5 w-3.5" /> {config.backLabel}
            </Link>
            <div className="workspace-kicker">{config.kickerLabel}</div>
            <h1 className="mt-2 text-[clamp(1.5rem,2.2vw,2.2rem)] font-semibold tracking-tight text-[var(--text-main)]">
              {ps.project_name || projectId}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {ps.customer || 'No customer'} &middot; {(ps.current_project_stage || 'SURVEY').replaceAll('_', ' ')} &middot; {formatPercent(ps.spine_progress_pct || 0)} complete
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:pt-6">
            {config.departmentKey !== 'all' && (
              <div className="workspace-chip !border-blue-200 !bg-blue-50 !text-blue-700">{config.departmentLabel}</div>
            )}
            <div className="workspace-chip">{config.departmentKey === 'all' ? detail.site_count : deptSites.length} sites</div>
            <div className="workspace-chip">{ps.status || 'Open'}</div>
            {detail.action_queue.blocked_count > 0 && (
              <div className="workspace-chip !border-rose-200 !bg-rose-50 !text-rose-600">{detail.action_queue.blocked_count} blocked</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="mb-6 border-b border-[var(--border-subtle)]">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Workspace tabs">
          {visibleTabs.map((tabKey) => {
            const meta = TAB_META[tabKey];
            const active = tabKey === activeTab;
            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-[var(--accent)] text-[var(--accent-strong)]'
                    : 'border-transparent text-[var(--text-muted)] hover:border-gray-300 hover:text-[var(--text-main)]'
                }`}
              >
                <meta.icon className="h-4 w-4" />
                {meta.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'overview' && <OverviewTab detail={detail} config={config} deptSites={deptSites} projectId={projectId} onTabChange={setActiveTab} wp={wp} />}
      {activeTab === 'sites' && <SitesTab sites={deptSites} config={config} />}
      {activeTab === 'board' && <SiteBoardTab sites={deptSites} config={config} />}
      {activeTab === 'milestones' && <MilestonesTab sites={deptSites} projectId={projectId} config={config} />}
      {activeTab === 'files' && <FilesTab projectId={projectId} wp={wp} />}
      {activeTab === 'activity' && <ActivityTab projectId={projectId} />}
    </div>
  );
}
