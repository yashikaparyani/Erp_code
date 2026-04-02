'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import AccountabilityTimeline from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { callOps, formatCurrency, formatDate, SLA_PENALTY_BADGES, statusVariant, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type SLA = Record<string, any>;

export default function SLAPenaltyDetailPage() {
  const { id } = useParams() as { id: string };
  const { currentUser } = useAuth();
  const [data, setData] = useState<SLA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await callOps<SLA>('get_sla_penalty', { name: id })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data || {} as SLA;
  const canAct = hasAnyRole(currentUser?.roles, 'Finance Admin', 'SLA Manager');
  const isPending = d.status === 'Pending';

  return (
    <DetailPage
      title={d.name || id} kicker="SLA Penalty"
      backHref="/sla-penalties" backLabel="SLA Penalties"
      loading={loading} error={error} onRetry={load}
      status={d.status} statusVariant={statusVariant(d.status)}
      headerActions={canAct && isPending ? (
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setAction('Approve')}>Approve</button>
          <button className="btn btn-secondary text-red-600" onClick={() => setAction('Reject')}>Reject</button>
          <button className="btn btn-secondary" onClick={() => setAction('Waive')}>Waive</button>
        </div>
      ) : undefined}
      identityBlock={
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="stat-card"><span className="text-gray-500 text-xs">Penalty Amount</span><p className="font-semibold text-lg text-red-700">{formatCurrency(d.amount)}</p></div>
            <div className="stat-card"><span className="text-gray-500 text-xs">Breach Type</span><p className="font-semibold text-lg">{d.breach_type || '-'}</p></div>
            <div className="stat-card"><span className="text-gray-500 text-xs">Calculated On</span><p className="font-semibold text-lg">{formatDate(d.calculated_on)}</p></div>
          </div>
          {/* Detail Card */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Details</h3></div>
            <div className="card-body grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Ticket</span><p>{d.ticket || '-'}</p></div>
              <div><span className="text-gray-500">SLA Rule</span><p>{d.rule || '-'}</p></div>
              <div><span className="text-gray-500">Project</span><p>{d.project || '-'}</p></div>
              <div><span className="text-gray-500">Customer</span><p>{d.customer || '-'}</p></div>
              <div><span className="text-gray-500">Approved By</span><p>{d.approved_by || '-'}</p></div>
              <div><span className="text-gray-500">Invoice</span><p>{d.invoice || '-'}</p></div>
              <div className="col-span-2"><span className="text-gray-500">Description</span><p>{d.description || '-'}</p></div>
            </div>
          </div>
        </>
      }
      sidePanels={
        <>
          <RecordDocumentsPanel referenceDoctype="SLA Penalty" referenceName={id} title="Documents" />
          <LinkedRecordsPanel links={[
            ...(d.ticket ? [{ label: 'Ticket', doctype: 'SLA Ticket', method: 'frappe.client.get_list', args: { doctype: 'SLA Ticket', filters: JSON.stringify({ name: d.ticket }), fields: JSON.stringify(['name','subject','status']), limit_page_length: '5' }, href: (n: string) => `/sla-penalties/${n}` }] : []),
          ]} />
          <AccountabilityTimeline subjectDoctype="SLA Penalty" subjectName={id} />
        </>
      }
    >
      <ActionModal
        open={!!action} title={`${action} SLA Penalty`}
        confirmLabel={action || ''} variant={action === 'Reject' ? 'danger' : 'default'}
        fields={[{ name: 'remarks', label: 'Remarks', type: 'textarea', required: action !== 'Approve' }]}
        onConfirm={async (v) => { await callOps('action_sla_penalty', { name: id, action: action!.toLowerCase(), ...v }); setAction(null); load(); }}
        onCancel={() => setAction(null)}
      />
    </DetailPage>
  );
}
