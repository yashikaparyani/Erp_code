'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, MapPin, Wrench,
  Hash, Building2, FileText, CheckCircle2,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';

interface TechVisitDetail {
  name: string;
  employee?: string;
  employee_name?: string;
  visit_date?: string;
  linked_site?: string;
  customer_location?: string;
  visit_status?: string;
  visit_type?: string;
  linked_project?: string;
  linked_ticket?: string;
  work_done?: string;
  remarks?: string;
  time_in?: string;
  time_out?: string;
  duration_hours?: number;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'SCHEDULED').toUpperCase();
  const style = s === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'IN_PROGRESS' || s === 'IN PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'SCHEDULED' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s.replace(/_/g, ' ')}</span>;
}

export default function TechnicianVisitDetailPage() {
  const params = useParams();
  const tvName = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<TechVisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/technician-visits/${encodeURIComponent(tvName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load technician visit'); }
    finally { setLoading(false); }
  }, [tvName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading technician visit...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/hr/technician-visits" className="text-sm text-blue-600 hover:underline">← Back to Technician Visits</Link></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/hr/technician-visits" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Technician Visits</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.employee_name || data.employee || 'Unknown'} &middot; {formatDate(data.visit_date)}</p>
        </div>
        <StatusBadge status={data.visit_status} />
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Visit Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Visit', data.name],
                [<User key="e" className="h-3.5 w-3.5" />, 'Employee', data.employee_name || data.employee],
                [<Calendar key="d" className="h-3.5 w-3.5" />, 'Visit Date', formatDate(data.visit_date)],
                [<Wrench key="vt" className="h-3.5 w-3.5" />, 'Visit Type', data.visit_type],
                [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
                [<MapPin key="cl" className="h-3.5 w-3.5" />, 'Customer Location', data.customer_location],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<FileText key="t" className="h-3.5 w-3.5" />, 'Ticket', data.linked_ticket],
                [<Calendar key="ti" className="h-3.5 w-3.5" />, 'Time In', data.time_in],
                [<Calendar key="to" className="h-3.5 w-3.5" />, 'Time Out', data.time_out],
                [<Wrench key="dur" className="h-3.5 w-3.5" />, 'Duration', data.duration_hours != null ? `${data.duration_hours} hrs` : undefined],
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
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Visit Location & Work</h3></div>
          <div className="card-body">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Site / Location</div>
                  <div className="text-lg font-bold text-gray-900">{data.linked_site || data.customer_location || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Status</div>
                  <StatusBadge status={data.visit_status} />
                </div>
              </div>
              {data.duration_hours != null && (
                <div className="mt-4 text-center">
                  <div className="text-3xl font-bold text-blue-900">{data.duration_hours} hrs</div>
                  <div className="text-xs text-blue-600 mt-1">On-Site Duration</div>
                </div>
              )}
            </div>
            {data.work_done && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Work Done</h4>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-3">{data.work_done}</div>
              </div>
            )}
            {data.remarks && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Remarks</h4>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{data.remarks}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <LinkedRecordsPanel links={[
        ...(data.employee ? [{ label: 'Employee Profile', doctype: 'GE Employee', method: 'frappe.client.get_list', args: { doctype: 'GE Employee', filters: JSON.stringify({ name: data.employee }), fields: JSON.stringify(['name', 'employee_name', 'designation', 'department', 'status']), limit_page_length: '5' }, href: (name: string) => `/hr/employees/${name}` }] : []),
      ]} />

      <RecordDocumentsPanel referenceDoctype="GE Technician Visit Log" referenceName={tvName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Technician Visit Log" subjectName={tvName} compact={false} initialLimit={10} /></div></div>
    </div>
  );
}
