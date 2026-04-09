'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Plus, ReceiptText, Truck, X, Package, ChevronRight } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { usePmContext, formatCurrency, siteLabel } from '@/components/pm/pm-helpers';
import { projectInventoryApi } from '@/lib/typedApi';

/* ── Types ─────────────────────────────────────────────────────────── */

interface InventoryRecord {
  name: string;
  linked_project: string;
  linked_site?: string;
  item_code: string;
  item_name?: string;
  unit?: string;
  received_qty?: number;
  consumed_qty?: number;
  balance_qty?: number;
  last_grn_ref?: string;
  last_receipt_note?: string;
  hsn_code?: string;
  make?: string;
  model_no?: string;
  serial_no?: string;
  source_reference?: string;
  invoice_no?: string;
  purchase_order?: string;
  purchase_cost?: number;
  last_received_on?: string;
}

interface ConsumptionReport {
  name: string;
  report_date?: string;
  item_code: string;
  item_name?: string;
  unit?: string;
  consumed_qty?: number;
  status?: string;
}

interface ReceivingSummary {
  grns: Array<{ name: string; supplier?: string; posting_date?: string; status?: string; grand_total?: number }>;
  dispatches: Array<{ name: string; dispatch_date?: string; dispatch_type?: string; status?: string; target_site_name?: string }>;
}

