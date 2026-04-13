'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Send, CheckCircle2, XCircle, Truck } from 'lucide-react';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import { formatDate, statusVariant } from '@/components/procurement/proc-helpers';
import { useAuth } from '@/context/AuthContext';

interface ChallanItem {
  item_link?: string;
  item_code?: string;
  item_name?: string;
  description?: string;
  make?: string;
  model_no?: string;
  serial_numbers?: string;
  qty?: number;
  uom?: string;
  remarks?: string;
}
interface ChallanDetail {
  name: string; dispatch_date?: string; dispatch_type?: string; status?: string;
  from_warehouse?: string; to_warehouse?: string; target_site_name?: string;
  linked_project?: string; total_items?: number; total_qty?: number;
  challan_reference?: string; issued_to_name?: string; vehicle_number?: string;
  transporter_name?: string; approved_by?: string; approved_at?: string; rejection_reason?: string;
  remarks?: string; creation?: string; items?: ChallanItem[];
}

export default function InventoryChallanDetailPage() {
  const params = useParams();
  const challanName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [dc, setDc] = useState<ChallanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const hasRole = (...roles: string[]) => roles.some(r => new Set(currentUser?.roles || []).has(r));
  const canSubmit = hasRole('Director', 'System Manager', 'Store Manager', 'Stores Logistics Head', 'Procurement Manager', 'Purchase');
  const canApprove = hasRole('Director', 'System Manager', 'Project Head', 'Procurement Manager');

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

  const runAction = async (action: string, reason?: string) => {
    setBusy(action); setError('');
    try {
      const res = await fetch(`/api/dispatch-challans/${encodeURIComponent(challanName)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reason ? { action, reason } : { action }) });
      const p = await res.json();
      if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      flash(p.message || 'Done'); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(''); }
  };

  const actions = dc ? (
    <div className="flex flex-wrap gap-2">
      {dc.status === 'DRAFT' && canSubmit && <button onClick={() => runAction('submit')} disabled={!!busy} className="btn btn-primary !text-xs"><Send className="h-3.5 w-3.5" />{busy === 'submit' ? 'Submitting…' : 'Submit'}</button>}
      {dc.status === 'PENDING_APPROVAL' && canApprove && (<><button onClick={() => runAction('approve')} disabled={!!busy} className="btn btn-primary !text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button><button onClick={() => setRejectModal(true)} disabled={!!busy} className="btn btn-secondary !text-xs text-rose-700"><XCircle className="h-3.5 w-3.5" />Reject</button></>)}
      {dc.status === 'APPROVED' && canSubmit && <button onClick={() => runAction('dispatch')} disabled={!!busy} className="btn btn-primary !text-xs"><Truck className="h-3.5 w-3.5" />{busy === 'dispatch' ? 'Dispatching…' : 'Mark Dispatched'}</button>}
    </div>
  ) : undefined;

  const items = dc?.items || [];

  return (
    <DetailPage
      title={dc?.name || challanName}
      kicker="Inventory Challan"
      backHref="/inventory"
      backLabel="Back to Inventory"
      loading={loading} error={error} onRetry={load}
      status={dc?.status?.replace(/_/g, ' ')} statusVariant={statusVariant(dc?.status)}
      headerActions={actions}
      identityBlock={dc ? (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          {[['Date', formatDate(dc.dispatch_date)], ['Reference', dc.challan_reference], ['Type', dc.dispatch_type], ['From', dc.from_warehouse], ['To', dc.to_warehouse || dc.target_site_name], ['Issued To', dc.issued_to_name], ['Vehicle', dc.vehicle_number], ['Transporter', dc.transporter_name], ['Project', dc.linked_project], ['Items', dc.total_items], ['Qty', dc.total_qty], ['Approved By', dc.approved_by], ['Created', formatDate(dc.creation)]].map(([l, v]) => (
            <div key={String(l)}><dt className="text-gray-500">{String(l)}</dt><dd className="font-medium text-gray-900">{String(v || '-')}</dd></div>
          ))}
        </dl>
      ) : undefined}
    >
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 mb-4">{success}</div>}
      {dc?.status === 'REJECTED' && dc.rejection_reason && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mb-4"><strong>Rejection Reason:</strong> {dc.rejection_reason}</div>}
      {dc?.remarks && <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 mb-4"><strong>Remarks:</strong> {dc.remarks}</div>}

      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Line Items</h3></div>
        <table className="data-table text-sm">
          <thead><tr><th>#</th><th>Item</th><th>Description</th><th>Make / Model</th><th>Serials</th><th className="text-right">Qty</th><th>UOM</th><th>Remarks</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No items</td></tr> : items.map((i, idx) => (
              <tr key={idx}>
                <td className="text-gray-500 text-xs">{idx + 1}</td>
                <td><div className="font-medium">{i.item_link || i.item_code || '-'}</div><div className="text-xs text-gray-500">{i.item_name || '-'}</div></td>
                <td className="text-gray-600">{i.description || '-'}</td>
                <td><div className="text-gray-700">{i.make || '-'}</div><div className="text-xs text-gray-500">{i.model_no || '-'}</div></td>
                <td className="text-xs text-gray-600">{i.serial_numbers || '-'}</td>
                <td className="text-right">{i.qty ?? '-'}</td>
                <td className="text-gray-500">{i.uom || '-'}</td>
                <td className="text-gray-500">{i.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ActionModal open={rejectModal} title="Reject Challan" description={`Reject ${dc?.name}?`} variant="danger" confirmLabel="Reject" busy={busy === 'reject'} fields={[{ name: 'reason', label: 'Reason', type: 'textarea' as const, required: true }]} onConfirm={async v => { await runAction('reject', v.reason || ''); setRejectModal(false); }} onCancel={() => setRejectModal(false)} />
    </DetailPage>
  );
}
