'use client';
import { useEffect, useState } from 'react';
import { Users, Plus, DollarSign, Clock, X } from 'lucide-react';

interface ManpowerLog {
  name: string;
  linked_project?: string;
  linked_site?: string;
  log_date?: string;
  worker_name?: string;
  designation?: string;
  role_in_project?: string;
  is_contractor?: number;
  contractor_company?: string;
  man_days?: number;
  daily_rate?: number;
  total_cost?: number;
  overtime_hours?: number;
  overtime_cost?: number;
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function ManpowerPage() {
  const [items, setItems] = useState<ManpowerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ worker_name: '', designation: '', linked_project: '', linked_site: '', log_date: '', man_days: '1', daily_rate: '' });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/manpower').then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/manpower', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, man_days: parseFloat(form.man_days) || 1, daily_rate: parseFloat(form.daily_rate) || 0 }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setForm({ worker_name: '', designation: '', linked_project: '', linked_site: '', log_date: '', man_days: '1', daily_rate: '' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const totalManDays = items.reduce((s, i) => s + (i.man_days || 0), 0);
  const totalCost = items.reduce((s, i) => s + (i.total_cost || 0), 0);
  const totalOTHours = items.reduce((s, i) => s + (i.overtime_hours || 0), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manpower Logs</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Daily labour deployment and cost tracking.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Log Manpower</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Users className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Entries</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600"><Users className="w-5 h-5" /></div><div><div className="stat-value">{totalManDays.toFixed(1)}</div><div className="stat-label">Total Man-Days</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><DollarSign className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(totalCost)}</div><div className="stat-label">Total Cost</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{totalOTHours.toFixed(1)}</div><div className="stat-label">OT Hours</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Manpower Entries</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Worker</th><th>Designation</th><th>Project</th><th>Date</th><th>Man-Days</th><th>Daily Rate</th><th>Total Cost</th><th>OT Hours</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-500">No manpower logs found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-900">{item.worker_name || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.designation || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.log_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-900 font-medium">{item.man_days ?? 0}</div></td>
                  <td><div className="text-sm text-gray-700">{formatCurrency(item.daily_rate)}</div></td>
                  <td><div className="text-sm font-medium text-gray-900">{formatCurrency(item.total_cost)}</div></td>
                  <td><div className="text-sm text-gray-700">{item.overtime_hours ?? 0}</div></td>
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
              <div><h2 className="text-lg font-semibold text-gray-900">Log Manpower</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Worker Name *</div><input className="input" value={form.worker_name} onChange={e => setForm({ ...form, worker_name: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Designation</div><input className="input" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Date</div><input className="input" type="date" value={form.log_date} onChange={e => setForm({ ...form, log_date: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Site</div><input className="input" value={form.linked_site} onChange={e => setForm({ ...form, linked_site: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Man-Days</div><input className="input" type="number" step="0.5" value={form.man_days} onChange={e => setForm({ ...form, man_days: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Daily Rate (₹)</div><input className="input" type="number" value={form.daily_rate} onChange={e => setForm({ ...form, daily_rate: e.target.value })} /></label>
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
