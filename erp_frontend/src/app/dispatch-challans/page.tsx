'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, Package, Clock, CheckCircle2, AlertCircle, Send } from 'lucide-react';

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
}

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    DRAFT: 'badge-gray', PENDING_APPROVAL: 'badge-yellow', APPROVED: 'badge-blue',
    DISPATCHED: 'badge-green', REJECTED: 'badge-red', CANCELLED: 'badge-gray',
  };
  return map[status || ''] || 'badge-gray';
}

export default function DispatchChallansPage() {
  const [items, setItems] = useState<DispatchChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    const qs = filter ? `?status=${encodeURIComponent(filter)}` : '';
    const res = await fetch(`/api/dispatch-challans${qs}`).then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [filter]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const draft = items.filter(i => i.status === 'DRAFT').length;
  const pending = items.filter(i => i.status === 'PENDING_APPROVAL').length;
  const dispatched = items.filter(i => i.status === 'DISPATCHED').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dispatch Challans</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Track material dispatches from warehouse to project sites.</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Package className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Challans</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{draft}</div><div className="stat-label">Draft</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600"><Send className="w-5 h-5" /></div><div><div className="stat-value">{pending}</div><div className="stat-label">Pending Approval</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Truck className="w-5 h-5" /></div><div><div className="stat-value">{dispatched}</div><div className="stat-label">Dispatched</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">All Challans</h3>
          <select className="input w-auto text-xs" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan ID</th><th>Dispatch Date</th><th>Type</th><th>From</th><th>To / Site</th>
                <th>Project</th><th>Items</th><th>Qty</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-500">No dispatch challans found</td></tr>
              ) : items.map(item => (
                <tr key={item.name}>
                  <td><Link href={`/dispatch-challans/${encodeURIComponent(item.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{item.name}</Link></td>
                  <td className="text-sm text-gray-700">{item.dispatch_date || '-'}</td>
                  <td className="text-sm text-gray-700">{item.dispatch_type || '-'}</td>
                  <td className="text-sm text-gray-700">{item.from_warehouse || '-'}</td>
                  <td className="text-sm text-gray-700">{item.target_site_name || item.to_warehouse || '-'}</td>
                  <td className="text-sm text-gray-700">{item.linked_project || '-'}</td>
                  <td className="text-sm text-gray-700 text-center">{item.total_items ?? '-'}</td>
                  <td className="text-sm text-gray-700 text-center">{item.total_qty ?? '-'}</td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
