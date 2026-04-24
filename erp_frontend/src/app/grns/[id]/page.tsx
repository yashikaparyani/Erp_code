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
  linked_dispatch_challan?: string;
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

  const [editItems, setEditItems] = useState<ReceiptItem[]>([]);
  const [savingItems, setSavingItems] = useState(false);
  const [itemsError, setItemsError] = useState('');

  useEffect(() => {
    setEditItems(grn?.items?.map(i => ({ ...i })) || []);
  }, [grn]);

  const handleAddRow = () =>
    setEditItems(prev => [...prev, { qty: 1, uom: 'Nos' } as ReceiptItem]);

  const handleRemoveRow = (idx: number) =>
    setEditItems(prev => prev.filter((_, i) => i !== idx));

  const handleItemChange = (idx: number, field: keyof ReceiptItem, value: string | number) =>
    setEditItems(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));

  const handleSaveItems = async () => {
    setSavingItems(true); setItemsError('');
    try {
      const res = await fetch(`/api/grns/${encodeURIComponent(grnName)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', data: { items: editItems } }),
      });
      const p = await res.json();
      if (!res.ok || !p.success) throw new Error(p.message || 'Save failed');
      load();
    } catch (e) { setItemsError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSavingItems(false); }
  };

  const displayItems = grn?.status === 'DRAFT' ? editItems : (grn?.items || []);
  const totalQty = displayItems.reduce((s, i) => s + (i.qty || 0), 0);

  const statusVariant = (s?: string) => {
    if (s === 'APPROVED') return 'success';
    if (s === 'REJECTED' || s === 'CANCELLED') return 'error';
    if (s === 'SUBMITTED') return 'warning';
    return 'default';
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
            ['Dispatch Challan', grn.linked_dispatch_challan],
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
            {grn.linked_dispatch_challan && (
              <Link href={`/dispatch-challans/${encodeURIComponent(grn.linked_dispatch_challan)}`} className="block text-sm text-blue-600 hover:underline">
                Dispatch: {grn.linked_dispatch_challan}
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
            <div className="text-2xl font-bold">{displayItems.length}</div>
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

      {/* Items table */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Received Items</h3>
          {grn?.status === 'DRAFT' && (
            <div className="flex items-center gap-2">
              {itemsError && <span className="text-xs text-rose-600">{itemsError}</span>}
              <button
                onClick={handleAddRow}
                className="btn text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-1.5"
              >
                + Add Row
              </button>
              <button
                onClick={handleSaveItems}
                disabled={savingItems}
                className="btn btn-primary text-xs px-3 py-1.5"
              >
                {savingItems ? 'Saving…' : 'Save Items'}
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          {grn?.status === 'DRAFT' ? (
            <table className="data-table text-sm min-w-[1100px]">
              <thead>
                <tr>
                  <th>Item Code *</th>
                  <th>Description</th>
                  <th>Make</th>
                  <th>Model No.</th>
                  <th>HSN</th>
                  <th>Serial Nos.</th>
                  <th className="text-right">Qty *</th>
                  <th>UOM</th>
                  <th className="text-right">Cost (₹)</th>
                  <th>Invoice No.</th>
                  <th>PO Ref</th>
                  <th>Remark</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {editItems.length === 0
                  ? (
                    <tr>
                      <td colSpan={13} className="text-center py-6 text-gray-400">
                        No items yet — click <strong>+ Add Row</strong> to begin
                      </td>
                    </tr>
                  )
                  : editItems.map((row, idx) => (
                    <tr key={idx}>
                      <td><input className="w-full min-w-[100px] border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs" placeholder="ITEM-001" value={row.item_link || ''} onChange={e => handleItemChange(idx, 'item_link', e.target.value)} /></td>
                      <td><input className="w-full min-w-[120px] border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs" placeholder="Description" value={row.description || ''} onChange={e => handleItemChange(idx, 'description', e.target.value)} /></td>
                      <td><input className="w-20 border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs" placeholder="Make" value={row.make || ''} onChange={e => handleItemChange(idx, 'make', e.target.value)} /></td>
                      <td><input className="w-24 border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs" placeholder="Model" value={row.model_no || ''} onChange={e => handleItemChange(idx, 'model_no', e.target.value)} /></td>
                      <td><input className="w-20 border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs" placeholder="HSN" value={row.hsn_code || ''} onChange={e => handleItemChange(idx, 'hsn_code', e.target.value)} /></td>
                      <td><input className="w-28 border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs" placeholder="SN1, SN2" value={row.serial_numbers || ''} onChange={e => handleItemChange(idx, 'serial_numbers', e.target.value)} /></td>
                      <td className="text-right"><input className="w-16 border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs text-right" type="number" min={0} value={row.qty ?? ''} onChange={e => handleItemChange(idx, 'qty', parseFloat(e.target.value) || 0)} /></td>
                      <td><input className="w-14 border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs" placeholder="Nos" value={row.uom || ''} onChange={e => handleItemChange(idx, 'uom', e.target.value)} /></td>
                      <td className="text-right"><input className="w-24 border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs text-right" type="number" min={0} step={0.01} value={row.purchase_cost ?? ''} onChange={e => handleItemChange(idx, 'purchase_cost', parseFloat(e.target.value) || 0)} /></td>
                      <td><input className="w-24 border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs" placeholder="Invoice No." value={row.vendor_invoice_no || ''} onChange={e => handleItemChange(idx, 'vendor_invoice_no', e.target.value)} /></td>
                      <td><input className="w-24 border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs" placeholder="PO Ref" value={row.linked_purchase_order || ''} onChange={e => handleItemChange(idx, 'linked_purchase_order', e.target.value)} /></td>
                      <td><input className="w-24 border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-xs" placeholder="Remark" value={row.remark || ''} onChange={e => handleItemChange(idx, 'remark', e.target.value)} /></td>
                      <td>
                        <button onClick={() => handleRemoveRow(idx)} className="text-rose-400 hover:text-rose-600 text-xs font-bold px-1" title="Remove row">✕</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
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
                {displayItems.length === 0
                  ? <tr><td colSpan={12} className="text-center py-8 text-gray-400">No items</td></tr>
                  : displayItems.map((i, idx) => (
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
          )}
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
