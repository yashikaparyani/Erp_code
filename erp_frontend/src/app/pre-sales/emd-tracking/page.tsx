'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Banknote, CheckCircle2, Clock3, RefreshCw, Search, Plus, Trash2, Edit2, X } from 'lucide-react';

type EmdTrackingRow = {
  tender_id: string;
  tender_number: string;
  title: string;
  client: string;
  organization: string;
  submission_date: string;
  lost_date: string;
  emd_required: boolean;
  emd_amount: number;
  refund_status: string;
  expected_refund_date: string;
  instrument_number: string;
  instrument_name: string;
  bank_name: string;
  issue_date: string;
  expiry_date: string;
  remarks: string;
  has_instrument: boolean;
  bid_status?: string;
};

type EmdInstrument = {
  name?: string;
  linked_tender?: string;
  instrument_type?: string;
  instrument_number?: string;
  bank_name?: string;
  issue_date?: string;
  expiry_date?: string;
  amount?: number;
  status?: string;
  refund_status?: string;
  remarks?: string;
};

function toRefundCode(status?: string) {
  switch ((status || '').trim()) {
    case 'Not Required':
      return 'NOT_DUE';
    case 'Pending':
      return 'PENDING';
    case 'Submitted':
      return 'INITIATED';
    case 'Released':
      return 'REFUNDED';
    case 'Forfeited':
      return 'NOT_REFUNDABLE';
    default:
      return undefined;
  }
}

type Summary = {
  total_lost_tenders: number;
  emd_required_count: number;
  pending_refund_count: number;
  released_count: number;
  forfeited_count: number;
};

const EMPTY_SUMMARY: Summary = {
  total_lost_tenders: 0,
  emd_required_count: 0,
  pending_refund_count: 0,
  released_count: 0,
  forfeited_count: 0,
};

function formatDate(date?: string) {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value?: number) {
  if (!value) return '-';
  if (value >= 1e7) return `Rs ${(value / 1e7).toFixed(1)} Cr`;
  if (value >= 1e5) return `Rs ${(value / 1e5).toFixed(1)} L`;
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'Released':
      return 'bg-green-100 text-green-700';
    case 'Forfeited':
      return 'bg-red-100 text-red-700';
    case 'Bid Created':
      return 'bg-sky-100 text-sky-700';
    case 'Submitted':
      return 'bg-blue-100 text-blue-700';
    case 'Pending':
    case 'Expired':
    case 'Not Initiated':
      return 'bg-amber-100 text-amber-700';
    case 'Not Required':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed');
  return (payload.data ?? payload) as T;
}

