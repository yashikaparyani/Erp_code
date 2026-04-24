'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import ActionModal from '@/components/ui/ActionModal';
import { badge, DC_BADGES } from '@/components/procurement/proc-helpers';

interface DispatchChallan {
  name: string; dispatch_date?: string; dispatch_type?: string; status?: string;
  from_warehouse?: string; to_warehouse?: string; target_site_name?: string;
  linked_project?: string; total_items?: number; total_qty?: number;
  challan_reference?: string; issued_to_name?: string;
  linked_receipt?: string; receipt_status?: string; receipt_date?: string; fulfilment_status?: string;
}

function getReceiptBadge(receiptStatus?: string, fulfilmentStatus?: string): { label: string; badgeClass: string } {
  if (receiptStatus === 'APPROVED') return { label: 'GRN Approved', badgeClass: 'badge-success' };
  if (receiptStatus === 'SUBMITTED') return { label: 'GRN Pending', badgeClass: 'badge-info' };
  if (receiptStatus === 'DRAFT') return { label: 'GRN Draft', badgeClass: 'badge-warning' };
  if (receiptStatus === 'REJECTED') return { label: 'GRN Rejected', badgeClass: 'badge-error' };
  if (fulfilmentStatus === 'AWAITING_SITE_GRN') return { label: 'Awaiting Site GRN', badgeClass: 'badge-warning' };
  return { label: 'Not Linked', badgeClass: 'badge-gray' };
}

export default function DispatchChallansPage() {
  const [items, setItems] = useState<DispatchChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DispatchChallan | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/dispatch-challans${qs}`).then(r => r.json());
      setItems(res.data || []);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const draft = items.filter(i => i.status === 'DRAFT').length;
  const pending = items.filter(i => i.status === 'PENDING_APPROVAL').length;
  const dispatched = items.filter(i => i.status === 'DISPATCHED').length;

  const deleteDraft = async () => {
    if (!deleteTarget?.name) return;
    setDeleteBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/dispatch-challans/${encodeURIComponent(deleteTarget.name)}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to delete dispatch challan');
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete dispatch challan');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
    <RegisterPage
      title="Dispatch Challans"
      description="Track material dispatches from head office or vendors to project sites, and confirm when the site closes them through GRN."
      loading={loading} error={error} onRetry={load}
      stats={[
        { label: 'Total', value: items.length },
        { label: 'Draft', value: draft },
        { label: 'Pending', value: pending },
        { label: 'Dispatched', value: dispatched },
      ]}
      headerActions={(
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory" className="btn btn-primary">New Challan</Link>
          <Link href="/grns" className="btn btn-secondary">View GRNs</Link>
        </div>
      )}
      filterBar={
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto text-xs" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPATCHED', 'REJECTED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      }
    >
      <table className="data-table">
        <thead><tr><th>Challan ID</th><th>Reference</th><th>Date</th><th>Type</th><th>From</th><th>To / Site</th><th>Issued To</th><th>Project</th><th>Items</th><th>Qty</th><th>Site Receipt</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {items.length === 0 ? <tr><td colSpan={13} className="text-center py-8 text-gray-500">No dispatch challans found</td></tr> : items.map(c => {
            const receipt = getReceiptBadge(c.receipt_status, c.fulfilment_status);
            return (
            <tr key={c.name}>
              <td><Link href={`/dispatch-challans/${encodeURIComponent(c.name)}`} className="font-medium text-blue-700 hover:underline">{c.name}</Link></td>
              <td className="text-gray-700">{c.challan_reference || '-'}</td>
              <td className="text-gray-700">{c.dispatch_date || '-'}</td>
              <td className="text-gray-700">{c.dispatch_type || '-'}</td>
              <td className="text-gray-700">{c.dispatch_type === 'VENDOR_TO_SITE' ? 'Vendor Direct' : c.from_warehouse || 'Head Office'}</td>
              <td className="text-gray-700">{c.target_site_name || c.to_warehouse || '-'}</td>
              <td className="text-gray-700">{c.issued_to_name || '-'}</td>
              <td className="text-gray-700">{c.linked_project || '-'}</td>
              <td className="text-center text-gray-700">{c.total_items ?? '-'}</td>
              <td className="text-center text-gray-700">{c.total_qty ?? '-'}</td>
              <td>
                <div className="flex flex-col gap-1">
                  {c.linked_receipt ? (
                    <Link href={`/grns/${encodeURIComponent(c.linked_receipt)}`} className={`badge ${receipt.badgeClass}`}>
                      {receipt.label}
                    </Link>
                  ) : (
                    <span className={`badge ${receipt.badgeClass}`}>{receipt.label}</span>
                  )}
                  <span className="text-xs text-gray-500">{c.receipt_date || (c.status === 'DISPATCHED' ? 'GRN not raised yet' : 'Receipt follows dispatch')}</span>
                </div>
              </td>
              <td><span className={`badge ${badge(DC_BADGES, c.status)}`}>{c.status || '-'}</span></td>
              <td>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link href={`/dispatch-challans/${encodeURIComponent(c.name)}`} className="font-medium text-blue-700 hover:underline">Open</Link>
                  {c.status === 'DRAFT' && (
                    <button onClick={() => setDeleteTarget(c)} className="font-medium text-rose-700 hover:underline">
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </RegisterPage>
    <ActionModal
      open={!!deleteTarget}
      title="Delete Dispatch Challan"
      description={`Delete draft challan ${deleteTarget?.name || ''}?`}
      variant="danger"
      confirmLabel="Delete"
      busy={deleteBusy}
      onConfirm={deleteDraft}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
}
