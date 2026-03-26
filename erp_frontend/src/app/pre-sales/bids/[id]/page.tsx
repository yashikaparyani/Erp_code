'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, BadgeCheck, FileStack, RefreshCw, Timer, Trophy, XCircle } from 'lucide-react';
import { useRole } from '../../../../context/RoleContext';
import ActionModal from '@/components/ui/ActionModal';

type LoiRow = {
  name: string;
  department?: string;
  loi_expected_by?: string;
  loi_received?: number;
  loi_received_date?: string;
  remarks?: string;
};

type BidDetail = {
  name: string;
  tender: string;
  bid_date?: string;
  bid_amount?: number;
  status?: string;
  result_date?: string;
  result_remarks?: string;
  cancel_reason?: string;
  retender_reason?: string;
  loi_decision_status?: string;
  loi_decision_reason?: string;
  loi_decision_by?: string;
  loi_decision_on?: string;
  loc_request_status?: string;
  loc_requested_on?: string;
  loc_requested_by?: string;
  loc_submitted_on?: string;
  loc_submitted_by?: string;
  loc_submission_remarks?: string;
  loi_tracker?: LoiRow[];
  loi_n_expected?: number;
  loi_n_received?: number;
  tender_detail?: {
    name?: string;
    tender_number?: string;
    title?: string;
    status?: string;
    client?: string;
    organization?: string;
    tenure_years?: number;
    tenure_end_date?: string;
    closure_letter_received?: number;
    presales_closure_date?: string;
    bid_denied_reason?: string;
  };
};

