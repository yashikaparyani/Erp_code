'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import { formatCurrency } from '@/components/finance/fin-helpers';

type Row = {
  customer?: string;
  bucket_0_30?: number;
  bucket_31_60?: number;
  bucket_61_90?: number;
  bucket_90_plus?: number;
  total?: number;
};

export default function ReceivableAgingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/finance/receivable-aging');
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setRows(payload.data || []);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sum = (k: keyof Row) => rows.reduce((t, r) => t + Number(r[k] || 0), 0);

  const exportCSV = () => {
    const hdr = 'Customer,0-30 Days,31-60 Days,61-90 Days,>90 Days,Total';
    const csv = [hdr, ...rows.map(r => [r.customer, r.bucket_0_30, r.bucket_31_60, r.bucket_61_90, r.bucket_90_plus, r.total].join(','))].join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = `receivable_aging_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <RegisterPage
      title="Receivable Aging" description="Outstanding exposure by customer and aging bucket"
      loading={loading} error={error} onRetry={load} empty={!loading && !rows.length}
      stats={[
        { label: '0-30 Days', value: formatCurrency(sum('bucket_0_30')) },
        { label: '31-60 Days', value: formatCurrency(sum('bucket_31_60')) },
        { label: '61-90 Days', value: formatCurrency(sum('bucket_61_90')), variant: 'warning' },
        { label: '90+ Days', value: formatCurrency(sum('bucket_90_plus')), variant: 'error' },
      ]}
      headerActions={<button className="btn btn-secondary" onClick={exportCSV}><Download className="h-4 w-4" />Export CSV</button>}
    >
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Customer</th><th className="text-right">0-30 Days</th><th className="text-right">31-60 Days</th><th className="text-right">61-90 Days</th><th className="text-right">&gt;90 Days</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.customer}-${i}`}>
                  <td>{r.customer || '-'}</td>
                  <td className="text-right">{formatCurrency(r.bucket_0_30)}</td>
                  <td className="text-right">{formatCurrency(r.bucket_31_60)}</td>
                  <td className="text-right">{formatCurrency(r.bucket_61_90)}</td>
                  <td className="text-right">{formatCurrency(r.bucket_90_plus)}</td>
                  <td className="text-right font-semibold">{formatCurrency(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RegisterPage>
  );
}
