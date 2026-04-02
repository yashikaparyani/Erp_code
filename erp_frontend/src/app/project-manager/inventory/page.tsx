'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, ReceiptText, Truck } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { usePmContext, callOps, formatCurrency, siteLabel } from '@/components/pm/pm-helpers';

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

  const loadData = async (project: string) => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      const [inv, rep, rec, ind] = await Promise.all([
        callOps<InventoryRecord[]>('get_project_inventory_records', { project }),
        callOps<ConsumptionReport[]>('get_material_consumption_reports', { project }),
        callOps<ReceivingSummary>('get_project_receiving_summary', { project }),
        callOps<ProjectIndent[]>('get_project_indents', { project, limit_page_length: 10, limit_start: 0 }),
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
      await callOps('record_project_inventory_receipt', {
        data: JSON.stringify({ linked_project: selectedProject, linked_site: v.linked_site || undefined, item_code: v.item_code.trim(), item_name: v.item_name?.trim() || undefined, unit: v.unit?.trim() || undefined, received_qty: Number(v.received_qty), last_grn_ref: v.last_grn_ref?.trim() || undefined, last_receipt_note: v.last_receipt_note?.trim() || undefined }),
      });
      setShowReceipt(false); await loadData(selectedProject);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  const handleConsumption = async (v: Record<string, string>) => {
    if (!v.item_code?.trim() || !(Number(v.consumed_qty) > 0)) { setError('Item code and qty required.'); return; }
    setSaving(true); setError('');
    try {
      await callOps('create_material_consumption_report', {
        data: JSON.stringify({ linked_project: selectedProject, linked_site: v.linked_site || undefined, report_date: v.report_date || undefined, item_code: v.item_code.trim(), item_name: v.item_name?.trim() || undefined, unit: v.unit?.trim() || undefined, consumed_qty: Number(v.consumed_qty), remarks: v.remarks?.trim() || undefined }),
      });
      setShowConsumption(false); await loadData(selectedProject);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); }
  };

  const handleIndent = async (v: Record<string, string>) => {
    if (!v.item_code?.trim() || !(Number(v.qty) > 0)) { setError('Item code and qty required.'); return; }
    setSaving(true); setError('');
    try {
      await callOps('create_project_indent', {
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
          {/* Receiving Context */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Receiving Context</h3><p className="text-xs text-gray-500 mt-1">Read-only GRNs and dispatches.</p></div>
              <div className="card-body space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900"><ReceiptText className="h-4 w-4 text-blue-600" />GRNs</div>
                  <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>ID</th><th>Supplier</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>
                    {(receiving.grns || []).length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-sm text-gray-500">No GRNs found.</td></tr> : receiving.grns.map((r) => (
                      <tr key={r.name}><td className="font-medium text-gray-900">{r.name}</td><td>{r.supplier || '-'}</td><td>{r.posting_date || '-'}</td><td>{r.status || '-'}</td><td>{formatCurrency(r.grand_total)}</td></tr>
                    ))}
                  </tbody></table></div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900"><Truck className="h-4 w-4 text-emerald-600" />Dispatches</div>
                  <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Site</th><th>Status</th></tr></thead><tbody>
                    {(receiving.dispatches || []).length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-sm text-gray-500">No dispatches found.</td></tr> : receiving.dispatches.map((r) => (
                      <tr key={r.name}><td className="font-medium text-gray-900">{r.name}</td><td>{r.dispatch_date || '-'}</td><td>{r.dispatch_type || '-'}</td><td>{r.target_site_name || '-'}</td><td>{r.status || '-'}</td></tr>
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
                <tr key={r.name}>
                  <td className="font-medium text-gray-900">{r.name}</td>
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
            <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Item</th><th>Site</th><th>Received</th><th>Consumed</th><th>Balance</th><th>Last GRN</th><th>Last Note</th></tr></thead><tbody>
              {inventory.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-500">No records found.</td></tr> : inventory.map((r) => (
                <tr key={r.name}>
                  <td><div className="font-medium text-gray-900">{r.item_name || r.item_code}</div><div className="text-xs text-gray-500">{r.item_code}</div></td>
                  <td>{r.linked_site || '-'}</td>
                  <td>{r.received_qty || 0}</td>
                  <td>{r.consumed_qty || 0}</td>
                  <td>{r.balance_qty || 0}</td>
                  <td>{r.last_grn_ref || '-'}</td>
                  <td>{r.last_receipt_note || '-'}</td>
                </tr>
              ))}
            </tbody></table></div>
          </div>
        </div>
      </RegisterPage>

      {/* Receipt Modal */}
      <FormModal open={showReceipt} title="Project Receipt Update" size="lg" busy={saving} confirmLabel="Save Receipt" onConfirm={handleReceipt} onCancel={() => setShowReceipt(false)} fields={[
        { name: 'item_code', label: 'Item Code', type: 'text', required: true },
        { name: 'item_name', label: 'Item Name', type: 'text' },
        { name: 'unit', label: 'Unit', type: 'text' },
        { name: 'received_qty', label: 'Received Qty', type: 'number', required: true },
        { name: 'linked_site', label: 'Site', type: 'select', options: siteOptions },
        { name: 'last_grn_ref', label: 'GRN Ref', type: 'text' },
        { name: 'last_receipt_note', label: 'Receipt Note', type: 'textarea' },
      ]} />

      {/* Consumption Modal */}
      <FormModal open={showConsumption} title="Material Consumption Report" size="lg" busy={saving} confirmLabel="Submit Report" onConfirm={handleConsumption} onCancel={() => setShowConsumption(false)} fields={[
        { name: 'report_date', label: 'Report Date', type: 'date' },
        { name: 'linked_site', label: 'Site', type: 'select', options: siteOptions },
        { name: 'item_code', label: 'Item Code', type: 'text', required: true },
        { name: 'item_name', label: 'Item Name', type: 'text' },
        { name: 'unit', label: 'Unit', type: 'text' },
        { name: 'consumed_qty', label: 'Consumed Qty', type: 'number', required: true },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]} />

      {/* Indent Modal */}
      <FormModal open={showIndent} title="Raise Project Indent" size="lg" busy={saving} confirmLabel="Create Indent" onConfirm={handleIndent} onCancel={() => setShowIndent(false)} fields={[
        { name: 'item_code', label: 'Item Code', type: 'text', required: true },
        { name: 'qty', label: 'Required Qty', type: 'number', required: true },
        { name: 'uom', label: 'Unit', type: 'text' },
        { name: 'schedule_date', label: 'Required By', type: 'date' },
        { name: 'linked_site', label: 'Site', type: 'select', options: siteOptions },
        { name: 'warehouse', label: 'Warehouse', type: 'text' },
        { name: 'remarks', label: 'Justification / Note', type: 'textarea' },
      ]} />
    </>
  );
}
