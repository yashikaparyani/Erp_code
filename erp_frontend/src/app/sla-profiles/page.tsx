'use client';
import { useEffect, useState } from 'react';
import { Shield, Plus, X } from 'lucide-react';

interface SLAProfile {
  name: string;
  profile_name?: string;
  linked_project?: string;
  response_minutes?: number;
  resolution_minutes?: number;
  working_hours_type?: string;
  escalation_enabled?: number;
  is_active?: number;
}

export default function SLAProfilesPage() {
  const [items, setItems] = useState<SLAProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ profile_name: '', linked_project: '', response_minutes: '60', resolution_minutes: '480', working_hours_type: 'Business Hours' });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/sla-profiles').then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/sla-profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, response_minutes: parseInt(form.response_minutes) || 60, resolution_minutes: parseInt(form.resolution_minutes) || 480 }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setForm({ profile_name: '', linked_project: '', response_minutes: '60', resolution_minutes: '480', working_hours_type: 'Business Hours' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const active = items.filter(i => i.is_active).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">SLA Profiles</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Define service level agreements for helpdesk tickets.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />New Profile</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Shield className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Profiles</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Shield className="w-5 h-5" /></div><div><div className="stat-value">{active}</div><div className="stat-label">Active</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All SLA Profiles</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Profile Name</th><th>Project</th><th>Response (min)</th><th>Resolution (min)</th><th>Hours Type</th><th>Escalation</th><th>Active</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No SLA profiles found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-900">{item.profile_name || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.response_minutes ?? '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.resolution_minutes ?? '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.working_hours_type || '-'}</div></td>
                  <td><span className={`badge ${item.escalation_enabled ? 'badge-green' : 'badge-gray'}`}>{item.escalation_enabled ? 'Yes' : 'No'}</span></td>
                  <td><span className={`badge ${item.is_active ? 'badge-green' : 'badge-red'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></td>
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
              <div><h2 className="text-lg font-semibold text-gray-900">New SLA Profile</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Profile Name *</div><input className="input" value={form.profile_name} onChange={e => setForm({ ...form, profile_name: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Project</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Response Time (min)</div><input className="input" type="number" value={form.response_minutes} onChange={e => setForm({ ...form, response_minutes: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Resolution Time (min)</div><input className="input" type="number" value={form.resolution_minutes} onChange={e => setForm({ ...form, resolution_minutes: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Working Hours Type</div><select className="input" value={form.working_hours_type} onChange={e => setForm({ ...form, working_hours_type: e.target.value })}><option>Business Hours</option><option>24x7</option><option>Custom</option></select></label>
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
