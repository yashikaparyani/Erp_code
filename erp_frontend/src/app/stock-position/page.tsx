'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import LinkPicker from '@/components/ui/LinkPicker';
import { formatCurrency } from '@/components/procurement/proc-helpers';

interface StockRow {
  warehouse?: string;
  item_code?: string;
  item_name?: string;
  stock_uom?: string;
  actual_qty?: number;
  reserved_qty?: number;
  ordered_qty?: number;
  projected_qty?: number;
  valuation_rate?: number;
  stock_value?: number;
}

export default function StockPositionPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (warehouseFilter) params.set('warehouse', warehouseFilter);
    if (itemFilter) params.set('item_code', itemFilter);
    const qs = params.toString() ? `?${params.toString()}` : '';
    fetch(`/api/stock-position${qs}`).then(r => r.json()).then(res => setRows(res.data || [])).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  }, [warehouseFilter, itemFilter]);

  useEffect(() => { load(); }, [load]);

  const totalQty = rows.reduce((s, r) => s + (r.actual_qty || 0), 0);
  const totalValue = rows.reduce((s, r) => s + (r.stock_value || (r.actual_qty || 0) * (r.valuation_rate || 0)), 0);
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
        { label: 'Total Value', value: formatCurrency(totalValue) },
      ]}
      filterBar={(
        <div className="flex flex-wrap gap-2">
          <LinkPicker entity="warehouse" value={warehouseFilter} onChange={setWarehouseFilter} placeholder="Filter by warehouse…" className="w-56" />
          <LinkPicker entity="item" value={itemFilter} onChange={setItemFilter} placeholder="Filter by item…" className="w-56" />
        </div>
      )}
      headerActions={(
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory" className="btn btn-primary">Open Inventory</Link>
          <Link href="/dispatch-challans" className="btn btn-secondary">Dispatch Challans</Link>
        </div>
      )}
    >
      <table className="data-table">
        <thead><tr><th>Item</th><th>Warehouse</th><th className="text-right">Actual Qty</th><th className="text-right">Reserved</th><th className="text-right">Ordered</th><th className="text-right">Projected</th><th className="text-right">Valuation Rate</th><th className="text-right">Value</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No stock data found</td></tr> : rows.map((r, i) => (
            <tr key={i}>
              <td>
                <div className="font-medium text-gray-900">{r.item_name || r.item_code || '-'}</div>
                <div className="text-xs text-gray-500">{r.item_code || '-'}{r.stock_uom ? ` · ${r.stock_uom}` : ''}</div>
              </td>
              <td className="text-gray-700">{r.warehouse || '-'}</td>
              <td className="text-right font-medium">{r.actual_qty ?? 0}</td>
              <td className="text-right text-gray-700">{r.reserved_qty ?? 0}</td>
              <td className="text-right text-gray-700">{r.ordered_qty ?? 0}</td>
              <td className="text-right text-gray-700">{r.projected_qty ?? 0}</td>
              <td className="text-right text-gray-700">{formatCurrency(r.valuation_rate)}</td>
              <td className="text-right font-medium">{formatCurrency(r.stock_value || ((r.actual_qty || 0) * (r.valuation_rate || 0)))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </RegisterPage>
  );
}
