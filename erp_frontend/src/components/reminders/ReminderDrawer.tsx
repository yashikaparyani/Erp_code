'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlarmClock,
  Clock,
  Plus,
  Trash2,
  X,
  PauseCircle,
  XCircle,
} from 'lucide-react';

/* ── Types ── */
type Reminder = {
  name: string;
  title: string;
  reminder_datetime: string;
  repeat_rule: string;
  next_reminder_at?: string;
  linked_project?: string;
  linked_site?: string;
  linked_stage?: string;
  reference_doctype?: string;
  reference_name?: string;
  status: 'Active' | 'Snoozed' | 'Dismissed' | 'Completed';
  is_sent: 0 | 1;
  notes?: string;
  creation: string;
};

type ReminderDrawerProps = {
  projectId: string;
  projectName?: string;
};

/* ── Helpers ── */
function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  Snoozed: 'bg-amber-50 text-amber-700',
  Dismissed: 'bg-gray-100 text-gray-500',
  Completed: 'bg-blue-50 text-blue-600',
};

/* ── Component ── */
export default function ReminderDrawer({ projectId, projectName }: ReminderDrawerProps) {
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── Create form state ── */
  const [newTitle, setNewTitle] = useState('');
  const [newDateTime, setNewDateTime] = useState('');
  const [newRepeat, setNewRepeat] = useState('None');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* Fetch reminders for this project */
  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders?project=${encodeURIComponent(projectId)}&active_only=0&limit=50`);
      const json = await res.json();
      const list: Reminder[] = json?.data ?? json ?? [];
      setReminders(Array.isArray(list) ? list : []);
    } catch { /* silent */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (open) fetchReminders();
  }, [open, fetchReminders]);

  /* Click outside close */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  /* ── Actions ── */
  const postAction = async (action: string, params: Record<string, unknown>) => {
    await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    });
    fetchReminders();
  };

  const handleSnooze = (name: string, minutes = 15) => postAction('snooze', { reminder_name: name, minutes });
  const handleDismiss = (name: string) => postAction('dismiss', { reminder_name: name });
  const handleDelete = (name: string) => postAction('delete', { reminder_name: name });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDateTime) return;
    setSubmitting(true);
    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: newTitle.trim(),
          reminder_datetime: newDateTime,
          repeat_rule: newRepeat,
          linked_project: projectId,
          notes: newNotes.trim() || undefined,
        }),
      });
      setNewTitle('');
      setNewDateTime('');
      setNewRepeat('None');
      setNewNotes('');
      setShowCreate(false);
      fetchReminders();
    } catch { /* silent */ }
    setSubmitting(false);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="workspace-chip inline-flex items-center gap-1.5 cursor-pointer hover:!bg-[var(--surface-hover)]"
        title="My Reminders"
      >
        <AlarmClock className="w-3.5 h-3.5" />
        Reminders
      </button>

      {/* Slide-over drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />

          {/* panel */}
          <div
            ref={panelRef}
            className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-main)]">My Reminders</h2>
                {projectName && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{projectName}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreate((v) => !v)}
                  className="rounded-xl p-2 text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
                  title="New Reminder"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-gray-100"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Create Form */}
            {showCreate && (
              <form onSubmit={handleCreate} className="border-b border-[var(--border-subtle)] px-5 py-4 space-y-3 bg-gray-50/50">
                <input
                  type="text"
                  placeholder="Reminder title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  required
                />
                <input
                  type="datetime-local"
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  required
                />
                <select
                  value={newRepeat}
                  onChange={(e) => setNewRepeat(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                >
                  <option value="None">No repeat</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
                <textarea
                  placeholder="Notes (optional)"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-xl px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            )}

            {/* Reminder List */}
            <div className="flex-1 overflow-y-auto">
              {loading && reminders.length === 0 && (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">Loading…</div>
              )}

              {!loading && reminders.length === 0 && (
                <div className="py-12 text-center">
                  <AlarmClock className="mx-auto h-8 w-8 text-[var(--text-muted)] opacity-30" />
                  <p className="mt-2 text-xs text-[var(--text-muted)]">No reminders for this project</p>
                </div>
              )}

              {reminders.map((r) => (
                <div
                  key={r.name}
                  className={`border-b border-[var(--border-subtle)] px-5 py-3 last:border-0 ${
                    r.status === 'Dismissed' ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-main)] line-clamp-1">{r.title}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(r.next_reminder_at || r.reminder_datetime)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[r.status] || ''}`}>
                          {r.status}
                        </span>
                        {r.repeat_rule && r.repeat_rule !== 'None' && (
                          <span className="text-[10px] text-[var(--text-muted)]">↻ {r.repeat_rule}</span>
                        )}
                      </div>
                      {r.notes && (
                        <p className="mt-1 text-[11px] text-[var(--text-muted)] line-clamp-2">{r.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    {r.status === 'Active' || r.status === 'Snoozed' ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleSnooze(r.name)}
                          className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                          title="Snooze 15 min"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDismiss(r.name)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                          title="Dismiss"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.name)}
                          className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(r.name)}
                        className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 flex-shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
