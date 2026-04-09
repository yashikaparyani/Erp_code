'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Filter } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import ActionModal from '@/components/ui/ActionModal';
import { formatCurrency, formatDate, hasAnyRole, useAuth } from '@/components/finance/fin-helpers';
import { costingApi } from '@/lib/typedApi';

interface QueueItem {
  name: string; source_type?: string; source_id?: string; ph_approver?: string;
  ph_approval_date?: string; amount?: number; project?: string;
  vendor_beneficiary?: string; disbursement_status?: string; entry_label?: string; linked_record?: string;
}
interface Stats { pending?: number; released?: number; held?: number; rejected?: number; }

const SOURCE_BADGE: Record<string, string> = { PO: 'badge-blue', 'RMA PO': 'badge-purple', 'Petty Cash': 'badge-amber' };
const STATUS_BADGE: Record<string, string> = { Pending: 'badge-yellow', Released: 'badge-green', Held: 'badge-orange', Rejected: 'badge-red' };
const SOURCE_TYPES = ['', 'PO', 'RMA PO', 'Petty Cash'];
const STATUSES = ['', 'Pending', 'Released', 'Held', 'Rejected'];

type ActionType = 'release' | 'hold' | 'reject';

export default function CostingQueuePage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [actionTarget, setActionTarget] = useState<QueueItem | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const canAct = hasAnyRole(currentUser?.roles, 'Accounts', 'Director', 'System Manager');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const queueRows = await costingApi.getQueue<QueueItem[]>(statusFilter || undefined, sourceFilter || undefined);
      const list = Array.isArray(queueRows) ? queueRows : [];
      setItems(list);
      setStats({
        pending: list.filter((row) => (row.disbursement_status || 'Pending') === 'Pending').length,
        released: list.filter((row) => row.disbursement_status === 'Released').length,
        held: list.filter((row) => row.disbursement_status === 'Held').length,
        rejected: list.filter((row) => row.disbursement_status === 'Rejected').length,
      });
    } catch { setError('Failed to load costing queue'); }
    setLoading(false);
  }, [statusFilter, sourceFilter]);

  useEffect(() => { load(); }, [load]);

  const submitAction = async () => {
    if (!actionTarget || !actionType) return;
    setBusy(true); setError('');
    try {
      await costingApi[actionType](actionTarget.name, remarks);
      setActionTarget(null); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    setBusy(false);
  };

  const pill = (active: boolean) => active
    ? 'bg-purple-600 text-white border-purple-600'
    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50';

  return (
    <RegisterPage
      title="Costing Queue" description="PH-approved items awaiting costing release or disbursement"
      loading={loading}
      error={error}
      onRetry={load}
      empty={!items.length && !loading}
      emptyTitle="No costing items in queue"
      emptyDescription={statusFilter ? `No entries are currently marked "${statusFilter}".` : 'No PH-approved items are waiting for finance action right now.'}
      stats={[
        { label: 'Pending', value: stats.pending ?? 0, variant: 'warning' },
        { label: 'Released', value: stats.released ?? 0, variant: 'success' },
        { label: 'Held', value: stats.held ?? 0 },
        { label: 'Rejected', value: stats.rejected ?? 0, variant: 'error' },
      ]}
      filterBar={
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Source:</span>
          {SOURCE_TYPES.map(s => <button key={s} onClick={() => setSourceFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium border ${pill(sourceFilter===s)}`}>{s||'All'}</button>)}
          <span className="text-sm text-gray-500 ml-2">Status:</span>
          {STATUSES.map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium border ${pill(statusFilter===s)}`}>{s||'All'}</button>)}
        </div>
      }
    >
      <div className="card">
        <div className="card-header flex items-center justify-between"><h3 className="font-semibold text-gray-900">Queue</h3><span className="text-sm text-gray-500">{items.length} items</span></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Entry</th><th>Source</th><th>PH Approver</th><th>Date</th><th>Amount</th><th>Project</th><th>Vendor</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.name}>
                  <td><div className="text-sm font-medium text-gray-900">{item.entry_label || item.name}</div><div className="text-xs text-gray-400">{item.source_id}</div></td>
                  <td><span className={`badge ${SOURCE_BADGE[item.source_type||'']||'badge-gray'}`}>{item.source_type||'-'}</span></td>
                  <td className="text-sm text-gray-700">{item.ph_approver||'-'}</td>
                  <td className="text-sm text-gray-500">{formatDate(item.ph_approval_date)}</td>
                  <td className="text-sm font-medium">{formatCurrency(item.amount)}</td>
                  <td className="text-sm text-gray-700">{item.project||'-'}</td>
                  <td className="text-sm text-gray-700">{item.vendor_beneficiary||'-'}</td>
                  <td><span className={`badge ${STATUS_BADGE[item.disbursement_status||'']||'badge-gray'}`}>{item.disbursement_status||'Pending'}</span></td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      {item.linked_record && <Link href={item.linked_record} className="text-xs text-blue-600 hover:underline">Source</Link>}
                      <Link href={`/finance/costing-queue/${encodeURIComponent(item.name)}`} className="text-xs text-blue-600 font-medium">Details</Link>
                      {canAct && (!item.disbursement_status || item.disbursement_status === 'Pending') && <>
                        <button className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100" onClick={() => { setActionTarget(item); setActionType('release'); setRemarks(''); }}>Release</button>
                        <button className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 rounded hover:bg-amber-100" onClick={() => { setActionTarget(item); setActionType('hold'); setRemarks(''); }}>Hold</button>
                        <button className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100" onClick={() => { setActionTarget(item); setActionType('reject'); setRemarks(''); }}>Reject</button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {actionTarget && actionType && (
        <ActionModal
          open={!!actionTarget}
          title={actionType === 'release' ? 'Release / Disburse' : actionType === 'hold' ? 'Hold Entry' : 'Reject Entry'}
          description={`${actionType === 'release' ? 'Mark as disbursed' : actionType === 'hold' ? 'Put on hold' : 'Reject'}: ${actionTarget.entry_label || actionTarget.name} (${formatCurrency(actionTarget.amount)})?`}
          confirmLabel={actionType === 'release' ? 'Release' : actionType === 'hold' ? 'Hold' : 'Reject'}
          variant={actionType === 'release' ? 'success' : actionType === 'hold' ? 'default' : 'danger'}
          busy={busy}
          onCancel={() => setActionTarget(null)}
          onConfirm={submitAction}
        >
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Remarks</label>
            <textarea className="input w-full text-sm" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remarks…" />
          </div>
        </ActionModal>
      )}
    </RegisterPage>
  );
}
