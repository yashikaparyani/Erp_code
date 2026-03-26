'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Package,
  Calendar,
  Building2,
  Truck,
  ClipboardCheck,
  FileText,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';

interface GRNItem {
  name?: string;
  item_code?: string;
  item_name?: string;
  description?: string;
  qty?: number;
  uom?: string;
  rate?: number;
  amount?: number;
  warehouse?: string;
  received_qty?: number;
  rejected_qty?: number;
  purchase_order?: string;
  purchase_order_item?: string;
}

interface GRNDetail {
  name: string;
  supplier?: string;
  supplier_name?: string;
  posting_date?: string;
  posting_time?: string;
  status?: string;
  project?: string;
  set_warehouse?: string;
  grand_total?: number;
  net_total?: number;
  per_billed?: number;
  per_returned?: number;
  docstatus?: number;
  items?: GRNItem[];
  creation?: string;
  modified?: string;
  owner?: string;
  purchase_order?: string;
  supplier_delivery_note?: string;
  transporter_name?: string;
  lr_no?: string;
  lr_date?: string;
}

function formatCurrency(val?: number) {
  if (!val) return '₹0';
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'Draft').toLowerCase();
  const style = s === 'completed'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'cancelled'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'return'
    ? 'bg-orange-50 text-orange-700 border-orange-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function GRNDetailPage() {
  const params = useParams();
  const grnName = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<GRNDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'get_grn', args: { name: grnName } }),
      });
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GRN');
    } finally {
      setLoading(false);
    }
  }, [grnName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading GRN...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-rose-600">{error}</p>
        <Link href="/grns" className="text-sm text-blue-600 hover:underline">← Back to GRNs</Link>
      </div>
    );
  }

  if (!data) return null;

  const items: GRNItem[] = data.items || [];
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
  const totalRejected = items.reduce((s, i) => s + (i.rejected_qty || 0), 0);
  const linkedPOs = Array.from(new Set(items.map((i) => i.purchase_order).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/grns" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to GRNs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.supplier_name || data.supplier || 'No supplier'} &middot; {data.posting_date || '-'} &middot; {formatCurrency(data.grand_total)}
          </p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Details + Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Receipt Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Truck key="s" className="h-3.5 w-3.5" />, 'Supplier', data.supplier_name || data.supplier],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.project],
                [<Package key="w" className="h-3.5 w-3.5" />, 'Warehouse', data.set_warehouse],
                [<Calendar key="d" className="h-3.5 w-3.5" />, 'Posting Date', data.posting_date],
                [<FileText key="dn" className="h-3.5 w-3.5" />, 'Supplier DN', data.supplier_delivery_note],
                [<Truck key="tr" className="h-3.5 w-3.5" />, 'Transporter', data.transporter_name],
                [<ClipboardCheck key="lr" className="h-3.5 w-3.5" />, 'LR No.', data.lr_no],
                [<Calendar key="lrd" className="h-3.5 w-3.5" />, 'LR Date', data.lr_date],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                  <dd className="font-medium text-gray-900">{String(value || '-')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Summary</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{items.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Line Items</div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
                <div className="text-2xl font-bold text-blue-900">{totalQty}</div>
                <div className="text-xs text-blue-600 mt-0.5">Qty Received</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-900">{formatCurrency(data.grand_total)}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Grand Total</div>
              </div>
              {totalRejected > 0 && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center">
                  <div className="text-2xl font-bold text-rose-900">{totalRejected}</div>
                  <div className="text-xs text-rose-600 mt-0.5">Rejected Qty</div>
                </div>
              )}
            </div>

            {/* Billing */}
            {(data.per_billed || 0) > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Billing Progress</span>
                  <span>{(data.per_billed || 0).toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(data.per_billed || 0, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Received Items</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                <th className="px-4 py-2.5 font-medium text-right">Rate</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                <th className="px-4 py-2.5 font-medium">UOM</th>
                <th className="px-4 py-2.5 font-medium">Warehouse</th>
                <th className="px-4 py-2.5 font-medium">PO Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No items</td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.name || idx}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{item.item_code || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate">{item.description || item.item_name || '-'}</td>
                  <td className="px-4 py-2.5 text-right">{item.qty ?? '-'}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(item.rate)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{item.uom || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{item.warehouse || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {item.purchase_order ? (
                      <Link href={`/purchase-orders/${encodeURIComponent(item.purchase_order)}`} className="text-blue-600 hover:underline text-xs">
                        {item.purchase_order}
                      </Link>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Linked records */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {linkedPOs.map((po) => (
          <Link
            key={po}
            href={`/purchase-orders/${encodeURIComponent(po!)}`}
            className="card card-body flex items-center gap-3 hover:bg-blue-50 transition"
          >
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-xs text-gray-500">Linked Purchase Order</div>
              <div className="text-sm font-medium text-gray-900">{po}</div>
            </div>
          </Link>
        ))}
        {data.project && (
          <Link
            href={`/projects/${encodeURIComponent(data.project)}`}
            className="card card-body flex items-center gap-3 hover:bg-blue-50 transition"
          >
            <Building2 className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-xs text-gray-500">Linked Project</div>
              <div className="text-sm font-medium text-gray-900">{data.project}</div>
            </div>
          </Link>
        )}
      </div>

      {/* Linked Documents */}
      <RecordDocumentsPanel
        referenceDoctype="Purchase Receipt"
        referenceName={grnName}
        title="Linked Documents"
        initialLimit={5}
      />

      {/* Linked Records */}
      <LinkedRecordsPanel
        links={[
          {
            label: 'Purchase Order',
            doctype: 'Purchase Order',
            method: 'frappe.client.get_list',
            args: { doctype: 'Purchase Order', filters: JSON.stringify({ name: data?.purchase_order || '' }), fields: JSON.stringify(['name', 'supplier', 'status', 'grand_total', 'transaction_date']), limit_page_length: '5' },
            href: (name) => `/purchase-orders/${name}`,
          },
        ]}
      />

      {/* Accountability Trail */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
        <div className="card-body">
          <AccountabilityTimeline
            subjectDoctype="Purchase Receipt"
            subjectName={grnName}
            compact={false}
            initialLimit={10}
          />
        </div>
      </div>
    </div>
  );
}
