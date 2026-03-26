'use client';

import { useEffect, useMemo, useState } from 'react';
import { Boxes, ClipboardList, Plus, ReceiptText, Truck, X } from 'lucide-react';
import { usePermissions } from '@/context/PermissionContext';

interface ProjectInventoryRecord {
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
  modified?: string;
}

interface ConsumptionReport {
  name: string;
  linked_project: string;
  linked_site?: string;
  report_date?: string;
  item_code: string;
  item_name?: string;
  unit?: string;
  consumed_qty?: number;
  remarks?: string;
  status?: string;
}

interface ReceivingSummary {
  grns: Array<{
    name: string;
    supplier?: string;
    posting_date?: string;
    status?: string;
    set_warehouse?: string;
    grand_total?: number;
  }>;
  dispatches: Array<{
    name: string;
    dispatch_date?: string;
    dispatch_type?: string;
    status?: string;
    target_site_name?: string;
    total_items?: number;
    total_qty?: number;
  }>;
}

interface ProjectIndent {
  name: string;
  project?: string | null;
  transaction_date?: string;
  schedule_date?: string;
  status?: string;
  material_request_type?: string;
  accountability_status?: string;
  accountability_owner_role?: string;
  accountability_owner_user?: string;
}

function formatCurrency(value?: number) {
  if (!value) return '₹ 0';
  return `₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function ProjectManagerInventoryPage() {
  const { permissions } = usePermissions();
  const assignedProjects = permissions?.user_context.assigned_projects ?? [];
  const [selectedProject, setSelectedProject] = useState('');
  const [inventory, setInventory] = useState<ProjectInventoryRecord[]>([]);
  const [reports, setReports] = useState<ConsumptionReport[]>([]);
  const [indents, setIndents] = useState<ProjectIndent[]>([]);
  const [receiving, setReceiving] = useState<ReceivingSummary>({ grns: [], dispatches: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [showIndentModal, setShowIndentModal] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [savingConsumption, setSavingConsumption] = useState(false);
  const [savingIndent, setSavingIndent] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    linked_site: '',
    item_code: '',
    item_name: '',
    unit: '',
    received_qty: '',
    last_grn_ref: '',
    last_receipt_note: '',
  });
  const [consumptionForm, setConsumptionForm] = useState({
    linked_site: '',
    report_date: '',
    item_code: '',
    item_name: '',
    unit: '',
    consumed_qty: '',
    remarks: '',
  });
  const [indentForm, setIndentForm] = useState({
    linked_site: '',
    item_code: '',
    qty: '',
    uom: '',
    warehouse: '',
    schedule_date: '',
    remarks: '',
  });

  useEffect(() => {
    if (!selectedProject && assignedProjects.length) {
      setSelectedProject(assignedProjects[0]);
    }
  }, [assignedProjects, selectedProject]);

  const loadData = async (project: string) => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      const [inventoryRes, reportsRes, receivingRes, indentsRes] = await Promise.all([
        fetch('/api/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'get_project_inventory_records', args: { project } }),
        }).then((r) => r.json()),
        fetch('/api/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'get_material_consumption_reports', args: { project } }),
        }).then((r) => r.json()),
        fetch('/api/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'get_project_receiving_summary', args: { project } }),
        }).then((r) => r.json()),
        fetch('/api/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'get_project_indents', args: { project, limit_page_length: 10, limit_start: 0 } }),
        }).then((r) => r.json()),
      ]);

      if (inventoryRes.success === false) throw new Error(inventoryRes.message || 'Failed to load project inventory');
      if (reportsRes.success === false) throw new Error(reportsRes.message || 'Failed to load material consumption reports');
      if (receivingRes.success === false) throw new Error(receivingRes.message || 'Failed to load project receiving summary');
      if (indentsRes.success === false) throw new Error(indentsRes.message || 'Failed to load project indents');

      setInventory(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
      setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
      setReceiving(receivingRes.data || { grns: [], dispatches: [] });
      setIndents(Array.isArray(indentsRes.data) ? indentsRes.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project inventory');
      setInventory([]);
      setReports([]);
      setReceiving({ grns: [], dispatches: [] });
      setIndents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      void loadData(selectedProject);
    }
  }, [selectedProject]);

  const totals = useMemo(() => {
    return inventory.reduce(
      (acc, row) => {
        acc.received += Number(row.received_qty || 0);
        acc.consumed += Number(row.consumed_qty || 0);
        acc.balance += Number(row.balance_qty || 0);
        return acc;
      },
      { received: 0, consumed: 0, balance: 0 },
    );
  }, [inventory]);

  const handleReceiptSave = async () => {
    if (!selectedProject || !receiptForm.item_code.trim() || !(Number(receiptForm.received_qty) > 0)) {
      setError('Project, item code, and received quantity are required.');
      return;
    }
    setSavingReceipt(true);
    setError('');
    try {
      const response = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'record_project_inventory_receipt',
          args: {
            data: JSON.stringify({
              linked_project: selectedProject,
              linked_site: receiptForm.linked_site || undefined,
              item_code: receiptForm.item_code.trim(),
              item_name: receiptForm.item_name.trim() || undefined,
              unit: receiptForm.unit.trim() || undefined,
              received_qty: Number(receiptForm.received_qty),
              last_grn_ref: receiptForm.last_grn_ref.trim() || undefined,
              last_receipt_note: receiptForm.last_receipt_note.trim() || undefined,
            }),
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to update project inventory');
      }
      setShowReceiptModal(false);
      setReceiptForm({ linked_site: '', item_code: '', item_name: '', unit: '', received_qty: '', last_grn_ref: '', last_receipt_note: '' });
      await loadData(selectedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project inventory');
    } finally {
      setSavingReceipt(false);
    }
  };

  const handleConsumptionSave = async () => {
    if (!selectedProject || !consumptionForm.item_code.trim() || !(Number(consumptionForm.consumed_qty) > 0)) {
      setError('Project, item code, and consumed quantity are required.');
      return;
    }
    setSavingConsumption(true);
    setError('');
    try {
      const response = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create_material_consumption_report',
          args: {
            data: JSON.stringify({
              linked_project: selectedProject,
              linked_site: consumptionForm.linked_site || undefined,
              report_date: consumptionForm.report_date || undefined,
              item_code: consumptionForm.item_code.trim(),
              item_name: consumptionForm.item_name.trim() || undefined,
              unit: consumptionForm.unit.trim() || undefined,
              consumed_qty: Number(consumptionForm.consumed_qty),
              remarks: consumptionForm.remarks.trim() || undefined,
            }),
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to submit material consumption report');
      }
      setShowConsumptionModal(false);
      setConsumptionForm({ linked_site: '', report_date: '', item_code: '', item_name: '', unit: '', consumed_qty: '', remarks: '' });
      await loadData(selectedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit material consumption report');
    } finally {
      setSavingConsumption(false);
    }
  };

  const handleIndentSave = async () => {
    if (!selectedProject || !indentForm.item_code.trim() || !(Number(indentForm.qty) > 0)) {
      setError('Project, item code, and required quantity are required.');
      return;
    }
    setSavingIndent(true);
    setError('');
    try {
      const response = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create_project_indent',
          args: {
            data: JSON.stringify({
              project: selectedProject,
              linked_site: indentForm.linked_site || undefined,
              item_code: indentForm.item_code.trim(),
              qty: Number(indentForm.qty),
              uom: indentForm.uom.trim() || undefined,
              warehouse: indentForm.warehouse.trim() || undefined,
              schedule_date: indentForm.schedule_date || undefined,
              remarks: indentForm.remarks.trim() || undefined,
            }),
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to create project indent');
      }
      setShowIndentModal(false);
      setIndentForm({
        linked_site: '',
        item_code: '',
        qty: '',
        uom: '',
        warehouse: '',
        schedule_date: '',
        remarks: '',
      });
      await loadData(selectedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project indent');
    } finally {
      setSavingIndent(false);
    }
  };

  if (!assignedProjects.length) {
    return (
      <div className="card">
        <div className="card-body py-12 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Project Inventory</h1>
          <p className="mt-2 text-sm text-gray-500">No assigned projects were found for this Project Manager.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">Project-only receiving, GRN follow-through, and material consumption for assigned projects.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select className="input min-w-[240px]" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            {assignedProjects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => setShowReceiptModal(true)}>
            <Plus className="h-4 w-4" />
            Update Receipt
          </button>
          <button className="btn btn-secondary" onClick={() => setShowIndentModal(true)}>
            <ReceiptText className="h-4 w-4" />
            Raise Indent
          </button>
          <button className="btn btn-primary" onClick={() => setShowConsumptionModal(true)}>
            <ClipboardList className="h-4 w-4" />
            Material Consumption
          </button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="stat-card"><div className="stat-value">{inventory.length}</div><div className="stat-label">Tracked Items</div></div>
        <div className="stat-card"><div className="stat-value">{totals.received}</div><div className="stat-label">Received Qty</div></div>
        <div className="stat-card"><div className="stat-value">{totals.consumed}</div><div className="stat-label">Consumed Qty</div></div>
        <div className="stat-card"><div className="stat-value">{totals.balance}</div><div className="stat-label">Available Balance</div></div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="font-semibold text-gray-900">Receiving Context</h3>
              <p className="mt-1 text-xs text-gray-500">Read-only GRNs and dispatches for the selected project.</p>
            </div>
          </div>
          <div className="card-body space-y-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900"><ReceiptText className="h-4 w-4 text-blue-600" />GRNs</div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>ID</th><th>Supplier</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
                  <tbody>
                    {(receiving.grns || []).length === 0 ? (
                      <tr><td colSpan={5} className="py-6 text-center text-sm text-gray-500">No GRNs found for this project.</td></tr>
                    ) : (
                      receiving.grns.map((row) => (
                        <tr key={row.name}>
                          <td className="font-medium text-gray-900">{row.name}</td>
                          <td>{row.supplier || '-'}</td>
                          <td>{row.posting_date || '-'}</td>
                          <td>{row.status || '-'}</td>
                          <td>{formatCurrency(row.grand_total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900"><Truck className="h-4 w-4 text-emerald-600" />Dispatches</div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Site</th><th>Status</th></tr></thead>
                  <tbody>
                    {(receiving.dispatches || []).length === 0 ? (
                      <tr><td colSpan={5} className="py-6 text-center text-sm text-gray-500">No dispatches found for this project.</td></tr>
                    ) : (
                      receiving.dispatches.map((row) => (
                        <tr key={row.name}>
                          <td className="font-medium text-gray-900">{row.name}</td>
                          <td>{row.dispatch_date || '-'}</td>
                          <td>{row.dispatch_type || '-'}</td>
                          <td>{row.target_site_name || '-'}</td>
                          <td>{row.status || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="font-semibold text-gray-900">Material Consumption Reports</h3>
              <p className="mt-1 text-xs text-gray-500">Reports submitted upward to Project Head from this project only.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Date</th><th>Item</th><th>Qty</th><th>Status</th></tr></thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">No material consumption reports yet.</td></tr>
                ) : (
                  reports.map((row) => (
                    <tr key={row.name}>
                      <td className="font-medium text-gray-900">{row.name}</td>
                      <td>{row.report_date || '-'}</td>
                      <td>{row.item_name || row.item_code}</td>
                      <td>{row.consumed_qty || 0}{row.unit ? ` ${row.unit}` : ''}</td>
                      <td>{row.status || 'Submitted'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="font-semibold text-gray-900">Project Indent Requests</h3>
            <p className="mt-1 text-xs text-gray-500">Create and monitor project-scoped indents from the PM inventory lane.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Date</th><th>Required By</th><th>Status</th><th>Action Owner</th><th>Type</th></tr></thead>
            <tbody>
              {indents.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-500">No project indents raised yet.</td></tr>
              ) : (
                indents.map((row) => (
                  <tr key={row.name}>
                    <td className="font-medium text-gray-900">{row.name}</td>
                    <td>{row.transaction_date || '-'}</td>
                    <td>{row.schedule_date || '-'}</td>
                    <td>{row.accountability_status || row.status || 'Draft'}</td>
                    <td>
                      <div>{row.accountability_owner_role || '-'}</div>
                      <div className="text-xs text-gray-500">{row.accountability_owner_user || '-'}</div>
                    </td>
                    <td>{row.material_request_type || 'Purchase'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="font-semibold text-gray-900">Project Inventory Register</h3>
            <p className="mt-1 text-xs text-gray-500">This is the PM-side inventory truth for the selected project, not the HQ warehouse ledger.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Item</th><th>Site</th><th>Received</th><th>Consumed</th><th>Balance</th><th>Last GRN</th><th>Last Note</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-500">Loading project inventory...</td></tr>
              ) : inventory.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-500">No project inventory records found.</td></tr>
              ) : (
                inventory.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <div className="font-medium text-gray-900">{row.item_name || row.item_code}</div>
                      <div className="text-xs text-gray-500">{row.item_code}</div>
                    </td>
                    <td>{row.linked_site || '-'}</td>
                    <td>{row.received_qty || 0}</td>
                    <td>{row.consumed_qty || 0}</td>
                    <td>{row.balance_qty || 0}</td>
                    <td>{row.last_grn_ref || '-'}</td>
                    <td>{row.last_receipt_note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showReceiptModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Project Receipt Update</h2>
              <button className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setShowReceiptModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label><div className="mb-2 text-sm font-medium text-gray-700">Item Code *</div><input className="input" value={receiptForm.item_code} onChange={(e) => setReceiptForm((p) => ({ ...p, item_code: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Item Name</div><input className="input" value={receiptForm.item_name} onChange={(e) => setReceiptForm((p) => ({ ...p, item_name: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Unit</div><input className="input" value={receiptForm.unit} onChange={(e) => setReceiptForm((p) => ({ ...p, unit: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Received Qty *</div><input className="input" type="number" min="0" step="0.01" value={receiptForm.received_qty} onChange={(e) => setReceiptForm((p) => ({ ...p, received_qty: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Linked Site</div><input className="input" value={receiptForm.linked_site} onChange={(e) => setReceiptForm((p) => ({ ...p, linked_site: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">GRN Ref</div><input className="input" value={receiptForm.last_grn_ref} onChange={(e) => setReceiptForm((p) => ({ ...p, last_grn_ref: e.target.value }))} /></label>
              <label className="md:col-span-2"><div className="mb-2 text-sm font-medium text-gray-700">Receipt Note</div><textarea className="input min-h-[96px]" value={receiptForm.last_receipt_note} onChange={(e) => setReceiptForm((p) => ({ ...p, last_receipt_note: e.target.value }))} /></label>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button className="btn btn-secondary" onClick={() => setShowReceiptModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReceiptSave} disabled={savingReceipt}>{savingReceipt ? 'Saving...' : 'Save Receipt Update'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {showConsumptionModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Material Consumption Report</h2>
              <button className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setShowConsumptionModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label><div className="mb-2 text-sm font-medium text-gray-700">Report Date</div><input className="input" type="date" value={consumptionForm.report_date} onChange={(e) => setConsumptionForm((p) => ({ ...p, report_date: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Linked Site</div><input className="input" value={consumptionForm.linked_site} onChange={(e) => setConsumptionForm((p) => ({ ...p, linked_site: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Item Code *</div><input className="input" value={consumptionForm.item_code} onChange={(e) => setConsumptionForm((p) => ({ ...p, item_code: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Item Name</div><input className="input" value={consumptionForm.item_name} onChange={(e) => setConsumptionForm((p) => ({ ...p, item_name: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Unit</div><input className="input" value={consumptionForm.unit} onChange={(e) => setConsumptionForm((p) => ({ ...p, unit: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Consumed Qty *</div><input className="input" type="number" min="0" step="0.01" value={consumptionForm.consumed_qty} onChange={(e) => setConsumptionForm((p) => ({ ...p, consumed_qty: e.target.value }))} /></label>
              <label className="md:col-span-2"><div className="mb-2 text-sm font-medium text-gray-700">Remarks</div><textarea className="input min-h-[96px]" value={consumptionForm.remarks} onChange={(e) => setConsumptionForm((p) => ({ ...p, remarks: e.target.value }))} /></label>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button className="btn btn-secondary" onClick={() => setShowConsumptionModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConsumptionSave} disabled={savingConsumption}>{savingConsumption ? 'Submitting...' : 'Submit Report'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {showIndentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Raise Project Indent</h2>
              <button className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setShowIndentModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label><div className="mb-2 text-sm font-medium text-gray-700">Item Code *</div><input className="input" value={indentForm.item_code} onChange={(e) => setIndentForm((p) => ({ ...p, item_code: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Required Qty *</div><input className="input" type="number" min="0" step="0.01" value={indentForm.qty} onChange={(e) => setIndentForm((p) => ({ ...p, qty: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Unit</div><input className="input" value={indentForm.uom} onChange={(e) => setIndentForm((p) => ({ ...p, uom: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Required By</div><input className="input" type="date" value={indentForm.schedule_date} onChange={(e) => setIndentForm((p) => ({ ...p, schedule_date: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Linked Site</div><input className="input" value={indentForm.linked_site} onChange={(e) => setIndentForm((p) => ({ ...p, linked_site: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Warehouse</div><input className="input" value={indentForm.warehouse} onChange={(e) => setIndentForm((p) => ({ ...p, warehouse: e.target.value }))} /></label>
              <label className="md:col-span-2"><div className="mb-2 text-sm font-medium text-gray-700">Justification / Note</div><textarea className="input min-h-[96px]" value={indentForm.remarks} onChange={(e) => setIndentForm((p) => ({ ...p, remarks: e.target.value }))} /></label>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button className="btn btn-secondary" onClick={() => setShowIndentModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleIndentSave} disabled={savingIndent}>{savingIndent ? 'Creating...' : 'Create Project Indent'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
