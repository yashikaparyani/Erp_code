'use client';
import { useEffect, useState } from 'react';
import { GitPullRequest, Plus, X } from 'lucide-react';

interface ChangeRequest {
  name: string;
  cr_number?: string;
  linked_project?: string;
  status?: string;
  cost_impact?: number;
  schedule_impact_days?: number;
  raised_by?: string;
  approved_by?: string;
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function statusBadge(s?: string) {
  const m: Record<string, string> = { Draft: 'badge-yellow', Submitted: 'badge-blue', Approved: 'badge-green', Rejected: 'badge-red', Implemented: 'badge-purple' };
  return m[s || ''] || 'badge-gray';
}

export default function ChangeRequestsPage() {
  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ cr_number: '', linked_project: '', cost_impact: '', schedule_impact_days: '' });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/change-requests').then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/change-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, cost_impact: parseFloat(form.cost_impact) || 0, schedule_impact_days: parseInt(form.schedule_impact_days) || 0 }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setForm({ cr_number: '', linked_project: '', cost_impact: '', schedule_impact_days: '' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const totalCostImpact = items.reduce((s, i) => s + (i.cost_impact || 0), 0);
  const approved = items.filter(i => i.status === 'Approved' || i.status === 'Implemented').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Change Requests</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Track scope changes, cost impacts, and schedule impacts.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Raise CR</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><GitPullRequest className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total CRs</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><GitPullRequest className="w-5 h-5" /></div><div><div className="stat-value">{approved}</div><div className="stat-label">Approved</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><GitPullRequest className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(totalCostImpact)}</div><div className="stat-label">Total Cost Impact</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Change Requests</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>CR #</th><th>Project</th><th>Cost Impact</th><th>Schedule Impact</th><th>Raised By</th><th>Approved By</th><th>Status</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No change requests found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-900 font-medium">{item.cr_number || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td><div className="text-sm font-medium text-gray-900">{formatCurrency(item.cost_impact)}</div></td>
                  <td><div className="text-sm text-gray-700">{item.schedule_impact_days ?? 0} days</div></td>
                  <td><div className="text-sm text-gray-700">{item.raised_by || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.approved_by || '-'}</div></td>
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
              <div><h2 className="text-lg font-semibold text-gray-900">Raise Change Request</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">CR Number</div><input className="input" value={form.cr_number} onChange={e => setForm({ ...form, cr_number: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project *</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Cost Impact (₹)</div><input className="input" type="number" value={form.cost_impact} onChange={e => setForm({ ...form, cost_impact: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Schedule Impact (days)</div><input className="input" type="number" value={form.schedule_impact_days} onChange={e => setForm({ ...form, schedule_impact_days: e.target.value })} /></label>
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
