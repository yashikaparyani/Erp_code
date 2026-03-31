'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Plus, ArrowUpRight, ArrowDownLeft, X, Download, FileText } from 'lucide-react';

interface CommLog {
  name: string;
  linked_project?: string;
  linked_site?: string;
  communication_date?: string;
  communication_type?: string;
  direction?: string;
  subject?: string;
  reference_number?: string;
  issue_summary?: string;
  response_status?: string;
  response_detail?: string;
  attachment?: string;
  counterparty_name?: string;
  counterparty_role?: string;
  follow_up_required?: number;
  follow_up_date?: string;
  logged_by?: string;
}

function directionIcon(d?: string) {
  return d === 'Outbound' ? <ArrowUpRight className="w-4 h-4 text-blue-500" /> : <ArrowDownLeft className="w-4 h-4 text-green-500" />;
}

function typeBadge(t?: string) {
  const map: Record<string, string> = { Email: 'badge-blue', Call: 'badge-green', Meeting: 'badge-purple', Letter: 'badge-yellow', WhatsApp: 'badge-green', 'Site Visit': 'badge-purple' };
  return map[t || ''] || 'badge-gray';
}

function flowLabel(direction?: string) {
  if (direction === 'Outbound') return 'Outward';
  if (direction === 'Inbound') return 'Inward';
  return direction || '-';
}

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    Pending: 'badge badge-yellow',
    Responded: 'badge badge-blue',
    Closed: 'badge badge-green',
  };
  return map[status || ''] || 'badge badge-gray';
}

