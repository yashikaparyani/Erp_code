'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Loader2, Send } from 'lucide-react';
import ModalFrame from '@/components/ui/ModalFrame';

type LoiRow = {
  name: string;
  bid: string;
  bid_status?: string;
  bid_date?: string;
  bid_amount?: number;
  result_date?: string;
  tender: string;
  tender_number?: string;
  tender_title?: string;
  client?: string;
  organization?: string;
  department?: string;
  loi_expected_by?: string;
  loi_received?: number;
  loi_received_date?: string;
  loi_document?: string;
  remarks?: string;
};

function formatDate(value?: string) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function LetterOfSubmissionPage() {
  const [rows, setRows] = useState<LoiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>('pending');
  const [submitTarget, setSubmitTarget] = useState<LoiRow | null>(null);
  const [submitDate, setSubmitDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const loadRows = useCallback(async (status: 'pending' | 'submitted' = activeTab) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/department-loi?status=${status}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load LOIs');
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load LOIs');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadRows(activeTab);
  }, [activeTab, loadRows]);

  const stats = useMemo(() => ({
    total: rows.length,
    submitted: rows.filter((row) => row.loi_received).length,
    pending: rows.filter((row) => !row.loi_received).length,
  }), [rows]);

  const submitLoi = async () => {
    if (!submitTarget) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/department-loi/${encodeURIComponent(submitTarget.name)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loi_received_date: submitDate || '',
          remarks: remarks || '',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to submit LOI');
      setSubmitTarget(null);
      setSubmitDate('');
      setRemarks('');
      await loadRows(activeTab);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit LOI');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Letter of Submission
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Presales request ke baad department yahin se apna LOI submit kar sakta hai.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === 'pending' ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-700'}`}
          >
            Pending ({stats.pending})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('submitted')}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === 'submitted' ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-700'}`}
          >
            Submitted ({stats.submitted})
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Total Rows</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Pending</div>
          <div className="mt-2 text-3xl font-bold text-amber-700">{stats.pending}</div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Submitted</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">{stats.submitted}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Tender</th>
              <th className="px-4 py-3">Bid</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Expected By</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Remarks</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading LOIs...</span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  No {activeTab} LOI rows available.
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.name} className="border-t border-gray-100">
                <td className="px-4 py-4 align-top">
                  <div className="font-semibold text-gray-900">{row.tender_number || row.tender}</div>
                  <div className="mt-1 text-xs text-gray-500">{row.tender_title || '-'}</div>
                  <div className="mt-1 text-xs text-gray-500">{row.client || '-'} {row.organization ? `• ${row.organization}` : ''}</div>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="font-medium text-gray-900">{row.bid}</div>
                  <div className="mt-1 text-xs text-gray-500">{formatDate(row.bid_date)} • {formatCurrency(row.bid_amount)}</div>
                </td>
                <td className="px-4 py-4 align-top text-gray-700">{row.department || '-'}</td>
                <td className="px-4 py-4 align-top text-gray-700">{formatDate(row.loi_expected_by)}</td>
                <td className="px-4 py-4 align-top">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.loi_received ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {row.loi_received ? 'Submitted' : 'Pending'}
                  </span>
                  {row.loi_received_date ? <div className="mt-1 text-xs text-gray-500">{formatDate(row.loi_received_date)}</div> : null}
                </td>
                <td className="px-4 py-4 align-top text-gray-600">{row.remarks || '-'}</td>
                <td className="px-4 py-4 align-top">
                  {!row.loi_received ? (
                    <button
                      type="button"
                      onClick={() => { setSubmitTarget(row); setSubmitDate(''); setRemarks(row.remarks || ''); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                      Submit LOI
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalFrame
        open={Boolean(submitTarget)}
        onClose={() => { setSubmitTarget(null); setSubmitDate(''); setRemarks(''); }}
        title="Submit LOI"
      >
        {submitTarget ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <div className="font-semibold">{submitTarget.tender_number || submitTarget.tender}</div>
              <div className="mt-1">{submitTarget.tender_title || '-'}</div>
              <div className="mt-1 text-xs">Bid: {submitTarget.bid} • Department: {submitTarget.department || '-'}</div>
            </div>
            <label className="block text-sm text-gray-600">
              LOI Received Date
              <input
                type="date"
                value={submitDate}
                onChange={(event) => setSubmitDate(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm"
              />
            </label>
            <label className="block text-sm text-gray-600">
              Remarks
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm"
                placeholder="Optional submission note"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setSubmitTarget(null); setSubmitDate(''); setRemarks(''); }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitLoi()}
                disabled={busy}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        ) : null}
      </ModalFrame>
    </div>
  );
}
