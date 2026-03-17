'use client';
import { useEffect, useState } from 'react';
import { ClipboardList, Plus, Clock, CheckCircle2, ShoppingCart, X } from 'lucide-react';

interface Indent {
  name: string;
  material_request_type?: string;
  transaction_date?: string;
  schedule_date?: string;
  status?: string;
  company?: string;
  set_warehouse?: string;
  docstatus?: number;
  per_ordered?: number;
  creation?: string;
}

interface IndentStats {
  total?: number;
  draft?: number;
  pending?: number;
  partially_ordered?: number;
  ordered?: number;
  transferred?: number;
  cancelled?: number;
}

function statusBadge(status?: string) {
  const map: Record<string, string> = { Draft: 'badge-yellow', Pending: 'badge-blue', 'Partially Ordered': 'badge-purple', Ordered: 'badge-green', Transferred: 'badge-green', Cancelled: 'badge-red' };
  return map[status || ''] || 'badge-gray';
}

export default function IndentsPage() {
  const [items, setItems] = useState<Indent[]>([]);
  const [stats, setStats] = useState<IndentStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ material_request_type: 'Purchase', set_warehouse: '', schedule_date: '', project: '' });

  const loadData = async () => {
    setLoading(true);
    const [listRes, statsRes] = await Promise.all([
      fetch('/api/indents').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/indents/stats').then(r => r.json()).catch(() => ({ data: {} })),
    ]);
    setItems(listRes.data || []);
    setStats(statsRes.data || {});
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/indents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to create indent');
      setShowCreate(false);
      setForm({ material_request_type: 'Purchase', set_warehouse: '', schedule_date: '', project: '' });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create indent');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Material Indents</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Raise material requirements from project sites.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Create Indent</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><ClipboardList className="w-5 h-5" /></div><div><div className="stat-value">{stats.total ?? items.length}</div><div className="stat-label">Total Indents</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{stats.draft ?? 0}</div><div className="stat-label">Draft</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600"><ClipboardList className="w-5 h-5" /></div><div><div className="stat-value">{stats.pending ?? 0}</div><div className="stat-label">Pending</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></div><div><div className="stat-value">{stats.ordered ?? 0}</div><div className="stat-label">Ordered</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600"><ShoppingCart className="w-5 h-5" /></div><div><div className="stat-value">{(stats.partially_ordered ?? 0) + (stats.transferred ?? 0)}</div><div className="stat-label">In Progress</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Indents</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Indent #</th><th>Type</th><th>Date</th><th>Required By</th><th>Warehouse</th><th>Status</th><th>% Ordered</th></tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No indent records found</td></tr>
              ) : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-700">{item.material_request_type || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.transaction_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.schedule_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.set_warehouse || '-'}</div></td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || 'Draft'}</span></td>
                  <td><div className="text-sm text-gray-700">{item.per_ordered?.toFixed(0) ?? 0}%</div></td>
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
              <div><h2 className="text-lg font-semibold text-gray-900">Create Indent</h2><p className="text-sm text-gray-500 mt-1">Raise a material requirement from a project site.</p></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Type</div><select className="input" value={form.material_request_type} onChange={e => setForm({ ...form, material_request_type: e.target.value })}><option value="Purchase">Purchase</option><option value="Material Transfer">Material Transfer</option><option value="Material Issue">Material Issue</option></select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project</div><input className="input" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Warehouse</div><input className="input" value={form.set_warehouse} onChange={e => setForm({ ...form, set_warehouse: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Required By</div><input className="input" type="date" value={form.schedule_date} onChange={e => setForm({ ...form, schedule_date: e.target.value })} /></label>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Indent'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