const STATUS_STYLES: Record<string, string> = {
  UNDER_EVALUATION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  WON: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOST: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCEL: 'bg-slate-100 text-slate-700 border-slate-200',
  RETENDER: 'bg-pink-50 text-pink-700 border-pink-200',
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAmount = (value?: number) => {
  if (!value) return '—';
  if (value >= 1e7) return `Rs ${(value / 1e7).toFixed(1)} Cr`;
  if (value >= 1e5) return `Rs ${(value / 1e5).toFixed(1)} L`;
  return `Rs ${value.toLocaleString('en-IN')}`;
};

const getDaysLeft = (dateText?: string) => {
  if (!dateText) return null;
  const target = new Date(dateText);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

async function postJson(url: string, body?: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return response.json();
}

export default function BidWorkspacePage() {
  const params = useParams<{ id: string }>();
  const { currentRole } = useRole();
  const bidId = params?.id;
  const [bid, setBid] = useState<BidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [bidModal, setBidModal] = useState<{ action: string; title: string; fields: { name: string; label: string; type: 'text' | 'textarea'; defaultValue?: string }[]; runner: (values: Record<string, string>) => Promise<void> } | null>(null);

  const loadBid = async () => {
    if (!bidId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/bids/${bidId}`, { cache: 'no-store' });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to load bid');
      }
      setBid(json.data || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load bid');
      setBid(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBid();
  }, [bidId]);

  const loiSummary = useMemo(() => {
    const expected = bid?.loi_n_expected || 0;
    const received = bid?.loi_n_received || 0;
    return {
      expected,
      received,
      allReceived: expected > 0 && received === expected,
    };
  }, [bid]);

  const inProcess = bid?.status === 'WON' && bid?.loi_decision_status === 'ACCEPTED';
  const daysLeft = getDaysLeft(bid?.tender_detail?.tenure_end_date);
  const canDecideLoi = currentRole === 'Presales Tendering Head' && bid?.status === 'WON' && loiSummary.allReceived && bid?.loi_decision_status !== 'ACCEPTED';
  const isLegacyBid = bid?.status === 'DRAFT' || bid?.status === 'SUBMITTED';
  const locRequestStatus = bid?.loc_request_status || 'NOT_REQUESTED';
  const canSendLocRequest =
    currentRole === 'Presales Tendering Head'
    && inProcess
    && daysLeft !== null
    && daysLeft <= 90
    && locRequestStatus === 'NOT_REQUESTED';

  const runAction = async (actionKey: string, runner: () => Promise<void>) => {
    setBusyAction(actionKey);
    setError('');
    try {
      await runner();
      await loadBid();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action failed');
    } finally {
      setBusyAction('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-6">
        <div className="h-40 rounded-3xl bg-white border border-[var(--border-subtle)] animate-pulse" />
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-6 space-y-4">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          {error || 'Bid not found.'}
        </div>
        <Link href="/pre-sales/bids" className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to bids
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-2">
          <Link href="/pre-sales/bids" className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to bids
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[var(--text-main)]">{bid.name}</h1>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[bid.status || ''] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {bid.status}
              </span>
              {inProcess ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  In Process
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              Tender {bid.tender_detail?.tender_number || bid.tender} {bid.tender_detail?.title ? `· ${bid.tender_detail.title}` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => void loadBid()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-[var(--border-subtle)] hover:border-[var(--accent)]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busyAction ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">Bid Snapshot</div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[var(--text-soft)]">Bid Date</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">{formatDate(bid.bid_date)}</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">Bid Amount</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">{formatAmount(bid.bid_amount)}</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">Result Date</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">{formatDate(bid.result_date)}</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">LOI Decision</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">{bid.loi_decision_status || 'PENDING'}</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">LOC Status</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">{locRequestStatus}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">Tender Context</div>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="text-[var(--text-soft)]">Client</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">{bid.tender_detail?.client || '—'}</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">Organization</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">{bid.tender_detail?.organization || '—'}</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">Tender Status</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">{bid.tender_detail?.status || '—'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
            <Timer className="w-4 h-4" />
            In Process Tracking
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="text-[var(--text-soft)]">Tenure</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">{bid.tender_detail?.tenure_years || 0} years</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">Tenure End Date</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">{formatDate(bid.tender_detail?.tenure_end_date)}</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">Countdown</div>
              <div className="mt-1 font-semibold text-[var(--text-main)]">
                {daysLeft === null ? 'Not available' : `${daysLeft} days left`}
              </div>
            </div>
            {inProcess && daysLeft !== null && daysLeft <= 90 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-700">
                Project completion certificate window is active for this bid.
              </div>
            ) : null}
            {locRequestStatus === 'REQUESTED' ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-700">
                LOC request was sent on {formatDate(bid.loc_requested_on)}. Waiting for Project Head submission.
              </div>
            ) : null}
            {locRequestStatus === 'SUBMITTED' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
                Project Head submitted LOC on {formatDate(bid.loc_submitted_on)}.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border-subtle)] bg-white p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">Bid Actions</h2>
            <p className="text-sm text-[var(--text-soft)]">Manage outcomes, final decisions, and restart actions from this workspace.</p>
          </div>
          <div className="text-sm text-[var(--text-soft)]">
            LOIs received: <span className="font-semibold text-[var(--text-main)]">{loiSummary.received}/{loiSummary.expected}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isLegacyBid ? (
            <button
              disabled={busyAction === 'under-evaluation'}
              onClick={() => void runAction('under-evaluation', async () => {
                const json = await postJson(`/api/bids/${bid.name}/under-evaluation`);
                if (!json.success) throw new Error(json.message || 'Failed to move bid under evaluation');
              })}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <RefreshCw className="w-4 h-4" /> Move to Under Evaluation
            </button>
          ) : null}

          {bid.status === 'UNDER_EVALUATION' ? (
            <>
              <button
                disabled={busyAction === 'won'}
                onClick={() => setBidModal({
                  action: 'won',
                  title: 'Mark Bid Won',
                  fields: [
                    { name: 'result_date', label: 'Result Date (YYYY-MM-DD)', type: 'text', defaultValue: new Date().toISOString().slice(0, 10) },
                    { name: 'remarks', label: 'Winning Remarks', type: 'textarea' },
                  ],
                  runner: async (values) => {
                    const json = await postJson(`/api/bids/${bid.name}/won`, { result_date: values.result_date, remarks: values.remarks || '' });
                    if (!json.success) throw new Error(json.message || 'Failed to mark bid won');
                  },
                })}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Trophy className="w-4 h-4" /> Mark Won
              </button>
              <button
                disabled={busyAction === 'lost'}
                onClick={() => setBidModal({
                  action: 'lost',
                  title: 'Mark Bid Lost',
                  fields: [
                    { name: 'result_date', label: 'Result Date (YYYY-MM-DD)', type: 'text', defaultValue: new Date().toISOString().slice(0, 10) },
                    { name: 'remarks', label: 'Lost Reason', type: 'textarea' },
                  ],
                  runner: async (values) => {
                    if (!values.remarks?.trim()) throw new Error('Reason is required');
                    const json = await postJson(`/api/bids/${bid.name}/lost`, { result_date: values.result_date, remarks: values.remarks });
                    if (!json.success) throw new Error(json.message || 'Failed to mark bid lost');
                  },
                })}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                <XCircle className="w-4 h-4" /> Mark Lost
              </button>
              <button
                disabled={busyAction === 'cancel'}
                onClick={() => setBidModal({
                  action: 'cancel',
                  title: 'Cancel Bid',
                  fields: [{ name: 'reason', label: 'Cancel Reason', type: 'textarea' }],
                  runner: async (values) => {
                    if (!values.reason?.trim()) throw new Error('Reason is required');
                    const json = await postJson(`/api/bids/${bid.name}/cancel`, { reason: values.reason });
                    if (!json.success) throw new Error(json.message || 'Failed to cancel bid');
                  },
                })}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:opacity-60"
              >
                <AlertTriangle className="w-4 h-4" /> Cancel Bid
              </button>
              <button
                disabled={busyAction === 'retender'}
                onClick={() => setBidModal({
                  action: 'retender',
                  title: 'Retender Bid',
                  fields: [{ name: 'reason', label: 'Retender Reason', type: 'textarea' }],
                  runner: async (values) => {
                    if (!values.reason?.trim()) throw new Error('Reason is required');
                    const json = await postJson(`/api/bids/${bid.name}/retender`, { reason: values.reason });
                    if (!json.success) throw new Error(json.message || 'Failed to retender bid');
                  },
                })}
                className="inline-flex items-center gap-2 rounded-xl border border-pink-300 bg-pink-50 px-3 py-2 text-sm font-medium text-pink-700 hover:border-pink-400 disabled:opacity-60"
              >
                <RefreshCw className="w-4 h-4" /> Retender
              </button>
            </>
          ) : null}

          {canDecideLoi ? (
            <>
              <button
                disabled={busyAction === 'accept'}
                onClick={() => void runAction('accept', async () => {
                  const json = await postJson(`/api/bids/${bid.name}/loi-decision`, { decision: 'ACCEPT' });
                  if (!json.success) throw new Error(json.message || 'Failed to accept won bid');
                })}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <BadgeCheck className="w-4 h-4" /> Accept to In Process Bid
              </button>
              <button
                disabled={busyAction === 'reject'}
                onClick={() => setBidModal({
                  action: 'reject',
                  title: 'Reject LOI',
                  fields: [{ name: 'reason', label: 'LOI Rejection Reason', type: 'textarea' }],
                  runner: async (values) => {
                    if (!values.reason?.trim()) throw new Error('Reason is required');
                    const json = await postJson(`/api/bids/${bid.name}/loi-decision`, { decision: 'REJECT', reason: values.reason });
                    if (!json.success) throw new Error(json.message || 'Failed to reject won bid');
                  },
                })}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <XCircle className="w-4 h-4" /> Reject to Cancel Bid
              </button>
            </>
          ) : null}

          {canSendLocRequest ? (
            <button
              disabled={busyAction === 'loc-request'}
              onClick={() => void runAction('loc-request', async () => {
                const json = await postJson(`/api/bids/${bid.name}/loc-request`);
                if (!json.success) throw new Error(json.message || 'Failed to send LOC request');
              })}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              <BadgeCheck className="w-4 h-4" /> Send Request to Project Head for LOC
            </button>
          ) : null}

          <Link
            href={`/pre-sales/${bid.tender}`}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-main)] hover:border-[var(--accent)]"
          >
            <FileStack className="w-4 h-4" /> Open Tender Workspace
          </Link>
        </div>

        {bid.cancel_reason || bid.retender_reason || bid.loi_decision_reason || bid.loc_submission_remarks ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-sm">
            <div className="font-semibold text-[var(--text-main)]">Recorded Reason</div>
            <div className="mt-2 text-[var(--text-soft)]">
              {bid.cancel_reason || bid.retender_reason || bid.loi_decision_reason || bid.loc_submission_remarks}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-[var(--border-subtle)] bg-white p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">Department LOIs</h2>
            <p className="text-sm text-[var(--text-soft)]">All department LOIs must be received before the final won-bid decision.</p>
          </div>
          <div className="text-sm text-[var(--text-soft)]">
            {loiSummary.allReceived ? 'All LOIs received' : 'LOIs pending'}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border-subtle)] text-left text-[var(--text-soft)]">
              <tr>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">Expected By</th>
                <th className="px-3 py-2 font-medium">Received</th>
                <th className="px-3 py-2 font-medium">Received Date</th>
                <th className="px-3 py-2 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(bid.loi_tracker || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[var(--text-soft)]">
                    No LOI rows are available for this bid yet.
                  </td>
                </tr>
              ) : (
                (bid.loi_tracker || []).map((row) => (
                  <tr key={row.name} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <td className="px-3 py-3 font-medium text-[var(--text-main)]">{row.department || '—'}</td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{formatDate(row.loi_expected_by)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.loi_received ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {row.loi_received ? 'Received' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{formatDate(row.loi_received_date)}</td>
                    <td className="px-3 py-3 text-[var(--text-soft)]">{row.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ActionModal
        open={bidModal !== null}
        title={bidModal?.title || ''}
        confirmLabel="Confirm"
        variant={bidModal?.action === 'lost' || bidModal?.action === 'cancel' || bidModal?.action === 'reject' ? 'danger' : 'default'}
        fields={bidModal?.fields || []}
        onCancel={() => setBidModal(null)}
        onConfirm={async (values) => {
          if (bidModal) {
            await runAction(bidModal.action, () => bidModal.runner(values));
          }
          setBidModal(null);
        }}
      />
    </div>
  );
}
