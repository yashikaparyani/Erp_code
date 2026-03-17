'use client';
import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, Package } from 'lucide-react';

interface AgingRow {
  warehouse?: string;
  item_code?: string;
  actual_qty?: number;
  earliest_date?: string;
  age_days?: number;
}

export default function StockAgingPage() {
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stock-aging').then(r => r.json()).then(res => setRows(res.data || [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const deadStock = rows.filter(r => (r.age_days ?? 0) > 180);
  const slowMoving = rows.filter(r => (r.age_days ?? 0) > 90 && (r.age_days ?? 0) <= 180);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Stock Aging Analysis</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Identify slow-moving and dead stock across warehouses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Package className="w-5 h-5" /></div><div><div className="stat-value">{rows.length}</div><div className="stat-label">Total Items</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{slowMoving.length}</div><div className="stat-label">Slow Moving (90–180d)</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><AlertTriangle className="w-5 h-5" /></div><div><div className="stat-value">{deadStock.length}</div><div className="stat-label">Dead Stock (&gt;180d)</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Aging Report</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Item Code</th><th>Warehouse</th><th>Qty</th><th>Age (days)</th><th>Category</th></tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No aging data found</td></tr>
              ) : rows.map((r, i) => {
                const days = r.age_days ?? 0;
                const cat = days > 180 ? 'Dead Stock' : days > 90 ? 'Slow Moving' : days > 30 ? 'Normal' : 'Fresh';
                const catClass = days > 180 ? 'badge-red' : days > 90 ? 'badge-yellow' : days > 30 ? 'badge-blue' : 'badge-green';
                return (
                  <tr key={i}>
                    <td><div className="font-medium text-gray-900">{r.item_code || '-'}</div></td>
                    <td><div className="text-sm text-gray-700">{r.warehouse || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{r.actual_qty ?? 0}</div></td>
                    <td><div className="text-sm text-gray-900 font-medium">{days}</div></td>
                    <td><span className={`badge ${catClass}`}>{cat}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
