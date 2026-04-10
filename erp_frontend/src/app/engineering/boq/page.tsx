'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileSpreadsheet, IndianRupee, RefreshCw, Plus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ActionModal from '@/components/ui/ActionModal';

type Boq = {
  name: string;
  linked_tender?: string;
  linked_project?: string;
  version?: number;
  status?: string;
  total_amount?: number;
  total_items?: number;
  approved_by?: string;
  approved_at?: string;
  creation?: string;
};

type BoqStats = {
  total?: number;
  draft?: number;
  pending_approval?: number;
  approved?: number;
  rejected?: number;
  total_value?: number;
};

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING_APPROVAL: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-error',
};

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function EngineeringBoqPage() {
  const { currentUser } = useAuth();
  const [boqs, setBoqs] = useState<Boq[]>([]);
  const [stats, setStats] = useState<BoqStats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingName, setActionLoadingName] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ linked_tender: '', linked_project: '', description: '' });

  const hasAnyRole = (...roles: string[]) => {
    const assigned = new Set(currentUser?.roles || []);
    return roles.some((role) => assigned.has(role));
  };

  const canCreateOrSubmit = hasAnyRole(
    'System Manager',
    'Presales Tendering Head',
    'Presales Executive',
  );

  const canApproveReject = hasAnyRole(
    'Director',
    'System Manager',
    'Department Head',
    'Project Head',
  );

  const loadData = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [boqRes, statsRes] = await Promise.all([
        fetch('/api/boqs').then((response) => response.json()).catch(() => ({ data: [] })),
        fetch('/api/boqs/stats').then((response) => response.json()).catch(() => ({ data: {} })),
      ]);
      setBoqs(boqRes.data || []);
      setStats(statsRes.data || {});
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load BOQ workspace');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const approvalQueue = useMemo(
    () => boqs.filter((boq) => boq.status === 'PENDING_APPROVAL'),
    [boqs],
  );

  const draftBacklog = useMemo(
    () => boqs.filter((boq) => boq.status === 'DRAFT'),
    [boqs],
  );

  const latestApproved = useMemo(
    () => boqs.filter((boq) => boq.status === 'APPROVED').slice(0, 5),
    [boqs],
  );

  const runBoqAction = async (boqName: string, action: 'submit' | 'approve' | 'reject' | 'revise' | 'delete', extra?: Record<string, string>) => {
    setActionLoadingName(boqName);
    setError('');

    try {
      if (action === 'delete') {
        const response = await fetch('/api/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'delete_boq', args: { name: boqName } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || 'Failed to delete BOQ');
      } else {
        let payload: Record<string, string> = { action, ...extra };

        const response = await fetch(`/api/boqs/${encodeURIComponent(boqName)}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result.message || `Failed to ${action} BOQ`);
        }
      }

      await loadData(false);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action} BOQ`);
    } finally {
      setActionLoadingName(null);
    }
  };

  const handleCreateBoq = async () => {
    if (!createForm.linked_tender.trim()) { setError('Linked Tender is required.'); return; }
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/boqs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) throw new Error(result.message || 'Failed to create BOQ');
      setShowCreate(false);
      setCreateForm({ linked_tender: '', linked_project: '', description: '' });
      await loadData(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create BOQ'); }
    finally { setCreating(false); }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-900 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Engineering Control</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">BOQ Workspace</h1>
              <p className="mt-2 text-sm text-slate-200">
                This page is now a dedicated BOQ review surface for approval queue, draft backlog, and latest approved versions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canCreateOrSubmit && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="btn bg-emerald-400 text-slate-900 hover:bg-emerald-300 border-0"
                >
                  <Plus className="w-4 h-4" />
                  Create BOQ
                </button>
              )}
              <Link href="/engineering" className="btn bg-white/10 text-white hover:bg-white/20 border-0">
                Open Engineering Hub
              </Link>
              <button
                onClick={() => loadData(false)}
                disabled={refreshing}
                className="btn bg-cyan-400 text-slate-900 hover:bg-cyan-300 border-0"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <FileSpreadsheet className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? boqs.length}</div>
              <div className="stat-label">Total BOQs</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Clock3 className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <div className="stat-value">{stats.pending_approval ?? approvalQueue.length}</div>
              <div className="stat-label">Awaiting Approval</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <div className="stat-value">{stats.approved ?? latestApproved.length}</div>
              <div className="stat-label">Approved Versions</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <IndianRupee className="h-5 w-5 text-violet-700" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.total_value)}</div>
              <div className="stat-label">Portfolio Value</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr] mb-6">
        <div className="card">
          <div className="card-header flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Approval Queue</h2>
              <p className="text-sm text-gray-500">Focused list for reviewers instead of generic engineering page duplication.</p>
            </div>
            <span className="badge badge-warning">{approvalQueue.length} pending</span>
          </div>
          <div className="card-body space-y-3">
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading queue...</div>
            ) : approvalQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                No BOQs are waiting for approval right now.
              </div>
            ) : (
              approvalQueue.map((boq) => (
                <div key={boq.name} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{boq.name}</h3>
                        <span className="badge badge-warning">{boq.status || 'PENDING_APPROVAL'}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {boq.linked_project || 'No linked project'} · {boq.linked_tender || 'No linked tender'}
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        Version {boq.version || 1} · {boq.total_items || 0} items · {formatCurrency(boq.total_amount)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canApproveReject ? (
                        <>
                          <button
                            className="btn btn-success"
                            disabled={actionLoadingName === boq.name}
                            onClick={() => runBoqAction(boq.name, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            disabled={actionLoadingName === boq.name}
                            onClick={() => setRejectTarget(boq.name)}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">Approval actions are role-restricted.</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Draft Backlog</h2>
            </div>
            <div className="card-body space-y-3">
              {draftBacklog.length === 0 ? (
                <p className="text-sm text-gray-500">No draft BOQs pending submission.</p>
              ) : (
                draftBacklog.slice(0, 5).map((boq) => (
                  <div key={boq.name} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900">{boq.name}</div>
                        <div className="text-xs text-gray-500">{boq.linked_tender || 'No tender linked'}</div>
                      </div>
                      {canCreateOrSubmit ? (
                        <button
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                          disabled={actionLoadingName === boq.name}
                          onClick={() => runBoqAction(boq.name, 'submit')}
                        >
                          Submit
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Latest Approved</h2>
            </div>
            <div className="card-body space-y-3">
              {latestApproved.length === 0 ? (
                <p className="text-sm text-gray-500">Approved BOQs will appear here.</p>
              ) : (
                latestApproved.map((boq) => (
                  <div key={boq.name} className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                    <div className="font-medium text-gray-900">{boq.name}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      Approved by {boq.approved_by || 'system'} on {formatDate(boq.approved_at || boq.creation)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {boq.total_items || 0} items · {formatCurrency(boq.total_amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Full BOQ Register</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading BOQ register...</div>
          ) : boqs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No BOQ records found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>BOQ</th>
                  <th>Tender / Project</th>
                  <th>Version</th>
                  <th>Items</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {boqs.map((boq) => (
                  <tr key={boq.name}>
                    <td>
                      <div className="font-medium text-gray-900">{boq.name}</div>
                      <div className="text-xs text-gray-500">{formatDate(boq.creation)}</div>
                    </td>
                    <td>
                      <div className="text-gray-700">{boq.linked_project || '-'}</div>
                      <div className="text-xs text-gray-400">{boq.linked_tender || '-'}</div>
                    </td>
                    <td>v{boq.version || 1}</td>
                    <td>{boq.total_items || 0}</td>
                    <td className="font-medium text-gray-900">{formatCurrency(boq.total_amount)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGES[boq.status || ''] || 'badge-gray'}`}>
                        {boq.status || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {boq.status === 'DRAFT' && canCreateOrSubmit ? (
                          <button
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                            disabled={actionLoadingName === boq.name}
                            onClick={() => runBoqAction(boq.name, 'submit')}
                          >
                            Submit
                          </button>
                        ) : null}
                        {boq.status === 'PENDING_APPROVAL' && canApproveReject ? (
                          <>
                            <button
                              className="text-sm font-medium text-green-600 hover:text-green-700"
                              disabled={actionLoadingName === boq.name}
                              onClick={() => runBoqAction(boq.name, 'approve')}
                            >
                              Approve
                            </button>
                            <button
                              className="text-sm font-medium text-red-600 hover:text-red-700"
                              disabled={actionLoadingName === boq.name}
                              onClick={() => setRejectTarget(boq.name)}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {(boq.status === 'APPROVED' || boq.status === 'REJECTED') && canCreateOrSubmit ? (
                          <button
                            className="text-sm font-medium text-purple-600 hover:text-purple-700"
                            disabled={actionLoadingName === boq.name}
                            onClick={() => runBoqAction(boq.name, 'revise')}
                          >
                            Revise
                          </button>
                        ) : null}
                        {(boq.status === 'DRAFT' || boq.status === 'REJECTED') && canCreateOrSubmit ? (
                          <button
                            className="text-sm font-medium text-gray-500 hover:text-red-600"
                            disabled={actionLoadingName === boq.name}
                            onClick={() => { if (confirm(`Delete BOQ ${boq.name}?`)) runBoqAction(boq.name, 'delete'); }}
                          >
                            Delete
                          </button>
                        ) : null}
                        {!canCreateOrSubmit && !canApproveReject ? (
                          <span className="text-xs text-gray-500">View only</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <ActionModal
        open={!!rejectTarget}
        title={`Reject BOQ ${rejectTarget}`}
        description="Provide a reason for rejecting this BOQ."
        variant="danger"
        confirmLabel="Reject"
        fields={[{ name: 'reason', label: 'Reject Reason', type: 'textarea' as const, placeholder: 'Reason for rejection…' }]}
        busy={!!actionLoadingName}
        onConfirm={async (values) => {
          if (!rejectTarget) return;
          await runBoqAction(rejectTarget, 'reject', { reason: values.reason || '' });
          setRejectTarget(null);
        }}
        onCancel={() => setRejectTarget(null)}
      />

      {/* Create BOQ modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-lg font-semibold">Create BOQ</h2><button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-6 grid grid-cols-1 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Linked Tender *</label><input className="input" value={createForm.linked_tender} onChange={e => setCreateForm(p => ({ ...p, linked_tender: e.target.value }))} placeholder="Tender ID" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Linked Project</label><input className="input" value={createForm.linked_project} onChange={e => setCreateForm(p => ({ ...p, linked_project: e.target.value }))} placeholder="Project ID" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="input min-h-20" value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} placeholder="BOQ description…" /></div>
            </div>
            {error && <p className="px-6 pb-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateBoq} disabled={creating}>{creating ? 'Creating…' : 'Create BOQ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
