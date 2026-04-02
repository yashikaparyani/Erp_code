'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingCart, RefreshCcw, Wallet,
  CheckCircle2, XCircle, Clock, ChevronRight,
  User, Calendar, IndianRupee, ExternalLink,
} from 'lucide-react';
import RegisterPage, { StatItem } from '@/components/shells/RegisterPage';
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

interface Stats { pending?: number; approved?: number; rejected?: number; forwarded?: number }

const TAB_CFG: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'po', label: 'Purchase Orders', icon: ShoppingCart },
  { key: 'rma_po', label: 'RMA PO', icon: RefreshCcw },
  { key: 'petty_cash', label: 'Petty Cash Requests', icon: Wallet },
];

const STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-amber-50 text-amber-700 border-amber-200',
  'Submitted to PH': 'bg-blue-50 text-blue-700 border-blue-200',
  'Approved by PH': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Rejected by PH': 'bg-rose-50 text-rose-700 border-rose-200',
  'Forwarded to Costing': 'bg-purple-50 text-purple-700 border-purple-200',
  'Disbursed / Released': 'bg-gray-50 text-gray-600 border-gray-200',
};

function fmt(n?: number) {
  if (!n) return '₹ 0';
  return `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function fmtDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PHApprovalHubPage() {
  const [tab, setTab] = useState<Tab>('po');
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('Submitted to PH');

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
    } catch { setError('Failed to load approval items'); }
    finally { setLoading(false); }
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
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const statItems: StatItem[] = [
    { label: 'Pending', value: stats.pending ?? 0, variant: 'warning' },
    { label: 'Approved', value: stats.approved ?? 0, variant: 'success' },
    { label: 'Rejected', value: stats.rejected ?? 0, variant: 'error' },
    { label: 'Forwarded to Costing', value: stats.forwarded ?? 0, variant: 'info' },
  ];

  return (
    <>
      <RegisterPage
        title="Approval Hub"
        description="Review and approve POs, RMA POs and petty cash requests"
        loading={loading}
        error={error}
        empty={!loading && items.length === 0}
        emptyTitle="No items found"
        emptyDescription="No approval items match the current filter"
        onRetry={load}
        stats={statItems}
        filterBar={
          <div className="flex flex-wrap items-center gap-3">
            {/* Tabs as pills */}
            <div className="flex gap-1 mr-4">
              {TAB_CFG.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    tab === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>

            <span className="text-xs text-gray-400">Status:</span>
            {['', 'Submitted to PH', 'Approved by PH', 'Rejected by PH', 'Forwarded to Costing'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}>
                {s || 'All'}
              </button>
            ))}
          </div>
        }
        headerActions={
          items.filter(i => i.status === 'Submitted to PH').length > 0
            ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                {items.filter(i => i.status === 'Submitted to PH').length} awaiting decision
              </span>
            : undefined
        }
      >
        {successMsg && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 flex items-center justify-between">
            {successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-2 text-xs font-medium underline">Dismiss</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="data-table">
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
                <tr key={item.name}>
                  <td>
                    <div className="font-medium text-gray-900 text-sm">{item.source_id || item.name}</div>
                    {item.originating_module && <div className="text-xs text-gray-400">{item.originating_module}</div>}
                  </td>
                  <td className="text-sm text-gray-700">{item.project || '-'}</td>
                  <td><span className="flex items-center gap-1 text-sm text-gray-700"><User className="w-3 h-3 text-gray-400" />{item.raised_by || '-'}</span></td>
                  <td><span className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="w-3 h-3" />{fmtDate(item.raised_on)}</span></td>
                  <td><span className="flex items-center gap-1 text-sm font-medium text-gray-900"><IndianRupee className="w-3 h-3 text-gray-400" />{fmt(item.amount)}</span></td>
                  <td>
                    <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[item.status || ''] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {item.status || '-'}
                    </span>
                  </td>
                  <td>
                    {item.priority
                      ? <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${item.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' : item.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{item.priority}</span>
                      : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td>
                    <div className="flex items-center gap-2 justify-end">
                      {item.linked_record && (
                        <Link href={item.linked_record} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                          <ExternalLink className="w-3 h-3" />View
                        </Link>
                      )}
                      <Link href={`/project-head/approval/${encodeURIComponent(item.name)}`}
                        className="btn btn-secondary text-xs px-2.5 py-1">Details</Link>
                      {item.status === 'Submitted to PH' && (
                        <>
                          <button onClick={() => openAction(item, 'approve')}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />Approve
                          </button>
                          <button onClick={() => openAction(item, 'reject')}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100">
                            <XCircle className="w-3 h-3" />Reject
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
      </RegisterPage>

      {actionTarget && actionType && (
        <ActionModal
          open={true}
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
            <textarea className="input w-full text-sm" placeholder={actionType === 'reject' ? 'Reason for rejection (required)' : 'Optional remarks…'}
              rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
        </ActionModal>
      )}
    </>
  );
}