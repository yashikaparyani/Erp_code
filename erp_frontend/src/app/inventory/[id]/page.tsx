'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Package,
  Send,
  Truck,
  Warehouse,
  XCircle,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { useAuth } from '@/context/AuthContext';

type ChallanItem = {
  item_link?: string;
  item_code?: string;
  item_name?: string;
  description?: string;
  qty?: number;
  uom?: string;
  remarks?: string;
};

type ChallanDetail = {
  name: string;
  dispatch_date?: string;
  dispatch_type?: string;
  status?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  target_site_name?: string;
  linked_project?: string;
  total_items?: number;
  total_qty?: number;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  remarks?: string;
  owner?: string;
  creation?: string;
  items?: ChallanItem[];
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status?: string }) {
  const current = status || 'DRAFT';
  const style =
    current === 'DISPATCHED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : current === 'APPROVED'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : current === 'PENDING_APPROVAL'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : current === 'REJECTED'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>
      {current.replace(/_/g, ' ')}
    </span>
  );
}

export default function InventoryChallanDetailPage() {
  const params = useParams();
  const challanName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<ChallanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const hasAnyRole = (...roles: string[]) => {
    const assigned = new Set(currentUser?.roles || []);
    return roles.some((role) => assigned.has(role));
  };

  const canCreateOrSubmit = hasAnyRole('Director', 'System Manager', 'Store Manager', 'Stores Logistics Head', 'Procurement Manager', 'Purchase');
  const canApproveReject = hasAnyRole('Director', 'System Manager', 'Project Head', 'Procurement Manager');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/dispatch-challans/${encodeURIComponent(challanName)}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to fetch dispatch challan');
      }
      setData(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dispatch challan');
    } finally {
      setLoading(false);
    }
  }, [challanName]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const runAction = async (action: 'submit' | 'approve' | 'reject' | 'dispatch', reason?: string) => {
    setActionBusy(action);
    setError('');

    try {
      const response = await fetch(`/api/dispatch-challans/${encodeURIComponent(challanName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reason ? { action, reason } : { action }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `Failed to ${action}`);
      }
      setSuccessMsg(payload.message || `${action} completed`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionBusy('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading challan...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-rose-600">{error}</p>
        <Link href="/inventory" className="text-sm text-blue-600 hover:underline">Back to Inventory</Link>
      </div>
    );
  }

  if (!data) return null;

  const items = data.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/inventory" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Inventory
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.dispatch_type || 'Dispatch Challan'} | {formatDate(data.dispatch_date)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          {data.status === 'DRAFT' && canCreateOrSubmit ? (
            <button
              onClick={() => runAction('submit')}
              disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {actionBusy === 'submit' ? 'Submitting...' : 'Submit'}
            </button>
          ) : null}
          {data.status === 'PENDING_APPROVAL' && canApproveReject ? (
            <>
              <button
                onClick={() => runAction('approve')}
                disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {actionBusy === 'approve' ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => setRejectModal(true)}
                disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
            </>
          ) : null}
          {data.status === 'APPROVED' && canCreateOrSubmit ? (
            <button
              onClick={() => runAction('dispatch')}
              disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              <Truck className="h-3.5 w-3.5" />
              {actionBusy === 'dispatch' ? 'Dispatching...' : 'Mark Dispatched'}
            </button>
          ) : null}
        </div>
      </div>

      {successMsg ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div> : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div> : null}
      {data.status === 'REJECTED' && data.rejection_reason ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <strong>Rejection Reason:</strong> {data.rejection_reason}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="stat-value">{data.total_items ?? items.length}</div>
              <div className="stat-label">Total Items</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <div className="stat-value">{data.total_qty ?? 0}</div>
              <div className="stat-label">Total Qty</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="stat-value text-sm">{data.from_warehouse || '-'}</div>
              <div className="stat-label">From</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="stat-value text-sm">{data.to_warehouse || data.target_site_name || '-'}</div>
              <div className="stat-label">To</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Challan Details</h3>
          </div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<FileText key="challan" className="h-3.5 w-3.5" />, 'Challan', data.name],
                [<Calendar key="date" className="h-3.5 w-3.5" />, 'Dispatch Date', formatDate(data.dispatch_date)],
                [<FileText key="type" className="h-3.5 w-3.5" />, 'Type', data.dispatch_type],
                [<Warehouse key="from" className="h-3.5 w-3.5" />, 'From Warehouse', data.from_warehouse],
                [<MapPin key="to" className="h-3.5 w-3.5" />, 'To', data.to_warehouse || data.target_site_name],
                [<Package key="project" className="h-3.5 w-3.5" />, 'Linked Project', data.linked_project],
                [<CheckCircle2 key="approved" className="h-3.5 w-3.5" />, 'Approved By', data.approved_by],
                [<Calendar key="created" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="w-28 shrink-0 text-gray-500">{String(label)}</dt>
                  <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Remarks</h3>
          </div>
          <div className="card-body">
            {data.remarks ? (
              <div className="whitespace-pre-wrap text-sm text-gray-700">{data.remarks}</div>
            ) : (
              <p className="text-sm text-gray-400">No remarks recorded for this challan.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Line Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Description</th>
                <th>Qty</th>
                <th>UOM</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No line items found</td>
                </tr>
              ) : items.map((item, index) => (
                <tr key={`${item.item_link || item.item_code || 'item'}-${index}`}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="font-medium text-gray-900">{item.item_link || item.item_code || '-'}</div>
                    <div className="text-xs text-gray-500">{item.item_name || '-'}</div>
                  </td>
                  <td>{item.description || '-'}</td>
                  <td>{item.qty ?? '-'}</td>
                  <td>{item.uom || '-'}</td>
                  <td>{item.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ActionModal
        open={rejectModal}
        title="Reject Dispatch Challan"
        description={`Reject ${data.name}? Please provide a reason.`}
        confirmLabel="Reject"
        variant="danger"
        busy={actionBusy === 'reject'}
        fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
        onConfirm={async (values) => {
          await runAction('reject', values.reason || '');
          setRejectModal(false);
        }}
        onCancel={() => setRejectModal(false)}
      />
    </div>
  );
}
