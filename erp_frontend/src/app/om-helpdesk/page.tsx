'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import RegisterPage, { StatItem } from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import {
  callApi, formatDate, badge, hasAnyRole, useAuth,
  TICKET_BADGES, PRIORITY_BADGES,
} from '@/components/om/om-helpers';

interface Ticket {
  name: string;
  title?: string;
  linked_project?: string;
  linked_site?: string;
  asset_serial_no?: string;
  category?: string;
  priority?: string;
  status?: string;
  raised_by?: string;
  raised_on?: string;
  assigned_to?: string;
  is_rma?: boolean;
}

export default function OMHelpdeskPage() {
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await callApi<Ticket[]>('/api/tickets');
      setTickets(Array.isArray(data) ? data : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load tickets'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const canManage = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'OM Operator');
  const projectFilter = (searchParams?.get('project') || '').trim();
  const visibleTickets = projectFilter
    ? tickets.filter((ticket) => (ticket.linked_project || '').toLowerCase() === projectFilter.toLowerCase())
    : tickets;

  const total = visibleTickets.length;
  const open = visibleTickets.filter(t => t.status === 'NEW' || t.status === 'ASSIGNED').length;
  const inProgress = visibleTickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ON_HOLD').length;
  const resolved = visibleTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const critical = visibleTickets.filter(t => t.priority === 'CRITICAL').length;

  const stats: StatItem[] = [
    { label: 'Total Tickets', value: total },
    { label: 'Open', value: open, variant: 'error' },
    { label: 'In Progress', value: inProgress, variant: 'warning' },
    { label: 'Resolved / Closed', value: resolved, variant: 'success' },
    { label: 'Critical', value: critical, variant: 'error' },
  ];

  const ticketAction = async (name: string, action: string) => {
    setBusyId(name);
    try {
      await callApi(`/api/tickets/${encodeURIComponent(name)}/actions`, { method: 'POST', body: { action } });
      await load();
    } catch { /* ignore */ }
    setBusyId(null);
  };

  const convertToRMA = async (t: Ticket) => {
    setBusyId(t.name);
    try {
      await callApi(`/api/tickets/${encodeURIComponent(t.name)}/convert-rma`, { method: 'POST', body: { linked_project: t.linked_project || '', asset_serial_number: t.asset_serial_no || '', failure_reason: t.title || '' } });
      await load();
    } catch { /* ignore */ }
    setBusyId(null);
  };

  return (
    <>
      <RegisterPage
        title="O&M & Helpdesk"
        description={projectFilter ? `Operations, maintenance, and ticket management for ${projectFilter}` : 'Operations, maintenance, and ticket management'}
        loading={loading}
        error={error}
        empty={!loading && visibleTickets.length === 0}
        emptyTitle="No tickets"
        emptyDescription="No helpdesk tickets found"
        onRetry={load}
        stats={stats}
        headerActions={
          canManage ? <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Ticket</button> : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Title</th>
                <th>Site</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Raised</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visibleTickets.map(t => {
                const st = t.status || 'NEW';
                return (
                  <tr key={t.name}>
                    <td><Link href={`/om-helpdesk/${encodeURIComponent(t.name)}`} className="font-medium text-blue-700 hover:underline">{t.name}</Link></td>
                    <td className="max-w-xs truncate">{t.title || '-'}</td>
                    <td className="text-gray-600">{t.linked_site || '-'}</td>
                    <td><span className="badge badge-info">{t.category || '-'}</span></td>
                    <td><span className={`badge ${badge(PRIORITY_BADGES, t.priority)}`}>{t.priority || '-'}</span></td>
                    <td>{t.assigned_to || '-'}</td>
                    <td className="text-gray-600">{formatDate(t.raised_on)}</td>
                    <td><span className={`badge ${badge(TICKET_BADGES, st)}`}>{st.replace(/_/g, ' ')}</span></td>
                    {canManage && (
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {!t.is_rma && st !== 'CLOSED' && <button onClick={() => convertToRMA(t)} disabled={busyId === t.name} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50">RMA</button>}
                          {st === 'NEW' && <button onClick={() => setAssignTarget(t.name)} className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100">Assign</button>}
                          {(st === 'NEW' || st === 'ASSIGNED') && <button onClick={() => ticketAction(t.name, 'start')} disabled={busyId === t.name} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50">Start</button>}
                          {st === 'IN_PROGRESS' && <button onClick={() => ticketAction(t.name, 'resolve')} disabled={busyId === t.name} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50">Resolve</button>}
                          {st === 'ON_HOLD' && <button onClick={() => ticketAction(t.name, 'resume')} disabled={busyId === t.name} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50">Resume</button>}
                          {st === 'RESOLVED' && <button onClick={() => ticketAction(t.name, 'close')} disabled={busyId === t.name} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">Close</button>}
                          {st !== 'CLOSED' && <button onClick={() => setCommentTarget(t.name)} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100">Comment</button>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      <FormModal
        open={showCreate}
        title="Create Ticket"
        description="Raise a new helpdesk ticket"
        size="lg"
        busy={createBusy}
        confirmLabel="Create"
        fields={[
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'category', label: 'Category', type: 'select', defaultValue: 'OTHER', options: [
            { value: 'HARDWARE_ISSUE', label: 'Hardware Issue' }, { value: 'SOFTWARE_ISSUE', label: 'Software Issue' },
            { value: 'NETWORK_ISSUE', label: 'Network Issue' }, { value: 'PERFORMANCE', label: 'Performance' },
            { value: 'MAINTENANCE', label: 'Maintenance' }, { value: 'OTHER', label: 'Other' },
          ]},
          { name: 'priority', label: 'Priority', type: 'select', defaultValue: 'MEDIUM', options: [
            { value: 'CRITICAL', label: 'Critical' }, { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' }, { value: 'LOW', label: 'Low' },
          ]},
          { name: 'linked_project', label: 'Project', type: 'link', linkEntity: 'project' as const, placeholder: 'Search project…' },
          { name: 'linked_site', label: 'Site', type: 'link', linkEntity: 'site' as const, placeholder: 'Search site…' },
          { name: 'asset_serial_no', label: 'Asset Serial No', type: 'text' },
          { name: 'description', label: 'Description', type: 'textarea' },
        ]}
        onConfirm={async (values) => {
          setCreateBusy(true);
          try {
            await callApi('/api/tickets', { method: 'POST', body: values });
            setShowCreate(false);
            await load();
          } catch { /* FormModal handles errors via throw */ }
          finally { setCreateBusy(false); }
        }}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal
        open={assignTarget !== null}
        title="Assign Ticket"
        description={`Assign ticket ${assignTarget} to a team member.`}
        confirmLabel="Assign"
        fields={[{ name: 'assigned_to', label: 'Assign To', type: 'text', required: true, placeholder: 'user@technosys.local' }]}
        onConfirm={async (values) => {
          await callApi(`/api/tickets/${encodeURIComponent(assignTarget!)}/actions`, { method: 'POST', body: { action: 'assign', assigned_to: values.assigned_to || '' } });
          setAssignTarget(null);
          load();
        }}
        onCancel={() => setAssignTarget(null)}
      />

      <ActionModal
        open={commentTarget !== null}
        title="Add Comment"
        description={`Add a comment to ticket ${commentTarget}.`}
        confirmLabel="Post Comment"
        fields={[{ name: 'notes', label: 'Comment', type: 'textarea', required: true, placeholder: 'Enter comment...' }]}
        onConfirm={async (values) => {
          await callApi(`/api/tickets/${encodeURIComponent(commentTarget!)}/actions`, { method: 'POST', body: { action: 'comment', notes: values.notes || '' } });
          setCommentTarget(null);
        }}
        onCancel={() => setCommentTarget(null)}
      />
    </>
  );
}
