'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Banknote, CheckCircle2, Clock3, RefreshCw, Search } from 'lucide-react';

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
};

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

export default function EmdTrackingPage() {
  const [rows, setRows] = useState<EmdTrackingRow[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

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
            Har lost tender ka EMD refund status aur expected refund timeline yahan dikhega.
          </p>
        </div>
        <button
          onClick={() => void fetchRows()}
          className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-main)] hover:border-[var(--accent)]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Lost Tenders</div>
          <div className="mt-2 text-3xl font-bold text-[var(--text-main)]">{summary.total_lost_tenders}</div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">All lost tenders are included</div>
        </div>
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">EMD Applicable</div>
          <div className="mt-2 text-3xl font-bold text-[var(--text-main)]">{summary.emd_required_count}</div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">Lost tenders with EMD requirement</div>
        </div>
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Pending Refund</div>
          <div className="mt-2 flex items-center gap-2 text-3xl font-bold text-amber-700">
            <Clock3 className="h-6 w-6" />
            {summary.pending_refund_count}
          </div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">Pending, submitted, expired, or not initiated</div>
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
        <table className="w-full min-w-[1220px] text-sm">
          <thead className="bg-[var(--surface)]">
            <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--text-soft)]">
              <th className="px-4 py-3">Tender</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Lost On</th>
              <th className="px-4 py-3">EMD Amount</th>
              <th className="px-4 py-3">Refund Status</th>
              <th className="px-4 py-3">Expected Refund By</th>
              <th className="px-4 py-3">Instrument</th>
              <th className="px-4 py-3">Bank</th>
              <th className="px-4 py-3">Notes</th>
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
                  <td className="px-4 py-4 align-top">
                    <Link href={`/pre-sales/${encodeURIComponent(row.tender_id)}`} className="font-semibold text-[var(--accent)] hover:underline">
                      {row.tender_number}
                    </Link>
                    <div className="mt-1 max-w-[280px] text-xs text-[var(--text-main)]">{row.title || '-'}</div>
                    <div className="mt-1 text-[11px] text-[var(--text-soft)]">Submitted: {formatDate(row.submission_date)}</div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="font-medium text-[var(--text-main)]">{row.client || '-'}</div>
                    <div className="mt-1 text-xs text-[var(--text-soft)]">{row.organization || '-'}</div>
                  </td>
                  <td className="px-4 py-4 align-top">{formatDate(row.lost_date)}</td>
                  <td className="px-4 py-4 align-top">
                    {row.emd_required ? formatCurrency(row.emd_amount) : 'Not Required'}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(row.refund_status)}`}>
                      {row.refund_status}
                    </span>
                    {!row.has_instrument && row.emd_required ? (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                        EMD record not created yet
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {row.refund_status === 'Not Required' ? '-' : formatDate(row.expected_refund_date)}
                    {row.expiry_date ? (
                      <div className="mt-1 text-[11px] text-[var(--text-soft)]">Instrument expiry: {formatDate(row.expiry_date)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div>
                      {row.instrument_name
                        ? <Link href={`/pre-sales/emd-tracking/${encodeURIComponent(row.instrument_name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{row.instrument_number || row.instrument_name}</Link>
                        : <div className="font-medium text-[var(--text-main)]">{row.instrument_number || '-'}</div>
                      }
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-soft)]">Issued: {formatDate(row.issue_date)}</div>
                  </td>
                  <td className="px-4 py-4 align-top">{row.bank_name || '-'}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="max-w-[240px] text-xs text-[var(--text-soft)]">
                      {row.remarks || (row.emd_required ? 'Follow-up required if refund is still pending.' : 'EMD was not applicable on this tender.')}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
