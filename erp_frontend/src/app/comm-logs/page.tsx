'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, Download, FileText, MessageSquare, Plus, X } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import { usePmContext, siteLabel } from '@/components/pm/pm-helpers';

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
  attachment?: string;
  follow_up_required?: number;
}

function flowLabel(d?: string) { return d === 'Outbound' ? 'Outward' : d === 'Inbound' ? 'Inward' : d || '-'; }
function dirIcon(d?: string) { return d === 'Outbound' ? <ArrowUpRight className="w-4 h-4 text-blue-500" /> : <ArrowDownLeft className="w-4 h-4 text-green-500" />; }
function typeBadge(t?: string) { const m: Record<string, string> = { Email: 'badge-blue', Call: 'badge-green', Meeting: 'badge-purple', Letter: 'badge-yellow', WhatsApp: 'badge-green', 'Site Visit': 'badge-purple' }; return m[t || ''] || 'badge-gray'; }
function statusBadge(s?: string) { const m: Record<string, string> = { Pending: 'badge badge-yellow', Responded: 'badge badge-blue', Closed: 'badge badge-green' }; return m[s || ''] || 'badge badge-gray'; }

export default function CommLogsPage() {
  const { assignedProjects, selectedProject, setSelectedProject, sites } = usePmContext();
  const [items, setItems] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [form, setForm] = useState({
    subject: '', communication_type: 'Letter', direction: 'Outbound',
    linked_site: '', communication_date: '', counterparty_name: '',
    counterparty_role: '', reference_number: '', issue_summary: '',
    response_status: 'Pending', response_detail: '', summary: '',
    follow_up_required: false, follow_up_date: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/comm-logs');
      setItems(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!form.subject.trim() || !selectedProject || !form.communication_date) return;
    setError('');
    setCreating(true);
    try {
      const body = new FormData();
      body.append('subject', form.subject);
      body.append('communication_type', form.communication_type);
      body.append('direction', form.direction);
      body.append('linked_project', selectedProject);
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
      setForm({ subject: '', communication_type: 'Letter', direction: 'Outbound', linked_site: '', communication_date: '', counterparty_name: '', counterparty_role: '', reference_number: '', issue_summary: '', response_status: 'Pending', response_detail: '', summary: '', follow_up_required: false, follow_up_date: '' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  const followUps = items.filter((i) => i.follow_up_required).length;

  return (
    <>
      <RegisterPage
        title="Client Communication Log"
        description="Project Managers log client inward/outward letters; Project Heads review and download attachments."
        loading={loading}
        error={error}
        empty={!loading && items.length === 0}
        emptyTitle="No Communications"
        emptyDescription="No communication logs found."
        onRetry={loadData}
        stats={[
          { label: 'Total Logs', value: items.length },
          { label: 'Inward', value: items.filter((i) => i.direction === 'Inbound').length },
          { label: 'Follow-up Pending', value: followUps, variant: followUps > 0 ? 'warning' : 'default' },
        ]}
        headerActions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Add Communication</button>
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Date</th><th>Flow</th><th>Type</th><th>Subject</th><th>Reference</th><th>Issue</th><th>Status</th><th>Project</th><th>Attachment</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.name}>
                  <td><Link href={`/comm-logs/${encodeURIComponent(item.name)}`} className="font-medium text-blue-700 hover:underline">{item.name}</Link></td>
                  <td>{item.communication_date || '-'}</td>
                  <td><div className="flex items-center gap-2">{dirIcon(item.direction)}<span className="text-sm">{flowLabel(item.direction)}</span></div></td>
                  <td><span className={`badge ${typeBadge(item.communication_type)}`}>{item.communication_type || '-'}</span></td>
                  <td className="max-w-xs truncate">{item.subject || '-'}</td>
                  <td className="max-w-xs truncate">{item.reference_number || '-'}</td>
                  <td className="max-w-xs truncate">{item.issue_summary || '-'}</td>
                  <td><span className={statusBadge(item.response_status)}>{item.response_status || 'Pending'}</span></td>
                  <td>{item.linked_project || '-'}</td>
                  <td>{item.attachment ? <a href={`/api/files?url=${encodeURIComponent(item.attachment)}&download=1`} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"><Download className="h-3.5 w-3.5" />Download</a> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      {/* Create Modal — custom due to FormData + file upload */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Log Client Communication</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project *</div>
                <select className="input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                  {assignedProjects.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Site</div>
                <select className="input" value={form.linked_site} onChange={(e) => setForm({ ...form, linked_site: e.target.value })}>
                  <option value="">Project-level</option>
                  {sites.map((s) => <option key={s.name} value={s.name}>{siteLabel(s)}</option>)}
                </select>
              </label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Letter Date *</div><input className="input" type="date" value={form.communication_date} onChange={(e) => setForm({ ...form, communication_date: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Flow</div><select className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}><option value="Outbound">Outward</option><option value="Inbound">Inward</option><option value="Internal">Internal</option></select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Type</div><select className="input" value={form.communication_type} onChange={(e) => setForm({ ...form, communication_type: e.target.value })}><option>Letter</option><option>Email</option><option>Call</option><option>Meeting</option><option>WhatsApp</option><option>Site Visit</option><option>Other</option></select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Client / Counterparty</div><input className="input" value={form.counterparty_name} onChange={(e) => setForm({ ...form, counterparty_name: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Counterparty Role</div><input className="input" value={form.counterparty_role} onChange={(e) => setForm({ ...form, counterparty_role: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Subject *</div><input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Reference / Reply To</div><input className="input" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="Responding to letter on DD/MM/YYYY" /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Issue / Matter Raised</div><textarea className="input min-h-[96px]" value={form.issue_summary} onChange={(e) => setForm({ ...form, issue_summary: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Response Status</div><select className="input" value={form.response_status} onChange={(e) => setForm({ ...form, response_status: e.target.value })}><option>Pending</option><option>Responded</option><option>Closed</option></select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Follow-up Date</div><input className="input" type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value, follow_up_required: Boolean(e.target.value) || form.follow_up_required })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Response / Resolution Note</div><textarea className="input min-h-[96px]" value={form.response_detail} onChange={(e) => setForm({ ...form, response_detail: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Summary / Notes</div><textarea className="input min-h-[120px]" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Attachment</div><input className="input" type="file" onChange={(e) => setAttachment(e.target.files?.[0] || null)} /></label>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="mb-4 flex items-center gap-2">
                <input id="comm-follow-up" type="checkbox" checked={form.follow_up_required} onChange={(e) => setForm({ ...form, follow_up_required: e.target.checked, follow_up_date: e.target.checked ? form.follow_up_date : '' })} />
                <label htmlFor="comm-follow-up" className="text-sm text-gray-700">Follow-up required</label>
              </div>
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !form.subject.trim() || !selectedProject || !form.communication_date}>{creating ? 'Creating…' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
