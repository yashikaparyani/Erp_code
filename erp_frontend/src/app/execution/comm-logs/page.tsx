'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Fragment } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Calendar, ChevronDown, ChevronRight,
  Download, Filter, Loader2, Mail, MessageSquare, Phone, Plus, RefreshCw,
  Users, X,
} from 'lucide-react';
import LinkPicker from '@/components/ui/LinkPicker';
import { commLogApi } from '@/lib/typedApi';

type CommLog = {
  name: string;
  linked_project: string;
  linked_site: string;
  communication_date: string;
  communication_type: string;
  direction: string;
  subject: string;
  reference_number: string;
  issue_summary: string;
  response_status: string;
  response_detail: string;
  counterparty_name: string;
  counterparty_role: string;
  follow_up_required: 0 | 1;
  follow_up_date: string;
  logged_by: string;
  creation: string;
  modified: string;
};

const typeIcon: Record<string, typeof Mail> = { Email: Mail, Call: Phone, Meeting: Users };
const typeColor: Record<string, string> = {
  Email: 'bg-blue-100 text-blue-700',
  Call: 'bg-emerald-100 text-emerald-700',
  Meeting: 'bg-violet-100 text-violet-700',
};

export default function CommLogsPage() {
  const [logs, setLogs] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  /* filters */
  const [fProject, setFProject] = useState('');
  const [fSite, setFSite] = useState('');
  const [fType, setFType] = useState('');
  const [fDirection, setFDirection] = useState('');
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await commLogApi.list<CommLog[]>({
        project: fProject || undefined,
        site: fSite || undefined,
        comm_type: fType || undefined,
        direction: fDirection || undefined,
      });
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load communication logs');
      setLogs([]);
    }
    setLoading(false);
  }, [fProject, fSite, fType, fDirection]);

  useEffect(() => { void loadLogs(); }, [loadLogs]);

  /* create form state */
  const [form, setForm] = useState({ project: '', site: '', comm_type: 'Email', direction: 'Outbound', subject: '', summary: '', counterparty_name: '' });
  const handleCreate = async () => {
    setError('');
    try {
      await commLogApi.create({
        linked_project: form.project,
        linked_site: form.site || undefined,
        communication_type: form.comm_type,
        direction: form.direction,
        subject: form.subject,
        issue_summary: form.summary,
        counterparty_name: form.counterparty_name,
      });
      setShowCreate(false);
      setForm({ project: '', site: '', comm_type: 'Email', direction: 'Outbound', subject: '', summary: '', counterparty_name: '' });
      void loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create communication log');
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm('Delete this communication log?')) return;
    setError('');
    try {
      await commLogApi.delete(name);
      void loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete communication log');
    }
  };

  const exportCsv = () => {
    const headers = ['Name', 'Date', 'Project', 'Site', 'Type', 'Direction', 'Subject', 'Counterparty', 'Response Status', 'Follow-up'];
    const rows = logs.map((l) => [
      l.name, l.communication_date || '', l.linked_project || '', l.linked_site || '',
      l.communication_type || '', l.direction || '', (l.subject || '').replace(/,/g, ';'),
      l.counterparty_name || '', l.response_status || '', l.follow_up_required ? 'Yes' : 'No',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comm-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const followUpCount = logs.filter((l) => l.follow_up_required).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Communication Logs</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Track emails, calls, and meetings across projects and sites.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn btn-secondary text-xs flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> New Log
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: logs.length, color: 'text-gray-900' },
          { label: 'Emails', value: logs.filter((l) => l.communication_type === 'Email').length, color: 'text-blue-600' },
          { label: 'Calls / Meetings', value: logs.filter((l) => l.communication_type !== 'Email').length, color: 'text-emerald-600' },
          { label: 'Follow-up Pending', value: followUpCount, color: followUpCount > 0 ? 'text-amber-600' : 'text-gray-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className={`text-lg font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center text-sm">
        <Filter className="h-4 w-4 text-gray-400" />
        <div className="w-48">
          <LinkPicker entity="project" value={fProject} onChange={setFProject} placeholder="Search project..." />
        </div>
        <div className="w-48">
          <LinkPicker entity="site" value={fSite} onChange={setFSite} placeholder="Search site..." filters={fProject ? { project: fProject } : undefined} />
        </div>
        <select value={fType} onChange={(e) => setFType(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">All Types</option>
          <option>Email</option>
          <option>Call</option>
          <option>Meeting</option>
        </select>
        <select value={fDirection} onChange={(e) => setFDirection(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">All Directions</option>
          <option>Inbound</option>
          <option>Outbound</option>
        </select>
        {(fProject || fSite || fType || fDirection) && (
          <button onClick={() => { setFProject(''); setFSite(''); setFType(''); setFDirection(''); }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        <button onClick={loadLogs} className="ml-auto text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading communications...
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3 w-6"></th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Counterparty</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expanded === log.name;
                  const TypeIcon = typeIcon[log.communication_type] || MessageSquare;
                  return (
                    <Fragment key={log.name}>
                      <tr
                        onClick={() => setExpanded(isExpanded ? null : log.name)}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 text-gray-400">{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">{log.communication_date || '-'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{log.subject || log.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColor[log.communication_type] || 'bg-gray-100 text-gray-700'}`}>
                            <TypeIcon className="h-3 w-3" /> {log.communication_type || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.direction === 'Inbound' ? <ArrowDownLeft className="h-4 w-4 text-teal-500 inline" /> : <ArrowUpRight className="h-4 w-4 text-orange-500 inline" />}
                          <span className="ml-1 text-xs text-gray-600">{log.direction || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {log.linked_project ? <Link href={`/projects/${log.linked_project}`} className="text-xs text-blue-600 hover:text-blue-800" onClick={(e) => e.stopPropagation()}>{log.linked_project}</Link> : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{log.counterparty_name || '-'}</td>
                        <td className="px-4 py-3">
                          {log.follow_up_required ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                              <Calendar className="h-3 w-3" /> {log.follow_up_date || 'Pending'}
                            </span>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={(e) => { e.stopPropagation(); void handleDelete(log.name); }} className="text-[10px] text-rose-500 hover:text-rose-700">Delete</button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <div className="font-medium text-gray-600 mb-1">Issue Summary</div>
                                <div className="text-gray-800 whitespace-pre-wrap">{log.issue_summary || 'No summary provided'}</div>
                              </div>
                              <div>
                                <div className="font-medium text-gray-600 mb-1">Response</div>
                                <div className="text-gray-800">{log.response_detail || 'No response recorded'}</div>
                                {log.response_status && <span className="mt-1 inline-block rounded bg-gray-200 px-2 py-0.5 text-[10px] font-medium">{log.response_status}</span>}
                              </div>
                              <div>
                                <div className="font-medium text-gray-600 mb-1">Counterparty</div>
                                <div className="text-gray-800">{log.counterparty_name || '-'} {log.counterparty_role ? `(${log.counterparty_role})` : ''}</div>
                              </div>
                              <div>
                                <div className="font-medium text-gray-600 mb-1">Details</div>
                                <div className="text-gray-700">
                                  {log.reference_number && <span>Ref: {log.reference_number} · </span>}
                                  {log.linked_site && <span>Site: {log.linked_site} · </span>}
                                  Logged by: {log.logged_by || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {logs.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No communication logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Communication Log</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">Project</label>
                <LinkPicker entity="project" value={form.project} onChange={(value) => setForm({ ...form, project: value, site: '' })} placeholder="Search project..." />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">Site</label>
                <LinkPicker entity="site" value={form.site} onChange={(value) => setForm({ ...form, site: value })} placeholder="Search site..." filters={form.project ? { project: form.project } : undefined} />
              </div>
              <select value={form.comm_type} onChange={(e) => setForm({ ...form, comm_type: e.target.value })} className="border rounded px-3 py-2 text-sm">
                <option>Email</option><option>Call</option><option>Meeting</option>
              </select>
              <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} className="border rounded px-3 py-2 text-sm">
                <option>Outbound</option><option>Inbound</option>
              </select>
              <input value={form.counterparty_name} onChange={(e) => setForm({ ...form, counterparty_name: e.target.value })} placeholder="Counterparty name" className="border rounded px-3 py-2 text-sm col-span-2" />
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="border rounded px-3 py-2 text-sm col-span-2" />
              <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Summary..." rows={3} className="border rounded px-3 py-2 text-sm col-span-2" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary text-sm">Cancel</button>
              <button onClick={handleCreate} className="btn btn-primary text-sm">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
