'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DetailPage from '@/components/shells/DetailPage';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { formatCurrency, formatDate } from '@/components/procurement/proc-helpers';

type ReceiptStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface ReceiptItem {
  name?: string;
  item_link?: string;
  description?: string;
  make?: string;
  model_no?: string;
  hsn_code?: string;
  serial_numbers?: string;
  qty?: number;
  uom?: string;
  purchase_cost?: number;
  vendor_invoice_no?: string;
  linked_purchase_order?: string;
  remark?: string;
}

interface GRNDetail {
  name: string;
  receipt_date?: string;
  receipt_type?: string;
  status?: ReceiptStatus;
  received_from?: string;
  supplier_link?: string;
  linked_project?: string;
  linked_purchase_order?: string;
  warehouse?: string;
  received_by_user?: string;
  approved_by?: string;
  approved_at?: string;
  total_items?: number;
  total_qty?: number;
  total_value?: number;
  vendor_invoice_reference?: string;
  remarks?: string;
  items?: ReceiptItem[];
  creation?: string;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
};

const TYPE_LABEL: Record<string, string> = {
  VENDOR: 'Vendor Delivery',
  PROJECT_RETURN: 'Project Return',
  WARRANTY_REPLACEMENT: 'Warranty Replacement',
  REPAIR_RETURN: 'Repair Return',
  INTERNAL_TRANSFER: 'Internal Transfer',
  OTHER: 'Other',
};

