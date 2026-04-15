'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, Ban, Trash2, Upload, Plus, Save, AlertCircle } from 'lucide-react';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { formatCurrency, formatDate, statusVariant } from '@/components/procurement/proc-helpers';

/* ── types ──────────────────────────────────────────── */

interface POItem { name?: string; item_code?: string; qty?: number; rate?: number; amount?: number; description?: string; uom?: string; warehouse?: string; schedule_date?: string; received_qty?: number; billed_amt?: number; material_request?: string; }
interface PODetail { name: string; supplier?: string; transaction_date?: string; schedule_date?: string; status?: string; company?: string; project?: string; set_warehouse?: string; grand_total?: number; net_total?: number; per_received?: number; per_billed?: number; docstatus?: number; items?: POItem[]; creation?: string; }
interface PaymentTerm { term_type: string; percentage: number; amount?: number; days: number; due_date?: string | null; status?: string; remarks?: string; }
interface TermsData { payment_terms: PaymentTerm[]; note?: string | null; approval_status?: string; total_pct?: number; }
interface VCSummary { name: string; recommended_supplier?: string; status?: string; selected_total_amount?: number; }
interface GrnSummary { name: string; posting_date?: string; status?: string; grand_total?: number; }

const TERM_TYPES = ['Full Advance Before Dispatch', 'Within X Days After Delivery', 'Post Dated Cheque Within X Days', 'Percentage Advance Against PO Balance Before Dispatch', 'Percentage Advance Against PO Balance After Delivery X Days', 'Custom'] as const;

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poName = (params?.id as string) || '';

  const [po, setPo] = useState<PODetail | null>(null);
  const [terms, setTerms] = useState<TermsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [success, setSuccess] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [showRejectTerms, setShowRejectTerms] = useState(false);

  // Payment terms edit
  const [editTerms, setEditTerms] = useState<PaymentTerm[]>([]);
  const [editNote, setEditNote] = useState('');
  const [termsEditing, setTermsEditing] = useState(false);
  const [termsSaving, setTermsSaving] = useState(false);

  // Lineage
  const [upstreamVC, setUpstreamVC] = useState<VCSummary | null>(null);
  const [relatedGrns, setRelatedGrns] = useState<GrnSummary[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [poRes, termsRes] = await Promise.all([
        fetch(`/api/purchase-orders/detail?name=${encodeURIComponent(poName)}`).then(r => r.json()),
        fetch(`/api/purchase-orders/payment-terms?purchase_order=${encodeURIComponent(poName)}`).then(r => r.json()),
      ]);
      if (!poRes.success) throw new Error(poRes.message);
      setPo(poRes.data);
      setTerms(termsRes.data || { payment_terms: [], note: null, approval_status: 'Pending', total_pct: 0 });
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [poName]);

  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setSuccess(m); setTimeout(() => setSuccess(''), 3000); };

  const handleAction = async (action: 'submit' | 'cancel') => {
    setBusy(action); setError('');
    try {
      const res = await fetch(`/api/purchase-orders/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: poName }) });
      const r = await res.json(); if (!r.success) throw new Error(r.message);
      flash(`PO ${action}ted`); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(''); }
  };

  const handleDelete = async () => {
    setBusy('delete');
    try {
      const res = await fetch('/api/purchase-orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: poName }) });
      const r = await res.json(); if (!r.success) throw new Error(r.message);
      router.push('/purchase-orders');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setBusy(''); }
  };

  // Payment terms
  const startEditTerms = () => { setEditTerms(terms?.payment_terms?.map(t => ({ ...t })) || []); setEditNote(terms?.note || ''); setTermsEditing(true); };
  const saveTerms = async () => {
    setTermsSaving(true);
    try {
      const res = await fetch('/api/purchase-orders/payment-terms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purchase_order: poName, payment_terms: editTerms, payment_terms_note: editNote }) });
      const r = await res.json(); if (!r.success) throw new Error(r.message);
      setTermsEditing(false); flash('Terms saved'); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setTermsSaving(false); }
  };
  const handleTermsApproval = async (action: 'approve' | 'reject', reason?: string) => {
    setBusy(`terms-${action}`);
    try {
      const res = await fetch(`/api/purchase-orders/payment-terms/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purchase_order: poName, reason: reason || undefined }) });
      const r = await res.json(); if (!r.success) throw new Error(r.message);
      flash(`Terms ${action}d`); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(''); }
  };

  // Lineage
  useEffect(() => {
    if (!po) return;
    const mrs = [...new Set((po.items || []).map(i => i.material_request).filter(Boolean) as string[])];
    (async () => {
      try {
        const [vcGroups, grns] = await Promise.all([
          Promise.all(mrs.map(async mr => { try { const r = await fetch(`/api/vendor-comparisons?material_request=${encodeURIComponent(mr)}`); const j = await r.json(); return Array.isArray(j.data) ? j.data : []; } catch { return []; } })),
          fetch(`/api/grns?purchase_order=${encodeURIComponent(po.name)}&limit_page_length=20`).then(r => r.json()).then(j => j.data || []),
        ]);
        const all = vcGroups.flat().filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);
        setUpstreamVC(all.find(v => v.recommended_supplier === po.supplier) || all[0] || null);
        setRelatedGrns(Array.isArray(grns) ? grns : []);
      } catch { setUpstreamVC(null); setRelatedGrns([]); }
    })();
  }, [po]);

  const isDraft = po?.docstatus === 0;
  const isSubmitted = po?.docstatus === 1;
  const sourceIndents = [...new Set((po?.items || []).map(i => i.material_request).filter(Boolean) as string[])];
  const totalEditPct = editTerms.reduce((s, t) => s + (t.percentage || 0), 0);

  const actions = (
    <div className="flex flex-wrap gap-2">
      {isDraft && (
        <>
          <button onClick={() => handleAction('submit')} disabled={!!busy} className="btn btn-primary !text-xs"><Send className="h-3.5 w-3.5" />{busy === 'submit' ? 'Submitting…' : 'Submit'}</button>
          <button onClick={() => setShowDelete(true)} disabled={!!busy} className="btn btn-secondary !text-xs text-rose-700"><Trash2 className="h-3.5 w-3.5" />Delete</button>
        </>
      )}
      {isSubmitted && (
        <>
          <button onClick={async () => { setBusy('ph'); try { const res = await fetch('/api/purchase-orders/submit-to-ph', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: poName }) }); const j = await res.json(); if (!j.success) throw new Error(j.message); flash('Sent to PH'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(''); } }} disabled={!!busy} className="btn btn-primary !text-xs"><Upload className="h-3.5 w-3.5" />{busy === 'ph' ? 'Sending…' : 'Submit to PH'}</button>
          <button onClick={() => handleAction('cancel')} disabled={!!busy} className="btn btn-secondary !text-xs text-rose-700"><Ban className="h-3.5 w-3.5" />Cancel</button>
        </>
      )}
    </div>
  );

  return (
    <DetailPage
      title={po?.name || poName}
      kicker="Purchase Order"
      backHref="/purchase-orders"
      backLabel="Back to Purchase Orders"
      loading={loading} error={error} onRetry={load}
      status={po?.status} statusVariant={statusVariant(po?.status)}
      headerActions={actions}
      identityBlock={po ? (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          {[['Supplier', po.supplier], ['Company', po.company], ['Project', po.project], ['Warehouse', po.set_warehouse], ['Order Date', po.transaction_date], ['Grand Total', formatCurrency(po.grand_total)], ['% Received', `${(po.per_received || 0).toFixed(0)}%`], ['% Billed', `${(po.per_billed || 0).toFixed(0)}%`], ['Created', formatDate(po.creation)]].map(([l, v]) => (
            <div key={String(l)}><dt className="text-gray-500">{String(l)}</dt><dd className="font-medium text-gray-900">{String(v || '-')}</dd></div>
          ))}
        </dl>
      ) : undefined}
      sidePanels={po ? (
        <>
          {/* Supply chain links */}
          <div className="shell-panel p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Supply Chain</h3>
            {sourceIndents.map(mr => <Link key={mr} href={`/indents/${encodeURIComponent(mr)}`} className="block text-sm text-blue-600 hover:underline">Indent: {mr}</Link>)}
            {upstreamVC && <Link href={`/vendor-comparisons/${encodeURIComponent(upstreamVC.name)}`} className="block text-sm text-blue-600 hover:underline">VC: {upstreamVC.name}</Link>}
            {relatedGrns.map(g => <Link key={g.name} href={`/grns/${encodeURIComponent(g.name)}`} className="block text-sm text-blue-600 hover:underline">GRN: {g.name} ({formatCurrency(g.grand_total)})</Link>)}
          </div>
          <RecordDocumentsPanel referenceDoctype="Purchase Order" referenceName={poName} />
          <TraceabilityPanel projectId={po.project} />
          <div className="shell-panel p-4"><h3 className="text-sm font-semibold text-gray-900 mb-3">Accountability</h3><AccountabilityTimeline subjectDoctype="Purchase Order" subjectName={poName} compact initialLimit={6} /></div>
        </>
      ) : undefined}
    >
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 mb-4">{success}</div>}

      {/* Items */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Order Items</h3>
          <div className="flex gap-2 text-xs">
            <span className="stat-card !p-2">{po?.items?.length || 0} items</span>
            <span className="stat-card !p-2">{sourceIndents.length} indents</span>
          </div>
        </div>
        <table className="data-table text-sm">
          <thead><tr><th>Item</th><th>Description</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th><th>UOM</th><th>Warehouse</th><th>Schedule</th><th className="text-right">Recv</th><th>Indent</th></tr></thead>
          <tbody>
            {(po?.items || []).length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">No items</td></tr> : (po?.items || []).map((i, idx) => (
              <tr key={i.name || idx}>
                <td className="font-medium">{i.item_code || '-'}</td>
                <td className="text-gray-600 max-w-[180px] truncate">{i.description || '-'}</td>
                <td className="text-right">{i.qty ?? '-'}</td>
                <td className="text-right">{formatCurrency(i.rate)}</td>
                <td className="text-right font-medium">{formatCurrency(i.amount)}</td>
                <td className="text-gray-500">{i.uom || '-'}</td>
                <td className="text-gray-500">{i.warehouse || '-'}</td>
                <td className="text-gray-500">{i.schedule_date || '-'}</td>
                <td className="text-right">{i.received_qty ?? 0}</td>
                <td className="text-gray-500">{i.material_request ? <Link href={`/indents/${encodeURIComponent(i.material_request)}`} className="text-blue-600 hover:underline text-xs">{i.material_request}</Link> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment terms */}
      <div className="shell-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Payment Terms</h3>
          <div className="flex gap-2">
            {terms?.approval_status && <span className={`badge ${terms.approval_status === 'Approved' ? 'badge-green' : terms.approval_status === 'Rejected' ? 'badge-red' : 'badge-yellow'}`}>{terms.approval_status}</span>}
            {!termsEditing && <button onClick={startEditTerms} className="btn btn-secondary !text-xs">Edit Terms</button>}
          </div>
        </div>

        {termsEditing ? (
          <div className="space-y-3">
            {editTerms.map((t, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 items-end text-sm">
                <select className="input" value={t.term_type} onChange={e => setEditTerms(editTerms.map((x, i) => i === idx ? { ...x, term_type: e.target.value } : x))}>
                  {TERM_TYPES.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                </select>
                <input type="number" className="input" placeholder="%" value={t.percentage} onChange={e => setEditTerms(editTerms.map((x, i) => i === idx ? { ...x, percentage: Number(e.target.value) } : x))} />
                <input type="number" className="input" placeholder="Days" value={t.days} onChange={e => setEditTerms(editTerms.map((x, i) => i === idx ? { ...x, days: Number(e.target.value) } : x))} />
                <button onClick={() => setEditTerms(editTerms.filter((_, i) => i !== idx))} className="btn btn-secondary !text-xs text-rose-600"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
            <button onClick={() => setEditTerms([...editTerms, { term_type: 'Full Advance Before Dispatch', percentage: 100, days: 0 }])} className="btn btn-secondary !text-xs"><Plus className="h-3 w-3" /> Add Term</button>
            {totalEditPct !== 100 && <div className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="h-3 w-3" /> Total: {totalEditPct}% (should be 100%)</div>}
            <textarea className="input w-full" rows={2} placeholder="Note…" value={editNote} onChange={e => setEditNote(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={saveTerms} disabled={termsSaving} className="btn btn-primary !text-xs"><Save className="h-3.5 w-3.5" />{termsSaving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => setTermsEditing(false)} className="btn btn-secondary !text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            {(terms?.payment_terms || []).length === 0 ? <p className="text-sm text-gray-400">No payment terms defined.</p> : (
              <table className="data-table text-sm">
                <thead><tr><th>Type</th><th className="text-right">%</th><th className="text-right">Days</th><th>Status</th><th>Remarks</th></tr></thead>
                <tbody>
                  {(terms?.payment_terms || []).map((t, i) => (
                    <tr key={i}><td>{t.term_type}</td><td className="text-right">{t.percentage}%</td><td className="text-right">{t.days}</td><td className="text-gray-500">{t.status || '-'}</td><td className="text-gray-500">{t.remarks || '-'}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {terms?.note && <p className="mt-2 text-sm text-gray-600"><strong>Note:</strong> {terms.note}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleTermsApproval('approve')} disabled={!!busy} className="btn btn-primary !text-xs">Approve Terms</button>
              <button onClick={() => setShowRejectTerms(true)} disabled={!!busy} className="btn btn-secondary !text-xs text-rose-700">Reject Terms</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ActionModal open={showDelete} title={`Delete ${poName}`} description="Permanently delete this PO?" variant="danger" confirmLabel="Delete" busy={!!busy} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
      <ActionModal open={showRejectTerms} title="Reject Payment Terms" description="Reason for rejection." variant="danger" confirmLabel="Reject"
        fields={[{ name: 'reason', label: 'Reason', type: 'textarea' as const, required: true }]}
        busy={!!busy}
        onConfirm={async v => { await handleTermsApproval('reject', v.reason); setShowRejectTerms(false); }}
        onCancel={() => setShowRejectTerms(false)} />
    </DetailPage>
  );
}