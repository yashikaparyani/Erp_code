'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import { formatCurrency } from '@/components/procurement/proc-helpers';

interface StockRow { warehouse?: string; item_code?: string; actual_qty?: number; reserved_qty?: number; ordered_qty?: number; projected_qty?: number; valuation_rate?: number; }

export default function StockPositionPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true); setError('');
    fetch('/api/stock-position').then(r => r.json()).then(res => setRows(res.data || [])).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totalQty = rows.reduce((s, r) => s + (r.actual_qty || 0), 0);
  const totalValue = rows.reduce((s, r) => s + (r.actual_qty || 0) * (r.valuation_rate || 0), 0);
  const warehouses = [...new Set(rows.map(r => r.warehouse).filter(Boolean))];

  return (
    <RegisterPage
      title="Stock Position"
      description="Current warehouse stock quantities and valuation."
      loading={loading} error={error} onRetry={load}
      stats={[
        { label: 'Item-Warehouse Rows', value: rows.length },
        { label: 'Warehouses', value: warehouses.length },
        { label: 'Total Qty', value: totalQty.toLocaleString() },
      ]}
      headerActions={(
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory" className="btn btn-primary">Open Inventory</Link>
          <Link href="/dispatch-challans" className="btn btn-secondary">Dispatch Challans</Link>
        </div>
      )}
    >
      <table className="data-table">
        <thead><tr><th>Item Code</th><th>Warehouse</th><th className="text-right">Actual Qty</th><th className="text-right">Reserved</th><th className="text-right">Ordered</th><th className="text-right">Projected</th><th className="text-right">Valuation Rate</th><th className="text-right">Value</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No stock data found</td></tr> : rows.map((r, i) => (
            <tr key={i}>
              <td className="font-medium text-gray-900">{r.item_code || '-'}</td>
              <td className="text-gray-700">{r.warehouse || '-'}</td>
              <td className="text-right font-medium">{r.actual_qty ?? 0}</td>
              <td className="text-right text-gray-700">{r.reserved_qty ?? 0}</td>
              <td className="text-right text-gray-700">{r.ordered_qty ?? 0}</td>
              <td className="text-right text-gray-700">{r.projected_qty ?? 0}</td>
              <td className="text-right text-gray-700">{formatCurrency(r.valuation_rate)}</td>
              <td className="text-right font-medium">{formatCurrency((r.actual_qty || 0) * (r.valuation_rate || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </RegisterPage>
  );
}
