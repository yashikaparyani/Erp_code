'use client';

import Link from 'next/link';
import { ArrowUpRight, Boxes, ClipboardList, FileText, FolderTree, MapPinned, Send, Wallet } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatPercent, useApiData } from './shared';

type PMDashboardData = {
  projects: { total: number; active: number; blocked: number; avg_progress: number };
  project_list: { name: string; project_name: string; status: string; stage: string; stage_status: string; blocked: number; blocker: string; sites: number; progress: number }[];
  sites: { total: number; active: number };
  surveys: { total: number; pending: number; completed: number };
  petty_cash: { total: number; pending: number; approved: number; total_amount: number };
  approvals: { pending_ph: number; approved: number; rejected: number };
  dprs: { total: number; today: number; projects_with_today_dpr: number };
};

const initialData: PMDashboardData = {
  projects: { total: 0, active: 0, blocked: 0, avg_progress: 0 },
  project_list: [],
  sites: { total: 0, active: 0 },
  surveys: { total: 0, pending: 0, completed: 0 },
  petty_cash: { total: 0, pending: 0, approved: 0, total_amount: 0 },
  approvals: { pending_ph: 0, approved: 0, rejected: 0 },
  dprs: { total: 0, today: 0, projects_with_today_dpr: 0 },
};

const quickLinks = [
  { label: 'Submit Survey', href: '/survey', helper: 'Push fresh survey truth to Engineering.' },
  { label: 'Project Inventory / GRN', href: '/project-manager/inventory', helper: 'Maintain project-side receiving and consumption.' },
  { label: 'Project Petty Cash', href: '/project-manager/petty-cash', helper: 'Keep petty cash entries tied to assigned projects.' },
  { label: 'DPR / Progress', href: '/project-manager/dpr', helper: 'Submit project progress upward.' },
];

export default function ProjectManagerDashboard() {
  const { data, loading, error, lastUpdated, refresh } = useApiData<PMDashboardData>('/api/dashboards/project-manager', initialData);

  return (
    <DashboardShell
      title="Project Manager Dashboard"
      subtitle="Live coordination view across assigned projects, surveys, petty cash, and DPR reporting"
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => void refresh()}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Active Projects" value={data.projects.active} hint={`${data.projects.total} total, ${formatPercent(data.projects.avg_progress)} avg progress`} icon={FolderTree} tone="blue" />
        <StatCard title="Blocked Projects" value={data.projects.blocked} hint="Projects with spine blockers" icon={ClipboardList} tone="red" />
        <StatCard title="Active Sites" value={data.sites.active} hint={`${data.sites.total} total sites`} icon={MapPinned} tone="green" />
        <StatCard title="Surveys Pending" value={data.surveys.pending} hint={`${data.surveys.completed} completed`} icon={FileText} tone="orange" />
        <StatCard title="Pending PH Approvals" value={data.approvals.pending_ph} hint={`${data.approvals.approved} approved, ${data.approvals.rejected} rejected`} icon={Send} tone="purple" />
        <StatCard title="DPRs Today" value={data.dprs.today} hint={`${data.dprs.projects_with_today_dpr} projects reported`} icon={Boxes} tone="amber" />
      </div>

      {/* Project list table */}
      {data.project_list.length > 0 && (
        <div className="mt-6 card">
          <div className="card-header">
            <div>
              <h3 className="font-semibold text-[var(--text-main)]">Assigned Projects</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Projects assigned to you with current stage and progress</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-left text-xs font-medium text-[var(--text-muted)]">
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sites</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.project_list.map((p) => (
                  <tr key={p.name} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-raised)]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text-main)]">{p.project_name || p.name}</div>
                      {p.blocked ? (
                        <span className="text-[10px] text-rose-600">{p.blocker || 'Blocked'}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        {(p.stage || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        (p.stage_status || '').includes('PENDING') ? 'bg-amber-100 text-amber-700' :
                        (p.stage_status || '').includes('REJECT') ? 'bg-rose-100 text-rose-700' :
                        (p.stage_status || '').includes('COMPLETED') ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {(p.stage_status || 'IN_PROGRESS').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{p.sites}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-200">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min(p.progress, 100)}%` }} />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{formatPercent(p.progress)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.name}`} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Petty Cash" subtitle="Project-scoped petty cash status">
          <MetricList
            items={[
              { label: 'Total Entries', value: data.petty_cash.total },
              { label: 'Pending Approval', value: data.petty_cash.pending, tone: data.petty_cash.pending > 0 ? 'warning' : 'positive' },
              { label: 'Approved', value: data.petty_cash.approved, tone: 'positive' },
              { label: 'Total Amount', value: `₹${Math.round(data.petty_cash.total_amount).toLocaleString('en-IN')}` },
            ]}
          />
        </SectionCard>

        <SectionCard title="Surveys" subtitle="Survey submission and completion status">
          <MetricList
            items={[
              { label: 'Total Surveys', value: data.surveys.total },
              { label: 'Pending / In Progress', value: data.surveys.pending, tone: data.surveys.pending > 0 ? 'warning' : 'positive' },
              { label: 'Completed', value: data.surveys.completed, tone: 'positive' },
            ]}
          />
        </SectionCard>

        <SectionCard title="PH Approval Pipeline" subtitle="Items sent to Project Head for approval">
          <MetricList
            items={[
              { label: 'Awaiting PH Action', value: data.approvals.pending_ph, tone: data.approvals.pending_ph > 0 ? 'warning' : 'positive' },
              { label: 'Approved', value: data.approvals.approved, tone: 'positive' },
              { label: 'Rejected', value: data.approvals.rejected, tone: data.approvals.rejected > 0 ? 'negative' : 'positive' },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mt-6 card">
        <div className="card-header">
          <div>
            <div className="workspace-kicker mb-1">Quick Actions</div>
            <h3 className="font-semibold text-[var(--text-main)]">Open The Right Project-Side Surface</h3>
          </div>
        </div>
        <div className="card-body grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-main)]">{link.label}</div>
                  <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{link.helper}</div>
                </div>
                <ArrowUpRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--accent)]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
