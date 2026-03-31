'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  Loader2,
  ClipboardList,
  Package,
  Calendar,
  Building2,
  RotateCcw,
  ArrowUpRight,
  Boxes,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { useRole } from '@/context/RoleContext';

interface IndentItem {
  name?: string;
  item_code?: string;
  item_name?: string;
  description?: string;
  qty?: number;
  uom?: string;
  stock_qty?: number;
  warehouse?: string;
  schedule_date?: string;
  ordered_qty?: number;
  received_qty?: number;
}

interface IndentDetail {
  name: string;
  material_request_type?: string;
  transaction_date?: string;
  schedule_date?: string;
  status?: string;
  company?: string;
  set_warehouse?: string;
  docstatus?: number;
  per_ordered?: number;
  project?: string;
  items?: IndentItem[];
  creation?: string;
  modified?: string;
  owner?: string;
  _comment_count?: number;
}

interface StockContextRow {
  item_code: string;
  actual_qty?: number;
  reserved_qty?: number;
  ordered_qty?: number;
  projected_qty?: number;
  warehouse?: string;
}

interface VendorComparisonSummary {
  name: string;
  status?: string;
  recommended_supplier?: string;
  selected_total_amount?: number;
  creation?: string;
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'Draft').toLowerCase();
  const style = s === 'submitted' || s === 'pending'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'acknowledged'
    ? 'bg-purple-50 text-purple-700 border-purple-200'
    : s === 'accepted' || s === 'ordered' || s === 'transferred'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'rejected' || s === 'cancelled'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'partially ordered'
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : s === 'escalated'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function IndentDetailPage() {
  const params = useParams();
  const indentName = decodeURIComponent((params?.id as string) || '');
  const { currentRole } = useRole();

  const [data, setData] = useState<IndentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [rejectModal, setRejectModal] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [escalateModal, setEscalateModal] = useState(false);
  const [stockContext, setStockContext] = useState<Record<string, StockContextRow>>({});
  const [relatedComparisons, setRelatedComparisons] = useState<VendorComparisonSummary[]>([]);
  const [contextLoading, setContextLoading] = useState(false);

  const approvalRoles = new Set(['Project Head', 'Director', 'Department Head']);
  const submitRoles = new Set(['Procurement Manager', 'Purchase', 'Project Head', 'Director']);

  const canSubmit = data?.docstatus === 0 && submitRoles.has(currentRole || '');
  const canAcknowledge = approvalRoles.has(currentRole || '') && data?.status === 'Submitted';
  const canAcceptOrReject = approvalRoles.has(currentRole || '') && ['Submitted', 'Acknowledged', 'Escalated'].includes(data?.status || '');
  const canEscalate = (currentRole === 'Project Head' || currentRole === 'Director') && canAcceptOrReject;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'get_indent', args: { name: indentName } }),
      });
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load indent');
    } finally {
      setLoading(false);
    }
  }, [indentName]);

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

  const runAction = async (method: string, args: Record<string, string> = {}) => {
    setActionBusy(method);
    setError('');
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, args: { name: indentName, ...args } }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${method}`);
      showSuccess(result.message || `${method} completed`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${method}`);
    } finally {
      setActionBusy('');
    }
  };

  useEffect(() => {
    const loadContext = async () => {
      if (!data) {
        setStockContext({});
        setRelatedComparisons([]);
        return;
      }

      setContextLoading(true);
      try {
        const stockRows = await Promise.all(
          (data.items || [])
            .filter((item) => item.item_code)
            .map(async (item) => {
              try {
                const response = await postOps('get_stock_position', {
                  item_code: item.item_code || '',
                  warehouse: item.warehouse || data.set_warehouse || '',
                  limit_page_length: 20,
                });
                return {
                  itemCode: item.item_code || '',
                  rows: Array.isArray(response) ? response as StockContextRow[] : [],
                };
              } catch {
                return { itemCode: item.item_code || '', rows: [] };
              }
            }),
        );

        const contextMap: Record<string, StockContextRow> = {};
        for (const entry of stockRows) {
          const row = entry.rows[0];
          if (!row) continue;
          contextMap[entry.itemCode] = row;
        }

        const comparisonData = await postOps('get_vendor_comparisons', { material_request: data.name });
        setStockContext(contextMap);
        setRelatedComparisons(Array.isArray(comparisonData) ? comparisonData as VendorComparisonSummary[] : []);
      } catch {
        setStockContext({});
        setRelatedComparisons([]);
      } finally {
        setContextLoading(false);
      }
    };

    void loadContext();
  }, [data, postOps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading indent...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-rose-600">{error}</p>
        <Link href="/indents" className="text-sm text-blue-600 hover:underline">← Back to Indents</Link>
      </div>
    );
  }

  if (!data) return null;

  const items: IndentItem[] = data.items || [];
  const totalQty = items.reduce((sum, i) => sum + (i.qty || 0), 0);
  const totalOrdered = items.reduce((sum, i) => sum + (i.ordered_qty || 0), 0);
  const stockCoverage = items.map((item) => {
    const row = item.item_code ? stockContext[item.item_code] : undefined;
    const actualQty = row?.actual_qty || 0;
    const reservedQty = row?.reserved_qty || 0;
    const availableQty = Math.max(actualQty - reservedQty, 0);
    const requiredQty = item.qty || 0;
    return {
      itemCode: item.item_code || '-',
      warehouse: row?.warehouse || item.warehouse || data.set_warehouse || '-',
      requiredQty,
      availableQty,
      orderedQty: row?.ordered_qty || 0,
      projectedQty: row?.projected_qty || 0,
      shortageQty: Math.max(requiredQty - availableQty, 0),
    };
  });
  const coveredItems = stockCoverage.filter((row) => row.shortageQty <= 0).length;
  const shortageItems = stockCoverage.filter((row) => row.shortageQty > 0).length;
  const totalAvailableQty = stockCoverage.reduce((sum, row) => sum + row.availableQty, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/indents" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Indents
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.material_request_type || 'Purchase'} &middot; {data.company || '-'} &middot; {data.project || 'No project'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          {canSubmit && (
            <button onClick={() => runAction('submit_indent')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{actionBusy === 'submit_indent' ? 'Submitting...' : 'Submit'}
            </button>
          )}
          {canAcknowledge && (
            <button onClick={() => runAction('acknowledge_indent')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">
              <CheckCircle2 className="h-3.5 w-3.5" />{actionBusy === 'acknowledge_indent' ? 'Acknowledging...' : 'Acknowledge'}
            </button>
          )}
          {canAcceptOrReject && (
            <>
              <button onClick={() => runAction('accept_indent')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" />{actionBusy === 'accept_indent' ? 'Accepting...' : 'Accept'}
              </button>
              <button onClick={() => setRejectModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
              <button onClick={() => setReturnModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                <RotateCcw className="h-3.5 w-3.5" /> Return
              </button>
              {canEscalate && (
                <button onClick={() => setEscalateModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                  <ArrowUpRight className="h-3.5 w-3.5" /> Escalate
                </button>
              )}
            </>
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

      {/* Detail + Ordering Progress */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Indent Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<ClipboardList key="t" className="h-3.5 w-3.5" />, 'Type', data.material_request_type],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.project],
                [<Package key="w" className="h-3.5 w-3.5" />, 'Warehouse', data.set_warehouse],
                [<Calendar key="d" className="h-3.5 w-3.5" />, 'Transaction Date', data.transaction_date],
                [<Calendar key="s" className="h-3.5 w-3.5" />, 'Required By', data.schedule_date],
                [<AlertCircle key="o" className="h-3.5 w-3.5" />, '% Ordered', `${(data.per_ordered || 0).toFixed(0)}%`],
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

        {/* Progress */}
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Item Summary</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{items.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Items</div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
                <div className="text-2xl font-bold text-blue-900">{totalQty}</div>
                <div className="text-xs text-blue-600 mt-0.5">Total Qty</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-900">{totalOrdered}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Ordered Qty</div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
                <div className="text-2xl font-bold text-amber-900">{(data.per_ordered || 0).toFixed(0)}%</div>
                <div className="text-xs text-amber-600 mt-0.5">Fulfillment</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Ordering Progress</span>
                <span>{(data.per_ordered || 0).toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(data.per_ordered || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Indent Line Items</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Item Code</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                <th className="px-4 py-2.5 font-medium">UOM</th>
                <th className="px-4 py-2.5 font-medium">Warehouse</th>
                <th className="px-4 py-2.5 font-medium">Req. By</th>
                <th className="px-4 py-2.5 font-medium text-right">Ordered</th>
                <th className="px-4 py-2.5 font-medium text-right">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No line items</td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.name || idx}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{item.item_code || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate">{item.description || item.item_name || '-'}</td>
                  <td className="px-4 py-2.5 text-right">{item.qty ?? '-'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{item.uom || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{item.warehouse || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{item.schedule_date || '-'}</td>
                  <td className="px-4 py-2.5 text-right">{item.ordered_qty ?? 0}</td>
                  <td className="px-4 py-2.5 text-right">{item.received_qty ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="card-header flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">Stock-on-Hand Context</h3>
              <p className="mt-0.5 text-xs text-gray-500">Live warehouse stock versus the quantities requested on this indent.</p>
            </div>
            {contextLoading ? <span className="text-xs text-gray-400">Refreshing stock…</span> : null}
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs text-gray-500">Items Fully Covered</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{coveredItems}</div>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                <div className="text-xs text-rose-700">Items Short</div>
                <div className="mt-1 text-2xl font-semibold text-rose-900">{shortageItems}</div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="text-xs text-blue-700">Available Qty</div>
                <div className="mt-1 text-2xl font-semibold text-blue-900">{totalAvailableQty}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Item</th>
                    <th className="px-4 py-2.5 font-medium">Warehouse</th>
                    <th className="px-4 py-2.5 font-medium text-right">Required</th>
                    <th className="px-4 py-2.5 font-medium text-right">Available</th>
                    <th className="px-4 py-2.5 font-medium text-right">Ordered</th>
                    <th className="px-4 py-2.5 font-medium text-right">Projected</th>
                    <th className="px-4 py-2.5 font-medium text-right">Shortage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stockCoverage.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No stock context available.</td></tr>
                  ) : stockCoverage.map((row) => (
                    <tr key={row.itemCode}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{row.itemCode}</td>
                      <td className="px-4 py-2.5 text-gray-500">{row.warehouse}</td>
                      <td className="px-4 py-2.5 text-right">{row.requiredQty}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-700">{row.availableQty}</td>
                      <td className="px-4 py-2.5 text-right text-blue-700">{row.orderedQty}</td>
                      <td className="px-4 py-2.5 text-right text-indigo-700">{row.projectedQty}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={row.shortageQty > 0 ? 'font-semibold text-rose-700' : 'text-emerald-700'}>
                          {row.shortageQty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Downstream Vendor Comparisons</h3>
            <p className="mt-0.5 text-xs text-gray-500">Comparisons raised against this indent after acceptance.</p>
          </div>
          <div className="card-body">
            {relatedComparisons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                No vendor comparisons have been linked to this indent yet.
              </div>
            ) : (
              <div className="space-y-3">
                {relatedComparisons.map((comparison) => (
                  <Link
                    key={comparison.name}
                    href={`/vendor-comparisons/${encodeURIComponent(comparison.name)}`}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50/50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Boxes className="h-4 w-4 text-indigo-500" />
                        <span className="font-medium text-gray-900">{comparison.name}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {comparison.recommended_supplier || 'Supplier pending'} • {comparison.status || 'Draft'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{comparison.selected_total_amount ? `₹ ${comparison.selected_total_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹ 0'}</div>
                        <div className="text-xs text-gray-500">
                          {comparison.creation ? new Date(comparison.creation).toLocaleDateString('en-IN') : 'No date'}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linked records */}
      {data.project && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Link
            href={`/procurement?search=${encodeURIComponent(data.name)}`}
            className="card card-body flex items-center gap-3 hover:bg-amber-50 transition"
          >
            <Package className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs text-gray-500">Related Procurement</div>
              <div className="text-sm font-medium text-gray-900">Search vendor comparisons</div>
            </div>
          </Link>
        </div>
      )}

      {/* Linked Documents */}
      <TraceabilityPanel projectId={data.project} />

      <RecordDocumentsPanel
        referenceDoctype="Material Request"
        referenceName={indentName}
        title="Linked Documents"
        initialLimit={5}
      />

      {/* Accountability Trail */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
        <div className="card-body">
          <AccountabilityTimeline
            subjectDoctype="Material Request"
            subjectName={indentName}
            compact={false}
            initialLimit={10}
          />
        </div>
      </div>

      {/* Reject Modal */}
      <ActionModal
        open={rejectModal}
        title="Reject Indent"
        description={`Reject ${data.name}. A written justification is required.`}
        variant="danger"
        confirmLabel="Reject Indent"
        busy={actionBusy === 'reject_indent'}
        fields={[
          { name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Why is this indent being rejected?' },
        ]}
        onConfirm={async (values) => {
          await runAction('reject_indent', { reason: values.reason || '' });
          setRejectModal(false);
        }}
        onCancel={() => setRejectModal(false)}
      />

      {/* Return Modal */}
      <ActionModal
        open={returnModal}
        title="Return Indent for Revision"
        description={`Return ${data.name} to the requester for correction. A justification is required.`}
        variant="default"
        confirmLabel="Return for Revision"
        busy={actionBusy === 'return_indent'}
        fields={[
          { name: 'reason', label: 'Return Reason', type: 'textarea', required: true, placeholder: 'What needs to be corrected or clarified?' },
        ]}
        onConfirm={async (values) => {
          await runAction('return_indent', { reason: values.reason || '' });
          setReturnModal(false);
        }}
        onCancel={() => setReturnModal(false)}
      />

      {/* Escalate Modal */}
      <ActionModal
        open={escalateModal}
        title="Escalate Indent"
        description={`Escalate ${data.name} to a higher authority. A justification is required.`}
        variant="default"
        confirmLabel="Escalate"
        busy={actionBusy === 'escalate_indent'}
        fields={[
          { name: 'reason', label: 'Escalation Reason', type: 'textarea', required: true, placeholder: 'Why does this need escalation?' },
        ]}
        onConfirm={async (values) => {
          await runAction('escalate_indent', { reason: values.reason || '' });
          setEscalateModal(false);
        }}
        onCancel={() => setEscalateModal(false)}
      />

      {/* Next Step */}
      <div className="card border-blue-200 bg-blue-50/50">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-700">Next Step in Workflow</p>
            <p className="text-sm text-gray-600 mt-0.5">Indent → <strong>Vendor Comparison</strong> → Purchase Order</p>
          </div>
          <Link href="/vendor-comparisons" className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Go to Vendor Comparisons →</Link>
        </div>
      </div>
    </div>
  );
}
