'use client';

import { Fragment, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import { useRole } from '@/context/RoleContext';
import { badge, INDENT_BADGES } from '@/components/procurement/proc-helpers';
import { indentApi } from '@/lib/typedApi';

/* ── types ───────────────────────────────────────────── */

interface Indent {
  name: string;
  material_request_type?: string;
  transaction_date?: string;
  schedule_date?: string;
  status?: string;
  set_warehouse?: string;
  docstatus?: number;
  per_ordered?: number;
  project?: string | null;
  projects?: string[];
  accountability_status?: string;
  accountability_owner_role?: string;
  accountability_owner_user?: string;
  accountability_assigned_to_role?: string;
  accountability_assigned_to_user?: string;
  accountability_is_blocked?: 0 | 1;
  accountability_blocking_reason?: string;
}

interface Stats { total?: number; draft?: number; pending?: number; partially_ordered?: number; ordered?: number; }

/* ── page ────────────────────────────────────────────── */

export default function IndentsPage() {
  const { currentRole } = useRole();
  const [items, setItems] = useState<Indent[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actingOn, setActingOn] = useState('');
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<{ name: string; action: string; label: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [l, s] = await Promise.all([
        apiFetch('/api/indents').catch(() => ({ data: [] })),
        apiFetch('/api/indents/stats').catch(() => ({ data: {} })),
      ]);
      setItems(l.data || []);
      setStats(s.data || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const run = async (method: string, args: Record<string, string>) => {
    setActingOn(args.name || method);
    setError('');
    try {
      await indentApi.action(args.name, method.replace(/_indent$/, ''), args.reason);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    finally { setActingOn(''); }
  };

  const approvalRoles = new Set(['Project Head', 'Director', 'Department Head']);
  const wf = (i: Indent) => i.accountability_status || i.status || 'Draft';
  const canSubmit = (i: Indent) => i.docstatus === 0 && new Set(['Procurement Manager', 'Purchase', 'Project Head', 'Director']).has(currentRole || '');
  const canAck = (i: Indent) => approvalRoles.has(currentRole || '') && wf(i) === 'Submitted';
  const canDecide = (i: Indent) => approvalRoles.has(currentRole || '') && ['Submitted', 'Acknowledged', 'Escalated'].includes(wf(i));

  return (
    <RegisterPage
      title="Material Indents"
      description="Raise material requirements from project sites."
      loading={loading}
      error={error}
      empty={!loading && items.length === 0}
      onRetry={load}
      stats={[
        { label: 'Total', value: stats.total ?? items.length },
        { label: 'Draft', value: stats.draft ?? 0, variant: 'warning' },
        { label: 'Pending', value: stats.pending ?? 0, variant: 'info' },
        { label: 'Ordered', value: stats.ordered ?? 0, variant: 'success' },
        { label: 'In Progress', value: (stats.partially_ordered ?? 0) },
      ]}
      headerActions={
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Create Indent
        </button>
      }
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>Indent #</th><th>Project</th><th>Type</th><th>Date</th><th>Required By</th>
            <th>Warehouse</th><th>Workflow</th><th>Action Owner</th><th>% Ordered</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <Fragment key={i.name}>
              <tr>
                <td><Link href={`/indents/${encodeURIComponent(i.name)}`} className="font-medium text-blue-700 hover:underline">{i.name}</Link></td>
                <td className="text-sm text-gray-700">{i.project || i.projects?.join(', ') || '-'}</td>
                <td className="text-sm text-gray-700">{i.material_request_type || '-'}</td>
                <td className="text-sm text-gray-700">{i.transaction_date || '-'}</td>
                <td className="text-sm text-gray-700">{i.schedule_date || '-'}</td>
                <td className="text-sm text-gray-700">{i.set_warehouse || '-'}</td>
                <td>
                  <span className={`badge ${badge(INDENT_BADGES, wf(i))}`}>{wf(i)}</span>
                  {i.accountability_is_blocked ? <span className="text-xs text-red-600 block">{i.accountability_blocking_reason || 'Blocked'}</span> : null}
                </td>
                <td>
                  <div className="text-sm text-gray-700">{i.accountability_owner_user || i.accountability_assigned_to_user || '-'}</div>
                  <div className="text-xs text-gray-500">{i.accountability_owner_role || i.accountability_assigned_to_role || '-'}</div>
                </td>
                <td className="text-sm text-gray-700">{i.per_ordered?.toFixed(0) ?? 0}%</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <button className="btn btn-secondary !px-2 !py-1 !text-xs" onClick={() => setExpandedTrace(expandedTrace === i.name ? null : i.name)}>
                      {expandedTrace === i.name ? 'Hide' : 'Trace'}
                    </button>
                    {canSubmit(i) && <button className="btn btn-primary !px-2 !py-1 !text-xs" disabled={!!actingOn} onClick={() => run('submit_indent', { name: i.name })}>Submit</button>}
                    {canAck(i) && <button className="btn btn-secondary !px-2 !py-1 !text-xs" disabled={!!actingOn} onClick={() => run('acknowledge_indent', { name: i.name })}>Ack</button>}
                    {canDecide(i) && (
                      <>
                        <button className="btn btn-primary !px-2 !py-1 !text-xs" disabled={!!actingOn} onClick={() => run('accept_indent', { name: i.name })}>Accept</button>
                        <button className="btn btn-secondary !px-2 !py-1 !text-xs" disabled={!!actingOn} onClick={() => setReasonModal({ name: i.name, action: 'reject_indent', label: `Reject ${i.name}` })}>Reject</button>
                        <button className="btn btn-secondary !px-2 !py-1 !text-xs" disabled={!!actingOn} onClick={() => setReasonModal({ name: i.name, action: 'return_indent', label: `Return ${i.name}` })}>Return</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              {expandedTrace === i.name && (
                <tr><td colSpan={10} className="bg-slate-50 p-4"><AccountabilityTimeline subjectDoctype="Material Request" subjectName={i.name} compact={false} initialLimit={6} /></td></tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <FormModal
        open={showCreate}
        title="Create Indent"
        description="Raise a material requirement from a project site."
        fields={[
          { name: 'material_request_type', label: 'Type', type: 'select', defaultValue: 'Purchase', options: [{ value: 'Purchase', label: 'Purchase' }, { value: 'Material Transfer', label: 'Material Transfer' }, { value: 'Material Issue', label: 'Material Issue' }] },
          { name: 'project', label: 'Project', type: 'link', linkEntity: 'project' as const },
          { name: 'set_warehouse', label: 'Warehouse', type: 'link', linkEntity: 'warehouse' as const },
          { name: 'item_code', label: 'Item', type: 'link', linkEntity: 'item' as const, required: true },
          { name: 'qty', label: 'Required Qty', type: 'number', required: true, defaultValue: '1' },
          { name: 'schedule_date', label: 'Required By', type: 'date' },
        ]}
        busy={creating}
        confirmLabel="Create Indent"
        onConfirm={async (vals) => {
          if (!vals.item_code?.trim()) { setError('Item is required'); return; }
          setCreating(true);
          setError('');
          try {
            const payload = {
              material_request_type: vals.material_request_type,
              project: vals.project?.trim() || undefined,
              set_warehouse: vals.set_warehouse?.trim() || undefined,
              schedule_date: vals.schedule_date || undefined,
              items: [{
                item_code: vals.item_code.trim(),
                qty: Number(vals.qty || '1') || 1,
                schedule_date: vals.schedule_date || undefined,
              }],
            };
            const res = await fetch('/api/indents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const p = await res.json().catch(() => ({}));
            if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
            setShowCreate(false);
            await load();
          } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
          finally { setCreating(false); }
        }}
        onCancel={() => setShowCreate(false)}
      />

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
          await run(reasonModal.action, { name: reasonModal.name, reason: values.reason.trim() });
          setReasonModal(null);
        }}
        onCancel={() => setReasonModal(null)}
      />
    </RegisterPage>
  );
}
