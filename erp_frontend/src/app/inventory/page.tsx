'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Filter, X, Eye, Plus, Trash2 } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import LinkPicker from '@/components/ui/LinkPicker';
import ActionModal from '@/components/ui/ActionModal';
import { badge, DC_BADGES } from '@/components/procurement/proc-helpers';
import { useAuth } from '@/context/AuthContext';

interface DC { name: string; dispatch_date?: string; dispatch_type?: string; status?: string; from_warehouse?: string; to_warehouse?: string; target_site_name?: string; linked_project?: string; total_items?: number; total_qty?: number; challan_reference?: string; issued_to_name?: string; linked_receipt?: string; receipt_status?: string; receipt_date?: string; fulfilment_status?: string; }
interface DCStats { total?: number; draft?: number; pending_approval?: number; dispatched?: number; total_qty?: number; }
interface StockBin { warehouse?: string; item_code?: string; actual_qty?: number; reserved_qty?: number; ordered_qty?: number; projected_qty?: number; }
interface DCItem { item_link: string; description: string; qty: number; make?: string; model_no?: string; serial_numbers?: string; uom?: string; remarks?: string; }

function formatNumber(value?: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value ?? 0);
}

function getStockHealth(actualQty?: number): { label: string; badgeClass: 'badge-error' | 'badge-warning' | 'badge-success'; note: string } {
  if ((actualQty ?? 0) < 0) {
    return {
      label: 'Control Breach',
      badgeClass: 'badge-error',
      note: 'Negative stock is not allowed. Reconcile the missing receipt or posting before further movement.',
    };
  }

  if ((actualQty ?? 0) === 0) {
    return {
      label: 'Zero Stock',
      badgeClass: 'badge-warning',
      note: 'No usable quantity is currently available in this warehouse.',
    };
  }

  return {
    label: 'Available',
    badgeClass: 'badge-success',
    note: 'Live quantity is supported by posted GRN and challan movement.',
  };
}

function getReceiptBadge(receiptStatus?: string, fulfilmentStatus?: string): { label: string; badgeClass: 'badge-error' | 'badge-warning' | 'badge-success' | 'badge-gray' | 'badge-info' } {
  if (receiptStatus === 'APPROVED') {
    return { label: 'GRN Approved', badgeClass: 'badge-success' };
  }
  if (receiptStatus === 'SUBMITTED') {
    return { label: 'GRN Pending', badgeClass: 'badge-info' };
  }
  if (receiptStatus === 'DRAFT') {
    return { label: 'GRN Draft', badgeClass: 'badge-warning' };
  }
  if (receiptStatus === 'REJECTED') {
    return { label: 'GRN Rejected', badgeClass: 'badge-error' };
  }
  if (fulfilmentStatus === 'AWAITING_SITE_GRN') {
    return { label: 'Awaiting Site GRN', badgeClass: 'badge-warning' };
  }
  return { label: 'Not Dispatched Yet', badgeClass: 'badge-gray' };
}

