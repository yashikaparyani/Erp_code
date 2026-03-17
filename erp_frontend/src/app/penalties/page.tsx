'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, X } from 'lucide-react';

interface Penalty {
  name: string;
  linked_project?: string;
  linked_invoice?: string;
  penalty_source?: string;
  penalty_date?: string;
  amount?: number;
  reason?: string;
  applied_at_stage?: string;
  status?: string;
  approved_by?: string;
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function statusBadge(s?: string) {
  const m: Record<string, string> = { Draft: 'badge-yellow', Applied: 'badge-red', Waived: 'badge-green', Disputed: 'badge-blue' };
  return m[s || ''] || 'badge-gray';
}

export default function PenaltiesPage() {
  const [items, setItems] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ linked_project: '', penalty_source: '', penalty_date: '', amount: '', reason: '' });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/penalties').then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/penalties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount) || 0 }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setForm({ linked_project: '', penalty_source: '', penalty_date: '', amount: '', reason: '' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const totalPenalties = items.reduce((s, i) => s + (i.amount || 0), 0);
  const applied = items.filter(i => i.status === 'Applied').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Penalty Deductions</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Track penalties and deductions applied against projects.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Add Penalty</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><AlertTriangle className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Penalties</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><AlertTriangle className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(totalPenalties)}</div><div className="stat-label">Total Amount</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><AlertTriangle className="w-5 h-5" /></div><div><div className="stat-value">{applied}</div><div className="stat-label">Applied</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Penalties</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Project</th><th>Source</th><th>Date</th><th>Reason</th><th>Amount</th><th>Stage</th><th>Status</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No penalties found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.penalty_source || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.penalty_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-900 max-w-xs truncate">{item.reason || '-'}</div></td>
                  <td><div className="text-sm font-medium text-red-700">{formatCurrency(item.amount)}</div></td>
                  <td><div className="text-sm text-gray-700">{item.applied_at_stage || '-'}</div></td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || 'Draft'}</span></td>
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
              <div><h2 className="text-lg font-semibold text-gray-900">Add Penalty</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project *</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Source</div><input className="input" value={form.penalty_source} onChange={e => setForm({ ...form, penalty_source: e.target.value })} placeholder="Client / Subcontractor" /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Date</div><input className="input" type="date" value={form.penalty_date} onChange={e => setForm({ ...form, penalty_date: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Amount (₹) *</div><input className="input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Reason</div><input className="input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
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
