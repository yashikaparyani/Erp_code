'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import AccountabilityTimeline from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { callApi, formatCurrency, formatDate, statusVariant, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type Penalty = Record<string, any>;

export default function PenaltyDetailPage() {
  const { id } = useParams() as { id: string };
  const { currentUser } = useAuth();
  const [data, setData] = useState<Penalty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await callApi<Penalty>(`/api/penalties/${encodeURIComponent(id)}`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data || {} as Penalty;
  const canAct = hasAnyRole(currentUser?.roles, 'Finance Admin', 'Finance Officer');
  const isPending = d.status === 'Pending' || d.status === 'Draft';

  return (
    <DetailPage
      title={d.name || id} kicker="Penalty"
      backHref="/finance/penalties" backLabel="Penalties"
      loading={loading} error={error} onRetry={load}
      status={d.status} statusVariant={statusVariant(d.status)}
      headerActions={canAct ? (
        <div className="flex gap-2">
          {(d.status === 'Pending' || d.status === 'Draft' || d.status === 'Approved') && <button className="btn btn-secondary" onClick={() => setAction('Update')}>Update</button>}
          {isPending && <button className="btn btn-primary" onClick={() => setAction('Approve')}>Approve</button>}
          {d.status === 'Approved' && <button className="btn btn-primary" onClick={() => setAction('Apply')}>Apply to Invoice</button>}
          {(d.status === 'Approved' || d.status === 'Applied') && <button className="btn btn-secondary text-red-600" onClick={() => setAction('Reverse')}>Reverse</button>}
          {(d.status === 'Draft' || d.status === 'Pending') && <button className="btn btn-secondary text-red-600" onClick={() => setAction('Delete')}>Delete</button>}
        </div>
      ) : undefined}
      identityBlock={
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Penalty Details</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Source</span><p>{d.source || '-'}</p></div>
              <div><span className="text-gray-500">Project</span><p>{d.project || '-'}</p></div>
              <div><span className="text-gray-500">Customer</span><p>{d.customer || '-'}</p></div>
              <div><span className="text-gray-500">Date</span><p>{formatDate(d.penalty_date)}</p></div>
              <div className="col-span-2"><span className="text-gray-500">Reason</span><p>{d.reason || '-'}</p></div>
            </div>
            <div className="mt-4 border-t pt-4 flex items-center justify-between">
              <span className="text-gray-500">Penalty Amount</span>
              <span className="text-2xl font-bold text-red-700">{formatCurrency(d.amount)}</span>
            </div>
            {d.applied_to_invoice && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">Applied to Invoice</span>
                <span className="font-semibold">{d.applied_to_invoice}</span>
              </div>
            )}
          </div>
        </div>
      }
      sidePanels={
        <>
          <TraceabilityPanel projectId={d.project || null} siteId={null} />
          <RecordDocumentsPanel referenceDoctype="Penalty" referenceName={id} title="Documents" />
          <LinkedRecordsPanel links={d.applied_to_invoice ? [
            { label: 'Invoice', doctype: 'Sales Invoice', method: 'frappe.client.get_list', args: { doctype: 'Sales Invoice', filters: JSON.stringify({ name: d.applied_to_invoice }), fields: JSON.stringify(['name','grand_total','status']), limit_page_length: '5' }, href: (n: string) => `/finance/billing/${n}` },
          ] : []} />
          <AccountabilityTimeline subjectDoctype="Penalty" subjectName={id} />
        </>
      }
    >
      <ActionModal
        open={!!action} title={`${action} Penalty`}
        confirmLabel={action || ''} variant={action === 'Reverse' || action === 'Delete' ? 'danger' : 'default'}
        fields={[
          { name: 'remarks', label: 'Remarks', type: 'textarea', required: action === 'Reverse' || action === 'Delete' },
          ...(action === 'Apply' ? [{ name: 'invoice_name', label: 'Invoice to Apply', type: 'text' as const, required: true }] : []),
        ]}
        onConfirm={async (v) => {
          if (action === 'Approve') {
            await callApi(`/api/penalties/${encodeURIComponent(id)}/actions`, { method: 'POST', body: { action: 'approve' } });
          } else if (action === 'Apply') {
            await callApi(`/api/penalties/${encodeURIComponent(id)}/actions`, { method: 'POST', body: { action: 'apply', invoice_name: v.invoice_name } });
          } else if (action === 'Reverse') {
            await callApi(`/api/penalties/${encodeURIComponent(id)}/actions`, { method: 'POST', body: { action: 'reverse', reason: v.remarks || v.reason } });
          } else if (action === 'Update') {
            await callApi(`/api/penalties/${encodeURIComponent(id)}`, { method: 'PATCH', body: { remarks: v.remarks || '' } });
          } else if (action === 'Delete') {
            await callApi(`/api/penalties/${encodeURIComponent(id)}`, { method: 'DELETE' });
          } else {
            return;
          }
          setAction(null);
          load();
        }}
        onCancel={() => setAction(null)}
      />
    </DetailPage>
  );
}
