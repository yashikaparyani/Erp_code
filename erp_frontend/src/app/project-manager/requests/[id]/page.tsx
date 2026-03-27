'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, Tag, DollarSign,
  Send, CheckCircle2, XCircle, RotateCcw, FileText, MapPin,
  Users, Clock, Building2, AlertTriangle,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';

interface PmRequestDetail {
  name: string;
  linked_project?: string;
  linked_site?: string;
  request_type?: string;
  subject?: string;
  status?: string;
  priority?: string;
  description?: string;
  justification?: string;
  current_deadline?: string;
  proposed_deadline?: string;
  delay_days?: number;
  positions_needed?: number;
  position_type?: string;
  duration_needed?: string;
  amount_requested?: number;
  requested_by?: string;
  requested_date?: string;
  reviewed_by?: string;
  reviewed_date?: string;
  reviewer_remarks?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(v?: number) {
  if (v == null) return '-';
  return '₹ ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'Draft').replace(/_/g, ' ');
  const style =
    s === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'Withdrawn' ? 'bg-gray-50 text-gray-500 border-gray-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

function PriorityBadge({ priority }: { priority?: string }) {
  const p = priority || '-';
  const style =
    p === 'HIGH' || p === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : p === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${style}`}>{p}</span>;
}

export default function PmRequestDetailPage() {
  const params = useParams();
  const reqName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<PmRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some(r => set.has(r));
  };
  const canSubmit = hasRole('Project Manager', 'Project Head');
  const canReview = hasRole('Project Head', 'Department Head', 'Director');
  const canWithdraw = hasRole('Project Manager', 'Project Head');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/pm-requests/${encodeURIComponent(reqName)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [reqName]);

  useEffect(() => { reload(); }, [reload]);

  const runAction = async (action: string, extra?: Record<string, string>) => {
    setActionBusy(action);
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch(`/api/pm-requests/${encodeURIComponent(reqName)}/actions`, {
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
      <p className="text-gray-600">{error || 'PM Request not found'}</p>
      <Link href="/project-manager/requests" className="text-sm text-blue-600 hover:underline">← Back to Requests</Link>
    </div>
  );

  const d = data;
  const st = d.status || 'Draft';

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/project-manager/requests" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />Back to PM Requests
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{reqName}</h1>
          <p className="text-sm text-gray-500 mt-1">{d.request_type || 'Request'} — {d.subject || ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={st} />
          {d.priority && <PriorityBadge priority={d.priority} />}

          {st === 'Draft' && canSubmit && (
            <button onClick={() => runAction('submit')} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting...' : 'Submit'}
            </button>
          )}
          {st === 'Pending' && canReview && (
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
          {(st === 'Draft' || st === 'Pending') && canWithdraw && (
            <button onClick={() => runAction('withdraw')} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
              <RotateCcw className="h-3.5 w-3.5" />Withdraw
            </button>
          )}
        </div>
      </div>

      {/* messages */}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
      {st === 'Rejected' && d.reviewer_remarks && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-xs font-semibold text-rose-800">Reviewer Remarks</p>
          <p className="text-sm text-rose-700 mt-1">{d.reviewer_remarks}</p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Tag className="w-5 h-5" /></div><div><div className="stat-value text-sm">{d.request_type || '-'}</div><div className="stat-label">Type</div></div></div></div>
        {d.amount_requested != null && d.amount_requested > 0 && (
          <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><DollarSign className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatCurrency(d.amount_requested)}</div><div className="stat-label">Amount Requested</div></div></div></div>
        )}
        {d.delay_days != null && d.delay_days > 0 && (
          <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-100 text-rose-600"><AlertTriangle className="w-5 h-5" /></div><div><div className="stat-value">{d.delay_days}</div><div className="stat-label">Delay Days</div></div></div></div>
        )}
        {d.positions_needed != null && d.positions_needed > 0 && (
          <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><Users className="w-5 h-5" /></div><div><div className="stat-value">{d.positions_needed}</div><div className="stat-label">Positions Needed</div></div></div></div>
        )}
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Calendar className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatDate(d.requested_date)}</div><div className="stat-label">Requested</div></div></div></div>
      </div>

      {/* detail card */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Request Details</h3></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {d.linked_project && (
            <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Linked Project</div><Link href={`/projects/${encodeURIComponent(d.linked_project)}`} className="font-medium text-blue-700 hover:underline">{d.linked_project}</Link></div></div>
          )}
          {d.linked_site && (
            <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Linked Site</div><div className="font-medium text-gray-900">{d.linked_site}</div></div></div>
          )}
          {d.current_deadline && (
            <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Current Deadline</div><div className="font-medium text-gray-900">{formatDate(d.current_deadline)}</div></div></div>
          )}
          {d.proposed_deadline && (
            <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-amber-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Proposed Deadline</div><div className="font-medium text-gray-900">{formatDate(d.proposed_deadline)}</div></div></div>
          )}
          {d.position_type && (
            <div className="flex items-start gap-3"><Users className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Position Type</div><div className="font-medium text-gray-900">{d.position_type}</div></div></div>
          )}
          {d.duration_needed && (
            <div className="flex items-start gap-3"><Clock className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Duration Needed</div><div className="font-medium text-gray-900">{d.duration_needed}</div></div></div>
          )}
          {d.requested_by && (
            <div className="flex items-start gap-3"><Send className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Requested By</div><div className="font-medium text-gray-900">{d.requested_by}</div></div></div>
          )}
          {d.reviewed_by && (
            <div className="flex items-start gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Reviewed By</div><div className="font-medium text-gray-900">{d.reviewed_by} — {formatDate(d.reviewed_date)}</div></div></div>
          )}
        </div>
      </div>

      {/* description / justification */}
      {d.subject && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Subject</h3></div>
          <div className="p-4 text-sm text-gray-700">{d.subject}</div>
        </div>
      )}
      {d.description && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Description</h3></div>
          <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap">{d.description}</div>
        </div>
      )}
      {d.justification && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Justification</h3></div>
          <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap">{d.justification}</div>
        </div>
      )}

      {/* linked records */}
      <LinkedRecordsPanel
        links={[
          ...(d.linked_project ? [{
            label: 'Project',
            doctype: 'GE Project',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Project',
              filters: JSON.stringify({ name: d.linked_project }),
              fields: JSON.stringify(['name', 'project_name', 'status']),
              limit_page_length: '5',
            },
            href: (name: string) => `/projects/${name}`,
          }] : []),
        ]}
      />

      <RecordDocumentsPanel referenceDoctype="GE PM Request" referenceName={reqName} title="Request Documents" />
      <section>
        <details open>
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-3">Accountability Trail</summary>
          <AccountabilityTimeline subjectDoctype="GE PM Request" subjectName={reqName} />
        </details>
      </section>

      {/* reject modal */}
      <ActionModal
        open={rejectModal}
        title="Reject PM Request"
        description="Provide remarks for rejecting this request."
        busy={actionBusy === 'reject'}
        fields={[{ name: 'remarks', label: 'Reviewer Remarks', type: 'textarea', required: true, placeholder: 'Reason for rejection...' }]}
        onConfirm={async (values) => { await runAction('reject', { remarks: values.remarks || '' }); setRejectModal(false); }}
        onCancel={() => setRejectModal(false)}
      />
    </div>
  );
}
