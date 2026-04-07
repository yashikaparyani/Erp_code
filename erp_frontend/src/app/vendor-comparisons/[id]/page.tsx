'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Send, CheckCircle2, XCircle, RotateCcw, ShoppingCart, ArrowRight, Package } from 'lucide-react';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { callOps, formatCurrency, formatDate, statusVariant } from '@/components/procurement/proc-helpers';
import { useAuth } from '@/context/AuthContext';

/* ── types ─────────────────────────────────────────── */

interface Quote { name?: string; supplier?: string; item_link?: string; description?: string; qty?: number; rate?: number; amount?: number; is_selected?: 0 | 1; uom?: string; unit?: string; delivery_days?: number; lead_time_days?: number; warranty_months?: number; remarks?: string; }
interface VCDetail {
  name: string; linked_material_request?: string; linked_rfq?: string; linked_project?: string;
  linked_tender?: string; linked_boq?: string; status?: string; recommended_supplier?: string;
  prepared_by_user?: string; approved_by?: string; approved_at?: string;
  exception_approved_by?: string; exception_reason?: string; quote_count?: number;
  distinct_supplier_count?: number; lowest_total_amount?: number; selected_total_amount?: number;
  notes?: string; creation?: string; owner?: string; quotes?: Quote[];
}
interface PORecord { name: string; supplier?: string; status?: string; transaction_date?: string; grand_total?: number; per_received?: number; items?: { material_request?: string }[]; }

