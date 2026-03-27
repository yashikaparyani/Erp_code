'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Send,
  RotateCcw,
  ShoppingCart,
  FileText,
  AlertCircle,
  Loader2,
  User,
  Calendar,
  Building2,
  Hash,
  Package,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { useAuth } from '@/context/AuthContext';

interface Quote {
  name?: string;
  supplier?: string;
  item_link?: string;
  description?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  is_selected?: 0 | 1;
  uom?: string;
  unit?: string;
  delivery_days?: number;
  lead_time_days?: number;
  warranty_months?: number;
  remarks?: string;
}

interface VendorComparisonDetail {
  name: string;
  linked_material_request?: string;
  linked_rfq?: string;
  linked_project?: string;
  linked_tender?: string;
  linked_boq?: string;
  status?: string;
  recommended_supplier?: string;
  prepared_by_user?: string;
  approved_by?: string;
  approved_at?: string;
  exception_approved_by?: string;
  exception_reason?: string;
  quote_count?: number;
  distinct_supplier_count?: number;
  lowest_total_amount?: number;
  selected_total_amount?: number;
  notes?: string;
  creation?: string;
  modified?: string;
  owner?: string;
  quotes?: Quote[];
}

interface PurchaseOrderItem {
  material_request?: string;
  item_code?: string;
}

interface PurchaseOrderRecord {
  name: string;
  supplier?: string;
  status?: string;
  transaction_date?: string;
  grand_total?: number;
  per_received?: number;
  per_billed?: number;
  items?: PurchaseOrderItem[];
}

function formatCurrency(val?: number): string {
  if (!val) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'DRAFT').toUpperCase();
  const style = s === 'APPROVED'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'PENDING_APPROVAL'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'REJECTED'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>
      {s.replace(/_/g, ' ')}
    </span>
  );
}

