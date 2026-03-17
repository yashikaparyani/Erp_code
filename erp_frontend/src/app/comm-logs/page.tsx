'use client';
import { useEffect, useState } from 'react';
import { MessageSquare, Plus, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';

interface CommLog {
  name: string;
  linked_project?: string;
  linked_site?: string;
  communication_date?: string;
  communication_type?: string;
  direction?: string;
  subject?: string;
  counterparty_name?: string;
  counterparty_role?: string;
  follow_up_required?: number;
  follow_up_date?: string;
  logged_by?: string;
}

function directionIcon(d?: string) {
  return d === 'Outgoing' ? <ArrowUpRight className="w-4 h-4 text-blue-500" /> : <ArrowDownLeft className="w-4 h-4 text-green-500" />;
}

function typeBadge(t?: string) {
  const map: Record<string, string> = { Email: 'badge-blue', Phone: 'badge-green', Meeting: 'badge-purple', Letter: 'badge-yellow', WhatsApp: 'badge-green' };
  return map[t || ''] || 'badge-gray';
}

export default function CommLogsPage() {
  const [items, setItems] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ subject: '', communication_type: 'Email', direction: 'Outgoing', linked_project: '', counterparty_name: '', communication_date: '' });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/comm-logs').then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/comm-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setForm({ subject: '', communication_type: 'Email', direction: 'Outgoing', linked_project: '', counterparty_name: '', communication_date: '' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const followUps = items.filter(i => i.follow_up_required).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Communication Logs</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Track all project communications — emails, calls, meetings.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Log Communication</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><MessageSquare className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Logs</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><ArrowDownLeft className="w-5 h-5" /></div><div><div className="stat-value">{items.filter(i => i.direction === 'Incoming').length}</div><div className="stat-label">Incoming</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><MessageSquare className="w-5 h-5" /></div><div><div className="stat-value">{followUps}</div><div className="stat-label">Follow-ups Pending</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Communications</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Date</th><th>Dir</th><th>Type</th><th>Subject</th><th>Counterparty</th><th>Project</th><th>Follow-up</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No communication logs found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-700">{item.communication_date || '-'}</div></td>
                  <td>{directionIcon(item.direction)}</td>
                  <td><span className={`badge ${typeBadge(item.communication_type)}`}>{item.communication_type || '-'}</span></td>
                  <td><div className="text-sm text-gray-900 max-w-xs truncate">{item.subject || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.counterparty_name || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td>{item.follow_up_required ? <span className="badge badge-yellow">{item.follow_up_date || 'Yes'}</span> : <span className="text-sm text-gray-400">-</span>}</td>
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
              <div><h2 className="text-lg font-semibold text-gray-900">Log Communication</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Subject *</div><input className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Type</div><select className="input" value={form.communication_type} onChange={e => setForm({ ...form, communication_type: e.target.value })}><option>Email</option><option>Phone</option><option>Meeting</option><option>Letter</option><option>WhatsApp</option></select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Direction</div><select className="input" value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}><option>Outgoing</option><option>Incoming</option></select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Counterparty</div><input className="input" value={form.counterparty_name} onChange={e => setForm({ ...form, counterparty_name: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Date</div><input className="input" type="date" value={form.communication_date} onChange={e => setForm({ ...form, communication_date: e.target.value })} /></label>
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
