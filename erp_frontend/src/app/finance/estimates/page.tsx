'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { badge, callApi, ESTIMATE_BADGES, formatCurrency, formatDate } from '@/components/finance/fin-helpers';

type EstimateRow = {
  name: string;
  customer?: string;
  linked_tender?: string;
  linked_project?: string;
  estimate_date?: string;
  valid_until?: string;
  net_amount?: number;
  grand_total?: number;
  status?: string;
  remarks?: string;
};

type EstimateStats = {
  total?: number;
  sent?: number;
  approved?: number;
  total_value?: number;
};

export default function EstimatesPage() {
  const [rows, setRows] = useState<EstimateRow[]>([]);
  const [stats, setStats] = useState<EstimateStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<EstimateRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<EstimateRow | null>(null);
  const [sendTarget, setSendTarget] = useState<EstimateRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<EstimateRow | null>(null);
  const [convertTarget, setConvertTarget] = useState<EstimateRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EstimateRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listData, statsData] = await Promise.all([
        callApi<EstimateRow[]>('/api/estimates'),
        callApi<EstimateStats>('/api/estimates/stats'),
      ]);
      setRows(Array.isArray(listData) ? listData : []);
      setStats(statsData || {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load estimates');
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
      [row.name, row.customer, row.linked_tender, row.linked_project, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const registerStats = useMemo(() => ([
    { label: 'Estimates', value: stats.total ?? rows.length, variant: 'info' as const },
    { label: 'Sent', value: stats.sent ?? rows.filter((row) => (row.status || '').toUpperCase() === 'SENT').length, variant: 'warning' as const },
    { label: 'Approved', value: stats.approved ?? rows.filter((row) => (row.status || '').toUpperCase() === 'APPROVED').length, variant: 'success' as const },
    { label: 'Value', value: formatCurrency(Number(stats.total_value || 0)), variant: 'default' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query ? 'default' as const : undefined },
  ]), [filteredRows.length, query, rows, stats.approved, stats.sent, stats.total, stats.total_value]);

  const handleCreate = async (values: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      await callApi('/api/estimates', {
        method: 'POST',
        body: {
          customer: values.customer || undefined,
          linked_tender: values.linked_tender || undefined,
          linked_project: values.linked_project || undefined,
          estimate_date: values.estimate_date || undefined,
          valid_until: values.valid_until || undefined,
          gst_percent: Number(values.gst_percent) || 0,
          tds_percent: Number(values.tds_percent) || 0,
          retention_percent: Number(values.retention_percent) || 0,
          remarks: values.remarks || undefined,
          items: [
            {
              description: values.description || '',
              qty: Number(values.qty) || 1,
              rate: Number(values.rate) || 0,
            },
          ],
        },
      });
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create estimate');
      throw createError;
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (target: EstimateRow | null, action: string, body: Record<string, unknown> = {}) => {
    if (!target) return;
    await callApi(`/api/estimates/${encodeURIComponent(target.name)}/actions`, {
      method: 'POST',
      body: { action, ...body },
    });
  };

  const handleUpdate = async (values: Record<string, string>) => {
    if (!updateTarget) return;
    setBusy(true);
    setError('');
    try {
      await runAction(updateTarget, 'update', { data: { remarks: values.remarks || '' } });
      setUpdateTarget(null);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update estimate');
      throw updateError;
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (values: Record<string, string>) => {
    if (!rejectTarget) return;
    setBusy(true);
    setError('');
    try {
      await runAction(rejectTarget, 'reject', { reason: values.reason || '' });
      setRejectTarget(null);
      await load();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : 'Failed to reject estimate');
      throw rejectError;
    } finally {
      setBusy(false);
    }
  };

  const simpleAction = async (target: EstimateRow | null, action: string, closer: (value: EstimateRow | null) => void) => {
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      await runAction(target, action);
      closer(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action} estimate`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Estimates"
        description="Create customer quotations and move them toward proforma conversion through dedicated finance routes."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No estimates"
        emptyDescription={query ? 'No estimates match this search.' : 'Create the first estimate to start the commercial flow.'}
        onRetry={load}
        stats={registerStats}
        headerActions={(
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Estimate
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
              placeholder="Search customer, project, tender…"
            />
          </div>
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Estimate</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Tender</th>
                <th className="px-4 py-3">Estimate Date</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3">Net Amount</th>
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
                      <Link href={`/finance/estimates/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.customer || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.linked_project || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.linked_tender || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.estimate_date)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.valid_until)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(row.net_amount || row.grand_total || 0))}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${badge(ESTIMATE_BADGES, row.status)}`}>{row.status || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {status === 'DRAFT' ? <button className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => setSendTarget(row)}>Send</button> : null}
                        {['DRAFT', 'SENT'].includes(status) ? <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800" onClick={() => setUpdateTarget(row)}>Update</button> : null}
                        {['DRAFT', 'SENT'].includes(status) ? <button className="text-sm font-medium text-emerald-600 hover:text-emerald-800" onClick={() => setApproveTarget(row)}>Approve</button> : null}
                        {!['CONVERTED', 'CANCELLED'].includes(status) ? <button className="text-sm font-medium text-amber-600 hover:text-amber-800" onClick={() => setRejectTarget(row)}>Reject</button> : null}
                        {['APPROVED', 'SENT'].includes(status) ? <button className="text-sm font-medium text-violet-600 hover:text-violet-800" onClick={() => setConvertTarget(row)}>To Proforma</button> : null}
                        {status === 'DRAFT' ? <button className="text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => setDeleteTarget(row)}>Delete</button> : null}
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
        title="Create Estimate"
        description="Create a customer quotation through the dedicated finance estimate API."
        size="lg"
        busy={busy}
        confirmLabel="Create Estimate"
        fields={[
          { name: 'customer', label: 'Customer', type: 'link', linkEntity: 'customer', placeholder: 'Search customer…' },
          { name: 'linked_tender', label: 'Linked Tender', type: 'link', linkEntity: 'tender', placeholder: 'Search tender…' },
          { name: 'linked_project', label: 'Linked Project', type: 'link', linkEntity: 'project', placeholder: 'Search project…' },
          { name: 'estimate_date', label: 'Estimate Date', type: 'date', required: true },
          { name: 'valid_until', label: 'Valid Until', type: 'date' },
          { name: 'gst_percent', label: 'GST %', type: 'number', defaultValue: '18' },
          { name: 'tds_percent', label: 'TDS %', type: 'number', defaultValue: '0' },
          { name: 'retention_percent', label: 'Retention %', type: 'number', defaultValue: '0' },
          { name: 'description', label: 'Line Description', type: 'textarea', required: true },
          { name: 'qty', label: 'Qty', type: 'number', defaultValue: '1' },
          { name: 'rate', label: 'Rate', type: 'number', defaultValue: '0' },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal
        open={Boolean(updateTarget)}
        title={`Update ${updateTarget?.name || 'Estimate'}`}
        confirmLabel="Update"
        busy={busy}
        fields={[
          { name: 'remarks', label: 'Update Note', type: 'textarea', required: true },
        ]}
        onConfirm={handleUpdate}
        onCancel={() => setUpdateTarget(null)}
      />

      <ActionModal
        open={Boolean(rejectTarget)}
        title={`Reject ${rejectTarget?.name || 'Estimate'}`}
        confirmLabel="Reject"
        variant="danger"
        busy={busy}
        fields={[
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
        ]}
        onConfirm={handleReject}
        onCancel={() => setRejectTarget(null)}
      />

      <ActionModal
        open={Boolean(sendTarget)}
        title={`Send ${sendTarget?.name || 'Estimate'}`}
        confirmLabel="Send"
        variant="default"
        busy={busy}
        onConfirm={() => simpleAction(sendTarget, 'send', setSendTarget)}
        onCancel={() => setSendTarget(null)}
      />

      <ActionModal
        open={Boolean(approveTarget)}
        title={`Approve ${approveTarget?.name || 'Estimate'}`}
        confirmLabel="Approve"
        variant="success"
        busy={busy}
        onConfirm={() => simpleAction(approveTarget, 'approve', setApproveTarget)}
        onCancel={() => setApproveTarget(null)}
      />

      <ActionModal
        open={Boolean(convertTarget)}
        title={`Convert ${convertTarget?.name || 'Estimate'}`}
        confirmLabel="Convert"
        variant="default"
        busy={busy}
        onConfirm={() => simpleAction(convertTarget, 'convert', setConvertTarget)}
        onCancel={() => setConvertTarget(null)}
      />

      <ActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name || 'Estimate'}`}
        confirmLabel="Delete"
        variant="danger"
        busy={busy}
        onConfirm={() => simpleAction(deleteTarget, 'delete', setDeleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
