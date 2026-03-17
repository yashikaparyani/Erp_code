'use client';
import { useEffect, useState } from 'react';
import { Warehouse, Package } from 'lucide-react';

interface StockRow {
  warehouse?: string;
  item_code?: string;
  actual_qty?: number;
  reserved_qty?: number;
  ordered_qty?: number;
  projected_qty?: number;
  valuation_rate?: number;
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function StockPositionPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stock-position').then(r => r.json()).then(res => setRows(res.data || [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const totalQty = rows.reduce((s, r) => s + (r.actual_qty || 0), 0);
  const totalValue = rows.reduce((s, r) => s + (r.actual_qty || 0) * (r.valuation_rate || 0), 0);
  const warehouses = [...new Set(rows.map(r => r.warehouse).filter(Boolean))];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Stock Position</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Current warehouse stock quantities and valuation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Package className="w-5 h-5" /></div><div><div className="stat-value">{rows.length}</div><div className="stat-label">Item-Warehouse Rows</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Warehouse className="w-5 h-5" /></div><div><div className="stat-value">{warehouses.length}</div><div className="stat-label">Warehouses</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><Package className="w-5 h-5" /></div><div><div className="stat-value">{totalQty.toLocaleString()}</div><div className="stat-label">Total Qty</div></div></div><div className="text-xs text-gray-500 mt-2">{formatCurrency(totalValue)} valuation</div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Stock by Item & Warehouse</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Item Code</th><th>Warehouse</th><th>Actual Qty</th><th>Reserved</th><th>Ordered</th><th>Projected</th><th>Valuation Rate</th><th>Value</th></tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No stock data found</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i}>
                  <td><div className="font-medium text-gray-900">{r.item_code || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{r.warehouse || '-'}</div></td>
                  <td><div className="text-sm text-gray-900 font-medium">{r.actual_qty ?? 0}</div></td>
                  <td><div className="text-sm text-gray-700">{r.reserved_qty ?? 0}</div></td>
                  <td><div className="text-sm text-gray-700">{r.ordered_qty ?? 0}</div></td>
                  <td><div className="text-sm text-gray-700">{r.projected_qty ?? 0}</div></td>
                  <td><div className="text-sm text-gray-700">{formatCurrency(r.valuation_rate)}</div></td>
                  <td><div className="text-sm font-medium text-gray-900">{formatCurrency((r.actual_qty || 0) * (r.valuation_rate || 0))}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
