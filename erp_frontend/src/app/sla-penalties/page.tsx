'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import { formatCurrency, formatDate, SLA_PENALTY_BADGES, badge } from '@/components/finance/fin-helpers';

type SLA = { name?: string; ticket?: string; rule?: string; breach_type?: string; amount?: number; calculated_on?: string; status?: string; project?: string };

export default function SLAPenaltiesPage() {
  const [rows, setRows] = useState<SLA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusF, setStatusF] = useState('All');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/sla-penalties');
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed');
      setRows(Array.isArray(payload.data) ? payload.data : []);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = statusF === 'All' ? rows : rows.filter(r => r.status === statusF);
  const total = filtered.reduce((t, r) => t + Number(r.amount || 0), 0);
  const pending = rows.filter(r => r.status === 'Pending').length;
  const approved = rows.filter(r => r.status === 'Approved').length;

  return (
    <RegisterPage
      title="SLA Penalties" description="Penalties triggered by SLA breach rules"
      loading={loading} error={error} onRetry={load} empty={!loading && !rows.length}
      stats={[
        { label: 'Total Entries', value: String(rows.length) },
        { label: 'Pending', value: String(pending), variant: 'warning' },
        { label: 'Approved', value: String(approved), variant: 'success' },
        { label: 'Total Penalty', value: formatCurrency(total), variant: 'error' },
      ]}
      filterBar={
        <select className="input w-auto" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Waived">Waived</option>
        </select>
      }
    >
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Ticket</th><th>Rule</th><th>Breach</th><th>Date</th><th className="text-right">Amount</th><th>Project</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.name || i}>
                  <td><Link href={`/sla-penalties/${r.name}`} className="text-blue-700 underline">{r.name || '-'}</Link></td>
                  <td>{r.ticket || '-'}</td>
                  <td>{r.rule || '-'}</td>
                  <td>{r.breach_type || '-'}</td>
                  <td>{formatDate(r.calculated_on)}</td>
                  <td className="text-right">{formatCurrency(r.amount)}</td>
                  <td>{r.project || '-'}</td>
                  <td><span className={`badge ${badge(SLA_PENALTY_BADGES, r.status)}`}>{r.status || '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RegisterPage>
  );
}
