'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, CheckCircle2, AlertTriangle, Truck, Eye, Plus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface DispatchChallan {
  name: string;
  dispatch_date?: string;
  dispatch_type?: string;
  status?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  target_site_name?: string;
  linked_project?: string;
  total_items?: number;
  total_qty?: number;
  creation?: string;
}

interface DCStats {
  total?: number;
  draft?: number;
  pending_approval?: number;
  approved?: number;
  dispatched?: number;
  cancelled?: number;
  total_qty?: number;
}

interface StockBin {
  warehouse?: string;
  item_code?: string;
  actual_qty?: number;
  reserved_qty?: number;
  ordered_qty?: number;
  projected_qty?: number;
}

export default function InventoryPage() {
  const { currentUser } = useAuth();
  const [challans, setChallans] = useState<DispatchChallan[]>([]);
  const [stats, setStats] = useState<DCStats>({});
  const [stockBins, setStockBins] = useState<StockBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoadingName, setActionLoadingName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState({
    dispatch_type: 'WAREHOUSE_TO_SITE',
    dispatch_date: '',
    from_warehouse: '',
    to_warehouse: '',
    target_site_name: '',
    linked_project: '',
    linked_tender: '',
    item_link: '',
    description: '',
    qty: 1,
  });

  const hasAnyRole = (...roles: string[]) => {
    const assigned = new Set(currentUser?.roles || []);
    return roles.some((role) => assigned.has(role));
  };

  const canCreateOrSubmit = hasAnyRole('Director', 'System Manager', 'Store Manager', 'Stores Logistics Head', 'Procurement Manager', 'Purchase');
  const canApproveReject = hasAnyRole('Director', 'System Manager', 'Project Head', 'Procurement Manager');

  const loadData = async () => {
    setLoading(true);
    Promise.all([
      fetch('/api/dispatch-challans').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/dispatch-challans/stats').then(r => r.json()).catch(() => ({ data: {} })),
      fetch('/api/stock-snapshot').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([challansRes, statsRes, stockRes]) => {
      setChallans(challansRes.data || []);
      setStats(statsRes.data || {});
      setStockBins(stockRes.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateChallan = async () => {
    if (!createForm.dispatch_date || !createForm.description.trim() || !createForm.item_link.trim()) {
      setError('Dispatch date, Item, and Description are required.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const payload = {
        dispatch_type: createForm.dispatch_type,
        dispatch_date: createForm.dispatch_date,
        from_warehouse: createForm.from_warehouse || undefined,
        to_warehouse: createForm.to_warehouse || undefined,
        target_site_name: createForm.target_site_name || undefined,
        linked_project: createForm.linked_project || undefined,
        linked_tender: createForm.linked_tender || undefined,
        items: [
          {
            item_link: createForm.item_link,
            description: createForm.description,
            qty: Number(createForm.qty) || 1,
          },
        ],
      };

      const response = await fetch('/api/dispatch-challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create challan');
      }

      setShowCreateModal(false);
      setCreateForm({
        dispatch_type: 'WAREHOUSE_TO_SITE',
        dispatch_date: '',
        from_warehouse: '',
        to_warehouse: '',
        target_site_name: '',
        linked_project: '',
        linked_tender: '',
        item_link: '',
        description: '',
        qty: 1,
      });
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create challan');
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (name: string, action: 'submit' | 'approve' | 'reject' | 'dispatch') => {
    setActionLoadingName(name);
    setError('');
    try {
      const response = await fetch(`/api/dispatch-challans/${encodeURIComponent(name)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory & Logistics</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Dispatch challans, stock, and warehouse operations</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          New Challan
        </button>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create Dispatch Challan</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Type</label>
                <select className="input" value={createForm.dispatch_type} onChange={(e) => setCreateForm((p) => ({ ...p, dispatch_type: e.target.value }))}>
                  <option value="WAREHOUSE_TO_WAREHOUSE">WAREHOUSE_TO_WAREHOUSE</option>
                  <option value="WAREHOUSE_TO_SITE">WAREHOUSE_TO_SITE</option>
                  <option value="VENDOR_TO_SITE">VENDOR_TO_SITE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Date *</label>
                <input className="input" type="date" value={createForm.dispatch_date} onChange={(e) => setCreateForm((p) => ({ ...p, dispatch_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Warehouse</label>
                <input className="input" value={createForm.from_warehouse} onChange={(e) => setCreateForm((p) => ({ ...p, from_warehouse: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Warehouse</label>
                <input className="input" value={createForm.to_warehouse} onChange={(e) => setCreateForm((p) => ({ ...p, to_warehouse: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Site</label>
                <input className="input" value={createForm.target_site_name} onChange={(e) => setCreateForm((p) => ({ ...p, target_site_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Project</label>
                <input className="input" value={createForm.linked_project} onChange={(e) => setCreateForm((p) => ({ ...p, linked_project: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
                <input className="input" value={createForm.item_link} onChange={(e) => setCreateForm((p) => ({ ...p, item_link: e.target.value }))} placeholder="Exact Item code" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label>
                <input className="input" type="number" min={1} step={1} value={createForm.qty} onChange={(e) => setCreateForm((p) => ({ ...p, qty: Number(e.target.value) || 1 }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input className="input" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            {error ? <p className="px-6 pb-2 text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateChallan} disabled={creating}>{creating ? 'Creating...' : 'Create Challan'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? challans.length}</div>
              <div className="stat-label">Total Challans</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{stats.total_qty ?? 0} total qty</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">{stats.dispatched ?? 0}</div>
              <div className="stat-label">Dispatched</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">Delivered</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">{stats.pending_approval ?? 0}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
          <div className="text-xs text-yellow-600 mt-2">Awaiting sign-off</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="stat-value">{stockBins.length}</div>
              <div className="stat-label">Stock Items</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">In warehouse</div>
        </div>
      </div>

      {/* Dispatch Challans Table */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Dispatch Challans</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Items</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-500">No dispatch challans found</td></tr>
              ) : challans.map(ch => (
                <tr key={ch.name}>
                  <td>
                    <div className="font-medium text-gray-900">{ch.name}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{ch.dispatch_date || '-'}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{ch.dispatch_type || '-'}</span>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{ch.from_warehouse || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{ch.to_warehouse || ch.target_site_name || '-'}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{ch.total_items ?? 0}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{ch.total_qty ?? 0}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      ch.status === 'DISPATCHED' ? 'badge-success' : 
                      ch.status === 'APPROVED' ? 'badge-info' :
                      ch.status === 'PENDING_APPROVAL' ? 'badge-warning' : 
                      ch.status === 'CANCELLED' ? 'badge-error' :
                      'badge-gray'
                    }`}>
                      {ch.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Link
                        href={`/dispatch-challans/${encodeURIComponent(ch.name)}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                      {ch.status === 'DRAFT' && canCreateOrSubmit ? (
                        <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium" disabled={actionLoadingName === ch.name} onClick={() => runAction(ch.name, 'submit')}>Submit</button>
                      ) : null}
                      {ch.status === 'PENDING_APPROVAL' && canApproveReject ? (
                        <>
                          <button className="text-green-600 hover:text-green-800 text-sm font-medium" disabled={actionLoadingName === ch.name} onClick={() => runAction(ch.name, 'approve')}>Approve</button>
                          <button className="text-red-600 hover:text-red-800 text-sm font-medium" disabled={actionLoadingName === ch.name} onClick={() => runAction(ch.name, 'reject')}>Reject</button>
                        </>
                      ) : null}
                      {ch.status === 'APPROVED' && canCreateOrSubmit ? (
                        <button className="text-orange-600 hover:text-orange-800 text-sm font-medium" disabled={actionLoadingName === ch.name} onClick={() => runAction(ch.name, 'dispatch')}>Mark Dispatched</button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Snapshot */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Stock Snapshot</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Warehouse</th>
                <th>Actual Qty</th>
                <th>Reserved</th>
                <th>Ordered</th>
                <th>Projected</th>
              </tr>
            </thead>
            <tbody>
              {stockBins.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No stock data available</td></tr>
              ) : stockBins.map((bin, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="font-medium text-gray-900">{bin.item_code}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{bin.warehouse}</div>
                  </td>
                  <td>
                    <div className="text-gray-900">{bin.actual_qty ?? 0}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{bin.reserved_qty ?? 0}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{bin.ordered_qty ?? 0}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{bin.projected_qty ?? 0}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}