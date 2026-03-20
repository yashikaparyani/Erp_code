'use client';

import { useEffect, useState } from 'react';
import { Download, TimerReset } from 'lucide-react';

async function fetchAging() {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'get_receivable_aging' }),
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) throw new Error(payload.message || 'Failed to load receivable aging');
  return payload.data || [];
}

export default function ReceivableAgingPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAging()
      .then((data) => setRows(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load receivable aging'))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    const lines = [
      ['Customer', '0-30', '31-60', '61-90', '90+', 'Total'],
      ...rows.map((row) => [row.customer, row.bucket_0_30 || 0, row.bucket_31_60 || 0, row.bucket_61_90 || 0, row.bucket_90_plus || 0, row.total || 0]),
    ];
    const csv = lines.map((line) => line.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'receivable-aging.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Receivable Aging</h1>
        <button className="btn btn-secondary" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>
      <p className="mb-6 mt-1 text-sm text-gray-500">Customer-wise outstanding aging from approved and submitted invoices.</p>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Customers', rows.length],
          ['0-30', rows.reduce((sum, row) => sum + (row.bucket_0_30 || 0), 0)],
          ['31-60', rows.reduce((sum, row) => sum + (row.bucket_31_60 || 0), 0)],
          ['90+', rows.reduce((sum, row) => sum + (row.bucket_90_plus || 0), 0)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TimerReset className="h-4 w-4" />
              {label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{Number(value).toLocaleString('en-IN')}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Customer</th><th>0-30</th><th>31-60</th><th>61-90</th><th>90+</th><th>Total</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading aging...</td></tr> : !rows.length ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">No aging rows found</td></tr> : rows.map((row) => (
                <tr key={row.customer}>
                  <td>{row.customer}</td>
                  <td>{row.bucket_0_30 || 0}</td>
                  <td>{row.bucket_31_60 || 0}</td>
                  <td>{row.bucket_61_90 || 0}</td>
                  <td>{row.bucket_90_plus || 0}</td>
                  <td>{row.total || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