export default function EmdTrackingPage() {
  const [rows, setRows] = useState<EmdTrackingRow[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  // EMD Instrument Form State
  const [showEmdModal, setShowEmdModal] = useState(false);
  const [emdForm, setEmdForm] = useState<EmdInstrument>({});
  const [isEditingEmd, setIsEditingEmd] = useState(false);
  const [submittingEmd, setSubmittingEmd] = useState(false);
  const [emdError, setEmdError] = useState('');

  const fetchRows = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/pre-sales/emd-tracking', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to fetch EMD tracking');
      }
      setRows(payload.data || []);
      setSummary(payload.summary || EMPTY_SUMMARY);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch EMD tracking');
      setRows([]);
      setSummary(EMPTY_SUMMARY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRows();
  }, []);

  const handleCreateEmdClick = () => {
    setIsEditingEmd(false);
    setEmdForm({});
    setEmdError('');
    setShowEmdModal(true);
  };

  const handleEditEmdClick = (instrument: EmdInstrument) => {
    setIsEditingEmd(true);
    setEmdForm({ ...instrument });
    setEmdError('');
    setShowEmdModal(true);
  };

  const handleSaveEmd = async () => {
    if (!emdForm.linked_tender?.trim()) {
      setEmdError('Linked tender is required');
      return;
    }
    if (!emdForm.instrument_number?.trim()) {
      setEmdError('Instrument number is required');
      return;
    }

    setSubmittingEmd(true);
    setEmdError('');

    try {
      const payload = {
        ...emdForm,
        refund_status: toRefundCode(emdForm.refund_status),
      };
      if (isEditingEmd && emdForm.name) {
        await callOps('update_emd_pbg_instrument', { name: emdForm.name, ...payload });
      } else {
        await callOps('create_emd_pbg_instrument', payload);
      }
      setShowEmdModal(false);
      await fetchRows();
    } catch (err) {
      setEmdError(err instanceof Error ? err.message : 'Failed to save instrument');
    } finally {
      setSubmittingEmd(false);
    }
  };

  const handleDeleteEmd = async (name: string) => {
    if (!confirm('Delete this EMD instrument?')) return;
    try {
      await callOps('delete_emd_pbg_instrument', { name });
      await fetchRows();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((row) =>
      [row.tender_number, row.title, row.client, row.organization, row.refund_status, row.instrument_number]
        .some((value) => value?.toLowerCase().includes(search)),
    );
  }, [query, rows]);

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Banknote className="w-6 h-6 text-[var(--accent)]" />
            EMD Tracking
          </h1>
          <p className="mt-1 text-sm text-[var(--text-soft)]">
            Track EMD coverage, bid-linked auto rows, refund status, and expected refund timelines.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreateEmdClick}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create EMD
          </button>
          <button
            onClick={() => void fetchRows()}
            className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-main)] hover:border-[var(--accent)]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Tracked Tenders</div>
          <div className="mt-2 text-3xl font-bold text-[var(--text-main)]">{summary.total_lost_tenders}</div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">Lost, won, and active bid-linked EMD rows</div>
        </div>
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">EMD Applicable</div>
          <div className="mt-2 text-3xl font-bold text-[var(--text-main)]">{summary.emd_required_count}</div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">Lost tenders with EMD requirement</div>
        </div>
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Pending Tracking</div>
          <div className="mt-2 flex items-center gap-2 text-3xl font-bold text-amber-700">
            <Clock3 className="h-6 w-6" />
            {summary.pending_refund_count}
          </div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">Includes auto-tracked bid-linked rows</div>
        </div>
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Released Refunds</div>
          <div className="mt-2 flex items-center gap-2 text-3xl font-bold text-green-700">
            <CheckCircle2 className="h-6 w-6" />
            {summary.released_count}
          </div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">Forfeited: {summary.forfeited_count}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tender, client, status, instrument"
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-[var(--border-subtle)] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)]">
            <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--text-soft)]">
              <th className="px-4 py-3">Tender</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Bid / Result Date</th>
              <th className="px-4 py-3">EMD Amount</th>
              <th className="px-4 py-3">Refund Status</th>
              <th className="px-4 py-3">Expected Refund By</th>
              <th className="px-4 py-3">Instrument</th>
              <th className="px-4 py-3">Bank</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={9} className="px-4 py-4">
                    <div className="h-4 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-[var(--text-soft)]">
                  No lost tenders matched the current search.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.tender_id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-4 align-top whitespace-normal">
                    <Link href={`/pre-sales/${encodeURIComponent(row.tender_id)}`} className="font-semibold text-[var(--accent)] hover:underline">
                      {row.tender_number}
                    </Link>
                    <div className="mt-1 max-w-[280px] text-xs text-[var(--text-main)] break-words">{row.title || '-'}</div>
                    <div className="mt-1 text-[11px] text-[var(--text-soft)]">Submitted: {formatDate(row.submission_date)}</div>
                  </td>
                  <td className="px-4 py-4 align-top whitespace-normal">
                    <div className="font-medium text-[var(--text-main)]">{row.client || '-'}</div>
                    <div className="mt-1 text-xs text-[var(--text-soft)]">{row.organization || '-'}</div>
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    {formatDate(row.lost_date)}
                    {row.bid_status ? <div className="mt-1 text-[11px] text-[var(--text-soft)]">Bid status: {row.bid_status.replace(/_/g, ' ')}</div> : null}
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    {row.emd_required ? formatCurrency(row.emd_amount) : 'Not Required'}
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(row.refund_status)}`}>
                      {row.refund_status}
                    </span>
                    {row.refund_status === 'Bid Created' ? (
                      <div className="mt-2 text-[11px] text-sky-700">Auto-tracked from bid creation</div>
                    ) : null}
                    {!row.has_instrument && row.emd_required ? (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                        EMD record not created yet
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    {row.refund_status === 'Not Required' ? '-' : formatDate(row.expected_refund_date)}
                    {row.expiry_date ? (
                      <div className="mt-1 text-[11px] text-[var(--text-soft)]">Instrument expiry: {formatDate(row.expiry_date)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top whitespace-normal">
                    <div>
                      {row.instrument_name
                        ? <Link href={`/pre-sales/emd-tracking/${encodeURIComponent(row.instrument_name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{row.instrument_number || row.instrument_name}</Link>
                        : <div className="font-medium text-[var(--text-main)]">{row.instrument_number || '-'}</div>
                      }
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-soft)]">Issued: {formatDate(row.issue_date)}</div>
                  </td>
                  <td className="px-4 py-4 align-top whitespace-normal">{row.bank_name || '-'}</td>
                  <td className="px-4 py-4 align-top whitespace-normal">
                    <div className="max-w-[240px] text-xs text-[var(--text-soft)] break-words">
                      {row.remarks || (row.emd_required ? 'Follow-up required if refund is still pending.' : 'EMD was not applicable on this tender.')}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditEmdClick({ name: row.instrument_name, linked_tender: row.tender_id, instrument_number: row.instrument_number, bank_name: row.bank_name, issue_date: row.issue_date, expiry_date: row.expiry_date, refund_status: row.refund_status })}
                        className="rounded-lg p-1.5 hover:bg-blue-50 text-blue-600"
                        title="Edit EMD"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmd(row.instrument_name)}
                        className="rounded-lg p-1.5 hover:bg-red-50 text-red-600"
                        title="Delete EMD"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* EMD Instrument Modal */}
      {showEmdModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-white shadow-xl">
            <div className="shrink-0 border-b border-slate-100 px-6 py-5">
              <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                {isEditingEmd ? 'Edit EMD Instrument' : 'Create EMD Instrument'}
              </h2>
              <button
                onClick={() => setShowEmdModal(false)}
                className="rounded-lg p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            </div>

            {emdError ? (
              <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {emdError}
              </div>
            ) : null}

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Linked Tender *
                </label>
                <input
                  type="text"
                  value={emdForm.linked_tender || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, linked_tender: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="e.g., TND-0001"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Instrument Number *
                </label>
                <input
                  type="text"
                  value={emdForm.instrument_number || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, instrument_number: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="e.g., BG-2024-001"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Instrument Type
                </label>
                <select
                  value={emdForm.instrument_type || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, instrument_type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Select type</option>
                  <option value="EMD">EMD (Earnest Money Deposit)</option>
                  <option value="PBG">PBG (Performance Bank Guarantee)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={emdForm.bank_name || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, bank_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="e.g., HDFC Bank"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={emdForm.issue_date || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, issue_date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={emdForm.expiry_date || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, expiry_date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Amount
                </label>
                <input
                  type="number"
                  value={emdForm.amount || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, amount: parseInt(e.target.value) || undefined })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="In INR"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Status
                </label>
                <select
                  value={emdForm.status || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Select status</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Pending">Pending</option>
                  <option value="Released">Released</option>
                  <option value="Forfeited">Forfeited</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Refund Status
                </label>
                <select
                  value={emdForm.refund_status || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, refund_status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Select refund status</option>
                  <option value="Not Initiated">Not Initiated</option>
                  <option value="Pending">Pending</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Released">Released</option>
                  <option value="Forfeited">Forfeited</option>
                  <option value="Not Required">Not Required</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                  Remarks
                </label>
                <textarea
                  value={emdForm.remarks || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, remarks: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="Additional notes"
                  rows={2}
                />
              </div>
            </div>

            <div className="shrink-0 flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setShowEmdModal(false)}
                className="flex-1 rounded-lg border border-[var(--border-subtle)] py-2 text-sm font-medium text-[var(--text-main)] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmd}
                disabled={submittingEmd}
                className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {submittingEmd ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
