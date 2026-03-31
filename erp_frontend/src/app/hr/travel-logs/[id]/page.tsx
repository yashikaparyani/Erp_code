'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  Send, CheckCircle2, XCircle, Hash, MapPin, Navigation, IndianRupee, FileText,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';

interface TravelLogDetail {
  name: string;
  employee?: string;
  employee_name?: string;
  travel_date?: string;
  from_location?: string;
  to_location?: string;
  distance_km?: number;
  travel_mode?: string;
  expense_amount?: number;
  linked_project?: string;
  linked_site?: string;
  travel_status?: string;
  status?: string;
  remarks?: string;
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'DRAFT').toUpperCase();
  const style = s === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'SUBMITTED' || s === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function TravelLogDetailPage() {
  const params = useParams();
  const tlName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<TravelLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canSubmit = hasRole('Director', 'System Manager', 'HR Manager');
  const canApproveReject = hasRole('Director', 'System Manager', 'HR Manager', 'Department Head');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/travel-logs/${encodeURIComponent(tlName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load travel log'); }
    finally { setLoading(false); }
  }, [tlName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch(`/api/travel-logs/${encodeURIComponent(tlName)}/actions`, {
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading travel log...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/hr/travel-logs" className="text-sm text-blue-600 hover:underline">← Back to Travel Logs</Link></div>;
  if (!data) return null;

  const st = (data.travel_status || data.status || 'DRAFT').toUpperCase();
  const isDraft = st === 'DRAFT';
  const isSubmitted = st === 'SUBMITTED' || st === 'PENDING';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/hr/travel-logs" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Travel Logs</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.employee_name || data.employee || 'Unknown'} &middot; {formatDate(data.travel_date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={st} />
          {isDraft && canSubmit && (
            <button onClick={() => runAction('submit')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Send className="h-3.5 w-3.5" /> Submit</button>
          )}
          {isSubmitted && canApproveReject && (<>
            <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
            <button onClick={() => setRejectModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Reject</button>
          </>)}
        </div>
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}
      {data.rejection_reason && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><strong>Rejection Reason:</strong> {data.rejection_reason}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Travel Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Log', data.name],
                [<User key="e" className="h-3.5 w-3.5" />, 'Employee', data.employee_name || data.employee],
                [<Calendar key="d" className="h-3.5 w-3.5" />, 'Travel Date', formatDate(data.travel_date)],
                [<MapPin key="f" className="h-3.5 w-3.5" />, 'From', data.from_location],
                [<Navigation key="t" className="h-3.5 w-3.5" />, 'To', data.to_location],
                [<FileText key="tm" className="h-3.5 w-3.5" />, 'Travel Mode', data.travel_mode],
                [<Navigation key="km" className="h-3.5 w-3.5" />, 'Distance', data.distance_km != null ? `${data.distance_km} km` : undefined],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
                [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
                [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                  <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
                </div>
              ))}
            </dl>
            {data.approved_by && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-gray-600">Approved by <strong>{data.approved_by}</strong></span></div>
                {data.approved_at && <p className="mt-1 text-xs text-gray-400">on {formatDate(data.approved_at)}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Route & Expense</h3></div>
          <div className="card-body">
            <div className="flex items-center justify-center gap-4 rounded-xl border border-blue-100 bg-blue-50 p-6">
              <div className="text-center">
                <div className="text-sm text-gray-500">From</div>
                <div className="text-lg font-bold text-gray-900">{data.from_location || '-'}</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Navigation className="h-5 w-5 text-blue-500" />
                {data.distance_km != null && <span className="text-xs text-blue-600">{data.distance_km} km</span>}
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">To</div>
                <div className="text-lg font-bold text-gray-900">{data.to_location || '-'}</div>
              </div>
            </div>
            {data.expense_amount != null && data.expense_amount > 0 && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <div className="text-3xl font-bold text-emerald-900">₹{data.expense_amount.toLocaleString('en-IN')}</div>
                <div className="text-xs text-emerald-600 mt-1">Travel Expense</div>
              </div>
            )}
            {data.remarks && <div className="mt-4 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{data.remarks}</div>}
          </div>
        </div>
      </div>

      <LinkedRecordsPanel links={[
        ...(data.employee ? [{ label: 'Employee Profile', doctype: 'GE Employee', method: 'frappe.client.get_list', args: { doctype: 'GE Employee', filters: JSON.stringify({ name: data.employee }), fields: JSON.stringify(['name', 'employee_name', 'designation', 'department', 'status']), limit_page_length: '5' }, href: (name: string) => `/hr/employees/${name}` }] : []),
      ]} />

      <RecordDocumentsPanel referenceDoctype="GE Travel Log" referenceName={tlName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Travel Log" subjectName={tlName} compact={false} initialLimit={10} /></div></div>

      <ActionModal open={rejectModal} title="Reject Travel Log" description={`Reject travel log ${data.name}. Please provide a reason.`} variant="danger" confirmLabel="Reject" busy={actionBusy === 'reject'} fields={[{ name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Why is this travel log being rejected?' }]} onConfirm={async (values) => { await runAction('reject', { reason: values.reason || '' }); setRejectModal(false); }} onCancel={() => setRejectModal(false)} />
    </div>
  );
}
