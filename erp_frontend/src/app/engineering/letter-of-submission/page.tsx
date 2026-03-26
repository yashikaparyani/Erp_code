'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, ScrollText } from 'lucide-react';
import { useRole } from '../../../context/RoleContext';
import ActionModal from '@/components/ui/ActionModal';

type SubmissionRow = {
  bid_id: string;
  tender_id: string;
  tender_number: string;
  tender_title?: string;
  client?: string;
  organization?: string;
  tenure_years?: number;
  tenure_end_date?: string;
  loc_request_status?: string;
  loc_requested_on?: string;
  loc_requested_by?: string;
  loc_submitted_on?: string;
  loc_submitted_by?: string;
  loc_submission_remarks?: string;
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

async function postJson(url: string, body?: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return response.json();
}

export default function LetterOfSubmissionPage() {
  const { currentRole } = useRole();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyBid, setBusyBid] = useState('');
  const [error, setError] = useState('');
  const [locSubmitTarget, setLocSubmitTarget] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/project-head/letter-of-submission', { cache: 'no-store' });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to fetch requests');
      }
      setRows(json.data || []);
    } catch (fetchError) {
      setRows([]);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRows();
  }, []);

  const submitLetter = async (bidId: string, submissionDate: string, remarks: string) => {
    setBusyBid(bidId);
    setError('');
    try {
      const json = await postJson(`/api/bids/${bidId}/loc-submit`, {
        submission_date: submissionDate.trim() || new Date().toISOString().slice(0, 10),
        remarks,
      });
      if (!json.success) {
        throw new Error(json.message || 'Failed to submit LOC');
      }
      await fetchRows();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit LOC');
    } finally {
      setBusyBid('');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-[var(--accent)]" />
            Letter of Submission
          </h1>
          <p className="text-xs text-[var(--text-soft)] mt-0.5">
            Project Head submission desk for LOC requests raised from in-process bids
          </p>
        </div>
        <button
          onClick={() => void fetchRows()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {currentRole !== 'Project Head' && currentRole !== 'Director' ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          This workspace is intended for Project Head submissions.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-[var(--surface)]">
            <tr className="border-b border-[var(--border-subtle)]">
              {['#', 'Bid', 'Tender', 'Tenure End', 'Request Status', 'Requested On', 'Submission', 'Actions'].map((heading) => (
                <th key={heading} className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={8} className="px-3 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-[var(--text-soft)]">
                  No LOC submission requests are available
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.bid_id} className="hover:bg-[var(--surface-hover)] group">
                  <td className="px-3 py-3 text-[var(--text-soft)]">{index + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-mono font-semibold text-[var(--text-main)]">{row.bid_id}</div>
                    <div className="mt-1 text-[11px] text-[var(--text-soft)]">{row.client || '-'}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-[var(--text-main)]">{row.tender_number}</div>
                    <div className="mt-1 text-[11px] text-[var(--text-soft)]">{row.tender_title || '-'}</div>
                  </td>
                  <td className="px-3 py-3">{formatDate(row.tenure_end_date)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${row.loc_request_status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {row.loc_request_status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[var(--text-soft)]">{formatDate(row.loc_requested_on)}</td>
                  <td className="px-3 py-3 text-[var(--text-soft)]">
                    {row.loc_submitted_on ? `${formatDate(row.loc_submitted_on)} by ${row.loc_submitted_by || '-'}` : row.loc_submission_remarks || '-'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {row.loc_request_status === 'REQUESTED' ? (
                        <button
                          onClick={() => setLocSubmitTarget(row.bid_id)}
                          disabled={busyBid === row.bid_id}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[10px] font-medium text-white disabled:opacity-60"
                        >
                          Submit LOC
                        </button>
                      ) : null}
                      {currentRole === 'Director' || currentRole === 'Presales Tendering Head' ? (
                        <Link
                          href={`/pre-sales/bids/${row.bid_id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border border-[var(--border-subtle)] opacity-0 group-hover:opacity-100 transition-all hover:border-[var(--accent)]"
                        >
                          Open Bid <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ActionModal
        open={locSubmitTarget !== null}
        title="Submit LOC"
        description={`Submit Letter of Completion for bid ${locSubmitTarget}`}
        confirmLabel="Submit LOC"
        variant="default"
        fields={[
          { name: 'submission_date', label: 'Submission Date (YYYY-MM-DD)', type: 'text', defaultValue: new Date().toISOString().slice(0, 10) },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ]}
        onCancel={() => setLocSubmitTarget(null)}
        onConfirm={async (values) => {
          if (locSubmitTarget) await submitLetter(locSubmitTarget, values.submission_date || '', values.remarks || '');
          setLocSubmitTarget(null);
        }}
      />
    </div>
  );
}
