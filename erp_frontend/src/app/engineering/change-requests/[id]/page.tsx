'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  User,
  Building2,
  Send,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Hash,
  AlertTriangle,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';

interface ChangeRequestDetail {
  name: string;
  title?: string;
  project?: string;
  status?: string;
  impact_summary?: string;
  description?: string;
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'Draft').toUpperCase();
  const style = s === 'APPROVED'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'SUBMITTED' || s === 'PENDING' || s === 'PENDING_APPROVAL'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'REJECTED'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>
      {(status || 'Draft').replace(/_/g, ' ')}
    </span>
  );
}

export default function ChangeRequestDetailPage() {
  const params = useParams();
  const crName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<ChangeRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canSubmit = hasRole('Director', 'System Manager', 'Presales Tendering Head', 'Engineering Executive', 'Project Head');
  const canApproveReject = hasRole('Director', 'System Manager', 'Department Head');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/engineering/change-requests/${encodeURIComponent(crName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load change request');
    } finally {
      setLoading(false);
    }
  }, [crName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action);
    setError('');
    try {
      const res = await fetch(`/api/engineering/change-requests/${encodeURIComponent(crName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action}`);
      showSuccess(result.message || `${action} completed`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionBusy('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading change request...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-rose-600">{error}</p>
        <Link href="/engineering/change-requests" className="text-sm text-blue-600 hover:underline">← Back to Change Requests</Link>
      </div>
    );
  }

  if (!data) return null;

  const isDraft = !data.status || data.status === 'Draft' || data.status === 'DRAFT';
  const isPending = data.status === 'Submitted' || data.status === 'SUBMITTED' || data.status === 'PENDING_APPROVAL';
  const isApproved = data.status === 'Approved' || data.status === 'APPROVED';
  const isRejected = data.status === 'Rejected' || data.status === 'REJECTED';

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/engineering/change-requests" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Change Requests
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.title || data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.project || 'No project'} &middot; {formatDate(data.creation)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          {isDraft && canSubmit && (
            <button onClick={() => runAction('submit')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          {isPending && canApproveReject && (
            <>
              <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
              <button onClick={() => setRejectModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Rejection reason */}
      {isRejected && data.rejection_reason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <strong>Rejection Reason:</strong> {data.rejection_reason}
        </div>
      )}

      {/* Detail Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Context Card */}
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Change Request Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'CR Name', data.name],
                [<FileText key="t" className="h-3.5 w-3.5" />, 'Title', data.title],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.project],
                [<User key="r" className="h-3.5 w-3.5" />, 'Requested By', data.requested_by],
                [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
                [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
                [<Calendar key="m" className="h-3.5 w-3.5" />, 'Modified', formatDate(data.modified)],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                  <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
                </div>
              ))}
            </dl>

            {/* Approval info */}
            {data.approved_by && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-gray-600">Approved by <strong>{data.approved_by}</strong></span>
                </div>
                {data.approved_at && <p className="mt-1 text-xs text-gray-400">on {formatDate(data.approved_at)}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Impact + Description */}
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Impact &amp; Description</h3></div>
          <div className="card-body space-y-4">
            {data.impact_summary ? (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Impact Summary</h4>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{data.impact_summary}</div>
              </div>
            ) : null}
            {data.description ? (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</h4>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{data.description}</div>
              </div>
            ) : null}
            {!data.impact_summary && !data.description && (
              <p className="text-sm text-gray-400">No description or impact summary recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Linked Navigation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.project && (
          <Link href={`/engineering/projects/${encodeURIComponent(data.project)}`} className="card card-body flex items-center gap-3 hover:bg-blue-50 transition">
            <Building2 className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-xs text-gray-500">Project</div>
              <div className="text-sm font-medium text-gray-900">{data.project}</div>
            </div>
          </Link>
        )}
      </div>

      {/* Linked Records */}
      <LinkedRecordsPanel
        links={[
          {
            label: 'Related Drawings',
            doctype: 'GE Drawing',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Drawing',
              filters: JSON.stringify(data.project ? { linked_project: data.project } : {}),
              fields: JSON.stringify(['name', 'title', 'status', 'revision', 'linked_project']),
              limit_page_length: '20',
            },
            href: (name) => `/engineering/drawings/${name}`,
          },
          {
            label: 'Technical Deviations',
            doctype: 'GE Technical Deviation',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Technical Deviation',
              filters: JSON.stringify(data.project ? { linked_project: data.project } : {}),
              fields: JSON.stringify(['name', 'deviation_id', 'status', 'impact', 'description']),
              limit_page_length: '20',
            },
            href: (name) => `/engineering/deviations/${name}`,
          },
        ]}
      />

      {/* Linked Documents */}
      <RecordDocumentsPanel
        referenceDoctype="GE Change Request"
        referenceName={crName}
        title="Linked Documents"
        initialLimit={5}
      />

      {/* Accountability Trail */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
        <div className="card-body">
          <AccountabilityTimeline
            subjectDoctype="GE Change Request"
            subjectName={crName}
            compact={false}
            initialLimit={10}
          />
        </div>
      </div>

      {/* Reject Modal */}
      <ActionModal
        open={rejectModal}
        title="Reject Change Request"
        description={`Reject ${data.title || data.name}. Please provide a reason.`}
        variant="danger"
        confirmLabel="Reject"
        busy={actionBusy === 'reject'}
        fields={[
          { name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Mandatory — why is this change request being rejected?' },
        ]}
        onConfirm={async (values) => {
          await runAction('reject', { reason: values.reason || '' });
          setRejectModal(false);
        }}
        onCancel={() => setRejectModal(false)}
      />
    </div>
  );
}
