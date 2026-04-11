'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Edit2, Plus, Search, Trash2, XCircle } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';

type ReminderRow = {
  name: string;
  tender: string;
  reminder_date: string;
  reminder_time?: string;
  remind_user?: string;
  status: string;
  sent_on?: string;
  creation?: string;
  modified?: string;
  reminder_kind?: string;
  due_in_days?: number | null;
  priority?: string;
  action_hint?: string;
  tender_status?: string;
};

type ModalMode = 'create' | 'edit' | null;

const priorityBadge = (p?: string) => {
  if (p === 'High') return 'badge-red';
  if (p === 'Medium') return 'badge-amber';
  return 'badge-green';
};

const statusBadge = (s: string) => {
  if (s === 'Sent') return 'badge-green';
  if (s === 'Dismissed') return 'badge-gray';
  return 'badge-info';
};

const formatDate = (v?: string) => {
  if (!v) return '-';
  try { return new Date(v).toLocaleDateString('en-GB'); } catch { return v; }
};

export default function TenderRemindersPage() {
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<ReminderRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReminderRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await fetch(`/api/tender-reminders${qs}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed');
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.tender, r.remind_user, r.reminder_kind, r.status].filter(Boolean).some(v => String(v).toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const stats = useMemo(() => {
    const pending = rows.filter(r => r.status === 'Pending').length;
    const sent = rows.filter(r => r.status === 'Sent').length;
    const dismissed = rows.filter(r => r.status === 'Dismissed').length;
    const overdue = rows.filter(r => r.due_in_days != null && r.due_in_days < 0 && r.status === 'Pending').length;
    return [
      { label: 'Total', value: String(rows.length) },
      { label: 'Pending', value: String(pending) },
      { label: 'Sent', value: String(sent) },
      { label: 'Overdue', value: String(overdue) },
    ];
  }, [rows]);

  const openCreate = () => { setEditing(null); setModalMode('create'); };
  const openEdit = (row: ReminderRow) => { setEditing(row); setModalMode('edit'); };

  const saveReminder = async (values: Record<string, string>) => {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        tender: values.tender,
        reminder_date: values.reminder_date,
        reminder_time: values.reminder_time || undefined,
        remind_user: values.remind_user || undefined,
      };
      if (modalMode === 'edit' && editing) {
        const res = await fetch(`/api/tender-reminders/${encodeURIComponent(editing.name)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) throw new Error(json.message || 'Failed');
      } else {
        const res = await fetch('/api/tender-reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) throw new Error(json.message || 'Failed');
      }
      setModalMode(null);
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteReminder = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/tender-reminders/${encodeURIComponent(deleteTarget.name)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed');
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleteBusy(false);
    }
  };

  const markSent = async (name: string) => {
    setActionBusy(name);
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'mark_tender_reminder_sent', name }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionBusy(null);
    }
  };

  const dismiss = async (name: string) => {
    setActionBusy(name);
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'dismiss_tender_reminder', name }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <>
      <RegisterPage
        title="Tender Reminders"
        description="Manage deadline reminders across all tenders — bid submissions, follow-ups, and internal checkpoints."
        loading={loading}
        error={error}
        empty={!loading && filtered.length === 0}
        emptyTitle="No reminders"
        emptyDescription={query ? 'No reminders match this search.' : 'Create a reminder to start tracking tender deadlines.'}
        onRetry={load}
        stats={stats}
        headerActions={(
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            New Reminder
          </button>
        )}
        filterBar={(
          <div className="flex items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search tender, user…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Sent">Sent</option>
              <option value="Dismissed">Dismissed</option>
            </select>
          </div>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map(row => (
            <div key={row.name} className="card">
              <div className="card-body space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                      <Bell className="h-4 w-4 text-[var(--accent)]" />
                      {row.tender}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className={`badge ${statusBadge(row.status)}`}>{row.status}</span>
                      {row.priority && <span className={`badge ${priorityBadge(row.priority)}`}>{row.priority}</span>}
                      {row.reminder_kind && <span className="badge badge-gray">{row.reminder_kind}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {row.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => markSent(row.name)}
                          disabled={actionBusy === row.name}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-green-50 hover:text-green-700"
                          title="Mark Sent"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => dismiss(row.name)}
                          disabled={actionBusy === row.name}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700"
                          title="Dismiss"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => openEdit(row)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700" title="Edit">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(row)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {row.action_hint && (
                  <p className="text-xs leading-5 text-[var(--text-muted)] italic">{row.action_hint}</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs text-[var(--text-muted)] sm:grid-cols-4">
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Reminder Date</div>
                    <div className="mt-1 text-[var(--text-main)]">{formatDate(row.reminder_date)}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Due In</div>
                    <div className={`mt-1 font-semibold ${row.due_in_days != null && row.due_in_days < 0 ? 'text-rose-600' : row.due_in_days != null && row.due_in_days <= 1 ? 'text-amber-600' : 'text-[var(--text-main)]'}`}>
                      {row.due_in_days != null ? (row.due_in_days < 0 ? `${Math.abs(row.due_in_days)}d overdue` : `${row.due_in_days}d`) : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Remind User</div>
                    <div className="mt-1 text-[var(--text-main)]">{row.remind_user || '-'}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Sent On</div>
                    <div className="mt-1 text-[var(--text-main)]">{row.sent_on ? formatDate(row.sent_on) : '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </RegisterPage>

      <FormModal
        open={modalMode !== null}
        title={modalMode === 'edit' ? 'Edit Reminder' : 'Create Reminder'}
        description="Set a deadline reminder for a tender."
        size="lg"
        busy={saving}
        confirmLabel={modalMode === 'edit' ? 'Save Changes' : 'Create'}
        fields={[
          { name: 'tender', label: 'Tender (GE Tender name)', type: 'text', required: true, defaultValue: editing?.tender || '' },
          { name: 'reminder_date', label: 'Reminder Date', type: 'date', required: true, defaultValue: editing?.reminder_date || '' },
          { name: 'reminder_time', label: 'Reminder Time', type: 'text', defaultValue: editing?.reminder_time || '', placeholder: 'HH:MM' },
          { name: 'remind_user', label: 'Remind User (email)', type: 'text', defaultValue: editing?.remind_user || '' },
        ]}
        onConfirm={saveReminder}
        onCancel={() => { setModalMode(null); setEditing(null); }}
      />

      <ActionModal
        open={!!deleteTarget}
        title="Delete Reminder"
        description={`Delete this reminder for tender "${deleteTarget?.tender || ''}"?`}
        variant="danger"
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={deleteReminder}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
