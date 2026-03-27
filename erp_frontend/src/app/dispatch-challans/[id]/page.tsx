'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, Warehouse, MapPin,
  Truck, Package, CheckCircle2, XCircle, Send, Hash, FileText,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import ActionModal from '@/components/ui/ActionModal';
import { useAuth } from '@/context/AuthContext';

/* ─── types ─────────────────────────────────────────────────────────── */
interface ChallanItem {
  item_code?: string;
  item_name?: string;
  qty?: number;
  uom?: string;
  rate?: number;
  amount?: number;
}

interface ChallanDetail {
  name: string;
  dispatch_date?: string;
  dispatch_type?: string;
  status?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  target_site_name?: string;
  linked_project?: string;
  linked_stock_entry?: string;
  total_items?: number;
  total_qty?: number;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  remarks?: string;
  items?: ChallanItem[];
  creation?: string;
  modified?: string;
  owner?: string;
}

/* ─── helpers ───────────────────────────────────────────────────────── */
function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = status || 'DRAFT';
  const style =
    s === 'DISPATCHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'APPROVED' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s.replace(/_/g, ' ')}</span>;
}

/* ─── page ──────────────────────────────────────────────────────────── */
export default function DispatchChallanDetailPage() {
  const params = useParams();
  const challanName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<ChallanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  /* ── role helpers ── */
  const currentRole = currentUser?.roles?.[0] || '';
  const approvalRoles = new Set(['Store Manager', 'Store Approver', 'Project Head', 'Director']);
  const writeRoles = new Set(['Store Keeper', 'Store Manager', 'Store Approver', 'Procurement Manager', 'Director']);
  const canApprove = approvalRoles.has(currentRole);
  const canWrite = writeRoles.has(currentRole);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dispatch-challans/${encodeURIComponent(challanName)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [challanName]);

  useEffect(() => { reload(); }, [reload]);

  const runAction = async (action: string, extra?: Record<string, string>) => {
    setActionBusy(action);
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch(`/api/dispatch-challans/${encodeURIComponent(challanName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      setSuccessMsg(payload.message || 'Done');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionBusy(null);
    }
  };

  /* ── loading / error states ── */
  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">{error || 'Dispatch challan not found'}</p>
        <Link href="/dispatch-challans" className="text-sm text-blue-600 hover:underline">← Back to list</Link>
      </div>
    );
  }

  const dc = data;
  const items = dc.items || [];

  return (
    <div className="space-y-6">
      {/* ── header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dispatch-challans" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />Back to Dispatch Challans
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{challanName}</h1>
          <p className="text-sm text-gray-500 mt-1">{dc.dispatch_type || 'Dispatch Challan'} — {formatDate(dc.dispatch_date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={dc.status} />

          {dc.status === 'DRAFT' && canWrite && (
            <button onClick={() => runAction('submit')} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          {dc.status === 'PENDING_APPROVAL' && canApprove && (
            <>
              <button onClick={() => runAction('approve')} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" />{actionBusy === 'approve' ? 'Approving...' : 'Approve'}
              </button>
              <button onClick={() => setRejectModal(true)} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <XCircle className="h-3.5 w-3.5" />Reject
              </button>
            </>
          )}
          {dc.status === 'APPROVED' && canWrite && (
            <button onClick={() => runAction('dispatch')} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
              <Truck className="h-3.5 w-3.5" />{actionBusy === 'dispatch' ? 'Dispatching...' : 'Mark Dispatched'}
            </button>
          )}
        </div>
      </div>

      {/* ── messages ── */}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
      {dc.status === 'REJECTED' && dc.rejection_reason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-xs font-semibold text-rose-800">Rejection Reason</p>
          <p className="text-sm text-rose-700 mt-1">{dc.rejection_reason}</p>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Package className="w-5 h-5" /></div><div><div className="stat-value">{dc.total_items ?? 0}</div><div className="stat-label">Total Items</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600"><Hash className="w-5 h-5" /></div><div><div className="stat-value">{dc.total_qty ?? 0}</div><div className="stat-label">Total Qty</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><Warehouse className="w-5 h-5" /></div><div><div className="stat-value text-sm">{dc.from_warehouse || '-'}</div><div className="stat-label">From Warehouse</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><MapPin className="w-5 h-5" /></div><div><div className="stat-value text-sm">{dc.target_site_name || dc.to_warehouse || '-'}</div><div className="stat-label">To Site / Warehouse</div></div></div></div>
      </div>

      {/* ── detail card ── */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Challan Details</h3></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Dispatch Date</div><div className="font-medium text-gray-900">{formatDate(dc.dispatch_date)}</div></div></div>
          <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Dispatch Type</div><div className="font-medium text-gray-900">{dc.dispatch_type || '-'}</div></div></div>
          <div className="flex items-start gap-3"><Warehouse className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">From Warehouse</div><div className="font-medium text-gray-900">{dc.from_warehouse || '-'}</div></div></div>
          <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">To Warehouse / Site</div><div className="font-medium text-gray-900">{dc.to_warehouse || '-'}{dc.target_site_name ? ` (${dc.target_site_name})` : ''}</div></div></div>
          {dc.linked_project && (
            <div className="flex items-start gap-3"><Package className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Linked Project</div><Link href={`/projects/${encodeURIComponent(dc.linked_project)}`} className="font-medium text-blue-700 hover:underline">{dc.linked_project}</Link></div></div>
          )}
          {dc.linked_stock_entry && (
            <div className="flex items-start gap-3"><Hash className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Stock Entry</div><div className="font-medium text-gray-900">{dc.linked_stock_entry}</div></div></div>
          )}
          {dc.approved_by && (
            <div className="flex items-start gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Approved By</div><div className="font-medium text-gray-900">{dc.approved_by}{dc.approved_at ? ` on ${formatDate(dc.approved_at)}` : ''}</div></div></div>
          )}
          {dc.remarks && (
            <div className="sm:col-span-2 flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Remarks</div><div className="font-medium text-gray-900">{dc.remarks}</div></div></div>
          )}
        </div>
      </div>

      {/* ── line items ── */}
      {items.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Line Items</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Item Code</th><th>Item Name</th><th>Qty</th><th>UOM</th><th>Rate</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-gray-500 text-xs">{idx + 1}</td>
                    <td className="text-sm font-medium text-gray-900">{item.item_code || '-'}</td>
                    <td className="text-sm text-gray-700">{item.item_name || '-'}</td>
                    <td className="text-sm text-gray-700 text-right">{item.qty ?? '-'}</td>
                    <td className="text-sm text-gray-500">{item.uom || '-'}</td>
                    <td className="text-sm text-gray-700 text-right">{item.rate != null ? `₹${item.rate.toLocaleString('en-IN')}` : '-'}</td>
                    <td className="text-sm text-gray-700 text-right">{item.amount != null ? `₹${item.amount.toLocaleString('en-IN')}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── linked records ── */}
      <LinkedRecordsPanel
        links={[
          ...(dc.linked_project ? [{
            label: 'Project',
            doctype: 'GE Project',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Project',
              filters: JSON.stringify({ name: dc.linked_project }),
              fields: JSON.stringify(['name', 'project_name', 'status']),
              limit_page_length: '5',
            },
            href: (name: string) => `/projects/${name}`,
          }] : []),
        ]}
      />

      {/* ── documents + accountability ── */}
      <RecordDocumentsPanel
        referenceDoctype="GE Dispatch Challan"
        referenceName={challanName}
        title="Challan Documents"
      />
      <section>
        <details open>
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-3">Accountability Trail</summary>
          <AccountabilityTimeline
            subjectDoctype="GE Dispatch Challan"
            subjectName={challanName}
          />
        </details>
      </section>

      {/* ── reject modal ── */}
      <ActionModal
        open={rejectModal}
        title="Reject Dispatch Challan"
        description="Provide a reason for rejecting this dispatch challan."
        busy={actionBusy === 'reject'}
        fields={[
          { name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Why is this challan being rejected?' },
        ]}
        onConfirm={async (values) => {
          await runAction('reject', { reason: values.reason || '' });
          setRejectModal(false);
        }}
        onCancel={() => setRejectModal(false)}
      />
    </div>
  );
}
