'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  Send,
  Ban,
  Save,
  AlertCircle,
  Upload,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';

/* ── Types ─────────────────────────────────────────────────── */

interface POItem {
  name?: string;
  item_code?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  description?: string;
  uom?: string;
  warehouse?: string;
  schedule_date?: string;
  received_qty?: number;
  billed_amt?: number;
  material_request?: string;
}

interface PurchaseOrderDetail {
  name: string;
  supplier?: string;
  transaction_date?: string;
  schedule_date?: string;
  status?: string;
  company?: string;
  project?: string;
  set_warehouse?: string;
  grand_total?: number;
  rounded_total?: number;
  net_total?: number;
  per_received?: number;
  per_billed?: number;
  docstatus?: number;
  items?: POItem[];
  creation?: string;
  modified?: string;
  owner?: string;
}

interface PaymentTerm {
  name?: string;
  term_type: string;
  percentage: number;
  amount?: number;
  days: number;
  due_date?: string | null;
  status?: string;
  approval_document?: string;
  approval_document_name?: string;
  remarks?: string;
}

interface PaymentTermsData {
  payment_terms: PaymentTerm[];
  note?: string | null;
  approval_status?: string;
  total_pct?: number;
}

interface VendorComparisonSummary {
  name: string;
  linked_material_request?: string;
  recommended_supplier?: string;
  status?: string;
  selected_total_amount?: number;
  creation?: string;
}

interface GrnSummary {
  name: string;
  posting_date?: string;
  status?: string;
  grand_total?: number;
  supplier?: string;
}

const TERM_TYPES = [
  'Full Advance Before Dispatch',
  'Within X Days After Delivery',
  'Post Dated Cheque Within X Days',
  'Percentage Advance Against PO Balance Before Dispatch',
  'Percentage Advance Against PO Balance After Delivery X Days',
  'Custom',
] as const;

const TERM_SHORT_LABELS: Record<string, string> = {
  'Full Advance Before Dispatch': 'Full Advance',
  'Within X Days After Delivery': 'After Delivery',
  'Post Dated Cheque Within X Days': 'PDC',
  'Percentage Advance Against PO Balance Before Dispatch': 'Partial Advance (Pre-Dispatch)',
  'Percentage Advance Against PO Balance After Delivery X Days': 'Partial Advance (Post-Delivery)',
  'Custom': 'Custom',
};

