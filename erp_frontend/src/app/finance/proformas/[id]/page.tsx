'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import AccountabilityTimeline from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { callApi, formatCurrency, formatDate, PROFORMA_BADGES, statusVariant, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type Proforma = Record<string, any>;

export default function ProformaDetailPage() {
  const { id } = useParams() as { id: string };
  const { currentUser } = useAuth();
  const [data, setData] = useState<Proforma | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await callApi<Proforma>(`/api/proformas/${encodeURIComponent(id)}`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data || {} as Proforma;
  const items: any[] = d.items || [];
  const canApprove = hasAnyRole(currentUser?.roles, 'Finance Admin', 'Proforma Approver');
  const canEdit = hasAnyRole(currentUser?.roles, 'Finance Officer', 'Finance Admin');

  // Due date logic
  const dueDate = d.due_date ? new Date(d.due_date) : null;
  const now = new Date();
  const diffDays = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / 86400000) : null;
  const dueLabel = diffDays !== null ? (diffDays < 0 ? `Overdue by ${Math.abs(diffDays)}d` : diffDays === 0 ? 'Due today' : `Due in ${diffDays}d`) : '-';

  return (
    <DetailPage
      title={d.name || id} kicker="Proforma Invoice"
      backHref="/finance/proformas" backLabel="Proformas"
      loading={loading} error={error} onRetry={load}
      status={d.status} statusVariant={statusVariant(d.status)}
      headerActions={
        <div className="flex gap-2">
          {canEdit && d.status === 'Draft' && <button className="btn btn-primary" onClick={() => setAction('Send')}>Send</button>}
          {canEdit && (d.status === 'Draft' || d.status === 'Sent') && <button className="btn btn-secondary" onClick={() => setAction('Update')}>Update</button>}
          {canApprove && d.status === 'Sent' && <button className="btn btn-primary" onClick={() => setAction('Approve')}>Approve</button>}
          {canApprove && (d.status === 'Sent' || d.status === 'Draft') && <button className="btn btn-secondary text-red-600" onClick={() => setAction('Cancel')}>Cancel</button>}
          {canEdit && d.status === 'Approved' && <button className="btn btn-primary" onClick={() => setAction('Convert')}>Convert to Invoice</button>}
          {canEdit && d.status === 'Draft' && <button className="btn btn-secondary text-red-600" onClick={() => setAction('Delete')}>Delete</button>}
        </div>
      }
      identityBlock={
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Financial Summary</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-gray-500">Customer</span><p>{d.customer || '-'}</p></div>
              <div><span className="text-gray-500">Project</span><p>{d.project || '-'}</p></div>
              <div><span className="text-gray-500">Issue Date</span><p>{formatDate(d.posting_date)}</p></div>
              <div>
                <span className="text-gray-500">Due Date</span>
                <p className={diffDays !== null && diffDays < 0 ? 'text-red-600 font-semibold' : ''}>{formatDate(d.due_date)} <span className="text-xs">({dueLabel})</span></p>
              </div>
            </div>
            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between"><span>Gross Total</span><span className="font-semibold">{formatCurrency(d.grand_total)}</span></div>
              <div className="flex justify-between"><span>+ GST</span><span>{formatCurrency(d.total_taxes)}</span></div>
              <div className="flex justify-between"><span>− TDS</span><span>{formatCurrency(d.tds_amount)}</span></div>
              <div className="flex justify-between"><span>− Retention</span><span>{formatCurrency(d.retention_amount)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2"><span>Net Amount</span><span>{formatCurrency(d.net_amount)}</span></div>
            </div>
          </div>
        </div>
      }
      sidePanels={
        <>
          <TraceabilityPanel projectId={d.project || null} siteId={null} />
          <RecordDocumentsPanel referenceDoctype="Proforma Invoice" referenceName={id} title="Documents" />
          <LinkedRecordsPanel links={[
            ...(d.linked_estimate ? [{ label: 'Estimate', doctype: 'Estimate', method: 'frappe.client.get_list', args: { doctype: 'Estimate', filters: JSON.stringify({ name: d.linked_estimate }), fields: JSON.stringify(['name','grand_total','status']), limit_page_length: '5' }, href: (n: string) => `/finance/estimates/${n}` }] : []),
            { label: 'Invoices', doctype: 'Sales Invoice', method: 'frappe.client.get_list', args: { doctype: 'Sales Invoice', filters: JSON.stringify({ proforma: id }), fields: JSON.stringify(['name','grand_total','status']), limit_page_length: '10' }, href: (n: string) => `/finance/billing/${n}` },
          ]} />
          <AccountabilityTimeline subjectDoctype="Proforma Invoice" subjectName={id} />
        </>
      }
    >
      {/* Line Items */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold">Line Items</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {!items.length ? <tr><td colSpan={6} className="py-6 text-center text-gray-500">No items</td></tr>
                : items.map((it: any, i: number) => (
                  <tr key={i}><td>{i + 1}</td><td>{it.description || '-'}</td><td>{it.qty}</td><td>{it.unit || '-'}</td><td className="text-right">{formatCurrency(it.rate)}</td><td className="text-right">{formatCurrency(it.amount)}</td></tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <ActionModal
        open={!!action} title={`${action} Proforma`}
        confirmLabel={action || ''} variant={action === 'Cancel' || action === 'Delete' ? 'danger' : 'default'}
        fields={action === 'Cancel' || action === 'Delete' ? [{ name: 'reason', label: 'Reason', type: 'textarea', required: true }] : [{ name: 'remarks', label: 'Remarks', type: 'textarea' }]}
        onConfirm={async (v) => {
          const methodMap: Record<string, string> = {
            Send: 'submit_proforma_invoice',
            Approve: 'approve_proforma_invoice',
            Cancel: 'cancel_proforma_invoice',
            Convert: 'convert_proforma_to_invoice',
            Update: 'update_proforma_invoice',
            Delete: 'delete_proforma_invoice',
          };
          const actionSlug: Record<string, string> = { Send: 'send', Approve: 'approve', Cancel: 'cancel', Convert: 'convert', Update: 'update', Delete: 'delete' };
          const slug = actionSlug[action || ''];
          if (!slug) return;
          await callApi(`/api/proformas/${encodeURIComponent(id)}/actions`, { method: 'POST', body: { action: slug, ...v } });
          setAction(null);
          load();
        }}
        onCancel={() => setAction(null)}
      />
    </DetailPage>
  );
}
