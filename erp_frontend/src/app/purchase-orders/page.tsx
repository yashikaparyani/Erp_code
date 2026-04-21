'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { Plus, Send, Ban, Trash2, CheckSquare, Loader2, ExternalLink } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import { badge, PO_BADGES, formatCurrency } from '@/components/procurement/proc-helpers';

interface PO { name: string; supplier?: string; transaction_date?: string; status?: string; project?: string; set_warehouse?: string; grand_total?: number; per_received?: number; per_billed?: number; docstatus?: number; ph_status?: string; }
interface Stats { total?: number; draft?: number; to_receive_and_bill?: number; to_bill?: number; to_receive?: number; completed?: number; cancelled?: number; total_amount?: number; }

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [items, setItems] = useState<PO[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const flashError = (m: string) => { setActionError(stripHtml(m)); setTimeout(() => setActionError(''), 6000); };

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [l, s] = await Promise.all([
        apiFetch('/api/purchase-orders').catch(() => ({ data: [] })),
        apiFetch('/api/purchase-orders/stats').catch(() => ({ data: {} })),
      ]);
      setItems(l.data || []); setStats(s.data || {});
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setSuccess(m); setTimeout(() => setSuccess(''), 3000); };

  const rowAction = async (action: 'submit' | 'cancel' | 'submit-to-ph', name: string) => {
    setBusy(`${action}-${name}`);
    try {
      const res = await fetch(`/api/purchase-orders/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const r = await res.json(); if (!r.success) throw new Error(r.message);
      flash(r.message || `${action} done`); load();
    } catch (e) { flashError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(''); }
  };

  return (
    <RegisterPage
      title="Purchase Orders"
      description="Track all purchase orders raised against vendor comparisons."
      loading={loading} error={loadError} empty={!loading && items.length === 0} onRetry={load}
      stats={[
        { label: 'Total POs', value: stats.total ?? items.length },
        { label: 'Draft', value: stats.draft ?? 0, variant: 'warning' },
        { label: 'To Receive & Bill', value: stats.to_receive_and_bill ?? 0, variant: 'info' },
        { label: 'Partial', value: (stats.to_bill ?? 0) + (stats.to_receive ?? 0) },
        { label: 'Completed', value: stats.completed ?? 0, variant: 'success' },
      ]}
      headerActions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create PO</button>}
    >
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 mx-4 mt-3">{success}</div>}
      {actionError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 mx-4 mt-3">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="shrink-0 text-rose-400 hover:text-rose-600 font-bold leading-none">&times;</button>
        </div>
      )}

      <table className="data-table">
        <thead><tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Project</th><th>Warehouse</th><th>Status</th><th>Grand Total</th><th>% Recv</th><th>% Billed</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map(po => (
            <tr key={po.name} className="cursor-pointer hover:bg-blue-50/50" onClick={() => router.push(`/purchase-orders/${encodeURIComponent(po.name)}`)}>
              <td><div className="font-medium text-blue-700 flex items-center gap-1">{po.name}<ExternalLink className="h-3 w-3 text-blue-400" /></div></td>
              <td className="text-sm">{po.supplier || '-'}</td>
              <td className="text-sm text-gray-700">{po.transaction_date || '-'}</td>
              <td className="text-sm text-gray-700">{po.project || '-'}</td>
              <td className="text-sm text-gray-700">{po.set_warehouse || '-'}</td>
              <td><span className={`badge ${badge(PO_BADGES, po.status)}`}>{po.status || 'Draft'}</span></td>
              <td className="text-sm font-medium">{formatCurrency(po.grand_total)}</td>
              <td className="text-sm">{po.per_received?.toFixed(0) ?? 0}%</td>
              <td className="text-sm">{po.per_billed?.toFixed(0) ?? 0}%</td>
              <td onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                  {po.docstatus === 0 && (
                    <>
                      <button onClick={() => rowAction('submit', po.name)} disabled={!!busy} className="rounded p-1 text-blue-600 hover:bg-blue-50" title="Submit">
                        {busy === `submit-${po.name}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => setDeleteTarget(po.name)} disabled={!!busy} className="rounded p-1 text-rose-600 hover:bg-rose-50" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                  {po.docstatus === 1 && !po.ph_status && (
                    <button onClick={() => rowAction('submit-to-ph', po.name)} disabled={!!busy} className="rounded p-1 text-blue-600 hover:bg-blue-50" title="Submit to PH">
                      {busy === `submit-to-ph-${po.name}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  {po.docstatus === 1 && (
                    <button onClick={() => rowAction('cancel', po.name)} disabled={!!busy} className="rounded p-1 text-rose-600 hover:bg-rose-50" title="Cancel"><Ban className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <FormModal
        open={showCreate} title="Create Purchase Order" description="Create a new PO with initial line item."
        fields={[
          { name: 'supplier', label: 'Supplier', type: 'link' as const, linkEntity: 'vendor' as const, required: true, placeholder: 'Search supplier…' },
          { name: 'project', label: 'Project', type: 'link' as const, linkEntity: 'project' as const },
          { name: 'set_warehouse', label: 'Warehouse', type: 'link' as const, linkEntity: 'warehouse' as const },
          { name: 'item_code', label: 'Item', type: 'link' as const, linkEntity: 'item' as const, required: true, placeholder: 'Search item…' },
          { name: 'qty', label: 'Qty', type: 'number', required: true, defaultValue: '1' },
          { name: 'rate', label: 'Rate', type: 'number', defaultValue: '0' },
          { name: 'schedule_date', label: 'Required By', type: 'date' },
        ]}
        busy={creating} confirmLabel="Create"
        onConfirm={async vals => {
          if (!vals.supplier?.trim() || !vals.item_code?.trim()) { flashError('Supplier and item are required'); return; }
          setCreating(true);
          try {
            const res = await fetch('/api/purchase-orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                supplier: vals.supplier.trim(),
                project: vals.project?.trim() || undefined,
                set_warehouse: vals.set_warehouse?.trim() || undefined,
                items: [{
                  item_code: vals.item_code.trim(),
                  qty: Number(vals.qty || '1') || 1,
                  rate: Number(vals.rate || '0') || 0,
                  schedule_date: vals.schedule_date || new Date().toISOString().split('T')[0],
                }],
              }),
            });
            const r = await res.json(); if (!r.success) throw new Error(r.message);
            setShowCreate(false); router.push(`/purchase-orders/${encodeURIComponent(r.data?.name || '')}`);
          } catch (e) { flashError(e instanceof Error ? e.message : 'Failed'); }
          finally { setCreating(false); }
        }}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal open={!!deleteTarget} title={`Delete ${deleteTarget}`} description="This will permanently delete this Purchase Order." variant="danger" confirmLabel="Delete" busy={!!busy}
        onConfirm={async () => {
          if (!deleteTarget) return; setBusy(`delete-${deleteTarget}`);
          try { const res = await fetch('/api/purchase-orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: deleteTarget }) }); const r = await res.json(); if (!r.success) throw new Error(r.message); flash(r.message || 'Deleted'); load(); }
          catch (e) { flashError(e instanceof Error ? e.message : 'Failed'); }
          finally { setBusy(''); setDeleteTarget(null); }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </RegisterPage>
  );
}
