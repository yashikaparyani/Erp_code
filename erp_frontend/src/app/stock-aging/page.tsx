'use client';

import { useEffect, useState } from 'react';
import RegisterPage from '@/components/shells/RegisterPage';

interface AgingRow { warehouse?: string; item_code?: string; actual_qty?: number; earliest_date?: string; age_days?: number; }

export default function StockAgingPage() {
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true); setError('');
    fetch('/api/stock-aging').then(r => r.json()).then(res => {
      const p = res?.data;
      setRows(Array.isArray(p) ? p : Array.isArray(p?.items) ? p.items : []);
    }).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deadStock = rows.filter(r => (r.age_days ?? 0) > 180);
  const slowMoving = rows.filter(r => (r.age_days ?? 0) > 90 && (r.age_days ?? 0) <= 180);

  return (
    <RegisterPage
      title="Stock Aging Analysis"
      description="Identify slow-moving and dead stock across warehouses."
      loading={loading} error={error} onRetry={load}
      stats={[
        { label: 'Total Items', value: rows.length },
        { label: 'Slow Moving (90–180d)', value: slowMoving.length },
        { label: 'Dead Stock (>180d)', value: deadStock.length },
      ]}
    >
      <table className="data-table">
        <thead><tr><th>Item Code</th><th>Warehouse</th><th className="text-right">Qty</th><th className="text-right">Age (days)</th><th>Category</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">No aging data found</td></tr> : rows.map((r, i) => {
            const d = r.age_days ?? 0;
            const cat = d > 180 ? 'Dead Stock' : d > 90 ? 'Slow Moving' : d > 30 ? 'Normal' : 'Fresh';
            const cls = d > 180 ? 'badge-red' : d > 90 ? 'badge-yellow' : d > 30 ? 'badge-blue' : 'badge-green';
            return (
              <tr key={i}>
                <td className="font-medium text-gray-900">{r.item_code || '-'}</td>
                <td className="text-gray-700">{r.warehouse || '-'}</td>
                <td className="text-right">{r.actual_qty ?? 0}</td>
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