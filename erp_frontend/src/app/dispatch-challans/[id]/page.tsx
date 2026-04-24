'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Send, CheckCircle2, XCircle, Truck } from 'lucide-react';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { formatDate, statusVariant } from '@/components/procurement/proc-helpers';
import { useAuth } from '@/context/AuthContext';

interface ChallanItem {
  item_code?: string;
  item_name?: string;
  description?: string;
  make?: string;
  model_no?: string;
  serial_numbers?: string;
  remarks?: string;
  qty?: number;
  uom?: string;
  rate?: number;
  amount?: number;
}
interface ChallanDetail {
  name: string; dispatch_date?: string; dispatch_type?: string; status?: string;
  from_warehouse?: string; to_warehouse?: string; target_site_name?: string;
  linked_project?: string; linked_stock_entry?: string; total_items?: number;
  total_qty?: number; approved_by?: string; approved_at?: string;
  challan_reference?: string; issued_to_name?: string; vehicle_number?: string;
  transporter_name?: string; rejection_reason?: string; remarks?: string;
  linked_receipt?: string; receipt_status?: string; receipt_date?: string; fulfilment_status?: string;
  items?: ChallanItem[]; creation?: string;
}

function getReceiptBadge(receiptStatus?: string, fulfilmentStatus?: string): { label: string; badgeClass: string } {
  if (receiptStatus === 'APPROVED') return { label: 'GRN Approved', badgeClass: 'badge-success' };
  if (receiptStatus === 'SUBMITTED') return { label: 'GRN Pending Approval', badgeClass: 'badge-info' };
  if (receiptStatus === 'DRAFT') return { label: 'GRN Draft', badgeClass: 'badge-warning' };
  if (receiptStatus === 'REJECTED') return { label: 'GRN Rejected', badgeClass: 'badge-error' };
  if (fulfilmentStatus === 'AWAITING_SITE_GRN') return { label: 'Awaiting Site GRN', badgeClass: 'badge-warning' };
  return { label: 'Not Linked Yet', badgeClass: 'badge-gray' };
}

