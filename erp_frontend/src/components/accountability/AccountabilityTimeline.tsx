'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  CircleSlash2,
  Clock,
  Flag,
  GitBranch,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  Unlock,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────── */
/* Types                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */

type AccountabilityRecord = {
  name: string;
  subject_doctype: string;
  subject_name: string;
  linked_project?: string;
  linked_site?: string;
  linked_stage?: string;
  current_status?: string;
  current_owner_role?: string;
  current_owner_user?: string;
  current_owner_department?: string;
  assigned_to_role?: string;
  assigned_to_user?: string;
  due_date?: string;
  is_blocked?: 0 | 1;
  blocking_reason?: string;
  escalated_to_role?: string;
  escalated_to_user?: string;
  approved_by?: string;
  approved_on?: string;
  closed_by?: string;
  closed_on?: string;
  latest_event_type?: string;
  source_route?: string;
  creation?: string;
  modified?: string;
};

type AccountabilityEvent = {
  name: string;
  event_type: string;
  actor: string;
  actor_role?: string;
  actor_department?: string;
  from_status?: string;
  to_status?: string;
  from_owner_user?: string;
  to_owner_user?: string;
  from_owner_role?: string;
  to_owner_role?: string;
  remarks?: string;
  reason_code?: string;
  linked_project?: string;
  linked_site?: string;
  linked_stage?: string;
  reference_doctype?: string;
  reference_name?: string;
  event_time?: string;
  metadata_json?: string;
};

/* ─────────────────────────────────────────────────────────────────────── */
/* Event type config (icon, colours, label)                                */
/* ─────────────────────────────────────────────────────────────────────── */

const EVENT_CONFIG: Record<
  string,
  { icon: React.ElementType; dot: string; badge: string; label: string; highlightRemarks?: boolean }