export default function VendorComparisonDetailPage() {
  const params = useParams();
  const vcName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<VendorComparisonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state
  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [downstreamPOs, setDownstreamPOs] = useState<PurchaseOrderRecord[]>([]);
  const [poChainLoading, setPoChainLoading] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canApproveReject = hasRole('Director', 'System Manager', 'Project Head', 'Department Head');
  const canSubmitRevise = hasRole('Director', 'System Manager', 'Procurement Manager', 'Purchase');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'get_vendor_comparison', args: { name: vcName } }),
      });
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendor comparison');
    } finally {
      setLoading(false);
    }
  }, [vcName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const postOps = useCallback(async (method: string, args: Record<string, unknown>) => {
    const res = await fetch('/api/ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args }),
    });
    const payload = await res.json();
    if (!payload.success) {
      throw new Error(payload.message || `Failed to execute ${method}`);
    }
    return payload.data?.data || payload.data;
  }, []);

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action);
    setError('');
    try {
      const res = await fetch(`/api/vendor-comparisons/${encodeURIComponent(vcName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action}`);
      showSuccess(result.message || `${action} completed`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionBusy('');
    }
  };

  useEffect(() => {
    const loadDownstreamPOs = async () => {
      if (!data?.linked_material_request) {
        setDownstreamPOs([]);
        return;
      }

      setPoChainLoading(true);
      try {
        const purchaseOrders = await postOps('get_purchase_orders', {
          project: data.linked_project || '',
          limit_page_length: 100,
        });
        const records = Array.isArray(purchaseOrders) ? purchaseOrders : [];
        const details = await Promise.all(
          records.map(async (row: { name?: string }) => {
            if (!row?.name) return null;
            try {
              return await postOps('get_purchase_order', { name: row.name }) as PurchaseOrderRecord;
            } catch {
              return null;
            }
          }),
        );

        const selectedSuppliers = new Set(
          (data.quotes || [])
            .filter((quote) => quote.is_selected && quote.supplier)
            .map((quote) => quote.supplier as string),
        );

        const matched = details
          .filter((record): record is PurchaseOrderRecord => Boolean(record?.name))
          .filter((record) => {
            const touchesIndent = (record.items || []).some(
              (item) => item.material_request === data.linked_material_request,
            );
            if (!touchesIndent) return false;
            return selectedSuppliers.size === 0 || selectedSuppliers.has(record.supplier || '');
          })
          .sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''));

        setDownstreamPOs(matched);
      } catch {
        setDownstreamPOs([]);
      } finally {
        setPoChainLoading(false);
      }
    };

    void loadDownstreamPOs();
  }, [data, postOps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading vendor comparison...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-rose-600">{error}</p>
        <Link href="/procurement" className="text-sm text-blue-600 hover:underline">← Back to Procurement</Link>
      </div>
    );
  }

  if (!data) return null;

  const quotes: Quote[] = data.quotes || [];
  const selectedQuotes = quotes.filter((q) => q.is_selected);
  const otherQuotes = quotes.filter((q) => !q.is_selected);
  const isDraft = data.status === 'DRAFT';
  const isPending = data.status === 'PENDING_APPROVAL';
  const isApproved = data.status === 'APPROVED';
  const isRejected = data.status === 'REJECTED';
  const lineItemBreakdown = useMemo(() => {
    const groups = new Map<string, {
      itemCode: string;
      description: string;
      totalQty: number;
      unit: string;
      selectedSupplier?: string;
      selectedAmount?: number;
      quotes: Quote[];
    }>();

    for (const quote of quotes) {
      const key = quote.item_link || quote.description || quote.name || `line-${groups.size}`;
      const existing = groups.get(key);
      if (existing) {
        existing.totalQty += quote.qty || 0;
        existing.quotes.push(quote);
        if (quote.is_selected) {
          existing.selectedSupplier = quote.supplier;
          existing.selectedAmount = quote.amount;
        }
        continue;
      }

      groups.set(key, {
        itemCode: quote.item_link || '-',
        description: quote.description || quote.item_link || '-',
        totalQty: quote.qty || 0,
        unit: quote.uom || quote.unit || '-',
        selectedSupplier: quote.is_selected ? quote.supplier : undefined,
        selectedAmount: quote.is_selected ? quote.amount : undefined,
        quotes: [quote],
      });
    }

    return Array.from(groups.values());
  }, [quotes]);
  const poChainValue = downstreamPOs.reduce((sum, po) => sum + (po.grand_total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/procurement" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Procurement
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.recommended_supplier || 'No vendor selected'} &middot; {formatCurrency(data.selected_total_amount)} total
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          {isDraft && canSubmitRevise && (
            <button onClick={() => runAction('submit')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          {isPending && canApproveReject && (
            <>
              <button onClick={() => setApproveModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
              <button onClick={() => setRejectModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
          {(isApproved || isRejected) && canSubmitRevise && (
            <button onClick={() => runAction('revise')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50">
              <RotateCcw className="h-3.5 w-3.5" /> Revise
            </button>
          )}
          {isApproved && canSubmitRevise && (
            <button onClick={() => runAction('create_po')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50">
              <ShoppingCart className="h-3.5 w-3.5" /> Create PO
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Detail & Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Context card */}
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Comparison Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="h" className="h-3.5 w-3.5" />, 'Material Request', data.linked_material_request],
                [<FileText key="f" className="h-3.5 w-3.5" />, 'RFQ', data.linked_rfq],
                [<Building2 key="b" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<FileText key="t" className="h-3.5 w-3.5" />, 'Tender', data.linked_tender],
                [<FileText key="q" className="h-3.5 w-3.5" />, 'BOQ', data.linked_boq],
                [<User key="p" className="h-3.5 w-3.5" />, 'Prepared By', data.prepared_by_user || data.owner],
                [<User key="a" className="h-3.5 w-3.5" />, 'Recommended Supplier', data.recommended_supplier],
                [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', data.creation ? new Date(data.creation).toLocaleDateString('en-IN') : '-'],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                  <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Summary stats */}
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Summary</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{data.distinct_supplier_count ?? 0}</div>
                <div className="text-xs text-gray-500 mt-0.5">Suppliers</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{data.quote_count ?? 0}</div>
                <div className="text-xs text-gray-500 mt-0.5">Total Quotes</div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
                <div className="text-2xl font-bold text-blue-900">{formatCurrency(data.lowest_total_amount)}</div>
                <div className="text-xs text-blue-600 mt-0.5">Lowest Total</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-900">{formatCurrency(data.selected_total_amount)}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Selected Total</div>
              </div>
            </div>

            {/* Approval info */}
            {(data.approved_by || data.exception_reason) && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 space-y-2">
                {data.approved_by && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-gray-600">Approved by <strong>{data.approved_by}</strong></span>
                    {data.approved_at && <span className="text-gray-400 text-xs">on {new Date(data.approved_at).toLocaleDateString('en-IN')}</span>}
                  </div>
                )}
                {data.exception_reason && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Exception/Remarks:</span> {data.exception_reason}
                    {data.exception_approved_by && <span className="text-gray-400"> — by {data.exception_approved_by}</span>}
                  </div>
                )}
              </div>
            )}

            {data.notes && (
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <strong>Notes:</strong> {data.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Quote Line Item Breakdown</h3>
          <p className="mt-0.5 text-xs text-gray-500">Item-level commercial comparison so approvers can review the chosen supplier against alternate quotes.</p>
        </div>
        <div className="card-body space-y-4">
          {lineItemBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400">No quote lines available.</p>
          ) : lineItemBreakdown.map((group, index) => (
            <div key={`${group.itemCode}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    <h4 className="text-sm font-semibold text-gray-900">{group.itemCode}</h4>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{group.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-[260px]">
                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                    <div className="text-gray-500">Required Qty</div>
                    <div className="mt-0.5 font-semibold text-gray-900">{group.totalQty} {group.unit}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <div className="text-emerald-700">Chosen Vendor</div>
                    <div className="mt-0.5 font-semibold text-emerald-900">{group.selectedSupplier || 'Pending selection'}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Supplier</th>
                      <th className="px-3 py-2 font-medium text-right">Qty</th>
                      <th className="px-3 py-2 font-medium text-right">Rate</th>
                      <th className="px-3 py-2 font-medium text-right">Amount</th>
                      <th className="px-3 py-2 font-medium text-right">Lead Time</th>
                      <th className="px-3 py-2 font-medium text-right">Warranty</th>
                      <th className="px-3 py-2 font-medium">Selection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {group.quotes.map((quote, quoteIndex) => (
                      <tr key={quote.name || `${group.itemCode}-${quoteIndex}`} className={quote.is_selected ? 'bg-emerald-50/60' : 'bg-white'}>
                        <td className="px-3 py-2 font-medium text-gray-900">{quote.supplier || '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{quote.qty ?? '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(quote.rate)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(quote.amount)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {quote.lead_time_days ?? quote.delivery_days ?? '-'}
                          {quote.lead_time_days || quote.delivery_days ? ' d' : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {quote.warranty_months ?? '-'}
                          {quote.warranty_months ? ' mo' : ''}
                        </td>
                        <td className="px-3 py-2">
                          {quote.is_selected ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Selected</span>
                          ) : (
                            <span className="text-xs text-gray-400">Alternate</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {group.selectedAmount ? (
                <div className="mt-3 text-right text-xs font-medium text-emerald-700">
                  Chosen commercial value: {formatCurrency(group.selectedAmount)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Quotation Lines</h3>
          <p className="text-xs text-gray-500 mt-0.5">{selectedQuotes.length} selected, {otherQuotes.length} other</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Supplier</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                <th className="px-4 py-2.5 font-medium text-right">Rate</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                <th className="px-4 py-2.5 font-medium">UOM</th>
                <th className="px-4 py-2.5 font-medium text-center">Selected</th>
                <th className="px-4 py-2.5 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No quotation lines</td></tr>
              ) : quotes.map((q, idx) => (
                <tr key={q.name || idx} className={q.is_selected ? 'bg-emerald-50/40' : ''}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{q.supplier || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate">{q.description || '-'}</td>
                  <td className="px-4 py-2.5 text-right">{q.qty ?? '-'}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(q.rate)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(q.amount)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{q.uom || '-'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {q.is_selected ? (
                      <CheckCircle2 className="inline h-4 w-4 text-emerald-500" />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[150px] truncate">{q.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Linked Records */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.linked_project && (
          <Link
            href={`/projects/${encodeURIComponent(data.linked_project)}`}
            className="card card-body flex items-center gap-3 hover:bg-blue-50 transition"
          >
            <Building2 className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-xs text-gray-500">Linked Project</div>
              <div className="text-sm font-medium text-gray-900">{data.linked_project}</div>
            </div>
          </Link>
        )}
        {data.linked_tender && (
          <Link
            href={`/pre-sales?search=${encodeURIComponent(data.linked_tender)}`}
            className="card card-body flex items-center gap-3 hover:bg-amber-50 transition"
          >
            <FileText className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs text-gray-500">Linked Tender</div>
              <div className="text-sm font-medium text-gray-900">{data.linked_tender}</div>
            </div>
          </Link>
        )}
        {data.linked_material_request && (
          <Link
            href={`/indents/${encodeURIComponent(data.linked_material_request)}`}
            className="card card-body flex items-center gap-3 hover:bg-indigo-50 transition"
          >
            <Hash className="h-5 w-5 text-indigo-500" />
            <div>
              <div className="text-xs text-gray-500">Material Request / Indent</div>
              <div className="text-sm font-medium text-gray-900">{data.linked_material_request}</div>
            </div>
          </Link>
        )}
      </div>

      {/* Linked Documents */}
      <TraceabilityPanel projectId={data.linked_project} />

      <RecordDocumentsPanel
        referenceDoctype="GE Vendor Comparison"
        referenceName={vcName}
        title="Linked Documents"
        initialLimit={5}
      />

      <div className="card">
        <div className="card-header flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Downstream PO Chain</h3>
            <p className="mt-0.5 text-xs text-gray-500">Purchase orders raised from this comparison’s selected vendor lines.</p>
          </div>
          {poChainLoading ? <span className="text-xs text-gray-400">Refreshing chain…</span> : null}
        </div>
        <div className="card-body">
          {downstreamPOs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
              No downstream purchase orders found yet for this comparison.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-xs text-gray-500">PO Count</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">{downstreamPOs.length}</div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="text-xs text-blue-700">PO Value</div>
                  <div className="mt-1 text-2xl font-semibold text-blue-900">{formatCurrency(poChainValue)}</div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="text-xs text-emerald-700">Average Receipt</div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-900">
                    {downstreamPOs.length > 0 ? `${Math.round(downstreamPOs.reduce((sum, po) => sum + (po.per_received || 0), 0) / downstreamPOs.length)}%` : '0%'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {downstreamPOs.map((po) => (
                  <Link
                    key={po.name}
                    href={`/purchase-orders/${encodeURIComponent(po.name)}`}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50/50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-orange-500" />
                        <span className="font-medium text-gray-900">{po.name}</span>
                        {po.status ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {po.status}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {po.supplier || 'Supplier pending'} • {po.transaction_date || 'No order date'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(po.grand_total)}</div>
                        <div className="text-xs text-gray-500">Received {Math.round(po.per_received || 0)}%</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accountability Trail */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
        <div className="card-body">
          <AccountabilityTimeline
            subjectDoctype="GE Vendor Comparison"
            subjectName={vcName}
            compact={false}
            initialLimit={10}
          />
        </div>
      </div>

      {/* Approve Modal */}
      <ActionModal
        open={approveModal}
        title="Approve Vendor Comparison"
        description={`Approve ${data.name} — recommended supplier: ${data.recommended_supplier || 'none selected'}. Selected total: ${formatCurrency(data.selected_total_amount)}.`}
        variant="success"
        confirmLabel="Approve"
        busy={actionBusy === 'approve'}
        fields={[
          { name: 'exception_reason', label: 'Exception Reason / Remarks', type: 'textarea', placeholder: 'Optional — document any exception or note' },
        ]}
        onConfirm={async (values) => {
          await runAction('approve', { exception_reason: values.exception_reason || '' });
          setApproveModal(false);
        }}
        onCancel={() => setApproveModal(false)}
      />

      {/* Reject Modal */}
      <ActionModal
        open={rejectModal}
        title="Reject Vendor Comparison"
        description={`Reject ${data.name}. Please provide a reason for rejection.`}
        variant="danger"
        confirmLabel="Reject"
        busy={actionBusy === 'reject'}
        fields={[
          { name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Mandatory — why is this comparison being rejected?' },
        ]}
        onConfirm={async (values) => {
          await runAction('reject', { reason: values.reason || '' });
          setRejectModal(false);
        }}
        onCancel={() => setRejectModal(false)}
      />
    </div>
  );
}
