'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Clock,
  User, Calendar, IndianRupee, FileText, ExternalLink,
  AlertCircle, CheckSquare,
} from 'lucide-react';
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

const STATUS_BADGE: Record<string, string> = {
  Draft: 'badge-yellow',
  'Submitted to PH': 'badge-blue',
  'Approved by PH': 'badge-green',
  'Rejected by PH': 'badge-red',
  'Forwarded to Costing': 'badge-purple',
  'Disbursed / Released': 'badge-gray',
};

function fmt(n?: number) {
  if (!n) return '₹ 0';
  return `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0">
      <span className="text-sm text-gray-500 sm:w-44 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900">{children}</span>
    </div>
  );
}

export default function ApprovalDetailPage() {
  const params = useParams();
  const id = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();
  const phRoles = new Set(['Project Head', 'Director', 'Department Head', 'System Manager']);
  const canApprove = (currentUser?.roles || []).some(r => phRoles.has(r));
  const [data, setData] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approval-hub/${encodeURIComponent(id)}`).then(r => r.json());
      if (!res.success) throw new Error(res.message || 'Not found');
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
        <Link href="/project-head/approval" className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Approval Hub
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Link href="/project-head/approval" className="mt-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                {data.source_id || data.name}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{data.source_type} · {data.originating_module}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`badge ${STATUS_BADGE[data.status || ''] || 'badge-gray'}`}>
                {data.status || '-'}
              </span>
              {data.status === 'Submitted to PH' && canApprove && (
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-success" onClick={() => { setActionType('approve'); setRemarks(''); }}>
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button className="btn btn-sm btn-error" onClick={() => { setActionType('reject'); setRemarks(''); }}>
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 flex items-center justify-between">
          {successMsg}
          <button onClick={() => setSuccessMsg('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Detail card */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Request Details</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <DetailRow label="Request ID">{data.source_id || data.name}</DetailRow>
          <DetailRow label="Source Type"><span className="capitalize">{data.source_type || '-'}</span></DetailRow>
          <DetailRow label="Module">{data.originating_module || '-'}</DetailRow>
          <DetailRow label="Project">{data.project || '-'}</DetailRow>
          <DetailRow label="Raised By">
            <span className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" />{data.raised_by || '-'}</span>
          </DetailRow>
          <DetailRow label="Raised On">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{fmtDate(data.raised_on)}</span>
          </DetailRow>
          <DetailRow label="Amount">
            <span className="flex items-center gap-1 text-blue-700 font-semibold">
              <IndianRupee className="w-3 h-3" />{fmt(data.amount)}
            </span>
          </DetailRow>
          <DetailRow label="Priority">
            {data.priority ? (
              <span className={`badge ${data.priority === 'High' ? 'badge-red' : data.priority === 'Medium' ? 'badge-yellow' : 'badge-gray'}`}>
                {data.priority}
              </span>
            ) : '-'}
          </DetailRow>
          {data.remarks && <DetailRow label="Remarks">{data.remarks}</DetailRow>}
          {data.linked_record && (
            <DetailRow label="Linked Record">
              <Link href={data.linked_record} className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                <ExternalLink className="w-3 h-3" /> Open source record
              </Link>
            </DetailRow>
          )}
        </div>
      </div>

      {/* PH decision card */}
      {(data.ph_approver || data.ph_approval_date) && (
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">PH Decision</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <DetailRow label="Decided By">
              <span className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" />{data.ph_approver || '-'}</span>
            </DetailRow>
            <DetailRow label="Decision Date">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{fmtDate(data.ph_approval_date)}</span>
            </DetailRow>
            {data.ph_remarks && <DetailRow label="PH Remarks">{data.ph_remarks}</DetailRow>}
          </div>
        </div>
      )}

      {/* Costing / disbursement state */}
      {data.costing_queue_ref && (
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            Costing / Finance
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <DetailRow label="Costing Queue Ref">
              <Link href={`/finance/costing-queue/${encodeURIComponent(data.costing_queue_ref)}`} className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />{data.costing_queue_ref}
              </Link>
            </DetailRow>
            {data.disbursement_status && (
              <DetailRow label="Disbursement Status">{data.disbursement_status}</DetailRow>
            )}
            {data.disbursed_by && (
              <DetailRow label="Disbursed By">{data.disbursed_by}</DetailRow>
            )}
            {data.disbursed_on && (
              <DetailRow label="Disbursed On">{fmtDate(data.disbursed_on)}</DetailRow>
            )}
          </div>
        </div>
      )}

      {/* Supporting docs */}
      {data.supporting_docs && data.supporting_docs.length > 0 && (
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4" /> Supporting Documents
          </h2>
          <ul className="space-y-2">
            {data.supporting_docs.map(doc => (
              <li key={doc.name}>
                {doc.file_url ? (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <FileText className="w-4 h-4" />
                    {doc.file_name || doc.name}
                  </a>
                ) : (
                  <span className="text-sm text-gray-600">{doc.file_name || doc.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Accountability */}
      <AccountabilityTimeline subjectDoctype="GE PH Approval Item" subjectName={data.name} />

      {/* Action modal */}
      {actionType && (
        <ActionModal
          open={actionType !== null}
          title={actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
          description={`${actionType === 'approve' ? 'Approve' : 'Reject'} ${data.source_id || data.name} (${fmt(data.amount)})?`}
          confirmLabel={actionType === 'approve' ? 'Approve' : 'Reject'}
          variant={actionType === 'approve' ? 'success' : 'danger'}
          busy={busy}
          onCancel={() => setActionType(null)}
          onConfirm={submitAction}
        >
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Remarks</label>
            <textarea
              className="input w-full text-sm"
              placeholder={actionType === 'reject' ? 'Reason for rejection (required)' : 'Optional remarks…'}
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>
        </ActionModal>
      )}
    </div>
  );
}
