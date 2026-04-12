'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import ActionModal from '@/components/ui/ActionModal';

type LoiRow = {
  name: string;
  bid: string;
  bid_status?: string;
  bid_date?: string;
  bid_amount?: number;
  tender: string;
  tender_number?: string;
  tender_title?: string;
  client?: string;
  organization?: string;
  department?: string;
  loi_expected_by?: string;
  loi_received: number;
  loi_received_date?: string;
  loi_document?: string;
  remarks?: string;
};

function fmtDate(v?: string) {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? (v || '-') : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(v?: number) {
  if (!v) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

export default function DepartmentLoiPage() {
  const [rows, setRows] = useState<LoiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [submitTarget, setSubmitTarget] = useState<LoiRow | null>(null);
  const [busy, setBusy] = useState('');

  const fetchRows = async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await fetch(`/api/department-loi${params}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to fetch LOI requests');
      setRows(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch LOI requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchRows(); }, [statusFilter]);

  const submitLoi = async (values: Record<string, string>) => {
    if (!submitTarget) return;
    setBusy(submitTarget.name);
    setError('');
    try {
      const res = await fetch(`/api/department-loi/${encodeURIComponent(submitTarget.name)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loi_received_date: values.loi_received_date || new Date().toISOString().slice(0, 10),
          loi_document: values.loi_document || '',
          remarks: values.remarks || '',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to submit LOI');
      await fetchRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit LOI');
    } finally {
      setBusy('');
      setSubmitTarget(null);
    }
  };

  const pending = rows.filter((r) => !r.loi_received);

  return (
    <>
      <RegisterPage
        title="Letter of Intent — Submission Desk"
        description="Engineering department LOI submission to pre-sales head. Mark your department's LOI as received once the client letter is in hand."
        loading={loading}
        error={error}
        empty={!loading && rows.length === 0}
        emptyTitle="No LOI requests"
        emptyDescription="No Letter of Intent requests have been sent to Engineering yet."
        onRetry={fetchRows}
        filterBar={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-strong)]"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>
        }
      >
        {pending.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <strong>{pending.length} pending</strong> LOI request{pending.length > 1 ? 's' : ''} — submit your department&apos;s letter to unblock the bid acceptance decision.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Bid / Tender</th>
                <th>Client</th>
                <th>Expected By</th>
                <th>Bid Amount</th>
                <th>Status</th>
                <th>Received On</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.name}>
                  <td className="text-sm text-gray-500">{idx + 1}</td>
                  <td>
                    <div className="font-mono font-semibold text-sm text-gray-900">{row.bid}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{row.tender_number || row.tender}</div>
                    {row.tender_title && <div className="text-xs text-gray-400 truncate max-w-[200px]">{row.tender_title}</div>}
                  </td>
                  <td>
                    <div className="text-sm text-gray-700">{row.client || '-'}</div>
                    {row.organization && <div className="text-xs text-gray-400">{row.organization}</div>}
                  </td>
                  <td className="text-sm text-gray-700">{fmtDate(row.loi_expected_by)}</td>
                  <td className="text-sm text-gray-700">{formatCurrency(row.bid_amount)}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${
                      row.loi_received
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {row.loi_received ? 'Submitted' : 'Pending'}
                    </span>
                  </td>
                  <td className="text-sm text-gray-500">{fmtDate(row.loi_received_date)}</td>
                  <td className="text-sm text-gray-500 max-w-[160px] truncate">{row.remarks || '-'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {!row.loi_received && (
                        <button
                          onClick={() => setSubmitTarget(row)}
                          disabled={busy === row.name}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Submit LOI
                        </button>
                      )}
                      <Link
                        href={`/pre-sales/bids/${row.bid}`}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <ExternalLink className="w-3 h-3" /> Bid
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      <ActionModal
        open={submitTarget !== null}
        title="Submit Letter of Intent"
        description={`Mark LOI as received for bid ${submitTarget?.bid} (${submitTarget?.tender_number || submitTarget?.tender})`}
        confirmLabel="Submit LOI"
        variant="default"
        fields={[
          { name: 'loi_received_date', label: 'Date Received (YYYY-MM-DD)', type: 'text', defaultValue: new Date().toISOString().slice(0, 10) },
          { name: 'loi_document', label: 'Document Reference (optional)', type: 'text' },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ]}
        onCancel={() => setSubmitTarget(null)}
        onConfirm={async (values) => { await submitLoi(values); }}
      />
    </>
  );
}
