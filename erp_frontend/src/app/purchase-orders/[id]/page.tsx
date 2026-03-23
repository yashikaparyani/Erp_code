'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
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
} from 'lucide-react';

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
  const poName = params.id as string;

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
    if (!confirm('Delete this Purchase Order? This cannot be undone.')) return;
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

  const handleTermsApproval = async (action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt('Rejection reason:') : null;
    if (action === 'reject' && reason === null) return;

    setActionBusy(`terms-${action}`);
    try {
      const res = await fetch(`/api/purchase-orders/payment-terms/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_order: poName, reason }),
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

  // ── Computed ─────────────────────────────────────────────
  const isDraft = po?.docstatus === 0;
  const isSubmitted = po?.docstatus === 1;
  const totalEditPct = editTerms.reduce((sum, t) => sum + (t.percentage || 0), 0);

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
              <button onClick={handleDelete} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" />{actionBusy === 'delete' ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
          {isSubmitted && (
            <button onClick={() => handleAction('cancel')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
              <Ban className="h-3.5 w-3.5" />{actionBusy === 'cancel' ? 'Cancelling...' : 'Cancel PO'}
            </button>
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
          <div className="card-header"><h3 className="font-semibold text-gray-900">Line Items</h3></div>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(po.items || []).map((item, idx) => (
                  <tr key={item.name || idx}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{item.item_code || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate">{item.description || '-'}</td>
                    <td className="px-4 py-2.5 text-right">{item.qty ?? '-'}</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.uom || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.warehouse || '-'}</td>
                  </tr>
                ))}
                {(!po.items || po.items.length === 0) && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No items</td></tr>
                )}
              </tbody>
            </table>
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
                <button onClick={() => handleTermsApproval('reject')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
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
    </div>
  );
}
