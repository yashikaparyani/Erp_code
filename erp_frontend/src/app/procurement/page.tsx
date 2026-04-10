'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowRight, FolderTree } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { formatCurrency, badge, VC_BADGES } from '@/components/procurement/proc-helpers';
import { useAuth } from '@/context/AuthContext';

interface VC { name: string; linked_material_request?: string; linked_project?: string; linked_tender?: string; status?: string; recommended_supplier?: string; quote_count?: number; distinct_supplier_count?: number; selected_total_amount?: number; }
interface VCStats { total?: number; pending_approval?: number; approved?: number; three_quote_ready?: number; selected_total_amount?: number; }

function wsHref(p?: string) { return p ? `/projects/${encodeURIComponent(p)}?tab=ops` : null; }

export default function ProcurementPage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<VC[]>([]);
  const [stats, setStats] = useState<VCStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ name: string; action: string } | null>(null);

  const hasRole = (...roles: string[]) => roles.some(r => new Set(currentUser?.roles || []).has(r));
  const canSubmit = hasRole('Director', 'System Manager', 'Procurement Manager', 'Purchase');
  const canApprove = hasRole('Director', 'System Manager', 'Project Head', 'Department Head');
  const linkedProjects = new Set(items.map(i => i.linked_project).filter(Boolean)).size;

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [lr, sr] = await Promise.all([fetch('/api/vendor-comparisons').then(r => r.json()), fetch('/api/vendor-comparisons/stats').then(r => r.json())]);
      setItems(lr.data || []); setStats(sr.data || {});
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (v: Record<string, string>) => {
    if (!v.supplier?.trim() || !v.description?.trim()) { setError('Supplier & Description required'); return; }
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/vendor-comparisons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linked_tender: v.linked_tender || undefined, linked_project: v.linked_project || undefined, recommended_supplier: v.supplier, notes: v.notes || undefined, quotes: [{ supplier: v.supplier, description: v.description, qty: Number(v.qty) || 1, rate: Number(v.rate) || 0, is_selected: 1 }] }) });
      const p = await res.json(); if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      setShowCreate(false); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setCreating(false); }
  };

  const runAction = async (name: string, action: string, extra?: Record<string, unknown>) => {
    setActionBusy(name); setError('');
    try {
      const res = await fetch(`/api/vendor-comparisons/${encodeURIComponent(name)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
      const p = await res.json(); if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionBusy(null); }
  };

  return (
    <RegisterPage
      title="Procurement"
      description="Vendor comparisons, approvals, and project-linked procurement workspace"
      loading={loading} error={error} onRetry={load}
      stats={[
        { label: 'Selected Value', value: formatCurrency(stats.selected_total_amount) },
        { label: 'Pending Approval', value: stats.pending_approval ?? 0 },
        { label: '3-Quote Ready', value: stats.three_quote_ready ?? 0 },
        { label: 'Approved', value: stats.approved ?? 0 },
      ]}
      headerActions={
        <div className="flex gap-2">
          <Link href="/procurement/projects" className="btn btn-secondary"><FolderTree className="w-4 h-4" />Project Workspace</Link>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />New Comparison</button>
        </div>
      }
    >
      {/* Workspace banner */}
      <div className="mb-6 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Project-style workflow</div>
            <h2 className="mt-2 text-lg font-semibold text-gray-900">Open procurement by project, not just by comparison row.</h2>
            <p className="mt-2 text-sm text-gray-600">Use the procurement workspace to click into project context first, then review sites, milestones, files, and activity.</p>
          </div>
          <Link href="/procurement/projects" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700">Open Workspace <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3"><div className="text-xs uppercase tracking-wide text-gray-500">Project-linked</div><div className="mt-1 text-2xl font-semibold">{linkedProjects}</div></div>
          <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3"><div className="text-xs uppercase tracking-wide text-gray-500">Pending approvals</div><div className="mt-1 text-2xl font-semibold">{stats.pending_approval ?? 0}</div></div>
          <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3"><div className="text-xs uppercase tracking-wide text-gray-500">Approved for PO</div><div className="mt-1 text-2xl font-semibold">{stats.approved ?? 0}</div></div>
        </div>
      </div>

      {/* Table */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Vendor Comparisons</h3></div>
        <table className="data-table text-sm">
          <thead><tr><th>ID</th><th>Material Request</th><th>Project / Tender</th><th>Suppliers</th><th>Recommended</th><th className="text-right">Selected Value</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No comparisons found</td></tr> : items.map(vc => (
              <tr key={vc.name}>
                <td><Link href={`/vendor-comparisons/${encodeURIComponent(vc.name)}`} className="font-medium text-blue-700 hover:underline">{vc.name}</Link></td>
                <td className="text-gray-900">{vc.linked_material_request || '-'}</td>
                <td>{wsHref(vc.linked_project) ? (<><Link href={wsHref(vc.linked_project)!} className="text-amber-700 hover:underline font-medium text-sm">{vc.linked_project}</Link><div className="text-xs text-gray-500">{vc.linked_tender || ''}</div></>) : <span className="text-gray-400">-</span>}</td>
                <td><div className="text-gray-600">{vc.distinct_supplier_count ?? 0} suppliers</div><div className="text-xs text-gray-500">{vc.quote_count ?? 0} quotes</div></td>
                <td className="text-gray-900">{vc.recommended_supplier || '-'}</td>
                <td className="text-right font-semibold">{formatCurrency(vc.selected_total_amount)}</td>
                <td><span className={`badge ${badge(VC_BADGES, vc.status)}`}>{vc.status}</span></td>
                <td>
                  <div className="flex flex-wrap gap-2 items-center">
                    {wsHref(vc.linked_project) ? <Link href={wsHref(vc.linked_project)!} className="text-blue-600 text-sm font-medium">Workspace</Link> : <span className="text-gray-400 text-sm">No project</span>}
                    {vc.status === 'DRAFT' && canSubmit && <button disabled={actionBusy === vc.name} onClick={() => runAction(vc.name, 'submit')} className="text-indigo-600 text-sm font-medium">Submit</button>}
                    {vc.status === 'DRAFT' && canSubmit && <button disabled={actionBusy === vc.name} onClick={() => { if (confirm(`Delete comparison ${vc.name}?`)) runAction(vc.name, 'delete'); }} className="text-gray-500 text-sm font-medium hover:text-red-600">Delete</button>}
                    {vc.status === 'PENDING_APPROVAL' && canApprove && (<><button disabled={actionBusy === vc.name} onClick={() => setPendingAction({ name: vc.name, action: 'approve' })} className="text-green-600 text-sm font-medium">Approve</button><button disabled={actionBusy === vc.name} onClick={() => setPendingAction({ name: vc.name, action: 'reject' })} className="text-red-600 text-sm font-medium">Reject</button></>)}
                    {(vc.status === 'APPROVED' || vc.status === 'REJECTED') && canSubmit && <button disabled={actionBusy === vc.name} onClick={() => runAction(vc.name, 'revise')} className="text-purple-600 text-sm font-medium">Revise</button>}
                    {vc.status === 'APPROVED' && canSubmit && <button disabled={actionBusy === vc.name} onClick={() => runAction(vc.name, 'create_po')} className="text-orange-600 text-sm font-medium">Create PO</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormModal
        open={showCreate}
        title="Create Vendor Comparison"
        description="Start a new vendor comparison."
        busy={creating}
        fields={[
          { name: 'linked_tender', label: 'Linked Tender', type: 'link' as const, linkEntity: 'tender' as const, placeholder: 'Search tender…' },
          { name: 'linked_project', label: 'Linked Project', type: 'link' as const, linkEntity: 'project' as const, placeholder: 'Search project…' },
          { name: 'supplier', label: 'Supplier', type: 'link' as const, linkEntity: 'vendor' as const, required: true, placeholder: 'Search supplier…' },
          { name: 'description', label: 'Description', type: 'text' as const, required: true },
          { name: 'qty', label: 'Qty', type: 'number' as const },
          { name: 'rate', label: 'Rate', type: 'number' as const },
          { name: 'notes', label: 'Notes', type: 'textarea' as const },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal
        open={!!pendingAction}
        title={pendingAction?.action === 'reject' ? `Reject ${pendingAction?.name}` : `Approve ${pendingAction?.name}`}
        description={pendingAction?.action === 'reject' ? 'Reason for rejection.' : 'Optional exception reason.'}
        variant={pendingAction?.action === 'reject' ? 'danger' : 'success'}
        confirmLabel={pendingAction?.action === 'reject' ? 'Reject' : 'Approve'}
        fields={pendingAction?.action === 'reject' ? [{ name: 'reason', label: 'Reason', type: 'textarea' as const }] : [{ name: 'exception_reason', label: 'Exception Reason', type: 'textarea' as const }]}
        busy={!!actionBusy}
        onConfirm={async v => { if (pendingAction) { await runAction(pendingAction.name, pendingAction.action, v); setPendingAction(null); } }}
        onCancel={() => setPendingAction(null)}
      />
    </RegisterPage>
  );
}
