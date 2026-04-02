'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, ShieldAlert, Loader2, Send, CheckCircle2, X, ClipboardCheck, FileWarning, AlertCircle } from 'lucide-react';
import { formatPercent } from '../dashboards/shared';
import { useAuth } from '../../context/AuthContext';
import { WorkspacePermissions } from '../../context/WorkspacePermissionContext';
import type {
  ProjectDetail, SiteRow, DepartmentConfig, TabKey,
  WorkspacePriority, WorkspaceShortcut, PMCockpitSummary,
  ActionItem, ActivityEntry, WorkflowState, WorkflowRequirement,
  WorkflowHistoryEntry,
} from './workspace-types';
import {
  callOps, STAGE_LABELS, SPINE_STAGES, formatWorkflowText,
} from './workspace-types';
import { StatPill, SectionHeader } from './workspace-helpers';

function WorkflowControlPanel({
  projectId,
  wp,
}: {
  projectId: string;
  wp: WorkspacePermissions | null;
}) {
  const [state, setState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [remarks, setRemarks] = useState('');
  const [overrideStage, setOverrideStage] = useState('');

  const loadState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callOps<WorkflowState>('get_project_workflow_state', { project: projectId });
      setState(data);
      setOverrideStage(data.next_stage || data.stage || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow state');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const runAction = async (method: string, successFallback: string) => {
    setBusyAction(method);
    setError('');
    try {
      const args: Record<string, unknown> = {
        project: projectId,
        remarks: remarks.trim() || undefined,
      };
      if (method === 'override_project_stage') {
        args.new_stage = overrideStage;
      }
      const data = await callOps<WorkflowState>(method, args);
      setState(data);
      setRemarks('');
      if (data.next_stage) {
        setOverrideStage(data.next_stage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : successFallback);
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h4 className="font-semibold text-[var(--text-main)]">Workflow Control</h4>
      </div>
      <div className="card-body space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading workflow state...
          </div>
        ) : null}

        {!loading && state ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatPill label="Stage" value={state.stage_label || formatWorkflowText(state.stage)} />
              <StatPill
                label="Status"
                value={formatWorkflowText(state.stage_status)}
                tone={state.stage_status === 'REJECTED' ? 'error' : state.stage_status === 'PENDING_APPROVAL' ? 'warning' : 'success'}
              />
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 text-sm">
              <div className="font-medium text-[var(--text-main)]">{state.description || 'Workflow stage details are available from backend state.'}</div>
              <div className="mt-1 text-[var(--text-muted)]">
                Next stage: {state.next_stage_label || 'Final stage'}
              </div>
              {state.submitted_by || state.submitted_at ? (
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  Submitted by {state.submitted_by || '-'} {state.submitted_at ? `on ${new Date(state.submitted_at).toLocaleString('en-IN')}` : ''}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-main)]">Readiness</div>
                  <div className="text-xs text-[var(--text-muted)]">{state.readiness.summary || 'Backend readiness rules apply here.'}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${state.readiness.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {state.readiness.ready ? 'Ready' : 'Blocked'}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {state.readiness.requirements.map((item) => (
                  <div key={item.label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                    <div className="flex items-start gap-2">
                      {item.satisfied ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--text-main)]">{item.label}</div>
                        <div className="text-xs text-[var(--text-muted)]">{item.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
            ) : null}

            <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3">
              <div className="text-sm font-semibold text-[var(--text-main)]">Action Remarks</div>
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[var(--border-subtle)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Optional remarks for submit, approve, reject, restart, or override"
              />

              {state.actions.can_override || wp?.can_override_stage ? (
                <label className="block text-sm text-[var(--text-muted)]">
                  Override Stage
                  <select
                    value={overrideStage}
                    onChange={(event) => setOverrideStage(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-[var(--border-subtle)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
                  >
                    {SPINE_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {STAGE_LABELS[stage] || formatWorkflowText(stage)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {state.actions.can_submit ? (
                  <button
                    type="button"
                    onClick={() => void runAction('submit_project_stage_for_approval', 'Failed to submit stage')}
                    disabled={busyAction.length > 0}
                    className="inline-flex items-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busyAction === 'submit_project_stage_for_approval' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit Stage
                  </button>
                ) : null}
                {state.actions.can_approve ? (
                  <button
                    type="button"
                    onClick={() => void runAction('approve_project_stage', 'Failed to approve stage')}
                    disabled={busyAction.length > 0}
                    className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busyAction === 'approve_project_stage' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Approve Stage
                  </button>
                ) : null}
                {state.actions.can_reject ? (
                  <button
                    type="button"
                    onClick={() => void runAction('reject_project_stage', 'Failed to reject stage')}
                    disabled={busyAction.length > 0}
                    className="inline-flex items-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busyAction === 'reject_project_stage' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Reject Stage
                  </button>
                ) : null}
                {state.actions.can_restart ? (
                  <button
                    type="button"
                    onClick={() => void runAction('restart_project_stage', 'Failed to restart stage')}
                    disabled={busyAction.length > 0}
                    className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-main)] disabled:opacity-60"
                  >
                    {busyAction === 'restart_project_stage' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                    Restart Stage
                  </button>
                ) : null}
                {state.actions.can_override ? (
                  <button
                    type="button"
                    onClick={() => void runAction('override_project_stage', 'Failed to override stage')}
                    disabled={busyAction.length > 0 || !overrideStage}
                    className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-60"
                  >
                    {busyAction === 'override_project_stage' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileWarning className="mr-2 h-4 w-4" />}
                    Override Stage
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[var(--text-main)]">Workflow History</div>
                <button type="button" onClick={() => void loadState()} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">
                  Refresh
                </button>
              </div>
              {state.history.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No workflow history recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {state.history.slice(0, 5).map((entry, index) => (
                    <div key={`${entry.timestamp || 'entry'}-${index}`} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                      <div className="text-sm font-medium text-[var(--text-main)]">
                        {formatWorkflowText(entry.action)} {entry.stage ? `• ${STAGE_LABELS[entry.stage] || formatWorkflowText(entry.stage)}` : ''}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {entry.actor || 'System'} {entry.timestamp ? `• ${new Date(entry.timestamp).toLocaleString('en-IN')}` : ''}
                        {entry.next_stage ? ` • Next: ${STAGE_LABELS[entry.next_stage] || formatWorkflowText(entry.next_stage)}` : ''}
                      </div>
                      {entry.remarks ? <div className="mt-1 text-xs text-[var(--text-muted)]">{entry.remarks}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function OverviewTab({ detail, config, deptSites, projectId, onTabChange, buildTabHref, wp }: { detail: ProjectDetail; config: DepartmentConfig; deptSites: SiteRow[]; projectId: string; onTabChange: (tab: TabKey) => void; buildTabHref: (tab: TabKey) => string; wp: WorkspacePermissions | null }) {
  const { currentUser } = useAuth();
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

  const blockedSites = isDept
    ? deptSites.filter((s) => s.site_blocked)
    : detail.sites.filter((s) => s.site_blocked);
  const blockedCount = blockedSites.length;
  const progressAvg = isDept
    ? (deptSites.reduce((sum, s) => sum + (s.site_progress_pct || 0), 0) / (deptSites.length || 1))
    : (ps.spine_progress_pct || 0);

  // Sites close to or past deadline
  const overdueSites = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (isDept ? deptSites : detail.sites).filter((s) => {
      if (!s.latest_planned_end_date) return false;
      return new Date(s.latest_planned_end_date) < today;
    });
  }, [isDept, deptSites, detail.sites]);

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

  const roleFocus = currentUser?.role || currentUser?.roles?.[0] || 'Project User';

  const priorities = useMemo<WorkspacePriority[]>(() => {
    const items: WorkspacePriority[] = [];
    if (blockedCount > 0) {
      items.push({
        title: `${blockedCount} blocked site${blockedCount > 1 ? 's' : ''} need decisions`,
        detail: 'Start with the site blockers below and move the blocked records before opening new work.',
        tone: 'rose',
      });
    }
    if (aq.pending_count > 0) {
      items.push({
        title: `${aq.pending_count} pending workflow item${aq.pending_count > 1 ? 's' : ''}`,
        detail: 'Use the operations tab to clear approvals, submissions, and workflow actions waiting on this project.',
        tone: 'amber',
      });
    }
    if (aq.overdue_count > 0 || overdueSites.length > 0) {
      items.push({
        title: `${aq.overdue_count + overdueSites.length} overdue execution signal${aq.overdue_count + overdueSites.length > 1 ? 's' : ''}`,
        detail: 'Review overdue sites and milestones before continuing with new commissioning or billing steps.',
        tone: 'amber',
      });
    }
    if (!items.length) {
      items.push({
        title: 'Project is operationally clear',
        detail: 'Use the shortcuts below to drive the next stage, verify controlled documents, and monitor signals.',
        tone: 'emerald',
      });
    }
    return items.slice(0, 3);
  }, [aq.overdue_count, aq.pending_count, blockedCount, overdueSites.length]);

  const shortcuts = useMemo<WorkspaceShortcut[]>(() => {
    const items: WorkspaceShortcut[] = [
      {
        label: 'Open Operations Queue',
        href: buildTabHref('ops'),
        tab: 'ops',
        tone: 'amber',
        detail: 'Dependencies, commissioning readiness, document expiry, and live signals',
      },
      {
        label: 'Review Project Files',
        href: buildTabHref('files'),
        tab: 'files',
        tone: 'violet',
        detail: 'Latest documents, version history, expiry, and uploads in project context',
      },
      {
        label: 'Check Site Board',
        href: buildTabHref('board'),
        tab: 'board',
        tone: 'blue',
        detail: 'See site distribution by lifecycle stage and move toward the next action',
      },
      {
        label: 'Execution Workspace',
        href: `/execution/projects/${encodeURIComponent(projectId)}`,
        tone: 'emerald',
        detail: 'Open the execution-focused lane for DPR, commissioning, and site delivery',
      },
    ];

    if ((currentUser?.roles || []).some((role) => role === 'Director' || role === 'Project Head' || role === 'Project Manager')) {
      items.unshift({
        label: 'PH Approvals',
        href: buildTabHref('approvals'),
        tab: 'approvals',
        tone: 'amber',
        detail: 'PO, RMA PO, and Petty Cash requests pending Project Head approval and costing queue',
      });
      items.unshift({
        label: 'Project Dossier',
        href: buildTabHref('dossier'),
        tab: 'dossier',
        tone: 'violet',
        detail: 'Stage-wise document completeness signals and controlled document inventory',
      });
      items.unshift({
        label: 'Project Activity',
        href: buildTabHref('activity'),
        tab: 'activity',
        tone: 'rose',
        detail: 'Trace recent comments, workflow changes, and team coordination on this project',
      });
      items.unshift({
        label: 'Accountability & RCA',
        href: buildTabHref('accountability'),
        tab: 'accountability',
        tone: 'rose',
        detail: 'Blocked items, escalations, rejections, and full audit trail for this project',
      });
    }

    return items.slice(0, 5);
  }, [buildTabHref, currentUser?.roles, projectId]);

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(237,244,255,0.92))] p-5 shadow-[var(--shadow-subtle)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">Mission Control</div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-main)]">
              {roleFocus} daily operating view for {ps.project_name || projectId}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              This workspace should answer what is blocked, what is due now, which records need governance, and which lane should move next.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill label="Action Queue" value={aq.pending_count + aq.overdue_count + blockedCount} tone={aq.pending_count + aq.overdue_count + blockedCount ? 'warning' : 'success'} />
            <StatPill label="Blocked" value={blockedCount} tone={blockedCount ? 'error' : 'success'} />
            <StatPill label="Visible Sites" value={isDept ? deptSites.length : detail.site_count} tone="default" />
            <StatPill label="Progress" value={formatPercent(progressAvg)} tone="success" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {priorities.map((priority) => (
            <div
              key={priority.title}
              className={`rounded-2xl border px-4 py-3 ${
                priority.tone === 'rose'
                  ? 'border-rose-200 bg-rose-50/70'
                  : priority.tone === 'amber'
                    ? 'border-amber-200 bg-amber-50/70'
                    : priority.tone === 'emerald'
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-blue-200 bg-blue-50/70'
              }`}
            >
              <div className="text-sm font-semibold text-[var(--text-main)]">{priority.title}</div>
              <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{priority.detail}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((shortcut) => {
            const toneClasses = {
              blue: 'border-blue-200 bg-blue-50/50 text-blue-700',
              emerald: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
              amber: 'border-amber-200 bg-amber-50/50 text-amber-700',
              violet: 'border-violet-200 bg-violet-50/50 text-violet-700',
              rose: 'border-rose-200 bg-rose-50/50 text-rose-700',
            }[shortcut.tone];

            const content = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{shortcut.label}</div>
                  <ExternalLink className="h-4 w-4" />
                </div>
                <div className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{shortcut.detail}</div>
              </>
            );

            if (shortcut.href) {
              return (
                <Link key={shortcut.label} href={shortcut.href} className={`rounded-2xl border px-4 py-3 transition hover:shadow-[var(--shadow-subtle)] ${toneClasses}`}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={shortcut.label}
                type="button"
                onClick={() => shortcut.tab && onTabChange(shortcut.tab)}
                className={`rounded-2xl border px-4 py-3 text-left transition hover:shadow-[var(--shadow-subtle)] ${toneClasses}`}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <button onClick={() => onTabChange('sites')} className="text-left">
          <StatPill label={isDept ? `${config.departmentLabel} Sites` : 'Total Sites'} value={isDept ? deptSites.length : detail.site_count} />
        </button>
        <StatPill label={isDept ? 'Avg Progress' : 'Spine Progress'} value={formatPercent(progressAvg)} tone="success" />
        <button onClick={() => onTabChange('sites')} className="text-left">
          <StatPill label="Blocked" value={blockedCount} tone={blockedCount ? 'error' : 'default'} />
        </button>
        {!isDept && <StatPill label="Overdue" value={overdueSites.length} tone={overdueSites.length ? 'warning' : 'default'} />}
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
                ['Current Stage', STAGE_LABELS[ps.current_project_stage || ''] || ps.current_project_stage],
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
          <WorkflowControlPanel projectId={projectId} wp={wp} />

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

      {/* Blocker triage — individual blocked sites with reasons */}
      {blockedSites.length > 0 && (
        <div>
          <SectionHeader title="Blocked Sites" subtitle={`${blockedSites.length} site${blockedSites.length > 1 ? 's' : ''} need attention`} />
          <div className="space-y-2">
            {blockedSites.slice(0, 8).map((site) => (
              <div key={site.name} className="flex items-center gap-4 rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-2.5">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-medium text-[var(--text-main)]">{site.site_name || site.site_code || site.name}</span>
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                      {STAGE_LABELS[site.current_site_stage || ''] || (site.current_site_stage || 'SURVEY').replaceAll('_', ' ')}
                    </span>
                  </div>
                  {site.blocker_reason && (
                    <p className="mt-0.5 text-xs text-rose-600">{site.blocker_reason}</p>
                  )}
                </div>
                <div className="text-right text-xs text-[var(--text-muted)] whitespace-nowrap">
                  {site.current_owner_role ? (site.current_owner_role).replaceAll('_', ' ') : 'Unassigned'}
                </div>
              </div>
            ))}
            {blockedSites.length > 8 && (
              <button onClick={() => onTabChange('sites')} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">
                View all {blockedSites.length} blocked sites →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stage distribution with human-readable labels and blocked counts */}
      {Object.keys(visibleCoverage).length > 0 && (
        <div>
          <SectionHeader title="Stage Distribution" subtitle={isDept ? `Stages within ${config.departmentLabel} lane` : 'How sites are distributed across the lifecycle'} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Object.entries(visibleCoverage).map(([stage, count]) => {
              const stageBlocked = (isDept ? deptSites : detail.sites).filter(
                (s) => (s.current_site_stage || 'SURVEY') === stage && s.site_blocked,
              ).length;
              return (
                <div key={stage} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 text-center">
                  <div className="text-xs font-medium text-[var(--text-muted)]">{STAGE_LABELS[stage] || stage.replaceAll('_', ' ')}</div>
                  <div className="mt-1 text-xl font-bold text-[var(--text-main)]">{count}</div>
                  {stageBlocked > 0 && (
                    <div className="mt-1 text-[10px] font-semibold text-rose-600">{stageBlocked} blocked</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Department health — lanes with readiness signals */}
      {lanes.length > 0 && (
        <div>
          <SectionHeader
            title={isDept ? 'All Department Lanes' : 'Department Health'}
            subtitle="Each department's operational readiness at a glance"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lanes.map((lane) => {
              const isOwn = isDept && lane.department === config.departmentKey;
              const healthTone = lane.blocked_count > 0
                ? (lane.blocked_count / (lane.site_count || 1) > 0.3 ? 'border-l-rose-500' : 'border-l-amber-400')
                : (lane.avg_progress_pct >= 50 ? 'border-l-emerald-500' : 'border-l-blue-400');
              return (
                <div key={lane.department} className={`card border-l-4 ${healthTone} ${isOwn ? 'ring-2 ring-[var(--accent)]' : ''}`}>
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-[var(--text-main)]">
                        {lane.label}
                        {isOwn && <span className="ml-2 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">Current</span>}
                      </h5>
                      <span className="text-xs text-[var(--text-muted)]">{lane.site_count} sites</span>
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      {lane.allowed_stages.map((s) => STAGE_LABELS[s] || s).join(' → ')}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                        <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(lane.avg_progress_pct || 0, 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-muted)]">{formatPercent(lane.avg_progress_pct || 0)}</span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs">
                      {lane.blocked_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-600">
                          <ShieldAlert className="h-3 w-3" />{lane.blocked_count} blocked
                        </span>
                      )}
                      {lane.blocked_count === 0 && lane.site_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">Clear</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Items Preview */}
      <ActionItemsPreview projectId={projectId} onViewAll={() => onTabChange('ops')} config={config} />

      {/* Recent Activity Preview */}
      <RecentActivityPreview projectId={projectId} onViewAll={() => onTabChange('activity')} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Action Items Preview (used in Overview)
   ═══════════════════════════════════════════════════════════ */

function ActionItemsPreview({ projectId, onViewAll, config }: { projectId: string; onViewAll: () => void; config: DepartmentConfig }) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await callOps<PMCockpitSummary>('get_pm_cockpit_summary', {
          project: projectId,
          stages: config.allowedStages || [],
        });
        if (active) setItems(data.action_items || []);
      } catch {
        // Silently skip — overview still works without action items
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId, config.allowedStages]);

  if (loading || items.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionHeader title="Requires Attention" subtitle={`${items.length} item${items.length > 1 ? 's' : ''} need follow-up`} />
        <button onClick={onViewAll} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">View Operations →</button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 3).map((item, idx) => (
          <div key={idx} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
            item.priority === 'high' ? 'border-rose-200 bg-rose-50/50' : 'border-amber-200 bg-amber-50/50'
          }`}>
            <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              item.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }`}>{item.type}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--text-main)]">{item.title}</div>
              <div className="text-xs text-[var(--text-muted)] line-clamp-2">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
      {items.length > 3 && (
        <button onClick={onViewAll} className="mt-2 text-xs font-medium text-[var(--accent-strong)] hover:underline">
          View all {items.length} action items →
        </button>
      )}
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

export default OverviewTab;
