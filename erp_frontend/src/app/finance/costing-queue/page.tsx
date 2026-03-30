'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Inbox, ShoppingCart, RefreshCcw, Wallet, CheckCircle2,
  XCircle, Clock, Pause, Filter, User, Calendar,
  IndianRupee, AlertCircle, Loader2, ExternalLink, Building2,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';

interface QueueItem {
  name: string;
  source_type?: string;
  source_id?: string;
  ph_approver?: string;
  ph_approval_date?: string;
  amount?: number;
  project?: string;
  vendor_beneficiary?: string;
  disbursement_status?: string;
  entry_label?: string;
  linked_record?: string;
}

interface QueueStats {
  pending?: number;
  released?: number;
  held?: number;
  rejected?: number;
}

const SOURCE_BADGE: Record<string, string> = {
  PO: 'badge-blue',
  'RMA PO': 'badge-purple',
  'Petty Cash': 'badge-amber',
};

const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-yellow',
  Released: 'badge-green',
  Held: 'badge-orange',
  Rejected: 'badge-red',
  'Disbursed / Released': 'badge-gray',
};

type ActionType = 'release' | 'hold' | 'reject';

function fmt(n?: number) {
  if (!n) return '₹ 0';
  return `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value?: number; icon: React.ElementType; color: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-${color}-50`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value ?? 0}</p>
      </div>
    </div>
  );
}

const SOURCE_TYPES = ['', 'PO', 'RMA PO', 'Petty Cash'];
const STATUSES = ['', 'Pending', 'Released', 'Held', 'Rejected'];

export default function CostingQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [successMsg, setSuccessMsg] = useState('');

  const [actionTarget, setActionTarget] = useState<QueueItem | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (sourceFilter) params.set('source_type', sourceFilter);
      const res = await fetch(`/api/costing-queue?${params}`).then(r => r.json());
      setItems(res.data || []);
      setStats(res.stats || {});
    } catch {
      setError('Failed to load costing queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter]);

  useEffect(() => { load(); }, [load]);

  const openAction = (item: QueueItem, type: ActionType) => {
    setActionTarget(item);
    setActionType(type);
    setRemarks('');
    setError('');
  };

  const submitAction = async () => {
    if (!actionTarget || !actionType) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/costing-queue/${encodeURIComponent(actionTarget.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, remarks }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message || 'Action failed');
      const labels: Record<ActionType, string> = {
        release: 'Released / disbursed',
        hold: 'Held',
        reject: 'Rejected',
      };
      setSuccessMsg(labels[actionType]);
      setActionTarget(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Inbox className="w-6 h-6 text-purple-600" />
            Costing Queue
          </h1>
          <p className="text-sm text-gray-500 mt-1">PH-approved items awaiting costing release or disbursement</p>
        </div>
        {(stats.pending ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            {stats.pending} pending action
          </span>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="amber" />
        <StatCard label="Released" value={stats.released} icon={CheckCircle2} color="green" />
        <StatCard label="Held" value={stats.held} icon={Pause} color="orange" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Source:</span>
        {SOURCE_TYPES.map(s => (
          <button
            key={s}
            onClick={() => setSourceFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              sourceFilter === s
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
        <span className="text-sm text-gray-500 ml-3">Status:</span>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 flex items-center justify-between">
          {successMsg}
          <button onClick={() => setSuccessMsg('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Queue</h3>
          <span className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
            <Inbox className="w-10 h-10" />
            <p className="text-sm">Queue is empty for this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Source</th>
                  <th>PH Approver</th>
                  <th>Approved On</th>
                  <th>Amount</th>
                  <th>Project</th>
                  <th>Vendor / Beneficiary</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.name} className="hover:bg-gray-50">
                    <td>
                      <div className="text-sm font-medium text-gray-900">{item.entry_label || item.name}</div>
                      <div className="text-xs text-gray-400">{item.source_id}</div>
                    </td>
                    <td>
                      <span className={`badge ${SOURCE_BADGE[item.source_type || ''] || 'badge-gray'}`}>
                        {item.source_type || '-'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <User className="w-3 h-3 text-gray-400" />
                        {item.ph_approver || '-'}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(item.ph_approval_date)}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                        <IndianRupee className="w-3 h-3 text-gray-400" />
                        {fmt(item.amount)}
                      </div>
                    </td>
                    <td className="text-sm text-gray-700">{item.project || '-'}</td>
                    <td>
                      {item.vendor_beneficiary ? (
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          {item.vendor_beneficiary}
                        </div>
                      ) : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[item.disbursement_status || ''] || 'badge-gray'}`}>
                        {item.disbursement_status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        {item.linked_record && (
                          <Link href={item.linked_record} className="btn btn-xs btn-ghost flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Source
                          </Link>
                        )}
                        <Link
                          href={`/finance/costing-queue/${encodeURIComponent(item.name)}`}
                          className="btn btn-xs btn-secondary"
                        >
                          Details
                        </Link>
                        {(!item.disbursement_status || item.disbursement_status === 'Pending') && (
                          <>
                            <button className="btn btn-xs btn-success" onClick={() => openAction(item, 'release')}>
                              <CheckCircle2 className="w-3 h-3" /> Release
                            </button>
                            <button className="btn btn-xs btn-warning" onClick={() => openAction(item, 'hold')}>
                              <Pause className="w-3 h-3" /> Hold
                            </button>
                            <button className="btn btn-xs btn-error" onClick={() => openAction(item, 'reject')}>
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action modal */}
      {actionTarget && actionType && (
        <ActionModal
          open={actionTarget !== null && actionType !== null}
          title={
            actionType === 'release' ? 'Release / Disburse'
            : actionType === 'hold' ? 'Hold Entry'
            : 'Reject Entry'
          }
          description={`${
            actionType === 'release' ? 'Mark as released / disbursed'
            : actionType === 'hold' ? 'Put on hold'
            : 'Reject and return'
          }: ${actionTarget.entry_label || actionTarget.name} (${fmt(actionTarget.amount)})?`}
          confirmLabel={
            actionType === 'release' ? 'Release' : actionType === 'hold' ? 'Hold' : 'Reject'
          }
          variant={actionType === 'release' ? 'success' : actionType === 'hold' ? 'default' : 'danger'}
          busy={busy}
          onCancel={() => setActionTarget(null)}
          onConfirm={submitAction}
        >
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Remarks</label>
            <textarea
              className="input w-full text-sm"
              placeholder="Add remarks…"
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>
        </ActionModal>
      )}
    </div>
  );
}
