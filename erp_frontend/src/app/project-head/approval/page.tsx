'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckSquare, ShoppingCart, RefreshCcw, Wallet,
  CheckCircle2, XCircle, Clock, ChevronRight, Filter,
  FileText, User, Calendar, IndianRupee, AlertCircle,
  Loader2, ExternalLink,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';

type Tab = 'po' | 'rma_po' | 'petty_cash';

interface ApprovalItem {
  name: string;
  source_type: string;
  source_id?: string;
  source_name?: string;
  originating_module?: string;
  project?: string;
  raised_by?: string;
  raised_on?: string;
  amount?: number;
  status?: string;
  linked_record?: string;
  priority?: string;
  remarks?: string;
  ph_approver?: string;
  ph_approval_date?: string;
}

interface Stats {
  pending?: number;
  approved?: number;
  rejected?: number;
  forwarded?: number;
}

const TAB_CONFIG: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'po', label: 'Purchase Orders', icon: ShoppingCart },
  { key: 'rma_po', label: 'RMA PO', icon: RefreshCcw },
  { key: 'petty_cash', label: 'Petty Cash Requests', icon: Wallet },
];

const STATUS_BADGE: Record<string, string> = {
  Draft: 'badge-yellow',
  'Submitted to PH': 'badge-blue',
  'Approved by PH': 'badge-green',
  'Rejected by PH': 'badge-red',
  'Forwarded to Costing': 'badge-purple',
  'Disbursed / Released': 'badge-gray',
};

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

export default function PHApprovalHubPage() {
  const [tab, setTab] = useState<Tab>('po');
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('Submitted to PH');

  // Action modal
  const [actionTarget, setActionTarget] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ tab });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/approval-hub?${params}`).then(r => r.json());
      setItems(res.data || []);
      setStats(res.stats || {});
    } catch {
      setError('Failed to load approval items');
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openAction = (item: ApprovalItem, type: 'approve' | 'reject') => {
    setActionTarget(item);
    setActionType(type);
    setRemarks('');
    setSuccessMsg('');
    setError('');
  };

  const submitAction = async () => {
    if (!actionTarget || !actionType) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/approval-hub/${encodeURIComponent(actionTarget.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, remarks }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message || 'Action failed');
      setSuccessMsg(`${actionType === 'approve' ? 'Approved' : 'Rejected'} successfully`);
      setActionTarget(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const pendingCount = items.filter(i => i.status === 'Submitted to PH').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            Approval Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve POs, RMA POs and petty cash requests</p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            {pendingCount} awaiting decision
          </span>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="amber" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} color="green" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} color="red" />
        <StatCard label="Forwarded to Costing" value={stats.forwarded} icon={ChevronRight} color="purple" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Status:</span>
        {['', 'Submitted to PH', 'Approved by PH', 'Rejected by PH', 'Forwarded to Costing'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white border-blue-600'
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
          <h3 className="font-semibold text-gray-900 capitalize">
            {TAB_CONFIG.find(t => t.key === tab)?.label}
          </h3>
          <span className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
            <CheckSquare className="w-10 h-10" />
            <p className="text-sm">No items found for this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Project</th>
                  <th>Raised By</th>
                  <th>Raised On</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.name} className="hover:bg-gray-50">
                    <td>
                      <div className="font-medium text-gray-900 text-sm">{item.source_id || item.name}</div>
                      {item.originating_module && (
                        <div className="text-xs text-gray-400">{item.originating_module}</div>
                      )}
                    </td>
                    <td className="text-sm text-gray-700">{item.project || '-'}</td>
                    <td>
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <User className="w-3 h-3 text-gray-400" />
                        {item.raised_by || '-'}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(item.raised_on)}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                        <IndianRupee className="w-3 h-3 text-gray-400" />
                        {fmt(item.amount)}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[item.status || ''] || 'badge-gray'}`}>
                        {item.status || '-'}
                      </span>
                    </td>
                    <td>
                      {item.priority ? (
                        <span className={`badge ${item.priority === 'High' ? 'badge-red' : item.priority === 'Medium' ? 'badge-yellow' : 'badge-gray'}`}>
                          {item.priority}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        {item.linked_record && (
                          <Link
                            href={item.linked_record}
                            className="btn btn-xs btn-ghost flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View
                          </Link>
                        )}
                        <Link
                          href={`/project-head/approval/${encodeURIComponent(item.name)}`}
                          className="btn btn-xs btn-secondary"
                        >
                          Details
                        </Link>
                        {item.status === 'Submitted to PH' && (
                          <>
                            <button
                              className="btn btn-xs btn-success"
                              onClick={() => openAction(item, 'approve')}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button
                              className="btn btn-xs btn-error"
                              onClick={() => openAction(item, 'reject')}
                            >
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

      {/* Approve / Reject modal */}
      {actionTarget && actionType && (
        <ActionModal
          open={actionTarget !== null && actionType !== null}
          title={actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
          description={`${actionType === 'approve' ? 'Approve' : 'Reject'} request ${actionTarget.source_id || actionTarget.name} (${fmt(actionTarget.amount)})?`}
          confirmLabel={actionType === 'approve' ? 'Approve' : 'Reject'}
          variant={actionType === 'approve' ? 'success' : 'danger'}
          busy={busy}
          onCancel={() => setActionTarget(null)}
          onConfirm={submitAction}
        >
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Remarks</label>
            <textarea
              className="input w-full text-sm"
              placeholder={actionType === 'reject' ? 'Reason for rejection (required)' : 'Optional remarks…'}
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
