'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { callOps, formatCurrency, formatDate, RECEIPT_BADGES, badge, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type Receipt = { name?: string; customer?: string; project?: string; amount?: number; tds_amount?: number; receipt_date?: string; payment_mode?: string; reference_no?: string; status?: string; invoice?: string };

export default function PaymentReceiptsPage() {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await callOps<Receipt[]>('get_payment_receipts')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const canCreate = hasAnyRole(currentUser?.roles, 'Finance Officer', 'Accounts Executive', 'Finance Admin');
  const total = rows.reduce((t, r) => t + Number(r.amount || 0), 0);
  const tds = rows.reduce((t, r) => t + Number(r.tds_amount || 0), 0);

  return (
    <RegisterPage
      title="Payment Receipts" description="All payment receipts across projects"
      loading={loading} error={error} onRetry={load} empty={!loading && !rows.length}
      stats={[
        { label: 'Total Receipts', value: String(rows.length) },
        { label: 'Total Received', value: formatCurrency(total), variant: 'success' },
        { label: 'Total TDS', value: formatCurrency(tds), variant: 'warning' },
      ]}
      headerActions={canCreate ? <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />Record Receipt</button> : undefined}
    >
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Receipt</th><th>Customer</th><th>Invoice</th><th>Date</th><th>Mode</th><th className="text-right">Amount</th><th className="text-right">TDS</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name || i}>
                  <td><Link href={`/finance/payment-receipts/${r.name}`} className="text-blue-700 underline">{r.name || '-'}</Link></td>
                  <td>{r.customer || '-'}</td>
                  <td>{r.invoice || '-'}</td>
                  <td>{formatDate(r.receipt_date)}</td>
                  <td>{r.payment_mode || '-'}</td>
                  <td className="text-right">{formatCurrency(r.amount)}</td>
                  <td className="text-right">{formatCurrency(r.tds_amount)}</td>
                  <td><span className={`badge ${badge(RECEIPT_BADGES, r.status)}`}>{r.status || '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal open={showCreate} title="Record Payment Receipt" onCancel={() => setShowCreate(false)}
        fields={[
          { name: 'invoice', label: 'Invoice', type: 'text', required: true },
          { name: 'project', label: 'Project', type: 'text' },
          { name: 'receipt_date', label: 'Receipt Date', type: 'date', required: true },
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          { name: 'tds_amount', label: 'TDS Amount', type: 'number' },
          { name: 'payment_mode', label: 'Payment Mode', type: 'select', options: [{value:'NEFT',label:'NEFT'},{value:'RTGS',label:'RTGS'},{value:'Cheque',label:'Cheque'},{value:'DD',label:'DD'},{value:'Cash',label:'Cash'},{value:'UPI',label:'UPI'}] },
          { name: 'reference_no', label: 'Reference No.', type: 'text' },
        ]}
        onConfirm={async (v) => { await callOps('create_payment_receipt', v); setShowCreate(false); load(); }}
      />
    </RegisterPage>
  );
}
