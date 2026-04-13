'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import LinkPicker from '@/components/ui/LinkPicker';

interface AgingRow {
  warehouse?: string;
  item_code?: string;
  actual_qty?: number;
  last_receipt_date?: string;
  age_days?: number;
  age_bucket?: string;
}

export default function StockAgingPage() {
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [buckets, setBuckets] = useState<Record<string, number>>({});
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
    fetch(`/api/stock-aging${qs}`).then(r => r.json()).then(res => {
      const p = res?.data;
      setRows(Array.isArray(p) ? p : Array.isArray(p?.items) ? p.items : []);
      setBuckets(p?.buckets || {});
    }).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  }, [warehouseFilter, itemFilter]);

  useEffect(() => { load(); }, [load]);

  const deadStock = rows.filter(r => (r.age_days ?? 0) > 180);
  const slowMoving = rows.filter(r => (r.age_days ?? 0) > 90 && (r.age_days ?? 0) <= 180);

  return (
    <RegisterPage
      title="Stock Aging Analysis"
      description="Identify slow-moving and dead stock across warehouses."
      loading={loading} error={error} onRetry={load}
      stats={[
        { label: 'Total Items', value: rows.length },
        { label: '0-30 Days', value: buckets.age_0_30 ?? rows.filter(r => (r.age_days ?? 0) <= 30).length },
        { label: 'Slow Moving (90–180d)', value: slowMoving.length },
        { label: 'Dead Stock (>180d)', value: deadStock.length },
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
          <Link href="/stock-position" className="btn btn-secondary">Stock Position</Link>
        </div>
      )}
    >
      <table className="data-table">
        <thead><tr><th>Item Code</th><th>Warehouse</th><th className="text-right">Qty</th><th>Last Receipt</th><th className="text-right">Age (days)</th><th>Category</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No aging data found</td></tr> : rows.map((r, i) => {
            const d = r.age_days ?? 0;
            const cat = d > 180 ? 'Dead Stock' : d > 90 ? 'Slow Moving' : d > 30 ? 'Normal' : 'Fresh';
            const cls = d > 180 ? 'badge-red' : d > 90 ? 'badge-yellow' : d > 30 ? 'badge-blue' : 'badge-green';
            return (
              <tr key={i}>
                <td className="font-medium text-gray-900">{r.item_code || '-'}</td>
                <td className="text-gray-700">{r.warehouse || '-'}</td>
                <td className="text-right">{r.actual_qty ?? 0}</td>
                <td className="text-gray-700">{r.last_receipt_date || '-'}</td>
                <td className="text-right font-medium">{d}</td>
                <td><span className={`badge ${cls}`}>{cat}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </RegisterPage>
  );
}
