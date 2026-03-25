'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText, Search, ChevronLeft, ChevronRight, Loader2,
  Camera, Filter, X,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface AuditLogEntry {
  name: string;
  event_type: string;
  actor: string;
  actor_name: string;
  target_user: string;
  target_role: string;
  target_pack: string;
  target_pack_label: string;
  action: string;
  scope: string;
  mode: string;
  old_value: string;
  new_value: string;
  valid_from: string;
  valid_to: string;
  remarks: string;
  creation: string;
}

interface AuditEventType {
  value: string;
  label: string;
}

/* ── Constants ─────────────────────────────────────────────────────────── */

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  role_pack_assign:      { label: 'Role Pack Assigned',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  role_pack_remove:      { label: 'Role Pack Removed',      color: 'bg-rose-50 text-rose-700 border-rose-200' },
  user_override_grant:   { label: 'Override Granted',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  user_override_revoke:  { label: 'Override Revoked',       color: 'bg-amber-50 text-amber-700 border-amber-200' },
  user_override_remove:  { label: 'Override Removed',       color: 'bg-orange-50 text-orange-700 border-orange-200' },
  user_context_update:   { label: 'Context Updated',        color: 'bg-purple-50 text-purple-700 border-purple-200' },
  user_status_change:    { label: 'Status Changed',         color: 'bg-slate-50 text-slate-700 border-slate-200' },
  permission_snapshot:   { label: 'Permission Snapshot',    color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
};

const PAGE_SIZE = 25;

/* ── Component ─────────────────────────────────────────────────────────── */

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [eventTypes, setEventTypes] = useState<AuditEventType[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Filters
  const [filterEventType, setFilterEventType] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterActor, setFilterActor] = useState('');
  const [filterPack, setFilterPack] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit_page_length', String(PAGE_SIZE));
      params.set('limit_start', String(page * PAGE_SIZE));
      if (filterEventType) params.set('event_type', filterEventType);
      if (filterUser) params.set('target_user', filterUser);
      if (filterActor) params.set('actor', filterActor);
      if (filterPack) params.set('target_pack', filterPack);

      const res = await fetch(`/api/rbac/audit-log?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLogs(json.data.logs || []);
        setTotal(json.data.total || 0);
      } else {
        setError(json.message || 'Failed to load audit log');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, filterEventType, filterUser, filterActor, filterPack]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/rbac/audit-event-types');
        const json = await res.json();
        if (active && json.success && Array.isArray(json.data)) {
          setEventTypes(json.data);
        }
      } catch {
        // Keep the local label map as a graceful fallback.
      }
    })();
    return () => { active = false; };
  }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const createSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const res = await fetch('/api/rbac/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        await fetchLogs();
      } else {
        setError(json.message || 'Failed to create snapshot');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Snapshot failed');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterEventType('');
    setFilterUser('');
    setFilterActor('');
    setFilterPack('');
    setPage(0);
  };

  const hasFilters = filterEventType || filterUser || filterActor || filterPack;

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <ScrollText className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-main)]">RBAC Audit Log</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Track who changed what, when, and why &middot; {total} event{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              showFilters || hasFilters
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-[var(--border-subtle)] bg-white text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters{hasFilters ? ' (active)' : ''}
          </button>
          <button
            onClick={createSnapshot}
            disabled={snapshotLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-sm font-medium text-cyan-700 hover:bg-cyan-100 disabled:opacity-50"
          >
            {snapshotLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Snapshot My Permissions
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Event Type</label>
              <select
                value={filterEventType}
                onChange={(e) => { setFilterEventType(e.target.value); setPage(0); }}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm"
              >
                <option value="">All events</option>
                {(eventTypes.length
                  ? eventTypes
                  : Object.entries(EVENT_TYPE_LABELS).map(([value, meta]) => ({ value, label: meta.label }))
                ).map((eventType) => (
                  <option key={eventType.value} value={eventType.value}>{eventType.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Target User</label>
              <input
                type="text"
                value={filterUser}
                onChange={(e) => { setFilterUser(e.target.value); setPage(0); }}
                placeholder="e.g. user@example.com"
                className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Changed By</label>
              <input
                type="text"
                value={filterActor}
                onChange={(e) => { setFilterActor(e.target.value); setPage(0); }}
                placeholder="Actor email"
                className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Pack</label>
              <input
                type="text"
                value={filterPack}
                onChange={(e) => { setFilterPack(e.target.value); setPage(0); }}
                placeholder="Pack key"
                className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-rose-600">
                <X className="h-3 w-3" /> Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          <button onClick={fetchLogs} className="ml-3 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading audit log...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center text-sm text-[var(--text-muted)]">
          {hasFilters ? 'No events match the current filters.' : 'No audit events recorded yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Changed By</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Pack</th>
                <th className="px-4 py-3 font-medium">Scope / Mode</th>
                <th className="px-4 py-3 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {logs.map((log) => {
                const evt = EVENT_TYPE_LABELS[log.event_type] || { label: log.event_type, color: 'bg-gray-50 text-gray-700 border-gray-200' };
                const isExpanded = expandedRow === log.name;
                return (
                  <>
                    <tr key={log.name} className="hover:bg-[var(--surface-raised)]/60 cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : log.name)}>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">{formatDate(log.creation)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-medium ${evt.color}`}>
                          {evt.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[var(--text-main)]">{log.actor_name || log.actor}</div>
                      </td>
                      <td className="px-4 py-3">
                        {log.target_user && <div className="text-[var(--text-main)]">{log.target_user}</div>}
                        {log.target_role && <div className="text-xs text-[var(--text-muted)]">Role: {log.target_role}</div>}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {log.target_pack_label || log.target_pack || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {(log.scope || log.mode) ? (
                          <div className="flex gap-2 text-xs">
                            {log.scope && <span className="rounded bg-gray-100 px-1.5 py-0.5">{log.scope}</span>}
                            {log.mode && <span className="rounded bg-gray-100 px-1.5 py-0.5">{log.mode}</span>}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        <Search className="h-3.5 w-3.5" />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${log.name}-detail`}>
                        <td colSpan={7} className="bg-gray-50 px-6 py-4">
                          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                            {log.old_value && (
                              <div>
                                <div className="mb-1 font-semibold text-[var(--text-muted)]">Previous Value</div>
                                <pre className="whitespace-pre-wrap rounded bg-white p-2 border border-[var(--border-subtle)] text-[var(--text-main)]">{log.old_value}</pre>
                              </div>
                            )}
                            {log.new_value && (
                              <div>
                                <div className="mb-1 font-semibold text-[var(--text-muted)]">New Value</div>
                                <pre className="whitespace-pre-wrap rounded bg-white p-2 border border-[var(--border-subtle)] text-[var(--text-main)]">{log.new_value}</pre>
                              </div>
                            )}
                            {log.remarks && (
                              <div className="md:col-span-2">
                                <div className="mb-1 font-semibold text-[var(--text-muted)]">Remarks</div>
                                <p className="text-[var(--text-main)]">{log.remarks}</p>
                              </div>
                            )}
                            {(log.valid_from || log.valid_to) && (
                              <div className="md:col-span-2">
                                <div className="mb-1 font-semibold text-[var(--text-muted)]">Validity</div>
                                <p className="text-[var(--text-main)]">
                                  {log.valid_from || '—'} → {log.valid_to || '—'}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-[var(--border-subtle)] p-1.5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-[var(--border-subtle)] p-1.5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
