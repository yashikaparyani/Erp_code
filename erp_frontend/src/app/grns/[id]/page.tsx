'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DetailPage from '@/components/shells/DetailPage';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { callOps, formatCurrency, formatDate, statusVariant } from '@/components/procurement/proc-helpers';

interface GRNItem { name?: string; item_code?: string; description?: string; item_name?: string; qty?: number; uom?: string; rate?: number; amount?: number; warehouse?: string; received_qty?: number; rejected_qty?: number; purchase_order?: string; }
interface GRNDetail {
  name: string; supplier?: string; supplier_name?: string; posting_date?: string; status?: string;
  project?: string; set_warehouse?: string; grand_total?: number; net_total?: number;
  per_billed?: number; per_returned?: number; docstatus?: number; items?: GRNItem[];
  creation?: string; purchase_order?: string; supplier_delivery_note?: string;
  transporter_name?: string; lr_no?: string; lr_date?: string;
}

export default function GRNDetailPage() {
  const params = useParams();
  const grnName = decodeURIComponent((params?.id as string) || '');

  const [grn, setGrn] = useState<GRNDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setGrn(await callOps<GRNDetail>('get_grn', { name: grnName })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }, [grnName]);

  useEffect(() => { load(); }, [load]);

  const items = grn?.items || [];
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
  const totalRejected = items.reduce((s, i) => s + (i.rejected_qty || 0), 0);
  const linkedPOs = [...new Set(items.map(i => i.purchase_order).filter(Boolean) as string[])];

  return (
    <DetailPage
      title={grn?.name || grnName}
      kicker="Goods Receipt Note"
      backHref="/grns"
      backLabel="Back to GRNs"
      loading={loading} error={error} onRetry={load}
      status={grn?.status} statusVariant={statusVariant(grn?.status)}
      identityBlock={grn ? (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          {[['Supplier', grn.supplier_name || grn.supplier], ['Project', grn.project], ['Warehouse', grn.set_warehouse], ['Posting Date', grn.posting_date], ['Grand Total', formatCurrency(grn.grand_total)], ['Transporter', grn.transporter_name], ['LR No.', grn.lr_no], ['LR Date', grn.lr_date], ['Supplier DN', grn.supplier_delivery_note], ['Created', formatDate(grn.creation)]].map(([l, v]) => (
            <div key={String(l)}><dt className="text-gray-500">{String(l)}</dt><dd className="font-medium text-gray-900">{String(v || '-')}</dd></div>
          ))}
        </dl>
      ) : undefined}
      sidePanels={grn ? (
        <>
          {/* Supply chain links */}
          <div className="shell-panel p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Supply Chain</h3>
            {linkedPOs.map(po => <Link key={po} href={`/purchase-orders/${encodeURIComponent(po)}`} className="block text-sm text-blue-600 hover:underline">PO: {po}</Link>)}
            {grn.project && <Link href={`/projects/${encodeURIComponent(grn.project)}`} className="block text-sm text-blue-600 hover:underline">Project: {grn.project}</Link>}
          </div>
          <TraceabilityPanel projectId={grn.project} />
          <RecordDocumentsPanel referenceDoctype="Purchase Receipt" referenceName={grnName} title="Documents" />
          <LinkedRecordsPanel links={[{ label: 'Purchase Order', doctype: 'Purchase Order', method: 'frappe.client.get_list', args: { doctype: 'Purchase Order', filters: JSON.stringify({ name: grn.purchase_order || '' }), fields: JSON.stringify(['name', 'supplier', 'status', 'grand_total']), limit_page_length: '5' }, href: (n: string) => `/purchase-orders/${n}` }]} />
          <div className="shell-panel p-4"><h3 className="text-sm font-semibold text-gray-900 mb-3">Accountability</h3><AccountabilityTimeline subjectDoctype="Purchase Receipt" subjectName={grnName} compact initialLimit={6} /></div>
        </>
      ) : undefined}
    >
      {/* Summary */}
      {grn && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"><div className="text-2xl font-bold">{items.length}</div><div className="text-xs text-gray-500">Line Items</div></div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center"><div className="text-2xl font-bold text-blue-900">{totalQty}</div><div className="text-xs text-blue-600">Qty Received</div></div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center"><div className="text-2xl font-bold text-emerald-900">{formatCurrency(grn.grand_total)}</div><div className="text-xs text-emerald-600">Grand Total</div></div>
          {totalRejected > 0 && <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center"><div className="text-2xl font-bold text-rose-900">{totalRejected}</div><div className="text-xs text-rose-600">Rejected</div></div>}
        </div>
      )}

      {/* Billing progress */}
      {(grn?.per_billed || 0) > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1"><span>Billing Progress</span><span>{(grn?.per_billed || 0).toFixed(1)}%</span></div>
          <div className="h-2 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(grn?.per_billed || 0, 100)}%` }} /></div>
        </div>
      )}

      {/* Items table */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Received Items</h3></div>
        <table className="data-table text-sm">
          <thead><tr><th>Item</th><th>Description</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th><th>UOM</th><th>Warehouse</th><th>PO Ref</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No items</td></tr> : items.map((i, idx) => (
              <tr key={i.name || idx}>
                <td className="font-medium">{i.item_code || '-'}</td>
                <td className="text-gray-600 max-w-[200px] truncate">{i.description || i.item_name || '-'}</td>
                <td className="text-right">{i.qty ?? '-'}</td>
                <td className="text-right">{formatCurrency(i.rate)}</td>
                <td className="text-right font-medium">{formatCurrency(i.amount)}</td>
                <td className="text-gray-500">{i.uom || '-'}</td>
                <td className="text-gray-500">{i.warehouse || '-'}</td>
                <td>{i.purchase_order ? <Link href={`/purchase-orders/${encodeURIComponent(i.purchase_order)}`} className="text-blue-600 hover:underline text-xs">{i.purchase_order}</Link> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Next step */}
      <div className="card border-blue-200 bg-blue-50/50 mt-4">
        <div className="p-4 flex items-center justify-between">
          <div><p className="text-xs font-semibold text-blue-700">Next Step</p><p className="text-sm text-gray-600 mt-0.5">GRN → <strong>Project Inventory</strong></p></div>
          <Link href="/inventory" className="btn btn-primary !text-xs">Go to Inventory →</Link>
        </div>
      </div>
    </DetailPage>
  );
}