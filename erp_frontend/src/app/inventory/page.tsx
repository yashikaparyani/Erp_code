'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Filter, X, Eye } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { badge, DC_BADGES } from '@/components/procurement/proc-helpers';
import { useAuth } from '@/context/AuthContext';

interface DC { name: string; dispatch_date?: string; dispatch_type?: string; status?: string; from_warehouse?: string; to_warehouse?: string; target_site_name?: string; linked_project?: string; total_items?: number; total_qty?: number; }
interface DCStats { total?: number; draft?: number; pending_approval?: number; dispatched?: number; total_qty?: number; }
interface StockBin { warehouse?: string; item_code?: string; actual_qty?: number; reserved_qty?: number; ordered_qty?: number; projected_qty?: number; }

export default function InventoryPage() {
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const [challans, setChallans] = useState<DC[]>([]);
  const [stats, setStats] = useState<DCStats>({});
  const [stockBins, setStockBins] = useState<StockBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectFilter, setProjectFilter] = useState(searchParams?.get('project') || '');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const hasRole = (...roles: string[]) => roles.some(r => new Set(currentUser?.roles || []).has(r));
  const canSubmit = hasRole('Director', 'System Manager', 'Store Manager', 'Stores Logistics Head', 'Procurement Manager', 'Purchase');
  const canApprove = hasRole('Director', 'System Manager', 'Project Head', 'Procurement Manager');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [cr, sr, stk] = await Promise.all([
        fetch('/api/dispatch-challans').then(r => r.json()),
        fetch('/api/dispatch-challans/stats').then(r => r.json()),
        fetch('/api/stock-snapshot').then(r => r.json()),
      ]);
      setChallans(cr.data || []); setStats(sr.data || {}); setStockBins(stk.data || []);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (v: Record<string, string>) => {
    if (!v.dispatch_date || !v.description?.trim() || !v.item_link?.trim()) { setError('Date, Item, Description required'); return; }
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/dispatch-challans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dispatch_type: v.dispatch_type || 'WAREHOUSE_TO_SITE', dispatch_date: v.dispatch_date, from_warehouse: v.from_warehouse || undefined, to_warehouse: v.to_warehouse || undefined, target_site_name: v.target_site_name || undefined, linked_project: v.linked_project || undefined, items: [{ item_link: v.item_link, description: v.description, qty: Number(v.qty) || 1 }] }) });
      const p = await res.json(); if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      setShowCreate(false); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setCreating(false); }
  };

  const runAction = async (name: string, action: string) => {
    setActionBusy(name); setError('');
    try {
      const res = await fetch(`/api/dispatch-challans/${encodeURIComponent(name)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const p = await res.json(); if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionBusy(null); }
  };

  const filtered = projectFilter ? challans.filter(c => (c.linked_project || '').toLowerCase().includes(projectFilter.toLowerCase())) : challans;

  return (
    <RegisterPage
      title="Inventory & Logistics"
      description="Dispatch challans, stock, and warehouse operations"
      loading={loading} error={error} onRetry={load}
      stats={[
        { label: 'Total Challans', value: stats.total ?? challans.length },
        { label: 'Dispatched', value: stats.dispatched ?? 0 },
        { label: 'Pending Approval', value: stats.pending_approval ?? 0 },
        { label: 'Stock Items', value: stockBins.length },
      ]}
      headerActions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Challan</button>}
      filterBar={
        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-gray-400" />
          <input value={projectFilter} onChange={e => setProjectFilter(e.target.value)} placeholder="Filter by project…" className="input w-48" />
          {projectFilter && <button onClick={() => setProjectFilter('')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"><X className="h-3 w-3" /> Clear</button>}
        </div>
      }
    >
      {/* Dispatch Challans table */}
      <div className="shell-panel overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Dispatch Challans</h3></div>
        <table className="data-table text-sm">
          <thead><tr><th>Challan</th><th>Date</th><th>Type</th><th>From</th><th>To</th><th>Project</th><th>Items</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-500">No challans found</td></tr> : filtered.map(c => (
              <tr key={c.name}>
                <td className="font-medium">{c.name}</td>
                <td className="text-gray-600">{c.dispatch_date || '-'}</td>
                <td><span className="badge badge-blue">{c.dispatch_type || '-'}</span></td>
                <td className="text-gray-700">{c.from_warehouse || '-'}</td>
                <td className="text-gray-700">{c.to_warehouse || c.target_site_name || '-'}</td>
                <td>{c.linked_project ? <Link href={`/projects/${encodeURIComponent(c.linked_project)}?tab=ops`} className="text-blue-600 hover:underline text-sm">{c.linked_project}</Link> : '-'}</td>
                <td className="text-gray-600">{c.total_items ?? 0}</td>
                <td className="text-gray-600">{c.total_qty ?? 0}</td>
                <td><span className={`badge ${badge(DC_BADGES, c.status)}`}>{c.status}</span></td>
                <td>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Link href={`/dispatch-challans/${encodeURIComponent(c.name)}`} className="text-blue-600 hover:underline text-sm flex items-center gap-1"><Eye className="w-3.5 h-3.5" />View</Link>
                    {c.status === 'DRAFT' && canSubmit && <button disabled={actionBusy === c.name} onClick={() => runAction(c.name, 'submit')} className="text-indigo-600 text-sm font-medium">Submit</button>}
                    {c.status === 'PENDING_APPROVAL' && canApprove && (<><button disabled={actionBusy === c.name} onClick={() => runAction(c.name, 'approve')} className="text-green-600 text-sm font-medium">Approve</button><button disabled={actionBusy === c.name} onClick={() => runAction(c.name, 'reject')} className="text-red-600 text-sm font-medium">Reject</button></>)}
                    {c.status === 'APPROVED' && canSubmit && <button disabled={actionBusy === c.name} onClick={() => runAction(c.name, 'dispatch')} className="text-orange-600 text-sm font-medium">Dispatch</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stock snapshot */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Stock Snapshot</h3></div>
        <table className="data-table text-sm">
          <thead><tr><th>Item Code</th><th>Warehouse</th><th className="text-right">Actual Qty</th><th className="text-right">Reserved</th><th className="text-right">Ordered</th><th className="text-right">Projected</th></tr></thead>
          <tbody>
            {stockBins.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No stock data</td></tr> : stockBins.map((b, i) => (
              <tr key={i}>
                <td className="font-medium">{b.item_code}</td><td className="text-gray-600">{b.warehouse}</td>
                <td className="text-right">{b.actual_qty ?? 0}</td><td className="text-right text-gray-600">{b.reserved_qty ?? 0}</td>
                <td className="text-right text-gray-600">{b.ordered_qty ?? 0}</td><td className="text-right font-semibold">{b.projected_qty ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormModal
        open={showCreate}
        title="Create Dispatch Challan"
        description="Dispatch items from warehouse to site."
        busy={creating}
        fields={[
          { name: 'dispatch_type', label: 'Dispatch Type', type: 'select' as const, options: [{ value: 'WAREHOUSE_TO_WAREHOUSE', label: 'Warehouse to Warehouse' }, { value: 'WAREHOUSE_TO_SITE', label: 'Warehouse to Site' }, { value: 'VENDOR_TO_SITE', label: 'Vendor to Site' }] },
          { name: 'dispatch_date', label: 'Dispatch Date', type: 'date' as const, required: true },
          { name: 'from_warehouse', label: 'From Warehouse', type: 'text' as const },
          { name: 'to_warehouse', label: 'To Warehouse', type: 'text' as const },
          { name: 'target_site_name', label: 'Target Site', type: 'text' as const },
          { name: 'linked_project', label: 'Linked Project', type: 'text' as const },
          { name: 'item_link', label: 'Item', type: 'text' as const, required: true },
          { name: 'qty', label: 'Qty', type: 'number' as const },
          { name: 'description', label: 'Description', type: 'text' as const, required: true },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />
    </RegisterPage>
  );
}