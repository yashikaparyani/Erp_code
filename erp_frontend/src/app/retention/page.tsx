'use client';
import { useEffect, useState } from 'react';
import { Lock, Plus, CheckCircle2, Clock, X } from 'lucide-react';

interface RetentionLedger {
  name: string;
  linked_project?: string;
  linked_invoice?: string;
  retention_percent?: number;
  retention_amount?: number;
  release_due_date?: string;
  released_on?: string;
  release_amount?: number;
  status?: string;
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function statusBadge(s?: string) {
  const m: Record<string, string> = { Held: 'badge-yellow', 'Partially Released': 'badge-blue', Released: 'badge-green', Forfeited: 'badge-red' };
  return m[s || ''] || 'badge-gray';
}

export default function RetentionPage() {
  const [items, setItems] = useState<RetentionLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ linked_project: '', linked_invoice: '', retention_percent: '', retention_amount: '', release_due_date: '' });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/retention').then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/retention', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, retention_percent: parseFloat(form.retention_percent) || 0, retention_amount: parseFloat(form.retention_amount) || 0 }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setForm({ linked_project: '', linked_invoice: '', retention_percent: '', retention_amount: '', release_due_date: '' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const totalHeld = items.filter(i => i.status === 'Held').reduce((s, i) => s + (i.retention_amount || 0), 0);
  const totalReleased = items.reduce((s, i) => s + (i.release_amount || 0), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Retention Money</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Track retention amounts held and released across projects.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Add Entry</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Lock className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Entries</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(totalHeld)}</div><div className="stat-label">Currently Held</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(totalReleased)}</div><div className="stat-label">Released</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Retention Ledger</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Project</th><th>Invoice</th><th>%</th><th>Amount</th><th>Due Date</th><th>Released</th><th>Status</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No retention entries found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_invoice || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.retention_percent ?? 0}%</div></td>
                  <td><div className="text-sm font-medium text-gray-900">{formatCurrency(item.retention_amount)}</div></td>
                  <td><div className="text-sm text-gray-700">{item.release_due_date || '-'}</div></td>
                  <td><div className="text-sm text-green-700">{formatCurrency(item.release_amount)}</div></td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div><h2 className="text-lg font-semibold text-gray-900">Add Retention Entry</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project *</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Invoice</div><input className="input" value={form.linked_invoice} onChange={e => setForm({ ...form, linked_invoice: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Retention %</div><input className="input" type="number" value={form.retention_percent} onChange={e => setForm({ ...form, retention_percent: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Amount (₹)</div><input className="input" type="number" value={form.retention_amount} onChange={e => setForm({ ...form, retention_amount: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Release Due Date</div><input className="input" type="date" value={form.release_due_date} onChange={e => setForm({ ...form, release_due_date: e.target.value })} /></label>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3"><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
