'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import AccountabilityTimeline from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { formatCurrency, formatDate, RECEIPT_BADGES, statusVariant } from '@/components/finance/fin-helpers';

type Receipt = Record<string, any>;

export default function PaymentReceiptDetailPage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<'update' | 'delete' | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/payment-receipts/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed');
      setData(json.data ?? json);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data || {} as Receipt;

  return (
    <DetailPage
      title={d.name || id} kicker="Payment Receipt"
      backHref="/finance/payment-receipts" backLabel="Receipts"
      loading={loading} error={error} onRetry={load}
      status={d.status} statusVariant={statusVariant(d.status)}
      headerActions={
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setAction('update')}>Update</button>
          <button className="btn btn-secondary text-red-600" onClick={() => setAction('delete')}>Delete</button>
        </div>
      }
      identityBlock={
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Receipt Details</h3></div>
          <div className="card-body grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Customer</span><p>{d.customer || '-'}</p></div>
            <div><span className="text-gray-500">Project</span><p>{d.project || '-'}</p></div>
            <div><span className="text-gray-500">Invoice</span><p>{d.invoice || '-'}</p></div>
            <div><span className="text-gray-500">Receipt Date</span><p>{formatDate(d.receipt_date)}</p></div>
            <div><span className="text-gray-500">Payment Mode</span><p>{d.payment_mode || '-'}</p></div>
            <div><span className="text-gray-500">Reference No.</span><p>{d.reference_no || '-'}</p></div>
            <div><span className="text-gray-500">Bank</span><p>{d.bank || '-'}</p></div>
            <div><span className="text-gray-500">Bank Account</span><p>{d.bank_account || '-'}</p></div>
            <div><span className="text-gray-500">Cheque No.</span><p>{d.cheque_no || '-'}</p></div>
            <div><span className="text-gray-500">Cheque Date</span><p>{formatDate(d.cheque_date)}</p></div>
            <div><span className="text-gray-500">Received By</span><p>{d.received_by || '-'}</p></div>
            <div><span className="text-gray-500">Remarks</span><p>{d.remarks || '-'}</p></div>
          </div>
        </div>
      }
      sidePanels={
        <>
          <TraceabilityPanel projectId={d.project || null} siteId={null} />
          <RecordDocumentsPanel referenceDoctype="Payment Receipt" referenceName={id} title="Documents" />
          <LinkedRecordsPanel links={d.invoice ? [
            { label: 'Invoice', doctype: 'Sales Invoice', method: 'frappe.client.get_list', args: { doctype: 'Sales Invoice', filters: JSON.stringify({ name: d.invoice }), fields: JSON.stringify(['name','grand_total','status']), limit_page_length: '5' }, href: (n: string) => `/finance/billing/${n}` },
          ] : []} />
          <AccountabilityTimeline subjectDoctype="Payment Receipt" subjectName={id} />
        </>
      }
    >
      {/* Amount Summary */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold">Amount Summary</h3></div>
        <div className="card-body space-y-2 text-sm">
          <div className="flex justify-between"><span>Amount Received</span><span className="font-semibold">{formatCurrency(d.amount)}</span></div>
          <div className="flex justify-between"><span>Adjusted Against Invoice</span><span>{formatCurrency(d.adjusted_amount)}</span></div>
          <div className="flex justify-between"><span>TDS Deducted</span><span>{formatCurrency(d.tds_amount)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-2"><span>Unadjusted Balance</span><span className="text-orange-600">{formatCurrency(d.unadjusted_amount)}</span></div>
        </div>
      </div>

      <ActionModal
        open={!!action}
        title={action === 'delete' ? 'Delete Payment Receipt' : 'Update Payment Receipt'}
        confirmLabel={action === 'delete' ? 'Delete' : 'Update'}
        variant={action === 'delete' ? 'danger' : 'default'}
        fields={[
          { name: 'remarks', label: action === 'delete' ? 'Delete Reason' : 'Update Note', type: 'textarea', required: action === 'delete' },
        ]}
        onConfirm={async (v) => {
          if (action === 'delete') {
            await fetch(`/api/payment-receipts/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
          } else {
            await fetch(`/api/payment-receipts/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
          }
          setAction(null);
          load();
        }}
        onCancel={() => setAction(null)}
      />
    </DetailPage>
  );
}
