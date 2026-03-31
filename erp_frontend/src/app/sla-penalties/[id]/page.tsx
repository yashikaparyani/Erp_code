'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, DollarSign,
  CheckCircle2, XCircle, Shield, FileText, Tag, Ban,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import ActionModal from '@/components/ui/ActionModal';
import { useAuth } from '@/context/AuthContext';

/* ─── types ─────────────────────────────────────────────────────────── */
interface PenaltyDetail {
  name: string;
  linked_ticket?: string;
  sla_penalty_rule?: string;
  breach_type?: string;
  calculated_penalty?: number;
  calculated_on?: string;
  approval_status?: string;
  approved_by?: string;
  applied_to_invoice?: string;
  remarks?: string;
  linked_project?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

/* ─── helpers ───────────────────────────────────────────────────────── */
function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(v?: number) {
  if (v == null) return '-';
  return '₹ ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status?: string }) {
  const s = status || 'PENDING';
  const style =
    s === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'WAIVED' ? 'bg-gray-50 text-gray-600 border-gray-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

/* ─── page ──────────────────────────────────────────────────────────── */
export default function SlaPenaltyDetailPage() {
  const params = useParams();
  const penaltyName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<PenaltyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [waiveModal, setWaiveModal] = useState(false);

  const currentRole = currentUser?.roles?.[0] || '';
  const approvalRoles = new Set(['OM Operator', 'RMA Manager', 'Director', 'Project Head']);
  const canApprove = (currentUser?.roles || []).some(r => approvalRoles.has(r));

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/sla-penalties/${encodeURIComponent(penaltyName)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [penaltyName]);

  useEffect(() => { reload(); }, [reload]);

  const runAction = async (action: string, extra?: Record<string, string>) => {
    setActionBusy(action);
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch(`/api/sla-penalties/${encodeURIComponent(penaltyName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      setSuccessMsg(payload.message || 'Done');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <p className="text-gray-600">{error || 'Penalty record not found'}</p>
      <Link href="/sla-penalties" className="text-sm text-blue-600 hover:underline">← Back to list</Link>
    </div>
  );

  const p = data;

  return (
    <div className="space-y-6">
      {/* ── header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/sla-penalties" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />Back to SLA Penalties
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{penaltyName}</h1>
          <p className="text-sm text-gray-500 mt-1">{p.breach_type || 'SLA Penalty'} — {formatDate(p.calculated_on)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={p.approval_status} />

          {p.approval_status === 'PENDING' && canApprove && (
            <>
              <button onClick={() => runAction('approve')} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" />{actionBusy === 'approve' ? 'Approving...' : 'Approve'}
              </button>
              <button onClick={() => setRejectModal(true)} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <XCircle className="h-3.5 w-3.5" />Reject
              </button>
            </>
          )}
          {(p.approval_status === 'PENDING' || p.approval_status === 'APPROVED') && canApprove && (
            <button onClick={() => setWaiveModal(true)} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
              <Ban className="h-3.5 w-3.5" />Waive
            </button>
          )}
        </div>
      </div>

      {/* ── messages ── */}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
      {(p.approval_status === 'REJECTED' || p.approval_status === 'WAIVED') && p.remarks && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-xs font-semibold text-rose-800">{p.approval_status === 'WAIVED' ? 'Waiver Reason' : 'Rejection Reason'}</p>
          <p className="text-sm text-rose-700 mt-1">{p.remarks}</p>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><DollarSign className="w-5 h-5" /></div><div><div className="stat-value text-lg">{formatCurrency(p.calculated_penalty)}</div><div className="stat-label">Penalty Amount</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Tag className="w-5 h-5" /></div><div><div className="stat-value text-sm">{p.breach_type || '-'}</div><div className="stat-label">Breach Type</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><Calendar className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatDate(p.calculated_on)}</div><div className="stat-label">Calculated On</div></div></div></div>
      </div>

      {/* ── detail card ── */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Penalty Details</h3></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {p.linked_ticket && (
            <div className="flex items-start gap-3"><Shield className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Linked Ticket</div><Link href={`/om-helpdesk/${encodeURIComponent(p.linked_ticket)}`} className="font-medium text-blue-700 hover:underline">{p.linked_ticket}</Link></div></div>
          )}
          {p.sla_penalty_rule && (
            <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Penalty Rule</div><div className="font-medium text-gray-900">{p.sla_penalty_rule}</div></div></div>
          )}
          {p.approved_by && (
            <div className="flex items-start gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Approved / Waived By</div><div className="font-medium text-gray-900">{p.approved_by}</div></div></div>
          )}
          {p.applied_to_invoice && (
            <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Applied to Invoice</div><div className="font-medium text-gray-900">{p.applied_to_invoice}</div></div></div>
          )}
          {p.linked_project && (
            <div className="flex items-start gap-3"><Tag className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Linked Project</div><Link href={`/projects/${encodeURIComponent(p.linked_project)}`} className="font-medium text-blue-700 hover:underline">{p.linked_project}</Link></div></div>
          )}
        </div>
      </div>

      {/* ── linked records ── */}
      <LinkedRecordsPanel
        links={[
          ...(p.linked_ticket ? [{
            label: 'Source Ticket',
            doctype: 'GE Ticket',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Ticket',
              filters: JSON.stringify({ name: p.linked_ticket }),
              fields: JSON.stringify(['name', 'subject', 'status', 'priority']),
              limit_page_length: '5',
            },
            href: (name: string) => `/om-helpdesk/${name}`,
          }] : []),
        ]}
      />

      {/* ── documents + accountability ── */}
      <RecordDocumentsPanel referenceDoctype="GE SLA Penalty Record" referenceName={penaltyName} title="Penalty Documents" />
      <section>
        <details open>
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-3">Accountability Trail</summary>
          <AccountabilityTimeline subjectDoctype="GE SLA Penalty Record" subjectName={penaltyName} />
        </details>
      </section>

      {/* ── reject modal ── */}
      <ActionModal
        open={rejectModal}
        title="Reject SLA Penalty"
        description="Provide a reason for rejecting this penalty."
        busy={actionBusy === 'reject'}
        fields={[{ name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Why is this penalty being rejected?' }]}
        onConfirm={async (values) => { await runAction('reject', { reason: values.reason || '' }); setRejectModal(false); }}
        onCancel={() => setRejectModal(false)}
      />

      {/* ── waive modal ── */}
      <ActionModal
        open={waiveModal}
        title="Waive SLA Penalty"
        description="Provide a reason for waiving this penalty. This is an override action."
        busy={actionBusy === 'waive'}
        fields={[{ name: 'reason', label: 'Waiver Reason', type: 'textarea', required: true, placeholder: 'Justification for waiving this penalty' }]}
        onConfirm={async (values) => { await runAction('waive', { reason: values.reason || '' }); setWaiveModal(false); }}
        onCancel={() => setWaiveModal(false)}
      />
    </div>
  );
}
