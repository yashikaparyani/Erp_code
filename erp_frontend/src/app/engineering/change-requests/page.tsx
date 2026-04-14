'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';

type ChangeRequestRow = {
  name: string;
  cr_number?: string;
  linked_project?: string;
  title?: string;
  status?: string;
  cost_impact?: number;
  schedule_impact_days?: number;
  raised_by?: string;
  approved_by?: string;
  creation?: string;
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ChangeRequestsPage() {
  const [rows, setRows] = useState<ChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<ChangeRequestRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<ChangeRequestRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ChangeRequestRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChangeRequestRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/engineering/change-requests', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to load change requests');
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load change requests');
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
      [row.name, row.cr_number, row.linked_project, row.title, row.status, row.raised_by]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const stats = useMemo(() => ([
    { label: 'Change Requests', value: rows.length, variant: 'info' as const },
    { label: 'Draft', value: rows.filter((row) => !row.status || String(row.status).toUpperCase() === 'DRAFT').length, variant: 'default' as const },
    { label: 'Pending', value: rows.filter((row) => ['SUBMITTED', 'PENDING', 'PENDING_APPROVAL'].includes(String(row.status || '').toUpperCase())).length, variant: 'warning' as const },
    { label: 'Approved', value: rows.filter((row) => String(row.status || '').toUpperCase() === 'APPROVED').length, variant: 'success' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query ? 'default' as const : undefined },
  ]), [filteredRows.length, query, rows]);

  const handleCreate = async (values: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/engineering/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linked_project: values.linked_project || undefined,
          title: values.title || undefined,
          impact_summary: values.impact_summary || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to create change request');
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create change request');
      throw createError;
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (target: ChangeRequestRow | null, action: string, body: Record<string, unknown> = {}, closer?: (value: ChangeRequestRow | null) => void) => {
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/engineering/change-requests/${encodeURIComponent(target.name)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || `Failed to ${action} change request`);
      closer?.(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action} change request`);
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
      const res = await fetch('/api/engineering/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', name: deleteTarget.name }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to delete change request');
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete change request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Change Requests"
        description="Manage scope, engineering, and execution change requests through dedicated engineering routes."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No change requests"
        emptyDescription={query ? 'No change requests match this search.' : 'Create the first change request to start the approval flow.'}
        onRetry={load}
        stats={stats}
        headerActions={(
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Change Request
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
              placeholder="Search CR, project, title…"
            />
          </div>
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">CR</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Raised By</th>
                <th className="px-4 py-3">Cost Impact</th>
                <th className="px-4 py-3">Schedule Impact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const status = String(row.status || '').toUpperCase();
                const isDraft = !status || status === 'DRAFT';
                const isPending = ['SUBMITTED', 'PENDING', 'PENDING_APPROVAL'].includes(status);
                return (
                  <tr key={row.name} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/engineering/change-requests/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline">
                        {row.cr_number || row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.title || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.linked_project || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.raised_by || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.cost_impact ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.schedule_impact_days ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.status || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.creation)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isDraft ? <button className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => setSubmitTarget(row)}>Submit</button> : null}
                        {isPending ? <button className="text-sm font-medium text-emerald-600 hover:text-emerald-800" onClick={() => setApproveTarget(row)}>Approve</button> : null}
                        {isPending ? <button className="text-sm font-medium text-amber-600 hover:text-amber-800" onClick={() => setRejectTarget(row)}>Reject</button> : null}
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

      <FormModal
        open={showCreate}
        title="Create Change Request"
        description="Create a change request through the dedicated engineering API."
        size="lg"
        busy={busy}
        confirmLabel="Create Change Request"
        fields={[
          { name: 'linked_project', label: 'Project', type: 'link', linkEntity: 'project', placeholder: 'Search project…', required: true },
          { name: 'title', label: 'Title', type: 'text', placeholder: 'Scope change', required: true },
          { name: 'impact_summary', label: 'Impact Summary', type: 'textarea' },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal open={Boolean(submitTarget)} title={`Submit ${submitTarget?.name || 'Change Request'}`} confirmLabel="Submit" busy={busy} onConfirm={() => runAction(submitTarget, 'submit', {}, setSubmitTarget)} onCancel={() => setSubmitTarget(null)} />
      <ActionModal open={Boolean(approveTarget)} title={`Approve ${approveTarget?.name || 'Change Request'}`} confirmLabel="Approve" variant="success" busy={busy} onConfirm={() => runAction(approveTarget, 'approve', {}, setApproveTarget)} onCancel={() => setApproveTarget(null)} />
      <ActionModal
        open={Boolean(rejectTarget)}
        title={`Reject ${rejectTarget?.name || 'Change Request'}`}
        description="Provide the rejection reason."
        confirmLabel="Reject"
        variant="danger"
        busy={busy}
        fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
        onConfirm={(values) => runAction(rejectTarget, 'reject', { reason: values.reason || '' }, setRejectTarget)}
        onCancel={() => setRejectTarget(null)}
      />
      <ActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.name || 'Change Request'}`} confirmLabel="Delete" variant="danger" busy={busy} onConfirm={runDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}
