'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { projectWorkspaceApi } from '@/lib/typedApi';
import {
  Loader2, Wrench, ClipboardCheck, FileWarning, ShieldAlert,
  CheckCircle2, AlertCircle, History, Flag, ExternalLink,
} from 'lucide-react';
import type { PMCockpitSummary, DepartmentConfig } from './workspace-types';
import { SectionHeader } from './workspace-helpers';

function OpsTab({ projectId, config }: { projectId: string; config: DepartmentConfig }) {
  const [data, setData] = useState<PMCockpitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const result = await projectWorkspaceApi.getCockpitSummary<PMCockpitSummary>(projectId);
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load operations data');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId, config.allowedStages]);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading operations...</div>;
  if (error) return <p className="py-12 text-center text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="py-12 text-center text-sm text-[var(--text-muted)]">No operations data available.</p>;

  const { dpr_summary, commissioning_summary, dependency_summary, document_expiry, milestones_summary, signal_summary, action_items } = data;

  return (
    <div className="space-y-8">
      {/* Action Items Banner */}
      {action_items.length > 0 && (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50/50 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-700">
            <AlertCircle className="h-4 w-4" /> Requires Attention ({action_items.length})
          </h3>
          <div className="space-y-2">
            {action_items.map((item, idx) => (
              <div key={idx} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                item.priority === 'high' ? 'border-rose-200 bg-white' : 'border-amber-200 bg-amber-50/50'
              }`}>
                <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  item.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}>{item.type}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--text-main)]">{item.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-blue-50 px-4 py-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-wider text-blue-600">DPRs This Week</div>
          <div className="mt-1 text-2xl font-bold text-blue-700">{dpr_summary.this_week_count}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-emerald-50 px-4 py-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">Manpower Logged</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{dpr_summary.total_manpower}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-violet-50 px-4 py-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-wider text-violet-600">Test Reports</div>
          <div className="mt-1 text-2xl font-bold text-violet-700">{commissioning_summary.test_reports.length}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-teal-50 px-4 py-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-wider text-teal-600">Signoffs</div>
          <div className="mt-1 text-2xl font-bold text-teal-700">{commissioning_summary.signoffs.length}</div>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-center ${
          document_expiry.expired_count > 0 ? 'border-rose-200 bg-rose-50' : 'border-[var(--border-subtle)] bg-amber-50'
        }`}>
          <div className={`text-[11px] font-medium uppercase tracking-wider ${document_expiry.expired_count > 0 ? 'text-rose-600' : 'text-amber-600'}`}>Docs Expiring</div>
          <div className={`mt-1 text-2xl font-bold ${document_expiry.expired_count > 0 ? 'text-rose-700' : 'text-amber-700'}`}>
            {document_expiry.expiring_count + document_expiry.expired_count}
          </div>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-center ${
          dependency_summary.hard_blocked > 0 ? 'border-rose-200 bg-rose-50' : 'border-[var(--border-subtle)] bg-gray-50'
        }`}>
          <div className={`text-[11px] font-medium uppercase tracking-wider ${dependency_summary.hard_blocked > 0 ? 'text-rose-600' : 'text-gray-600'}`}>Hard Blocks</div>
          <div className={`mt-1 text-2xl font-bold ${dependency_summary.hard_blocked > 0 ? 'text-rose-700' : 'text-gray-700'}`}>
            {dependency_summary.hard_blocked}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* DPR Section */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[var(--text-muted)]" />
              <h4 className="font-semibold text-[var(--text-main)]">Daily Progress Reports</h4>
            </div>
            <Link href={`/execution?project=${encodeURIComponent(projectId)}`} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-strong)] hover:underline">
              View All <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="card-body">
            {dpr_summary.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">No DPRs recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {dpr_summary.recent.slice(0, 5).map((dpr) => (
                  <div key={dpr.name} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[var(--text-main)]">{dpr.linked_site || 'Project-level'}</div>
                      <div className="text-xs text-[var(--text-muted)]">{dpr.report_date || '-'}</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {dpr.manpower_on_site && <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">{dpr.manpower_on_site} staff</span>}
                      {dpr.equipment_count && <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">{dpr.equipment_count} equip</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-4 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)]">
              <span>Total: {dpr_summary.total_count} DPRs</span>
              <span>Manpower: {dpr_summary.total_manpower}</span>
            </div>
          </div>
        </div>

        {/* Commissioning Section */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[var(--text-muted)]" />
              <h4 className="font-semibold text-[var(--text-main)]">Commissioning & Handover</h4>
            </div>
            <Link href={`/execution/commissioning?project=${encodeURIComponent(projectId)}`} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-strong)] hover:underline">
              View All <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="card-body space-y-4">
            {/* Checklists */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">Checklists</span>
                <div className="flex gap-2">
                  {Object.entries(commissioning_summary.checklist_by_status).map(([status, count]) => (
                    <span key={status} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                      status === 'In Progress' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{status}: {count}</span>
                  ))}
                </div>
              </div>
              {commissioning_summary.checklists.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No checklists yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {commissioning_summary.checklists.slice(0, 4).map((c) => (
                    <span key={c.name} className={`rounded-lg border px-2 py-1 text-xs ${
                      c.status === 'Completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      'border-[var(--border-subtle)] bg-white text-[var(--text-main)]'
                    }`}>
                      {c.checklist_name || c.linked_site || c.name}
                    </span>
                  ))}
                  {commissioning_summary.checklists.length > 4 && (
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-[var(--text-muted)]">+{commissioning_summary.checklists.length - 4} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Test Reports */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">Test Reports</span>
                <div className="flex gap-2">
                  {Object.entries(commissioning_summary.test_by_status).map(([status, count]) => (
                    <span key={status} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      status === 'Passed' ? 'bg-emerald-50 text-emerald-700' :
                      status === 'Failed' ? 'bg-rose-50 text-rose-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{status}: {count}</span>
                  ))}
                </div>
              </div>
              {commissioning_summary.test_reports.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No test reports yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {commissioning_summary.test_reports.slice(0, 4).map((t) => (
                    <span key={t.name} className={`rounded-lg border px-2 py-1 text-xs ${
                      t.status === 'Passed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      t.status === 'Failed' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                      'border-[var(--border-subtle)] bg-white text-[var(--text-main)]'
                    }`}>
                      {t.report_name || t.test_type || t.name}
                    </span>
                  ))}
                  {commissioning_summary.test_reports.length > 4 && (
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-[var(--text-muted)]">+{commissioning_summary.test_reports.length - 4} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Signoffs */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">Client Signoffs</span>
                <div className="flex gap-2">
                  {Object.entries(commissioning_summary.signoff_by_status).map(([status, count]) => (
                    <span key={status} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      status === 'Signed' ? 'bg-emerald-50 text-emerald-700' :
                      status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{status}: {count}</span>
                  ))}
                </div>
              </div>
              {commissioning_summary.signoffs.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No signoffs yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {commissioning_summary.signoffs.slice(0, 4).map((s) => (
                    <span key={s.name} className={`rounded-lg border px-2 py-1 text-xs ${
                      s.status === 'Signed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      'border-[var(--border-subtle)] bg-white text-[var(--text-main)]'
                    }`}>
                      {s.signoff_type || s.linked_site || s.name}
                    </span>
                  ))}
                  {commissioning_summary.signoffs.length > 4 && (
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-[var(--text-muted)]">+{commissioning_summary.signoffs.length - 4} more</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Expiry + Dependencies Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Document Expiry */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-[var(--text-main)]">Document Expiry</h4>
          </div>
          <div className="card-body">
            {document_expiry.expired.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 text-xs font-medium text-rose-600">Expired ({document_expiry.expired_count})</div>
                <div className="space-y-1.5">
                  {document_expiry.expired.slice(0, 3).map((doc) => (
                    <div key={doc.name} className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-1.5 text-xs">
                      <span className="font-medium text-rose-700">{doc.document_name || doc.name}</span>
                      <span className="text-rose-500">{doc.expiry_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {document_expiry.expiring_soon.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-medium text-amber-600">Expiring Soon ({document_expiry.expiring_count})</div>
                <div className="space-y-1.5">
                  {document_expiry.expiring_soon.slice(0, 3).map((doc) => (
                    <div key={doc.name} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-xs">
                      <span className="font-medium text-amber-700">{doc.document_name || doc.name}</span>
                      <span className="text-amber-500">{doc.expiry_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {document_expiry.expired.length === 0 && document_expiry.expiring_soon.length === 0 && (
              <p className="py-4 text-center text-sm text-emerald-600">
                <CheckCircle2 className="mr-1 inline h-4 w-4" /> All documents current
              </p>
            )}
          </div>
        </div>

        {/* Dependencies & Blocks */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <h4 className="font-semibold text-[var(--text-main)]">Dependencies & Blocks</h4>
            </div>
            <Link href={`/execution/dependencies?project=${encodeURIComponent(projectId)}`} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-strong)] hover:underline">
              Manage <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="card-body">
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] py-2">
                <div className="text-lg font-bold text-[var(--text-main)]">{dependency_summary.blocked_sites}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Total Blocked</div>
              </div>
              <div className={`rounded-lg border py-2 ${dependency_summary.hard_blocked > 0 ? 'border-rose-200 bg-rose-50' : 'border-[var(--border-subtle)] bg-[var(--surface-raised)]'}`}>
                <div className={`text-lg font-bold ${dependency_summary.hard_blocked > 0 ? 'text-rose-700' : 'text-[var(--text-main)]'}`}>{dependency_summary.hard_blocked}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Hard Blocked</div>
              </div>
              <div className={`rounded-lg border py-2 ${dependency_summary.soft_blocked > 0 ? 'border-amber-200 bg-amber-50' : 'border-[var(--border-subtle)] bg-[var(--surface-raised)]'}`}>
                <div className={`text-lg font-bold ${dependency_summary.soft_blocked > 0 ? 'text-amber-700' : 'text-[var(--text-main)]'}`}>{dependency_summary.soft_blocked}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Soft Blocked</div>
              </div>
            </div>
            {dependency_summary.blocked_details.length > 0 && (
              <div className="space-y-1.5">
                {dependency_summary.blocked_details.slice(0, 4).map((site) => (
                  <div key={site.name} className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-rose-700">{site.name}</span>
                      {site.blocker_reason && <p className="mt-0.5 text-rose-600">{site.blocker_reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {dependency_summary.pending_overrides.length > 0 && (
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                <div className="mb-2 text-xs font-medium text-amber-600">Pending Override Requests ({dependency_summary.pending_overrides.length})</div>
                {dependency_summary.pending_overrides.slice(0, 2).map((o) => (
                  <div key={o.name} className="text-xs text-[var(--text-muted)]">• {o.name} - requested by {o.requested_by}</div>
                ))}
              </div>
            )}
            {dependency_summary.blocked_sites === 0 && (
              <p className="py-4 text-center text-sm text-emerald-600">
                <CheckCircle2 className="mr-1 inline h-4 w-4" /> No blocking issues
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <h4 className="font-semibold text-[var(--text-main)]">Signals & Follow-ups</h4>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {signal_summary.unread_alerts_count} unread alerts • {signal_summary.due_reminders_count} due reminders
            </div>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">Recent Alerts</div>
              {signal_summary.recent_alerts.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No project alerts right now.</p>
              ) : (
                <div className="space-y-2">
                  {signal_summary.recent_alerts.slice(0, 4).map((alert) => (
                    <div
                      key={alert.name}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        alert.is_read ? 'border-[var(--border-subtle)] bg-white' : 'border-blue-200 bg-blue-50/50'
                      }`}
                    >
                      <div className="font-medium text-[var(--text-main)]">{alert.summary || alert.event_type || 'Alert'}</div>
                      <div className="mt-0.5 text-[var(--text-muted)]">
                        {alert.linked_site || alert.linked_stage || 'Project-wide'}
                        {alert.creation
                          ? ` • ${new Date(alert.creation).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">Active Reminders</div>
              {signal_summary.reminders.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No project reminders right now.</p>
              ) : (
                <div className="space-y-2">
                  {signal_summary.reminders.slice(0, 4).map((reminder) => (
                    <div key={reminder.name} className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs">
                      <div className="font-medium text-[var(--text-main)]">{reminder.title || 'Reminder'}</div>
                      <div className="mt-0.5 text-[var(--text-muted)]">
                        {(reminder.next_reminder_at || reminder.reminder_datetime)
                          ? new Date(reminder.next_reminder_at || reminder.reminder_datetime || '').toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : 'No due date'}
                        {reminder.linked_site ? ` • ${reminder.linked_site}` : reminder.linked_stage ? ` • ${reminder.linked_stage}` : ' • Project-wide'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center gap-2">
            <History className="h-4 w-4 text-violet-500" />
            <h4 className="font-semibold text-[var(--text-main)]">Activity & Collaboration</h4>
          </div>
          <div className="card-body">
            <p className="text-sm text-[var(--text-muted)]">
              Project discussion, workflow comments, mentions, and site-level change history continue in the activity tab so the cockpit stays focused on live operational signals.
            </p>
          </div>
        </div>
      </div>

      {/* Overdue Milestones */}
      {milestones_summary.overdue_count > 0 && (
        <div className="card border-amber-200">
          <div className="card-header flex items-center gap-2 bg-amber-50">
            <Flag className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-amber-700">Overdue Milestones ({milestones_summary.overdue_count})</h4>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {milestones_summary.overdue.slice(0, 6).map((m) => (
                <div key={m.name} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs">
                  <span className="font-medium text-amber-700">{m.milestone_name || m.name}</span>
                  <span className="text-amber-500">Due: {m.planned_date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OpsTab;
