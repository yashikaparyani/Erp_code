'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Plus, CheckCircle2, Clock, Truck, X } from 'lucide-react';

interface GRN {
  name: string;
  supplier?: string;
  posting_date?: string;
  status?: string;
  project?: string;
  set_warehouse?: string;
  grand_total?: number;
  docstatus?: number;
  creation?: string;
}

interface GRNStats {
  total?: number;
  draft?: number;
  submitted?: number;
  completed?: number;
  cancelled?: number;
  return_count?: number;
  total_value?: number;
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function statusBadge(status?: string) {
  const map: Record<string, string> = { Draft: 'badge-yellow', Completed: 'badge-green', Cancelled: 'badge-red', Return: 'badge-orange' };
  return map[status || ''] || 'badge-gray';
}

export default function GRNsPage() {
  const [items, setItems] = useState<GRN[]>([]);
  const [stats, setStats] = useState<GRNStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ supplier: '', project: '', set_warehouse: '', posting_date: '', purchase_order: '' });

  const loadData = async () => {
    setLoading(true);
    const [listRes, statsRes] = await Promise.all([
      fetch('/api/grns').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/grns/stats').then(r => r.json()).catch(() => ({ data: {} })),
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
      const res = await fetch('/api/grns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to create GRN');
      setShowCreate(false);
      setForm({ supplier: '', project: '', set_warehouse: '', posting_date: '', purchase_order: '' });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create GRN');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Goods Receipt Notes</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Receive goods against purchase orders and track GRN status.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Create GRN</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Package className="w-5 h-5" /></div><div><div className="stat-value">{stats.total ?? items.length}</div><div className="stat-label">Total GRNs</div></div></div><div className="text-xs text-gray-500 mt-2">{formatCurrency(stats.total_value)} value</div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{stats.draft ?? 0}</div><div className="stat-label">Draft</div></div></div><div className="text-xs text-gray-500 mt-2">Pending submission</div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></div><div><div className="stat-value">{stats.completed ?? 0}</div><div className="stat-label">Completed</div></div></div><div className="text-xs text-gray-500 mt-2">Goods received</div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600"><Truck className="w-5 h-5" /></div><div><div className="stat-value">{stats.return_count ?? 0}</div><div className="stat-label">Returns</div></div></div><div className="text-xs text-gray-500 mt-2">Returned goods</div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All GRNs</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>GRN #</th><th>Supplier</th><th>Date</th><th>Project</th><th>Warehouse</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No GRN records found</td></tr>
              ) : items.map(item => (
                <tr key={item.name}>
                  <td><Link href={`/grns/${encodeURIComponent(item.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{item.name}</Link></td>
                  <td><div className="text-sm text-gray-900">{item.supplier || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.posting_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.project || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.set_warehouse || '-'}</div></td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || 'Draft'}</span></td>
                  <td><div className="text-sm font-medium text-gray-900">{formatCurrency(item.grand_total)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div><h2 className="text-lg font-semibold text-gray-900">Create GRN</h2><p className="text-sm text-gray-500 mt-1">Receive goods against a purchase order.</p></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Purchase Order</div><input className="input" value={form.purchase_order} onChange={e => setForm({ ...form, purchase_order: e.target.value })} placeholder="e.g. PO-00001" /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Supplier</div><input className="input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project</div><input className="input" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Warehouse</div><input className="input" value={form.set_warehouse} onChange={e => setForm({ ...form, set_warehouse: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Posting Date</div><input className="input" type="date" value={form.posting_date} onChange={e => setForm({ ...form, posting_date: e.target.value })} /></label>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create GRN'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
