'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Activity, Plus, X } from 'lucide-react';

interface DeviceUptimeLog {
  name: string;
  linked_site?: string;
  linked_project?: string;
  device_name?: string;
  device_type?: string;
  serial_no?: string;
  log_date?: string;
  uptime_hours?: number;
  downtime_hours?: number;
  sla_target_uptime_pct?: number;
  actual_uptime_pct?: number;
  sla_status?: string;
  downtime_reason?: string;
}

function slaBadge(s?: string) {
  const m: Record<string, string> = { Met: 'badge-green', Breached: 'badge-red', 'At Risk': 'badge-yellow' };
  return m[s || ''] || 'badge-gray';
}

export default function DeviceUptimePage() {
  const [items, setItems] = useState<DeviceUptimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ device_name: '', device_type: '', linked_site: '', linked_project: '', log_date: '', uptime_hours: '24', downtime_hours: '0' });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/device-uptime');
      setItems(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/device-uptime', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, uptime_hours: parseFloat(form.uptime_hours) || 0, downtime_hours: parseFloat(form.downtime_hours) || 0 }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setForm({ device_name: '', device_type: '', linked_site: '', linked_project: '', log_date: '', uptime_hours: '24', downtime_hours: '0' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const breached = items.filter(i => i.sla_status === 'Breached').length;
  const avgUptime = items.length ? (items.reduce((s, i) => s + (i.actual_uptime_pct || 0), 0) / items.length) : 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Device Uptime Logs</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Monitor device uptime, downtime, and SLA compliance.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Log Entry</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Activity className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Entries</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Activity className="w-5 h-5" /></div><div><div className="stat-value">{avgUptime.toFixed(1)}%</div><div className="stat-label">Avg Uptime</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><Activity className="w-5 h-5" /></div><div><div className="stat-value">{breached}</div><div className="stat-label">SLA Breached</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Device Uptime Records</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Device</th><th>Type</th><th>Site</th><th>Date</th><th>Up (hrs)</th><th>Down (hrs)</th><th>Actual %</th><th>SLA Target</th><th>SLA</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-500">No device uptime logs found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-900">{item.device_name || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.device_type || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_site || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.log_date || '-'}</div></td>
                  <td><div className="text-sm text-green-700 font-medium">{item.uptime_hours ?? '-'}</div></td>
                  <td><div className="text-sm text-red-700">{item.downtime_hours ?? '-'}</div></td>
                  <td><div className="text-sm font-medium text-gray-900">{item.actual_uptime_pct?.toFixed(1) ?? '-'}%</div></td>
                  <td><div className="text-sm text-gray-700">{item.sla_target_uptime_pct ?? '-'}%</div></td>
                  <td><span className={`badge ${slaBadge(item.sla_status)}`}>{item.sla_status || '-'}</span></td>
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
              <div><h2 className="text-lg font-semibold text-gray-900">Log Device Uptime</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Device Name *</div><input className="input" value={form.device_name} onChange={e => setForm({ ...form, device_name: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Device Type</div><input className="input" value={form.device_type} onChange={e => setForm({ ...form, device_type: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Site</div><input className="input" value={form.linked_site} onChange={e => setForm({ ...form, linked_site: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Date</div><input className="input" type="date" value={form.log_date} onChange={e => setForm({ ...form, log_date: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Uptime (hrs)</div><input className="input" type="number" value={form.uptime_hours} onChange={e => setForm({ ...form, uptime_hours: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Downtime (hrs)</div><input className="input" type="number" value={form.downtime_hours} onChange={e => setForm({ ...form, downtime_hours: e.target.value })} /></label>
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
