'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Loader2,
  MapPin,
  User,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';

interface SurveyDetail {
  name: string;
  site_name?: string;
  linked_tender?: string;
  coordinates?: string;
  surveyed_by?: string;
  survey_date?: string;
  summary?: string;
  status?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = (status || 'Pending').toLowerCase();
  const style =
    normalized === 'completed'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : normalized === 'in progress'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>
      {status || 'Pending'}
    </span>
  );
}

export default function SurveyDetailPage() {
  const params = useParams();
  const surveyName = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(surveyName)}`);
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to load survey');
      }

      setData(payload.data?.data || payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load survey');
    } finally {
      setLoading(false);
    }
  }, [surveyName]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const showSuccess = (message: string) => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setActionBusy(newStatus);
    setError('');

    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(surveyName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to update survey');
      }

      showSuccess(`Status updated to ${newStatus}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update survey');
    } finally {
      setActionBusy('');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading survey...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-rose-600">{error}</p>
        <Link href="/survey" className="text-sm text-blue-600 hover:underline">
          Back to Surveys
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const isPending = (data.status || 'Pending') === 'Pending';
  const isInProgress = data.status === 'In Progress';
  const isCompleted = data.status === 'Completed';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/survey"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Surveys
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.site_name || data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.linked_tender || 'No tender linked'} | {formatDate(data.survey_date)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          {isPending ? (
            <button
              onClick={() => handleStatusUpdate('In Progress')}
              disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Clock className="h-3.5 w-3.5" />
              {actionBusy ? 'Updating...' : 'Start Survey'}
            </button>
          ) : null}
          {isInProgress ? (
            <button
              onClick={() => handleStatusUpdate('Completed')}
              disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {actionBusy ? 'Updating...' : 'Mark Completed'}
            </button>
          ) : null}
          {isCompleted ? (
            <button
              onClick={() => handleStatusUpdate('In Progress')}
              disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              <Clock className="h-3.5 w-3.5" />
              {actionBusy ? 'Updating...' : 'Reopen'}
            </button>
          ) : null}
        </div>
      </div>

      {successMsg ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {successMsg}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Survey Details</h3>
          </div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<MapPin key="site" className="h-3.5 w-3.5" />, 'Site', data.site_name],
                [<FileText key="survey" className="h-3.5 w-3.5" />, 'Survey', data.name],
                [<FileText key="tender" className="h-3.5 w-3.5" />, 'Linked Tender', data.linked_tender],
                [<User key="by" className="h-3.5 w-3.5" />, 'Surveyed By', data.surveyed_by],
                [<Calendar key="date" className="h-3.5 w-3.5" />, 'Survey Date', formatDate(data.survey_date)],
                [<Compass key="coord" className="h-3.5 w-3.5" />, 'Coordinates', data.coordinates],
                [<User key="owner" className="h-3.5 w-3.5" />, 'Created By', data.owner],
                [<Calendar key="created" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
                [<Calendar key="modified" className="h-3.5 w-3.5" />, 'Last Modified', formatDate(data.modified)],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="w-32 shrink-0 text-gray-500">{String(label)}</dt>
                  <dd className="truncate font-medium text-gray-900">{String(value || '-')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Survey Summary &amp; Notes</h3>
          </div>
          <div className="card-body">
            {data.summary ? (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">{data.summary}</div>
            ) : (
              <p className="text-sm text-gray-400">No summary or notes recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {data.linked_tender ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/pre-sales?search=${encodeURIComponent(data.linked_tender)}`}
            className="card card-body flex items-center gap-3 transition hover:bg-amber-50"
          >
            <FileText className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs text-gray-500">Linked Tender</div>
              <div className="text-sm font-medium text-gray-900">{data.linked_tender}</div>
            </div>
          </Link>
        </div>
      ) : null}

      <LinkedRecordsPanel
        links={[
          {
            label: 'Related BOQs',
            doctype: 'GE Bill of Quantities',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Bill of Quantities',
              filters: JSON.stringify(data.linked_tender ? { linked_tender: data.linked_tender } : {}),
              fields: JSON.stringify(['name', 'status', 'total_amount', 'total_items', 'linked_project']),
              limit_page_length: '20',
            },
            href: (name: string) => `/engineering/boq/${name}`,
          },
          {
            label: 'Related Drawings',
            doctype: 'GE Drawing',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Drawing',
              filters: JSON.stringify(data.linked_tender ? { linked_tender: data.linked_tender } : {}),
              fields: JSON.stringify(['name', 'title', 'status', 'revision', 'linked_project']),
              limit_page_length: '20',
            },
            href: (name: string) => `/engineering/drawings/${name}`,
          },
        ]}
      />

      <RecordDocumentsPanel
        referenceDoctype="GE Site Survey"
        referenceName={surveyName}
        title="Linked Documents"
        initialLimit={5}
      />

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Accountability Trail</h3>
        </div>
        <div className="card-body">
          <AccountabilityTimeline
            subjectDoctype="GE Site Survey"
            subjectName={surveyName}
            compact={false}
            initialLimit={10}
          />
        </div>
      </div>
    </div>
  );
}
