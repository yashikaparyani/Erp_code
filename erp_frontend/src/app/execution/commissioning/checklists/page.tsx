'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import LinkPicker from '@/components/ui/LinkPicker';

interface Checklist {
  name: string;
  checklist_name?: string;
  linked_project?: string;
  linked_site?: string;
  total_items?: number;
  done_items?: number;
  status?: string;
  commissioned_by?: string;
  creation?: string;
}

const STATUS_CLASSES: Record<string, string> = {
  Draft: 'badge-gray',
  'In Progress': 'badge-warning',
  Completed: 'badge-success',
};

export default function CommissioningChecklistsPage() {
  const [rows, setRows] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (projectFilter) params.set('project', projectFilter);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch(`/api/execution/commissioning/checklists${qs}`);
      setRows(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, projectFilter]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (name: string, action: string) => {
    setActionBusy(name);
    setError('');
    try {
      const res = await fetch('/api/execution/commissioning/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionBusy('');
    }
  };

  const draft = rows.filter(r => r.status === 'Draft').length;
  const inProgress = rows.filter(r => r.status === 'In Progress').length;
  const completed = rows.filter(r => r.status === 'Completed').length;

  return (
    <RegisterPage
      title="Commissioning Checklists"
      description="Track commissioning checklists across all project sites."
      loading={loading}
      error={error}
      empty={!loading && rows.length === 0}
      emptyTitle="No checklists"
      emptyDescription="No commissioning checklists found"
      onRetry={load}
      stats={[
        { label: 'Total', value: rows.length },
        { label: 'Draft', value: draft },
        { label: 'In Progress', value: inProgress, variant: 'warning' as const },
        { label: 'Completed', value: completed, variant: 'success' as const },
      ]}
      filterBar={(
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <LinkPicker entity="project" value={projectFilter} onChange={setProjectFilter} placeholder="Filter by project…" className="w-56" />
        </div>
      )}
      headerActions={
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Checklist</button>
      }
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Checklist</th>
            <th>Project / Site</th>
            <th>Progress</th>
            <th>Commissioned By</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-8 text-gray-500">No checklists found</td></tr>
          ) : rows.map(c => {
            const totalItems = c.total_items || 0;
            const doneItems = c.done_items || 0;
            const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
            return (
              <tr key={c.name}>
                <td><Link href={`/execution/commissioning/checklists/${encodeURIComponent(c.name)}`} className="font-medium text-blue-700 hover:underline">{c.name}</Link></td>
                <td className="text-gray-900">{c.checklist_name || '-'}</td>
                <td>
                  <div className="text-sm text-gray-900">{c.linked_project || '-'}</div>
                  <div className="text-xs text-gray-500">{c.linked_site || ''}</div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pct}%` }} /></div>
                    <span className="text-xs text-gray-500">{doneItems}/{totalItems}</span>
                  </div>
                </td>
                <td className="text-gray-600">{c.commissioned_by || '-'}</td>
                <td><span className={`badge ${STATUS_CLASSES[c.status || ''] || 'badge-gray'}`}>{c.status || '-'}</span></td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {c.status === 'Draft' && (
                      <button disabled={actionBusy === c.name} onClick={() => runAction(c.name, 'start')} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50">Start</button>
                    )}
                    {c.status === 'In Progress' && (
                      <button disabled={actionBusy === c.name} onClick={() => runAction(c.name, 'complete')} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50">Complete</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <FormModal
        open={showCreate}
        title="New Commissioning Checklist"
        description="Create a new checklist for a site commissioning."
        busy={createBusy}
        confirmLabel="Create"
        fields={[
          { name: 'checklist_name', label: 'Checklist Name', type: 'text', required: true },
          { name: 'linked_project', label: 'Project', type: 'link', linkEntity: 'project' as const, placeholder: 'Search project…', required: true },
          { name: 'linked_site', label: 'Site', type: 'link', linkEntity: 'site' as const, placeholder: 'Search site…' },
        ]}
        onConfirm={async (values) => {
          setCreateBusy(true);
          try {
            const res = await fetch('/api/execution/commissioning/checklists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
            setShowCreate(false);
            await load();
          } catch (e) {
            throw e;
          } finally {
            setCreateBusy(false);
          }
        }}
        onCancel={() => setShowCreate(false)}
      />
    </RegisterPage>
  );
}
