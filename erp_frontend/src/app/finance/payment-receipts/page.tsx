'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { badge, callApi, formatCurrency, formatDate, RECEIPT_BADGES } from '@/components/finance/fin-helpers';

type PaymentReceiptRow = {
  name: string;
  receipt_type?: string;
  customer?: string;
  linked_invoice?: string;
  linked_project?: string;
  received_date?: string;
  amount_received?: number;
  adjusted_amount?: number;
  status?: string;
};

type PaymentReceiptStats = {
  total_receipts?: number;
  total_received?: number;
  advance_received?: number;
  adjusted_amount?: number;
};

export default function PaymentReceiptsPage() {
  const [rows, setRows] = useState<PaymentReceiptRow[]>([]);
  const [stats, setStats] = useState<PaymentReceiptStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<PaymentReceiptRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentReceiptRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listData, statsData] = await Promise.all([
        callApi<PaymentReceiptRow[]>('/api/payment-receipts'),
        callApi<PaymentReceiptStats>('/api/payment-receipts/stats'),
      ]);
      setRows(Array.isArray(listData) ? listData : []);
      setStats(statsData || {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load payment receipts');
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
      [row.name, row.customer, row.linked_invoice, row.linked_project, row.receipt_type, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const registerStats = useMemo(() => ([
    { label: 'Receipts', value: stats.total_receipts ?? rows.length },
    { label: 'Received Amount', value: formatCurrency(Number(stats.total_received || 0)), variant: 'success' as const },
    { label: 'Advance Received', value: formatCurrency(Number(stats.advance_received || 0)), variant: 'warning' as const },
    { label: 'Adjusted Amount', value: formatCurrency(Number(stats.adjusted_amount || 0)), variant: 'info' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query ? 'default' as const : undefined },
  ]), [filteredRows.length, query, rows.length, stats.adjusted_amount, stats.advance_received, stats.total_receipts, stats.total_received]);

  const handleCreate = async (values: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      await callApi('/api/payment-receipts', {
        method: 'POST',
        body: {
          receipt_type: values.receipt_type || 'AGAINST_INVOICE',
          customer: values.customer || undefined,
          linked_invoice: values.linked_invoice || undefined,
          linked_project: values.linked_project || undefined,
          advance_reference: values.advance_reference || undefined,
          received_date: values.received_date || undefined,
          amount_received: Number(values.amount_received) || 0,
          adjusted_amount: Number(values.adjusted_amount) || 0,
          tds_amount: Number(values.tds_amount) || 0,
          payment_mode: values.payment_mode || 'BANK_TRANSFER',
          payment_reference: values.payment_reference || undefined,
          remarks: values.remarks || undefined,
        },
      });
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create payment receipt');
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
      await callApi(`/api/payment-receipts/${encodeURIComponent(updateTarget.name)}`, {
        method: 'PATCH',
        body: { remarks: values.remarks || '' },
      });
      setUpdateTarget(null);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update payment receipt');
      throw updateError;
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      await callApi(`/api/payment-receipts/${encodeURIComponent(deleteTarget.name)}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete payment receipt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Payment Receipts"
        description="Track invoice receipts, advances, and adjustments through dedicated finance routes."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No payment receipts"
        emptyDescription={query ? 'No receipts match this search.' : 'Create the first payment receipt to begin collection tracking.'}
        onRetry={load}
        stats={registerStats}
        headerActions={(
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Payment Receipt
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
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Adjusted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.name} className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/finance/payment-receipts/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.receipt_type || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.customer || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.linked_invoice || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.linked_project || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(row.received_date)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(row.amount_received || 0))}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(row.adjusted_amount || 0))}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${badge(RECEIPT_BADGES, row.status)}`}>{row.status || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => setUpdateTarget(row)}>Update</button>
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
        title="Create Payment Receipt"
        description="Capture new receipts through the dedicated finance receipt API."
        size="lg"
        busy={busy}
        confirmLabel="Create Receipt"
        fields={[
          {
            name: 'receipt_type',
            label: 'Receipt Type',
            type: 'select',
            defaultValue: 'AGAINST_INVOICE',
            options: [
              { label: 'Against Invoice', value: 'AGAINST_INVOICE' },
              { label: 'Advance', value: 'ADVANCE' },
              { label: 'Adjustment', value: 'ADJUSTMENT' },
            ],
          },
          { name: 'customer', label: 'Customer', type: 'link', linkEntity: 'customer', placeholder: 'Search customer…' },
          { name: 'linked_invoice', label: 'Linked Invoice', type: 'link', linkEntity: 'invoice', placeholder: 'Search invoice…' },
          { name: 'linked_project', label: 'Project', type: 'link', linkEntity: 'project', placeholder: 'Search project…' },
          { name: 'advance_reference', label: 'Advance Reference', type: 'text' },
          { name: 'received_date', label: 'Receipt Date', type: 'date' },
          { name: 'amount_received', label: 'Amount Received', type: 'number', required: true, defaultValue: '0' },
          { name: 'adjusted_amount', label: 'Adjusted Amount', type: 'number', defaultValue: '0' },
          { name: 'tds_amount', label: 'TDS Amount', type: 'number', defaultValue: '0' },
          {
            name: 'payment_mode',
            label: 'Payment Mode',
            type: 'select',
            defaultValue: 'BANK_TRANSFER',
            options: [
              { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
              { label: 'Cheque', value: 'CHEQUE' },
              { label: 'Cash', value: 'CASH' },
              { label: 'Other', value: 'OTHER' },
            ],
          },
          { name: 'payment_reference', label: 'Payment Reference', type: 'text' },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal
        open={Boolean(updateTarget)}
        title="Update Payment Receipt"
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
        open={Boolean(deleteTarget)}
        title="Delete Payment Receipt"
        description={deleteTarget ? `Delete ${deleteTarget.name} from payment receipts?` : undefined}
        busy={busy}
        confirmLabel="Delete Receipt"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
