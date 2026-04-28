'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import {
  callApi, formatDate, formatCurrency, badge, statusVariant, hasAnyRole, useAuth,
  RMA_BADGES, WARRANTY_BADGES,
} from '@/components/om/om-helpers';

interface RMADetail {
  name: string;
  linked_ticket?: string;
  linked_project?: string;
  item_link?: string;
  item_description?: string;
  item_make?: string;
  item_model?: string;
  asset_serial_number?: string;
  qty?: number;
  faulty_date?: string;
  source_location_name?: string;
  received_from_field_date?: string;
  inbound_dc_challan_no?: string;
  problem_description?: string;
  dispatch_destination?: string;
  service_partner_name?: string;
  warranty_status?: string;
  repairability_status?: string;
  rma_reference_no?: string;
  approval_status?: string;
  rma_purchase_order_no?: string;
  repairing_status?: string;
  return_received_dc_challan_no?: string;
  return_dispatch_location_name?: string;
  aging_days?: number;
  rma_status?: string;
  repair_cost?: number;
  failure_reason?: string;
  field_rca?: string;
  creation?: string;
  owner?: string;
}

export default function RMADetailPage() {
  const params = useParams();
  const id = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<RMADetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);

  const canManage = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'OM Operator', 'RMA Manager');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/rma-trackers/${encodeURIComponent(id)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load RMA'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch(`/api/rma-trackers/${encodeURIComponent(id)}/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed: ${action}`);
      showSuccess(result.message || `${action} completed`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : `Failed: ${action}`); }
    finally { setActionBusy(''); }
  };

  const d = data;
  const st = (d?.rma_status || 'PENDING').toUpperCase();
  const isPending = st === 'PENDING';
  const isClosed = st === 'CLOSED';
  const isRejected = st === 'REJECTED';

  return (
    <>
      <DetailPage
        title={d?.name || id}
        kicker={d ? `RMA Tracker${d.rma_reference_no ? ` · Ref: ${d.rma_reference_no}` : ''}` : 'RMA Tracker'}
        backHref="/rma"
        backLabel="Back to RMA"
        loading={loading}
        error={error}
        onRetry={load}
        status={st.replace(/_/g, ' ')}
        statusVariant={statusVariant(st)}
        headerActions={
          <>
            <span className={`badge ${badge(WARRANTY_BADGES, d?.warranty_status)}`}>{(d?.warranty_status || '-').replace(/_/g, ' ')}</span>
            {!isClosed && !isRejected && canManage && (
              <>
                {isPending && <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="btn btn-primary text-xs">Approve</button>}
                {isPending && <button onClick={() => setRejectModal(true)} disabled={!!actionBusy} className="btn btn-secondary text-xs text-rose-600">Reject</button>}
                {!isPending && <button onClick={() => setStatusModal(true)} disabled={!!actionBusy} className="btn btn-primary text-xs">Update Status</button>}
                {!isPending && <button onClick={() => runAction('close')} disabled={!!actionBusy} className="btn btn-secondary text-xs">Close</button>}
              </>
            )}
          </>
        }
        identityBlock={
          d ? (
            <div className="space-y-3">
              {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
              {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
            </div>
          ) : null
        }
        sidePanels={
          <>
            {d && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900">RMA Details</h3></div>
                <div className="card-body">
                  <dl className="space-y-2 text-sm">
                    {([
                      ['RMA ID', d.name], ['Linked Ticket', d.linked_ticket], ['Project', d.linked_project],
                      ['Item', d.item_link], ['Item Description', d.item_description],
                      ['Make / Brand', d.item_make], ['Model', d.item_model],
                      ['Asset Serial', d.asset_serial_number], ['Quantity', String(d.qty ?? '-')],
                      ['Faulty Date', formatDate(d.faulty_date)],
                      ['Problem', d.problem_description],
                      ['Source Location', d.source_location_name],
                      ['Rcvd From Field', formatDate(d.received_from_field_date)],
                      ['Inbound Challan', d.inbound_dc_challan_no],
                      ['Dispatch To', d.dispatch_destination?.replace(/_/g, ' ')],
                      ['Service Partner', d.service_partner_name], ['Warranty', d.warranty_status?.replace(/_/g, ' ')],
                      ['Repairability', d.repairability_status?.replace(/_/g, ' ')], ['Reference No', d.rma_reference_no],
                      ['Approval', d.approval_status], ['PO Number', d.rma_purchase_order_no],
                      ['Repair Status', d.repairing_status],
                      ['Rcvd Svc Challan', d.return_received_dc_challan_no],
                      ['Return Location', d.return_dispatch_location_name],
                      ['Aging Days', String(d.aging_days ?? '-')],
                      ['Repair Cost', formatCurrency(d.repair_cost)], ['Created By', d.owner], ['Created', formatDate(d.creation)],
                    ] as [string, string | undefined][]).map(([label, value]) => (
                      <div key={label} className="flex gap-2">
                        <dt className="text-gray-500 w-28 shrink-0">{label}</dt>
                        <dd className="font-medium text-gray-900 truncate">{value || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            )}
            {d?.linked_ticket && (
              <LinkedRecordsPanel links={[{ label: 'Source Ticket', doctype: 'GE Ticket', method: 'frappe.client.get_list', args: { doctype: 'GE Ticket', filters: JSON.stringify({ name: d.linked_ticket }), fields: JSON.stringify(['name', 'title', 'status', 'priority']), limit_page_length: '5' }, href: (name: string) => `/om-helpdesk/${name}` }]} />
            )}
            <TraceabilityPanel projectId={d?.linked_project} />
            <RecordDocumentsPanel referenceDoctype="GE RMA Tracker" referenceName={id} title="Linked Documents" initialLimit={5} />
            <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE RMA Tracker" subjectName={id} compact={false} initialLimit={10} /></div></div>
          </>
        }
      >
        {d && (
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900">Failure & RCA</h3></div>
            <div className="card-body space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Problem Description</h4>
                {d.problem_description ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{d.problem_description}</p> : <p className="text-sm text-gray-400 italic">Not specified</p>}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Failure Reason</h4>
                {d.failure_reason ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{d.failure_reason}</p> : <p className="text-sm text-gray-400 italic">Not specified</p>}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Field RCA</h4>
                {d.field_rca ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{d.field_rca}</p> : <p className="text-sm text-gray-400 italic">Not specified</p>}
              </div>
            </div>
          </div>
        )}
      </DetailPage>

      <ActionModal open={rejectModal} title="Reject RMA" description={`Reject RMA ${id}. A reason is required.`} variant="danger" confirmLabel="Reject" busy={actionBusy === 'reject'} fields={[{ name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Reason for rejection...' }]} onConfirm={async (values) => { await runAction('reject', { reason: values.reason || '' }); setRejectModal(false); }} onCancel={() => setRejectModal(false)} />

      <ActionModal open={statusModal} title="Update RMA Status" description={`Update status for ${id}.`} confirmLabel="Update" busy={actionBusy === 'update_status'} fields={[{ name: 'new_status', label: 'New Status', type: 'select', required: true, options: [{ value: 'IN_TRANSIT', label: 'In Transit' }, { value: 'UNDER_REPAIR', label: 'Under Repair' }, { value: 'REPAIRED', label: 'Repaired' }, { value: 'REPLACED', label: 'Replaced' }] }]} onConfirm={async (values) => { await runAction('update_status', { new_status: values.new_status || '' }); setStatusModal(false); }} onCancel={() => setStatusModal(false)} />
    </>
  );
}
