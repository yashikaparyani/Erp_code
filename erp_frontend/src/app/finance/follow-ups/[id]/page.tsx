'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import AccountabilityTimeline from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { callOps, formatCurrency, formatDate, FOLLOW_UP_BADGES, statusVariant, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type FollowUp = Record<string, any>;

export default function FollowUpDetailPage() {
  const { id } = useParams() as { id: string };
  const { currentUser } = useAuth();
  const [data, setData] = useState<FollowUp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await callOps<FollowUp>('get_follow_up', { name: id })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data || {} as FollowUp;
  const canAct = hasAnyRole(currentUser?.roles, 'Finance Officer', 'Finance Admin', 'Collections Executive');
  const isOpen = d.status === 'Open' || d.status === 'Escalated';

  return (
    <DetailPage
      title={d.name || id} kicker="Payment Follow-Up"
      backHref="/finance/follow-ups" backLabel="Follow-Ups"
      loading={loading} error={error} onRetry={load}
      status={d.status} statusVariant={statusVariant(d.status)}
      headerActions={canAct && isOpen ? (
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setAction('Close')}>Close</button>
          <button className="btn btn-secondary" onClick={() => setAction('Escalate')}>Escalate</button>
        </div>
      ) : undefined}
      identityBlock={
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="stat-card"><span className="text-gray-500 text-xs">Promised Amount</span><p className="font-semibold text-lg">{formatCurrency(d.promised_amount)}</p></div>
            <div className="stat-card"><span className="text-gray-500 text-xs">Promised Date</span><p className="font-semibold text-lg">{formatDate(d.promised_date)}</p></div>
            <div className="stat-card"><span className="text-gray-500 text-xs">Next Follow-Up</span><p className="font-semibold text-lg">{formatDate(d.next_follow_up)}</p></div>
            <div className="stat-card"><span className="text-gray-500 text-xs">Escalation Level</span><p className="font-semibold text-lg">{d.escalation_level || 0}</p></div>
          </div>
          {/* Detail Card */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Details</h3></div>
            <div className="card-body grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Customer</span><p>{d.customer || '-'}</p></div>
              <div><span className="text-gray-500">Project</span><p>{d.project || '-'}</p></div>
              <div><span className="text-gray-500">Invoice</span><p>{d.invoice || '-'}</p></div>
              <div><span className="text-gray-500">Contact Person</span><p>{d.contact_person || '-'}</p></div>
              <div><span className="text-gray-500">Assigned To</span><p>{d.assigned_to || '-'}</p></div>
              <div className="col-span-2"><span className="text-gray-500">Notes</span><p>{d.notes || '-'}</p></div>
            </div>
          </div>
        </>
      }
      sidePanels={
        <>
          <RecordDocumentsPanel referenceDoctype="Follow Up" referenceName={id} title="Documents" />
          <LinkedRecordsPanel links={[
            ...(d.invoice ? [{ label: 'Invoice', doctype: 'Sales Invoice', method: 'frappe.client.get_list', args: { doctype: 'Sales Invoice', filters: JSON.stringify({ name: d.invoice }), fields: JSON.stringify(['name','grand_total','status']), limit_page_length: '5' }, href: (n: string) => `/finance/billing/${n}` }] : []),
          ]} />
          <AccountabilityTimeline subjectDoctype="Follow Up" subjectName={id} />
        </>
      }
    >
      <ActionModal
        open={!!action} title={`${action} Follow-Up`}
        confirmLabel={action || ''} variant={action === 'Close' ? 'default' : 'default'}
        fields={[
          { name: 'remarks', label: 'Remarks', type: 'textarea', required: true },
          ...(action === 'Close' ? [{ name: 'collected_amount', label: 'Collected Amount', type: 'text' as const }] : []),
          ...(action === 'Escalate' ? [{ name: 'escalate_to', label: 'Escalate To', type: 'text' as const }] : []),
        ]}
        onConfirm={async (v) => { await callOps('action_follow_up', { name: id, action: action!.toLowerCase(), ...v }); setAction(null); load(); }}
        onCancel={() => setAction(null)}
      />
    </DetailPage>
  );
}
