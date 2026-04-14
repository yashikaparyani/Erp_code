'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { badge, callApi, formatCurrency, PENALTY_BADGES } from '@/components/finance/fin-helpers';

type PenaltyRow = {
  name: string;
  project?: string;
  customer?: string;
  source?: string;
  penalty_amount?: number;
  applied_to_invoice?: string;
  status?: string;
  remarks?: string;
};

type PenaltyStats = {
  total?: number;
  pending?: number;
};

export default function PenaltiesPage() {
  const [rows, setRows] = useState<PenaltyRow[]>([]);
  const [stats, setStats] = useState<PenaltyStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<PenaltyRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<PenaltyRow | null>(null);
  const [applyTarget, setApplyTarget] = useState<PenaltyRow | null>(null);
  const [reverseTarget, setReverseTarget] = useState<PenaltyRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PenaltyRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listData, statsData] = await Promise.all([
        callApi<PenaltyRow[]>('/api/penalties'),
        callApi<PenaltyStats>('/api/penalties/stats'),
      ]);
      setRows(Array.isArray(listData) ? listData : []);
      setStats(statsData || {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load penalties');
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
      [row.name, row.project, row.customer, row.source, row.applied_to_invoice, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const registerStats = useMemo(() => ([
    { label: 'Total Penalties', value: stats.total ?? rows.length, variant: 'error' as const },
    { label: 'Pending', value: stats.pending ?? rows.filter((row) => ['DRAFT', 'PENDING'].includes((row.status || '').toUpperCase())).length, variant: 'warning' as const },
    { label: 'Exposure', value: formatCurrency(rows.reduce((sum, row) => sum + Number(row.penalty_amount || 0), 0)), variant: 'default' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query ? 'default' as const : undefined },
  ]), [filteredRows.length, query, rows, stats.pending, stats.total]);

  const handleCreate = async (values: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      await callApi('/api/penalties', {
        method: 'POST',
        body: {
          project: values.project || undefined,
          source: values.source || undefined,
          penalty_amount: Number(values.penalty_amount) || 0,
          remarks: values.remarks || undefined,
        },
      });
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create penalty');
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
      await callApi(`/api/penalties/${encodeURIComponent(updateTarget.name)}`, {
        method: 'PATCH',
        body: {
          remarks: values.remarks || '',
        },
      });
      setUpdateTarget(null);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update penalty');
      throw updateError;
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/penalties/${encodeURIComponent(approveTarget.name)}/actions`, {
        method: 'POST',
        body: { action: 'approve' },
      });
      setApproveTarget(null);
      await load();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Failed to approve penalty');
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async (values: Record<string, string>) => {
    if (!applyTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/penalties/${encodeURIComponent(applyTarget.name)}/actions`, {
        method: 'POST',
        body: {
          action: 'apply',
          invoice_name: values.invoice_name || '',
        },
      });
      setApplyTarget(null);
      await load();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'Failed to apply penalty');
      throw applyError;
    } finally {
      setBusy(false);
    }
  };

  const handleReverse = async (values: Record<string, string>) => {
    if (!reverseTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/penalties/${encodeURIComponent(reverseTarget.name)}/actions`, {
        method: 'POST',
        body: {
          action: 'reverse',
          reason: values.reason || '',
        },
      });
      setReverseTarget(null);
      await load();
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : 'Failed to reverse penalty');
      throw reverseError;
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/penalties/${encodeURIComponent(deleteTarget.name)}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete penalty');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Penalty Deductions"
        description="Manage LD, SLA, and client penalties through dedicated finance routes."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No penalty deductions"
        emptyDescription={query ? 'No penalties match this search.' : 'Create the first penalty deduction to start tracking exposure.'}
        onRetry={load}
        stats={registerStats}
        headerActions={(
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Penalty
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
              placeholder="Search penalty, project, source…"
            />
          </div>
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Penalty</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Applied To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const status = (row.status || '').toUpperCase();
                return (
                  <tr key={row.name} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/finance/penalties/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.project || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.customer || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.source || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(row.penalty_amount || 0))}</td>
                    <td className="px-4 py-3 text-slate-700">{row.applied_to_invoice || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${badge(PENALTY_BADGES, row.status)}`}>{row.status || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {['DRAFT', 'PENDING', 'APPROVED'].includes(status) ? <button className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => setUpdateTarget(row)}>Update</button> : null}
                        {['DRAFT', 'PENDING'].includes(status) ? <button className="text-sm font-medium text-emerald-600 hover:text-emerald-800" onClick={() => setApproveTarget(row)}>Approve</button> : null}
                        {status === 'APPROVED' ? <button className="text-sm font-medium text-amber-600 hover:text-amber-800" onClick={() => setApplyTarget(row)}>Apply</button> : null}
                        {['APPROVED', 'APPLIED'].includes(status) ? <button className="text-sm font-medium text-orange-600 hover:text-orange-800" onClick={() => setReverseTarget(row)}>Reverse</button> : null}
                        {['DRAFT', 'PENDING'].includes(status) ? <button className="text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => setDeleteTarget(row)}>Delete</button> : null}
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
        title="Create Penalty"
        description="Create a penalty deduction through the dedicated finance API contract."
        busy={busy}
        confirmLabel="Create Penalty"
        fields={[
          { name: 'project', label: 'Project', type: 'link', linkEntity: 'project', placeholder: 'Search project…' },
          { name: 'source', label: 'Source', type: 'text', placeholder: 'LD / SLA / Client' },
          { name: 'penalty_amount', label: 'Penalty Amount', type: 'number', defaultValue: '0', required: true },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal
        open={Boolean(updateTarget)}
        title={`Update ${updateTarget?.name || 'Penalty'}`}
        description="Add an update note to this penalty deduction."
        confirmLabel="Update"
        busy={busy}
        fields={[
          { name: 'remarks', label: 'Update Note', type: 'textarea', required: true },
        ]}
        onConfirm={handleUpdate}
        onCancel={() => setUpdateTarget(null)}
      />

      <ActionModal
        open={Boolean(approveTarget)}
        title={`Approve ${approveTarget?.name || 'Penalty'}`}
        description="Approve this penalty deduction."
        confirmLabel="Approve"
        variant="success"
        busy={busy}
        onConfirm={handleApprove}
        onCancel={() => setApproveTarget(null)}
      />

      <ActionModal
        open={Boolean(applyTarget)}
        title={`Apply ${applyTarget?.name || 'Penalty'}`}
        description="Apply this penalty against an invoice."
        confirmLabel="Apply"
        variant="default"
        busy={busy}
        fields={[
          { name: 'invoice_name', label: 'Invoice Name', type: 'text', required: true, placeholder: 'Sales invoice ID' },
        ]}
        onConfirm={handleApply}
        onCancel={() => setApplyTarget(null)}
      />

      <ActionModal
        open={Boolean(reverseTarget)}
        title={`Reverse ${reverseTarget?.name || 'Penalty'}`}
        description="Provide the reason for reversing this penalty."
        confirmLabel="Reverse"
        variant="danger"
        busy={busy}
        fields={[
          { name: 'reason', label: 'Reverse Reason', type: 'textarea', required: true },
        ]}
        onConfirm={handleReverse}
        onCancel={() => setReverseTarget(null)}
      />

      <ActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name || 'Penalty'}`}
        description="This removes the penalty deduction."
        confirmLabel="Delete"
        variant="danger"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
