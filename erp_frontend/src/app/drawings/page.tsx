<<<<<<< HEAD
'use client';
import { useEffect, useState } from 'react';
import { PenTool, Plus, CheckCircle2, Clock, X } from 'lucide-react';

interface Drawing {
  name: string;
  drawing_number?: string;
  title?: string;
  revision?: string;
  status?: string;
  client_approval_status?: string;
  linked_project?: string;
  linked_site?: string;
  approved_by?: string;
  approval_date?: string;
}

function statusBadge(s?: string) {
  const m: Record<string, string> = { Draft: 'badge-yellow', Submitted: 'badge-blue', Approved: 'badge-green', Superseded: 'badge-gray', Rejected: 'badge-red' };
  return m[s || ''] || 'badge-gray';
}

function approvalBadge(s?: string) {
  const m: Record<string, string> = { Pending: 'badge-yellow', Approved: 'badge-green', 'Approved with Comments': 'badge-blue', Rejected: 'badge-red' };
  return m[s || ''] || 'badge-gray';
}

export default function DrawingsPage() {
  const [items, setItems] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ drawing_number: '', title: '', revision: 'R0', linked_project: '', linked_site: '' });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/drawings').then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/drawings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setForm({ drawing_number: '', title: '', revision: 'R0', linked_project: '', linked_site: '' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const approved = items.filter(i => i.status === 'Approved').length;
  const pending = items.filter(i => i.status === 'Draft' || i.status === 'Submitted').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Engineering Drawings</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Manage drawings, revisions, and client approvals.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Add Drawing</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><PenTool className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Drawings</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></div><div><div className="stat-value">{approved}</div><div className="stat-label">Approved</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{pending}</div><div className="stat-label">Pending</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Drawings</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Drawing #</th><th>Title</th><th>Rev</th><th>Project</th><th>Site</th><th>Status</th><th>Client Approval</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No drawings found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-900 font-medium">{item.drawing_number || '-'}</div></td>
                  <td><div className="text-sm text-gray-900 max-w-xs truncate">{item.title || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.revision || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_site || '-'}</div></td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || 'Draft'}</span></td>
                  <td><span className={`badge ${approvalBadge(item.client_approval_status)}`}>{item.client_approval_status || '-'}</span></td>
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
              <div><h2 className="text-lg font-semibold text-gray-900">Add Drawing</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Drawing Number *</div><input className="input" value={form.drawing_number} onChange={e => setForm({ ...form, drawing_number: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Revision</div><input className="input" value={form.revision} onChange={e => setForm({ ...form, revision: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Title *</div><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Site</div><input className="input" value={form.linked_site} onChange={e => setForm({ ...form, linked_site: e.target.value })} /></label>
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
=======
export { default } from '../engineering/drawings/page';
>>>>>>> 41b381c (improved ui)