export default function GRNDetailPage() {
  const params = useParams();
  const grnName = decodeURIComponent((params?.id as string) || '');

  const [grn, setGrn] = useState<GRNDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/grns/${encodeURIComponent(grnName)}`);
      const p = await res.json();
      if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      setGrn(p.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }, [grnName]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action: string, reason?: string) => {
    setActionBusy(true); setActionError('');
    try {
      const res = await fetch(`/api/grns/${encodeURIComponent(grnName)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const p = await res.json();
      if (!res.ok || !p.success) throw new Error(p.message || 'Action failed');
      load();
    } catch (e) { setActionError(e instanceof Error ? e.message : 'Action failed'); }
    finally { setActionBusy(false); }
  };

  const items = grn?.items || [];
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);

  const statusVariant = (s?: string) => {
    if (s === 'APPROVED') return 'success';
    if (s === 'REJECTED' || s === 'CANCELLED') return 'destructive';
    if (s === 'SUBMITTED') return 'warning';
    return 'secondary';
  };

  return (
    <DetailPage
      title={grn?.name || grnName}
      kicker="Material Receipt (GRN)"
      backHref="/grns"
      backLabel="Back to GRNs"
      loading={loading} error={error} onRetry={load}
      status={grn?.status}
      statusVariant={statusVariant(grn?.status)}
      identityBlock={grn ? (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          {[
            ['Type', TYPE_LABEL[grn.receipt_type || ''] || grn.receipt_type],
            ['Receipt Date', formatDate(grn.receipt_date)],
            ['Received From', grn.received_from],
            ['Supplier', grn.supplier_link],
            ['Project', grn.linked_project],
            ['Warehouse', grn.warehouse],
            ['PO Reference', grn.linked_purchase_order],
            ['Invoice Ref', grn.vendor_invoice_reference],
            ['Received By', grn.received_by_user],
            ['Approved By', grn.approved_by],
            ['Approved At', formatDate(grn.approved_at)],
            ['Created', formatDate(grn.creation)],
          ].map(([l, v]) => (
            <div key={String(l)}><dt className="text-gray-500">{String(l)}</dt><dd className="font-medium text-gray-900">{String(v || '-')}</dd></div>
          ))}
        </dl>
      ) : undefined}
      sidePanels={grn ? (
        <>
          {/* Action panel */}
          {(grn.status === 'DRAFT' || grn.status === 'SUBMITTED') && (
            <div className="shell-panel p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
              {actionError && <p className="text-xs text-rose-600">{actionError}</p>}
              {grn.status === 'DRAFT' && (
                <button
                  disabled={actionBusy}
                  onClick={() => doAction('submit')}
                  className="w-full btn btn-primary text-sm"
                >
                  {actionBusy ? 'Processing…' : 'Submit for Approval'}
                </button>
              )}
              {grn.status === 'SUBMITTED' && (
                <>
                  <button
                    disabled={actionBusy}
                    onClick={() => doAction('approve')}
                    className="w-full btn btn-primary text-sm bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                  >
                    {actionBusy ? 'Processing…' : 'Approve — Update Stock'}
                  </button>
                  <button
                    disabled={actionBusy}
                    onClick={() => { const r = window.prompt('Rejection reason (optional):') ?? ''; doAction('reject', r); }}
                    className="w-full btn text-sm border border-rose-300 text-rose-600 hover:bg-rose-50"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          )}

          {/* Links */}
          <div className="shell-panel p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Links</h3>
            {grn.linked_purchase_order && (
              <Link href={`/purchase-orders/${encodeURIComponent(grn.linked_purchase_order)}`} className="block text-sm text-blue-600 hover:underline">
                PO: {grn.linked_purchase_order}
              </Link>
            )}
            {grn.linked_project && (
              <Link href={`/projects/${encodeURIComponent(grn.linked_project)}`} className="block text-sm text-blue-600 hover:underline">
                Project: {grn.linked_project}
              </Link>
            )}
          </div>

          <TraceabilityPanel projectId={grn.linked_project} />
          <RecordDocumentsPanel referenceDoctype="GE Material Receipt" referenceName={grnName} title="Documents" />

          {grn.remarks && (
            <div className="shell-panel p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Remarks</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{grn.remarks}</p>
            </div>
          )}
        </>
      ) : undefined}
    >
      {/* Summary cards */}
      {grn && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-xs text-gray-500">Line Items</div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
            <div className="text-2xl font-bold text-blue-900">{totalQty}</div>
            <div className="text-xs text-blue-600">Total Qty</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-900">{formatCurrency(grn.total_value)}</div>
            <div className="text-xs text-emerald-600">Total Value</div>
          </div>
        </div>
      )}

      {/* Items table with all new fields */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Received Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table text-sm min-w-[900px]">
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th>Make</th>
                <th>Model No.</th>
                <th>HSN</th>
                <th>Serial Nos.</th>
                <th className="text-right">Qty</th>
                <th>UOM</th>
                <th className="text-right">Cost</th>
                <th>Invoice No.</th>
                <th>PO Ref</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0
                ? <tr><td colSpan={12} className="text-center py-8 text-gray-400">No items</td></tr>
                : items.map((i, idx) => (
                  <tr key={i.name || idx}>
                    <td className="font-medium">{i.item_link || '-'}</td>
                    <td className="text-gray-600 max-w-[160px] truncate">{i.description || '-'}</td>
                    <td className="text-gray-600">{i.make || '-'}</td>
                    <td className="text-gray-600">{i.model_no || '-'}</td>
                    <td className="text-gray-500 text-xs">{i.hsn_code || '-'}</td>
                    <td className="text-gray-500 text-xs max-w-[120px] truncate">{i.serial_numbers || '-'}</td>
                    <td className="text-right">{i.qty ?? '-'}</td>
                    <td className="text-gray-500">{i.uom || '-'}</td>
                    <td className="text-right font-medium">{formatCurrency(i.purchase_cost)}</td>
                    <td className="text-gray-500 text-xs">{i.vendor_invoice_no || '-'}</td>
                    <td>{i.linked_purchase_order ? <Link href={`/purchase-orders/${encodeURIComponent(i.linked_purchase_order)}`} className="text-blue-600 hover:underline text-xs">{i.linked_purchase_order}</Link> : '-'}</td>
                    <td className="text-gray-500 text-xs max-w-[120px] truncate">{i.remark || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status badge footer */}
      {grn?.status === 'APPROVED' && (
        <div className="card border-emerald-200 bg-emerald-50/50 mt-4 p-4">
          <p className="text-sm font-semibold text-emerald-700">Stock updated</p>
          <p className="text-xs text-emerald-600 mt-0.5">IN entries posted to GE Inventory Ledger on approval.</p>
        </div>
      )}
    </DetailPage>
  );
}

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