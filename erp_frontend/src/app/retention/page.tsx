'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { callOps, formatCurrency, formatDate, RETENTION_BADGES, badge, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type Retention = { name?: string; project?: string; invoice?: string; retention_pct?: number; amount?: number; released_amount?: number; due_date?: string; status?: string };

export default function RetentionPage() {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState<Retention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await callOps<Retention[]>('get_retentions')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const canCreate = hasAnyRole(currentUser?.roles, 'Finance Officer', 'Finance Admin');
  const held = rows.reduce((t, r) => t + Number(r.amount || 0), 0);
  const released = rows.reduce((t, r) => t + Number(r.released_amount || 0), 0);

  return (
    <RegisterPage
      title="Retention" description="Retention money held and released across projects"
      loading={loading} error={error} onRetry={load} empty={!loading && !rows.length}
      stats={[
        { label: 'Entries', value: String(rows.length) },
        { label: 'Total Held', value: formatCurrency(held), variant: 'warning' },
        { label: 'Total Released', value: formatCurrency(released), variant: 'success' },
      ]}
      headerActions={canCreate ? <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />Add Retention</button> : undefined}
    >
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Retention</th><th>Project</th><th>Invoice</th><th>%</th><th className="text-right">Amount</th><th className="text-right">Released</th><th>Due Date</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name || i}>
                  <td><Link href={`/finance/retention/${r.name}`} className="text-blue-700 underline">{r.name || '-'}</Link></td>
                  <td>{r.project || '-'}</td>
                  <td>{r.invoice || '-'}</td>
                  <td>{r.retention_pct ?? '-'}%</td>
                  <td className="text-right">{formatCurrency(r.amount)}</td>
                  <td className="text-right">{formatCurrency(r.released_amount)}</td>
                  <td>{formatDate(r.due_date)}</td>
                  <td><span className={`badge ${badge(RETENTION_BADGES, r.status)}`}>{r.status || '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal open={showCreate} title="Add Retention" onCancel={() => setShowCreate(false)}
        fields={[
          { name: 'project', label: 'Project', type: 'text', required: true },
          { name: 'invoice', label: 'Invoice', type: 'text', required: true },
          { name: 'retention_pct', label: 'Retention %', type: 'number', required: true },
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          { name: 'due_date', label: 'Due Date', type: 'date' },
        ]}
        onConfirm={async (v) => { await callOps('create_retention', v); setShowCreate(false); load(); }}
      />
    </RegisterPage>
  );
}
