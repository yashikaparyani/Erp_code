'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { callOps, formatCurrency, formatDate, PENALTY_BADGES, badge, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type Penalty = { name?: string; project?: string; source?: string; penalty_date?: string; amount?: number; applied_to_invoice?: string; status?: string; reason?: string };

export default function PenaltiesPage() {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await callOps<Penalty[]>('get_penalties')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const canCreate = hasAnyRole(currentUser?.roles, 'Finance Officer', 'Finance Admin', 'Project Head');
  const total = rows.reduce((t, r) => t + Number(r.amount || 0), 0);
  const applied = rows.filter(r => r.applied_to_invoice).length;

  return (
    <RegisterPage
      title="Penalties" description="All penalties across projects"
      loading={loading} error={error} onRetry={load} empty={!loading && !rows.length}
      stats={[
        { label: 'Total Penalties', value: String(rows.length) },
        { label: 'Total Amount', value: formatCurrency(total), variant: 'error' },
        { label: 'Applied to Invoice', value: String(applied), variant: 'success' },
      ]}
      headerActions={canCreate ? <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />Add Penalty</button> : undefined}
    >
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Penalty</th><th>Project</th><th>Source</th><th>Date</th><th className="text-right">Amount</th><th>Invoice</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name || i}>
                  <td><Link href={`/finance/penalties/${r.name}`} className="text-blue-700 underline">{r.name || '-'}</Link></td>
                  <td>{r.project || '-'}</td>
                  <td>{r.source || '-'}</td>
                  <td>{formatDate(r.penalty_date)}</td>
                  <td className="text-right">{formatCurrency(r.amount)}</td>
                  <td>{r.applied_to_invoice || '-'}</td>
                  <td className="max-w-[200px] truncate">{r.reason || '-'}</td>
                  <td><span className={`badge ${badge(PENALTY_BADGES, r.status)}`}>{r.status || '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal open={showCreate} title="Add Penalty" onCancel={() => setShowCreate(false)}
        fields={[
          { name: 'project', label: 'Project', type: 'text', required: true },
          { name: 'source', label: 'Source', type: 'select', options: [{value:'Client',label:'Client'},{value:'Internal',label:'Internal'},{value:'SLA',label:'SLA'},{value:'Regulatory',label:'Regulatory'}] },
          { name: 'penalty_date', label: 'Date', type: 'date', required: true },
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
        ]}
        onConfirm={async (v) => { await callOps('create_penalty', v); setShowCreate(false); load(); }}
      />
    </RegisterPage>
  );
}
