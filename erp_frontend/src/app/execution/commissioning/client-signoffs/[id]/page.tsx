'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  CheckCircle2, Hash, MapPin, FileText, Pen, Tag,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { useAuth } from '@/context/AuthContext';

interface ClientSignoffDetail {
  name: string;
  linked_project?: string;
  linked_site?: string;
  signoff_type?: string;
  signoff_date?: string;
  signed_by_client?: string;
  status?: string;
  attachment?: string;
  remarks?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'PENDING').toUpperCase();
  const style = s === 'APPROVED' || s === 'SIGNED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function ClientSignoffDetailPage() {
  const params = useParams();
  const signoffName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<ClientSignoffDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [signModal, setSignModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canManage = hasRole('Director', 'System Manager', 'Engineering Head', 'Project Manager');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/execution/commissioning/client-signoffs/${encodeURIComponent(signoffName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load client signoff'); }
    finally { setLoading(false); }
  }, [signoffName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch(`/api/execution/commissioning/client-signoffs/${encodeURIComponent(signoffName)}/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action}`);
      showSuccess(result.message || `${action} completed`);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : `Failed to ${action}`); }
    finally { setActionBusy(''); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading signoff...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/execution/commissioning/test-reports" className="text-sm text-blue-600 hover:underline">← Back to Commissioning</Link></div>;
  if (!data) return null;

  const st = (data.status || 'PENDING').toUpperCase();
  const isPending = st === 'PENDING';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/execution/commissioning/test-reports" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Commissioning</Link>
          <h1 className="text-2xl font-bold text-gray-900">Client Signoff — {data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.signoff_type || 'Signoff'}</p>
        </div>
        <StatusBadge status={st} />
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      {isPending && canManage && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSignModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Pen className="h-3.5 w-3.5" /> Record Client Sign</button>
          <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Signoff Details</h3></div>
        <div className="card-body">
          <dl className="space-y-3 text-sm">
            {[
              [<Hash key="n" className="h-3.5 w-3.5" />, 'Signoff ID', data.name],
              [<Tag key="st" className="h-3.5 w-3.5" />, 'Signoff Type', data.signoff_type],
              [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
              [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
              [<Calendar key="sd" className="h-3.5 w-3.5" />, 'Signoff Date', formatDate(data.signoff_date)],
              [<User key="sbc" className="h-3.5 w-3.5" />, 'Signed By Client', data.signed_by_client],
              [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
              [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
            ].map(([icon, label, value]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <span className="text-gray-400">{icon}</span>
                <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                <dd className="font-medium text-gray-900 truncate">{String(value ?? '-')}</dd>
              </div>
            ))}
          </dl>
          {data.attachment && (
            <div className="mt-4"><a href={`/api/files?url=${encodeURIComponent(data.attachment)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><FileText className="h-3.5 w-3.5" /> View Attachment</a></div>
          )}
          {data.remarks && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Remarks</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.remarks}</p>
            </div>
          )}
        </div>
      </div>

      <TraceabilityPanel projectId={data.linked_project} siteId={data.linked_site} />

      <RecordDocumentsPanel referenceDoctype="GE Client Signoff" referenceName={signoffName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Client Signoff" subjectName={signoffName} compact={false} initialLimit={10} /></div></div>

      <ActionModal open={signModal} title="Record Client Signature" description={`Record the client signatory for ${data.name}.`} variant="default" confirmLabel="Record" busy={actionBusy === 'sign'} fields={[{ name: 'signed_by_client', label: 'Client Signatory Name', type: 'text', required: true, placeholder: 'Name of person who signed' }]} onConfirm={async (values) => { await runAction('sign', { signed_by_client: values.signed_by_client || '' }); setSignModal(false); }} onCancel={() => setSignModal(false)} />
    </div>
  );
}
