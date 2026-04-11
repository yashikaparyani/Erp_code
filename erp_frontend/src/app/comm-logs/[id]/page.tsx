'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowUpRight, ArrowDownLeft, Calendar, User, Building2,
  MapPin, Hash, Tag, Download, MessageSquareQuote,
} from 'lucide-react';
import DetailPage from '@/components/shells/DetailPage';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import { formatDate } from '@/components/pm/pm-helpers';

interface CommLogDetail {
  name: string;
  linked_project?: string;
  linked_site?: string;
  communication_date?: string;
  communication_type?: string;
  direction?: string;
  subject?: string;
  reference_number?: string;
  issue_summary?: string;
  response_status?: string;
  response_detail?: string;
  attachment?: string;
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

function formatDateTime(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TypeBadge({ type }: { type?: string }) {
  const m: Record<string, string> = { Email: 'bg-blue-50 text-blue-700 border-blue-200', Call: 'bg-green-50 text-green-700 border-green-200', Meeting: 'bg-purple-50 text-purple-700 border-purple-200', Letter: 'bg-amber-50 text-amber-700 border-amber-200', WhatsApp: 'bg-teal-50 text-teal-700 border-teal-200', 'Site Visit': 'bg-purple-50 text-purple-700 border-purple-200' };
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${m[type || ''] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{type || 'Other'}</span>;
}

function flowLabel(d?: string) { return d === 'Outbound' ? 'Outward' : d === 'Inbound' ? 'Inward' : d || '-'; }

export default function CommLogDetailPage() {
  const params = useParams();
  const logName = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<CommLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/comm-logs/${encodeURIComponent(logName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load comm log'); }
    finally { setLoading(false); }
  }, [logName]);

  useEffect(() => { loadData(); }, [loadData]);

  const d = data;
  const followUpOverdue = d?.follow_up_required && d?.follow_up_date && new Date(d.follow_up_date) < new Date();

  return (
    <DetailPage
      title={d?.subject || logName}
      kicker="Communication Log"
      backHref="/comm-logs"
      backLabel="Back to Comm Logs"
      loading={loading}
      error={error}
      onRetry={loadData}
      status={d?.response_status}
      statusVariant={d?.response_status === 'Closed' ? 'success' : d?.response_status === 'Responded' ? 'info' : 'warning'}
      headerActions={
        <>
          {d?.direction === 'Outbound'
            ? <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"><ArrowUpRight className="h-3.5 w-3.5" /> Outward</span>
            : d?.direction ? <span className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"><ArrowDownLeft className="h-3.5 w-3.5" /> {flowLabel(d.direction)}</span> : null}
          {d?.communication_type && <TypeBadge type={d.communication_type} />}
        </>
      }
      identityBlock={
        d ? (
          <>
            <p className="text-sm text-gray-500">{logName} · {formatDateTime(d.communication_date)}</p>
            {followUpOverdue && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Follow-up overdue — was due on {formatDate(d.follow_up_date)}
              </div>
            )}
          </>
        ) : null
      }
      sidePanels={
        <>
          {d && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Details</h3></div>
              <div className="card-body">
                <dl className="space-y-3 text-sm">
                  {[
                    [<Hash key="n" className="h-3.5 w-3.5" />, 'Log ID', d.name],
                    [<Tag key="t" className="h-3.5 w-3.5" />, 'Type', d.communication_type],
                    [<MessageSquareQuote key="flow" className="h-3.5 w-3.5" />, 'Letter Flow', flowLabel(d.direction)],
                    [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', d.linked_project],
                    [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', d.linked_site],
                    [<User key="cp" className="h-3.5 w-3.5" />, 'Counterparty', d.counterparty_name],
                    [<User key="cr" className="h-3.5 w-3.5" />, 'Their Role', d.counterparty_role],
                    [<Hash key="ref" className="h-3.5 w-3.5" />, 'Reference', d.reference_number],
                    [<User key="lb" className="h-3.5 w-3.5" />, 'Logged By', d.logged_by || d.owner],
                    [<Calendar key="dt" className="h-3.5 w-3.5" />, 'Date', formatDateTime(d.communication_date)],
                    [<Tag key="status" className="h-3.5 w-3.5" />, 'Response Status', d.response_status],
                    ...(d.follow_up_required ? [[<Calendar key="fu" className="h-3.5 w-3.5" />, 'Follow-up', formatDate(d.follow_up_date)]] : []),
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
          )}
          <RecordDocumentsPanel referenceDoctype="GE Project Communication Log" referenceName={logName} title="Linked Documents" initialLimit={5} />
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
            <div className="card-body"><AccountabilityTimeline subjectDoctype="GE Project Communication Log" subjectName={logName} compact={false} initialLimit={10} /></div>
          </div>
        </>
      }
    >
      {d && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Letter Context</h3></div>
          <div className="card-body space-y-4">
            {d.issue_summary && <div><p className="text-xs font-medium text-gray-500 mb-1">Issue / Matter Raised</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{d.issue_summary}</p></div>}
            {d.response_detail && <div><p className="text-xs font-medium text-gray-500 mb-1">Response / Resolution</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{d.response_detail}</p></div>}
            {d.summary ? <div><p className="text-xs font-medium text-gray-500 mb-1">Summary</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{d.summary}</p></div> : <p className="text-sm text-gray-400 italic">No summary provided</p>}
            {d.notes && <div className="pt-3 border-t border-gray-100"><p className="text-xs font-medium text-gray-500 mb-1">Internal Notes</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{d.notes}</p></div>}
            {d.attachment && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Attached File</p>
                <a href={`/api/files?url=${encodeURIComponent(d.attachment)}&download=1`} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                  <Download className="h-4 w-4" /> Download attachment
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </DetailPage>
  );
}
