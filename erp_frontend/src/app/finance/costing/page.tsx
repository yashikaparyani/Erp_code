'use client';

import { useEffect, useState } from 'react';
import { Calculator, CircleDollarSign, Eye, FileSpreadsheet, Plus, TrendingDown, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type CostSheet = {
  name: string;
  linked_tender?: string;
  linked_project?: string;
  linked_boq?: string;
  version?: number;
  status?: string;
  margin_percent?: number;
  base_cost?: number;
  sell_value?: number;
  total_items?: number;
  created_by_user?: string;
  approved_by?: string;
};

type CostSheetStats = {
  total?: number;
  draft?: number;
  pending_approval?: number;
  approved?: number;
  rejected?: number;
  total_base_cost?: number;
  total_sell_value?: number;
};

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function FinanceCostingPage() {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState<CostSheet[]>([]);
  const [stats, setStats] = useState<CostSheetStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [actionLoadingName, setActionLoadingName] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    linked_tender: '',
    linked_boq: '',
    description: '',
    cost_type: 'Material',
    quantity: 1,
    rate: 0,
    remarks: '',
  });

  const hasAnyRole = (...roles: string[]) => {
    const assigned = new Set(currentUser?.roles || []);
    return roles.some((role) => assigned.has(role));
  };

  const canCreateOrSubmit = hasAnyRole('Director', 'System Manager', 'Accounts', 'Department Head');
  const canApproveReject = hasAnyRole('Director', 'System Manager', 'Department Head');

  const loadData = async () => {
    setLoading(true);
    Promise.all([
      fetch('/api/cost-sheets').then((response) => response.json()).catch(() => ({ data: [] })),
      fetch('/api/cost-sheets/stats').then((response) => response.json()).catch(() => ({ data: {} })),
    ])
      .then(([sheetRes, statsRes]) => {
        setRows(sheetRes.data || []);
        setStats(statsRes.data || {});
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCostSheet = async () => {
    if (!createForm.linked_tender.trim()) {
      setError('Linked Tender is required.');
      return;
    }
    if (!createForm.description.trim()) {
      setError('Description is required.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const payload = {
        linked_tender: createForm.linked_tender,
        linked_boq: createForm.linked_boq || undefined,
        notes: createForm.remarks || undefined,
        items: [
          {
            description: createForm.description.trim(),
            cost_type: createForm.cost_type,
            qty: Number(createForm.quantity) || 1,
            base_rate: Number(createForm.rate) || 0,
            remarks: createForm.remarks || undefined,
          },
        ],
      };

      const response = await fetch('/api/cost-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create cost sheet');
      }

      setShowCreateModal(false);
      setCreateForm({
        linked_tender: '',
        linked_boq: '',
        description: '',
        cost_type: 'Material',
        quantity: 1,
        rate: 0,
        remarks: '',
      });
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create cost sheet');
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (name: string, action: 'submit' | 'approve' | 'reject' | 'revise') => {
    setError('');
    setActionLoadingName(name);
    try {
      const payload: Record<string, unknown> = { action };
      if (action === 'reject' || action === 'revise') {
        payload.reason = prompt(`${action === 'reject' ? 'Reject' : 'Revise'} reason`) || '';
      }

      const response = await fetch(`/api/cost-sheets/${encodeURIComponent(name)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to ${action}`);
      }
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action}`);
    } finally {
      setActionLoadingName(null);
    }
  };

  const variance = (stats.total_sell_value || 0) - (stats.total_base_cost || 0);

  const getBlocker = (row: CostSheet) => {
    if (row.status === 'DRAFT') return 'Submit for approval';
    if (row.status === 'PENDING_APPROVAL' || row.status === 'SUBMITTED') return 'Waiting for department head review';
    if (row.status === 'REJECTED') return 'Revise pricing or costing assumptions';
    if (row.status === 'APPROVED') return 'Ready for quote / proforma / invoice';
    return 'Review status';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance Costing</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Live cost sheets, base cost, sell value, and approval tracking.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          New Cost Sheet
        </button>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create Cost Sheet</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Tender *</label>
                <input className="input" value={createForm.linked_tender} onChange={(e) => setCreateForm((p) => ({ ...p, linked_tender: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked BOQ</label>
                <input className="input" value={createForm.linked_boq} onChange={(e) => setCreateForm((p) => ({ ...p, linked_boq: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  className="input min-h-24"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Cost item description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Type *</label>
                <select
                  className="input"
                  value={createForm.cost_type}
                  onChange={(e) => setCreateForm((p) => ({ ...p, cost_type: e.target.value }))}
                >
                  <option value="Material">Material</option>
                  <option value="Service">Service</option>
                  <option value="Labour">Labour</option>
                  <option value="Overhead">Overhead</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input className="input" type="number" min={1} step={1} value={createForm.quantity} onChange={(e) => setCreateForm((p) => ({ ...p, quantity: Number(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate *</label>
                <input className="input" type="number" min={0} step={0.01} value={createForm.rate} onChange={(e) => setCreateForm((p) => ({ ...p, rate: Number(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input className="input" value={createForm.remarks} onChange={(e) => setCreateForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            {error ? <p className="px-6 pb-2 text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateCostSheet} disabled={creating}>{creating ? 'Creating...' : 'Create Cost Sheet'}</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.total_base_cost)}</div>
              <div className="stat-label">Planned Cost</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.total_sell_value)}</div>
              <div className="stat-label">Sell Value</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(variance)}</div>
              <div className="stat-label">Gross Margin Pool</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? rows.length}</div>
              <div className="stat-label">Cost Sheets</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Cost Sheet Register</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">Loading cost sheets...</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No cost sheets found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cost Sheet</th>
                  <th>Tender / Project</th>
                  <th>Owner</th>
                  <th>Linked BOQ</th>
                  <th>Base Cost</th>
                  <th>Sell Value</th>
                  <th>Margin %</th>
                  <th>Status</th>
                  <th>Blocker / Next Step</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <div className="font-medium text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500">v{row.version || 1} • {row.total_items || 0} items</div>
                    </td>
                    <td>
                      <div className="text-gray-700">{row.linked_project || '-'}</div>
                      <div className="text-xs text-gray-400">{row.linked_tender || '-'}</div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">{row.created_by_user || '-'}</div>
                      <div className="text-xs text-gray-400">{row.approved_by ? `Approved by ${row.approved_by}` : 'Not approved yet'}</div>
                    </td>
                    <td>{row.linked_boq || '-'}</td>
                    <td>{formatCurrency(row.base_cost)}</td>
                    <td className="font-medium text-gray-900">{formatCurrency(row.sell_value)}</td>
                    <td>{row.margin_percent || 0}%</td>
                    <td>
                      <span className={`badge ${
                        row.status === 'APPROVED'
                          ? 'badge-success'
                          : row.status === 'PENDING_APPROVAL'
                            ? 'badge-warning'
                            : row.status === 'REJECTED'
                              ? 'badge-error'
                              : 'badge-gray'
                      }`}>
                        {row.status || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm text-gray-700">{getBlocker(row)}</div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2 items-center">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1" onClick={() => alert(`Cost Sheet: ${row.name}\nStatus: ${row.status || '-'}`)}>
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {row.status === 'DRAFT' && canCreateOrSubmit ? (
                          <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium" disabled={actionLoadingName === row.name} onClick={() => runAction(row.name, 'submit')}>Submit</button>
                        ) : null}
                        {row.status === 'SUBMITTED' && canApproveReject ? (
                          <>
                            <button className="text-green-600 hover:text-green-800 text-sm font-medium" disabled={actionLoadingName === row.name} onClick={() => runAction(row.name, 'approve')}>Approve</button>
                            <button className="text-red-600 hover:text-red-800 text-sm font-medium" disabled={actionLoadingName === row.name} onClick={() => runAction(row.name, 'reject')}>Reject</button>
                          </>
                        ) : null}
                        {(row.status === 'APPROVED' || row.status === 'REJECTED') && canCreateOrSubmit ? (
                          <button className="text-orange-600 hover:text-orange-800 text-sm font-medium" disabled={actionLoadingName === row.name} onClick={() => runAction(row.name, 'revise')}>Revise</button>
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
