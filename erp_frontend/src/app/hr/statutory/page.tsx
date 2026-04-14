'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal, { type FormField } from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { apiFetch } from '@/lib/api-client';

type StatutoryRow = {
  name: string;
  employee?: string;
  ledger_type?: string;
  period_start?: string;
  period_end?: string;
  employee_contribution?: number;
  employer_contribution?: number;
  payment_status?: string;
  payment_date?: string;
  challan_reference?: string;
};

type StatutoryStats = {
  total?: number;
  epf?: number;
  esic?: number;
  paid?: number;
  pending?: number;
  hold?: number;
  total_employee_contribution?: number;
  total_employer_contribution?: number;
};

const LEDGER_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'EPF', label: 'EPF' },
  { value: 'ESIC', label: 'ESIC' },
  { value: 'PT', label: 'Professional Tax' },
  { value: 'TDS', label: 'TDS' },
  { value: 'LWF', label: 'LWF' },
] as const;

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All payment statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'HOLD', label: 'Hold' },
  { value: 'PAID', label: 'Paid' },
] as const;

const BASE_FIELDS: FormField[] = [
  { name: 'employee', label: 'Employee', type: 'link', linkEntity: 'employee', placeholder: 'Search employee…', required: true },
  {
    name: 'ledger_type',
    label: 'Ledger Type',
    type: 'select',
    required: true,
    options: LEDGER_TYPE_OPTIONS.filter((option) => option.value).map((option) => ({ value: option.value, label: option.label })),
  },
  { name: 'period_start', label: 'Period Start', type: 'date' },
  { name: 'period_end', label: 'Period End', type: 'date', required: true },
  { name: 'employee_contribution', label: 'Employee Contribution', type: 'number', defaultValue: '0' },
  { name: 'employer_contribution', label: 'Employer Contribution', type: 'number', defaultValue: '0' },
  {
    name: 'payment_status',
    label: 'Payment Status',
    type: 'select',
    options: PAYMENT_STATUS_OPTIONS.filter((option) => option.value).map((option) => ({ value: option.value, label: option.label })),
    defaultValue: 'PENDING',
  },
  { name: 'payment_date', label: 'Payment Date', type: 'date' },
  { name: 'challan_reference', label: 'Challan Reference', type: 'text', placeholder: 'Reference / challan number' },
  { name: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Add statutory notes…' },
];

const badgeClass = (status?: string) => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'PAID') return 'badge-green';
  if (normalized === 'PENDING') return 'badge-yellow';
  if (normalized === 'HOLD') return 'badge-red';
  return 'badge-gray';
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (value?: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function HrStatutoryLedgerPage() {
  const [rows, setRows] = useState<StatutoryRow[]>([]);
  const [stats, setStats] = useState<StatutoryStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<StatutoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StatutoryRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listPayload, statsPayload] = await Promise.all([
        apiFetch<{ success: boolean; data?: StatutoryRow[] }>('/api/statutory'),
        apiFetch<{ success: boolean; data?: StatutoryStats }>('/api/statutory/stats'),
      ]);
      setRows(Array.isArray(listPayload.data) ? listPayload.data : []);
      setStats(statsPayload.data || {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load statutory ledgers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const ledgerTypeMatches = !ledgerTypeFilter || (row.ledger_type || '').toUpperCase() === ledgerTypeFilter;
      const paymentStatusMatches = !paymentStatusFilter || (row.payment_status || '').toUpperCase() === paymentStatusFilter;
      const queryMatches = !normalizedQuery || [
        row.name,
        row.employee,
        row.ledger_type,
        row.payment_status,
        row.challan_reference,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));
      return ledgerTypeMatches && paymentStatusMatches && queryMatches;
    });
  }, [ledgerTypeFilter, paymentStatusFilter, query, rows]);

  const registerStats = useMemo(() => {
    const totalContribution = Number(stats.total_employee_contribution || 0) + Number(stats.total_employer_contribution || 0);
    return [
      { label: 'Total Entries', value: stats.total ?? rows.length },
      { label: 'Paid', value: stats.paid ?? rows.filter((row) => (row.payment_status || '').toUpperCase() === 'PAID').length, variant: 'success' as const },
      { label: 'Pending', value: stats.pending ?? rows.filter((row) => (row.payment_status || '').toUpperCase() === 'PENDING').length, variant: 'warning' as const },
      { label: 'Total Contribution', value: formatCurrency(totalContribution), variant: 'info' as const },
      { label: 'Filtered', value: filteredRows.length, variant: query || ledgerTypeFilter || paymentStatusFilter ? 'info' as const : undefined },
    ];
  }, [filteredRows.length, ledgerTypeFilter, paymentStatusFilter, query, rows, stats.paid, stats.pending, stats.total, stats.total_employee_contribution, stats.total_employer_contribution]);

  const editFields = useMemo<FormField[]>(() => BASE_FIELDS.map((field) => ({
    ...field,
    defaultValue: editTarget ? String((editTarget as Record<string, unknown>)[field.name] ?? field.defaultValue ?? '') : field.defaultValue,
  })), [editTarget]);

  const handleCreate = async (values: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      await apiFetch('/api/statutory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: values.employee || undefined,
          ledger_type: values.ledger_type || undefined,
          period_start: values.period_start || undefined,
          period_end: values.period_end || undefined,
          employee_contribution: Number(values.employee_contribution) || 0,
          employer_contribution: Number(values.employer_contribution) || 0,
          payment_status: values.payment_status || undefined,
          payment_date: values.payment_date || undefined,
          challan_reference: values.challan_reference || undefined,
          remarks: values.remarks || undefined,
        }),
      });
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create statutory ledger');
      throw createError;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (values: Record<string, string>) => {
    if (!editTarget) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/api/statutory/${encodeURIComponent(editTarget.name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: values.employee || undefined,
          ledger_type: values.ledger_type || undefined,
          period_start: values.period_start || undefined,
          period_end: values.period_end || undefined,
          employee_contribution: Number(values.employee_contribution) || 0,
          employer_contribution: Number(values.employer_contribution) || 0,
          payment_status: values.payment_status || undefined,
          payment_date: values.payment_date || undefined,
          challan_reference: values.challan_reference || undefined,
          remarks: values.remarks || undefined,
        }),
      });
      setEditTarget(null);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update statutory ledger');
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
      await apiFetch(`/api/statutory/${encodeURIComponent(deleteTarget.name)}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete statutory ledger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Statutory Ledger"
        description="Track statutory payroll liabilities through dedicated HR statutory routes instead of the generic ops bridge."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No statutory entries"
        emptyDescription={query || ledgerTypeFilter || paymentStatusFilter ? 'No statutory ledgers match the current filters.' : 'Create the first statutory ledger entry to start HR compliance tracking.'}
        onRetry={load}
        stats={registerStats}
        headerActions={(
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create Entry
          </button>
        )}
        filterBar={(
          <>
            <div className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                className="input pl-9"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search employee, type, reference…"
              />
            </div>
            <select className="input min-w-[180px]" value={ledgerTypeFilter} onChange={(event) => setLedgerTypeFilter(event.target.value)}>
              {LEDGER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select className="input min-w-[180px]" value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value)}>
              {PAYMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </>
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Employee Share</th>
                <th className="px-4 py-3">Employer Share</th>
                <th className="px-4 py-3">Payment Status</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.name} className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/hr/statutory/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.employee || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.ledger_type || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{`${formatDate(row.period_start)} - ${formatDate(row.period_end)}`}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(row.employee_contribution)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(row.employer_contribution)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${badgeClass(row.payment_status)}`}>{row.payment_status || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.challan_reference || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => setEditTarget(row)}>
                        Edit
                      </button>
                      <button className="text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => setDeleteTarget(row)}>
                        Delete
                      </button>
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
        title="Create Statutory Entry"
        description="Create a statutory HR ledger row through the dedicated statutory route."
        size="lg"
        busy={busy}
        confirmLabel="Create Entry"
        fields={BASE_FIELDS}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />

      <FormModal
        open={Boolean(editTarget)}
        title={editTarget ? `Edit ${editTarget.name}` : 'Edit Statutory Entry'}
        description="Update statutory ledger details through the dedicated statutory route."
        size="lg"
        busy={busy}
        confirmLabel="Save Changes"
        fields={editFields}
        onConfirm={handleUpdate}
        onCancel={() => setEditTarget(null)}
      />

      <ActionModal
        open={Boolean(deleteTarget)}
        title={deleteTarget ? `Delete ${deleteTarget.name}` : 'Delete Statutory Entry'}
        description="This removes the statutory ledger row from HR compliance tracking."
        variant="danger"
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        {deleteTarget && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Delete statutory ledger <strong>{deleteTarget.name}</strong>?
          </div>
        )}
      </ActionModal>
    </>
  );
}
