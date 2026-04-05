'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Send, CheckCircle2, XCircle, RotateCcw, Calendar, Tag,
  DollarSign, Users, Clock, Building2, MapPin, AlertTriangle,
} from 'lucide-react';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { formatCurrency, formatDate } from '@/components/pm/pm-helpers';

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
  const { currentRole } = useRole();

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
  const isProjectHeadView = currentRole === 'Project Head' || currentRole === 'Director' || currentRole === 'Department Head';

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/pm-requests/${encodeURIComponent(reqName)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
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
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    finally { setActionBusy(null); }
  };

  const d = data;
  const st = d?.status || 'Draft';

  return (
    <>
      <DetailPage
        title={reqName}
        kicker={d ? `${d.request_type || 'Request'} — ${d.subject || ''}` : 'PM Request'}
        backHref={isProjectHeadView ? '/project-head/requests' : '/project-manager/requests'}
        backLabel={isProjectHeadView ? 'Back to Requests from PM' : 'Back to PM Requests'}
        loading={loading}
        error={error}
        onRetry={reload}
        status={st}
        statusVariant={st === 'Approved' ? 'success' : st === 'Rejected' ? 'error' : st === 'Pending' ? 'warning' : 'default'}
        headerActions={
          <>
            {d?.priority && <PriorityBadge priority={d.priority} />}
            {st === 'Draft' && canSubmit && (
              <button onClick={() => runAction('submit')} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                <Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting…' : 'Submit'}
              </button>
            )}
            {st === 'Pending' && canReview && (
              <>
                <button onClick={() => runAction('approve')} disabled={!!actionBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  <CheckCircle2 className="h-3.5 w-3.5" />{actionBusy === 'approve' ? 'Approving…' : 'Approve'}
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
          </>
        }
        identityBlock={
          d ? (
            <div className="space-y-3">
              {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
              {st === 'Rejected' && d.reviewer_remarks && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-xs font-semibold text-rose-800">Reviewer Remarks</p>
                  <p className="text-sm text-rose-700 mt-1">{d.reviewer_remarks}</p>
                </div>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Tag className="w-5 h-5" /></div><div><div className="stat-value text-sm">{d.request_type || '-'}</div><div className="stat-label">Type</div></div></div></div>
                {(d.amount_requested ?? 0) > 0 && (
                  <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><DollarSign className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatCurrency(d.amount_requested)}</div><div className="stat-label">Amount</div></div></div></div>
                )}
                {(d.delay_days ?? 0) > 0 && (
                  <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-100 text-rose-600"><AlertTriangle className="w-5 h-5" /></div><div><div className="stat-value">{d.delay_days}</div><div className="stat-label">Delay Days</div></div></div></div>
                )}
                {(d.positions_needed ?? 0) > 0 && (
                  <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><Users className="w-5 h-5" /></div><div><div className="stat-value">{d.positions_needed}</div><div className="stat-label">Positions</div></div></div></div>
                )}
                <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Calendar className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatDate(d.requested_date)}</div><div className="stat-label">Requested</div></div></div></div>
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
                      d.linked_project && [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', <Link key="pl" href={`/projects/${encodeURIComponent(d.linked_project)}`} className="text-blue-700 hover:underline">{d.linked_project}</Link>],
                      d.linked_site && [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', d.linked_site],
                      d.current_deadline && [<Calendar key="cd" className="h-3.5 w-3.5" />, 'Current Deadline', formatDate(d.current_deadline)],
                      d.proposed_deadline && [<Calendar key="pd" className="h-3.5 w-3.5" />, 'Proposed Deadline', formatDate(d.proposed_deadline)],
                      d.position_type && [<Users key="pt" className="h-3.5 w-3.5" />, 'Position Type', d.position_type],
                      d.duration_needed && [<Clock key="dn" className="h-3.5 w-3.5" />, 'Duration Needed', d.duration_needed],
                      d.requested_by && [<Send key="rb" className="h-3.5 w-3.5" />, 'Requested By', d.requested_by],
                      d.reviewed_by && [<CheckCircle2 key="rv" className="h-3.5 w-3.5" />, 'Reviewed By', `${d.reviewed_by} — ${formatDate(d.reviewed_date)}`],
                    ].filter(Boolean).map((entry) => {
                      const [icon, label, value] = entry as [React.ReactNode, string, React.ReactNode];
                      return (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-gray-400">{icon}</span>
                          <dt className="text-gray-500 w-32 shrink-0">{label}</dt>
                          <dd className="font-medium text-gray-900 truncate">{value}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              </div>
            )}
            <LinkedRecordsPanel
              links={[
                ...(d?.linked_project ? [{
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
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
              <div className="card-body"><AccountabilityTimeline subjectDoctype="GE PM Request" subjectName={reqName} compact={false} initialLimit={10} /></div>
            </div>
          </>
        }
      >
        {d && (
          <div className="space-y-4">
            {d.subject && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900">Subject</h3></div>
                <div className="card-body text-sm text-gray-700">{d.subject}</div>
              </div>
            )}
            {d.description && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900">Description</h3></div>
                <div className="card-body text-sm text-gray-700 whitespace-pre-wrap">{d.description}</div>
              </div>
            )}
            {d.justification && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900">Justification</h3></div>
                <div className="card-body text-sm text-gray-700 whitespace-pre-wrap">{d.justification}</div>
              </div>
            )}
          </div>
        )}
      </DetailPage>

      <ActionModal
        open={rejectModal}
        title="Reject PM Request"
        description="Provide remarks for rejecting this request."
        busy={actionBusy === 'reject'}
        fields={[{ name: 'remarks', label: 'Reviewer Remarks', type: 'textarea', required: true, placeholder: 'Reason for rejection…' }]}
        onConfirm={async (values) => { await runAction('reject', { remarks: values.remarks || '' }); setRejectModal(false); }}
        onCancel={() => setRejectModal(false)}
      />
    </>
  );
}
