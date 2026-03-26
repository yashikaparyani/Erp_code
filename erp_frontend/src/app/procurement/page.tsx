'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ShoppingCart, Truck, Clock, CheckCircle2, ArrowRight, FolderTree, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ActionModal from '@/components/ui/ActionModal';

interface VendorComparison {
  name: string;
  linked_material_request?: string;
  linked_rfq?: string;
  linked_project?: string;
  linked_tender?: string;
  status?: string;
  recommended_supplier?: string;
  quote_count?: number;
  distinct_supplier_count?: number;
  lowest_total_amount?: number;
  selected_total_amount?: number;
  approved_by?: string;
  approved_at?: string;
  creation?: string;
}

interface VCStats {
  total?: number;
  draft?: number;
  pending_approval?: number;
  approved?: number;
  rejected?: number;
  three_quote_ready?: number;
  selected_total_amount?: number;
}

function formatCurrency(val?: number): string {
  if (!val) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function getProjectWorkspaceHref(project?: string): string | null {
  if (!project) return null;
  return `/procurement/projects/${encodeURIComponent(project)}`;
}

export default function ProcurementPage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<VendorComparison[]>([]);
  const [stats, setStats] = useState<VCStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoadingName, setActionLoadingName] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ name: string; action: string } | null>(null);
  const [createForm, setCreateForm] = useState({
    linked_tender: '',
    linked_project: '',
    supplier: '',
    description: '',
    qty: 1,
    rate: 0,
    notes: '',
  });

  const hasAnyRole = (...roles: string[]) => {
    const assigned = new Set(currentUser?.roles || []);
    return roles.some((role) => assigned.has(role));
  };

  const canCreateOrSubmit = hasAnyRole('Director', 'System Manager', 'Procurement Manager', 'Purchase');
  const canApproveReject = hasAnyRole('Director', 'System Manager', 'Project Head', 'Department Head');
  const linkedProjectCount = new Set(items.map((item) => item.linked_project).filter(Boolean)).size;

  const loadData = async () => {
    setLoading(true);
    const [listRes, statsRes] = await Promise.all([
      fetch('/api/vendor-comparisons').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/vendor-comparisons/stats').then(r => r.json()).catch(() => ({ data: {} })),
    ]);
    setItems(listRes.data || []);
    setStats(statsRes.data || {});
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetCreateForm = () => {
    setCreateForm({
      linked_tender: '',
      linked_project: '',
      supplier: '',
      description: '',
      qty: 1,
      rate: 0,
      notes: '',
    });
    setCreateError('');
  };

  const handleCreateComparison = async () => {
    if (!createForm.supplier.trim()) {
      setCreateError('Supplier is required.');
      return;
    }
    if (!createForm.description.trim()) {
      setCreateError('Description is required.');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const payload = {
        linked_tender: createForm.linked_tender.trim() || undefined,
        linked_project: createForm.linked_project.trim() || undefined,
        recommended_supplier: createForm.supplier.trim(),
        notes: createForm.notes.trim() || undefined,
        quotes: [
          {
            supplier: createForm.supplier.trim(),
            description: createForm.description.trim(),
            qty: Number(createForm.qty) || 1,
            rate: Number(createForm.rate) || 0,
            is_selected: 1,
          },
        ],
      };

      const response = await fetch('/api/vendor-comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create comparison');
      }

      setShowCreateModal(false);
      resetCreateForm();
      await loadData();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create comparison');
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (name: string, action: 'submit' | 'approve' | 'reject' | 'revise' | 'create_po', extraPayload?: Record<string, unknown>) => {
    setActionError('');
    setActionLoadingName(name);
    try {
      const payload: Record<string, unknown> = { action, ...extraPayload };

      const response = await fetch(`/api/vendor-comparisons/${encodeURIComponent(name)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to ${action}`);
      }

      await loadData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Failed to ${action}`);
    } finally {
      setActionLoadingName(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Procurement</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Vendor comparisons, approvals, and project-linked procurement workspace</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link href="/procurement/projects" className="btn btn-secondary w-full sm:w-auto">
            <FolderTree className="w-4 h-4" />
            Project Workspace
          </Link>
          <button
            className="btn btn-primary w-full sm:w-auto"
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New Comparison
          </button>
        </div>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create Vendor Comparison</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Tender</label>
                <input className="input" value={createForm.linked_tender} onChange={(e) => setCreateForm((p) => ({ ...p, linked_tender: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Project</label>
                <input className="input" value={createForm.linked_project} onChange={(e) => setCreateForm((p) => ({ ...p, linked_project: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <input className="input" value={createForm.supplier} onChange={(e) => setCreateForm((p) => ({ ...p, supplier: e.target.value }))} placeholder="Exact Supplier name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input className="input" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label>
                <input className="input" type="number" min={1} step={1} value={createForm.qty} onChange={(e) => setCreateForm((p) => ({ ...p, qty: Number(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate *</label>
                <input className="input" type="number" min={0} step={0.01} value={createForm.rate} onChange={(e) => setCreateForm((p) => ({ ...p, rate: Number(e.target.value) || 0 }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input min-h-24" value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            {createError ? <p className="px-6 pb-2 text-sm text-red-600">{createError}</p> : null}

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={creating} onClick={handleCreateComparison}>
                {creating ? 'Creating...' : 'Create Comparison'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="mb-4 sm:mb-6 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Project-style workflow</div>
            <h2 className="mt-2 text-lg sm:text-xl font-semibold text-gray-900">Open procurement by project, not just by comparison row.</h2>
            <p className="mt-2 text-sm text-gray-600">
              Use the procurement workspace to click into project context first, then review sites, milestones, files, and activity with the same shell pattern as the main project workspace.
            </p>
          </div>
          <Link
            href="/procurement/projects"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Open Procurement Workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Project-linked comparisons</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{linkedProjectCount}</div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Pending approvals</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.pending_approval ?? 0}</div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Approved for PO</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.approved ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.selected_total_amount)}</div>
              <div className="stat-label">Total Selected Value</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{stats.total ?? items.length} comparisons</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="stat-value">{stats.pending_approval ?? 0}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Awaiting sign-off</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">{stats.three_quote_ready ?? 0}</div>
              <div className="stat-label">3-Quote Ready</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Compliant comparisons</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">{stats.approved ?? 0}</div>
              <div className="stat-label">Approved</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">Ready for PO</div>
        </div>
      </div>

      {/* Vendor Comparisons Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Vendor Comparisons</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Material Request</th>
                <th>Project / Tender</th>
                <th>Suppliers</th>
                <th>Recommended</th>
                <th>Selected Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No vendor comparisons found</td></tr>
              ) : items.map(vc => (
                <tr key={vc.name}>
                  <td>
                    <Link href={`/vendor-comparisons/${encodeURIComponent(vc.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{vc.name}</Link>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{vc.linked_material_request || '-'}</div>
                  </td>
                  <td>
                    {getProjectWorkspaceHref(vc.linked_project) ? (
                      <Link
                        href={getProjectWorkspaceHref(vc.linked_project)!}
                        className="text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline"
                      >
                        {vc.linked_project}
                      </Link>
                    ) : (
                      <div className="text-sm text-gray-900">-</div>
                    )}
                    <div className="text-xs text-gray-500">{vc.linked_tender || ''}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{vc.distinct_supplier_count ?? 0} suppliers</div>
                    <div className="text-xs text-gray-500">{vc.quote_count ?? 0} quotes</div>
                  </td>
                  <td>
                    <div className="text-gray-900">{vc.recommended_supplier || '-'}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{formatCurrency(vc.selected_total_amount)}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      vc.status === 'APPROVED' ? 'badge-success' : 
                      vc.status === 'PENDING_APPROVAL' ? 'badge-warning' :
                      vc.status === 'REJECTED' ? 'badge-error' :
                      'badge-gray'
                    }`}>
                      {vc.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2 items-center">
                      {getProjectWorkspaceHref(vc.linked_project) ? (
                        <Link
                          href={getProjectWorkspaceHref(vc.linked_project)!}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                          Open Workspace
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">No project link</span>
                      )}

                      {vc.status === 'DRAFT' && canCreateOrSubmit ? (
                        <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium" disabled={actionLoadingName === vc.name} onClick={() => runAction(vc.name, 'submit')}>
                          Submit
                        </button>
                      ) : null}

                      {vc.status === 'PENDING_APPROVAL' && canApproveReject ? (
                        <>
                          <button className="text-green-600 hover:text-green-800 text-sm font-medium" disabled={actionLoadingName === vc.name} onClick={() => setPendingAction({ name: vc.name, action: 'approve' })}>
                            Approve
                          </button>
                          <button className="text-red-600 hover:text-red-800 text-sm font-medium" disabled={actionLoadingName === vc.name} onClick={() => setPendingAction({ name: vc.name, action: 'reject' })}>
                            Reject
                          </button>
                        </>
                      ) : null}

                      {(vc.status === 'APPROVED' || vc.status === 'REJECTED') && canCreateOrSubmit ? (
                        <button className="text-purple-600 hover:text-purple-800 text-sm font-medium" disabled={actionLoadingName === vc.name} onClick={() => runAction(vc.name, 'revise')}>
                          Revise
                        </button>
                      ) : null}

                      {vc.status === 'APPROVED' && canCreateOrSubmit ? (
                        <button className="text-orange-600 hover:text-orange-800 text-sm font-medium" disabled={actionLoadingName === vc.name} onClick={() => runAction(vc.name, 'create_po')}>
                          Create PO
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve / Reject Modal */}
      <ActionModal
        open={!!pendingAction}
        title={pendingAction?.action === 'reject' ? `Reject ${pendingAction?.name}` : `Approve ${pendingAction?.name}`}
        description={pendingAction?.action === 'reject'
          ? 'Provide a reason for rejecting this vendor comparison.'
          : 'Optionally provide an exception reason for this approval.'}
        variant={pendingAction?.action === 'reject' ? 'danger' : 'success'}
        confirmLabel={pendingAction?.action === 'reject' ? 'Reject' : 'Approve'}
        fields={pendingAction?.action === 'reject'
          ? [{ name: 'reason', label: 'Reject Reason', type: 'textarea' as const, placeholder: 'Reason for rejection…' }]
          : [{ name: 'exception_reason', label: 'Exception Reason', type: 'textarea' as const, placeholder: 'Exception reason (optional)…' }]}
        busy={!!actionLoadingName}
        onConfirm={async (values) => {
          if (!pendingAction) return;
          await runAction(pendingAction.name, pendingAction.action as 'approve' | 'reject', values);
          setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
