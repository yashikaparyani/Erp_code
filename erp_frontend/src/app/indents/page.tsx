'use client';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Plus, Clock, CheckCircle2, ShoppingCart, X } from 'lucide-react';
import { AccountabilityTimeline } from '../../components/accountability/AccountabilityTimeline';
import { useRole } from '../../context/RoleContext';
import ActionModal from '@/components/ui/ActionModal';

interface Indent {
  name: string;
  material_request_type?: string;
  transaction_date?: string;
  schedule_date?: string;
  status?: string;
  company?: string;
  set_warehouse?: string;
  docstatus?: number;
  per_ordered?: number;
  creation?: string;
  project?: string | null;
  projects?: string[];
  accountability_status?: string;
  accountability_owner_role?: string;
  accountability_owner_user?: string;
  accountability_latest_event?: string;
  accountability_assigned_to_role?: string;
  accountability_assigned_to_user?: string;
  accountability_is_blocked?: 0 | 1;
  accountability_blocking_reason?: string;
  accountability_escalated_to_role?: string;
  accountability_escalated_to_user?: string;
  accountability_submitted_by?: string;
}

interface IndentStats {
  total?: number;
  draft?: number;
  pending?: number;
  partially_ordered?: number;
  ordered?: number;
  transferred?: number;
  cancelled?: number;
}

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    Draft: 'badge-yellow',
    Pending: 'badge-blue',
    Submitted: 'badge-blue',
    Acknowledged: 'badge-purple',
    Accepted: 'badge-green',
    Rejected: 'badge-red',
    'Returned for Revision': 'badge-yellow',
    Escalated: 'badge-purple',
    'Partially Ordered': 'badge-purple',
    Ordered: 'badge-green',
    Transferred: 'badge-green',
    Cancelled: 'badge-red',
  };
  return map[status || ''] || 'badge-gray';
}

