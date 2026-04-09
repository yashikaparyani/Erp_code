'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2, XCircle, User, Calendar, IndianRupee,
  FileText, ExternalLink, Clock, Hash, Tag, Building2,
  ArrowRight, Info,
} from 'lucide-react';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import { useAuth } from '@/context/AuthContext';

interface ApprovalDetail {
  name: string;
  source_type?: string;
  source_id?: string;
  originating_module?: string;
  project?: string;
  raised_by?: string;
  raised_on?: string;
  amount?: number;
  status?: string;
  linked_record?: string;
  priority?: string;
  remarks?: string;
  supporting_docs?: { name: string; file_url?: string; file_name?: string }[];
  ph_approver?: string;
  ph_approval_date?: string;
  ph_remarks?: string;
  costing_queue_ref?: string;
  disbursement_status?: string;
  disbursed_by?: string;
  disbursed_on?: string;
}

const STATUS_STYLE: Record<string, string> = {
  'Submitted to PH': 'bg-blue-50 text-blue-700 border-blue-200',
  'Approved by PH': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Rejected by PH': 'bg-rose-50 text-rose-700 border-rose-200',
  'Forwarded to Costing': 'bg-purple-50 text-purple-700 border-purple-200',
};

function fmt(n?: number) { return n ? `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹ 0'; }
function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; }

export default function ApprovalDetailPage() {
  const params = useParams();
  const id = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();
  const canApprove = (currentUser?.roles || []).some(r => ['Project Head', 'Director', 'Department Head', 'System Manager'].includes(r));

  const [data, setData] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/approval-hub/${encodeURIComponent(id)}`).then(r => r.json());
      if (!res.success) throw new Error(res.message || 'Not found');
      setData(res.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submitAction = async () => {
    if (!actionType || !data) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/approval-hub/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, remarks }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message || 'Action failed');
      setSuccessMsg(`${actionType === 'approve' ? 'Approved' : 'Rejected'} successfully`);
      setActionType(null);
      load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const d = data;
  const st = d?.status || '';

  return (
    <>
      <DetailPage
        title={d?.source_id || id}
        kicker={d ? `${d.source_type || 'Approval'} · ${d.originating_module || ''}` : 'PH Approval'}
        backHref="/project-head/approval"
        backLabel="Back to Approval Hub"
        loading={loading}
        error={error}
        onRetry={load}
        status={st}
        statusVariant={st.includes('Approved') ? 'success' : st.includes('Rejected') ? 'error' : st.includes('Submitted') ? 'warning' : 'default'}
        headerActions={
          <>
            {d?.priority && (
              <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${d.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' : d.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                {d.priority}
              </span>
            )}
            {st === 'Submitted to PH' && canApprove && (
              <>
                <button onClick={() => { setActionType('approve'); setRemarks(''); }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />Approve
                </button>
                <button onClick={() => { setActionType('reject'); setRemarks(''); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">
                  <XCircle className="w-3.5 h-3.5" />Reject
                </button>
              </>
            )}
          </>
        }
        identityBlock={
          d ? (
            <div className="space-y-3">
              {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><IndianRupee className="w-5 h-5" /></div><div><div className="stat-value text-sm">{fmt(d.amount)}</div><div className="stat-label">Amount</div></div></div></div>
                <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Calendar className="w-5 h-5" /></div><div><div className="stat-value text-sm">{fmtDate(d.raised_on)}</div><div className="stat-label">Raised On</div></div></div></div>
                <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><Tag className="w-5 h-5" /></div><div><div className="stat-value text-sm">{d.source_type || '-'}</div><div className="stat-label">Source Type</div></div></div></div>
                <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Building2 className="w-5 h-5" /></div><div><div className="stat-value text-sm truncate">{d.project || '-'}</div><div className="stat-label">Project</div></div></div></div>
              </div>
            </div>
          ) : null
        }
        sidePanels={
          <>
            {d && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900">Request Details</h3></div>
                <div className="card-body">
                  <dl className="space-y-3 text-sm">
                    {[
                      [<Hash key="id" className="h-3.5 w-3.5" />, 'Request ID', d.source_id || d.name],
                      [<Tag key="st" className="h-3.5 w-3.5" />, 'Source Type', d.source_type],
                      [<Tag key="mod" className="h-3.5 w-3.5" />, 'Module', d.originating_module],
                      [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', d.project],
                      [<User key="rb" className="h-3.5 w-3.5" />, 'Raised By', d.raised_by],
                      [<Calendar key="ro" className="h-3.5 w-3.5" />, 'Raised On', fmtDate(d.raised_on)],
                      [<IndianRupee key="amt" className="h-3.5 w-3.5" />, 'Amount', fmt(d.amount)],
                    ].map(([icon, label, value]) => (
                      <div key={String(label)} className="flex items-center gap-2">
                        <span className="text-gray-400">{icon}</span>
                        <dt className="text-gray-500 w-28 shrink-0">{String(label)}</dt>
                        <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
                      </div>
                    ))}
                    {d.linked_record && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                        <dt className="text-gray-500 w-28 shrink-0">Source Record</dt>
                        <dd><Link href={d.linked_record} className="text-sm font-medium text-blue-700 hover:underline">Open source record</Link></dd>
                      </div>
                    )}
                    {d.remarks && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                        <dt className="text-gray-500 w-28 shrink-0">Remarks</dt>
                        <dd className="font-medium text-gray-900">{d.remarks}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            )}

            {/* PH Decision */}
            {d?.ph_approver && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900">PH Decision</h3></div>
                <div className="card-body">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-400" /><dt className="text-gray-500 w-28 shrink-0">Decided By</dt><dd className="font-medium text-gray-900">{d.ph_approver}</dd></div>
                    <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-gray-400" /><dt className="text-gray-500 w-28 shrink-0">Decision Date</dt><dd className="font-medium text-gray-900">{fmtDate(d.ph_approval_date)}</dd></div>
                    {d.ph_remarks && <div className="flex items-start gap-2"><FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5" /><dt className="text-gray-500 w-28 shrink-0">PH Remarks</dt><dd className="font-medium text-gray-900">{d.ph_remarks}</dd></div>}
                  </dl>
                </div>
              </div>
            )}

            {/* Accountability */}
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
              <div className="card-body"><AccountabilityTimeline subjectDoctype="GE PH Approval Item" subjectName={id} compact={false} initialLimit={10} /></div>
            </div>
          </>
        }
      >
        {d && (
          <div className="space-y-4">
            {/* What happens next */}
            <WhatHappensNext status={d.status} />

            {/* Costing / Finance card */}
            {d.costing_queue_ref && (
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-purple-500" />Costing / Finance</h3>
                </div>
                <div className="card-body">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <dt className="text-gray-500 w-36 shrink-0">Costing Queue Ref</dt>
                      <dd><Link href={`/finance/costing-queue/${encodeURIComponent(d.costing_queue_ref)}`} className="text-sm font-medium text-blue-700 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />{d.costing_queue_ref}</Link></dd>
                    </div>
                    {d.disbursement_status && <div className="flex items-center gap-2"><dt className="text-gray-500 w-36 shrink-0">Disbursement Status</dt><dd className="font-medium text-gray-900">{d.disbursement_status}</dd></div>}
                    {d.disbursed_by && <div className="flex items-center gap-2"><dt className="text-gray-500 w-36 shrink-0">Disbursed By</dt><dd className="font-medium text-gray-900">{d.disbursed_by}</dd></div>}
                    {d.disbursed_on && <div className="flex items-center gap-2"><dt className="text-gray-500 w-36 shrink-0">Disbursed On</dt><dd className="font-medium text-gray-900">{fmtDate(d.disbursed_on)}</dd></div>}
                  </dl>
                </div>
              </div>
            )}

            {/* Supporting docs */}
            {d.supporting_docs && d.supporting_docs.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4" />Supporting Documents</h3></div>
                <div className="card-body">
                  <ul className="space-y-2">
                    {d.supporting_docs.map(doc => (
                      <li key={doc.name}>
                        {doc.file_url
                          ? <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><FileText className="w-4 h-4" />{doc.file_name || doc.name}</a>
                          : <span className="text-sm text-gray-600">{doc.file_name || doc.name}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailPage>

      {actionType && (
        <ActionModal
          open={true}
          title={actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
          description={`${actionType === 'approve' ? 'Approve' : 'Reject'} ${d?.source_id || id} (${fmt(d?.amount)})?`}
          confirmLabel={actionType === 'approve' ? 'Approve' : 'Reject'}
          variant={actionType === 'approve' ? 'success' : 'danger'}
          busy={busy}
          onCancel={() => setActionType(null)}
          onConfirm={submitAction}
        >
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Remarks</label>
            <textarea className="input w-full text-sm" placeholder={actionType === 'reject' ? 'Reason for rejection (required)' : 'Optional remarks…'}
              rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
        </ActionModal>
      )}
    </>
  );
}

/* ── What Happens Next ──────────────────────────────────────── */

const NEXT_STEP: Record<string, { icon: React.ReactNode; heading: string; text: string }> = {
  'Submitted to PH': {
    icon: <Clock className="h-4 w-4 text-blue-600" />,
    heading: 'Awaiting your decision',
    text: 'Review the request details and supporting documents, then approve or reject. Once approved, the item is forwarded to the Costing Queue for disbursement.',
  },
  'Approved by PH': {
    icon: <ArrowRight className="h-4 w-4 text-purple-600" />,
    heading: 'Forwarded to Costing',
    text: 'This request has been approved and is now in the Costing Queue. The Finance team will review it for release, hold, or rejection.',
  },
  'Rejected by PH': {
    icon: <XCircle className="h-4 w-4 text-rose-600" />,
    heading: 'Request rejected',
    text: 'This request was rejected. The requester has been notified. No further action is needed unless a new request is submitted.',
  },
  'Forwarded to Costing': {
    icon: <ArrowRight className="h-4 w-4 text-purple-600" />,
    heading: 'In Costing Queue',
    text: 'Awaiting Finance review. The costing team will release, hold, or reject the disbursement.',
  },
  'Disbursed / Released': {
    icon: <CheckCircle2 className="h-4 w-4 text-teal-600" />,
    heading: 'Complete',
    text: 'Funds have been released. This request is fully processed.',
  },
};

function WhatHappensNext({ status }: { status?: string }) {
  const step = NEXT_STEP[status || ''];
  if (!step) return null;
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 flex items-start gap-3">
      <div className="mt-0.5">{step.icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-blue-500" /> {step.heading}</h3>
        <p className="text-sm text-gray-600 mt-0.5">{step.text}</p>
      </div>
    </div>
  );
}