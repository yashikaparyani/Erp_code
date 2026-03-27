'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  MapPin, MessageSquare, Hash, ArrowUpRight, ArrowDownLeft, Tag,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';

interface CommLogDetail {
  name: string;
  linked_project?: string;
  linked_site?: string;
  communication_date?: string;
  communication_type?: string;
  direction?: string;
  subject?: string;
  counterparty_name?: string;
  counterparty_role?: string;
  follow_up_required?: number;
  follow_up_date?: string;
  logged_by?: string;
  summary?: string;
  notes?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TypeBadge({ type }: { type?: string }) {
  const map: Record<string, string> = {
    Email: 'bg-blue-50 text-blue-700 border-blue-200',
    Phone: 'bg-green-50 text-green-700 border-green-200',
    Meeting: 'bg-purple-50 text-purple-700 border-purple-200',
    Letter: 'bg-amber-50 text-amber-700 border-amber-200',
    WhatsApp: 'bg-teal-50 text-teal-700 border-teal-200',
  };
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${map[type || ''] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{type || 'Other'}</span>;
}

export default function CommLogDetailPage() {
  const params = useParams();
  const logName = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<CommLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/comm-logs/${encodeURIComponent(logName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load comm log'); }
    finally { setLoading(false); }
  }, [logName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading comm log...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/comm-logs" className="text-sm text-blue-600 hover:underline">← Back to Comm Logs</Link></div>;
  if (!data) return null;

  const followUpOverdue = data.follow_up_required && data.follow_up_date && new Date(data.follow_up_date) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/comm-logs" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Comm Logs</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.subject || data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.name} · {formatDateTime(data.communication_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          {data.direction === 'Outgoing'
            ? <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"><ArrowUpRight className="h-3.5 w-3.5" /> Outgoing</span>
            : <span className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"><ArrowDownLeft className="h-3.5 w-3.5" /> Incoming</span>}
          <TypeBadge type={data.communication_type} />
        </div>
      </div>

      {followUpOverdue && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Follow-up overdue — was due on {formatDate(data.follow_up_date)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Log ID', data.name],
                [<Tag key="t" className="h-3.5 w-3.5" />, 'Type', data.communication_type],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
                [<User key="cp" className="h-3.5 w-3.5" />, 'Counterparty', data.counterparty_name],
                [<User key="cr" className="h-3.5 w-3.5" />, 'Their Role', data.counterparty_role],
                [<User key="lb" className="h-3.5 w-3.5" />, 'Logged By', data.logged_by || data.owner],
                [<Calendar key="dt" className="h-3.5 w-3.5" />, 'Date', formatDateTime(data.communication_date)],
                ...(data.follow_up_required ? [[<Calendar key="fu" className="h-3.5 w-3.5" />, 'Follow-up', formatDate(data.follow_up_date)]] : []),
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
          <div className="card-header"><h3 className="font-semibold text-gray-900">Summary & Notes</h3></div>
          <div className="card-body space-y-4">
            {data.summary ? (
              <div><p className="text-xs font-medium text-gray-500 mb-1">Summary</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{data.summary}</p></div>
            ) : (
              <p className="text-sm text-gray-400 italic">No summary provided</p>
            )}
            {data.notes && (
              <div className="pt-3 border-t border-gray-100"><p className="text-xs font-medium text-gray-500 mb-1">Internal Notes</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{data.notes}</p></div>
            )}
          </div>
        </div>
      </div>

      <RecordDocumentsPanel referenceDoctype="GE Comm Log" referenceName={logName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Comm Log" subjectName={logName} compact={false} initialLimit={10} /></div></div>
    </div>
  );
}
