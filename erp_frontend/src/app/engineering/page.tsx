'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, FileText, IndianRupee, Plus, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Boq = {
  name: string;
  linked_tender?: string;
  linked_project?: string;
  version?: number;
  status?: string;
  total_amount?: number;
  total_items?: number;
  created_by_user?: string;
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

export default function EngineeringPage() {
  const { currentUser } = useAuth();
  const [boqs, setBoqs] = useState<Boq[]>([]);
  const [stats, setStats] = useState<BoqStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoadingName, setActionLoadingName] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    linked_tender: '',
    linked_project: '',
    description: '',
    qty: 1,
    rate: 0,
    notes: '',
  });

  const refreshData = async () => {
    setLoading(true);
    const [boqRes, statsRes] = await Promise.all([
      fetch('/api/boqs').then((response) => response.json()).catch(() => ({ data: [] })),
      fetch('/api/boqs/stats').then((response) => response.json()).catch(() => ({ data: {} })),
    ]);
    setBoqs(boqRes.data || []);
    setStats(statsRes.data || {});
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const latestApproved = useMemo(() => {
    const approved = boqs.filter((boq) => boq.status === 'APPROVED');
    return approved.slice(0, 5);
  }, [boqs]);

  const hasAnyRole = (...roles: string[]) => {
    const assigned = new Set(currentUser?.roles || []);
    return roles.some((role) => assigned.has(role));
  };

  const canCreateOrSubmit = hasAnyRole(
    'Director',
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

  const resetCreateForm = () => {
    setCreateForm({
      linked_tender: '',
      linked_project: '',
      description: '',
      qty: 1,
      rate: 0,
      notes: '',
    });
    setCreateError('');
  };

  const handleCreateBoq = async () => {
    if (!createForm.linked_tender.trim()) {
      setCreateError('Linked Tender is required.');
      return;
    }
    if (!createForm.description.trim()) {
      setCreateError('At least one BOQ item description is required.');
      return;
    }

    setCreateError('');
    setCreating(true);

    try {
      const payload = {
        linked_tender: createForm.linked_tender.trim(),
        linked_project: createForm.linked_project.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
        items: [
          {
            description: createForm.description.trim(),
            qty: Number(createForm.qty) || 1,
            rate: Number(createForm.rate) || 0,
          },
        ],
      };

      const response = await fetch('/api/boqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create BOQ');
      }

      setShowCreateModal(false);
      resetCreateForm();
      await refreshData();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create BOQ');
    } finally {
      setCreating(false);
    }
  };

  const runBoqAction = async (boqName: string, action: 'submit' | 'approve' | 'reject' | 'revise') => {
    setActionError('');
    setActionLoadingName(boqName);
    try {
      let payload: Record<string, unknown> = { action };
      if (action === 'reject') {
        const reason = prompt('Reject reason (optional):') || '';
        payload = { action, reason };
      }

      const response = await fetch(`/api/boqs/${encodeURIComponent(boqName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to ${action} BOQ`);
      }

      await refreshData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Failed to ${action} BOQ`);
    } finally {
      setActionLoadingName(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Engineering & BOQ</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Live bill-of-quantity records and approval state from the backend.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            className="btn btn-primary flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" />
            Create BOQ
          </button>
          <button
            onClick={refreshData}
            disabled={loading}
            className="btn btn-secondary flex-1 sm:flex-none"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create BOQ</h2>
              <button
                className="p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Tender *</label>
                <input
                  className="input"
                  value={createForm.linked_tender}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, linked_tender: e.target.value }))}
                  placeholder="e.g. TEN-2026-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Project</label>
                <input
                  className="input"
                  value={createForm.linked_project}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, linked_project: e.target.value }))}
                  placeholder="Optional project id"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Description *</label>
                <input
                  className="input"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe first BOQ item"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  step={1}
                  value={createForm.qty}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, qty: Number(e.target.value) || 1 }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate *</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.01}
                  value={createForm.rate}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, rate: Number(e.target.value) || 0 }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="input min-h-24"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            {createError ? <p className="px-6 pb-2 text-sm text-red-600">{createError}</p> : null}

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateBoq} disabled={creating}>
                {creating ? 'Creating...' : 'Create BOQ'}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? boqs.length}</div>
              <div className="stat-label">Total BOQs</div>
            </div>
          </div>
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
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">{stats.pending_approval ?? 0}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.total_value)}</div>
              <div className="stat-label">Total BOQ Value</div>
            </div>
          </div>
        </div>
      </div>

      {latestApproved.length > 0 ? (
        <div className="card mb-4 sm:mb-6">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Latest Approved BOQs</h3>
          </div>
          <div className="card-body grid grid-cols-1 lg:grid-cols-2 gap-4">
            {latestApproved.map((boq) => (
              <div key={boq.name} className="rounded-lg border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900">{boq.name}</div>
                    <div className="text-sm text-gray-500">{boq.linked_project || boq.linked_tender || 'Unlinked BOQ'}</div>
                  </div>
                  <span className="badge badge-success">Approved</span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  Version {boq.version || 1} • {boq.total_items || 0} items • {formatCurrency(boq.total_amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">BOQ Register</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">Loading BOQ records...</div>
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
                  <th>Approved By</th>
                  <th>Actions</th>
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
                    <td>{boq.approved_by || '-'}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Link href="/engineering/boq" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                          Review
                        </Link>

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
                              onClick={() => runBoqAction(boq.name, 'reject')}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
