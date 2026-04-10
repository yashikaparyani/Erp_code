'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Compass, FileText, MapPin, User } from 'lucide-react';
import Link from 'next/link';
import DetailPage from '@/components/shells/DetailPage';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import { resolveRecordContext } from '@/lib/context';
import type { Survey } from './survey-types';
import { formatDate } from './survey-types';

// ── Props ──────────────────────────────────────────────────────────────────

interface SurveyDetailViewProps {
  /** The survey document name (decoded from URL). */
  surveyName: string;
  /** Base route for the back link — e.g. "/survey" or "/engineering/survey". */
  backHref: string;
  backLabel?: string;
}

// ── Status helpers ─────────────────────────────────────────────────────────

function statusVariant(status?: string) {
  const s = (status || 'Pending').toLowerCase();
  if (s === 'completed') return 'success' as const;
  if (s === 'in progress') return 'info' as const;
  return 'warning' as const;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SurveyDetailView({
  surveyName,
  backHref,
  backLabel = 'Back to Surveys',
}: SurveyDetailViewProps) {
  const [data, setData] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/surveys/${encodeURIComponent(surveyName)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) {
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

  const ctx = useMemo(
    () => (data ? resolveRecordContext(data) : null),
    [data],
  );

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setActionBusy(newStatus);
    setError('');
    try {
      const res = await fetch(`/api/surveys/${encodeURIComponent(surveyName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to update status');
      }

      // If marked as Completed, check if all surveys are now complete
      let successMsg = `Status updated to ${newStatus}`;
      if (newStatus === 'Completed' && data?.linked_project) {
        try {
          const checkRes = await fetch(`/api/surveys/check-complete?project=${encodeURIComponent(data.linked_project)}`);
          const checkResult = await checkRes.json();
          if (checkResult.success && checkResult.data?.complete) {
            successMsg = `✓ Survey marked complete. All surveys done! Sites auto-advancing to BOQ_DESIGN stage...`;
          }
        } catch {
          // Silently fail - just show basic success message
        }
      }

      showSuccess(successMsg);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionBusy('');
    }
  };

  const isPending = (data?.status || 'Pending') === 'Pending';
  const isInProgress = data?.status === 'In Progress';
  const isCompleted = data?.status === 'Completed';

  const linkedProject = ctx?.project || '';
  const linkedSite = ctx?.site || '';

  // ── Status action buttons ──
  const headerActions = (
    <>
      {isPending && data && (
        <button
          onClick={() => handleStatusUpdate('In Progress')}
          disabled={!!actionBusy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Clock className="h-3.5 w-3.5" />
          {actionBusy ? 'Updating\u2026' : 'Start Survey'}
        </button>
      )}
      {isInProgress && (
        <button
          onClick={() => handleStatusUpdate('Completed')}
          disabled={!!actionBusy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {actionBusy ? 'Updating\u2026' : 'Mark Completed'}
        </button>
      )}
      {isCompleted && (
        <button
          onClick={() => handleStatusUpdate('In Progress')}
          disabled={!!actionBusy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          <Clock className="h-3.5 w-3.5" />
          {actionBusy ? 'Updating\u2026' : 'Reopen'}
        </button>
      )}
    </>
  );

  // ── Identity block (detail card) ──
  const identityBlock = data ? (
    <dl className="space-y-3 text-sm">
      {([
        [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.site_name],
        [<FileText key="si" className="h-3.5 w-3.5" />, 'Linked Site', linkedSite],
        [<FileText key="p" className="h-3.5 w-3.5" />, 'Linked Project', linkedProject],
        [<FileText key="t" className="h-3.5 w-3.5" />, 'Linked Tender', data.linked_tender],
        [<User key="u" className="h-3.5 w-3.5" />, 'Surveyed By', data.surveyed_by],
        [<Calendar key="d" className="h-3.5 w-3.5" />, 'Survey Date', formatDate(data.survey_date)],
        [<Compass key="c" className="h-3.5 w-3.5" />, 'Coordinates', data.coordinates],
        [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
        [<Calendar key="cr" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
        [<Calendar key="m" className="h-3.5 w-3.5" />, 'Modified', formatDate(data.modified)],
      ] as [React.ReactNode, string, string | undefined | null][]).map(([icon, label, value]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-gray-400">{icon}</span>
          <dt className="w-32 shrink-0 text-gray-500">{label}</dt>
          <dd className="truncate font-medium text-gray-900">{value || '-'}</dd>
        </div>
      ))}
    </dl>
  ) : null;

  // ── Side panels ──
  const sidePanels = data ? (
    <>
      {/* Summary Card */}
      <div className="shell-panel px-5 py-4 sm:px-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">Summary &amp; Notes</h3>
        {data.summary ? (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">{data.summary}</div>
        ) : (
          <p className="text-sm text-gray-400">No summary or notes recorded yet.</p>
        )}
      </div>

      {/* Linked Tender shortcut */}
      {data.linked_tender && (
        <Link
          href={`/pre-sales?search=${encodeURIComponent(data.linked_tender)}`}
          className="shell-panel flex items-center gap-3 px-5 py-4 transition hover:bg-amber-50"
        >
          <FileText className="h-5 w-5 text-amber-500" />
          <div>
            <div className="text-xs text-gray-500">Linked Tender</div>
            <div className="text-sm font-medium text-gray-900">{data.linked_tender}</div>
          </div>
        </Link>
      )}

      {/* Documents */}
      <RecordDocumentsPanel
        referenceDoctype="GE Survey"
        referenceName={surveyName}
        title="Linked Documents"
        initialLimit={5}
        linkedProject={linkedProject || undefined}
        linkedSite={linkedSite || undefined}
      />

      {/* Accountability */}
      <div className="shell-panel overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--text-main)]">Accountability Trail</h3>
        </div>
        <div className="px-5 py-4">
          <AccountabilityTimeline
            subjectDoctype="GE Survey"
            subjectName={surveyName}
            compact={false}
            initialLimit={10}
          />
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {successMsg && (
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {successMsg}
          </div>
        </div>
      )}
      {error && data && (
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
            <button onClick={() => setError('')} className="ml-2 font-medium underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <DetailPage
        kicker="Survey"
        title={data?.site_name || data?.name || surveyName}
        backHref={backHref}
        backLabel={backLabel}
        loading={loading}
        error={!data ? error : undefined}
        onRetry={loadData}
        context={ctx}
        status={data?.status || 'Pending'}
        statusVariant={statusVariant(data?.status)}
        headerActions={headerActions}
        identityBlock={identityBlock}
        sidePanels={sidePanels}
      >
        {/* Linked Records */}
        <LinkedRecordsPanel
          links={[
            {
              label: 'Related BOQs',
              doctype: 'GE BOQ',
              method: 'frappe.client.get_list',
              args: {
                doctype: 'GE BOQ',
                filters: JSON.stringify(
                  linkedProject
                    ? { linked_project: linkedProject }
                    : data?.linked_tender
                      ? { linked_tender: data.linked_tender }
                      : {},
                ),
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
                filters: JSON.stringify(
                  linkedProject
                    ? { linked_project: linkedProject }
                    : data?.linked_tender
                      ? { linked_tender: data.linked_tender }
                      : {},
                ),
                fields: JSON.stringify(['name', 'title', 'status', 'revision', 'linked_project']),
                limit_page_length: '20',
              },
              href: (name: string) => `/engineering/drawings/${name}`,
            },
          ]}
        />
      </DetailPage>
    </>
  );
}
