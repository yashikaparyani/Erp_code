'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ShieldAlert, BookOpen } from 'lucide-react';
import { formatPercent } from '../dashboards/shared';
import { WorkspacePermissions } from '../../context/WorkspacePermissionContext';
import type { SiteRow, DepartmentConfig } from './workspace-types';
import { STAGE_LABELS } from './workspace-types';

function SitesTab({ sites, config }: { sites: SiteRow[]; config: DepartmentConfig; projectId: string; wp: WorkspacePermissions | null }) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [blockedOnly, setBlockedOnly] = useState(false);

  const stages = useMemo(() => [...new Set(sites.map((s) => s.current_site_stage || 'SURVEY'))].sort(), [sites]);
  const totalBlocked = useMemo(() => sites.filter((s) => s.site_blocked).length, [sites]);

  const filtered = useMemo(() => {
    let result = sites;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          (s.site_name || '').toLowerCase().includes(q) ||
          (s.site_code || '').toLowerCase().includes(q) ||
          (s.name || '').toLowerCase().includes(q) ||
          (s.blocker_reason || '').toLowerCase().includes(q),
      );
    }
    if (stageFilter) {
      result = result.filter((s) => (s.current_site_stage || 'SURVEY') === stageFilter);
    }
    if (blockedOnly) {
      result = result.filter((s) => s.site_blocked);
    }
    return result;
  }, [sites, search, stageFilter, blockedOnly]);

  const isDept = config.departmentKey !== 'all';

  // Deadline urgency helper
  const deadlineUrgency = (dateStr?: string): 'overdue' | 'soon' | 'normal' | null => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'overdue';
    if (diff <= 7) return 'soon';
    return 'normal';
  };

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
              <option key={s} value={s}>{STAGE_LABELS[s] || s.replaceAll('_', ' ')}</option>
            ))}
          </select>
          {totalBlocked > 0 && (
            <button
              onClick={() => setBlockedOnly(!blockedOnly)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                blockedOnly
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-white text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-rose-200 hover:text-rose-600'
              }`}
            >
              <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />{totalBlocked} Blocked
            </button>
          )}
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
                {!isDept && <th className="px-4 py-3 font-medium">Dept Lane</th>}
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Milestones</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Last Updated</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((site) => {
                const urgency = deadlineUrgency(site.latest_planned_end_date);
                return (
                <tr key={site.name} className={`hover:bg-[var(--surface-raised)]/60 ${site.site_blocked ? 'bg-rose-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-main)]">{site.site_name || site.site_code || site.name}</div>
                    {site.site_code && site.site_name && <div className="text-xs text-[var(--text-muted)]">{site.site_code}</div>}
                    <Link
                      href={`/sites/${encodeURIComponent(site.name)}/dossier`}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-700"
                    >
                      <BookOpen className="h-3 w-3" /> Site dossier
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {STAGE_LABELS[site.current_site_stage || 'SURVEY'] || (site.current_site_stage || 'SURVEY').replaceAll('_', ' ')}
                    </span>
                  </td>
                  {!isDept && <td className="px-4 py-3 text-[var(--text-muted)]">{(site.department_lane || '-').replaceAll('_', ' ')}</td>}
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
                  <td className="px-4 py-3">
                    {site.latest_planned_end_date ? (
                      <span className={`text-xs font-medium ${
                        urgency === 'overdue' ? 'text-rose-600' :
                        urgency === 'soon' ? 'text-amber-600' :
                        'text-[var(--text-muted)]'
                      }`}>
                        {new Date(site.latest_planned_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {urgency === 'overdue' && <span className="ml-1 rounded bg-rose-100 px-1 py-0.5 text-[10px]">Overdue</span>}
                        {urgency === 'soon' && <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px]">This week</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {site.modified
                      ? new Date(site.modified).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : site.latest_dpr_date || '-'
                    }
                  </td>
                  <td className="px-4 py-3">
                    {site.site_blocked ? (
                      <div>
                        <span className="inline-block rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">Blocked</span>
                        {site.blocker_reason && (
                          <p className="mt-1 max-w-[180px] truncate text-[10px] text-rose-500" title={site.blocker_reason}>{site.blocker_reason}</p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{site.status || 'Active'}</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SitesTab;
