'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { badge, callApi, FOLLOW_UP_BADGES, formatCurrency, formatDate } from '@/components/finance/fin-helpers';

type FollowUpRow = {
  name: string;
  customer?: string;
  linked_invoice?: string;
  linked_project?: string;
  follow_up_date?: string;
  follow_up_mode?: string;
  promised_payment_date?: string;
  promised_payment_amount?: number;
  next_follow_up_on?: string;
  summary?: string;
  contact_person?: string;
  status?: string;
};

type FollowUpStats = {
  total?: number;
  open?: number;
  promised?: number;
  promised_amount?: number;
};

export default function FollowUpsPage() {
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [stats, setStats] = useState<FollowUpStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<FollowUpRow | null>(null);
  const [closeTarget, setCloseTarget] = useState<FollowUpRow | null>(null);
  const [escalateTarget, setEscalateTarget] = useState<FollowUpRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FollowUpRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listData, statsData] = await Promise.all([
        callApi<FollowUpRow[]>('/api/finance/follow-ups'),
        callApi<FollowUpStats>('/api/finance/follow-ups/stats'),
      ]);
      setRows(Array.isArray(listData) ? listData : []);
      setStats(statsData || {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load payment follow-ups');
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
      [
        row.name,
        row.customer,
        row.linked_invoice,
        row.linked_project,
        row.contact_person,
        row.follow_up_mode,
        row.summary,
        row.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const registerStats = useMemo(() => ([
    { label: 'Total', value: stats.total ?? rows.length, variant: 'info' as const },
    { label: 'Open', value: stats.open ?? rows.filter((row) => (row.status || '').toUpperCase() !== 'CLOSED').length, variant: 'warning' as const },
    { label: 'Promised', value: stats.promised ?? rows.filter((row) => (row.status || '').toUpperCase() === 'PROMISED').length, variant: 'success' as const },
    { label: 'Promised Amount', value: formatCurrency(Number(stats.promised_amount || 0)), variant: 'default' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query ? 'default' as const : undefined },
  ]), [filteredRows.length, query, rows, stats.open, stats.promised, stats.promised_amount, stats.total]);

  const handleCreate = async (values: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      await callApi('/api/finance/follow-ups', {
        method: 'POST',
        body: {
          customer: values.customer || undefined,
          linked_invoice: values.linked_invoice || undefined,
          linked_project: values.linked_project || undefined,
          follow_up_date: values.follow_up_date || undefined,
          follow_up_mode: values.follow_up_mode || 'CALL',
          contact_person: values.contact_person || undefined,
          promised_payment_date: values.promised_payment_date || undefined,
          promised_payment_amount: Number(values.promised_payment_amount) || 0,
          next_follow_up_on: values.next_follow_up_on || undefined,
          summary: values.summary || undefined,
        },
      });
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create follow-up');
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
      await callApi(`/api/finance/follow-ups/${encodeURIComponent(updateTarget.name)}`, {
        method: 'PATCH',
        body: {
          remarks: values.remarks || '',
        },
      });
      setUpdateTarget(null);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update follow-up');
      throw updateError;
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async (values: Record<string, string>) => {
    if (!closeTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/finance/follow-ups/${encodeURIComponent(closeTarget.name)}/actions`, {
        method: 'POST',
        body: {
          action: 'close',
          remarks: values.remarks || '',
          collected_amount: values.collected_amount || undefined,
        },
      });
      setCloseTarget(null);
      await load();
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : 'Failed to close follow-up');
      throw closeError;
    } finally {
      setBusy(false);
    }
  };

  const handleEscalate = async (values: Record<string, string>) => {
    if (!escalateTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/finance/follow-ups/${encodeURIComponent(escalateTarget.name)}/actions`, {
        method: 'POST',
        body: {
          action: 'escalate',
          remarks: values.remarks || '',
          escalate_to: values.escalate_to || undefined,
        },
      });
      setEscalateTarget(null);
      await load();
    } catch (escalateError) {
      setError(escalateError instanceof Error ? escalateError.message : 'Failed to escalate follow-up');
      throw escalateError;
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/finance/follow-ups/${encodeURIComponent(deleteTarget.name)}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete follow-up');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Payment Follow Ups"
        description="Track collections, promised dates, and escalations through dedicated finance routes."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No payment follow-ups"
        emptyDescription={query ? 'No follow-ups match this search.' : 'Create the first follow-up to start tracking collections.'}
        onRetry={load}
        stats={registerStats}
        headerActions={(
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Add Follow Up
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
              placeholder="Search customer, invoice, project…"
            />
          </div>
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Follow Up</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Follow Up Date</th>
                <th className="px-4 py-3">Next Follow Up</th>
                <th className="px-4 py-3">Promised Amount</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const isClosed = (row.status || '').toUpperCase() === 'CLOSED';
                return (
                  <tr key={row.name} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/finance/follow-ups/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.customer || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.linked_invoice || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.linked_project || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.follow_up_date)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.next_follow_up_on)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(row.promised_payment_amount || 0))}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[320px] truncate" title={row.summary || ''}>{row.summary || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${badge(FOLLOW_UP_BADGES, row.status)}`}>{row.status || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!isClosed ? <button className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => setUpdateTarget(row)}>Update</button> : null}
                        {!isClosed ? <button className="text-sm font-medium text-emerald-600 hover:text-emerald-800" onClick={() => setCloseTarget(row)}>Close</button> : null}
                        {!isClosed ? <button className="text-sm font-medium text-amber-600 hover:text-amber-800" onClick={() => setEscalateTarget(row)}>Escalate</button> : null}
                        <button className="text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => setDeleteTarget(row)}>Delete</button>
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
        title="Add Payment Follow Up"
        description="Capture a collection follow-up through the dedicated finance API contract."
        size="lg"
        busy={busy}
        confirmLabel="Create Follow Up"
        fields={[
          { name: 'customer', label: 'Customer', type: 'link', linkEntity: 'customer', placeholder: 'Search customer…' },
          { name: 'linked_invoice', label: 'Linked Invoice', type: 'link', linkEntity: 'invoice', placeholder: 'Search invoice…' },
          { name: 'linked_project', label: 'Linked Project', type: 'link', linkEntity: 'project', placeholder: 'Search project…' },
          { name: 'follow_up_date', label: 'Follow Up Date', type: 'date', required: true },
          {
            name: 'follow_up_mode',
            label: 'Mode',
            type: 'select',
            defaultValue: 'CALL',
            options: [
              { label: 'Call', value: 'CALL' },
              { label: 'Email', value: 'EMAIL' },
              { label: 'WhatsApp', value: 'WHATSAPP' },
              { label: 'Meeting', value: 'MEETING' },
            ],
          },
          { name: 'contact_person', label: 'Contact Person', type: 'text' },
          { name: 'promised_payment_date', label: 'Promised Payment Date', type: 'date' },
          { name: 'promised_payment_amount', label: 'Promised Amount', type: 'number', defaultValue: '0' },
          { name: 'next_follow_up_on', label: 'Next Follow Up', type: 'date' },
          { name: 'summary', label: 'Summary', type: 'textarea' },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal
        open={Boolean(updateTarget)}
        title={`Update ${updateTarget?.name || 'Follow Up'}`}
        description="Add an update note to the follow-up."
        confirmLabel="Update"
        busy={busy}
        fields={[
          { name: 'remarks', label: 'Update Note', type: 'textarea', required: true },
        ]}
        onConfirm={handleUpdate}
        onCancel={() => setUpdateTarget(null)}
      />

      <ActionModal
        open={Boolean(closeTarget)}
        title={`Close ${closeTarget?.name || 'Follow Up'}`}
        description="Record the closing note and any collected amount."
        confirmLabel="Close Follow Up"
        variant="success"
        busy={busy}
        fields={[
          { name: 'remarks', label: 'Closing Note', type: 'textarea', required: true },
          { name: 'collected_amount', label: 'Collected Amount', type: 'text' },
        ]}
        onConfirm={handleClose}
        onCancel={() => setCloseTarget(null)}
      />

      <ActionModal
        open={Boolean(escalateTarget)}
        title={`Escalate ${escalateTarget?.name || 'Follow Up'}`}
        description="Escalate this collection follow-up to the next owner."
        confirmLabel="Escalate"
        variant="default"
        busy={busy}
        fields={[
          { name: 'remarks', label: 'Escalation Note', type: 'textarea', required: true },
          { name: 'escalate_to', label: 'Escalate To', type: 'text' },
        ]}
        onConfirm={handleEscalate}
        onCancel={() => setEscalateTarget(null)}
      />

      <ActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name || 'Follow Up'}`}
        description="This removes the follow-up record."
        confirmLabel="Delete Follow Up"
        variant="danger"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