export default function InventoryPage() {
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const [challans, setChallans] = useState<DC[]>([]);
  const [stats, setStats] = useState<DCStats>({});
  const [stockBins, setStockBins] = useState<StockBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectFilter, setProjectFilter] = useState(searchParams?.get('project') || '');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DC | null>(null);

  // Challan create form state
  const emptyItem = (): DCItem => ({ item_link: '', description: '', qty: 1, make: '', model_no: '', serial_numbers: '', uom: 'Nos', remarks: '' });
  const [dcForm, setDcForm] = useState({
    dispatch_type: 'WAREHOUSE_TO_SITE',
    dispatch_date: '',
    challan_reference: '',
    from_warehouse: '',
    to_warehouse: '',
    target_site_name: '',
    linked_project: '',
    issued_to_name: '',
    vehicle_number: '',
    transporter_name: '',
    purpose_of_issuance: '',
    remarks: '',
  });
  const [dcItems, setDcItems] = useState<DCItem[]>([emptyItem()]);

  // Schema-driven labels from backend workbook reference
  const [outHeaders, setOutHeaders] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/inventory/schema')
      .then(r => r.json())
      .then(p => { if (p.data?.out_sheet?.headers) setOutHeaders(p.data.out_sheet.headers); })
      .catch(() => {});
  }, []);
  // Map workbook headers to line-item columns (fallback to sensible defaults)
  const colLabel = (idx: number, fallback: string) => outHeaders[idx] || fallback;

  const hasRole = (...roles: string[]) => roles.some(r => new Set(currentUser?.roles || []).has(r));
  const canSubmit = hasRole('Director', 'System Manager', 'Store Manager', 'Stores Logistics Head', 'Procurement Manager', 'Purchase');
  const canApprove = hasRole('Director', 'System Manager', 'Project Head', 'Procurement Manager');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [cr, sr, stk] = await Promise.all([
        fetch('/api/dispatch-challans').then(r => r.json()),
        fetch('/api/dispatch-challans/stats').then(r => r.json()),
        fetch('/api/stock-snapshot').then(r => r.json()),
      ]);
      setChallans(cr.data || []); setStats(sr.data || {}); setStockBins(stk.data || []);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const validItems = dcItems.filter(i => i.item_link.trim() && i.description.trim());
    if (!dcForm.dispatch_date || validItems.length === 0) { setError('Date and at least one item with Item + Description required'); return; }
    setCreating(true); setError('');
    try {
      const payload = {
        ...dcForm,
        items: validItems.map(i => ({ ...i, qty: Number(i.qty) || 1 })),
      };
      const res = await fetch('/api/dispatch-challans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const p = await res.json(); if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      setShowCreate(false);
      setDcForm({ dispatch_type: 'WAREHOUSE_TO_SITE', dispatch_date: '', challan_reference: '', from_warehouse: '', to_warehouse: '', target_site_name: '', linked_project: '', issued_to_name: '', vehicle_number: '', transporter_name: '', purpose_of_issuance: '', remarks: '' });
      setDcItems([emptyItem()]);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setCreating(false); }
  };

  const updateItem = (idx: number, field: keyof DCItem, value: string | number) => {
    setDcItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };
  const addItem = () => setDcItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setDcItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const runAction = async (name: string, action: string, extra?: Record<string, string>) => {
    setActionBusy(name); setError('');
    try {
      const res = await fetch(`/api/dispatch-challans/${encodeURIComponent(name)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(extra || {}) }),
      });
      const p = await res.json(); if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setActionBusy(null); }
  };

  const filtered = projectFilter ? challans.filter(c => (c.linked_project || '').toLowerCase().includes(projectFilter.toLowerCase())) : challans;

  return (
    <RegisterPage
      title="Inventory & Logistics"
      description="Dispatch challans, stock, and warehouse operations"
      loading={loading} error={error} onRetry={load}
      stats={[
        { label: 'Total Challans', value: stats.total ?? challans.length },
        { label: 'Dispatched', value: stats.dispatched ?? 0 },
        { label: 'Pending Approval', value: stats.pending_approval ?? 0 },
        { label: 'Stock Items', value: stockBins.length },
      ]}
      headerActions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Challan</button>}
      filterBar={
        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-gray-400" />
          <LinkPicker entity="project" value={projectFilter} onChange={setProjectFilter} placeholder="Filter by project…" className="w-48" />
          {projectFilter && <button onClick={() => setProjectFilter('')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"><X className="h-3 w-3" /> Clear</button>}
        </div>
      }
    >
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Dispatch challans now follow the richer workbook-style <span className="font-semibold">OUT</span> schema. This prototype supports head-office dispatch to site and vendor-to-site delivery only. Site receipt must be closed through a GRN so challan follow-through stays auditable.
      </div>

      {/* Dispatch Challans table */}
      <div className="shell-panel overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Dispatch Challans</h3></div>
        <div className="overflow-x-auto">
        <table className="data-table text-sm">
          <thead><tr><th>Challan</th><th>Ref</th><th>Date</th><th>Type</th><th>From</th><th>To</th><th>Issued To</th><th>Project</th><th>Items</th><th>Qty</th><th>Site Receipt</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={13} className="text-center py-8 text-gray-500">{projectFilter ? 'No challans match the selected project.' : 'No dispatch challans have been created yet.'}</td></tr> : filtered.map(c => {
              const receipt = getReceiptBadge(c.receipt_status, c.fulfilment_status);
              return (
              <tr key={c.name}>
                <td className="font-medium">{c.name}</td>
                <td className="text-gray-600">{c.challan_reference || '-'}</td>
                <td className="text-gray-600">{c.dispatch_date || '-'}</td>
                <td><span className="badge badge-info">{c.dispatch_type || '-'}</span></td>
                <td className="text-gray-700">{c.dispatch_type === 'VENDOR_TO_SITE' ? 'Vendor Direct' : c.from_warehouse || 'Head Office'}</td>
                <td className="text-gray-700">{c.to_warehouse || c.target_site_name || '-'}</td>
                <td className="text-gray-700">{c.issued_to_name || '-'}</td>
                <td>{c.linked_project ? <Link href={`/projects/${encodeURIComponent(c.linked_project)}?tab=ops`} className="text-blue-600 hover:underline text-sm">{c.linked_project}</Link> : '-'}</td>
                <td className="text-gray-600">{c.total_items ?? 0}</td>
                <td className="text-gray-600">{c.total_qty ?? 0}</td>
                <td>
                  <div className="flex flex-col gap-1">
                    {c.linked_receipt ? (
                      <Link href={`/grns/${encodeURIComponent(c.linked_receipt)}`} className={`badge ${receipt.badgeClass}`}>
                        {receipt.label}
                      </Link>
                    ) : (
                      <span className={`badge ${receipt.badgeClass}`}>{receipt.label}</span>
                    )}
                    <span className="text-xs text-gray-500">{c.receipt_date || (c.status === 'DISPATCHED' ? 'GRN not raised yet' : 'Receipt follows dispatch')}</span>
                  </div>
                </td>
                <td><span className={`badge ${badge(DC_BADGES, c.status)}`}>{c.status}</span></td>
                <td>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Link href={`/dispatch-challans/${encodeURIComponent(c.name)}`} className="text-blue-600 hover:underline text-sm flex items-center gap-1"><Eye className="w-3.5 h-3.5" />View</Link>
                    {c.status === 'DRAFT' && canSubmit && <button disabled={actionBusy === c.name} onClick={() => runAction(c.name, 'submit')} className="text-indigo-600 text-sm font-medium">Submit</button>}
                    {c.status === 'PENDING_APPROVAL' && canApprove && (<><button disabled={actionBusy === c.name} onClick={() => runAction(c.name, 'approve')} className="text-green-600 text-sm font-medium">Approve</button><button disabled={actionBusy === c.name} onClick={() => setRejectTarget(c)} className="text-red-600 text-sm font-medium">Reject</button></>)}
                    {c.status === 'APPROVED' && canSubmit && <button disabled={actionBusy === c.name} onClick={() => runAction(c.name, 'dispatch')} className="text-orange-600 text-sm font-medium">Dispatch</button>}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        </div>
      </div>

      {/* Stock snapshot */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Live Stock from GRNs and Challans</h3>
          <p className="mt-1 text-sm text-gray-500">
            This prototype tracks operational stock only. Planning fields are hidden, and any below-zero quantity is treated as a control breach, not a valid stock state.
          </p>
        </div>
        <div className="overflow-x-auto">
        <table className="data-table text-sm">
          <thead><tr><th>Item Code</th><th>Warehouse</th><th className="text-right">Live Qty</th><th>Status</th></tr></thead>
          <tbody>
            {stockBins.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">No GRN or challan-backed stock movement is available yet.</td></tr> : stockBins.map((b, i) => {
              const stockHealth = getStockHealth(b.actual_qty);

              return (
                <tr key={i}>
                  <td className="font-medium">{b.item_code || '-'}</td>
                  <td className="text-gray-600">{b.warehouse || '-'}</td>
                  <td className="text-right font-semibold">{formatNumber(b.actual_qty)}</td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className={`badge ${stockHealth.badgeClass}`}>{stockHealth.label}</span>
                      <span className="text-xs text-gray-500">{stockHealth.note}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <FormModal
        open={showCreate}
        title="Create Dispatch Challan"
        description="Dispatch items from warehouse to site with full workbook detail."
        busy={creating}
        size="lg"
        confirmLabel="Create Challan"
        onConfirm={() => handleCreate()}
        onCancel={() => setShowCreate(false)}
      >
        <div className="space-y-5 px-6 py-4">
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Type</label>
              <select className="input" value={dcForm.dispatch_type} onChange={e => setDcForm(f => ({ ...f, dispatch_type: e.target.value }))}>
                <option value="WAREHOUSE_TO_SITE">Warehouse to Site</option>
                <option value="VENDOR_TO_SITE">Vendor to Site</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Date *</label>
              <input type="date" className="input" value={dcForm.dispatch_date} onChange={e => setDcForm(f => ({ ...f, dispatch_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Challan Reference</label>
              <input className="input" placeholder="e.g. DC-2026-001" value={dcForm.challan_reference} onChange={e => setDcForm(f => ({ ...f, challan_reference: e.target.value }))} />
            </div>
            {dcForm.dispatch_type === 'WAREHOUSE_TO_SITE' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Head Office Source</label>
                <LinkPicker entity="warehouse" value={dcForm.from_warehouse} onChange={v => setDcForm(f => ({ ...f, from_warehouse: v, to_warehouse: '' }))} placeholder="Leave blank to use the default HO warehouse…" />
                <p className="mt-1 text-xs text-gray-500">Only the head-office warehouse is used for internal dispatch in this prototype.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                Vendor-to-site dispatch skips warehouse handling and ships directly to the selected site.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Site</label>
              <LinkPicker entity="site" value={dcForm.target_site_name} onChange={v => setDcForm(f => ({ ...f, target_site_name: v }))} placeholder="Search sites…" filters={dcForm.linked_project ? { project: dcForm.linked_project } : undefined} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Linked Project</label>
              <LinkPicker entity="project" value={dcForm.linked_project} onChange={v => setDcForm(f => ({ ...f, linked_project: v }))} placeholder="Search projects…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issued To</label>
              <input className="input" placeholder="Name of person issued" value={dcForm.issued_to_name} onChange={e => setDcForm(f => ({ ...f, issued_to_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <select className="input" value={dcForm.purpose_of_issuance} onChange={e => setDcForm(f => ({ ...f, purpose_of_issuance: e.target.value }))}>
                <option value="">-- Select --</option>
                <option value="Site Installation">Site Installation</option>
                <option value="Repair">Repair</option>
                <option value="Replacement">Replacement</option>
                <option value="Testing">Testing</option>
                <option value="Training">Training</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
              <input className="input" value={dcForm.vehicle_number} onChange={e => setDcForm(f => ({ ...f, vehicle_number: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transporter</label>
              <input className="input" value={dcForm.transporter_name} onChange={e => setDcForm(f => ({ ...f, transporter_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <input className="input" value={dcForm.remarks} onChange={e => setDcForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
              <button type="button" className="btn btn-secondary text-xs" onClick={addItem}><Plus className="w-3.5 h-3.5" /> Add Row</button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">{colLabel(2, 'Item')} *</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Description *</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">{colLabel(3, 'Make')}</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">{colLabel(4, 'Model No.')}</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-16">{colLabel(6, 'Qty')}</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-16">{colLabel(7, 'UOM')}</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">{colLabel(5, 'Serial No.')}</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">{colLabel(10, 'Remarks')}</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {dcItems.map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="px-1 py-1"><LinkPicker entity="item" className="text-xs" value={item.item_link} onChange={v => updateItem(idx, 'item_link', v)} placeholder="Search items…" /></td>
                      <td className="px-1 py-1"><input className="input text-xs" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></td>
                      <td className="px-1 py-1"><input className="input text-xs" value={item.make} onChange={e => updateItem(idx, 'make', e.target.value)} /></td>
                      <td className="px-1 py-1"><input className="input text-xs" value={item.model_no} onChange={e => updateItem(idx, 'model_no', e.target.value)} /></td>
                      <td className="px-1 py-1"><input type="number" min="1" className="input text-xs w-16" value={item.qty} onChange={e => updateItem(idx, 'qty', Number(e.target.value) || 1)} /></td>
                      <td className="px-1 py-1"><input className="input text-xs w-16" value={item.uom} onChange={e => updateItem(idx, 'uom', e.target.value)} /></td>
                      <td className="px-1 py-1"><input className="input text-xs" value={item.serial_numbers} onChange={e => updateItem(idx, 'serial_numbers', e.target.value)} /></td>
                      <td className="px-1 py-1"><input className="input text-xs" value={item.remarks} onChange={e => updateItem(idx, 'remarks', e.target.value)} /></td>
                      <td className="px-1 py-1"><button type="button" className="p-1 text-gray-400 hover:text-rose-600" onClick={() => removeItem(idx)}><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </FormModal>
      <ActionModal
        open={!!rejectTarget}
        title="Reject Dispatch Challan"
        description={`Give a reason for rejecting ${rejectTarget?.name || 'this challan'}. Backend requires remarks for this action.`}
        variant="danger"
        confirmLabel="Reject"
        busy={!!rejectTarget && actionBusy === rejectTarget.name}
        fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
        onConfirm={async (values) => {
          if (!rejectTarget?.name) return;
          await runAction(rejectTarget.name, 'reject', { reason: values.reason || '' });
          setRejectTarget(null);
        }}
        onCancel={() => setRejectTarget(null)}
      />
    </RegisterPage>
  );
}
