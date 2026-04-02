'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Flag } from 'lucide-react';
import type { SiteRow, DepartmentConfig } from './workspace-types';
import { callOps, SPINE_STAGES, STAGE_LABELS } from './workspace-types';
import { SectionHeader } from './workspace-helpers';

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

export default MilestonesTab;
