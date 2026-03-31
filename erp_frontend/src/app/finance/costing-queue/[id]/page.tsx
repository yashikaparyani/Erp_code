'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, XCircle, Pause, Loader2,
  User, Calendar, IndianRupee, Building2, AlertCircle, Inbox,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import { useAuth } from '@/context/AuthContext';

interface QueueDetail {
  name: string;
  source_type?: string;
  source_id?: string;
  entry_label?: string;
  ph_approver?: string;
  ph_approval_date?: string;
  amount?: number;
  project?: string;
  vendor_beneficiary?: string;
  disbursement_status?: string;
  linked_record?: string;
  ph_remarks?: string;
  costing_remarks?: string;
  disbursed_by?: string;
  disbursed_on?: string;
}

const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-yellow',
  Released: 'badge-green',
  Held: 'badge-orange',
  Rejected: 'badge-red',
};

type ActionType = 'release' | 'hold' | 'reject';

function fmt(n?: number) {
  if (!n) return '₹ 0';
  return `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0">
      <span className="text-sm text-gray-500 sm:w-44 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900">{children}</span>
    </div>
  );
}

export default function CostingQueueDetailPage() {
  const params = useParams();
  const id = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();
  const costingRoles = new Set(['Accounts', 'Director', 'System Manager']);
  const canDoCosting = (currentUser?.roles || []).some(r => costingRoles.has(r));
  const [data, setData] = useState<QueueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/costing-queue/${encodeURIComponent(id)}`).then(r => r.json());
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
      const res = await fetch(`/api/costing-queue/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, remarks }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message || 'Action failed');
      const labels: Record<ActionType, string> = { release: 'Released', hold: 'Held', reject: 'Rejected' };
      setSuccessMsg(labels[actionType]);
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
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />{error}
        </div>
        <Link href="/finance/costing-queue" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Queue
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const canAct = canDoCosting && (!data.disbursement_status || data.disbursement_status === 'Pending');

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/finance/costing-queue" className="mt-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-purple-600" />
                {data.entry_label || data.name}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{data.source_type} · {data.source_id}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`badge ${STATUS_BADGE[data.disbursement_status || 'Pending'] || 'badge-gray'}`}>
                {data.disbursement_status || 'Pending'}
              </span>
              {canAct && (
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-success" onClick={() => { setActionType('release'); setRemarks(''); }}>
                    <CheckCircle2 className="w-4 h-4" /> Release
                  </button>
                  <button className="btn btn-sm btn-warning" onClick={() => { setActionType('hold'); setRemarks(''); }}>
                    <Pause className="w-4 h-4" /> Hold
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

      {/* Detail */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Queue Entry</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Row label="Source Type">
            <span className="capitalize">{data.source_type || '-'}</span>
          </Row>
          <Row label="Source ID">{data.source_id || '-'}</Row>
          <Row label="Project">{data.project || '-'}</Row>
          <Row label="Amount">
            <span className="flex items-center gap-1 text-blue-700 font-semibold">
              <IndianRupee className="w-3 h-3" />{fmt(data.amount)}
            </span>
          </Row>
          <Row label="Vendor / Beneficiary">
            {data.vendor_beneficiary ? (
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-gray-400" />{data.vendor_beneficiary}</span>
            ) : '-'}
          </Row>
          {data.linked_record && (
            <Row label="Source Record">
              <Link href={data.linked_record} className="text-blue-600 hover:underline text-sm">
                Open record
              </Link>
            </Row>
          )}
        </div>
      </div>

      {/* PH approval info */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">PH Approval</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Row label="Approved By">
            <span className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" />{data.ph_approver || '-'}</span>
          </Row>
          <Row label="Approval Date">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{fmtDate(data.ph_approval_date)}</span>
          </Row>
          {data.ph_remarks && <Row label="PH Remarks">{data.ph_remarks}</Row>}
        </div>
      </div>

      {/* Disbursement info */}
      {(data.disbursed_by || data.costing_remarks) && (
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Costing Decision</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.disbursed_by && (
              <Row label="Acted By"><span className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" />{data.disbursed_by}</span></Row>
            )}
            {data.disbursed_on && (
              <Row label="Date"><span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{fmtDate(data.disbursed_on)}</span></Row>
            )}
            {data.costing_remarks && <Row label="Remarks">{data.costing_remarks}</Row>}
          </div>
        </div>
      )}

      {/* Accountability */}
      <AccountabilityTimeline subjectDoctype="GE Costing Queue" subjectName={data.name} />

      {/* Action modal */}
      {actionType && data && (
        <ActionModal
          open={actionType !== null}
          title={actionType === 'release' ? 'Release / Disburse' : actionType === 'hold' ? 'Hold Entry' : 'Reject Entry'}
          description={`${actionType === 'release' ? 'Mark as disbursed' : actionType === 'hold' ? 'Place on hold' : 'Reject'}: ${data.entry_label || data.name} (${fmt(data.amount)})?`}
          confirmLabel={actionType === 'release' ? 'Release' : actionType === 'hold' ? 'Hold' : 'Reject'}
          variant={actionType === 'release' ? 'success' : actionType === 'hold' ? 'default' : 'danger'}
          busy={busy}
          onCancel={() => setActionType(null)}
          onConfirm={submitAction}
        >
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Remarks</label>
            <textarea
              className="input w-full text-sm"
              placeholder="Add remarks…"
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
