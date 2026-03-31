'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  MapPin, CheckCircle2, Clock, Target, Hash,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import ActionModal from '@/components/ui/ActionModal';
import { useAuth } from '@/context/AuthContext';

interface MilestoneDetail {
  name: string;
  milestone_name?: string;
  status?: string;
  linked_project?: string;
  linked_site?: string;
  planned_date?: string;
  actual_date?: string;
  owner_user?: string;
  description?: string;
  completion_notes?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = status || 'Pending';
  const style = s === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'Overdue' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'Cancelled' ? 'bg-gray-100 text-gray-600 border-gray-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function MilestoneDetailPage() {
  const params = useParams();
  const milestoneName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<MilestoneDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [completeModal, setCompleteModal] = useState(false);

  const hasRole = (...roles: string[]) => new Set(currentUser?.roles || []).size > 0 && roles.some(r => new Set(currentUser?.roles || []).has(r));
  const canManage = hasRole('Director', 'System Manager', 'Project Manager', 'OM Operator');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/milestones/${encodeURIComponent(milestoneName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load milestone'); }
    finally { setLoading(false); }
  }, [milestoneName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runUpdate = async (updates: Record<string, string>) => {
    setActionBusy('update'); setError('');
    try {
      const res = await fetch(`/api/milestones/${encodeURIComponent(milestoneName)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed to update');
      showSuccess(result.message || 'Updated');
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Update failed'); }
    finally { setActionBusy(''); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading milestone...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/milestones" className="text-sm text-blue-600 hover:underline">← Back to Milestones</Link></div>;
  if (!data) return null;

  const isOverdue = data.status !== 'Completed' && data.status !== 'Cancelled' && data.planned_date && new Date(data.planned_date) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/milestones" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Milestones</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.milestone_name || data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.name}</p>
        </div>
        <StatusBadge status={isOverdue ? 'Overdue' : data.status} />
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      {canManage && data.status !== 'Completed' && data.status !== 'Cancelled' && (
        <div className="flex flex-wrap gap-2">
          {data.status === 'Pending' && <button onClick={() => runUpdate({ status: 'In Progress' })} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Clock className="h-3.5 w-3.5" /> Start</button>}
          <button onClick={() => setCompleteModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete</button>
          <button onClick={() => runUpdate({ status: 'Cancelled' })} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Milestone Details</h3></div>
        <div className="card-body">
          <dl className="space-y-3 text-sm">
            {[
              [<Hash key="n" className="h-3.5 w-3.5" />, 'Milestone ID', data.name],
              [<Target key="mn" className="h-3.5 w-3.5" />, 'Name', data.milestone_name],
              [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
              [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
              [<User key="o" className="h-3.5 w-3.5" />, 'Owner', data.owner_user],
              [<Calendar key="pd" className="h-3.5 w-3.5" />, 'Planned Date', formatDate(data.planned_date)],
              [<Calendar key="ad" className="h-3.5 w-3.5" />, 'Actual Date', formatDate(data.actual_date)],
            ].map(([icon, label, value]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <span className="text-gray-400">{icon}</span>
                <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
              </div>
            ))}
          </dl>
          {data.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.description}</p>
            </div>
          )}
          {data.completion_notes && (
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-700 mb-1">Completion Notes</p>
              <p className="text-sm text-emerald-800 whitespace-pre-wrap">{data.completion_notes}</p>
            </div>
          )}
        </div>
      </div>

      <RecordDocumentsPanel referenceDoctype="GE Milestone" referenceName={milestoneName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Milestone" subjectName={milestoneName} compact={false} initialLimit={10} /></div></div>

      <ActionModal open={completeModal} title="Mark Milestone Complete" description={`Mark "${data.milestone_name || data.name}" as completed.`} variant="default" confirmLabel="Complete" busy={actionBusy === 'update'} fields={[{ name: 'completion_notes', label: 'Completion Notes', type: 'textarea', required: false, placeholder: 'Optional notes about completion...' }]} onConfirm={async (values) => { await runUpdate({ status: 'Completed', actual_date: new Date().toISOString().slice(0, 10), completion_notes: values.completion_notes || '' }); setCompleteModal(false); }} onCancel={() => setCompleteModal(false)} />
    </div>
  );
}
