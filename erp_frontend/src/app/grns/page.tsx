'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { formatCurrency, formatDate } from '@/components/procurement/proc-helpers';

type ReceiptStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type ReceiptType = 'VENDOR' | 'PROJECT_RETURN' | 'WARRANTY_REPLACEMENT' | 'REPAIR_RETURN' | 'INTERNAL_TRANSFER' | 'OTHER';

interface GRN {
  name: string;
  receipt_date?: string;
  receipt_type?: ReceiptType;
  status?: ReceiptStatus;
  received_from?: string;
  linked_project?: string;
  warehouse?: string;
  total_items?: number;
  total_qty?: number;
  total_value?: number;
  vendor_invoice_reference?: string;
}
interface GRNStats { total?: number; draft?: number; submitted?: number; approved?: number; rejected?: number; }

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
};

const TYPE_LABEL: Record<string, string> = {
  VENDOR: 'Vendor',
  PROJECT_RETURN: 'Project Return',
  WARRANTY_REPLACEMENT: 'Warranty',
  REPAIR_RETURN: 'Repair Return',
  INTERNAL_TRANSFER: 'Internal Transfer',
  OTHER: 'Other',
};

export default function GRNsPage() {
  const [items, setItems] = useState<GRN[]>([]);
  const [stats, setStats] = useState<GRNStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async (status = statusFilter) => {
    setLoading(true); setError('');
    try {
      const qs = status ? `?status=${status}` : '';
      const [lr, sr] = await Promise.all([
        fetch(`/api/grns${qs}`).then(r => r.json()),
        fetch('/api/grns/stats').then(r => r.json()),
      ]);
      setItems(lr.data || []);
      setStats(sr.data || {});
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (v: Record<string, string>) => {
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/grns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_date: v.receipt_date || new Date().toISOString().slice(0, 10),
          receipt_type: v.receipt_type || 'VENDOR',
          received_from: v.received_from || '',
          supplier_link: v.supplier_link || '',
          linked_project: v.linked_project || '',
          linked_purchase_order: v.linked_purchase_order || '',
          warehouse: v.warehouse || '',
          vendor_invoice_reference: v.vendor_invoice_reference || '',
          remarks: v.remarks || '',
        }),
      });
      const p = await res.json();
      if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      setShowCreate(false);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setCreating(false); }
  };

  const handleStatusFilter = (s: string) => { setStatusFilter(s); load(s); };

  return (
    <RegisterPage
      title="Material Receipts (GRN)"
      description="Track inward material receipts — vendor deliveries, project returns, warranty replacements and more."
      loading={loading} error={error} onRetry={() => load()}
      stats={[
        { label: 'Total', value: stats.total ?? items.length },
        { label: 'Draft', value: stats.draft ?? 0 },
        { label: 'Pending Approval', value: stats.submitted ?? 0 },
        { label: 'Approved', value: stats.approved ?? 0 },
      ]}
      headerActions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Receipt</button>}
    >
      {/* Status filter */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(s => (
          <button
            key={s}
            onClick={() => handleStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>GRN #</th>
            <th>Date</th>
            <th>Type</th>
            <th>Received From</th>
            <th>Project</th>
            <th>Warehouse</th>
            <th>Invoice Ref</th>
            <th className="text-right">Items</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0
            ? <tr><td colSpan={11} className="text-center py-8 text-gray-500">No material receipts found</td></tr>
            : items.map(g => (
              <tr key={g.name}>
                <td><Link href={`/grns/${encodeURIComponent(g.name)}`} className="font-medium text-blue-700 hover:underline">{g.name}</Link></td>
                <td className="text-gray-700">{formatDate(g.receipt_date)}</td>
                <td className="text-gray-600 text-xs">{TYPE_LABEL[g.receipt_type || ''] || g.receipt_type || '-'}</td>
                <td className="text-gray-900">{g.received_from || '-'}</td>
                <td className="text-gray-700">{g.linked_project || '-'}</td>
                <td className="text-gray-700">{g.warehouse || '-'}</td>
                <td className="text-gray-500 text-xs">{g.vendor_invoice_reference || '-'}</td>
                <td className="text-right text-gray-700">{g.total_items ?? '-'}</td>
                <td className="text-right text-gray-700">{g.total_qty ?? '-'}</td>
                <td className="text-right font-medium">{formatCurrency(g.total_value)}</td>
                <td>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[g.status || ''] || 'bg-gray-100 text-gray-600'}`}>
                    {g.status || 'DRAFT'}
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <FormModal
        open={showCreate}
        title="New Material Receipt"
        description="Create a new inward GRN — vendor delivery, project return, etc."
        busy={creating}
        fields={[
          { name: 'receipt_date', label: 'Receipt Date', type: 'date' as const },
          { name: 'receipt_type', label: 'Receipt Type', type: 'select' as const, options: [
            { value: 'VENDOR', label: 'Vendor Delivery' },
            { value: 'PROJECT_RETURN', label: 'Project Return' },
            { value: 'WARRANTY_REPLACEMENT', label: 'Warranty Replacement' },
            { value: 'REPAIR_RETURN', label: 'Repair Return' },
            { value: 'INTERNAL_TRANSFER', label: 'Internal Transfer' },
            { value: 'OTHER', label: 'Other' },
          ]},
          { name: 'received_from', label: 'Received From (Vendor / Site)', type: 'text' as const },
          { name: 'supplier_link', label: 'Supplier', type: 'link' as const, linkEntity: 'vendor' as const },
          { name: 'linked_project', label: 'Project', type: 'link' as const, linkEntity: 'project' as const },
          { name: 'linked_purchase_order', label: 'Purchase Order', type: 'link' as const, linkEntity: 'purchase_order' as const },
          { name: 'warehouse', label: 'Warehouse', type: 'link' as const, linkEntity: 'warehouse' as const },
          { name: 'vendor_invoice_reference', label: 'Vendor Invoice No.', type: 'text' as const },
          { name: 'remarks', label: 'Remarks', type: 'textarea' as const },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />
    </RegisterPage>
  );
}

export default function GRNsPage() {
  const [items, setItems] = useState<GRN[]>([]);
  const [stats, setStats] = useState<GRNStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [lr, sr] = await Promise.all([fetch('/api/grns').then(r => r.json()), fetch('/api/grns/stats').then(r => r.json())]);
      setItems(lr.data || []); setStats(sr.data || {});
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (v: Record<string, string>) => {
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/grns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
      const p = await res.json(); if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      setShowCreate(false); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setCreating(false); }
  };

  return (
    <RegisterPage
      title="Goods Receipt Notes"
      description="Receive goods against purchase orders and track GRN status."
      loading={loading} error={error} onRetry={load}
      stats={[
        { label: 'Total GRNs', value: stats.total ?? items.length },
        { label: 'Draft', value: stats.draft ?? 0 },
        { label: 'Completed', value: stats.completed ?? 0 },
        { label: 'Returns', value: stats.return_count ?? 0 },
      ]}
      headerActions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create GRN</button>}
    >
      <table className="data-table">
        <thead><tr><th>GRN #</th><th>Supplier</th><th>Date</th><th>Project</th><th>Warehouse</th><th>Status</th><th className="text-right">Total</th></tr></thead>
        <tbody>
          {items.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-500">No GRN records found</td></tr> : items.map(g => (
            <tr key={g.name}>
              <td><Link href={`/grns/${encodeURIComponent(g.name)}`} className="font-medium text-blue-700 hover:underline">{g.name}</Link></td>
              <td className="text-gray-900">{g.supplier || '-'}</td>
              <td className="text-gray-700">{g.posting_date || '-'}</td>
              <td className="text-gray-700">{g.project || '-'}</td>
              <td className="text-gray-700">{g.set_warehouse || '-'}</td>
              <td><span className={`badge ${badge(GRN_BADGES, g.status)}`}>{g.status || 'Draft'}</span></td>
              <td className="text-right font-medium">{formatCurrency(g.grand_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <FormModal
        open={showCreate}
        title="Create GRN"
        description="Receive goods against a purchase order."
        busy={creating}
        fields={[
          { name: 'purchase_order', label: 'Purchase Order', type: 'link' as const, linkEntity: 'purchase_order' as const, placeholder: 'Search PO…' },
          { name: 'supplier', label: 'Supplier', type: 'link' as const, linkEntity: 'vendor' as const },
          { name: 'project', label: 'Project', type: 'link' as const, linkEntity: 'project' as const },
          { name: 'set_warehouse', label: 'Warehouse', type: 'link' as const, linkEntity: 'warehouse' as const },
          { name: 'posting_date', label: 'Posting Date', type: 'date' as const },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />
    </RegisterPage>
  );
}