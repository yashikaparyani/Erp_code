'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { callApi, formatDateTime, hasAnyRole, useAuth } from '@/components/om/om-helpers';

type TimerRow = {
  name: string;
  linked_ticket?: string;
  sla_profile?: string;
  started_on?: string;
  closed_on?: string;
  response_deadline?: string;
  resolution_deadline?: string;
  response_sla_met?: number;
  resolution_sla_met?: number;
  total_pause_minutes?: number;
  current_elapsed_minutes?: number;
  paused_intervals?: string;
};

function isPaused(row: TimerRow) {
  try {
    const intervals = JSON.parse(row.paused_intervals || '[]');
    return Array.isArray(intervals) && intervals.length > 0 && !intervals[intervals.length - 1]?.resumed_at;
  } catch {
    return false;
  }
}

export default function SlaTimersPage() {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState<TimerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pauseTarget, setPauseTarget] = useState<TimerRow | null>(null);
  const [resumeTarget, setResumeTarget] = useState<TimerRow | null>(null);
  const [closeTarget, setCloseTarget] = useState<TimerRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callApi<TimerRow[]>('/api/sla-timers');
      setRows(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load SLA timers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.name, row.linked_ticket, row.sla_profile]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const stats = useMemo(() => ([
    { label: 'Total Timers', value: rows.length, variant: 'info' as const },
    { label: 'Running', value: rows.filter((row) => !row.closed_on && !isPaused(row)).length, variant: 'success' as const },
    { label: 'Paused', value: rows.filter((row) => !row.closed_on && isPaused(row)).length, variant: 'warning' as const },
    { label: 'Closed', value: rows.filter((row) => Boolean(row.closed_on)).length, variant: 'default' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query ? 'default' as const : undefined },
  ]), [filteredRows.length, query, rows]);

  const canManage = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'OM Operator');

  const handleCreate = async (values: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      await callApi('/api/sla-timers', {
        method: 'POST',
        body: {
          linked_ticket: values.linked_ticket || undefined,
          sla_profile: values.sla_profile || undefined,
          started_on: values.started_on || undefined,
        },
      });
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create SLA timer');
      throw createError;
    } finally {
      setBusy(false);
    }
  };

  const runSimpleAction = async (target: TimerRow | null, action: 'pause' | 'resume', closer: (value: TimerRow | null) => void) => {
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/sla-timers/${encodeURIComponent(target.name)}/actions`, {
        method: 'POST',
        body: { action },
      });
      closer(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action} SLA timer`);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async (values: Record<string, string>) => {
    if (!closeTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/sla-timers/${encodeURIComponent(closeTarget.name)}/actions`, {
        method: 'POST',
        body: {
          action: 'close',
          response_met: values.response_met || '1',
          resolution_met: values.resolution_met || '1',
        },
      });
      setCloseTarget(null);
      await load();
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : 'Failed to close SLA timer');
      throw closeError;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="SLA Timers"
        description="Track active and closed SLA timers linked to helpdesk tickets through dedicated O&M routes."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No SLA timers"
        emptyDescription={query ? 'No SLA timers match this search.' : 'Create the first SLA timer to start operational tracking.'}
        onRetry={load}
        stats={stats}
        headerActions={canManage ? (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create SLA Timer
          </button>
        ) : undefined}
        filterBar={(
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              className="input pl-9"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search timer, ticket, profile…"
            />
          </div>
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Timer</th>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">SLA Profile</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Response Due</th>
                <th className="px-4 py-3">Resolution Due</th>
                <th className="px-4 py-3">Elapsed (min)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const paused = isPaused(row);
                const closed = Boolean(row.closed_on);
                const statusLabel = closed ? 'Closed' : paused ? 'Paused' : 'Running';
                const statusClass = closed ? 'badge-gray' : paused ? 'badge-yellow' : 'badge-green';
                return (
                  <tr key={row.name} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-700">{row.linked_ticket || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.sla_profile || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(row.started_on)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(row.response_deadline)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(row.resolution_deadline)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.current_elapsed_minutes ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusClass}`}>{statusLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!closed && !paused ? <button className="text-sm font-medium text-amber-600 hover:text-amber-800" onClick={() => setPauseTarget(row)}>Pause</button> : null}
                        {!closed && paused ? <button className="text-sm font-medium text-emerald-600 hover:text-emerald-800" onClick={() => setResumeTarget(row)}>Resume</button> : null}
                        {!closed ? <button className="text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => setCloseTarget(row)}>Close</button> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      <FormModal
        open={showCreate}
        title="Create SLA Timer"
        description="Create a timer against a helpdesk ticket and SLA profile."
        busy={busy}
        confirmLabel="Create Timer"
        fields={[
          { name: 'linked_ticket', label: 'Ticket', type: 'link', linkEntity: 'ticket', placeholder: 'Search ticket…', required: true },
          { name: 'sla_profile', label: 'SLA Profile', type: 'link', linkEntity: 'sla_profile', placeholder: 'Search SLA profile…', required: true },
          { name: 'started_on', label: 'Started On', type: 'text', placeholder: 'YYYY-MM-DD HH:MM:SS', required: true, hint: 'Use server-local timestamp format.' },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal
        open={Boolean(pauseTarget)}
        title={`Pause ${pauseTarget?.name || 'SLA Timer'}`}
        confirmLabel="Pause"
        variant="default"
        busy={busy}
        onConfirm={() => runSimpleAction(pauseTarget, 'pause', setPauseTarget)}
        onCancel={() => setPauseTarget(null)}
      />

      <ActionModal
        open={Boolean(resumeTarget)}
        title={`Resume ${resumeTarget?.name || 'SLA Timer'}`}
        confirmLabel="Resume"
        variant="success"
        busy={busy}
        onConfirm={() => runSimpleAction(resumeTarget, 'resume', setResumeTarget)}
        onCancel={() => setResumeTarget(null)}
      />

      <ActionModal
        open={Boolean(closeTarget)}
        title={`Close ${closeTarget?.name || 'SLA Timer'}`}
        description="Record whether response and resolution SLAs were met."
        confirmLabel="Close Timer"
        variant="danger"
        busy={busy}
        fields={[
          {
            name: 'response_met',
            label: 'Response SLA Met',
            type: 'select',
            defaultValue: '1',
            options: [
              { value: '1', label: 'Yes' },
              { value: '0', label: 'No' },
            ],
          },
          {
            name: 'resolution_met',
            label: 'Resolution SLA Met',
            type: 'select',
            defaultValue: '1',
            options: [
              { value: '1', label: 'Yes' },
              { value: '0', label: 'No' },
            ],
          },
        ]}
        onConfirm={handleClose}
        onCancel={() => setCloseTarget(null)}
      />
    </>
  );
}
