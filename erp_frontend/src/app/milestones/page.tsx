'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Target, Plus, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';

interface Milestone {
  name: string;
  milestone_name?: string;
  status?: string;
  linked_project?: string;
  linked_site?: string;
  planned_date?: string;
  actual_date?: string;
  owner_user?: string;
}

function statusBadge(status?: string) {
  const map: Record<string, string> = { Pending: 'badge-yellow', 'In Progress': 'badge-blue', Completed: 'badge-green', Overdue: 'badge-red', Cancelled: 'badge-gray' };
  return map[status || ''] || 'badge-gray';
}

export default function MilestonesPage() {
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [form, setForm] = useState({ milestone_name: '', linked_project: '', linked_site: '', planned_date: '' });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/milestones').then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/milestones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setForm({ milestone_name: '', linked_project: '', linked_site: '', planned_date: '' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete milestone ${name}?`)) return;
    setDeletingName(name);
    try {
      const res = await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'delete_milestone', args: { name } }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setDeletingName(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const completed = items.filter(i => i.status === 'Completed').length;
  const overdue = items.filter(i => i.status === 'Overdue').length;
  const pending = items.filter(i => i.status === 'Pending' || i.status === 'In Progress').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Project Milestones</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Track key deliverables and deadlines across projects.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Add Milestone</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Target className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{pending}</div><div className="stat-label">Pending / In Progress</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></div><div><div className="stat-value">{completed}</div><div className="stat-label">Completed</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><AlertCircle className="w-5 h-5" /></div><div><div className="stat-value">{overdue}</div><div className="stat-label">Overdue</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Milestones</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Milestone</th><th>Project</th><th>Site</th><th>Planned Date</th><th>Actual Date</th><th>Owner</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-500">No milestones found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><Link href={`/milestones/${encodeURIComponent(item.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{item.name}</Link></td>
                  <td><div className="text-sm text-gray-900">{item.milestone_name || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_site || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.planned_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.actual_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.owner_user || '-'}</div></td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || '-'}</span></td>
                  <td><button disabled={deletingName === item.name} onClick={() => handleDelete(item.name)} className="text-gray-500 text-sm font-medium hover:text-red-600">Delete</button></td>
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
              <div><h2 className="text-lg font-semibold text-gray-900">Add Milestone</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Milestone Name *</div><input className="input" value={form.milestone_name} onChange={e => setForm({ ...form, milestone_name: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Site</div><input className="input" value={form.linked_site} onChange={e => setForm({ ...form, linked_site: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Planned Date</div><input className="input" type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} /></label>
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
