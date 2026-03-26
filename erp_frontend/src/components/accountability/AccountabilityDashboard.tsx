'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  RefreshCw,
  ThumbsDown,
  TrendingUp,
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
  current_owner_user?: string;
  current_owner_role?: string;
  current_owner_department?: string;
  latest_event_type?: string;
  is_blocked?: 0 | 1;
  blocking_reason?: string;
  escalated_to_user?: string;
  escalated_to_role?: string;
  due_date?: string;
  source_route?: string;
  creation?: string;
  modified?: string;
};

type RejectedEvent = {
  name: string;
  accountability_record: string;
  actor: string;
  actor_role?: string;
  actor_department?: string;
  from_status?: string;
  to_status?: string;
  remarks?: string;
  linked_project?: string;
  linked_site?: string;
  reference_doctype?: string;
  reference_name?: string;
  event_time?: string;
};

type DeptHeatmapRow = { department: string; count: number };
type EventTypeRow = { event_type: string; count: number };

type DashboardData = {
  summary: {
    total_open: number;
    total_blocked: number;
    total_overdue: number;
    total_escalated: number;
    total_rejected_recent: number;
  };
  blocked_items: AccountabilityRecord[];
  overdue_items: AccountabilityRecord[];
  escalated_items: AccountabilityRecord[];
  rejected_events: RejectedEvent[];
  department_heatmap: DeptHeatmapRow[];
  event_type_distribution: EventTypeRow[];
};

const emptyData: DashboardData = {
  summary: {
    total_open: 0,
    total_blocked: 0,
    total_overdue: 0,
    total_escalated: 0,
    total_rejected_recent: 0,
  },
  blocked_items: [],
  overdue_items: [],
  escalated_items: [],
  rejected_events: [],
  department_heatmap: [],
  event_type_distribution: [],
};

/* ─────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

function fmtTime(ts?: string) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function shortName(email?: string) {
  if (!email) return '—';
  return email.split('@')[0].replace(/[._-]/g, ' ');
}

function ageDays(dateStr?: string) {
  if (!dateStr) return 0;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / 86_400_000);
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Stat Card                                                                */
/* ─────────────────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: string;
  hint?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${tone}`}>
      <span className="mt-0.5 flex-shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs font-medium mt-0.5 leading-tight">{label}</p>
        {hint && <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{hint}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Collapsible Item List                                                    */
/* ─────────────────────────────────────────────────────────────────────── */