function formatCurrency(value?: number) {
  if (!value) return '₹ 0';
  return `₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    Draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'To Receive and Bill': 'bg-blue-50 text-blue-700 border-blue-200',
    'To Bill': 'bg-purple-50 text-purple-700 border-purple-200',
    'To Receive': 'bg-orange-50 text-orange-700 border-orange-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    Closed: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return map[status || ''] || 'bg-gray-50 text-gray-600 border-gray-200';
}

function approvalBadge(status?: string) {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

/* ── Component ─────────────────────────────────────────────── */

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poName = (params?.id as string | undefined) || '';

  const [po, setPo] = useState<PurchaseOrderDetail | null>(null);
  const [terms, setTerms] = useState<PaymentTermsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Payment terms edit state
  const [editTerms, setEditTerms] = useState<PaymentTerm[]>([]);
  const [editNote, setEditNote] = useState('');
  const [termsEditing, setTermsEditing] = useState(false);
  const [termsSaving, setTermsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTermsRejectModal, setShowTermsRejectModal] = useState(false);
  const [upstreamComparison, setUpstreamComparison] = useState<VendorComparisonSummary | null>(null);
  const [relatedGrns, setRelatedGrns] = useState<GrnSummary[]>([]);
  const [lineageLoading, setLineageLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [poRes, termsRes] = await Promise.all([
        fetch(`/api/purchase-orders/detail?name=${encodeURIComponent(poName)}`).then(r => r.json()),
        fetch(`/api/purchase-orders/payment-terms?purchase_order=${encodeURIComponent(poName)}`).then(r => r.json()),
      ]);
      if (!poRes.success) throw new Error(poRes.message || 'Failed to load PO');
      setPo(poRes.data);
      setTerms(termsRes.data || { payment_terms: [], note: null, approval_status: 'Pending', total_pct: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [poName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
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

  const handleAction = async (action: 'submit' | 'cancel') => {
    setActionBusy(action);
    try {
      const res = await fetch(`/api/purchase-orders/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: poName }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      showSuccess(result.message || `PO ${action}ted`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionBusy('');
    }
  };

  const handleDelete = async () => {
    setActionBusy('delete');
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: poName }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      router.push('/purchase-orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setActionBusy('');
    }
  };

  // ── Payment Terms Editing ───────────────────────────────
  const startEditTerms = () => {
    setEditTerms(terms?.payment_terms?.map(t => ({ ...t })) || []);
    setEditNote(terms?.note || '');
    setTermsEditing(true);
  };

  const addTerm = () => {
    setEditTerms([...editTerms, { term_type: 'Full Advance Before Dispatch', percentage: 100, days: 0, remarks: '' }]);
  };

  const removeTerm = (idx: number) => {
    setEditTerms(editTerms.filter((_, i) => i !== idx));
  };

  const updateTerm = (idx: number, field: keyof PaymentTerm, value: string | number) => {
    setEditTerms(editTerms.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const saveTerms = async () => {
    setTermsSaving(true);
    try {
      const res = await fetch('/api/purchase-orders/payment-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_order: poName,
          payment_terms: editTerms,
          payment_terms_note: editNote,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      setTermsEditing(false);
      showSuccess('Payment terms saved');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save terms');
    } finally {
      setTermsSaving(false);
    }
  };

  const handleTermsApproval = async (action: 'approve' | 'reject', reason?: string | null) => {
    setActionBusy(`terms-${action}`);
    try {
      const res = await fetch(`/api/purchase-orders/payment-terms/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_order: poName, reason: reason || undefined }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      showSuccess(`Payment terms ${action}d`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} terms`);
    } finally {
      setActionBusy('');
    }
  };

  useEffect(() => {
    const loadLineage = async () => {
      if (!po) {
        setUpstreamComparison(null);
        setRelatedGrns([]);
        return;
      }

      const materialRequests = Array.from(
        new Set((po.items || []).map((item) => item.material_request).filter(Boolean) as string[]),
      );

      setLineageLoading(true);
      try {
        const [comparisonGroups, grnsData] = await Promise.all([
          Promise.all(
            materialRequests.map(async (materialRequest) => {
              try {
                const result = await postOps('get_vendor_comparisons', { material_request: materialRequest });
                return Array.isArray(result) ? result as VendorComparisonSummary[] : [];
              } catch {
                return [];
              }
            }),
          ),
          postOps('get_grns', { purchase_order: po.name, limit_page_length: 20 }),
        ]);

        const comparisons = comparisonGroups
          .flat()
          .filter((comparison, index, all) => all.findIndex((row) => row.name === comparison.name) === index);
        const matchedComparison =
          comparisons.find((comparison) => comparison.recommended_supplier === po.supplier) ||
          comparisons[0] ||
          null;

        setUpstreamComparison(matchedComparison);
        setRelatedGrns(Array.isArray(grnsData) ? grnsData as GrnSummary[] : []);
      } catch {
        setUpstreamComparison(null);
        setRelatedGrns([]);
      } finally {
        setLineageLoading(false);
      }
    };

    void loadLineage();
  }, [po, postOps]);

  // ── Computed ─────────────────────────────────────────────
  const isDraft = po?.docstatus === 0;
  const isSubmitted = po?.docstatus === 1;
  const totalEditPct = editTerms.reduce((sum, t) => sum + (t.percentage || 0), 0);
  const sourceIndents = Array.from(
    new Set((po?.items || []).map((item) => item.material_request).filter(Boolean) as string[]),
  );
  const totalReceivedQty = (po?.items || []).reduce((sum, item) => sum + (item.received_qty || 0), 0);
  const totalBilledAmount = (po?.items || []).reduce((sum, item) => sum + (item.billed_amt || 0), 0);
  const grnValue = relatedGrns.reduce((sum, grn) => sum + (grn.grand_total || 0), 0);

  // ── Render ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading purchase order...</span>
      </div>
    );
  }

  if (error && !po) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-rose-600">{error}</p>
        <Link href="/purchase-orders" className="text-sm text-blue-600 hover:underline">← Back to Purchase Orders</Link>
      </div>
    );
  }

  if (!po) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/purchase-orders" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Purchase Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{po.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {po.supplier || 'No supplier'} &middot; {po.transaction_date || '-'} &middot; {formatCurrency(po.grand_total)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${statusBadge(po.status)}`}>
            {po.status || 'Draft'}
          </span>
          {isDraft && (
            <>
              <button onClick={() => handleAction('submit')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                <Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting...' : 'Submit'}
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" />{actionBusy === 'delete' ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
          {isSubmitted && (
            <>
              <button onClick={async () => {
                setActionBusy('submit_po_to_ph');
                try {
                  await postOps('submit_po_to_ph', { name: poName });
                  showSuccess('PO submitted to Project Head for approval');
                  await loadData();
                } catch (err) { setError(err instanceof Error ? err.message : 'Failed to submit to PH'); }
                finally { setActionBusy(''); }
              }} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <Upload className="h-3.5 w-3.5" />{actionBusy === 'submit_po_to_ph' ? 'Sending…' : 'Submit to PH'}
              </button>
              <button onClick={() => handleAction('cancel')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <Ban className="h-3.5 w-3.5" />{actionBusy === 'cancel' ? 'Cancelling...' : 'Cancel PO'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* PO Details + Items side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Details card */}
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Order Details</h3></div>
          <div className="card-body">
            <dl className="space-y-2.5 text-sm">
              {([
                ['Supplier', po.supplier],
                ['Company', po.company],
                ['Project', po.project],
                ['Warehouse', po.set_warehouse],
                ['Order Date', po.transaction_date],
                ['Schedule Date', po.schedule_date],
                ['Grand Total', formatCurrency(po.grand_total)],
                ['% Received', `${(po.per_received || 0).toFixed(0)}%`],
                ['% Billed', `${(po.per_billed || 0).toFixed(0)}%`],
                ['Created', po.creation ? new Date(po.creation).toLocaleDateString('en-IN') : '-'],
              ] as [string, string | undefined][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-900 text-right">{v || '-'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Items table */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Itemized Order Composition</h3>
            <p className="mt-0.5 text-xs text-gray-500">Source-linked itemization showing the exact order lines, originating indents, and fulfilment progress.</p>
          </div>
          <div className="card-body border-b border-gray-100">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs text-gray-500">Line Items</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{po.items?.length || 0}</div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="text-xs text-blue-700">Source Indents</div>
                <div className="mt-1 text-2xl font-semibold text-blue-900">{sourceIndents.length}</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="text-xs text-emerald-700">Received Qty</div>
                <div className="mt-1 text-2xl font-semibold text-emerald-900">{totalReceivedQty}</div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <div className="text-xs text-amber-700">Billed Value</div>
                <div className="mt-1 text-2xl font-semibold text-amber-900">{formatCurrency(totalBilledAmount)}</div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium">Source Indent</th>
                  <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                  <th className="px-4 py-2.5 font-medium text-right">Rate</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-4 py-2.5 font-medium text-right">Received</th>
                  <th className="px-4 py-2.5 font-medium text-right">Billed</th>
                  <th className="px-4 py-2.5 font-medium">UOM</th>
                  <th className="px-4 py-2.5 font-medium">Warehouse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(po.items || []).map((item, idx) => (
                  <tr key={item.name || idx}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{item.item_code || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate">{item.description || '-'}</td>
                    <td className="px-4 py-2.5">
                      {item.material_request ? (
                        <Link href={`/indents/${encodeURIComponent(item.material_request)}`} className="text-xs font-medium text-blue-600 hover:underline">
                          {item.material_request}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">{item.qty ?? '-'}</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">{item.received_qty ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-amber-700">{formatCurrency(item.billed_amt)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.uom || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.warehouse || '-'}</td>
                  </tr>
                ))}
                {(!po.items || po.items.length === 0) && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No items</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="card-header flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">Upstream Comparison</h3>
              <p className="mt-0.5 text-xs text-gray-500">Commercial source that led to this purchase order.</p>
            </div>
            {lineageLoading ? <span className="text-xs text-gray-400">Loading lineage…</span> : null}
          </div>
          <div className="card-body">
            {upstreamComparison ? (
              <Link
                href={`/vendor-comparisons/${encodeURIComponent(upstreamComparison.name)}`}
                className="block rounded-xl border border-gray-200 bg-white px-4 py-4 hover:border-blue-200 hover:bg-blue-50/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-orange-500" />
                      <span className="font-semibold text-gray-900">{upstreamComparison.name}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {upstreamComparison.recommended_supplier || 'No recommended supplier'} • {upstreamComparison.linked_material_request || 'No linked indent'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {upstreamComparison.creation ? `Created ${new Date(upstreamComparison.creation).toLocaleDateString('en-IN')}` : 'Creation date unavailable'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="text-xs text-gray-500">Status</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{upstreamComparison.status || '-'}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <div className="text-xs text-emerald-700">Selected Value</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-900">{formatCurrency(upstreamComparison.selected_total_amount)}</div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                No upstream vendor comparison was resolved for this purchase order yet.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Downstream GRN Card</h3>
            <p className="mt-0.5 text-xs text-gray-500">Goods receipt movement raised against this purchase order.</p>
          </div>
          <div className="card-body">
            {relatedGrns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                No GRNs have been booked against this PO yet.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs text-gray-500">GRN Count</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{relatedGrns.length}</div>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <div className="text-xs text-blue-700">Received Value</div>
                    <div className="mt-1 text-2xl font-semibold text-blue-900">{formatCurrency(grnValue)}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div className="text-xs text-emerald-700">Receipt Progress</div>
                    <div className="mt-1 text-2xl font-semibold text-emerald-900">{Math.round(po.per_received || 0)}%</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {relatedGrns.map((grn) => (
                    <Link
                      key={grn.name}
                      href={`/grns/${encodeURIComponent(grn.name)}`}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-gray-900">{grn.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{grn.posting_date || 'No posting date'} • {grn.status || 'Status pending'}</p>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(grn.grand_total)}</div>
                        <ArrowRight className="h-4 w-4 text-gray-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Payment Terms Section ──────────────────────────── */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Payment Terms</h3>
            {terms?.approval_status && (
              <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold ${approvalBadge(terms.approval_status)}`}>
                {terms.approval_status === 'Approved' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                {terms.approval_status === 'Rejected' && <XCircle className="mr-1 h-3 w-3" />}
                Accounts: {terms.approval_status}
              </span>
            )}
            {terms && terms.total_pct !== undefined && terms.total_pct > 0 && (
              <span className={`text-xs font-medium ${
                Math.abs(terms.total_pct - 100) < 0.01 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {terms.total_pct.toFixed(1)}% of PO value
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!termsEditing && (
              <button onClick={startEditTerms} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                <FileText className="h-3.5 w-3.5" /> Edit Terms
              </button>
            )}
            {!termsEditing && terms && terms.payment_terms.length > 0 && terms.approval_status !== 'Approved' && (
              <>
                <button onClick={() => handleTermsApproval('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  <CheckCircle2 className="h-3.5 w-3.5" />{actionBusy === 'terms-approve' ? 'Approving...' : 'Approve'}
                </button>
                <button onClick={() => setShowTermsRejectModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                  <XCircle className="h-3.5 w-3.5" />{actionBusy === 'terms-reject' ? 'Rejecting...' : 'Reject'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card-body">
          {/* Edit mode */}
          {termsEditing ? (
            <div className="space-y-4">
              {editTerms.map((term, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-gray-500 uppercase tracking-wider">Type</label>
                        <select
                          value={term.term_type}
                          onChange={e => updateTerm(idx, 'term_type', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {TERM_TYPES.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-gray-500 uppercase tracking-wider">% of PO Value</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={term.percentage}
                          onChange={e => updateTerm(idx, 'percentage', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-gray-500 uppercase tracking-wider">Days (X)</label>
                        <input
                          type="number"
                          min={0}
                          value={term.days}
                          onChange={e => updateTerm(idx, 'days', parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-gray-500 uppercase tracking-wider">Document Ref</label>
                        <input
                          type="text"
                          value={term.approval_document_name || ''}
                          onChange={e => updateTerm(idx, 'approval_document_name', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. INV-2026-001"
                        />
                      </div>
                    </div>
                    <button onClick={() => removeTerm(idx)} className="mt-5 rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={term.remarks || ''}
                      onChange={e => updateTerm(idx, 'remarks', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Remarks (optional)"
                    />
                  </div>
                </div>
              ))}

              <button onClick={addTerm} className="inline-flex items-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
                <Plus className="h-4 w-4" /> Add Payment Term
              </button>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-500 uppercase tracking-wider">Notes</label>
                <textarea
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={2}
                  placeholder="General notes on payment terms..."
                />
              </div>

              {/* Validation */}
              {totalEditPct > 0 && Math.abs(totalEditPct - 100) > 0.01 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
                  Total is {totalEditPct.toFixed(1)}% — should be exactly 100% of PO value.
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
                <button onClick={saveTerms} disabled={termsSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" />{termsSaving ? 'Saving...' : 'Save Payment Terms'}
                </button>
                <button onClick={() => setTermsEditing(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Read mode */
            terms && terms.payment_terms.length > 0 ? (
              <div className="space-y-3">
                {terms.payment_terms.map((term, idx) => (
                  <div key={term.name || idx} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {TERM_SHORT_LABELS[term.term_type] || term.term_type}
                        </span>
                        {term.days > 0 && (
                          <span className="text-xs text-gray-500">({term.days} days)</span>
                        )}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          term.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                          term.status === 'Overdue' ? 'bg-rose-50 text-rose-700' :
                          term.status === 'Approved' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {term.status || 'Pending'}
                        </span>
                      </div>
                      {term.remarks && <p className="mt-0.5 text-xs text-gray-500">{term.remarks}</p>}
                      {term.approval_document_name && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-blue-600">
                          <Upload className="h-3 w-3" /> Doc: {term.approval_document_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{term.percentage}%</div>
                      <div className="text-xs text-gray-500">{formatCurrency(term.amount)}</div>
                    </div>
                  </div>
                ))}
                {terms.note && (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-600">
                    <strong>Notes:</strong> {terms.note}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-400">No payment terms defined for this PO.</p>
                <button onClick={startEditTerms} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  <Plus className="h-3.5 w-3.5" /> Add Payment Terms
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Linked Documents */}
      <TraceabilityPanel projectId={po.project} />

      <RecordDocumentsPanel
        referenceDoctype="Purchase Order"
        referenceName={poName}
        title="Linked Documents"
        initialLimit={5}
      />

      {/* Accountability Trail */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
        <div className="card-body">
          <AccountabilityTimeline
            subjectDoctype="Purchase Order"
            subjectName={poName}
            compact={false}
            initialLimit={10}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ActionModal
        open={showDeleteConfirm}
        title={`Delete ${poName}`}
        description="This will permanently delete this Purchase Order. This cannot be undone."
        variant="danger"
        confirmLabel="Delete"
        busy={actionBusy === 'delete'}
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          await handleDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Payment Terms Reject Modal */}
      <ActionModal
        open={showTermsRejectModal}
        title="Reject Payment Terms"
        description="Provide a reason for rejecting the payment terms."
        variant="danger"
        confirmLabel="Reject"
        fields={[{ name: 'reason', label: 'Rejection Reason', type: 'textarea' as const, required: true, placeholder: 'Reason for rejection…' }]}
        busy={actionBusy === 'terms-reject'}
        onConfirm={async (values) => {
          setShowTermsRejectModal(false);
          await handleTermsApproval('reject', values.reason?.trim() || null);
        }}
        onCancel={() => setShowTermsRejectModal(false)}
      />

      {/* Next Step */}
      <div className="card border-blue-200 bg-blue-50/50">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-700">Next Step in Workflow</p>
            <p className="text-sm text-gray-600 mt-0.5">PO → <strong>Dispatch Challan</strong> → GRN → Inventory</p>
          </div>
          <Link href="/dispatch-challans" className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Go to Dispatch Challans →</Link>
        </div>
      </div>
    </div>
  );
}