export default function CommLogsPage() {
  const [items, setItems] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [form, setForm] = useState({
    subject: '',
    communication_type: 'Letter',
    direction: 'Outbound',
    linked_project: '',
    linked_site: '',
    communication_date: '',
    counterparty_name: '',
    counterparty_role: '',
    reference_number: '',
    issue_summary: '',
    response_status: 'Pending',
    response_detail: '',
    summary: '',
    follow_up_required: false,
    follow_up_date: '',
  });

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
      const body = new FormData();
      body.append('subject', form.subject);
      body.append('communication_type', form.communication_type);
      body.append('direction', form.direction);
      body.append('linked_project', form.linked_project);
      if (form.linked_site.trim()) body.append('linked_site', form.linked_site.trim());
      if (form.communication_date) body.append('communication_date', form.communication_date);
      if (form.counterparty_name.trim()) body.append('counterparty_name', form.counterparty_name.trim());
      if (form.counterparty_role.trim()) body.append('counterparty_role', form.counterparty_role.trim());
      if (form.reference_number.trim()) body.append('reference_number', form.reference_number.trim());
      if (form.issue_summary.trim()) body.append('issue_summary', form.issue_summary.trim());
      if (form.response_status) body.append('response_status', form.response_status);
      if (form.response_detail.trim()) body.append('response_detail', form.response_detail.trim());
      body.append('summary', form.summary.trim() || form.issue_summary.trim() || form.subject);
      if (form.follow_up_required) body.append('follow_up_required', '1');
      if (form.follow_up_date) body.append('follow_up_date', form.follow_up_date);
      if (attachment) body.append('file', attachment);
      const res = await fetch('/api/comm-logs', { method: 'POST', body });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setAttachment(null);
      setForm({
        subject: '',
        communication_type: 'Letter',
        direction: 'Outbound',
        linked_project: '',
        linked_site: '',
        communication_date: '',
        counterparty_name: '',
        counterparty_role: '',
        reference_number: '',
        issue_summary: '',
        response_status: 'Pending',
        response_detail: '',
        summary: '',
        follow_up_required: false,
        follow_up_date: '',
      });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const followUps = items.filter(i => i.follow_up_required).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Client Communication Log</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Project Managers can log client inward and outward letters, while Project Heads can review and download attachments.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Add Communication</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><MessageSquare className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Logs</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><ArrowDownLeft className="w-5 h-5" /></div><div><div className="stat-value">{items.filter(i => i.direction === 'Inbound').length}</div><div className="stat-label">Inward</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><FileText className="w-5 h-5" /></div><div><div className="stat-value">{followUps}</div><div className="stat-label">Response / Follow-up Pending</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Client Communications</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Letter Date</th><th>Flow</th><th>Type</th><th>Subject</th><th>Reference</th><th>Issue</th><th>Status</th><th>Project</th><th>Attachment</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-500">No communication logs found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><Link href={`/comm-logs/${encodeURIComponent(item.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{item.name}</Link></td>
                  <td><div className="text-sm text-gray-700">{item.communication_date || '-'}</div></td>
                  <td><div className="flex items-center gap-2"><span>{directionIcon(item.direction)}</span><span className="text-sm text-gray-700">{flowLabel(item.direction)}</span></div></td>
                  <td><span className={`badge ${typeBadge(item.communication_type)}`}>{item.communication_type || '-'}</span></td>
                  <td><div className="text-sm text-gray-900 max-w-xs truncate">{item.subject || '-'}</div></td>
                  <td><div className="text-sm text-gray-700 max-w-xs truncate">{item.reference_number || '-'}</div></td>
                  <td><div className="text-sm text-gray-700 max-w-xs truncate">{item.issue_summary || '-'}</div></td>
                  <td><span className={statusBadge(item.response_status)}>{item.response_status || 'Pending'}</span></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td>{item.attachment ? <a href={`/api/files/download?url=${encodeURIComponent(item.attachment)}&filename=${encodeURIComponent(item.subject || item.name)}`} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 hover:underline"><Download className="h-3.5 w-3.5" />Download</a> : <span className="text-sm text-gray-400">-</span>}</td>
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
              <div><h2 className="text-lg font-semibold text-gray-900">Log Client Communication</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project *</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Site</div><input className="input" value={form.linked_site} onChange={e => setForm({ ...form, linked_site: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Letter Date *</div><input className="input" type="date" value={form.communication_date} onChange={e => setForm({ ...form, communication_date: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Letter Flow</div><select className="input" value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}><option value="Outbound">Outward</option><option value="Inbound">Inward</option><option value="Internal">Internal</option></select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Type</div><select className="input" value={form.communication_type} onChange={e => setForm({ ...form, communication_type: e.target.value })}><option>Letter</option><option>Email</option><option>Call</option><option>Meeting</option><option>WhatsApp</option><option>Site Visit</option><option>Other</option></select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Client / Counterparty</div><input className="input" value={form.counterparty_name} onChange={e => setForm({ ...form, counterparty_name: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Counterparty Role</div><input className="input" value={form.counterparty_role} onChange={e => setForm({ ...form, counterparty_role: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Subject *</div><input className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Reference / Reply To</div><input className="input" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder='Responding to letter received on DD/MM/YYYY' /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Issue / Matter Raised</div><textarea className="input min-h-[96px]" value={form.issue_summary} onChange={e => setForm({ ...form, issue_summary: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Response Status</div><select className="input" value={form.response_status} onChange={e => setForm({ ...form, response_status: e.target.value })}><option>Pending</option><option>Responded</option><option>Closed</option></select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Follow-up Date</div><input className="input" type="date" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value, follow_up_required: Boolean(e.target.value) || form.follow_up_required })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Response / Resolution Note</div><textarea className="input min-h-[96px]" value={form.response_detail} onChange={e => setForm({ ...form, response_detail: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Summary / Notes</div><textarea className="input min-h-[120px]" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Attachment</div><input className="input" type="file" onChange={e => setAttachment(e.target.files?.[0] || null)} /></label>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="mb-4 flex items-center gap-2">
                <input id="comm-follow-up" type="checkbox" checked={form.follow_up_required} onChange={e => setForm({ ...form, follow_up_required: e.target.checked, follow_up_date: e.target.checked ? form.follow_up_date : '' })} />
                <label htmlFor="comm-follow-up" className="text-sm text-gray-700">Follow-up required</label>
              </div>
              <div className="flex justify-end gap-3"><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={creating || !form.subject.trim() || !form.linked_project.trim() || !form.communication_date}>{creating ? 'Creating...' : 'Create'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
