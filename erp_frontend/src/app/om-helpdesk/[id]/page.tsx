'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import {
  callApi, formatDate, formatDateTime, badge, statusVariant, hasAnyRole, useAuth,
  TICKET_BADGES, PRIORITY_BADGES,
} from '@/components/om/om-helpers';

interface TicketDetail {
  name: string;
  title?: string;
  description?: string;
  linked_project?: string;
  linked_site?: string;
  asset_serial_no?: string;
  category?: string;
  priority?: string;
  status?: string;
  raised_by?: string;
  raised_on?: string;
  assigned_to?: string;
  resolved_on?: string;
  closed_on?: string;
  is_rma?: boolean;
  sla_profile?: string;
  resolution_notes?: string;
  escalation_level?: number;
  comments?: { user?: string; comment?: string; created_at?: string }[];
  creation?: string;
  owner?: string;
}

export default function TicketDetailPage() {
  const params = useParams();
  const id = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [assignModal, setAssignModal] = useState(false);
  const [commentModal, setCommentModal] = useState(false);

  const canManage = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'OM Operator');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(id)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load ticket'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(id)}/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed: ${action}`);
      showSuccess(result.message || `${action} completed`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : `Failed: ${action}`); }
    finally { setActionBusy(''); }
  };

  const convertToRMA = async () => {
    setActionBusy('convert_rma'); setError('');
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(id)}/convert-rma`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed');
      showSuccess('Converted to RMA'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to convert'); }
    finally { setActionBusy(''); }
  };

  const d = data;
  const st = (d?.status || 'NEW').toUpperCase();
  const isClosed = st === 'CLOSED';
  const comments = d?.comments || [];

  return (
    <>
      <DetailPage
        title={d?.name || id}
        kicker={d ? `${d.title || 'Ticket'} · ${d.category?.replace(/_/g, ' ') || ''}` : 'Helpdesk Ticket'}
        backHref="/om-helpdesk"
        backLabel="Back to Helpdesk"
        loading={loading}
        error={error}
        onRetry={load}
        status={st.replace(/_/g, ' ')}
        statusVariant={statusVariant(st)}
        headerActions={
          <>
            <span className={`badge ${badge(PRIORITY_BADGES, d?.priority)}`}>{d?.priority || '-'}</span>
            {d?.is_rma && <span className="badge badge-orange">RMA</span>}
            {!isClosed && canManage && (
              <>
                {st === 'NEW' && <button onClick={() => setAssignModal(true)} disabled={!!actionBusy} className="btn btn-secondary text-xs">Assign</button>}
                {(st === 'NEW' || st === 'ASSIGNED') && <button onClick={() => runAction('start')} disabled={!!actionBusy} className="btn btn-primary text-xs">Start</button>}
                {st === 'IN_PROGRESS' && <button onClick={() => runAction('pause')} disabled={!!actionBusy} className="btn btn-secondary text-xs">Pause</button>}
                {st === 'ON_HOLD' && <button onClick={() => runAction('resume')} disabled={!!actionBusy} className="btn btn-primary text-xs">Resume</button>}
                {st === 'IN_PROGRESS' && <button onClick={() => runAction('resolve')} disabled={!!actionBusy} className="btn btn-primary text-xs">Resolve</button>}
                {st === 'RESOLVED' && <button onClick={() => runAction('close')} disabled={!!actionBusy} className="btn btn-secondary text-xs">Close</button>}
                <button onClick={() => runAction('escalate')} disabled={!!actionBusy} className="btn btn-secondary text-xs text-rose-600">Escalate</button>
                {!d?.is_rma && <button onClick={convertToRMA} disabled={!!actionBusy} className="btn btn-secondary text-xs text-orange-600">Convert to RMA</button>}
                <button onClick={() => setCommentModal(true)} disabled={!!actionBusy} className="btn btn-secondary text-xs">Comment</button>
              </>
            )}
          </>
        }
        identityBlock={
          d ? (
            <div className="space-y-3">
              {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
              {d.escalation_level != null && d.escalation_level > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 font-medium">Escalation Level {d.escalation_level}</div>
              )}
            </div>
          ) : null
        }
        sidePanels={
          <>
            {d && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900">Ticket Details</h3></div>
                <div className="card-body">
                  <dl className="space-y-2 text-sm">
                    {([
                      ['Ticket', d.name], ['Category', d.category?.replace(/_/g, ' ')], ['Priority', d.priority],
                      ['Project', d.linked_project], ['Site', d.linked_site], ['Asset Serial', d.asset_serial_no],
                      ['SLA Profile', d.sla_profile], ['Raised By', d.raised_by], ['Raised On', formatDateTime(d.raised_on)],
                      ['Assigned To', d.assigned_to], ['Resolved On', formatDateTime(d.resolved_on)],
                      ['Closed On', formatDateTime(d.closed_on)], ['Created By', d.owner], ['Created', formatDate(d.creation)],
                    ] as [string, string | undefined][]).map(([label, value]) => (
                      <div key={label} className="flex gap-2">
                        <dt className="text-gray-500 w-28 shrink-0">{label}</dt>
                        <dd className="font-medium text-gray-900 truncate">{value || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            )}
            <LinkedRecordsPanel links={d?.is_rma ? [{ label: 'RMA Tracker', doctype: 'GE RMA Tracker', method: 'frappe.client.get_list', args: { doctype: 'GE RMA Tracker', filters: JSON.stringify({ linked_ticket: d?.name }), fields: JSON.stringify(['name', 'rma_status', 'warranty_status', 'aging_days']), limit_page_length: '10' }, href: (name: string) => `/rma/${name}` }] : []} />
            <TraceabilityPanel projectId={d?.linked_project} siteId={d?.linked_site} />
            <RecordDocumentsPanel referenceDoctype="GE Ticket" referenceName={id} title="Linked Documents" initialLimit={5} />
            <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Ticket" subjectName={id} compact={false} initialLimit={10} /></div></div>
          </>
        }
      >
        {d && (
          <div className="space-y-4">
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Description & Resolution</h3></div>
              <div className="card-body space-y-4">
                {d.description ? <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{d.description}</div> : <p className="text-sm text-gray-400 italic">No description provided</p>}
                {d.resolution_notes && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <h4 className="text-sm font-medium text-emerald-800 mb-2">Resolution Notes</h4>
                    <div className="prose prose-sm max-w-none text-emerald-700 whitespace-pre-wrap">{d.resolution_notes}</div>
                  </div>
                )}
              </div>
            </div>

            {comments.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900">Comments ({comments.length})</h3></div>
                <div className="card-body divide-y divide-gray-100">
                  {comments.map((c, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{c.user || 'Unknown'}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailPage>

      <ActionModal open={assignModal} title="Assign Ticket" description={`Assign ticket ${id} to a team member.`} confirmLabel="Assign" fields={[{ name: 'assigned_to', label: 'Assign To', type: 'text', required: true, placeholder: 'User email or ID' }]} onConfirm={async (values) => { await runAction('assign', { assigned_to: values.assigned_to || '' }); setAssignModal(false); }} onCancel={() => setAssignModal(false)} />

      <ActionModal open={commentModal} title="Add Comment" description={`Add a comment to ticket ${id}.`} confirmLabel="Post Comment" fields={[{ name: 'comment', label: 'Comment', type: 'textarea', required: true, placeholder: 'Enter your comment...' }]} onConfirm={async (values) => { await runAction('comment', { comment: values.comment || '' }); setCommentModal(false); }} onCancel={() => setCommentModal(false)} />
    </>
  );
}
