'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  MapPin, DollarSign, CheckCircle2, XCircle, Hash, Tag, FileText,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import ActionModal from '@/components/ui/ActionModal';
import { useAuth } from '@/context/AuthContext';

interface PettyCashDetail {
  name: string;
  linked_project?: string;
  linked_site?: string;
  entry_date?: string;
  description?: string;
  category?: string;
  amount?: number;
  paid_to?: string;
  paid_by?: string;
  voucher_ref?: string;
  status?: string;
  approved_by?: string;
  approved_on?: string;
  rejection_reason?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(v?: number) {
  if (v == null) return '-';
  return '₹ ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status?: string }) {
  const s = status || 'PENDING';
  const style = s === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function PettyCashDetailPage() {
  const params = useParams();
  const entryName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<PettyCashDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const hasRole = (...roles: string[]) => roles.some(r => new Set(currentUser?.roles || []).has(r));
  const canApprove = hasRole('Director', 'System Manager', 'Finance Manager', 'Accounts Manager');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/petty-cash/${encodeURIComponent(entryName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load entry'); }
    finally { setLoading(false); }
  }, [entryName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch(`/api/petty-cash/${encodeURIComponent(entryName)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action}`);
      showSuccess(result.message || `${action} completed`);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : `Failed to ${action}`); }
    finally { setActionBusy(''); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading entry...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/petty-cash" className="text-sm text-blue-600 hover:underline">← Back to Petty Cash</Link></div>;
  if (!data) return null;

  const isPending = (data.status || 'PENDING').toUpperCase() === 'PENDING';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/petty-cash" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Petty Cash</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.category || 'Expense'} · {formatDate(data.entry_date)}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <div className="rounded-xl border bg-white p-5">
        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Amount</div>
        <p className="text-3xl font-bold text-gray-900">{formatCurrency(data.amount)}</p>
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      {isPending && canApprove && (
        <div className="flex gap-2">
          <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
          <button onClick={() => setRejectModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Reject</button>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Entry Details</h3></div>
        <div className="card-body">
          <dl className="space-y-3 text-sm">
            {[
              [<Hash key="n" className="h-3.5 w-3.5" />, 'Entry ID', data.name],
              [<Tag key="cat" className="h-3.5 w-3.5" />, 'Category', data.category],
              [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
              [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
              [<Calendar key="dt" className="h-3.5 w-3.5" />, 'Date', formatDate(data.entry_date)],
              [<User key="pt" className="h-3.5 w-3.5" />, 'Paid To', data.paid_to],
              [<User key="pb" className="h-3.5 w-3.5" />, 'Paid By', data.paid_by],
              [<FileText key="vr" className="h-3.5 w-3.5" />, 'Voucher Ref', data.voucher_ref],
              ...(data.approved_by ? [[<User key="ab" className="h-3.5 w-3.5" />, 'Approved By', data.approved_by]] : []),
              ...(data.approved_on ? [[<Calendar key="ao" className="h-3.5 w-3.5" />, 'Approved On', formatDate(data.approved_on)]] : []),
            ].map(([icon, label, value]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <span className="text-gray-400">{icon}</span>
                <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
              </div>
            ))}
          </dl>
          {data.description && (
            <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs font-medium text-gray-500 mb-1">Description</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{data.description}</p></div>
          )}
          {data.rejection_reason && (
            <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3"><p className="text-xs font-medium text-rose-700 mb-1">Rejection Reason</p><p className="text-sm text-rose-800 whitespace-pre-wrap">{data.rejection_reason}</p></div>
          )}
        </div>
      </div>

      <RecordDocumentsPanel referenceDoctype="GE Petty Cash" referenceName={entryName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Petty Cash" subjectName={entryName} compact={false} initialLimit={10} /></div></div>

      <ActionModal open={rejectModal} title="Reject Petty Cash Entry" description={`Reject entry ${data.name}. A reason is required.`} variant="danger" confirmLabel="Reject" busy={actionBusy === 'reject'} fields={[{ name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Reason for rejection...' }]} onConfirm={async (values) => { await runAction('reject', { reason: values.reason || '' }); setRejectModal(false); }} onCancel={() => setRejectModal(false)} />
    </div>
  );
}
