'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Plus, RefreshCcw, X, CheckCircle2, XCircle, Trash2, Send } from 'lucide-react';
import { projectWorkspaceApi } from '@/lib/typedApi';
import { useAuth } from '@/context/AuthContext';

type PettyCashEntry = {
  name: string;
  linked_project: string;
  linked_site?: string;
  entry_date: string;
  description: string;
  category?: string;
  amount: number;
  paid_to?: string;
  paid_by?: string;
  voucher_ref?: string;
  status: string;
  approved_by?: string;
  approved_on?: string;
  creation: string;
};

const STATUS_TONES: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Pending: 'bg-amber-50 text-amber-600',
  Approved: 'bg-emerald-50 text-emerald-600',
  Rejected: 'bg-rose-50 text-rose-600',
};

export default function PettyCashTab({ projectId }: { projectId: string }) {
  const { currentUser } = useAuth();
  const canApprove = currentUser?.role === 'Project Head' || currentUser?.role === 'Director';
  const [entries, setEntries] = useState<PettyCashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionBusy, setActionBusy] = useState('');
  const [form, setForm] = useState({
    description: '', amount: '', category: '', paid_to: '', entry_date: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await projectWorkspaceApi.getPettyCashEntries<PettyCashEntry[]>(projectId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load petty cash entries');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const totalSpent = entries.reduce((s, e) => s + (e.amount || 0), 0);
  const totalApproved = entries.filter((e) => e.status === 'Approved').reduce((s, e) => s + (e.amount || 0), 0);
  const pendingCount = entries.filter((e) => e.status === 'Pending').length;

  const submitCreate = async () => {
    const amt = parseFloat(form.amount);
    if (!form.description.trim() || isNaN(amt) || amt <= 0) return;
    setCreating(true);
    try {
      await projectWorkspaceApi.createPettyCashEntry({
        linked_project: projectId,
        description: form.description.trim(),
        amount: amt,
        category: form.category.trim() || undefined,
        paid_to: form.paid_to.trim() || undefined,
        entry_date: form.entry_date || new Date().toISOString().split('T')[0],
        status: 'Pending',
      });
      setShowCreate(false);
      setForm({ description: '', amount: '', category: '', paid_to: '', entry_date: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create petty cash entry');
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (name: string, action: 'approve' | 'reject' | 'delete' | 'submit_ph') => {
    if (action === 'delete' && !confirm('Delete this petty cash entry?')) return;
    if (action === 'reject') {
      const reason = prompt('Rejection reason:');
      if (!reason?.trim()) return;
      setActionBusy(name);
      try {
        await projectWorkspaceApi.rejectPettyCashEntry(name, reason.trim());
        await load();
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
      finally { setActionBusy(''); }
      return;
    }
    setActionBusy(name);
    try {
      if (action === 'approve') await projectWorkspaceApi.approvePettyCashEntry(name);
      else if (action === 'delete') await projectWorkspaceApi.deletePettyCashEntry(name);
      else if (action === 'submit_ph') await projectWorkspaceApi.submitPettyCashToPh(name);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); }
    finally { setActionBusy(''); }
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

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <SummaryPill label="Total" value={`₹${totalSpent.toLocaleString('en-IN')}`} />
          <SummaryPill label="Approved" value={`₹${totalApproved.toLocaleString('en-IN')}`} tone="success" />
          {pendingCount > 0 && <SummaryPill label="Pending" value={`${pendingCount}`} tone="warning" />}
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn btn-secondary text-xs">
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs">
            <Plus className="h-3.5 w-3.5" /> New Entry
          </button>
        </div>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">No petty cash entries for this project.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Paid To</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.name}>
                  <td className="whitespace-nowrap text-xs">{entry.entry_date}</td>
                  <td className="max-w-[200px] truncate font-medium">{entry.description}</td>
                  <td className="text-xs">{entry.category || '—'}</td>
                  <td className="whitespace-nowrap font-medium">₹{(entry.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="text-xs">{entry.paid_to || '—'}</td>
                  <td>
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONES[entry.status] || 'bg-gray-100 text-gray-600'}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {entry.status === 'Pending' && canApprove && (
                        <>
                          <button onClick={() => void runAction(entry.name, 'approve')} disabled={actionBusy === entry.name}
                            className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100">
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </button>
                          <button onClick={() => void runAction(entry.name, 'reject')} disabled={actionBusy === entry.name}
                            className="inline-flex items-center gap-0.5 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 hover:bg-rose-100">
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </>
                      )}
                      {entry.status === 'Draft' && (
                        <button onClick={() => void runAction(entry.name, 'submit_ph')} disabled={actionBusy === entry.name}
                          className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100">
                          <Send className="h-3 w-3" /> Submit to PH
                        </button>
                      )}
                      {(entry.status === 'Draft' || entry.status === 'Pending') && (
                        <button onClick={() => void runAction(entry.name, 'delete')} disabled={actionBusy === entry.name}
                          className="text-gray-400 hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">New Petty Cash Entry</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
                <input className="input" placeholder="What was the expense for?" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Amount (₹) *</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                  <input className="input" placeholder="e.g. Transport, Material" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Paid To</label>
                  <input className="input" placeholder="Recipient" value={form.paid_to} onChange={(e) => setForm((p) => ({ ...p, paid_to: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input className="input" type="date" value={form.entry_date} onChange={(e) => setForm((p) => ({ ...p, entry_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => void submitCreate()} disabled={creating || !form.description.trim() || !form.amount} className="btn btn-primary">
                {creating ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  const cls = {
    default: 'bg-[var(--surface-raised)] text-[var(--text-main)]',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      {label}: <strong>{value}</strong>
    </span>
  );
}
