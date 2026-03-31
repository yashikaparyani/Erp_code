'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  CheckCircle2, XCircle, Play, Pause, RotateCcw, Send, MessageSquare,
  Hash, MapPin, AlertTriangle, Clock, Tag, Shield,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { useAuth } from '@/context/AuthContext';

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
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'NEW').toUpperCase();
  const style = s === 'CLOSED' ? 'bg-gray-100 text-gray-700 border-gray-200'
    : s === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'IN_PROGRESS' || s === 'IN PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'ASSIGNED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : s === 'ON_HOLD' || s === 'ON HOLD' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'NEW' ? 'bg-purple-50 text-purple-700 border-purple-200'
    : s === 'ESCALATED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s.replace(/_/g, ' ')}</span>;
}

function PriorityBadge({ priority }: { priority?: string }) {
  const p = (priority || '').toUpperCase();
  const style = p === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-300'
    : p === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-300'
    : p === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-300'
    : p === 'LOW' ? 'bg-green-100 text-green-800 border-green-300'
    : 'bg-gray-100 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${style}`}>{p || 'N/A'}</span>;
}

export default function TicketDetailPage() {
  const params = useParams();
  const ticketName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [assignModal, setAssignModal] = useState(false);
  const [commentModal, setCommentModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canManage = hasRole('Director', 'System Manager', 'O&M Manager', 'Helpdesk Agent');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load ticket'); }
    finally { setLoading(false); }
  }, [ticketName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketName)}/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action}`);
      showSuccess(result.message || `${action} completed`);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : `Failed to ${action}`); }
    finally { setActionBusy(''); }
  };

  const convertToRMA = async () => {
    setActionBusy('convert_rma'); setError('');
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketName)}/convert-rma`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed to convert');
      showSuccess('Ticket converted to RMA');
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to convert to RMA'); }
    finally { setActionBusy(''); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading ticket...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/om-helpdesk" className="text-sm text-blue-600 hover:underline">← Back to Helpdesk</Link></div>;
  if (!data) return null;

  const st = (data.status || 'NEW').toUpperCase();
  const isNew = st === 'NEW';
  const isAssigned = st === 'ASSIGNED';
  const isInProgress = st === 'IN_PROGRESS' || st === 'IN PROGRESS';
  const isOnHold = st === 'ON_HOLD' || st === 'ON HOLD';
  const isResolved = st === 'RESOLVED';
  const isClosed = st === 'CLOSED';
  const comments = data.comments || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/om-helpdesk" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Helpdesk</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.title || 'No title'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={data.priority} />
          <StatusBadge status={st} />
          {data.is_rma && <span className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">RMA</span>}
        </div>
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      {!isClosed && canManage && (
        <div className="flex flex-wrap gap-2">
          {isNew && <button onClick={() => setAssignModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"><User className="h-3.5 w-3.5" /> Assign</button>}
          {(isNew || isAssigned) && <button onClick={() => runAction('start')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Play className="h-3.5 w-3.5" /> Start</button>}
          {isInProgress && <button onClick={() => runAction('pause')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"><Pause className="h-3.5 w-3.5" /> Pause</button>}
          {isOnHold && <button onClick={() => runAction('resume')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" /> Resume</button>}
          {isInProgress && <button onClick={() => runAction('resolve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</button>}
          {isResolved && <button onClick={() => runAction('close')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Close</button>}
          {!isClosed && <button onClick={() => runAction('escalate')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"><AlertTriangle className="h-3.5 w-3.5" /> Escalate</button>}
          {!data.is_rma && !isClosed && <button onClick={convertToRMA} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"><Send className="h-3.5 w-3.5" /> Convert to RMA</button>}
          {!isClosed && <button onClick={() => setCommentModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><MessageSquare className="h-3.5 w-3.5" /> Comment</button>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Ticket Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Ticket', data.name],
                [<Tag key="cat" className="h-3.5 w-3.5" />, 'Category', data.category?.replace(/_/g, ' ')],
                [<AlertTriangle key="pri" className="h-3.5 w-3.5" />, 'Priority', data.priority],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
                [<Hash key="sn" className="h-3.5 w-3.5" />, 'Asset Serial', data.asset_serial_no],
                [<Shield key="sla" className="h-3.5 w-3.5" />, 'SLA Profile', data.sla_profile],
                [<User key="rb" className="h-3.5 w-3.5" />, 'Raised By', data.raised_by],
                [<Calendar key="ro" className="h-3.5 w-3.5" />, 'Raised On', formatDateTime(data.raised_on)],
                [<User key="at" className="h-3.5 w-3.5" />, 'Assigned To', data.assigned_to],
                [<Calendar key="res" className="h-3.5 w-3.5" />, 'Resolved On', formatDateTime(data.resolved_on)],
                [<Calendar key="cl" className="h-3.5 w-3.5" />, 'Closed On', formatDateTime(data.closed_on)],
                [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
                [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                  <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
                </div>
              ))}
            </dl>
            {data.escalation_level != null && data.escalation_level > 0 && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-rose-500" /><span className="text-rose-700 font-medium">Escalation Level {data.escalation_level}</span></div>
              </div>
            )}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Description & Resolution</h3></div>
          <div className="card-body space-y-4">
            {data.description ? (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{data.description}</div>
            ) : (
              <p className="text-sm text-gray-400 italic">No description provided</p>
            )}
            {data.resolution_notes && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h4 className="text-sm font-medium text-emerald-800 mb-2">Resolution Notes</h4>
                <div className="prose prose-sm max-w-none text-emerald-700 whitespace-pre-wrap">{data.resolution_notes}</div>
              </div>
            )}
          </div>
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

      <LinkedRecordsPanel links={[
        ...(data.is_rma ? [{ label: 'RMA Tracker', doctype: 'GE RMA Tracker', method: 'frappe.client.get_list', args: { doctype: 'GE RMA Tracker', filters: JSON.stringify({ linked_ticket: data.name }), fields: JSON.stringify(['name', 'rma_status', 'warranty_status', 'aging_days']), limit_page_length: '10' }, href: (name: string) => `/rma/${name}` }] : []),
      ]} />

      <TraceabilityPanel projectId={data.linked_project} siteId={data.linked_site} />

      <RecordDocumentsPanel referenceDoctype="GE Ticket" referenceName={ticketName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Ticket" subjectName={ticketName} compact={false} initialLimit={10} /></div></div>

      <ActionModal open={assignModal} title="Assign Ticket" description={`Assign ticket ${data.name} to a team member.`} variant="default" confirmLabel="Assign" busy={actionBusy === 'assign'} fields={[{ name: 'assigned_to', label: 'Assign To', type: 'text', required: true, placeholder: 'User email or ID' }]} onConfirm={async (values) => { await runAction('assign', { assigned_to: values.assigned_to || '' }); setAssignModal(false); }} onCancel={() => setAssignModal(false)} />

      <ActionModal open={commentModal} title="Add Comment" description={`Add a comment to ticket ${data.name}.`} variant="default" confirmLabel="Post Comment" busy={actionBusy === 'comment'} fields={[{ name: 'comment', label: 'Comment', type: 'textarea', required: true, placeholder: 'Enter your comment...' }]} onConfirm={async (values) => { await runAction('comment', { comment: values.comment || '' }); setCommentModal(false); }} onCancel={() => setCommentModal(false)} />
    </div>
  );
}