> = {
  CREATED:          { icon: GitBranch,   dot: 'bg-sky-500',    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',      label: 'Created' },
  SUBMITTED:        { icon: Send,        dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   label: 'Submitted' },
  ASSIGNED:         { icon: UserPlus,    dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'Assigned' },
  ACKNOWLEDGED:     { icon: UserCheck,   dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', label: 'Acknowledged' },
  ACCEPTED:         { icon: CheckCircle2,dot: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',   label: 'Accepted' },
  RETURNED:         { icon: Undo2,       dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', label: 'Returned', highlightRemarks: true },
  APPROVED:         { icon: ThumbsUp,    dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Approved' },
  REJECTED:         { icon: ThumbsDown,  dot: 'bg-rose-500',   badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',    label: 'Rejected', highlightRemarks: true },
  BLOCKED:          { icon: Lock,        dot: 'bg-red-600',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',        label: 'Blocked', highlightRemarks: true },
  UNBLOCKED:        { icon: Unlock,      dot: 'bg-lime-500',   badge: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',   label: 'Unblocked' },
  ESCALATED:        { icon: AlertTriangle,dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Escalated', highlightRemarks: true },
  DUE_DATE_CHANGED: { icon: Clock,       dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', label: 'Due Date Changed', highlightRemarks: true },
  REOPENED:         { icon: RefreshCw,   dot: 'bg-cyan-500',   badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',   label: 'Reopened' },
  COMPLETED:        { icon: CheckCircle2,dot: 'bg-emerald-600',badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Completed' },
  CANCELLED:        { icon: XCircle,     dot: 'bg-zinc-500',   badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',      label: 'Cancelled', highlightRemarks: true },
  OVERRIDDEN:       { icon: CircleSlash2,dot: 'bg-fuchsia-500',badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300', label: 'Overridden', highlightRemarks: true },
};

const FALLBACK_CONFIG = {
  icon: CircleDashed,
  dot: 'bg-gray-400',
  badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  label: 'Event',
};

function getConfig(eventType: string) {
  return EVENT_CONFIG[eventType] ?? { ...FALLBACK_CONFIG, label: eventType };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

function fmtTime(ts?: string) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortName(email?: string) {
  if (!email) return '—';
  return email.split('@')[0].replace(/[._-]/g, ' ');
}

/* ─────────────────────────────────────────────────────────────────────── */
/* StatusArrow: from_status → to_status                                     */
/* ─────────────────────────────────────────────────────────────────────── */

function StatusArrow({ from, to }: { from?: string; to?: string }) {
  if (!from && !to) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
      {from && <span className="rounded px-1.5 py-0.5 bg-[var(--surface-hover)]">{from}</span>}
      {from && to && <span>→</span>}
      {to && <span className="rounded px-1.5 py-0.5 bg-[var(--surface-hover)] font-medium text-[var(--text-primary)]">{to}</span>}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* RecordSummary: current state header card                                 */
/* ─────────────────────────────────────────────────────────────────────── */

function RecordSummary({ record }: { record: AccountabilityRecord }) {
  const blocked = !!record.is_blocked;
  return (
    <div
      className={`rounded-lg border p-3 mb-4 text-sm space-y-1.5
        ${blocked
          ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30'
          : 'border-[var(--border)] bg-[var(--surface-hover)]'
        }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold text-[var(--text-primary)] truncate">
          {record.subject_doctype}: {record.subject_name}
        </span>
        {blocked && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5" /> Blocked
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
        {record.current_status && (
          <span>Status: <span className="text-[var(--text-primary)] font-medium">{record.current_status}</span></span>
        )}
        {record.current_owner_user && (
          <span>Owner: <span className="text-[var(--text-primary)]">{shortName(record.current_owner_user)}</span></span>
        )}
        {record.current_owner_role && (
          <span>Role: <span className="text-[var(--text-primary)]">{record.current_owner_role}</span></span>
        )}
        {record.due_date && (
          <span>Due: <span className="text-[var(--text-primary)]">{record.due_date}</span></span>
        )}
      </div>

      {blocked && record.blocking_reason && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          Reason: {record.blocking_reason}
        </p>
      )}

      {record.escalated_to_user && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Escalated to: {shortName(record.escalated_to_user)}
          {record.escalated_to_role ? ` (${record.escalated_to_role})` : ''}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* EventRow: single event in the timeline                                   */
/* ─────────────────────────────────────────────────────────────────────── */

function EventRow({ event, isLast }: { event: AccountabilityEvent; isLast: boolean }) {
  const cfg = getConfig(event.event_type);
  const Icon = cfg.icon;

  return (
    <li className="relative flex gap-3">
      {/* Vertical connector line */}
      {!isLast && (
        <span className="absolute left-[13px] top-6 bottom-0 w-px bg-[var(--border)]" aria-hidden />
      )}

      {/* Dot */}
      <span
        className={`relative z-10 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${cfg.dot} shadow-sm`}
      >
        <Icon className="w-3 h-3 text-white" />
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
            {cfg.label}
          </span>
          <StatusArrow from={event.from_status ?? undefined} to={event.to_status ?? undefined} />
          <span className="ml-auto text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
            {fmtTime(event.event_time)}
          </span>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-primary)]">{shortName(event.actor)}</span>
          {event.actor_role ? ` · ${event.actor_role}` : ''}
          {event.actor_department ? ` · ${event.actor_department}` : ''}
        </p>

        {(event.from_owner_role || event.to_owner_role) && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Owner:{' '}
            {event.from_owner_role && (
              <span className="line-through opacity-60">{event.from_owner_role}</span>
            )}
            {event.from_owner_role && event.to_owner_role && ' → '}
            {event.to_owner_role && <span className="font-medium text-[var(--text-primary)]">{event.to_owner_role}</span>}
          </p>
        )}

        {event.linked_site && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Site: <span className="text-[var(--text-primary)]">{event.linked_site}</span>
            {event.linked_stage ? ` · Stage: ${event.linked_stage}` : ''}
          </p>
        )}

        {event.remarks && (
          <p
            className={`text-xs mt-1 rounded px-2 py-1 ${
              cfg.highlightRemarks
                ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800'
                : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
            }`}
          >
            {event.remarks}
          </p>
        )}
      </div>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* AccountabilityTimeline – main export                                     */
/* ─────────────────────────────────────────────────────────────────────── */

interface AccountabilityTimelineProps {
  subjectDoctype: string;
  subjectName: string;
  /** If supplied, shows a compact single-line header instead of the full card */
  compact?: boolean;
  /** Max initial events to show; a "show all" toggle appears if exceeded */
  initialLimit?: number;
}

export function AccountabilityTimeline({
  subjectDoctype,
  subjectName,
  compact = false,
  initialLimit = 5,
}: AccountabilityTimelineProps) {
  const [record, setRecord] = useState<AccountabilityRecord | null>(null);
  const [events, setEvents] = useState<AccountabilityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadTimeline = useCallback(async () => {
    if (!subjectDoctype || !subjectName) return;
    setLoading(true);
    setError(null);
    try {
      const res = await globalThis.fetch(
        `/api/accountability?subject_doctype=${encodeURIComponent(subjectDoctype)}&subject_name=${encodeURIComponent(subjectName)}`,
      );
      const json = await res.json();
      if (json?.success === false) throw new Error(json.message ?? 'Request failed');
      const payload = json?.data ?? json;
      setRecord(payload?.record ?? null);
      setEvents(payload?.events ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load accountability timeline');
    } finally {
      setLoading(false);
    }
  }, [subjectDoctype, subjectName]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading timeline…
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        <span className="font-medium">Error:</span> {error}
      </div>
    );
  }

  /* ── No data ── */
  if (!record && events.length === 0) {
    return (
      <p className="py-4 text-xs text-[var(--text-muted)] italic">
        No accountability trail recorded yet.
      </p>
    );
  }

  const visibleEvents = expanded ? events : events.slice(0, initialLimit);
  const hasMore = events.length > initialLimit;

  return (
    <div className="w-full">
      {/* Record summary header */}
      {record && !compact && <RecordSummary record={record} />}

      {compact && record && (
        <div className="flex items-center gap-2 mb-3 text-xs text-[var(--text-muted)]">
          {record.current_status && (
            <span className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 font-medium text-[var(--text-primary)]">
              {record.current_status}
            </span>
          )}
          {record.current_owner_role && <span>{record.current_owner_role}</span>}
          {record.is_blocked ? (
            <span className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400 font-medium">
              <AlertCircle className="w-3 h-3" /> Blocked
            </span>
          ) : null}
          <span className="ml-auto">{events.length} event{events.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <>
          <ul className="space-y-0">
            {visibleEvents.map((ev, idx) => (
              <EventRow
                key={ev.name}
                event={ev}
                isLast={idx === visibleEvents.length - 1 && (!hasMore || expanded)}
              />
            ))}
          </ul>

          {hasMore && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Show {events.length - initialLimit} more event{events.length - initialLimit !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </>
      )}

      {/* Refresh */}
      <button
        onClick={loadTimeline}
        className="mt-3 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <RefreshCw className="w-3 h-3" /> Refresh
      </button>
    </div>
  );
}

export default AccountabilityTimeline;
