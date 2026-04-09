'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Send, CheckCircle2, XCircle, RotateCcw, ArrowUpRight } from 'lucide-react';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { useRole } from '@/context/RoleContext';
import { callOps, formatCurrency, formatDate, statusVariant } from '@/components/procurement/proc-helpers';
import { indentApi } from '@/lib/typedApi';

/* ── types ──────────────────────────────────────────── */

interface Item { item_code?: string; description?: string; item_name?: string; qty?: number; uom?: string; warehouse?: string; schedule_date?: string; ordered_qty?: number; received_qty?: number; }
interface Detail { name: string; material_request_type?: string; transaction_date?: string; schedule_date?: string; status?: string; company?: string; set_warehouse?: string; docstatus?: number; per_ordered?: number; project?: string; items?: Item[]; creation?: string; }
interface StockCtx { item_code: string; actual_qty?: number; reserved_qty?: number; ordered_qty?: number; projected_qty?: number; warehouse?: string; }
interface VCSummary { name: string; status?: string; recommended_supplier?: string; selected_total_amount?: number; }

export default function IndentDetailPage() {
  const params = useParams();
  const name = decodeURIComponent((params?.id as string) || '');
  const { currentRole } = useRole();

  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [escalateModal, setEscalateModal] = useState(false);
  const [stockCtx, setStockCtx] = useState<Record<string, StockCtx>>({});
  const [comparisons, setComparisons] = useState<VCSummary[]>([]);

  const approvalRoles = new Set(['Project Head', 'Director', 'Department Head']);
  const canSubmit = data?.docstatus === 0 && new Set(['Procurement Manager', 'Purchase', 'Project Head', 'Director']).has(currentRole || '');
  const canAck = approvalRoles.has(currentRole || '') && data?.status === 'Submitted';
  const canDecide = approvalRoles.has(currentRole || '') && ['Submitted', 'Acknowledged', 'Escalated'].includes(data?.status || '');
  const canEsc = (currentRole === 'Project Head' || currentRole === 'Director') && canDecide;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await indentApi.get<Detail>(name)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [name]);

  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setSuccess(m); setTimeout(() => setSuccess(''), 4000); };
  const run = async (method: string, args: Record<string, string> = {}) => {
    setBusy(method); setError('');
    try { await indentApi.action(name, method.replace(/_indent$/, ''), args.remarks); flash(`${method} done`); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(''); }
  };

  useEffect(() => {
    if (!data) { setStockCtx({}); setComparisons([]); return; }
    (async () => {
      try {
        const rows = await Promise.all((data.items || []).filter(i => i.item_code).map(async i => {
          try { const r = await callOps<StockCtx[]>('get_stock_position', { item_code: i.item_code!, warehouse: i.warehouse || data.set_warehouse || '', limit_page_length: 20 }); return { k: i.item_code!, r: Array.isArray(r) ? r[0] : undefined }; }
          catch { return { k: i.item_code!, r: undefined }; }
        }));
        const ctx: Record<string, StockCtx> = {};
        rows.forEach(({ k, r }) => { if (r) ctx[k] = r; });
        setStockCtx(ctx);
        const vc = await callOps<VCSummary[]>('get_vendor_comparisons', { material_request: data.name });
        setComparisons(Array.isArray(vc) ? vc : []);
      } catch { setStockCtx({}); setComparisons([]); }
    })();
  }, [data]);

  const items = data?.items || [];
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
  const totalOrdered = items.reduce((s, i) => s + (i.ordered_qty || 0), 0);
  const coverage = items.map(i => {
    const r = i.item_code ? stockCtx[i.item_code] : undefined;
    const avail = Math.max((r?.actual_qty || 0) - (r?.reserved_qty || 0), 0);
    return { itemCode: i.item_code || '-', warehouse: r?.warehouse || i.warehouse || '-', required: i.qty || 0, avail, ordered: r?.ordered_qty || 0, projected: r?.projected_qty || 0, shortage: Math.max((i.qty || 0) - avail, 0) };
  });

  const actions = (
    <div className="flex flex-wrap gap-2">
      {canSubmit && <button onClick={() => run('submit_indent')} disabled={!!busy} className="btn btn-primary !text-xs"><Send className="h-3.5 w-3.5" />{busy === 'submit_indent' ? 'Submitting…' : 'Submit'}</button>}
      {canAck && <button onClick={() => run('acknowledge_indent')} disabled={!!busy} className="btn btn-secondary !text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Acknowledge</button>}
      {canDecide && (
        <>
          <button onClick={() => run('accept_indent')} disabled={!!busy} className="btn btn-primary !text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Accept</button>
          <button onClick={() => setRejectModal(true)} disabled={!!busy} className="btn btn-secondary !text-xs"><XCircle className="h-3.5 w-3.5" />Reject</button>
          <button onClick={() => setReturnModal(true)} disabled={!!busy} className="btn btn-secondary !text-xs"><RotateCcw className="h-3.5 w-3.5" />Return</button>
          {canEsc && <button onClick={() => setEscalateModal(true)} disabled={!!busy} className="btn btn-secondary !text-xs"><ArrowUpRight className="h-3.5 w-3.5" />Escalate</button>}
        </>
      )}
    </div>
  );

  return (
    <DetailPage
      title={data?.name || name}
      kicker="Material Indent"
      backHref="/indents"
      backLabel="Back to Indents"
      loading={loading}
      error={error}
      onRetry={load}
      status={data?.status}
      statusVariant={statusVariant(data?.status)}
      headerActions={actions}
      identityBlock={data ? (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          {[['Type', data.material_request_type], ['Project', data.project], ['Warehouse', data.set_warehouse], ['Date', data.transaction_date], ['Required By', data.schedule_date], ['% Ordered', `${(data.per_ordered || 0).toFixed(0)}%`]].map(([l, v]) => (
            <div key={String(l)}><dt className="text-gray-500">{String(l)}</dt><dd className="font-medium text-gray-900">{String(v || '-')}</dd></div>
          ))}
        </dl>
      ) : undefined}
      sidePanels={data ? (
        <>
          <RecordDocumentsPanel referenceDoctype="Material Request" referenceName={name} />
          <TraceabilityPanel projectId={data.project} />
          <div className="shell-panel p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Accountability Trail</h3>
            <AccountabilityTimeline subjectDoctype="Material Request" subjectName={name} compact initialLimit={6} />
          </div>
        </>
      ) : undefined}
    >
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 mb-4">{success}</div>}

      {/* Item summary cards */}
      <div className="shell-panel p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Item Summary</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="stat-card"><div className="stat-value">{items.length}</div><div className="stat-label">Items</div></div>
          <div className="stat-card border-l-4 border-blue-300"><div className="stat-value">{totalQty}</div><div className="stat-label">Total Qty</div></div>
          <div className="stat-card border-l-4 border-emerald-300"><div className="stat-value">{totalOrdered}</div><div className="stat-label">Ordered Qty</div></div>
          <div className="stat-card border-l-4 border-amber-300"><div className="stat-value">{(data?.per_ordered || 0).toFixed(0)}%</div><div className="stat-label">Fulfillment</div></div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(data?.per_ordered || 0, 100)}%` }} /></div>
      </div>

      {/* Line items table */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Line Items</h3></div>
        <table className="data-table">
          <thead><tr><th>Item</th><th>Description</th><th className="text-right">Qty</th><th>UOM</th><th>Warehouse</th><th>Req. By</th><th className="text-right">Ordered</th><th className="text-right">Received</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No line items</td></tr> : items.map((i, idx) => (
              <tr key={idx}>
                <td className="font-medium text-gray-900">{i.item_code || '-'}</td>
                <td className="text-gray-600 max-w-[200px] truncate">{i.description || i.item_name || '-'}</td>
                <td className="text-right">{i.qty ?? '-'}</td>
                <td className="text-gray-500">{i.uom || '-'}</td>
                <td className="text-gray-500">{i.warehouse || '-'}</td>
                <td className="text-gray-500">{i.schedule_date || '-'}</td>
                <td className="text-right">{i.ordered_qty ?? 0}</td>
                <td className="text-right">{i.received_qty ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stock context */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Stock-on-Hand Context</h3></div>
        <div className="p-4 grid grid-cols-3 gap-3">
          <div className="stat-card"><div className="stat-value">{coverage.filter(c => c.shortage <= 0).length}</div><div className="stat-label">Covered</div></div>
          <div className="stat-card border-l-4 border-rose-300"><div className="stat-value">{coverage.filter(c => c.shortage > 0).length}</div><div className="stat-label">Short</div></div>
          <div className="stat-card border-l-4 border-blue-300"><div className="stat-value">{coverage.reduce((s, c) => s + c.avail, 0)}</div><div className="stat-label">Available</div></div>
        </div>
        <table className="data-table">
          <thead><tr><th>Item</th><th>Warehouse</th><th className="text-right">Required</th><th className="text-right">Available</th><th className="text-right">Ordered</th><th className="text-right">Projected</th><th className="text-right">Shortage</th></tr></thead>
          <tbody>
            {coverage.length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-gray-400">No stock context</td></tr> : coverage.map(c => (
              <tr key={c.itemCode}>
                <td className="font-medium">{c.itemCode}</td><td className="text-gray-500">{c.warehouse}</td>
                <td className="text-right">{c.required}</td><td className="text-right text-emerald-700">{c.avail}</td><td className="text-right text-blue-700">{c.ordered}</td><td className="text-right text-indigo-700">{c.projected}</td>
                <td className={`text-right font-semibold ${c.shortage > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{c.shortage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Downstream vendor comparisons */}
      {comparisons.length > 0 && (
        <div className="shell-panel p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Downstream Vendor Comparisons</h3>
          <div className="space-y-2">
            {comparisons.map(vc => (
              <Link key={vc.name} href={`/vendor-comparisons/${encodeURIComponent(vc.name)}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-blue-50 transition">
                <div><div className="text-sm font-medium">{vc.name}</div><div className="text-xs text-gray-500">{vc.recommended_supplier || 'No vendor'}</div></div>
                <div className="text-right"><div className="text-sm font-medium">{formatCurrency(vc.selected_total_amount)}</div><div className="text-xs text-gray-500">{vc.status}</div></div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {[
        { open: rejectModal, set: setRejectModal, action: 'reject_indent', title: 'Reject Indent', variant: 'danger' as const, label: 'Reject' },
        { open: returnModal, set: setReturnModal, action: 'return_indent', title: 'Return for Revision', variant: 'default' as const, label: 'Return' },
        { open: escalateModal, set: setEscalateModal, action: 'escalate_indent', title: 'Escalate Indent', variant: 'default' as const, label: 'Escalate' },
      ].map(m => (
        <ActionModal key={m.action} open={m.open} title={m.title} description="Provide a justification." variant={m.variant} confirmLabel={m.label} busy={!!busy}
          fields={[{ name: 'reason', label: 'Reason', type: 'textarea' as const, required: true }]}
          onConfirm={async v => { await run(m.action, { reason: v.reason || '' }); m.set(false); }}
          onCancel={() => m.set(false)} />
      ))}
    </DetailPage>
  );
}