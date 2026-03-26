'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  MapPin, Hash, CheckCircle2, Play, ClipboardList, BarChart3,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import { useAuth } from '@/context/AuthContext';

interface ChecklistDetail {
  name: string;
  checklist_name?: string;
  linked_project?: string;
  linked_site?: string;
  total_items?: number;
  done_items?: number;
  status?: string;
  commissioned_by?: string;
  commissioned_date?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toUpperCase();
  const style = s === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'IN PROGRESS' || s === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'DRAFT' ? 'bg-gray-100 text-gray-700 border-gray-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s.replace(/_/g, ' ') || 'N/A'}</span>;
}

export default function ChecklistDetailPage() {
  const params = useParams();
  const checklistName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<ChecklistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canManage = hasRole('Director', 'System Manager', 'I&C Manager', 'Field Technician', 'Project Manager');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/execution/commissioning/checklists/${encodeURIComponent(checklistName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load checklist'); }
    finally { setLoading(false); }
  }, [checklistName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch('/api/execution/commissioning/checklists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name: checklistName }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action}`);
      showSuccess(result.message || `${action} completed`);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : `Failed to ${action}`); }
    finally { setActionBusy(''); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading checklist...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/execution/commissioning/test-reports" className="text-sm text-blue-600 hover:underline">← Back to Commissioning</Link></div>;
  if (!data) return null;

  const st = (data.status || '').toUpperCase();
  const isDraft = st === 'DRAFT';
  const isInProgress = st === 'IN PROGRESS' || st === 'IN_PROGRESS';
  const total = data.total_items || 0;
  const done = data.done_items || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/execution/commissioning/test-reports" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Commissioning</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.checklist_name || data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.name}</p>
        </div>
        <StatusBadge status={st} />
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      {canManage && (
        <div className="flex flex-wrap gap-2">
          {isDraft && <button onClick={() => runAction('start')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Play className="h-3.5 w-3.5" /> Start</button>}
          {isInProgress && <button onClick={() => runAction('complete')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</button>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><ClipboardList className="h-4 w-4" /> Total Items</div>
          <p className="text-xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><CheckCircle2 className="h-4 w-4" /> Completed</div>
          <p className="text-xl font-bold text-gray-900">{done}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><BarChart3 className="h-4 w-4" /> Progress</div>
          <p className="text-xl font-bold text-gray-900">{pct}%</p>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-100"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Checklist Details</h3></div>
        <div className="card-body">
          <dl className="space-y-3 text-sm">
            {[
              [<Hash key="n" className="h-3.5 w-3.5" />, 'Checklist ID', data.name],
              [<ClipboardList key="cn" className="h-3.5 w-3.5" />, 'Checklist Name', data.checklist_name],
              [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
              [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
              [<User key="cb" className="h-3.5 w-3.5" />, 'Commissioned By', data.commissioned_by],
              [<Calendar key="cd" className="h-3.5 w-3.5" />, 'Commissioned Date', formatDate(data.commissioned_date)],
              [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
              [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
            ].map(([icon, label, value]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <span className="text-gray-400">{icon}</span>
                <dt className="text-gray-500 w-36 shrink-0">{String(label)}</dt>
                <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <RecordDocumentsPanel referenceDoctype="GE Commissioning Checklist" referenceName={checklistName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Commissioning Checklist" subjectName={checklistName} compact={false} initialLimit={10} /></div></div>
    </div>
  );
}