export default function VendorComparisonDetailPage() {
  const params = useParams();
  const vcName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [vc, setVc] = useState<VCDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [success, setSuccess] = useState('');
  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [downstreamPOs, setDownstreamPOs] = useState<PORecord[]>([]);
  const [poLoading, setPoLoading] = useState(false);

  const hasRole = (...roles: string[]) => roles.some(r => new Set(currentUser?.roles || []).has(r));
  const canApprove = hasRole('Director', 'System Manager', 'Project Head', 'Department Head');
  const canSubmit = hasRole('Director', 'System Manager', 'Procurement Manager', 'Purchase');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setVc(await callOps<VCDetail>('get_vendor_comparison', { name: vcName })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }, [vcName]);

  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setSuccess(m); setTimeout(() => setSuccess(''), 3000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setBusy(action); setError('');
    try {
      const res = await fetch(`/api/vendor-comparisons/${encodeURIComponent(vcName)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
      const p = await res.json(); if (!p.success) throw new Error(p.message || 'Failed');
      flash(p.message || 'Done'); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(''); }
  };

  // Downstream POs
  useEffect(() => {
    if (!vc?.linked_material_request) { setDownstreamPOs([]); return; }
    (async () => {
      setPoLoading(true);
      try {
        const poList = await callOps<{ name?: string }[]>('get_purchase_orders', { project: vc.linked_project || '', limit_page_length: 100 });
        const details = await Promise.all((poList || []).map(async row => { try { return await callOps<PORecord>('get_purchase_order', { name: row.name }); } catch { return null; } }));
        const selectedSuppliers = new Set((vc.quotes || []).filter(q => q.is_selected && q.supplier).map(q => q.supplier!));
        setDownstreamPOs(details.filter((d): d is PORecord => !!d?.name).filter(d => (d.items || []).some(i => i.material_request === vc.linked_material_request) && (selectedSuppliers.size === 0 || selectedSuppliers.has(d.supplier || ''))).sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || '')));
      } catch { setDownstreamPOs([]); }
      finally { setPoLoading(false); }
    })();
  }, [vc]);

  const quotes = useMemo(() => vc?.quotes ?? [], [vc?.quotes]);
  const isDraft = vc?.status === 'DRAFT';
  const isPending = vc?.status === 'PENDING_APPROVAL';
  const isApproved = vc?.status === 'APPROVED';
  const isRejected = vc?.status === 'REJECTED';

  const lineItemBreakdown = useMemo(() => {
    const groups = new Map<string, { itemCode: string; description: string; totalQty: number; unit: string; selectedSupplier?: string; selectedAmount?: number; quotes: Quote[] }>();
    for (const q of quotes) {
      const key = q.item_link || q.description || q.name || `line-${groups.size}`;
      const g = groups.get(key);
      if (g) { g.totalQty += q.qty || 0; g.quotes.push(q); if (q.is_selected) { g.selectedSupplier = q.supplier; g.selectedAmount = q.amount; } continue; }
      groups.set(key, { itemCode: q.item_link || '-', description: q.description || q.item_link || '-', totalQty: q.qty || 0, unit: q.uom || q.unit || '-', selectedSupplier: q.is_selected ? q.supplier : undefined, selectedAmount: q.is_selected ? q.amount : undefined, quotes: [q] });
    }
    return Array.from(groups.values());
  }, [quotes]);

  const poChainValue = downstreamPOs.reduce((s, p) => s + (p.grand_total || 0), 0);

  const actions = vc ? (
    <div className="flex flex-wrap gap-2">
      {isDraft && canSubmit && <button onClick={() => runAction('submit')} disabled={!!busy} className="btn btn-primary !text-xs"><Send className="h-3.5 w-3.5" />{busy === 'submit' ? 'Submitting…' : 'Submit'}</button>}
      {isPending && canApprove && (<><button onClick={() => setApproveModal(true)} disabled={!!busy} className="btn btn-primary !text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button><button onClick={() => setRejectModal(true)} disabled={!!busy} className="btn btn-secondary !text-xs text-rose-700"><XCircle className="h-3.5 w-3.5" />Reject</button></>)}
      {(isApproved || isRejected) && canSubmit && <button onClick={() => runAction('revise')} disabled={!!busy} className="btn btn-secondary !text-xs"><RotateCcw className="h-3.5 w-3.5" />Revise</button>}
      {isApproved && canSubmit && <button onClick={() => runAction('create_po')} disabled={!!busy} className="btn btn-primary !text-xs"><ShoppingCart className="h-3.5 w-3.5" />Create PO</button>}
    </div>
  ) : undefined;

  return (
    <DetailPage
      title={vc?.name || vcName}
      kicker="Vendor Comparison"
      backHref="/procurement"
      backLabel="Back to Procurement"
      loading={loading} error={error} onRetry={load}
      status={vc?.status?.replace(/_/g, ' ')} statusVariant={statusVariant(vc?.status)}
      headerActions={actions}
      identityBlock={vc ? (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          {[['Material Request', vc.linked_material_request], ['RFQ', vc.linked_rfq], ['Project', vc.linked_project], ['Tender', vc.linked_tender], ['BOQ', vc.linked_boq], ['Prepared By', vc.prepared_by_user || vc.owner], ['Recommended', vc.recommended_supplier], ['Created', formatDate(vc.creation)]].map(([l, v]) => (
            <div key={String(l)}><dt className="text-gray-500">{String(l)}</dt><dd className="font-medium text-gray-900">{String(v || '-')}</dd></div>
          ))}
        </dl>
      ) : undefined}
      sidePanels={vc ? (
        <>
          <div className="shell-panel p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Linked Records</h3>
            {vc.linked_project && <Link href={`/projects/${encodeURIComponent(vc.linked_project)}`} className="block text-sm text-blue-600 hover:underline">Project: {vc.linked_project}</Link>}
            {vc.linked_tender && <Link href={`/pre-sales?search=${encodeURIComponent(vc.linked_tender)}`} className="block text-sm text-amber-600 hover:underline">Tender: {vc.linked_tender}</Link>}
            {vc.linked_material_request && <Link href={`/indents/${encodeURIComponent(vc.linked_material_request)}`} className="block text-sm text-indigo-600 hover:underline">Indent: {vc.linked_material_request}</Link>}
          </div>
          <TraceabilityPanel projectId={vc.linked_project} />
          <RecordDocumentsPanel referenceDoctype="GE Vendor Comparison" referenceName={vcName} title="Documents" />
          <div className="shell-panel p-4"><h3 className="text-sm font-semibold text-gray-900 mb-3">Accountability</h3><AccountabilityTimeline subjectDoctype="GE Vendor Comparison" subjectName={vcName} compact initialLimit={6} /></div>
        </>
      ) : undefined}
    >
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 mb-4">{success}</div>}

      {/* Summary stats */}
      {vc && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"><div className="text-2xl font-bold">{vc.distinct_supplier_count ?? 0}</div><div className="text-xs text-gray-500">Suppliers</div></div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"><div className="text-2xl font-bold">{vc.quote_count ?? 0}</div><div className="text-xs text-gray-500">Quotes</div></div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center"><div className="text-2xl font-bold text-blue-900">{formatCurrency(vc.lowest_total_amount)}</div><div className="text-xs text-blue-600">Lowest</div></div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center"><div className="text-2xl font-bold text-emerald-900">{formatCurrency(vc.selected_total_amount)}</div><div className="text-xs text-emerald-600">Selected</div></div>
        </div>
      )}

      {/* Approval info */}
      {(vc?.approved_by || vc?.exception_reason) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 mb-4">
          {vc?.approved_by && <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-gray-600">Approved by <strong>{vc.approved_by}</strong></span>{vc.approved_at && <span className="text-xs text-gray-400">on {formatDate(vc.approved_at)}</span>}</div>}
          {vc?.exception_reason && <div className="text-sm text-gray-600"><strong>Exception:</strong> {vc.exception_reason}{vc.exception_approved_by && <span className="text-gray-400"> — by {vc.exception_approved_by}</span>}</div>}
        </div>
      )}
      {vc?.notes && <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 mb-4"><strong>Notes:</strong> {vc.notes}</div>}

      {/* Line item breakdown */}
      <div className="shell-panel p-5 mb-4">
        <h3 className="font-semibold text-gray-900">Quote Line Item Breakdown</h3>
        <p className="text-xs text-gray-500 mt-0.5 mb-4">Item-level commercial comparison — chosen supplier vs alternates.</p>
        {lineItemBreakdown.length === 0 ? <p className="text-sm text-gray-400">No quote lines.</p> : lineItemBreakdown.map((g, gi) => (
          <div key={`${g.itemCode}-${gi}`} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 mb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="flex items-center gap-2"><Package className="h-4 w-4 text-blue-500" /><h4 className="text-sm font-semibold text-gray-900">{g.itemCode}</h4></div><p className="mt-1 text-sm text-gray-600">{g.description}</p></div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-[260px]">
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2"><div className="text-gray-500">Required Qty</div><div className="mt-0.5 font-semibold">{g.totalQty} {g.unit}</div></div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"><div className="text-emerald-700">Chosen</div><div className="mt-0.5 font-semibold text-emerald-900">{g.selectedSupplier || 'Pending'}</div></div>
              </div>
            </div>
            <table className="mt-3 min-w-full text-left text-sm">
              <thead className="text-gray-500"><tr><th className="px-3 py-2 font-medium">Supplier</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-right font-medium">Rate</th><th className="px-3 py-2 text-right font-medium">Amount</th><th className="px-3 py-2 text-right font-medium">Lead</th><th className="px-3 py-2 text-right font-medium">Warranty</th><th className="px-3 py-2 font-medium">Selection</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {g.quotes.map((q, qi) => (
                  <tr key={q.name || qi} className={q.is_selected ? 'bg-emerald-50/60' : 'bg-white'}>
                    <td className="px-3 py-2 font-medium">{q.supplier || '-'}</td>
                    <td className="px-3 py-2 text-right">{q.qty ?? '-'}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(q.rate)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(q.amount)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{q.lead_time_days ?? q.delivery_days ?? '-'}{(q.lead_time_days || q.delivery_days) ? ' d' : ''}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{q.warranty_months ?? '-'}{q.warranty_months ? ' mo' : ''}</td>
                    <td className="px-3 py-2">{q.is_selected ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Selected</span> : <span className="text-xs text-gray-400">Alternate</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {g.selectedAmount ? <div className="mt-2 text-right text-xs font-medium text-emerald-700">Chosen value: {formatCurrency(g.selectedAmount)}</div> : null}
          </div>
        ))}
      </div>

      {/* Quotation lines flat table */}
      <div className="shell-panel overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">All Quotation Lines</h3><p className="text-xs text-gray-500">{quotes.filter(q => q.is_selected).length} selected, {quotes.filter(q => !q.is_selected).length} other</p></div>
        <table className="data-table text-sm">
          <thead><tr><th>Supplier</th><th>Description</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th><th>UOM</th><th className="text-center">Selected</th><th>Remarks</th></tr></thead>
          <tbody>
            {quotes.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No lines</td></tr> : quotes.map((q, i) => (
              <tr key={q.name || i} className={q.is_selected ? 'bg-emerald-50/40' : ''}>
                <td className="font-medium">{q.supplier || '-'}</td>
                <td className="text-gray-600 max-w-[200px] truncate">{q.description || '-'}</td>
                <td className="text-right">{q.qty ?? '-'}</td>
                <td className="text-right">{formatCurrency(q.rate)}</td>
                <td className="text-right font-medium">{formatCurrency(q.amount)}</td>
                <td className="text-gray-500">{q.uom || '-'}</td>
                <td className="text-center">{q.is_selected ? <CheckCircle2 className="inline h-4 w-4 text-emerald-500" /> : <span className="text-gray-300">—</span>}</td>
                <td className="text-gray-500 text-xs max-w-[150px] truncate">{q.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Downstream PO chain */}
      <div className="shell-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <div><h3 className="font-semibold text-gray-900">Downstream PO Chain</h3><p className="text-xs text-gray-500">Purchase orders from this comparison selected vendor lines.</p></div>
          {poLoading && <span className="text-xs text-gray-400">Loading…</span>}
        </div>
        {downstreamPOs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">No downstream POs found yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"><div className="text-xs text-gray-500">PO Count</div><div className="mt-1 text-2xl font-semibold">{downstreamPOs.length}</div></div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><div className="text-xs text-blue-700">PO Value</div><div className="mt-1 text-2xl font-semibold text-blue-900">{formatCurrency(poChainValue)}</div></div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3"><div className="text-xs text-emerald-700">Avg Receipt</div><div className="mt-1 text-2xl font-semibold text-emerald-900">{Math.round(downstreamPOs.reduce((s, p) => s + (p.per_received || 0), 0) / downstreamPOs.length)}%</div></div>
            </div>
            <div className="space-y-3">
              {downstreamPOs.map(po => (
                <Link key={po.name} href={`/purchase-orders/${encodeURIComponent(po.name)}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50/50">
                  <div><div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-orange-500" /><span className="font-medium">{po.name}</span>{po.status && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{po.status}</span>}</div><p className="mt-1 text-xs text-gray-500">{po.supplier || '?'} • {po.transaction_date || '-'}</p></div>
                  <div className="flex items-center gap-3 text-right"><div><div className="text-sm font-semibold">{formatCurrency(po.grand_total)}</div><div className="text-xs text-gray-500">Recv {Math.round(po.per_received || 0)}%</div></div><ArrowRight className="h-4 w-4 text-gray-300" /></div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <ActionModal open={approveModal} title="Approve Vendor Comparison" description={`Approve ${vc?.name} — recommended: ${vc?.recommended_supplier || 'none'}. Selected: ${formatCurrency(vc?.selected_total_amount)}.`} variant="success" confirmLabel="Approve" busy={busy === 'approve'} fields={[{ name: 'exception_reason', label: 'Exception Reason / Remarks', type: 'textarea' as const }]} onConfirm={async v => { await runAction('approve', { exception_reason: v.exception_reason || '' }); setApproveModal(false); }} onCancel={() => setApproveModal(false)} />
      <ActionModal open={rejectModal} title="Reject Vendor Comparison" description={`Reject ${vc?.name}. Reason required.`} variant="danger" confirmLabel="Reject" busy={busy === 'reject'} fields={[{ name: 'reason', label: 'Reason', type: 'textarea' as const, required: true }]} onConfirm={async v => { await runAction('reject', { reason: v.reason || '' }); setRejectModal(false); }} onCancel={() => setRejectModal(false)} />
    </DetailPage>
  );
}