function ItemList({
  title,
  icon: Icon,
  items,
  emptyMsg,
  renderRow,
  initialOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  items: unknown[];
  emptyMsg: string;
  renderRow: (item: unknown, idx: number) => React.ReactNode;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] transition-colors text-left"
        onClick={() => setOpen((p) => !p)}
      >
        <Icon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
        <span className="text-sm font-semibold text-[var(--text-primary)] flex-1">{title}</span>
        <span className="text-xs text-[var(--text-muted)]">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        {open ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
      </button>

      {open && (
        <div className="divide-y divide-[var(--border)]">
          {items.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[var(--text-muted)] italic">{emptyMsg}</p>
          ) : (
            items.map((item, idx) => renderRow(item, idx))
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Block/Overdue/Escalation row                                             */
/* ─────────────────────────────────────────────────────────────────────── */

function RecordRow({ rec }: { rec: AccountabilityRecord }) {
  const age = ageDays(rec.modified);
  return (
    <div className="px-4 py-2.5 grid grid-cols-[1fr_auto] gap-2 hover:bg-[var(--surface-hover)] transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-[var(--text-primary)]">{rec.subject_doctype}</span>
          <span className="text-xs text-[var(--text-muted)]">{rec.subject_name}</span>
          {rec.current_status && (
            <span className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] text-[var(--text-muted)] border border-[var(--border)]">
              {rec.current_status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {rec.linked_project && (
            <span className="text-[10px] text-[var(--text-muted)]">Project: {rec.linked_project}</span>
          )}
          {rec.linked_site && (
            <span className="text-[10px] text-[var(--text-muted)]">Site: {rec.linked_site}</span>
          )}
          {rec.current_owner_role && (
            <span className="text-[10px] text-[var(--text-muted)]">Owner: {rec.current_owner_role}</span>
          )}
          {rec.current_owner_user && (
            <span className="text-[10px] text-[var(--text-muted)]">({shortName(rec.current_owner_user)})</span>
          )}
        </div>
        {(rec.blocking_reason || rec.escalated_to_user) && (
          <p className="text-[10px] mt-0.5 text-amber-600 dark:text-amber-400 truncate">
            {rec.blocking_reason || `Escalated to: ${shortName(rec.escalated_to_user)}`}
          </p>
        )}
        {rec.due_date && (
          <p className="text-[10px] text-rose-500 mt-0.5">Due: {fmtTime(rec.due_date)}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{age}d old</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Rejected events row                                                      */
/* ─────────────────────────────────────────────────────────────────────── */

function RejectedRow({ ev }: { ev: RejectedEvent }) {
  return (
    <div className="px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {ev.reference_doctype && (
              <span className="text-xs font-medium text-[var(--text-primary)]">{ev.reference_doctype}</span>
            )}
            {ev.reference_name && (
              <span className="text-xs text-[var(--text-muted)]">{ev.reference_name}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-[var(--text-muted)]">by {shortName(ev.actor)}</span>
            {ev.actor_role && <span className="text-[10px] text-[var(--text-muted)]">({ev.actor_role})</span>}
            {ev.actor_department && <span className="text-[10px] text-[var(--text-muted)]">· {ev.actor_department}</span>}
          </div>
          {ev.remarks && (
            <p className="text-[10px] mt-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 truncate">
              {ev.remarks}
            </p>
          )}
        </div>
        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
          {fmtTime(ev.event_time)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Department heatmap bar                                                   */
/* ─────────────────────────────────────────────────────────────────────── */

function HeatmapBar({ rows }: { rows: DeptHeatmapRow[] }) {
  if (rows.length === 0) return <p className="text-xs text-[var(--text-muted)] italic py-2">No data</p>;
  const max = rows[0]?.count || 1;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.department} className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] w-32 truncate flex-shrink-0">{row.department}</span>
          <div className="flex-1 h-4 rounded-full bg-[var(--surface-hover)] overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 dark:bg-amber-600 transition-all"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-[var(--text-primary)] w-8 text-right">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Event type distribution mini chart                                       */
/* ─────────────────────────────────────────────────────────────────────── */

const EVENT_COLORS: Record<string, string> = {
  REJECTED: 'bg-rose-500',
  BLOCKED: 'bg-red-600',
  ESCALATED: 'bg-amber-500',
  RETURNED: 'bg-orange-400',
  CANCELLED: 'bg-zinc-500',
  APPROVED: 'bg-green-500',
  SUBMITTED: 'bg-blue-500',
  CREATED: 'bg-sky-500',
  UNBLOCKED: 'bg-lime-500',
  COMPLETED: 'bg-emerald-600',
};

function EventDistribution({ rows }: { rows: EventTypeRow[] }) {
  if (rows.length === 0) return <p className="text-xs text-[var(--text-muted)] italic py-2">No data</p>;
  const max = rows[0]?.count || 1;
  return (
    <div className="space-y-1.5">
      {rows.slice(0, 12).map((row) => (
        <div key={row.event_type} className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)] w-28 truncate flex-shrink-0">{row.event_type}</span>
          <div className="flex-1 h-3 rounded-full bg-[var(--surface-hover)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${EVENT_COLORS[row.event_type] ?? 'bg-blue-400'}`}
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-[var(--text-primary)] w-8 text-right">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* AccountabilityDashboard – main export                                    */
/* ─────────────────────────────────────────────────────────────────────── */

interface AccountabilityDashboardProps {
  /** Optional project filter */
  project?: string;
  /** Optional site filter  */
  site?: string;
  /** Optional department filter */
  department?: string;
}

export function AccountabilityDashboard({
  project,
  site,
  department,
}: AccountabilityDashboardProps) {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ mode: 'dashboard' });
      if (project) params.set('project', project);
      if (site) params.set('site', site);
      if (department) params.set('department', department);

      const res = await globalThis.fetch(`/api/accountability?${params.toString()}`);
      const json = await res.json();
      if (json?.success === false) throw new Error(json.message ?? 'Request failed');
      const payload = json?.data ?? json;
      setData(payload ?? emptyData);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load accountability dashboard');
    } finally {
      setLoading(false);
    }
  }, [project, site, department]);

  useEffect(() => {
    void load();
  }, [load]);

  const { summary } = data;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Accountability &amp; Traceability</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Director/RCA view — who owns what, what is blocked, what is overdue
            {lastUpdated && <> · Updated {lastUpdated}</>}
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Open Items"
          value={summary.total_open}
          icon={TrendingUp}
          tone="border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-primary)]"
        />
        <StatCard
          label="Blocked"
          value={summary.total_blocked}
          icon={Lock}
          tone="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
          hint="require immediate attention"
        />
        <StatCard
          label="Overdue"
          value={summary.total_overdue}
          icon={Clock}
          tone="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
          hint="past due date"
        />
        <StatCard
          label="Escalated"
          value={summary.total_escalated}
          icon={AlertTriangle}
          tone="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
        />
        <StatCard
          label="Recent Rejections"
          value={summary.total_rejected_recent}
          icon={ThumbsDown}
          tone="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
          hint="last 30 days"
        />
      </div>

      {/* Item lists + charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-4">
          <ItemList
            title="Blocked Items"
            icon={Lock}
            items={data.blocked_items}
            emptyMsg="No blocked items — great!"
            renderRow={(item, idx) => <RecordRow key={idx} rec={item as AccountabilityRecord} />}
          />
          <ItemList
            title="Overdue Items"
            icon={Clock}
            items={data.overdue_items}
            emptyMsg="No overdue items"
            initialOpen={false}
            renderRow={(item, idx) => <RecordRow key={idx} rec={item as AccountabilityRecord} />}
          />
          <ItemList
            title="Escalated Items"
            icon={AlertCircle}
            items={data.escalated_items}
            emptyMsg="No escalated items"
            initialOpen={false}
            renderRow={(item, idx) => <RecordRow key={idx} rec={item as AccountabilityRecord} />}
          />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <ItemList
            title="Recent Rejections"
            icon={XCircle}
            items={data.rejected_events}
            emptyMsg="No recent rejections"
            initialOpen={true}
            renderRow={(item, idx) => <RejectedRow key={idx} ev={item as RejectedEvent} />}
          />

          {/* Department Heatmap */}
          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Open Items by Department</span>
            </div>
            <HeatmapBar rows={data.department_heatmap} />
          </div>

          {/* Event Distribution */}
          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Event Activity Distribution</span>
            </div>
            <EventDistribution rows={data.event_type_distribution} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountabilityDashboard;
