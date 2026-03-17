'use client';
import { useEffect, useState } from 'react';
import { ShoppingCart, Clock, CheckCircle2, XCircle, TrendingUp, Package } from 'lucide-react';

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
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<POStats>({});
  const [loading, setLoading] = useState(true);

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
      </div>

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
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-500">No purchase orders found</td></tr>
              ) : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-900">{item.supplier || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.transaction_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.project || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.set_warehouse || '-'}</div></td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || 'Draft'}</span></td>
                  <td><div className="text-sm font-medium text-gray-900">{formatCurrency(item.grand_total)}</div></td>
                  <td><div className="text-sm text-gray-700">{item.per_received?.toFixed(0) ?? 0}%</div></td>
                  <td><div className="text-sm text-gray-700">{item.per_billed?.toFixed(0) ?? 0}%</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