interface ProjectIndent {
  name: string;
  transaction_date?: string;
  schedule_date?: string;
  status?: string;
  material_request_type?: string;
  accountability_status?: string;
  accountability_owner_role?: string;
  accountability_owner_user?: string;
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function ProjectManagerInventoryPage() {
  const { assignedProjects, selectedProject, setSelectedProject, sites } = usePmContext();

  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [reports, setReports] = useState<ConsumptionReport[]>([]);
  const [indents, setIndents] = useState<ProjectIndent[]>([]);
  const [receiving, setReceiving] = useState<ReceivingSummary>({ grns: [], dispatches: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showReceipt, setShowReceipt] = useState(false);
  const [showConsumption, setShowConsumption] = useState(false);
  const [showIndent, setShowIndent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InventoryRecord | null>(null);

  // Schema-driven labels from backend workbook reference (IN sheet)
  const [inHeaders, setInHeaders] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'get_inventory_reference_schema' }) })
      .then(r => r.json())
      .then(p => { if (p.data?.in_sheet?.headers) setInHeaders(p.data.in_sheet.headers); })
      .catch(() => {});
  }, []);
  // Map workbook header index → label (fallback to hardcoded)
  const h = (idx: number, fallback: string) => inHeaders[idx] || fallback;

  const loadData = async (project: string) => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      const [inv, rep, rec, ind] = await Promise.all([
        projectInventoryApi.getRecords<InventoryRecord[]>(project),
        projectInventoryApi.getConsumption<ConsumptionReport[]>(project),
        projectInventoryApi.getSummary<ReceivingSummary>(project),
        projectInventoryApi.getIndents<ProjectIndent[]>(project, 10, 0),
      ]);
      setInventory(Array.isArray(inv) ? inv : []);
      setReports(Array.isArray(rep) ? rep : []);
      setReceiving(rec || { grns: [], dispatches: [] });
      setIndents(Array.isArray(ind) ? ind : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
      setInventory([]); setReports([]); setReceiving({ grns: [], dispatches: [] }); setIndents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedProject) void loadData(selectedProject); }, [selectedProject]);

  const totals = useMemo(() => inventory.reduce(
    (acc, r) => ({ received: acc.received + Number(r.received_qty || 0), consumed: acc.consumed + Number(r.consumed_qty || 0), balance: acc.balance + Number(r.balance_qty || 0) }),
    { received: 0, consumed: 0, balance: 0 },
  ), [inventory]);

  const siteOptions = [{ value: '', label: 'Project-level' }, ...sites.map((s) => ({ value: s.name, label: siteLabel(s) }))];

  /* ── Save handlers ──────────────────────────────────────────────── */

  const handleReceipt = async (v: Record<string, string>) => {
    if (!v.item_code?.trim() || !(Number(v.received_qty) > 0)) { setError('Item code and qty required.'); return; }
    setSaving(true); setError('');
    try {
      await projectInventoryApi.recordReceipt({
        data: JSON.stringify({ linked_project: selectedProject, linked_site: v.linked_site || undefined, item_code: v.item_code.trim(), item_name: v.item_name?.trim() || undefined, unit: v.unit?.trim() || undefined, received_qty: Number(v.received_qty), last_grn_ref: v.last_grn_ref?.trim() || undefined, last_receipt_note: v.last_receipt_note?.trim() || undefined, hsn_code: v.hsn_code?.trim() || undefined, make: v.make?.trim() || undefined, model_no: v.model_no?.trim() || undefined, serial_no: v.serial_no?.trim() || undefined, source_reference: v.source_reference?.trim() || undefined, invoice_no: v.invoice_no?.trim() || undefined, purchase_order: v.purchase_order?.trim() || undefined, purchase_cost: v.purchase_cost ? Number(v.purchase_cost) : undefined, last_received_on: v.last_received_on || undefined }),
      });
      setShowReceipt(false); await loadData(selectedProject);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  const handleConsumption = async (v: Record<string, string>) => {
    if (!v.item_code?.trim() || !(Number(v.consumed_qty) > 0)) { setError('Item code and qty required.'); return; }
    setSaving(true); setError('');
    try {
      await projectInventoryApi.createConsumption({
        data: JSON.stringify({ linked_project: selectedProject, linked_site: v.linked_site || undefined, report_date: v.report_date || undefined, item_code: v.item_code.trim(), item_name: v.item_name?.trim() || undefined, unit: v.unit?.trim() || undefined, consumed_qty: Number(v.consumed_qty), remarks: v.remarks?.trim() || undefined }),
      });
      setShowConsumption(false); await loadData(selectedProject);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  const handleIndent = async (v: Record<string, string>) => {
    if (!v.item_code?.trim() || !(Number(v.qty) > 0)) { setError('Item code and qty required.'); return; }
    setSaving(true); setError('');
    try {
      await projectInventoryApi.createIndent({
        data: JSON.stringify({ project: selectedProject, linked_site: v.linked_site || undefined, item_code: v.item_code.trim(), qty: Number(v.qty), uom: v.uom?.trim() || undefined, warehouse: v.warehouse?.trim() || undefined, schedule_date: v.schedule_date || undefined, remarks: v.remarks?.trim() || undefined }),
      });
      setShowIndent(false); await loadData(selectedProject);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  if (!assignedProjects.length) {
    return <RegisterPage title="Project Inventory" loading={false} empty emptyTitle="No Assigned Projects" emptyDescription="No assigned projects were found for this Project Manager."><div /></RegisterPage>;
  }

  return (
    <>
      <RegisterPage
        title="Project Inventory"
        description="Project-only receiving, GRN follow-through, and material consumption."
        loading={loading}
        error={error}
        onRetry={() => void loadData(selectedProject)}
        stats={[
          { label: 'Tracked Items', value: inventory.length },
          { label: 'Received Qty', value: totals.received },
          { label: 'Consumed Qty', value: totals.consumed },
          { label: 'Available Balance', value: totals.balance, variant: totals.balance > 0 ? 'success' : 'default' },
        ]}
        filterBar={
          <select className="input max-w-xs" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            {assignedProjects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        }
        headerActions={
          <>
            <button className="btn btn-secondary" onClick={() => setShowReceipt(true)}><Plus className="h-4 w-4" /> Update Receipt</button>
            <button className="btn btn-secondary" onClick={() => setShowIndent(true)}><ReceiptText className="h-4 w-4" /> Raise Indent</button>
            <button className="btn btn-primary" onClick={() => setShowConsumption(true)}><ClipboardList className="h-4 w-4" /> Material Consumption</button>
          </>
        }
      >
        <div className="space-y-6 p-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            This workspace is aligned to the workbook-style <span className="font-semibold">IN</span> receipt model. Use receipt updates to preserve HSN, make/model, serial, invoice, PO, and GRN context so balance changes stay traceable.
          </div>

          {/* Receiving Context */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Receiving Context</h3><p className="text-xs text-gray-500 mt-1">Read-only GRNs and dispatches.</p></div>
              <div className="card-body space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900"><ReceiptText className="h-4 w-4 text-blue-600" />GRNs</div>
                  <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>ID</th><th>Supplier</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>
                    {(receiving.grns || []).length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-sm text-gray-500">No GRNs found.</td></tr> : receiving.grns.map((r) => (
                      <tr key={r.name} className="cursor-pointer hover:bg-blue-50/50">
                        <td><Link href={`/grns/${encodeURIComponent(r.name)}`} className="font-medium text-blue-700 hover:underline">{r.name}</Link></td>
                        <td>{r.supplier || '-'}</td><td>{r.posting_date || '-'}</td><td>{r.status || '-'}</td><td>{formatCurrency(r.grand_total)}</td>
                      </tr>
                    ))}
                  </tbody></table></div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900"><Truck className="h-4 w-4 text-emerald-600" />Dispatches</div>
                  <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Site</th><th>Status</th></tr></thead><tbody>
                    {(receiving.dispatches || []).length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-sm text-gray-500">No dispatches found.</td></tr> : receiving.dispatches.map((r) => (
                      <tr key={r.name} className="cursor-pointer hover:bg-emerald-50/50">
                        <td><Link href={`/dispatch-challans/${encodeURIComponent(r.name)}`} className="font-medium text-emerald-700 hover:underline">{r.name}</Link></td>
                        <td>{r.dispatch_date || '-'}</td><td>{r.dispatch_type || '-'}</td><td>{r.target_site_name || '-'}</td><td>{r.status || '-'}</td>
                      </tr>
                    ))}
                  </tbody></table></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Material Consumption Reports</h3><p className="text-xs text-gray-500 mt-1">Reports submitted to Project Head.</p></div>
              <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>ID</th><th>Date</th><th>Item</th><th>Qty</th><th>Status</th></tr></thead><tbody>
                {reports.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">No reports yet.</td></tr> : reports.map((r) => (
                  <tr key={r.name}><td className="font-medium text-gray-900">{r.name}</td><td>{r.report_date || '-'}</td><td>{r.item_name || r.item_code}</td><td>{r.consumed_qty || 0}{r.unit ? ` ${r.unit}` : ''}</td><td>{r.status || 'Submitted'}</td></tr>
                ))}
              </tbody></table></div>
            </div>
          </div>

          {/* Indents */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900">Project Indent Requests</h3></div>
            <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>ID</th><th>Date</th><th>Required By</th><th>Status</th><th>Action Owner</th><th>Type</th></tr></thead><tbody>
              {indents.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-500">No indents raised yet.</td></tr> : indents.map((r) => (
                <tr key={r.name} className="cursor-pointer hover:bg-blue-50/50">
                  <td><Link href={`/indents/${encodeURIComponent(r.name)}`} className="font-medium text-blue-700 hover:underline">{r.name}</Link></td>
                  <td>{r.transaction_date || '-'}</td>
                  <td>{r.schedule_date || '-'}</td>
                  <td>{r.accountability_status || r.status || 'Draft'}</td>
                  <td><div>{r.accountability_owner_role || '-'}</div><div className="text-xs text-gray-500">{r.accountability_owner_user || '-'}</div></td>
                  <td>{r.material_request_type || 'Purchase'}</td>
                </tr>
              ))}
            </tbody></table></div>
          </div>

          {/* Register */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900">Project Inventory Register</h3><p className="text-xs text-gray-500 mt-1">PM-side inventory truth for the selected project.</p></div>
            <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>{h(2, 'Item')}</th><th>{h(1, 'HSN')}</th><th>{h(3, 'Make')} / {h(4, 'Model')}</th><th>Site</th><th>Received</th><th>Consumed</th><th>Balance</th><th>{h(8, 'Source')}</th><th>{h(9, 'Invoice')} / {h(10, 'PO')}</th><th>{h(11, 'Cost')}</th><th>Last GRN</th><th>{h(12, 'Note')}</th></tr></thead><tbody>
              {inventory.length === 0 ? <tr><td colSpan={12} className="py-8 text-center text-sm text-gray-500">No records found.</td></tr> : inventory.map((r) => (
                <tr key={r.name} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedRecord(r)}>
                  <td><div className="font-medium text-gray-900">{r.item_name || r.item_code}</div><div className="text-xs text-gray-500">{r.item_code}{r.serial_no ? ` · S/N ${r.serial_no}` : ''}</div></td>
                  <td className="text-xs text-gray-600">{r.hsn_code || '-'}</td>
                  <td><div className="text-xs text-gray-700">{r.make || '-'}</div><div className="text-xs text-gray-500">{r.model_no || ''}</div></td>
                  <td>{r.linked_site || '-'}</td>
                  <td>{r.received_qty || 0}</td>
                  <td>{r.consumed_qty || 0}</td>
                  <td className="font-semibold">{r.balance_qty || 0}</td>
                  <td className="text-xs text-gray-600">{r.source_reference || '-'}</td>
                  <td><div className="text-xs text-gray-700">{r.invoice_no || '-'}</div><div className="text-xs text-gray-500">{r.purchase_order || ''}</div></td>
                  <td className="text-xs text-gray-700">{r.purchase_cost ? `₹${r.purchase_cost}` : '-'}</td>
                  <td className="text-xs text-gray-600">{r.last_grn_ref || '-'}</td>
                  <td className="text-xs text-gray-500 max-w-32 truncate">{r.last_receipt_note || '-'}</td>
                </tr>
              ))}
            </tbody></table></div>
          </div>
        </div>
      </RegisterPage>

      {/* Receipt Modal */}
      <FormModal open={showReceipt} title="Project Receipt Update" size="lg" busy={saving} confirmLabel="Save Receipt" onConfirm={handleReceipt} onCancel={() => setShowReceipt(false)} fields={[
        { name: 'item_code', label: h(2, 'Item Code'), type: 'link', linkEntity: 'item', required: true, placeholder: 'Search items…' },
        { name: 'item_name', label: 'Item Name', type: 'text' },
        { name: 'hsn_code', label: h(1, 'HSN Code'), type: 'text' },
        { name: 'make', label: h(3, 'Make'), type: 'text' },
        { name: 'model_no', label: h(4, 'Model No.'), type: 'text' },
        { name: 'serial_no', label: h(5, 'Serial No.'), type: 'text' },
        { name: 'unit', label: h(7, 'Unit / UOM'), type: 'text' },
        { name: 'received_qty', label: h(6, 'Received Qty'), type: 'number', required: true },
        { name: 'linked_site', label: 'Site', type: 'select', options: siteOptions },
        { name: 'last_received_on', label: h(0, 'Received Date'), type: 'date' },
        { name: 'source_reference', label: h(8, 'Source / Vendor'), type: 'link', linkEntity: 'vendor', placeholder: 'Search vendors…', hint: 'Vendor name or project the material came from' },
        { name: 'invoice_no', label: h(9, 'Invoice No.'), type: 'text' },
        { name: 'purchase_order', label: h(10, 'Purchase Order'), type: 'text' },
        { name: 'purchase_cost', label: h(11, 'Purchase Cost'), type: 'number' },
        { name: 'last_grn_ref', label: 'GRN Ref', type: 'text' },
        { name: 'last_receipt_note', label: h(12, 'Receipt Note / Remark'), type: 'textarea' },
      ]} />

      {/* Consumption Modal */}
      <FormModal open={showConsumption} title="Material Consumption Report" size="lg" busy={saving} confirmLabel="Submit Report" onConfirm={handleConsumption} onCancel={() => setShowConsumption(false)} fields={[
        { name: 'report_date', label: 'Report Date', type: 'date' },
        { name: 'linked_site', label: 'Site', type: 'select', options: siteOptions },
        { name: 'item_code', label: 'Item Code', type: 'link', linkEntity: 'item', required: true, placeholder: 'Search items…' },
        { name: 'item_name', label: 'Item Name', type: 'text' },
        { name: 'unit', label: 'Unit', type: 'text' },
        { name: 'consumed_qty', label: 'Consumed Qty', type: 'number', required: true },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]} />

      {/* Indent Modal */}
      <FormModal open={showIndent} title="Raise Project Indent" size="lg" busy={saving} confirmLabel="Create Indent" onConfirm={handleIndent} onCancel={() => setShowIndent(false)} fields={[
        { name: 'item_code', label: 'Item Code', type: 'link', linkEntity: 'item', required: true, placeholder: 'Search items…' },
        { name: 'qty', label: 'Required Qty', type: 'number', required: true },
        { name: 'uom', label: 'Unit', type: 'text' },
        { name: 'schedule_date', label: 'Required By', type: 'date' },
        { name: 'linked_site', label: 'Site', type: 'select', options: siteOptions },
        { name: 'warehouse', label: 'Warehouse', type: 'link', linkEntity: 'warehouse', placeholder: 'Search warehouses…' },
        { name: 'remarks', label: 'Justification / Note', type: 'textarea' },
      ]} />

      {/* Inventory Detail Drawer */}
      {selectedRecord && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedRecord(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl border-l border-gray-200 overflow-y-auto animate-in slide-in-from-right">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Item Detail</h2>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Identity */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Identity</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <DetailField label="Item Code" value={selectedRecord.item_code} />
                  <DetailField label="Item Name" value={selectedRecord.item_name} />
                  <DetailField label="HSN Code" value={selectedRecord.hsn_code} />
                  <DetailField label="Unit" value={selectedRecord.unit} />
                  <DetailField label="Make" value={selectedRecord.make} />
                  <DetailField label="Model No." value={selectedRecord.model_no} />
                  <DetailField label="Serial No." value={selectedRecord.serial_no} span />
                </div>
              </section>

              {/* Quantities */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quantities</h3>
                <div className="grid grid-cols-3 gap-3">
                  <QuantityCard label="Received" value={selectedRecord.received_qty} color="blue" />
                  <QuantityCard label="Consumed" value={selectedRecord.consumed_qty} color="amber" />
                  <QuantityCard label="Balance" value={selectedRecord.balance_qty} color="emerald" />
                </div>
              </section>

              {/* Procurement */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Procurement & Source</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <DetailField label="Source / Vendor" value={selectedRecord.source_reference} />
                  <DetailField label="Purchase Cost" value={selectedRecord.purchase_cost ? `₹${Number(selectedRecord.purchase_cost).toLocaleString('en-IN')}` : undefined} />
                  <DetailField label="Invoice No." value={selectedRecord.invoice_no} />
                  <DetailField label="Purchase Order" value={selectedRecord.purchase_order} />
                </div>
              </section>

              {/* Receipt Trail */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Receipt Trail</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <DetailField label="Last Received On" value={selectedRecord.last_received_on} />
                  {selectedRecord.last_grn_ref ? (
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">GRN Ref</div>
                      <Link href={`/grns/${encodeURIComponent(selectedRecord.last_grn_ref)}`} className="text-blue-700 hover:underline font-medium">{selectedRecord.last_grn_ref}</Link>
                    </div>
                  ) : (
                    <DetailField label="GRN Ref" value={undefined} />
                  )}
                  <DetailField label="Receipt Note" value={selectedRecord.last_receipt_note} span />
                </div>
              </section>

              {/* Location */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Location</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <DetailField label="Project" value={selectedRecord.linked_project} />
                  <DetailField label="Site" value={selectedRecord.linked_site} />
                </div>
              </section>

              {/* Quick Links */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Links</h3>
                <div className="space-y-1">
                  {selectedRecord.last_grn_ref && (
                    <Link href={`/grns/${encodeURIComponent(selectedRecord.last_grn_ref)}`} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-50 text-sm text-blue-700">
                      <ReceiptText className="h-4 w-4" /> View GRN Detail <ChevronRight className="h-3 w-3 ml-auto" />
                    </Link>
                  )}
                  {selectedRecord.linked_site && (
                    <Link href={`/execution/sites/${encodeURIComponent(selectedRecord.linked_site)}`} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-50 text-sm text-blue-700">
                      <Package className="h-4 w-4" /> View Site Detail <ChevronRight className="h-3 w-3 ml-auto" />
                    </Link>
                  )}
                </div>
              </section>

              {/* Record Metadata */}
              <section className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400">Record ID: {selectedRecord.name}</p>
              </section>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

/* ── Drawer helpers ────────────────────────────────────────────────── */

function DetailField({ label, value, span }: { label: string; value?: string | number | null; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-gray-900 font-medium">{value || <span className="text-gray-400">—</span>}</div>
    </div>
  );
}

const QTY_COLOR: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

function QuantityCard({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${QTY_COLOR[color] || QTY_COLOR.blue}`}>
      <div className="text-lg font-bold">{value ?? 0}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