export default function IndentsPage() {
  const { currentRole } = useRole();
  const [items, setItems] = useState<Indent[]>([]);
  const [stats, setStats] = useState<IndentStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actingOn, setActingOn] = useState('');
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ material_request_type: 'Purchase', set_warehouse: '', schedule_date: '', project: '' });
  const [reasonModal, setReasonModal] = useState<{ name: string; action: string; label: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [listRes, statsRes] = await Promise.all([
      fetch('/api/indents').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/indents/stats').then(r => r.json()).catch(() => ({ data: {} })),
    ]);
    setItems(listRes.data || []);
    setStats(statsRes.data || {});
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/indents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to create indent');
      setShowCreate(false);
      setForm({ material_request_type: 'Purchase', set_warehouse: '', schedule_date: '', project: '' });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create indent');
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (method: string, args: Record<string, string>) => {
    setError('');
    setActingOn(args.name || method);
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, args }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || `Failed to run ${method}`);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to run ${method}`);
    } finally {
      setActingOn('');
    }
  };



  const approvalRoles = new Set(['Project Head', 'Director', 'Department Head']);

  const getWorkflowStatus = (item: Indent) => item.accountability_status || item.status || 'Draft';

  const canSubmit = (item: Indent) =>
    item.docstatus === 0 && new Set(['Procurement Manager', 'Purchase', 'Project Head', 'Director']).has(currentRole || '');

  const canAcknowledge = (item: Indent) =>
    approvalRoles.has(currentRole || '') && getWorkflowStatus(item) === 'Submitted';

  const canAcceptOrReject = (item: Indent) =>
    approvalRoles.has(currentRole || '') && ['Submitted', 'Acknowledged', 'Escalated'].includes(getWorkflowStatus(item));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Material Indents</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Raise material requirements from project sites.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Create Indent</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><ClipboardList className="w-5 h-5" /></div><div><div className="stat-value">{stats.total ?? items.length}</div><div className="stat-label">Total Indents</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{stats.draft ?? 0}</div><div className="stat-label">Draft</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600"><ClipboardList className="w-5 h-5" /></div><div><div className="stat-value">{stats.pending ?? 0}</div><div className="stat-label">Pending</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></div><div><div className="stat-value">{stats.ordered ?? 0}</div><div className="stat-label">Ordered</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600"><ShoppingCart className="w-5 h-5" /></div><div><div className="stat-value">{(stats.partially_ordered ?? 0) + (stats.transferred ?? 0)}</div><div className="stat-label">In Progress</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Indents</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Indent #</th><th>Project</th><th>Type</th><th>Date</th><th>Required By</th><th>Warehouse</th><th>Workflow</th><th>Action Owner</th><th>% Ordered</th><th>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">No indent records found</td></tr>
              ) : items.map(item => (
                <Fragment key={item.name}>
                  <tr key={item.name}>
                    <td><Link href={`/indents/${encodeURIComponent(item.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{item.name}</Link></td>
                    <td>
                      <div className="text-sm text-gray-700">{item.project || item.projects?.join(', ') || '-'}</div>
                    </td>
                    <td><div className="text-sm text-gray-700">{item.material_request_type || '-'}</div></td>
                    <td><div className="text-sm text-gray-700">{item.transaction_date || '-'}</div></td>
                    <td><div className="text-sm text-gray-700">{item.schedule_date || '-'}</div></td>
                    <td><div className="text-sm text-gray-700">{item.set_warehouse || '-'}</div></td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className={`badge ${statusBadge(getWorkflowStatus(item))}`}>{getWorkflowStatus(item)}</span>
                        {item.accountability_is_blocked ? (
                          <span className="text-xs text-red-600">{item.accountability_blocking_reason || 'Blocked'}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-700">
                        {item.accountability_owner_user || item.accountability_assigned_to_user || '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.accountability_owner_role || item.accountability_assigned_to_role || '-'}
                      </div>
                    </td>
                    <td><div className="text-sm text-gray-700">{item.per_ordered?.toFixed(0) ?? 0}%</div></td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn btn-secondary !px-3 !py-1.5 !text-xs"
                          onClick={() => setExpandedTrace(expandedTrace === item.name ? null : item.name)}
                        >
                          {expandedTrace === item.name ? 'Hide Trace' : 'Trace'}
                        </button>
                        {canSubmit(item) ? (
                          <button
                            className="btn btn-primary !px-3 !py-1.5 !text-xs"
                            disabled={actingOn === item.name}
                            onClick={() => void runAction('submit_indent', { name: item.name })}
                          >
                            Submit
                          </button>
                        ) : null}
                        {canAcknowledge(item) ? (
                          <button
                            className="btn btn-secondary !px-3 !py-1.5 !text-xs"
                            disabled={actingOn === item.name}
                            onClick={() => void runAction('acknowledge_indent', { name: item.name })}
                          >
                            Acknowledge
                          </button>
                        ) : null}
                        {canAcceptOrReject(item) ? (
                          <>
                            <button
                              className="btn btn-primary !px-3 !py-1.5 !text-xs"
                              disabled={actingOn === item.name}
                              onClick={() => void runAction('accept_indent', { name: item.name })}
                            >
                              Accept
                            </button>
                            <button
                              className="btn btn-secondary !px-3 !py-1.5 !text-xs"
                              disabled={actingOn === item.name}
                              onClick={() => setReasonModal({ name: item.name, action: 'reject_indent', label: `Reject ${item.name}` })}
                            >
                              Reject
                            </button>
                            <button
                              className="btn btn-secondary !px-3 !py-1.5 !text-xs"
                              disabled={actingOn === item.name}
                              onClick={() => setReasonModal({ name: item.name, action: 'return_indent', label: `Return ${item.name} for revision` })}
                            >
                              Return
                            </button>
                            {currentRole === 'Project Head' || currentRole === 'Director' ? (
                              <button
                                className="btn btn-secondary !px-3 !py-1.5 !text-xs"
                                disabled={actingOn === item.name}
                                onClick={() => setReasonModal({ name: item.name, action: 'escalate_indent', label: `Escalate ${item.name}` })}
                              >
                                Escalate
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {expandedTrace === item.name ? (
                    <tr key={`${item.name}-trace`}>
                      <td colSpan={10} className="bg-slate-50">
                        <div className="p-4">
                          <AccountabilityTimeline subjectDoctype="Material Request" subjectName={item.name} compact={false} initialLimit={6} />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div><h2 className="text-lg font-semibold text-gray-900">Create Indent</h2><p className="text-sm text-gray-500 mt-1">Raise a material requirement from a project site.</p></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Type</div><select className="input" value={form.material_request_type} onChange={e => setForm({ ...form, material_request_type: e.target.value })}><option value="Purchase">Purchase</option><option value="Material Transfer">Material Transfer</option><option value="Material Issue">Material Issue</option></select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project</div><input className="input" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Warehouse</div><input className="input" value={form.set_warehouse} onChange={e => setForm({ ...form, set_warehouse: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Required By</div><input className="input" type="date" value={form.schedule_date} onChange={e => setForm({ ...form, schedule_date: e.target.value })} /></label>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Indent'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reason Modal for reject / return / escalate */}
      <ActionModal
        open={!!reasonModal}
        title={reasonModal?.label || 'Provide Justification'}
        description="Please enter a written justification for this action."
        variant={reasonModal?.action === 'reject_indent' ? 'danger' : 'default'}
        confirmLabel={reasonModal?.action === 'reject_indent' ? 'Reject' : reasonModal?.action === 'return_indent' ? 'Return' : 'Escalate'}
        fields={[{ name: 'reason', label: 'Justification', type: 'textarea' as const, required: true, placeholder: 'Written justification…' }]}
        busy={!!actingOn}
        onConfirm={async (values) => {
          if (!reasonModal || !values.reason?.trim()) return;
          await runAction(reasonModal.action, { name: reasonModal.name, reason: values.reason.trim() });
          setReasonModal(null);
        }}
        onCancel={() => setReasonModal(null)}
      />
    </div>
  );
}
