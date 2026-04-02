'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useRole } from '../../../context/RoleContext';
import RegisterPage from '@/components/shells/RegisterPage';
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

function fmtDate(v?: string) {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? (v || '-') : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LetterOfCompletionPage() {
  const { currentRole } = useRole();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyBid, setBusyBid] = useState('');
  const [locSubmitTarget, setLocSubmitTarget] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/project-head/letter-of-submission', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to fetch requests');
      setRows(json.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to fetch requests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchRows(); }, []);

  const submitLetter = async (bidId: string, submissionDate: string, remarks: string) => {
    setBusyBid(bidId);
    setError('');
    try {
      const json = await fetch(`/api/bids/${bidId}/loc-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_date: submissionDate.trim() || new Date().toISOString().slice(0, 10), remarks }),
      }).then(r => r.json());
      if (!json.success) throw new Error(json.message || 'Failed to submit LOC');
      await fetchRows();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to submit LOC'); }
    finally { setBusyBid(''); }
  };

  const canAct = currentRole === 'Project Head' || currentRole === 'Director';
  const canViewBid = currentRole === 'Director' || currentRole === 'Presales Tendering Head';

  return (
    <>
      <RegisterPage
        title="Letter of Completion"
        description="Project Head completion desk — LOC requests raised when a tender phase nears completion"
        loading={loading}
        error={error}
        empty={!loading && rows.length === 0}
        emptyTitle="No LOC requests"
        emptyDescription="No Letter of Completion requests are available"
        onRetry={fetchRows}
      >
        {!canAct && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            This workspace is intended for Project Head completion handling.
          </div>
        )}

        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Depending on tender terms, Letter of Completion can apply at I&amp;C, O&amp;M, or both phases.
          This desk handles the Project Head request and submission cycle once the applicable scope is nearing completion.
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Bid</th>
                <th>Tender</th>
                <th>Tenure End</th>
                <th>Request Status</th>
                <th>Requested On</th>
                <th>Submission</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.bid_id}>
                  <td className="text-gray-500 text-sm">{idx + 1}</td>
                  <td>
                    <div className="font-mono font-semibold text-sm text-gray-900">{row.bid_id}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{row.client || '-'}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-sm text-gray-900">{row.tender_number}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{row.tender_title || '-'}</div>
                  </td>
                  <td className="text-sm text-gray-700">{fmtDate(row.tenure_end_date)}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${
                      row.loc_request_status === 'SUBMITTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>{row.loc_request_status}</span>
                  </td>
                  <td className="text-sm text-gray-500">{fmtDate(row.loc_requested_on)}</td>
                  <td className="text-sm text-gray-500">
                    {row.loc_submitted_on
                      ? `${fmtDate(row.loc_submitted_on)} by ${row.loc_submitted_by || '-'}`
                      : row.loc_submission_remarks || '-'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {row.loc_request_status === 'REQUESTED' && canAct && (
                        <button onClick={() => setLocSubmitTarget(row.bid_id)} disabled={busyBid === row.bid_id}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                          Submit LOC
                        </button>
                      )}
                      {canViewBid && (
                        <Link href={`/pre-sales/bids/${row.bid_id}`}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                          <ExternalLink className="w-3 h-3" />Open Bid
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      <ActionModal
        open={locSubmitTarget !== null}
        title="Submit Letter of Completion"
        description={`Submit Letter of Completion for bid ${locSubmitTarget}`}
        confirmLabel="Submit Completion"
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
    </>
  );
}