'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Plus, RefreshCcw, X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { projectWorkspaceApi } from '@/lib/typedApi';

type CommLog = {
  name: string;
  linked_project: string;
  linked_site?: string;
  communication_date: string;
  communication_type?: string;
  direction?: string;
  subject: string;
  counterparty_name?: string;
  counterparty_role?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  logged_by?: string;
  creation: string;
};

const TYPE_TONES: Record<string, string> = {
  Email: 'bg-blue-50 text-blue-600',
  Call: 'bg-purple-50 text-purple-600',
  Meeting: 'bg-teal-50 text-teal-600',
  WhatsApp: 'bg-emerald-50 text-emerald-600',
  Letter: 'bg-amber-50 text-amber-600',
  'Site Visit': 'bg-orange-50 text-orange-600',
  Other: 'bg-gray-100 text-gray-600',
};

export default function CommunicationsTab({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    subject: '', summary: '', communication_type: 'Call', direction: 'Outbound',
    counterparty_name: '', counterparty_role: '',
    follow_up_required: false, follow_up_date: '', communication_date: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await projectWorkspaceApi.getCommLogs<CommLog[]>(projectId);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load communications');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const followUpPending = logs.filter((l) => l.follow_up_required);

  const submitCreate = async () => {
    if (!form.subject.trim()) return;
    setCreating(true);
    try {
      await projectWorkspaceApi.createCommLog({
        linked_project: projectId,
        subject: form.subject.trim(),
        summary: form.summary.trim() || form.subject.trim(),
        communication_type: form.communication_type,
        direction: form.direction,
        counterparty_name: form.counterparty_name.trim() || undefined,
        counterparty_role: form.counterparty_role.trim() || undefined,
        follow_up_required: form.follow_up_required ? 1 : 0,
        follow_up_date: form.follow_up_date || undefined,
        communication_date: form.communication_date || new Date().toISOString().split('T')[0],
      });
      setShowCreate(false);
      setForm({
        subject: '', summary: '', communication_type: 'Call', direction: 'Outbound',
        counterparty_name: '', counterparty_role: '',
        follow_up_required: false, follow_up_date: '', communication_date: '',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create communication log');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[var(--text-muted)]">
          {logs.length} communication{logs.length !== 1 ? 's' : ''} logged
          {followUpPending.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              {followUpPending.length} follow-up{followUpPending.length !== 1 ? 's' : ''} pending
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn btn-secondary text-xs">
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs">
            <Plus className="h-3.5 w-3.5" /> Log Communication
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">No communications logged for this project.</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.name} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-main)] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {log.direction === 'Inbound' ? (
                    <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${TYPE_TONES[log.communication_type || 'Other'] || TYPE_TONES.Other}`}>
                      {log.communication_type || 'Other'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{log.communication_date}</span>
                    {log.follow_up_required && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                        Follow-up{log.follow_up_date ? `: ${log.follow_up_date}` : ''}
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1 text-sm font-medium text-[var(--text-main)]">{log.subject}</h4>
                  <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
                    {log.counterparty_name && <span>With: {log.counterparty_name}</span>}
                    {log.counterparty_role && <span>({log.counterparty_role})</span>}
                    {log.logged_by && <span>Logged by: {log.logged_by}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Log Communication</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Subject *</label>
                <input className="input" placeholder="Communication subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Summary / Notes *</label>
                <textarea className="input min-h-20" placeholder="Short summary of the communication" value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
                  <select className="input" value={form.communication_type} onChange={(e) => setForm((p) => ({ ...p, communication_type: e.target.value }))}>
                    <option>Call</option>
                    <option>Email</option>
                    <option>Meeting</option>
                    <option>WhatsApp</option>
                    <option>Letter</option>
                    <option>Site Visit</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Direction</label>
                  <select className="input" value={form.direction} onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))}>
                    <option>Outbound</option>
                    <option>Inbound</option>
                    <option>Internal</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input className="input" type="date" value={form.communication_date} onChange={(e) => setForm((p) => ({ ...p, communication_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">With (Name)</label>
                  <input className="input" placeholder="Client / vendor name" value={form.counterparty_name} onChange={(e) => setForm((p) => ({ ...p, counterparty_name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                  <input className="input" placeholder="e.g. Site Engineer" value={form.counterparty_role} onChange={(e) => setForm((p) => ({ ...p, counterparty_role: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.follow_up_required} onChange={(e) => setForm((p) => ({ ...p, follow_up_required: e.target.checked }))} />
                  Requires follow-up
                </label>
                {form.follow_up_required && (
                  <input className="input w-40" type="date" value={form.follow_up_date} onChange={(e) => setForm((p) => ({ ...p, follow_up_date: e.target.value }))} />
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => void submitCreate()} disabled={creating || !form.subject.trim() || !form.summary.trim()} className="btn btn-primary">
                {creating ? 'Saving...' : 'Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
