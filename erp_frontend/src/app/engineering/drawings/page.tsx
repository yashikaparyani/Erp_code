'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import ActionModal from '@/components/ui/ActionModal';
import ModalFrame from '@/components/ui/ModalFrame';
import LinkPicker from '@/components/ui/LinkPicker';

type DrawingRow = {
  name: string;
  title?: string;
  drawing_title?: string;
  linked_project?: string;
  linked_site?: string;
  revision?: string;
  status?: string;
  client_approval_status?: string;
  file_url?: string;
  creation?: string;
};

const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]';

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DrawingsPage() {
  const [rows, setRows] = useState<DrawingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<DrawingRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<DrawingRow | null>(null);
  const [supersedeTarget, setSupersedeTarget] = useState<DrawingRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DrawingRow | null>(null);
  const [createValues, setCreateValues] = useState({
    linked_project: '',
    linked_site: '',
    title: '',
    revision: 'R0',
  });
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createError, setCreateError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/engineering/drawings', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to load drawings');
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load drawings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.name, row.title, row.drawing_title, row.linked_project, row.linked_site, row.revision, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const stats = useMemo(() => ([
    { label: 'Drawings', value: rows.length, variant: 'info' as const },
    { label: 'Draft', value: rows.filter((row) => !row.status || String(row.status).toUpperCase() === 'DRAFT').length, variant: 'default' as const },
    { label: 'Submitted', value: rows.filter((row) => ['SUBMITTED', 'PENDING'].includes(String(row.status || '').toUpperCase())).length, variant: 'warning' as const },
    { label: 'Approved', value: rows.filter((row) => String(row.status || '').toUpperCase() === 'APPROVED').length, variant: 'success' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query ? 'default' as const : undefined },
  ]), [filteredRows.length, query, rows]);

  const handleCreate = async () => {
    if (!createValues.title.trim() || !createValues.linked_project.trim()) {
      setError('Project and drawing title are required');
      return;
    }
    setBusy(true);
    setCreateError('');
    try {
      const body = new FormData();
      body.append('data', JSON.stringify({
        linked_project: createValues.linked_project || undefined,
        linked_site: createValues.linked_site || undefined,
        title: createValues.title || undefined,
        revision: createValues.revision || undefined,
      }));
      if (createFile) body.append('drawing_file', createFile);

      const res = await fetch('/api/engineering/drawings', { method: 'POST', body });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to create drawing');

      setShowCreate(false);
      setCreateValues({ linked_project: '', linked_site: '', title: '', revision: 'R0' });
      setCreateFile(null);
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create drawing');
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (target: DrawingRow | null, action: string, body: Record<string, unknown> = {}, closer?: (value: DrawingRow | null) => void) => {
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/engineering/drawings/${encodeURIComponent(target.name)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || `Failed to ${action} drawing`);
      closer?.(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action} drawing`);
      throw actionError;
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/engineering/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', name: deleteTarget.name }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to delete drawing');
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete drawing');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Engineering Drawings"
        description="Create, submit, approve, and supersede project drawings through dedicated engineering routes."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No drawings"
        emptyDescription={query ? 'No drawings match this search.' : 'Create the first drawing to start the engineering approval flow.'}
        onRetry={load}
        stats={stats}
        headerActions={(
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Drawing
          </button>
        )}
        filterBar={(
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              className="input pl-9"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search drawing, project, site…"
            />
          </div>
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Drawing</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Revision</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const status = String(row.status || '').toUpperCase();
                const isDraft = !status || status === 'DRAFT';
                const isPending = ['SUBMITTED', 'PENDING'].includes(status);
                const isApproved = status === 'APPROVED';
                return (
                  <tr key={row.name} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Link href={`/engineering/drawings/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline">
                          {row.name}
                        </Link>
                        {row.file_url ? (
                          <a
                            href={`/api/files?url=${encodeURIComponent(row.file_url)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.title || row.drawing_title || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.linked_project || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.linked_site || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.revision || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.status || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.client_approval_status || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.creation)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isDraft ? <button className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => setSubmitTarget(row)}>Submit</button> : null}
                        {isPending ? <button className="text-sm font-medium text-emerald-600 hover:text-emerald-800" onClick={() => setApproveTarget(row)}>Approve</button> : null}
                        {isApproved ? <button className="text-sm font-medium text-amber-600 hover:text-amber-800" onClick={() => setSupersedeTarget(row)}>Supersede</button> : null}
                        {isDraft ? <button className="text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => setDeleteTarget(row)}>Delete</button> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      <ModalFrame
        open={showCreate}
        title="Create Drawing"
        onClose={() => { if (!busy) { setShowCreate(false); setCreateError(''); } }}
        footer={(
          <>
            <button type="button" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setShowCreate(false)} disabled={busy}>Cancel</button>
            <button type="button" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-strong)] disabled:opacity-50" onClick={() => void handleCreate()} disabled={busy}>
              {busy ? 'Creating...' : 'Create Drawing'}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          {createError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{createError}</div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Project *</label>
            <LinkPicker entity="project" value={createValues.linked_project} onChange={(value) => setCreateValues((current) => ({ ...current, linked_project: value, linked_site: '' }))} placeholder="Search project…" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Site</label>
            <LinkPicker entity="site" value={createValues.linked_site} onChange={(value) => setCreateValues((current) => ({ ...current, linked_site: value }))} placeholder="Search site…" filters={createValues.linked_project ? { project: createValues.linked_project } : undefined} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Drawing Title *</label>
            <input className={inputCls} value={createValues.title} onChange={(event) => setCreateValues((current) => ({ ...current, title: event.target.value }))} placeholder="GA layout" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Revision</label>
            <input className={inputCls} value={createValues.revision} onChange={(event) => setCreateValues((current) => ({ ...current, revision: event.target.value }))} placeholder="R0" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Drawing File</label>
            <input className={inputCls} type="file" accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png" onChange={(event) => setCreateFile(event.target.files?.[0] || null)} />
            <p className="mt-1 text-xs text-gray-400">Optional. Upload a drawing file and the route will attach it before creation.</p>
          </div>
        </div>
      </ModalFrame>

      <ActionModal open={Boolean(submitTarget)} title={`Submit ${submitTarget?.name || 'Drawing'}`} confirmLabel="Submit" busy={busy} onConfirm={() => runAction(submitTarget, 'submit', {}, setSubmitTarget)} onCancel={() => setSubmitTarget(null)} />
      <ActionModal open={Boolean(approveTarget)} title={`Approve ${approveTarget?.name || 'Drawing'}`} confirmLabel="Approve" variant="success" busy={busy} onConfirm={() => runAction(approveTarget, 'approve', {}, setApproveTarget)} onCancel={() => setApproveTarget(null)} />
      <ActionModal
        open={Boolean(supersedeTarget)}
        title={`Supersede ${supersedeTarget?.name || 'Drawing'}`}
        description="Provide the replacement drawing name."
        confirmLabel="Supersede"
        variant="default"
        busy={busy}
        fields={[{ name: 'superseded_by', label: 'Superseded By', type: 'text', required: true }]}
        onConfirm={(values) => runAction(supersedeTarget, 'supersede', { superseded_by: values.superseded_by || '' }, setSupersedeTarget)}
        onCancel={() => setSupersedeTarget(null)}
      />
      <ActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.name || 'Drawing'}`} confirmLabel="Delete" variant="danger" busy={busy} onConfirm={runDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}
