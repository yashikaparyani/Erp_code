'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Filter,
  Inbox,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';

type InboxView = 'pending' | 'completed';
type RequestType = 'all' | 'onboarding' | 'leave' | 'travel' | 'regularization';

type ApprovalItem = {
  workflow_type: Exclude<RequestType, 'all'>;
  workflow_label: string;
  name: string;
  status: string;
  title: string;
  subtitle: string;
  requested_by: string;
  action_owner: string;
  created_at?: string;
  acted_at?: string;
  age: string;
  actions: string[];
  path: string;
  request_date?: string;
  remarks?: string;
  amount?: number;
};

type InboxData = {
  view: InboxView;
  request_type: RequestType;
  summary: Record<string, number> & { total: number };
  items: ApprovalItem[];
};

type Flash = { tone: 'success' | 'error'; message: string } | null;

const REQUEST_TYPES: Array<{ value: RequestType; label: string }> = [
  { value: 'all', label: 'All Requests' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'leave', label: 'Leave' },
  { value: 'travel', label: 'Travel' },
  { value: 'regularization', label: 'Regularization' },
];

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status: string) {
  const classes: Record<string, string> = {
    SUBMITTED: 'bg-sky-50 text-sky-700',
    UNDER_REVIEW: 'bg-amber-50 text-amber-700',
    APPROVED: 'bg-emerald-50 text-emerald-700',
    REJECTED: 'bg-rose-50 text-rose-700',
    MAPPED_TO_EMPLOYEE: 'bg-violet-50 text-violet-700',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status] || 'bg-slate-100 text-slate-700'}`}>{status.replaceAll('_', ' ')}</span>;
}

function workflowTone(type: ApprovalItem['workflow_type']) {
  switch (type) {
    case 'onboarding':
      return 'bg-[#1e6b87]/10 text-[#1e6b87]';
    case 'leave':
      return 'bg-emerald-50 text-emerald-700';
    case 'travel':
      return 'bg-amber-50 text-amber-700';
    case 'regularization':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-700"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

export default function HrApprovalsPage() {
  const [view, setView] = useState<InboxView>('pending');
  const [requestType, setRequestType] = useState<RequestType>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [remarksTarget, setRemarksTarget] = useState<{ item: ApprovalItem; action: string } | null>(null);
  const [inbox, setInbox] = useState<InboxData>({
    view: 'pending',
    request_type: 'all',
    summary: { onboarding: 0, leave: 0, travel: 0, regularization: 0, total: 0 },
    items: [],
  });

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view, requestType });
      const res = await fetch(`/api/hr/approvals?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to load approval inbox');
      setInbox(json.data);
    } catch (error) {
      setFlash({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to load approval inbox' });
    } finally {
      setLoading(false);
    }
  }, [view, requestType]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  async function refreshInbox() {
    setRefreshing(true);
    await loadInbox();
    setRefreshing(false);
  }

  async function runAction(item: ApprovalItem, action: string, extra?: Record<string, string>) {
    const needsRemarks = action === 'approve' || action === 'reject';
    let remarks = '';
    if (needsRemarks) {
      remarks = extra?.remarks || '';
      if (action === 'reject' && !remarks) return;
    }

    setBusyAction(`${item.workflow_type}:${item.name}:${action}`);
    try {
      const res = await fetch('/api/hr/approvals/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: item.workflow_type,
          name: item.name,
          action,
          remarks,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to action request');
      setFlash({ tone: 'success', message: json.message || 'Approval action completed.' });
      await loadInbox();
    } catch (error) {
      setFlash({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to action request' });
    } finally {
      setBusyAction(null);
    }
  }

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return inbox.items;
    return inbox.items.filter((item) => [
      item.title,
      item.subtitle,
      item.name,
      item.requested_by,
      item.action_owner,
      item.workflow_label,
      item.status,
    ].some((value) => value?.toLowerCase().includes(term)));
  }, [inbox.items, search]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f9fbff_0%,#eef7ff_45%,#f6fff7_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1e6b87]/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1e6b87]">Phase 4 <span className="h-1 w-1 rounded-full bg-[#1e6b87]" /> Workflow Inbox</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">HR Approval Inbox</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Pending and completed HR approvals across onboarding, leave, travel, and attendance regularization.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/hr" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">HR Dashboard</Link>
            <button onClick={() => void refreshInbox()} className="inline-flex items-center gap-2 rounded-xl bg-[#1e6b87] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#185a73]">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Refresh
            </button>
          </div>
        </div>
      </div>

      {flash ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${flash.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{flash.message}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Total" value={inbox.summary.total || 0} icon={Inbox} />
        <SummaryCard label="Onboarding" value={inbox.summary.onboarding || 0} icon={UserCheck} />
        <SummaryCard label="Leave" value={inbox.summary.leave || 0} icon={ShieldCheck} />
        <SummaryCard label="Travel" value={inbox.summary.travel || 0} icon={ChevronRight} />
        <SummaryCard label="Regularization" value={inbox.summary.regularization || 0} icon={CheckCircle2} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setView('pending')} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${view === 'pending' ? 'bg-[#1e6b87] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>Pending</button>
            <button onClick={() => setView('completed')} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${view === 'completed' ? 'bg-[#1e6b87] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>Completed</button>
          </div>
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <div className="relative min-w-[240px] flex-1 md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests, owners, IDs" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#1e6b87] focus:bg-white focus:ring-2 focus:ring-[#1e6b87]/20" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select value={requestType} onChange={(event) => setRequestType(event.target.value as RequestType)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1e6b87] focus:ring-2 focus:ring-[#1e6b87]/20">
                {REQUEST_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center px-4 py-24 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading approval inbox...</div>
        ) : !filteredItems.length ? (
          <div className="px-4 py-24 text-center text-sm text-slate-500">No {view} HR approvals match the current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Request</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Requester</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Age</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={`${item.workflow_type}-${item.name}`}>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-900">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.subtitle}</div>
                      <div className="mt-2 text-xs text-slate-400">{item.name}</div>
                      {item.remarks ? <div className="mt-2 text-xs text-slate-500">Remarks: {item.remarks}</div> : null}
                    </td>
                    <td className="px-4 py-4 align-top"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${workflowTone(item.workflow_type)}`}>{item.workflow_label}</span></td>
                    <td className="px-4 py-4 align-top">{statusBadge(item.status)}</td>
                    <td className="px-4 py-4 align-top text-slate-600">{item.requested_by}</td>
                    <td className="px-4 py-4 align-top text-slate-600">{item.action_owner}</td>
                    <td className="px-4 py-4 align-top text-slate-600">{formatDate(item.request_date || item.created_at || item.acted_at)}</td>
                    <td className="px-4 py-4 align-top text-slate-600">{item.age}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        {item.actions.includes('review') ? (
                          <button onClick={() => void runAction(item, 'review')} disabled={busyAction === `${item.workflow_type}:${item.name}:review`} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-60">{busyAction === `${item.workflow_type}:${item.name}:review` ? 'Working...' : 'Review'}</button>
                        ) : null}
                        {item.actions.includes('approve') ? (
                          <button onClick={() => setRemarksTarget({ item, action: 'approve' })} disabled={busyAction === `${item.workflow_type}:${item.name}:approve`} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60">{busyAction === `${item.workflow_type}:${item.name}:approve` ? 'Working...' : 'Approve'}</button>
                        ) : null}
                        {item.actions.includes('reject') ? (
                          <button onClick={() => setRemarksTarget({ item, action: 'reject' })} disabled={busyAction === `${item.workflow_type}:${item.name}:reject`} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60">{busyAction === `${item.workflow_type}:${item.name}:reject` ? 'Working...' : 'Reject'}</button>
                        ) : null}
                        <Link href={item.path} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ActionModal
        open={remarksTarget !== null}
        title={remarksTarget?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
        description={`${remarksTarget?.action === 'approve' ? 'Approve' : 'Reject'} ${remarksTarget?.item.title || ''}?`}
        confirmLabel={remarksTarget?.action === 'approve' ? 'Approve' : 'Reject'}
        variant={remarksTarget?.action === 'reject' ? 'danger' : 'success'}
        fields={[{ name: 'remarks', label: remarksTarget?.action === 'approve' ? 'Remarks (optional)' : 'Rejection Remarks', type: 'textarea' }]}
        onCancel={() => setRemarksTarget(null)}
        onConfirm={async (values) => {
          if (remarksTarget) await runAction(remarksTarget.item, remarksTarget.action, { remarks: values.remarks || '' });
          setRemarksTarget(null);
        }}
      />
    </div>
  );
}
