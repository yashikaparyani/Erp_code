'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  RefreshCcw,
  Send,
  XCircle,
} from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import ActionModal from '@/components/ui/ActionModal';

type PMRequest = {
  name: string;
  linked_project?: string;
  linked_site?: string;
  request_type?: string;
  subject?: string;
  status?: string;
  priority?: string;
  description?: string;
  justification?: string;
  amount_requested?: number;
  requested_by?: string;
  requested_date?: string;
  reviewed_by?: string;
  reviewed_date?: string;
  reviewer_remarks?: string;
  creation: string;
};

type StatusFilter = 'all' | 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn';

const STATUS_TONES: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-rose-50 text-rose-700',
  Withdrawn: 'bg-gray-100 text-gray-400',
};

const PRIORITY_TONES: Record<string, string> = {
  Normal: 'bg-blue-50 text-blue-600',
  Urgent: 'bg-amber-100 text-amber-700',
  Critical: 'bg-rose-100 text-rose-700',
};

function formatCurrency(value?: number) {
  if (!value) return '₹ 0';
  return `₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ProjectHeadRequestsPage() {
  const [requests, setRequests] = useState<PMRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Pending');
  const [projectFilter, setProjectFilter] = useState('all');
  const [actionTarget, setActionTarget] = useState<PMRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/pm-requests', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to load requests');
      }
      setRequests(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const projects = useMemo(
    () => Array.from(new Set(requests.map((r) => r.linked_project).filter(Boolean) as string[])).sort(),
    [requests],
  );

  const filtered = requests.filter((request) => {
    if (statusFilter !== 'all' && request.status !== statusFilter) return false;
    if (projectFilter !== 'all' && request.linked_project !== projectFilter) return false;
    return true;
  });

  const counts: Record<StatusFilter, number> = {
    all: requests.length,
    Draft: 0,
    Pending: 0,
    Approved: 0,
    Rejected: 0,
    Withdrawn: 0,
  };
  for (const request of requests) {
    if (request.status && request.status in counts) {
      counts[request.status as StatusFilter] += 1;
    }
  }

  const openAction = (request: PMRequest, type: 'approve' | 'reject') => {
    setActionTarget(request);
    setActionType(type);
    setRemarks('');
    setSuccessMsg('');
    setError('');
  };

  const submitAction = async () => {
    if (!actionTarget || !actionType) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/pm-requests/${encodeURIComponent(actionTarget.name)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, remarks }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Action failed');
      }
      setSuccessMsg(payload.message || (actionType === 'approve' ? 'Request approved' : 'Request rejected'));
      setActionTarget(null);
      setActionType(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Requests from Project Managers"
        description="Review PM escalations, staffing asks, timeline extensions, and petty cash exception requests in the correct Project Head workspace."
        loading={loading}
        error={error}
        empty={!loading && filtered.length === 0}
        emptyTitle="No PM requests found"
        emptyDescription="No PM requests match the current filter."
        onRetry={() => void load()}
        stats={[
          { label: 'Total', value: counts.all },
          { label: 'Pending', value: counts.Pending, variant: counts.Pending > 0 ? 'warning' : 'default' },
          { label: 'Approved', value: counts.Approved, variant: 'success' },
          { label: 'Rejected', value: counts.Rejected, variant: counts.Rejected > 0 ? 'error' : 'default' },
        ]}
        filterBar={
          <>
            <select className="input max-w-xs" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="all">All projects</option>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
            <div className="ml-auto flex flex-wrap gap-2">
              {(['all', 'Draft', 'Pending', 'Approved', 'Rejected', 'Withdrawn'] as StatusFilter[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === key
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-gray-200'
                  }`}
                >
                  {key === 'all' ? 'All' : key} ({counts[key]})
                </button>
              ))}
            </div>
          </>
        }
        headerActions={
          <button onClick={() => void load()} className="btn btn-secondary text-xs" disabled={loading}>
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      >
        {successMsg && (
          <div className="mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {successMsg}
          </div>
        )}

        <div className="space-y-3 p-4">
          {filtered.map((request) => (
            <div
              key={request.name}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-main)] p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONES[request.status || ''] || 'bg-gray-100 text-gray-600'}`}>
                      {request.status || '-'}
                    </span>
                    {request.priority ? (
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_TONES[request.priority] || 'bg-gray-100 text-gray-600'}`}>
                        {request.priority}
                      </span>
                    ) : null}
                    {request.request_type ? (
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                        {request.request_type}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-[var(--text-main)]">{request.subject || request.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[var(--text-muted)]">
                    <span>Project: {request.linked_project || '-'}</span>
                    <span>Site: {request.linked_site || '-'}</span>
                    <span>Raised by: {request.requested_by || '-'}</span>
                    <span>Date: {formatDate(request.requested_date || request.creation)}</span>
                    {typeof request.amount_requested === 'number' ? (
                      <span>Amount: {formatCurrency(request.amount_requested)}</span>
                    ) : null}
                  </div>
                  {request.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-[var(--text-muted)]">{request.description}</p>
                  ) : null}
                  {request.reviewer_remarks && request.status === 'Rejected' ? (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      <span className="font-semibold">Rejection remarks:</span> {request.reviewer_remarks}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/project-manager/requests/${encodeURIComponent(request.name)}`}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" /> Details
                  </Link>
                  {request.status === 'Pending' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAction(request, 'approve')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => openAction(request, 'reject')}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {request.status || 'Draft'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </RegisterPage>

      {actionTarget && actionType && (
        <ActionModal
          open={true}
          title={actionType === 'approve' ? 'Approve PM Request' : 'Reject PM Request'}
          description={`${actionType === 'approve' ? 'Approve' : 'Reject'} ${actionTarget.subject || actionTarget.name}?`}
          confirmLabel={actionType === 'approve' ? 'Approve' : 'Reject'}
          variant={actionType === 'approve' ? 'success' : 'danger'}
          busy={busy}
          onCancel={() => {
            setActionTarget(null);
            setActionType(null);
          }}
          onConfirm={submitAction}
        >
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Remarks</label>
            <textarea
              className="input w-full text-sm"
              placeholder={actionType === 'reject' ? 'Reason for rejection (required)' : 'Optional remarks'}
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
            {actionType === 'reject' ? (
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <AlertCircle className="h-3.5 w-3.5" />
                Rejection needs remarks so the PM gets a useful reason.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Send className="h-3.5 w-3.5" />
                Approval will mark this request as reviewed by Project Head.
              </div>
            )}
          </div>
        </ActionModal>
      )}
    </>
  );
}
