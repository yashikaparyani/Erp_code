'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Clock, CheckCircle2, XCircle, TrendingUp, Package,
  Plus, Send, Ban, Trash2, ExternalLink, Loader2,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';

interface PurchaseOrder {
  name: string;
  supplier?: string;
  transaction_date?: string;
  status?: string;
  company?: string;
  project?: string;
  set_warehouse?: string;
  grand_total?: number;
  rounded_total?: number;
  per_received?: number;
  per_billed?: number;
  docstatus?: number;
  creation?: string;
  modified?: string;
}

interface POStats {
  total?: number;
  draft?: number;
  to_receive_and_bill?: number;
  to_bill?: number;
  to_receive?: number;
  completed?: number;
  cancelled?: number;
  total_amount?: number;
}

function formatCurrency(value?: number) {
  if (!value) return '₹ 0';
  return `₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    Draft: 'badge-yellow',
    'To Receive and Bill': 'badge-blue',
    'To Bill': 'badge-purple',
    'To Receive': 'badge-orange',
    Completed: 'badge-green',
    Cancelled: 'badge-red',
    Closed: 'badge-gray',
  };
  return map[status || ''] || 'badge-gray';
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<POStats>({});
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Create PO modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ supplier: '', project: '', warehouse: '' });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [listRes, statsRes] = await Promise.all([
      fetch('/api/purchase-orders').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/purchase-orders/stats').then(r => r.json()).catch(() => ({ data: {} })),
    ]);
    setItems(listRes.data || []);
    setStats(statsRes.data || {});
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRowAction = async (action: 'submit' | 'cancel', poName: string) => {
    setActionBusy(`${action}-${poName}`);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/purchase-orders/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: poName }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      showSuccess(result.message || `PO ${poName} ${action === 'submit' ? 'submitted' : 'cancelled'}`);
      loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionBusy('');
    }
  };

  const handleCreate = async () => {
    if (!createForm.supplier.trim()) { setErrorMsg('Supplier is required'); return; }
    setCreating(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: createForm.supplier.trim(),
          project: createForm.project.trim() || undefined,
          set_warehouse: createForm.warehouse.trim() || undefined,
          items: [{ item_code: 'Item', qty: 1, rate: 0, schedule_date: new Date().toISOString().split('T')[0] }],
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      setShowCreate(false);
      setCreateForm({ supplier: '', project: '', warehouse: '' });
      router.push(`/purchase-orders/${encodeURIComponent(result.data?.name || '')}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create PO');
    } finally {
      setCreating(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track all purchase orders raised against vendor comparisons.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
          <Plus className="h-4 w-4" /> Create PO
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{errorMsg}
          <button onClick={() => setErrorMsg('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Create PO Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Purchase Order</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Supplier *</label>
                <input type="text" value={createForm.supplier} onChange={e => setCreateForm({ ...createForm, supplier: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Enter supplier name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Project</label>
                <input type="text" value={createForm.project} onChange={e => setCreateForm({ ...createForm, project: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Optional" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Warehouse</label>
                <input type="text" value={createForm.warehouse} onChange={e => setCreateForm({ ...createForm, warehouse: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Optional" />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><ShoppingCart className="w-5 h-5" /></div><div><div className="stat-value">{stats.total ?? items.length}</div><div className="stat-label">Total POs</div></div></div><div className="text-xs text-gray-500 mt-2">{formatCurrency(stats.total_amount)} value</div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{stats.draft ?? 0}</div><div className="stat-label">Draft</div></div></div><div className="text-xs text-gray-500 mt-2">Not yet submitted</div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600"><Package className="w-5 h-5" /></div><div><div className="stat-value">{stats.to_receive_and_bill ?? 0}</div><div className="stat-label">To Receive & Bill</div></div></div><div className="text-xs text-gray-500 mt-2">Pending receipt + invoice</div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><TrendingUp className="w-5 h-5" /></div><div><div className="stat-value">{(stats.to_bill ?? 0) + (stats.to_receive ?? 0)}</div><div className="stat-label">To Bill / Receive</div></div></div><div className="text-xs text-gray-500 mt-2">Partially fulfilled</div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></div><div><div className="stat-value">{stats.completed ?? 0}</div><div className="stat-label">Completed</div></div></div><div className="text-xs text-gray-500 mt-2">Fully received & billed</div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><XCircle className="w-5 h-5" /></div><div><div className="stat-value">{stats.cancelled ?? 0}</div><div className="stat-label">Cancelled</div></div></div><div className="text-xs text-gray-500 mt-2">Voided orders</div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Purchase Orders</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Project</th>
                <th>Warehouse</th>
                <th>Status</th>
                <th>Grand Total</th>
                <th>% Received</th>
                <th>% Billed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">No purchase orders found</td></tr>
              ) : items.map(item => (
                <tr key={item.name} className="cursor-pointer hover:bg-blue-50/50" onClick={() => router.push(`/purchase-orders/${encodeURIComponent(item.name)}`)}>
                  <td><div className="font-medium text-blue-700 flex items-center gap-1">{item.name}<ExternalLink className="h-3 w-3 text-blue-400" /></div></td>
                  <td><div className="text-sm text-gray-900">{item.supplier || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.transaction_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.project || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.set_warehouse || '-'}</div></td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || 'Draft'}</span></td>
                  <td><div className="text-sm font-medium text-gray-900">{formatCurrency(item.grand_total)}</div></td>
                  <td><div className="text-sm text-gray-700">{item.per_received?.toFixed(0) ?? 0}%</div></td>
                  <td><div className="text-sm text-gray-700">{item.per_billed?.toFixed(0) ?? 0}%</div></td>
                  <td>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {item.docstatus === 0 && (
                        <>
                          <button
                            onClick={() => handleRowAction('submit', item.name)}
                            disabled={!!actionBusy}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50"
                            title="Submit"
                          >
                            {actionBusy === `submit-${item.name}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item.name)}
                            disabled={!!actionBusy}
                            className="rounded p-1 text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            {actionBusy === `delete-${item.name}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      )}
                      {item.docstatus === 1 && (
                        <button
                          onClick={() => handleRowAction('cancel', item.name)}
                          disabled={!!actionBusy}
                          className="rounded p-1 text-rose-600 hover:bg-rose-50"
                          title="Cancel PO"
                        >
                          {actionBusy === `cancel-${item.name}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ActionModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget}`}
        description="This will permanently delete this Purchase Order. This cannot be undone."
        variant="danger"
        confirmLabel="Delete"
        busy={!!actionBusy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setActionBusy(`delete-${deleteTarget}`);
          setErrorMsg('');
          try {
            const res = await fetch('/api/purchase-orders', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: deleteTarget }),
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.message);
            showSuccess(result.message || `PO ${deleteTarget} deleted`);
            loadData();
          } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Failed to delete');
          } finally {
            setActionBusy('');
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
