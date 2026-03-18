'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FolderTree, Layers3, ShieldAlert, Target, Users } from 'lucide-react';
import {
  DashboardShell,
  EmptyState,
  MetricList,
  SectionCard,
  StatCard,
  formatPercent,
} from '../../../components/dashboards/shared';

type ProjectSummary = {
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

type SiteRow = {
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
};

type DepartmentLane = {
  department: string;
  label: string;
  allowed_stages: string[];
  site_count: number;
  blocked_count: number;
  avg_progress_pct: number;
  stage_coverage: Record<string, number>;
  sites: SiteRow[];
};

type ProjectDetail = {
  project_summary: ProjectSummary;
  site_count: number;
  sites: SiteRow[];
  stage_coverage: Record<string, number>;
  department_lanes: Record<string, DepartmentLane>;
  action_queue: {
    blocked_count: number;
    pending_count: number;
    overdue_count: number;
  };
  team_members: Array<{ name: string; user?: string; role_in_project?: string; linked_site?: string; is_active?: number }>;
  project_assets: Array<{ name: string; asset_name?: string; asset_type?: string; status?: string; linked_site?: string; assigned_to?: string }>;
};

async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to load project detail');
  }
  return (payload.data ?? payload) as T;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params?.id || '');
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!projectId) return;
      setLoading(true);
      setError('');
      try {
        const data = await callOps<ProjectDetail>('get_project_spine_detail', { project: projectId });
        if (!active) return;
        setDetail(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load project detail');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [projectId, reloadKey]);

  const laneCards = useMemo(() => Object.values(detail?.department_lanes || {}), [detail]);

  return (
    <DashboardShell
      title="Project Site Breakdown"
      subtitle="Projects are aggregated through sites, stages, and department lanes"
      loading={loading}
      error={error}
      onRetry={() => setReloadKey((value) => value + 1)}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Project Spine</div>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{detail?.project_summary?.project_name || projectId}</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Departments should work this project only through its sites and their current lifecycle stages.
          </p>
        </div>
        <Link href="/projects" className="btn btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Sites" value={detail?.site_count || 0} hint="Project execution units" icon={FolderTree} tone="blue" />
        <StatCard title="Project Stage" value={detail?.project_summary?.current_project_stage || '-'} hint={detail?.project_summary?.current_stage_status || 'No stage state'} icon={Layers3} tone="orange" />
        <StatCard title="Spine Progress" value={formatPercent(detail?.project_summary?.spine_progress_pct || 0)} hint="Computed from site stages" icon={Target} tone="green" />
        <StatCard title="Blocked Sites" value={detail?.action_queue?.blocked_count || 0} hint={`Pending ${detail?.action_queue?.pending_count || 0} | Overdue ${detail?.action_queue?.overdue_count || 0}`} icon={ShieldAlert} tone="red" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Project Summary" subtitle="Top-level ownership stays with project-side roles">
          {detail?.project_summary ? (
            <MetricList
              items={[
                { label: 'Project', value: detail.project_summary.project_name || detail.project_summary.name || '-' },
                { label: 'Customer', value: detail.project_summary.customer || '-' },
                { label: 'Company', value: detail.project_summary.company || '-' },
                { label: 'Project Head', value: detail.project_summary.project_head || '-' },
                { label: 'Project Manager', value: detail.project_summary.project_manager_user || '-' },
                { label: 'Current Owner Dept', value: detail.project_summary.current_stage_owner_department || '-' },
                { label: 'Tender', value: detail.project_summary.linked_tender || '-' },
                { label: 'Dates', value: `${detail.project_summary.expected_start_date || '-'} -> ${detail.project_summary.expected_end_date || '-'}` },
              ]}
            />
          ) : (
            <EmptyState message="Project summary not available." />
          )}
        </SectionCard>

        <SectionCard title="Workforce & Assets" subtitle="People and deployed material linked back to this project">
          <MetricList
            items={[
              { label: 'Team Members', value: detail?.team_members?.length || 0 },
              { label: 'Active Team Members', value: detail?.team_members?.filter((item) => item.is_active !== 0).length || 0 },
              { label: 'Project Assets', value: detail?.project_assets?.length || 0 },
              { label: 'Blocked Summary', value: detail?.project_summary?.blocker_summary || 'No project-level blocker summary' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Stage Coverage" subtitle="How site volume is distributed across the lifecycle">
          {!detail ? (
            <EmptyState message="Stage coverage unavailable." />
          ) : (
            <div className="space-y-3">
              {Object.entries(detail.stage_coverage || {}).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
                  <div className="text-sm font-medium text-[var(--text-main)]">{stage}</div>
                  <div className="text-sm text-[var(--text-muted)]">{count} sites</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Department Lanes" subtitle="Each department should understand the project only through site-level stage reality">
          {!laneCards.length ? (
            <EmptyState message="No department lanes are available for this project." />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {laneCards.map((lane) => (
                <div key={lane.department} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-main)]">{lane.label}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">{lane.allowed_stages.join(' -> ')}</div>
                    </div>
                    <div className="text-right text-xs text-[var(--text-muted)]">
                      <div>{lane.site_count} sites</div>
                      <div>{lane.blocked_count} blocked</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-[18px] border border-[var(--border-subtle)] px-3 py-2">
                      <div className="text-[var(--text-muted)]">Avg Progress</div>
                      <div className="mt-1 font-semibold text-[var(--text-main)]">{formatPercent(lane.avg_progress_pct || 0)}</div>
                    </div>
                    <div className="rounded-[18px] border border-[var(--border-subtle)] px-3 py-2">
                      <div className="text-[var(--text-muted)]">Current Visibility</div>
                      <div className="mt-1 font-semibold text-[var(--text-main)]">{lane.site_count}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Site Rollup" subtitle="This is the real execution view of the project">
          {!detail?.sites?.length ? (
            <EmptyState message="No sites are linked to this project yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                    <th className="px-3 py-3 font-medium">Site</th>
                    <th className="px-3 py-3 font-medium">Current Stage</th>
                    <th className="px-3 py-3 font-medium">Department Lane</th>
                    <th className="px-3 py-3 font-medium">Progress</th>
                    <th className="px-3 py-3 font-medium">Milestones</th>
                    <th className="px-3 py-3 font-medium">Owner</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.sites.map((site) => (
                    <tr key={site.name} className="border-b border-[var(--border-subtle)] last:border-b-0">
                      <td className="px-3 py-3">
                        <div className="font-medium text-[var(--text-main)]">{site.site_name || site.site_code || site.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{site.site_code || site.name}</div>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-main)]">{site.current_site_stage || '-'}</td>
                      <td className="px-3 py-3 text-[var(--text-main)]">{site.department_lane?.replaceAll('_', ' ') || '-'}</td>
                      <td className="px-3 py-3 text-[var(--text-main)]">{formatPercent(site.site_progress_pct || 0)}</td>
                      <td className="px-3 py-3 text-[var(--text-main)]">
                        {site.open_milestone_count || 0} open / {site.milestone_count || 0} total
                      </td>
                      <td className="px-3 py-3 text-[var(--text-main)]">
                        <div>{site.current_owner_role || '-'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{site.current_owner_user || 'Unassigned'}</div>
                      </td>
                      <td className="px-3 py-3">
                        {site.site_blocked ? (
                          <span className="badge badge-warning">Blocked</span>
                        ) : (
                          <span className="badge badge-success">{site.status || 'Active'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
