'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal, { type FormField } from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { apiFetch } from '@/lib/api-client';

type TravelLogRow = {
  name: string;
  employee?: string;
  travel_date?: string;
  travel_status?: string;
  from_location?: string;
  to_location?: string;
  linked_project?: string;
  linked_site?: string;
  expense_amount?: number;
};

type TravelLogStats = {
  total?: number;
  draft?: number;
  submitted?: number;
  approved?: number;
  rejected?: number;
  total_expense_amount?: number;
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

const BASE_FIELDS: FormField[] = [
  { name: 'employee', label: 'Employee', type: 'link', linkEntity: 'employee', placeholder: 'Search employee…', required: true },
  { name: 'travel_date', label: 'Travel Date', type: 'date', required: true },
  { name: 'from_location', label: 'From Location', type: 'text', placeholder: 'Origin', required: true },
  { name: 'to_location', label: 'To Location', type: 'text', placeholder: 'Destination', required: true },
  { name: 'travel_mode', label: 'Travel Mode', type: 'text', placeholder: 'Car, rail, flight…' },
  { name: 'linked_project', label: 'Linked Project', type: 'link', linkEntity: 'project', placeholder: 'Search project…' },
  { name: 'linked_site', label: 'Linked Site', type: 'link', linkEntity: 'site', placeholder: 'Search site…' },
  { name: 'distance_km', label: 'Distance (km)', type: 'number', defaultValue: '0' },
  { name: 'expense_amount', label: 'Expense Amount', type: 'number', defaultValue: '0' },
  { name: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Add travel context or notes…' },
];

const badgeClass = (status?: string) => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'APPROVED') return 'badge-green';
  if (normalized === 'SUBMITTED' || normalized === 'PENDING') return 'badge-yellow';
  if (normalized === 'REJECTED') return 'badge-red';
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

export default function HrTravelLogsPage() {
  const [rows, setRows] = useState<TravelLogRow[]>([]);
  const [stats, setStats] = useState<TravelLogStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TravelLogRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TravelLogRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TravelLogRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listPayload, statsPayload] = await Promise.all([
        apiFetch<{ success: boolean; data?: TravelLogRow[] }>('/api/travel-logs'),
        apiFetch<{ success: boolean; data?: TravelLogStats }>('/api/travel-logs/stats'),
      ]);
      setRows(Array.isArray(listPayload.data) ? listPayload.data : []);
      setStats(statsPayload.data || {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load travel logs');
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
      const rowStatus = (row.travel_status || '').toUpperCase();
      const statusMatches = !statusFilter || rowStatus === statusFilter;
      const queryMatches = !normalizedQuery || [
        row.name,
        row.employee,
        row.from_location,
        row.to_location,
        row.linked_project,
        row.linked_site,
        row.travel_status,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));
      return statusMatches && queryMatches;
    });
  }, [query, rows, statusFilter]);

  const registerStats = useMemo(() => ([
    { label: 'Total Logs', value: stats.total ?? rows.length },
    { label: 'Submitted', value: stats.submitted ?? rows.filter((row) => (row.travel_status || '').toUpperCase() === 'SUBMITTED').length, variant: 'warning' as const },
    { label: 'Approved', value: stats.approved ?? rows.filter((row) => (row.travel_status || '').toUpperCase() === 'APPROVED').length, variant: 'success' as const },
    { label: 'Expense Amount', value: formatCurrency(stats.total_expense_amount), variant: 'info' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query || statusFilter ? 'info' as const : undefined },
  ]), [filteredRows.length, query, rows, stats.approved, stats.submitted, stats.total, stats.total_expense_amount, statusFilter]);

  const createFields = BASE_FIELDS;
  const editFields = useMemo<FormField[]>(() => BASE_FIELDS.map((field) => ({
    ...field,
    defaultValue: editTarget ? String((editTarget as Record<string, unknown>)[field.name] ?? field.defaultValue ?? '') : field.defaultValue,
  })), [editTarget]);

  const handleCreate = async (values: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      await apiFetch('/api/travel-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: values.employee || undefined,
          travel_date: values.travel_date || undefined,
          from_location: values.from_location || undefined,
          to_location: values.to_location || undefined,
          travel_mode: values.travel_mode || undefined,
          linked_project: values.linked_project || undefined,
          linked_site: values.linked_site || undefined,
          distance_km: Number(values.distance_km) || 0,
          expense_amount: Number(values.expense_amount) || 0,
          remarks: values.remarks || undefined,
        }),
      });
      setShowCreate(false);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create travel log');
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
      await apiFetch(`/api/travel-logs/${encodeURIComponent(editTarget.name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: values.employee || undefined,
          travel_date: values.travel_date || undefined,
          from_location: values.from_location || undefined,
          to_location: values.to_location || undefined,
          travel_mode: values.travel_mode || undefined,
          linked_project: values.linked_project || undefined,
          linked_site: values.linked_site || undefined,
          distance_km: Number(values.distance_km) || 0,
          expense_amount: Number(values.expense_amount) || 0,
          remarks: values.remarks || undefined,
        }),
      });
      setEditTarget(null);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update travel log');
      throw updateError;
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (target: TravelLogRow, action: 'submit' | 'approve' | 'reject', extra: Record<string, string> = {}) => {
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/api/travel-logs/${encodeURIComponent(target.name)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (action === 'reject') setRejectTarget(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action} travel log`);
      throw actionError;
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/api/travel-logs/${encodeURIComponent(deleteTarget.name)}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete travel log');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Travel Log Management"
        description="Create, update, and move HR travel requests through the dedicated travel-log workflow routes."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No travel logs"
        emptyDescription={query || statusFilter ? 'No travel logs match the current filters.' : 'Create the first travel log to start the approval workflow.'}
        onRetry={load}
        stats={registerStats}
        headerActions={(
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create Travel Log
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
                placeholder="Search employee, route, project…"
              />
            </div>
            <select className="input min-w-[180px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </>
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Log</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Travel Date</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Project / Site</th>
                <th className="px-4 py-3">Expense</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const status = (row.travel_status || 'DRAFT').toUpperCase();
                const isDraft = status === 'DRAFT';
                const isSubmitted = status === 'SUBMITTED' || status === 'PENDING';
                return (
                  <tr key={row.name} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/hr/travel-logs/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.employee || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.travel_date)}</td>
                    <td className="px-4 py-3 text-slate-700">{`${row.from_location || '-'} -> ${row.to_location || '-'}`}</td>
                    <td className="px-4 py-3 text-slate-700">{`${row.linked_project || '-'} / ${row.linked_site || '-'}`}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(row.expense_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${badgeClass(status)}`}>{status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => setEditTarget(row)}>
                          Edit
                        </button>
                        {isDraft && (
                          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800" onClick={() => void handleAction(row, 'submit')}>
                            Submit
                          </button>
                        )}
                        {isSubmitted && (
                          <>
                            <button className="text-sm font-medium text-emerald-600 hover:text-emerald-800" onClick={() => void handleAction(row, 'approve')}>
                              Approve
                            </button>
                            <button className="text-sm font-medium text-amber-600 hover:text-amber-800" onClick={() => setRejectTarget(row)}>
                              Reject
                            </button>
                          </>
                        )}
                        {status !== 'APPROVED' && (
                          <button className="text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => setDeleteTarget(row)}>
                            Delete
                          </button>
                        )}
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
        title="Create Travel Log"
        description="Create a new HR travel log through the dedicated travel-log route."
        size="lg"
        busy={busy}
        confirmLabel="Create Travel Log"
        fields={createFields}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />

      <FormModal
        open={Boolean(editTarget)}
        title={editTarget ? `Edit ${editTarget.name}` : 'Edit Travel Log'}
        description="Update travel details without falling back to the generic ops bridge."
        size="lg"
        busy={busy}
        confirmLabel="Save Changes"
        fields={editFields}
        onConfirm={handleUpdate}
        onCancel={() => setEditTarget(null)}
      />

      <ActionModal
        open={Boolean(rejectTarget)}
        title={rejectTarget ? `Reject ${rejectTarget.name}` : 'Reject Travel Log'}
        description="Provide the rejection reason that will be stored on the travel-log workflow."
        variant="danger"
        confirmLabel="Reject"
        busy={busy}
        fields={[
          {
            name: 'reason',
            label: 'Rejection Reason',
            type: 'textarea',
            required: true,
            placeholder: 'Why is this travel log being rejected?',
          },
        ]}
        onConfirm={(values) => rejectTarget ? handleAction(rejectTarget, 'reject', { reason: values.reason || '' }) : Promise.resolve()}
        onCancel={() => setRejectTarget(null)}
      />

      <ActionModal
        open={Boolean(deleteTarget)}
        title={deleteTarget ? `Delete ${deleteTarget.name}` : 'Delete Travel Log'}
        description="This removes the travel log draft or non-approved record from HR tracking."
        variant="danger"
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        {deleteTarget && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Delete travel log <strong>{deleteTarget.name}</strong>?
          </div>
        )}
      </ActionModal>
    </>
  );
}
