'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import AccountabilityTimeline from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { formatCurrency, formatDate, INVOICE_BADGES, statusVariant, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type Invoice = Record<string, any>;

export default function BillingDetailPage() {
  const { id } = useParams() as { id: string };
  const { currentUser } = useAuth();
  const [data, setData] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReject, setShowReject] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed');
      setData(json.data ?? json);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data || {} as Invoice;
  const items: any[] = d.items || [];
  const canApprove = hasAnyRole(currentUser?.roles, 'Finance Admin', 'Billing Approver');
  const canSubmit = hasAnyRole(currentUser?.roles, 'Finance Officer', 'Finance Admin');

  return (
    <DetailPage
      title={d.name || id} kicker="Sales Invoice"
      backHref="/finance/billing" backLabel="Billing"
      loading={loading} error={error} onRetry={load}
      status={d.status} statusVariant={statusVariant(d.status)}
      headerActions={
        <div className="flex gap-2">
          {canSubmit && d.status === 'Draft' && <button className="btn btn-primary" onClick={async () => { await fetch(`/api/invoices/${encodeURIComponent(id)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit' }) }); load(); }}>Submit</button>}
          {canApprove && d.status === 'Pending' && <button className="btn btn-primary" onClick={async () => { await fetch(`/api/invoices/${encodeURIComponent(id)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve' }) }); load(); }}>Approve</button>}
          {canApprove && d.status === 'Pending' && <button className="btn btn-secondary text-red-600" onClick={() => setShowReject(true)}>Reject</button>}
          {canApprove && d.status === 'Approved' && <button className="btn btn-primary" onClick={async () => { await fetch(`/api/invoices/${encodeURIComponent(id)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_paid' }) }); load(); }}>Mark Paid</button>}
        </div>
      }
      identityBlock={
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Financial Summary</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Customer</span><p>{d.customer || '-'}</p></div>
              <div><span className="text-gray-500">Project / Site</span><p>{d.project || '-'} / {d.site || '-'}</p></div>
              <div><span className="text-gray-500">Invoice Date</span><p>{formatDate(d.posting_date)}</p></div>
              <div><span className="text-gray-500">Due Date</span><p>{formatDate(d.due_date)}</p></div>
            </div>
            <div className="mt-4 border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Gross Total</span><span className="font-semibold">{formatCurrency(d.grand_total)}</span></div>
              <div className="flex justify-between"><span>+ GST</span><span>{formatCurrency(d.total_taxes)}</span></div>
              <div className="flex justify-between"><span>− TDS</span><span>{formatCurrency(d.tds_amount)}</span></div>
              <div className="flex justify-between"><span>− Retention</span><span>{formatCurrency(d.retention_amount)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2"><span>Net Receivable</span><span>{formatCurrency(d.net_amount)}</span></div>
              <div className="flex justify-between text-orange-600"><span>Outstanding Balance</span><span className="font-semibold">{formatCurrency(d.outstanding_amount)}</span></div>
            </div>
          </div>
        </div>
      }
      sidePanels={
        <>
          <TraceabilityPanel projectId={d.project || null} siteId={d.site || null} />
          <RecordDocumentsPanel referenceDoctype="Sales Invoice" referenceName={id} title="Documents" />
          <LinkedRecordsPanel links={[
            { label: 'Payment Receipts', doctype: 'Payment Receipt', method: 'frappe.client.get_list', args: { doctype: 'Payment Receipt', filters: JSON.stringify({ invoice: id }), fields: JSON.stringify(['name','amount','status']), limit_page_length: '10' }, href: (n: string) => `/finance/payment-receipts/${n}` },
            { label: 'Penalties', doctype: 'Penalty', method: 'frappe.client.get_list', args: { doctype: 'Penalty', filters: JSON.stringify({ applied_to_invoice: id }), fields: JSON.stringify(['name','amount','status']), limit_page_length: '10' }, href: (n: string) => `/finance/penalties/${n}` },
          ]} />
          <AccountabilityTimeline subjectDoctype="Sales Invoice" subjectName={id} />
        </>
      }
    >
      {/* Line Items */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold">Line Items</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>#</th><th>Description</th><th>Milestone</th><th>Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {!items.length ? <tr><td colSpan={6} className="py-6 text-center text-gray-500">No line items</td></tr>
                : items.map((it: any, i: number) => (
                  <tr key={i}><td>{i + 1}</td><td>{it.description || '-'}</td><td>{it.milestone || '-'}</td><td>{it.qty}</td><td className="text-right">{formatCurrency(it.rate)}</td><td className="text-right">{formatCurrency(it.amount)}</td></tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <ActionModal
        open={showReject} title="Reject Invoice"
        confirmLabel="Reject" variant="danger"
        fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
        onConfirm={async (v) => { await fetch(`/api/invoices/${encodeURIComponent(id)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', ...v }) }); setShowReject(false); load(); }}
        onCancel={() => setShowReject(false)}
      />
    </DetailPage>
  );
}
