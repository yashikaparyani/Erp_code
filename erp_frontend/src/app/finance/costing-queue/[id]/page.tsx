'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import AccountabilityTimeline from '@/components/accountability/AccountabilityTimeline';
import { callOps, formatCurrency, formatDate, QUEUE_BADGES, statusVariant, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type Entry = Record<string, any>;

export default function CostingQueueDetailPage() {
  const { id } = useParams() as { id: string };
  const { currentUser } = useAuth();
  const [data, setData] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await callOps<Entry>('get_costing_queue_entry', { name: id })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data || {} as Entry;
  const canAct = hasAnyRole(currentUser?.roles, 'Finance Admin', 'Project Head', 'Costing Approver');
  const isPending = d.status === 'Pending';

  return (
    <DetailPage
      title={d.name || id} kicker="Costing Queue Entry"
      backHref="/finance/costing-queue" backLabel="Queue"
      loading={loading} error={error} onRetry={load}
      status={d.status} statusVariant={statusVariant(d.status)}
      headerActions={canAct && isPending ? (
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setAction('Release')}>Release</button>
          <button className="btn btn-secondary" onClick={() => setAction('Hold')}>Hold</button>
          <button className="btn btn-secondary text-red-600" onClick={() => setAction('Reject')}>Reject</button>
        </div>
      ) : undefined}
      identityBlock={
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Entry Details</h3></div>
          <div className="card-body grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Source</span><p>{d.source_type || '-'}</p></div>
            <div><span className="text-gray-500">Source Ref</span><p>{d.source_ref || '-'}</p></div>
            <div><span className="text-gray-500">Project</span><p>{d.project || '-'}</p></div>
            <div><span className="text-gray-500">Amount</span><p className="font-semibold">{formatCurrency(d.amount)}</p></div>
            <div><span className="text-gray-500">Requested By</span><p>{d.requested_by || '-'}</p></div>
            <div><span className="text-gray-500">Requested On</span><p>{formatDate(d.requested_date)}</p></div>
          </div>
        </div>
      }
      sidePanels={<AccountabilityTimeline subjectDoctype="Costing Queue Entry" subjectName={id} />}
    >
      {/* PH Approval Info */}
      {d.ph_approved_by && (
        <div className="card mb-4">
          <div className="card-header"><h3 className="font-semibold">Project Head Approval</h3></div>
          <div className="card-body grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Approved By</span><p>{d.ph_approved_by}</p></div>
            <div><span className="text-gray-500">Approved On</span><p>{formatDate(d.ph_approved_date)}</p></div>
            <div className="col-span-2"><span className="text-gray-500">Remarks</span><p>{d.ph_remarks || '-'}</p></div>
          </div>
        </div>
      )}

      {/* Costing Decision */}
      {d.decided_by && (
        <div className="card mb-4">
          <div className="card-header"><h3 className="font-semibold">Costing Decision</h3></div>
          <div className="card-body grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Decision</span><p className="font-semibold">{d.decision || d.status}</p></div>
            <div><span className="text-gray-500">Decided By</span><p>{d.decided_by}</p></div>
            <div><span className="text-gray-500">Decided On</span><p>{formatDate(d.decided_date)}</p></div>
            <div className="col-span-2"><span className="text-gray-500">Remarks</span><p>{d.decision_remarks || '-'}</p></div>
          </div>
        </div>
      )}

      <ActionModal
        open={!!action} title={`${action} Queue Entry`}
        confirmLabel={action || ''} variant={action === 'Reject' ? 'danger' : 'default'}
        fields={[{ name: 'remarks', label: 'Remarks', type: 'textarea', required: action === 'Reject' }]}
        onConfirm={async (v) => { await callOps('action_costing_queue_entry', { name: id, action: action!.toLowerCase(), ...v }); setAction(null); load(); }}
        onCancel={() => setAction(null)}
      />
    </DetailPage>
  );
}
