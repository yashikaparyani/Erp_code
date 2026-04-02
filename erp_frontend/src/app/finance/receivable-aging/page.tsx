'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import { callOps, formatCurrency } from '@/components/finance/fin-helpers';

type Row = { customer?: string; current?: number; '30'?: number; '60'?: number; '90'?: number; above_90?: number; total?: number };

export default function ReceivableAgingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await callOps<Row[]>('get_receivable_aging')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sum = (k: keyof Row) => rows.reduce((t, r) => t + Number(r[k] || 0), 0);

  const exportCSV = () => {
    const hdr = 'Customer,Current,30 Days,60 Days,90 Days,>90 Days,Total';
    const csv = [hdr, ...rows.map(r => [r.customer, r.current, r['30'], r['60'], r['90'], r.above_90, r.total].join(','))].join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = `receivable_aging_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <RegisterPage
      title="Receivable Aging" description="Outstanding exposure by customer and aging bucket"
      loading={loading} error={error} onRetry={load} empty={!loading && !rows.length}
      stats={[
        { label: 'Current', value: formatCurrency(sum('current')) },
        { label: '30 Days', value: formatCurrency(sum('30')) },
        { label: '60 Days', value: formatCurrency(sum('60')), variant: 'warning' },
        { label: '90+ Days', value: formatCurrency(sum('90') + sum('above_90')), variant: 'error' },
      ]}
      headerActions={<button className="btn btn-secondary" onClick={exportCSV}><Download className="h-4 w-4" />Export CSV</button>}
    >
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Customer</th><th className="text-right">Current</th><th className="text-right">30 Days</th><th className="text-right">60 Days</th><th className="text-right">90 Days</th><th className="text-right">&gt;90 Days</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.customer}-${i}`}>
                  <td>{r.customer || '-'}</td>
                  <td className="text-right">{formatCurrency(r.current)}</td>
                  <td className="text-right">{formatCurrency(r['30'])}</td>
                  <td className="text-right">{formatCurrency(r['60'])}</td>
                  <td className="text-right">{formatCurrency(r['90'])}</td>
                  <td className="text-right">{formatCurrency(r.above_90)}</td>
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
