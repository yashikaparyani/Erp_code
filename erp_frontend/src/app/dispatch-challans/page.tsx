'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import ActionModal from '@/components/ui/ActionModal';
import LinkPicker from '@/components/ui/LinkPicker';
import { badge, DC_BADGES } from '@/components/procurement/proc-helpers';

interface DispatchChallan {
  name: string; dispatch_date?: string; dispatch_type?: string; status?: string;
  from_warehouse?: string; to_warehouse?: string; target_site_name?: string;
  linked_project?: string; total_items?: number; total_qty?: number;
  challan_reference?: string; issued_to_name?: string;
}

export default function DispatchChallansPage() {
  const [items, setItems] = useState<DispatchChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DispatchChallan | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (warehouseFilter) params.set('warehouse', warehouseFilter);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/dispatch-challans${qs}`).then(r => r.json());
      setItems(res.data || []);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  }, [filter, warehouseFilter]);

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
      description="Track material dispatches from warehouse to project sites."
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
          <LinkPicker entity="warehouse" value={warehouseFilter} onChange={setWarehouseFilter} placeholder="Filter by warehouse…" className="w-56" />
        </div>
      }
    >
      <table className="data-table">
        <thead><tr><th>Challan ID</th><th>Reference</th><th>Date</th><th>Type</th><th>From</th><th>To / Site</th><th>Issued To</th><th>Project</th><th>Items</th><th>Qty</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {items.length === 0 ? <tr><td colSpan={12} className="text-center py-8 text-gray-500">No dispatch challans found</td></tr> : items.map(c => (
            <tr key={c.name}>
              <td><Link href={`/dispatch-challans/${encodeURIComponent(c.name)}`} className="font-medium text-blue-700 hover:underline">{c.name}</Link></td>
              <td className="text-gray-700">{c.challan_reference || '-'}</td>
              <td className="text-gray-700">{c.dispatch_date || '-'}</td>
              <td className="text-gray-700">{c.dispatch_type || '-'}</td>
              <td className="text-gray-700">{c.from_warehouse || '-'}</td>
              <td className="text-gray-700">{c.target_site_name || c.to_warehouse || '-'}</td>
              <td className="text-gray-700">{c.issued_to_name || '-'}</td>
              <td className="text-gray-700">{c.linked_project || '-'}</td>
              <td className="text-center text-gray-700">{c.total_items ?? '-'}</td>
              <td className="text-center text-gray-700">{c.total_qty ?? '-'}</td>
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
          ))}
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
