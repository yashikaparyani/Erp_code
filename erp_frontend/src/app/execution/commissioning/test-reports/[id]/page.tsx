'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  CheckCircle2, XCircle, Hash, FileText, MapPin, Tag, Beaker,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { useAuth } from '@/context/AuthContext';

interface TestReportDetail {
  name: string;
  report_name?: string;
  linked_project?: string;
  linked_site?: string;
  test_type?: string;
  test_date?: string;
  tested_by?: string;
  status?: string;
  file?: string;
  remarks?: string;
  rejection_reason?: string;
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
  const style = s === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'PENDING' || s === 'SUBMITTED' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function TestReportDetailPage() {
  const params = useParams();
  const reportName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<TestReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canManage = hasRole('Director', 'System Manager', 'I&C Manager', 'QA Manager');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/execution/commissioning/test-reports/${encodeURIComponent(reportName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load test report'); }
    finally { setLoading(false); }
  }, [reportName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch(`/api/execution/commissioning/test-reports/${encodeURIComponent(reportName)}/actions`, {
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading test report...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/execution/commissioning/test-reports" className="text-sm text-blue-600 hover:underline">← Back to Test Reports</Link></div>;
  if (!data) return null;

  const st = (data.status || 'PENDING').toUpperCase();
  const isPending = st === 'PENDING' || st === 'SUBMITTED';
  const isRejected = st === 'REJECTED';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/execution/commissioning/test-reports" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Test Reports</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.report_name || data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.name}</p>
        </div>
        <StatusBadge status={st} />
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      {canManage && (isPending || isRejected) && (
        <div className="flex flex-wrap gap-2">
          {isPending && <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>}
          {isPending && <button onClick={() => setRejectModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Reject</button>}
          {isRejected && <button onClick={() => runAction('resubmit')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><FileText className="h-3.5 w-3.5" /> Resubmit</button>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Report Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Report ID', data.name],
                [<FileText key="rn" className="h-3.5 w-3.5" />, 'Report Name', data.report_name],
                [<Beaker key="tt" className="h-3.5 w-3.5" />, 'Test Type', data.test_type],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
                [<Calendar key="td" className="h-3.5 w-3.5" />, 'Test Date', formatDate(data.test_date)],
                [<User key="tb" className="h-3.5 w-3.5" />, 'Tested By', data.tested_by],
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
            {data.file && (
              <div className="mt-4">
                <a href={data.file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><FileText className="h-3.5 w-3.5" /> View Report File</a>
              </div>
            )}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Remarks</h3></div>
          <div className="card-body space-y-4">
            {data.remarks ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.remarks}</p> : <p className="text-sm text-gray-400 italic">No remarks provided</p>}
            {data.rejection_reason && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <h4 className="text-sm font-medium text-rose-800 mb-2">Rejection Reason</h4>
                <p className="text-sm text-rose-700 whitespace-pre-wrap">{data.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TraceabilityPanel projectId={data.linked_project} siteId={data.linked_site} />

      <RecordDocumentsPanel referenceDoctype="GE Test Report" referenceName={reportName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Test Report" subjectName={reportName} compact={false} initialLimit={10} /></div></div>

      <ActionModal open={rejectModal} title="Reject Test Report" description={`Reject report ${data.name}. A reason is required.`} variant="danger" confirmLabel="Reject" busy={actionBusy === 'reject'} fields={[{ name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Reason for rejection...' }]} onConfirm={async (values) => { await runAction('reject', { reason: values.reason || '' }); setRejectModal(false); }} onCancel={() => setRejectModal(false)} />
    </div>
  );
}
