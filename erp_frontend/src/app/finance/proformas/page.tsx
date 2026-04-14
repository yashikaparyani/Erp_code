'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { badge, callApi, formatCurrency, formatDate, PROFORMA_BADGES } from '@/components/finance/fin-helpers';

type ProformaRow = {
  name: string;
  customer?: string;
  linked_estimate?: string;
  linked_project?: string;
  proforma_date?: string;
  due_date?: string;
  net_amount?: number;
  grand_total?: number;
  status?: string;
};

type ProformaStats = {
  total?: number;
  sent?: number;
  approved?: number;
  total_value?: number;
};

export default function ProformasPage() {
  const [rows, setRows] = useState<ProformaRow[]>([]);
  const [stats, setStats] = useState<ProformaStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<ProformaRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ProformaRow | null>(null);
  const [sendTarget, setSendTarget] = useState<ProformaRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<ProformaRow | null>(null);
  const [convertTarget, setConvertTarget] = useState<ProformaRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProformaRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listData, statsData] = await Promise.all([
        callApi<ProformaRow[]>('/api/proformas'),
        callApi<ProformaStats>('/api/proformas/stats'),
      ]);
      setRows(Array.isArray(listData) ? listData : []);
      setStats(statsData || {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load proformas');
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
      [row.name, row.customer, row.linked_estimate, row.linked_project, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const registerStats = useMemo(() => ([
    { label: 'Proformas', value: stats.total ?? rows.length, variant: 'info' as const },
    { label: 'Sent', value: stats.sent ?? rows.filter((row) => (row.status || '').toUpperCase() === 'SENT').length, variant: 'warning' as const },
    { label: 'Approved', value: stats.approved ?? rows.filter((row) => (row.status || '').toUpperCase() === 'APPROVED').length, variant: 'success' as const },
    { label: 'Value', value: formatCurrency(Number(stats.total_value || 0)), variant: 'default' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query ? 'default' as const : undefined },
  ]), [filteredRows.length, query, rows, stats.approved, stats.sent, stats.total, stats.total_value]);

  const handleCreate = async (values: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      await callApi('/api/proformas', {
        method: 'POST',
        body: {
          customer: values.customer || undefined,
          linked_estimate: values.linked_estimate || undefined,
          linked_project: values.linked_project || undefined,
          proforma_date: values.proforma_date || undefined,
          due_date: values.due_date || undefined,
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
      setError(createError instanceof Error ? createError.message : 'Failed to create proforma');
      throw createError;
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (target: ProformaRow | null, action: string, body: Record<string, unknown> = {}) => {
    if (!target) return;
    await callApi(`/api/proformas/${encodeURIComponent(target.name)}/actions`, {
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
      setError(updateError instanceof Error ? updateError.message : 'Failed to update proforma');
      throw updateError;
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (values: Record<string, string>) => {
    if (!cancelTarget) return;
    setBusy(true);
    setError('');
    try {
      await runAction(cancelTarget, 'cancel', { reason: values.reason || '' });
      setCancelTarget(null);
      await load();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Failed to cancel proforma');
      throw cancelError;
    } finally {
      setBusy(false);
    }
  };

  const simpleAction = async (target: ProformaRow | null, action: string, closer: (value: ProformaRow | null) => void) => {
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      await runAction(target, action);
      closer(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action} proforma`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Proforma Invoices"
        description="Hold pre-billing commercial documents before final invoice generation through dedicated finance routes."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No proformas"
        emptyDescription={query ? 'No proformas match this search.' : 'Create the first proforma to start pre-billing control.'}
        onRetry={load}
        stats={registerStats}
        headerActions={(
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Proforma
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
              placeholder="Search customer, estimate, project…"
            />
          </div>
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Proforma</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Estimate</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Due Date</th>
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
                      <Link href={`/finance/proformas/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.customer || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.linked_project || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.linked_estimate || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.proforma_date)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.due_date)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(row.net_amount || row.grand_total || 0))}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${badge(PROFORMA_BADGES, row.status)}`}>{row.status || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {status === 'DRAFT' ? <button className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => setSendTarget(row)}>Send</button> : null}
                        {['DRAFT', 'SENT'].includes(status) ? <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800" onClick={() => setUpdateTarget(row)}>Update</button> : null}
                        {['DRAFT', 'SENT'].includes(status) ? <button className="text-sm font-medium text-emerald-600 hover:text-emerald-800" onClick={() => setApproveTarget(row)}>Approve</button> : null}
                        {status !== 'CONVERTED' ? <button className="text-sm font-medium text-amber-600 hover:text-amber-800" onClick={() => setCancelTarget(row)}>Cancel</button> : null}
                        {['APPROVED', 'SENT'].includes(status) ? <button className="text-sm font-medium text-violet-600 hover:text-violet-800" onClick={() => setConvertTarget(row)}>To Invoice</button> : null}
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
        title="Create Proforma"
        description="Create a pre-billing commercial document through the dedicated finance proforma API."
        size="lg"
        busy={busy}
        confirmLabel="Create Proforma"
        fields={[
          { name: 'customer', label: 'Customer', type: 'link', linkEntity: 'customer', placeholder: 'Search customer…' },
          { name: 'linked_estimate', label: 'Linked Estimate', type: 'link', linkEntity: 'estimate', placeholder: 'Search estimate…' },
          { name: 'linked_project', label: 'Linked Project', type: 'link', linkEntity: 'project', placeholder: 'Search project…' },
          { name: 'proforma_date', label: 'Proforma Date', type: 'date', required: true },
          { name: 'due_date', label: 'Due Date', type: 'date' },
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
        title={`Update ${updateTarget?.name || 'Proforma'}`}
        confirmLabel="Update"
        busy={busy}
        fields={[
          { name: 'remarks', label: 'Update Note', type: 'textarea', required: true },
        ]}
        onConfirm={handleUpdate}
        onCancel={() => setUpdateTarget(null)}
      />

      <ActionModal
        open={Boolean(cancelTarget)}
        title={`Cancel ${cancelTarget?.name || 'Proforma'}`}
        confirmLabel="Cancel"
        variant="danger"
        busy={busy}
        fields={[
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
        ]}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />

      <ActionModal
        open={Boolean(sendTarget)}
        title={`Send ${sendTarget?.name || 'Proforma'}`}
        confirmLabel="Send"
        variant="default"
        busy={busy}
        onConfirm={() => simpleAction(sendTarget, 'send', setSendTarget)}
        onCancel={() => setSendTarget(null)}
      />

      <ActionModal
        open={Boolean(approveTarget)}
        title={`Approve ${approveTarget?.name || 'Proforma'}`}
        confirmLabel="Approve"
        variant="success"
        busy={busy}
        onConfirm={() => simpleAction(approveTarget, 'approve', setApproveTarget)}
        onCancel={() => setApproveTarget(null)}
      />

      <ActionModal
        open={Boolean(convertTarget)}
        title={`Convert ${convertTarget?.name || 'Proforma'}`}
        confirmLabel="Convert"
        variant="default"
        busy={busy}
        onConfirm={() => simpleAction(convertTarget, 'convert', setConvertTarget)}
        onCancel={() => setConvertTarget(null)}
      />

      <ActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name || 'Proforma'}`}
        confirmLabel="Delete"
        variant="danger"
        busy={busy}
        onConfirm={() => simpleAction(deleteTarget, 'delete', setDeleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
