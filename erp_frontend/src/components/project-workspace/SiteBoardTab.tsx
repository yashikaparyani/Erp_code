'use client';

import React, { useMemo } from 'react';
import { Flag } from 'lucide-react';
import { formatPercent } from '../dashboards/shared';
import { WorkspacePermissions } from '../../context/WorkspacePermissionContext';
import type { SiteRow, DepartmentConfig } from './workspace-types';
import { SPINE_STAGES, STAGE_LABELS } from './workspace-types';

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

function SiteBoardTab({ sites, config }: { sites: SiteRow[]; config: DepartmentConfig; wp: WorkspacePermissions | null }) {
  const visibleStages = config.allowedStages || SPINE_STAGES;

  const columns = useMemo(() => {
    const grouped: Record<string, SiteRow[]> = {};
    for (const stage of visibleStages) grouped[stage] = [];
    for (const site of sites) {
      const stage = site.current_site_stage || 'SURVEY';
      if (grouped[stage]) grouped[stage].push(site);
    }
    return visibleStages.map((stage) => {
      const colSites = grouped[stage] || [];
      return {
        stage,
        label: STAGE_LABELS[stage] || stage.replaceAll('_', ' '),
        sites: colSites,
        blockedCount: colSites.filter((s) => s.site_blocked).length,
      };
    });
  }, [sites, visibleStages]);

  if (!sites.length) {
    return <p className="py-12 text-center text-sm text-[var(--text-muted)]">No sites to display on the board.</p>;
  }

  // Deadline urgency helper
  const deadlineUrgency = (dateStr?: string): 'overdue' | 'soon' | null => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'overdue';
    if (diff <= 7) return 'soon';
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {sites.length} sites grouped by lifecycle stage
          {config.departmentKey !== 'all' ? ` (${config.departmentLabel} lane)` : ''}
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">Read-only board — stage transitions via site workflow</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map(({ stage, label, sites: colSites, blockedCount }) => (
          <div
            key={stage}
            className={`flex w-72 flex-shrink-0 flex-col rounded-xl border border-[var(--border-subtle)] border-t-4 bg-white ${STAGE_COLUMN_COLORS[stage] || 'border-t-gray-300'}`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-main)]">{label}</h4>
              <div className="flex items-center gap-1.5">
                {blockedCount > 0 && (
                  <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                    {blockedCount} blocked
                  </span>
                )}
                <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                  {colSites.length}
                </span>
              </div>
            </div>
            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2 p-2" style={{ minHeight: '5rem' }}>
              {colSites.length === 0 && (
                <p className="py-4 text-center text-[11px] text-[var(--text-muted)]">No sites</p>
              )}
              {colSites.map((site) => {
                const urgency = deadlineUrgency(site.latest_planned_end_date);
                return (
                <div
                  key={site.name}
                  className={`rounded-lg border px-3 py-2.5 text-sm ${
                    site.site_blocked
                      ? 'border-rose-200 bg-rose-50/50'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-raised)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--text-main)] truncate">
                        {site.site_name || site.site_code || site.name}
                      </div>
                      {site.site_code && site.site_name && (
                        <div className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate">{site.site_code}</div>
                      )}
                    </div>
                    {site.site_blocked ? (
                      <span className="flex-shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">Blocked</span>
                    ) : (
                      <span className="flex-shrink-0 text-[10px] font-medium text-emerald-600">{site.status || 'Active'}</span>
                    )}
                  </div>
                  {/* Progress bar */}
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
                  {/* Meta row: owner, deadline, milestones */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <span className="text-[var(--text-muted)]" title={site.current_owner_user || undefined}>
                      {(site.current_owner_role || '-').replaceAll('_', ' ')}
                    </span>
                    {(site.milestone_count || 0) > 0 && (
                      <span className="text-[var(--text-muted)]">
                        <Flag className="mr-0.5 inline h-3 w-3" />{site.open_milestone_count || 0}/{site.milestone_count}
                      </span>
                    )}
                    {site.latest_planned_end_date && (
                      <span className={`${
                        urgency === 'overdue' ? 'text-rose-600 font-semibold' :
                        urgency === 'soon' ? 'text-amber-600 font-semibold' :
                        'text-[var(--text-muted)]'
                      }`}>
                        {new Date(site.latest_planned_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        {urgency === 'overdue' && ' ⚠'}
                      </span>
                    )}
                  </div>
                  {/* Blocker reason */}
                  {site.site_blocked && site.blocker_reason && (
                    <p className="mt-1.5 truncate text-[10px] text-rose-500" title={site.blocker_reason}>
                      {site.blocker_reason}
                    </p>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SiteBoardTab;
