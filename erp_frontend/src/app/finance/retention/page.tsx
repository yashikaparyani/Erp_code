'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { badge, callApi, formatCurrency, formatDate, RETENTION_BADGES } from '@/components/finance/fin-helpers';

type RetentionRow = {
  name: string;
  customer?: string;
  linked_project?: string;
  linked_invoice?: string;
  retention_amount?: number;
  release_amount?: number;
  status?: string;
  release_due_date?: string;
  remarks?: string;
};

type RetentionStats = {
  total?: number;
  pending?: number;
};

export default function RetentionPage() {
  const [rows, setRows] = useState<RetentionRow[]>([]);
  const [stats, setStats] = useState<RetentionStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<RetentionRow | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<RetentionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RetentionRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listData, statsData] = await Promise.all([
        callApi<RetentionRow[]>('/api/retention'),
        callApi<RetentionStats>('/api/retention/stats'),
      ]);
      setRows(Array.isArray(listData) ? listData : []);
      setStats(statsData || {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load retention ledger');
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
      [row.name, row.customer, row.linked_project, row.linked_invoice, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const registerStats = useMemo(() => ([
    { label: 'Total Entries', value: stats.total ?? rows.length },
    { label: 'Pending Release', value: stats.pending ?? rows.filter((row) => (row.status || '').toUpperCase() !== 'RELEASED').length, variant: 'warning' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query ? 'info' as const : undefined },
  ]), [filteredRows.length, query, rows, stats.pending, stats.total]);

  const handleCreate = async (values: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      await callApi('/api/retention', {
        method: 'POST',
        body: {
          customer: values.customer || undefined,
          linked_project: values.linked_project || undefined,
          linked_invoice: values.linked_invoice || undefined,
          retention_percent: Number(values.retention_percent) || 0,
          retention_amount: Number(values.retention_amount) || 0,
          release_due_date: values.release_due_date || undefined,
          remarks: values.remarks || undefined,
        },
      });
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create retention entry');
      throw createError;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (values: Record<string, string>) => {
    if (!updateTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/retention/${encodeURIComponent(updateTarget.name)}`, {
        method: 'PATCH',
        body: { remarks: values.remarks || '' },
      });
      setUpdateTarget(null);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update retention entry');
      throw updateError;
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async (values: Record<string, string>) => {
    if (!releaseTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/retention/${encodeURIComponent(releaseTarget.name)}/actions`, {
        method: 'POST',
        body: {
          action: 'release',
          release_amount: Number(values.release_amount) || 0,
          remarks: values.remarks || '',
        },
      });
      setReleaseTarget(null);
      await load();
    } catch (releaseError) {
      setError(releaseError instanceof Error ? releaseError.message : 'Failed to release retention');
      throw releaseError;
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/retention/${encodeURIComponent(deleteTarget.name)}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete retention entry');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Retention Ledger"
        description="Track retained amounts, release timing, and ledger status through dedicated finance routes."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No retention entries"
        emptyDescription={query ? 'No retention entries match this search.' : 'Create the first retention entry to start tracking held amounts.'}
        onRetry={load}
        stats={registerStats}
        headerActions={(
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Retention Entry
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
              placeholder="Search customer, project, invoice…"
            />
          </div>
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Retention</th>
                <th className="px-4 py-3">Released</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.name} className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/finance/retention/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.customer || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.linked_project || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.linked_invoice || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(row.retention_amount || 0))}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(row.release_amount || 0))}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(row.release_due_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${badge(RETENTION_BADGES, row.status)}`}>{row.status || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => setUpdateTarget(row)}>Update</button>
                      <button className="text-sm font-medium text-emerald-600 hover:text-emerald-800" onClick={() => setReleaseTarget(row)}>Release</button>
                      <button className="text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => setDeleteTarget(row)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      <FormModal
        open={showCreate}
        title="Create Retention Entry"
        description="Create a retention ledger row through the dedicated finance API contract."
        size="lg"
        busy={busy}
        confirmLabel="Create Entry"
        fields={[
          { name: 'customer', label: 'Customer', type: 'link', linkEntity: 'customer', placeholder: 'Search customer…' },
          { name: 'linked_project', label: 'Project', type: 'link', linkEntity: 'project', placeholder: 'Search project…' },
          { name: 'linked_invoice', label: 'Invoice', type: 'link', linkEntity: 'invoice', placeholder: 'Search invoice…' },
          { name: 'retention_percent', label: 'Retention %', type: 'number', defaultValue: '0' },
          { name: 'retention_amount', label: 'Retention Amount', type: 'number', defaultValue: '0', required: true },
          { name: 'release_due_date', label: 'Release Due Date', type: 'date' },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal
        open={Boolean(updateTarget)}
        title="Update Retention Entry"
        description={updateTarget ? `Add an update note for ${updateTarget.name}.` : undefined}
        busy={busy}
        fields={[
          { name: 'remarks', label: 'Update Note', type: 'textarea' },
        ]}
        confirmLabel="Save Update"
        onConfirm={handleUpdate}
        onCancel={() => setUpdateTarget(null)}
      />

      <ActionModal
        open={Boolean(releaseTarget)}
        title="Release Retention"
        description={releaseTarget ? `Release retained amount for ${releaseTarget.name}.` : undefined}
        busy={busy}
        fields={[
          { name: 'release_amount', label: 'Release Amount', type: 'text', required: true, placeholder: '0.00' },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ]}
        confirmLabel="Release Amount"
        variant="success"
        onConfirm={handleRelease}
        onCancel={() => setReleaseTarget(null)}
      />

      <ActionModal
        open={Boolean(deleteTarget)}
        title="Delete Retention Entry"
        description={deleteTarget ? `Delete ${deleteTarget.name} from the retention ledger?` : undefined}
        busy={busy}
        confirmLabel="Delete Entry"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
