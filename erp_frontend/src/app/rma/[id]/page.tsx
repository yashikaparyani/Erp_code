'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  CheckCircle2, XCircle, Hash, Package, Truck, Clock, Wrench,
  Shield, DollarSign, FileText, AlertTriangle,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { useAuth } from '@/context/AuthContext';

interface RMADetail {
  name: string;
  linked_ticket?: string;
  linked_project?: string;
  item_link?: string;
  asset_serial_number?: string;
  qty?: number;
  faulty_date?: string;
  dispatch_destination?: string;
  service_partner_name?: string;
  warranty_status?: string;
  repairability_status?: string;
  rma_reference_no?: string;
  approval_status?: string;
  rma_purchase_order_no?: string;
  repairing_status?: string;
  aging_days?: number;
  rma_status?: string;
  repair_cost?: number;
  failure_reason?: string;
  field_rca?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(val?: number) {
  if (val == null) return '-';
  return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'PENDING').toUpperCase();
  const style = s === 'CLOSED' ? 'bg-gray-100 text-gray-700 border-gray-200'
    : s === 'REPAIRED' || s === 'REPLACED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'APPROVED' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'IN_TRANSIT' || s === 'IN TRANSIT' ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
    : s === 'UNDER_REPAIR' || s === 'UNDER REPAIR' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s.replace(/_/g, ' ')}</span>;
}

function WarrantyBadge({ status }: { status?: string }) {
  const w = (status || '').toUpperCase();
  const under = w.includes('UNDER');
  return <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${under ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{w.replace(/_/g, ' ') || 'N/A'}</span>;
}

export default function RMADetailPage() {
  const params = useParams();
  const rmaName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<RMADetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canManage = hasRole('Director', 'System Manager', 'O&M Manager', 'RMA Manager');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/rma-trackers/${encodeURIComponent(rmaName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load RMA'); }
    finally { setLoading(false); }
  }, [rmaName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch(`/api/rma-trackers/${encodeURIComponent(rmaName)}/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action}`);
      showSuccess(result.message || `${action} completed`);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : `Failed to ${action}`); }
    finally { setActionBusy(''); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading RMA tracker...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/rma" className="text-sm text-blue-600 hover:underline">← Back to RMA</Link></div>;
  if (!data) return null;

  const st = (data.rma_status || 'PENDING').toUpperCase();
  const isPending = st === 'PENDING';
  const isClosed = st === 'CLOSED';
  const isRejected = st === 'REJECTED';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/rma" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to RMA</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          {data.rma_reference_no && <p className="mt-1 text-sm text-gray-500">Ref: {data.rma_reference_no}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WarrantyBadge status={data.warranty_status} />
          <StatusBadge status={st} />
        </div>
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      {!isClosed && !isRejected && canManage && (
        <div className="flex flex-wrap gap-2">
          {isPending && <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>}
          {isPending && <button onClick={() => setRejectModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Reject</button>}
          {!isPending && <button onClick={() => setStatusModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Truck className="h-3.5 w-3.5" /> Update Status</button>}
          {!isPending && <button onClick={() => runAction('close')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Close</button>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">RMA Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'RMA ID', data.name],
                [<FileText key="t" className="h-3.5 w-3.5" />, 'Linked Ticket', data.linked_ticket],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<Package key="il" className="h-3.5 w-3.5" />, 'Item', data.item_link],
                [<Hash key="asn" className="h-3.5 w-3.5" />, 'Asset Serial', data.asset_serial_number],
                [<Package key="q" className="h-3.5 w-3.5" />, 'Quantity', data.qty],
                [<Calendar key="fd" className="h-3.5 w-3.5" />, 'Faulty Date', formatDate(data.faulty_date)],
                [<Truck key="dd" className="h-3.5 w-3.5" />, 'Dispatch To', data.dispatch_destination?.replace(/_/g, ' ')],
                [<User key="sp" className="h-3.5 w-3.5" />, 'Service Partner', data.service_partner_name],
                [<Shield key="ws" className="h-3.5 w-3.5" />, 'Warranty', data.warranty_status?.replace(/_/g, ' ')],
                [<Wrench key="rs" className="h-3.5 w-3.5" />, 'Repairability', data.repairability_status?.replace(/_/g, ' ')],
                [<Hash key="ref" className="h-3.5 w-3.5" />, 'Reference No', data.rma_reference_no],
                [<CheckCircle2 key="as" className="h-3.5 w-3.5" />, 'Approval', data.approval_status],
                [<FileText key="po" className="h-3.5 w-3.5" />, 'PO Number', data.rma_purchase_order_no],
                [<Wrench key="rps" className="h-3.5 w-3.5" />, 'Repair Status', data.repairing_status],
                [<Clock key="ag" className="h-3.5 w-3.5" />, 'Aging Days', data.aging_days],
                [<DollarSign key="rc" className="h-3.5 w-3.5" />, 'Repair Cost', formatCurrency(data.repair_cost)],
                [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
                [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                  <dd className="font-medium text-gray-900 truncate">{String(value ?? '-')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Failure & RCA</h3></div>
          <div className="card-body space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Failure Reason</h4>
              {data.failure_reason ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.failure_reason}</p> : <p className="text-sm text-gray-400 italic">Not specified</p>}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Field RCA</h4>
              {data.field_rca ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.field_rca}</p> : <p className="text-sm text-gray-400 italic">Not specified</p>}
            </div>
          </div>
        </div>
      </div>

      <LinkedRecordsPanel links={[
        ...(data.linked_ticket ? [{ label: 'Source Ticket', doctype: 'GE Service Ticket', method: 'frappe.client.get_list', args: { doctype: 'GE Service Ticket', filters: JSON.stringify({ name: data.linked_ticket }), fields: JSON.stringify(['name', 'title', 'status', 'priority']), limit_page_length: '5' }, href: (name: string) => `/om-helpdesk/${name}` }] : []),
      ]} />

      <TraceabilityPanel projectId={data.linked_project} />

      <RecordDocumentsPanel referenceDoctype="GE RMA Tracker" referenceName={rmaName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE RMA Tracker" subjectName={rmaName} compact={false} initialLimit={10} /></div></div>

      <ActionModal open={rejectModal} title="Reject RMA" description={`Reject RMA ${data.name}. A reason is required.`} variant="danger" confirmLabel="Reject" busy={actionBusy === 'reject'} fields={[{ name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Reason for rejection...' }]} onConfirm={async (values) => { await runAction('reject', { reason: values.reason || '' }); setRejectModal(false); }} onCancel={() => setRejectModal(false)} />

      <ActionModal open={statusModal} title="Update RMA Status" description={`Update status for ${data.name}.`} variant="default" confirmLabel="Update" busy={actionBusy === 'update_status'} fields={[{ name: 'new_status', label: 'New Status', type: 'select', required: true, options: [{ value: 'IN_TRANSIT', label: 'In Transit' }, { value: 'UNDER_REPAIR', label: 'Under Repair' }, { value: 'REPAIRED', label: 'Repaired' }, { value: 'REPLACED', label: 'Replaced' }] }]} onConfirm={async (values) => { await runAction('update_status', { new_status: values.new_status || '' }); setStatusModal(false); }} onCancel={() => setStatusModal(false)} />
    </div>
  );
}
