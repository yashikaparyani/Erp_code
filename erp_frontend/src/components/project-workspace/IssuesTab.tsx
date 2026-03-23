'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Plus, RefreshCcw, Loader2, X } from 'lucide-react';
import { callOps } from './pm-helpers';

type ProjectIssue = {
  name: string;
  title: string;
  linked_project: string;
  linked_site?: string;
  severity: string;
  status: string;
  category?: string;
  assigned_to?: string;
  raised_by?: string;
  description?: string;
  resolution_notes?: string;
  target_date?: string;
  resolved_date?: string;
  creation: string;
  modified: string;
};

const SEVERITY_TONES: Record<string, string> = {
  Critical: 'bg-rose-100 text-rose-700',
  High: 'bg-amber-100 text-amber-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-blue-100 text-blue-700',
};

const STATUS_TONES: Record<string, string> = {
  Open: 'bg-rose-50 text-rose-600',
  'In Progress': 'bg-amber-50 text-amber-600',
  Resolved: 'bg-emerald-50 text-emerald-600',
  Closed: 'bg-gray-100 text-gray-500',
};

export default function IssuesTab({ projectId }: { projectId: string }) {
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'Open' | 'In Progress' | 'Resolved' | 'Closed'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '', severity: 'Medium', category: '', assigned_to: '', description: '', target_date: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callOps<ProjectIssue[]>('get_project_issues', { project: projectId });
      setIssues(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const filtered = filter === 'all' ? issues : issues.filter((i) => i.status === filter);
  const counts = {
    all: issues.length,
    Open: issues.filter((i) => i.status === 'Open').length,
    'In Progress': issues.filter((i) => i.status === 'In Progress').length,
    Resolved: issues.filter((i) => i.status === 'Resolved').length,
    Closed: issues.filter((i) => i.status === 'Closed').length,
  };

  const submitCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      await callOps('create_project_issue', {
        data: JSON.stringify({
          linked_project: projectId,
          title: form.title.trim(),
          severity: form.severity,
          category: form.category.trim() || undefined,
          assigned_to: form.assigned_to.trim() || undefined,
          description: form.description.trim() || undefined,
          target_date: form.target_date || undefined,
          status: 'Open',
        }),
      });
      setShowCreate(false);
      setForm({ title: '', severity: 'Medium', category: '', assigned_to: '', description: '', target_date: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue');
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (name: string, newStatus: string) => {
    try {
      await callOps('update_project_issue', { name, data: JSON.stringify({ status: newStatus }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update issue');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['all', 'Open', 'In Progress', 'Resolved', 'Closed'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === key
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-gray-200'
              }`}
            >
              {key === 'all' ? 'All' : key} ({counts[key]})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn btn-secondary text-xs">
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs">
            <Plus className="h-3.5 w-3.5" /> Report Issue
          </button>
        </div>
      </div>

      {/* Issues list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">
          {filter === 'all' ? 'No issues reported for this project.' : `No ${filter.toLowerCase()} issues.`}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => (
            <div key={issue.name} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-main)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_TONES[issue.severity] || 'bg-gray-100 text-gray-600'}`}>
                      {issue.severity}
                    </span>
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONES[issue.status] || 'bg-gray-100 text-gray-600'}`}>
                      {issue.status}
                    </span>
                    {issue.category && (
                      <span className="text-[10px] text-[var(--text-muted)]">{issue.category}</span>
                    )}
                  </div>
                  <h4 className="mt-1.5 text-sm font-medium text-[var(--text-main)]">{issue.title}</h4>
                  {issue.description && (
                    <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">{issue.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
                    {issue.assigned_to && <span>Assigned: {issue.assigned_to}</span>}
                    {issue.target_date && <span>Target: {issue.target_date}</span>}
                    {issue.linked_site && <span>Site: {issue.linked_site}</span>}
                    <span>Raised: {new Date(issue.creation).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  {issue.status === 'Open' && (
                    <button onClick={() => void updateStatus(issue.name, 'In Progress')} className="text-xs text-blue-600 hover:text-blue-800">
                      Start
                    </button>
                  )}
                  {issue.status === 'In Progress' && (
                    <button onClick={() => void updateStatus(issue.name, 'Resolved')} className="text-xs text-emerald-600 hover:text-emerald-800">
                      Resolve
                    </button>
                  )}
                  {issue.status === 'Resolved' && (
                    <button onClick={() => void updateStatus(issue.name, 'Closed')} className="text-xs text-gray-600 hover:text-gray-800">
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Report Issue / Blocker</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
                <input className="input" placeholder="Brief description of the issue" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Severity</label>
                  <select className="input" value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}>
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                  <input className="input" placeholder="e.g. Material, Design, Site" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Assigned To</label>
                  <input className="input" placeholder="Person or team" value={form.assigned_to} onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Target Date</label>
                  <input className="input" type="date" value={form.target_date} onChange={(e) => setForm((p) => ({ ...p, target_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea className="input min-h-20" placeholder="Detailed description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => void submitCreate()} disabled={creating || !form.title.trim()} className="btn btn-primary">
                {creating ? 'Saving...' : 'Submit Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