export default function DispatchChallanDetailPage() {
  const params = useParams();
  const challanName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [dc, setDc] = useState<ChallanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const currentRole = currentUser?.roles?.[0] || '';
  const canApprove = ['Store Manager', 'Stores Logistics Head', 'Project Head', 'Director'].includes(currentRole);
  const canWrite = ['Store Manager', 'Stores Logistics Head', 'Procurement Manager', 'Director'].includes(currentRole);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/dispatch-challans/${encodeURIComponent(challanName)}`);
      const p = await res.json();
      if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      setDc(p.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }, [challanName]);

  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setSuccess(m); setTimeout(() => setSuccess(''), 3000); };

  const runAction = async (action: string, extra?: Record<string, string>) => {
    setBusy(action); setError('');
    try {
      const res = await fetch(`/api/dispatch-challans/${encodeURIComponent(challanName)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
      const p = await res.json();
      if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      flash(p.message || 'Done'); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(''); }
  };

  const actions = dc ? (
    <div className="flex flex-wrap gap-2">
      {dc.status === 'DRAFT' && canWrite && <button onClick={() => runAction('submit')} disabled={!!busy} className="btn btn-primary !text-xs"><Send className="h-3.5 w-3.5" />{busy === 'submit' ? 'Submitting…' : 'Submit'}</button>}
      {dc.status === 'PENDING_APPROVAL' && canApprove && (
        <>
          <button onClick={() => runAction('approve')} disabled={!!busy} className="btn btn-primary !text-xs"><CheckCircle2 className="h-3.5 w-3.5" />{busy === 'approve' ? 'Approving…' : 'Approve'}</button>
          <button onClick={() => setRejectModal(true)} disabled={!!busy} className="btn btn-secondary !text-xs text-rose-700"><XCircle className="h-3.5 w-3.5" />Reject</button>
        </>
      )}
      {dc.status === 'APPROVED' && canWrite && <button onClick={() => runAction('dispatch')} disabled={!!busy} className="btn btn-primary !text-xs"><Truck className="h-3.5 w-3.5" />{busy === 'dispatch' ? 'Dispatching…' : 'Mark Dispatched'}</button>}
    </div>
  ) : undefined;

  const receiptBadge = getReceiptBadge(dc?.receipt_status, dc?.fulfilment_status);

  return (
    <DetailPage
      title={dc?.name || challanName}
      kicker="Dispatch Challan"
      backHref="/dispatch-challans"
      backLabel="Back to Dispatch Challans"
      loading={loading} error={error} onRetry={load}
      status={dc?.status?.replace(/_/g, ' ')} statusVariant={statusVariant(dc?.status)}
      headerActions={actions}
      identityBlock={dc ? (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          {[['Date', formatDate(dc.dispatch_date)], ['Reference', dc.challan_reference], ['Type', dc.dispatch_type], ['From', dc.dispatch_type === 'VENDOR_TO_SITE' ? 'Vendor Direct' : dc.from_warehouse], ['To', dc.to_warehouse || dc.target_site_name], ['Issued To', dc.issued_to_name], ['Vehicle', dc.vehicle_number], ['Transporter', dc.transporter_name], ['Project', dc.linked_project], ['Items', dc.total_items], ['Qty', dc.total_qty], ['Approved By', dc.approved_by ? `${dc.approved_by}${dc.approved_at ? ` on ${formatDate(dc.approved_at)}` : ''}` : undefined], ['Stock Entry', dc.linked_stock_entry], ['Created', formatDate(dc.creation)]].map(([l, v]) => (
            <div key={String(l)}><dt className="text-gray-500">{String(l)}</dt><dd className="font-medium text-gray-900">{String(v || '-')}</dd></div>
          ))}
        </dl>
      ) : undefined}
      sidePanels={dc ? (
        <>
          <RecordDocumentsPanel referenceDoctype="GE Dispatch Challan" referenceName={challanName} title="Documents" />
          <LinkedRecordsPanel links={dc.linked_project ? [{ label: 'Project', doctype: 'GE Project', method: 'frappe.client.get_list', args: { doctype: 'GE Project', filters: JSON.stringify({ name: dc.linked_project }), fields: JSON.stringify(['name', 'project_name', 'status']), limit_page_length: '5' }, href: (n: string) => `/projects/${n}` }] : []} />
          <div className="shell-panel p-4"><h3 className="text-sm font-semibold text-gray-900 mb-3">Accountability</h3><AccountabilityTimeline subjectDoctype="GE Dispatch Challan" subjectName={challanName} compact initialLimit={6} /></div>
        </>
      ) : undefined}
    >
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 mb-4">{success}</div>}
      {dc?.status === 'REJECTED' && dc.rejection_reason && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mb-4"><strong>Rejection Reason:</strong> {dc.rejection_reason}</div>}
      {dc?.remarks && <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 mb-4"><strong>Remarks:</strong> {dc.remarks}</div>}
      {dc && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`badge ${receiptBadge.badgeClass}`}>{receiptBadge.label}</span>
            {dc.linked_receipt ? <Link href={`/grns/${encodeURIComponent(dc.linked_receipt)}`} className="text-blue-700 hover:underline font-medium">{dc.linked_receipt}</Link> : null}
            <span>{dc.receipt_date ? `Receipt dated ${formatDate(dc.receipt_date)}` : 'Site must raise a GRN to close this dispatch.'}</span>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Line Items</h3></div>
        <table className="data-table text-sm">
          <thead><tr><th>#</th><th>Item Code</th><th>Description</th><th>Make / Model</th><th>Serials</th><th className="text-right">Qty</th><th>UOM</th><th>Remarks</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {(dc?.items || []).length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">No items</td></tr> : (dc?.items || []).map((i, idx) => (
              <tr key={idx}>
                <td className="text-gray-500 text-xs">{idx + 1}</td>
                <td className="font-medium">{i.item_code || '-'}</td>
                <td>
                  <div className="text-gray-900">{i.item_name || i.description || '-'}</div>
                  {i.description && i.description !== i.item_name ? <div className="text-xs text-gray-500">{i.description}</div> : null}
                </td>
                <td>
                  <div className="text-gray-700">{i.make || '-'}</div>
                  <div className="text-xs text-gray-500">{i.model_no || '-'}</div>
                </td>
                <td className="text-xs text-gray-600">{i.serial_numbers || '-'}</td>
                <td className="text-right">{i.qty ?? '-'}</td>
                <td className="text-gray-500">{i.uom || '-'}</td>
                <td className="text-xs text-gray-600">{i.remarks || '-'}</td>
                <td className="text-right">{i.rate != null ? `₹${i.rate.toLocaleString('en-IN')}` : '-'}</td>
                <td className="text-right font-medium">{i.amount != null ? `₹${i.amount.toLocaleString('en-IN')}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Next step */}
      <div className="card border-blue-200 bg-blue-50/50 mt-4">
        <div className="p-4 flex items-center justify-between">
          <div><p className="text-xs font-semibold text-blue-700">Next Step</p><p className="text-sm text-gray-600 mt-0.5">Dispatch Challan → <strong>Site GRN</strong> → Project Inventory</p></div>
          <Link href={`/grns?linked_dispatch_challan=${encodeURIComponent(challanName)}${dc?.linked_project ? `&linked_project=${encodeURIComponent(dc.linked_project)}` : ''}`} className="btn btn-primary !text-xs">Raise / View GRN →</Link>
        </div>
      </div>

      <ActionModal open={rejectModal} title="Reject Dispatch Challan" description="Reason for rejection." variant="danger" confirmLabel="Reject" busy={busy === 'reject'} fields={[{ name: 'reason', label: 'Reason', type: 'textarea' as const, required: true }]} onConfirm={async v => { await runAction('reject', { reason: v.reason || '' }); setRejectModal(false); }} onCancel={() => setRejectModal(false)} />
    </DetailPage>
  );
}
