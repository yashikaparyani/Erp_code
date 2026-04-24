'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ShieldAlert, BookOpen, ArrowUpRight, Lock, Unlock, Eye } from 'lucide-react';
import { formatPercent } from '../dashboards/shared';
import { WorkspacePermissions } from '../../context/WorkspacePermissionContext';
import type { SiteRow, DepartmentConfig } from './workspace-types';
import { SPINE_STAGES, STAGE_LABELS } from './workspace-types';
import { apiFetch } from '@/lib/api-client';

function SitesTab({ sites, config, projectId, wp }: { sites: SiteRow[]; config: DepartmentConfig; projectId: string; wp: WorkspacePermissions | null }) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [blockedOnly, setBlockedOnly] = useState(false);

  // ── Advance / Block modals ──
  const [advanceTarget, setAdvanceTarget] = useState<SiteRow | null>(null);
  const [advanceStage, setAdvanceStage] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [advancing, setAdvancing] = useState(false);

  const [blockTarget, setBlockTarget] = useState<SiteRow | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  const [actionError, setActionError] = useState('');

  const handleAdvanceSite = useCallback(async () => {
    if (!advanceTarget || !advanceStage) return;
    setAdvancing(true);
    setActionError('');
    try {
      await apiFetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'advance_site_stage', site: advanceTarget.name, new_stage: advanceStage, notes: advanceNotes || undefined }),
      });
      setAdvanceTarget(null);
      setAdvanceStage('');
      setAdvanceNotes('');
      // Trigger workspace reload
      window.dispatchEvent(new CustomEvent('workspace-reload'));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to advance site stage');
    } finally {
      setAdvancing(false);
    }
  }, [advanceTarget, advanceStage, advanceNotes]);

  const handleToggleBlocked = useCallback(async () => {
    if (!blockTarget) return;
    const isBlocking = !blockTarget.site_blocked;
    if (isBlocking && !blockReason.trim()) { setActionError('A reason is required when blocking a site.'); return; }
    setBlocking(true);
    setActionError('');
    try {
      await apiFetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'toggle_site_blocked', site: blockTarget.name, blocked: isBlocking ? 1 : 0, reason: blockReason.trim() || undefined }),
      });
      setBlockTarget(null);
      setBlockReason('');
      window.dispatchEvent(new CustomEvent('workspace-reload'));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update site blocked status');
    } finally {
      setBlocking(false);
    }
  }, [blockTarget, blockReason]);

  const getNextStages = useCallback((current?: string) => {
    const idx = SPINE_STAGES.indexOf(current || 'SURVEY');
    return SPINE_STAGES.slice(idx + 1);
  }, []);

  const stages = useMemo(() => [...new Set(sites.map((s) => s.current_site_stage || 'SURVEY'))].sort(), [sites]);
  const totalBlocked = useMemo(() => sites.filter((s) => s.site_blocked).length, [sites]);

  const filtered = useMemo(() => {
    let result = sites;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          (s.site_name || '').toLowerCase().includes(q) ||
          (s.site_code || '').toLowerCase().includes(q) ||
          (s.name || '').toLowerCase().includes(q) ||
          (s.blocker_reason || '').toLowerCase().includes(q),
      );
    }
    if (stageFilter) {
      result = result.filter((s) => (s.current_site_stage || 'SURVEY') === stageFilter);
    }
    if (blockedOnly) {
      result = result.filter((s) => s.site_blocked);
    }
    return result;
  }, [sites, search, stageFilter, blockedOnly]);

  const isDept = config.departmentKey !== 'all';

  // Deadline urgency helper
  const deadlineUrgency = (dateStr?: string): 'overdue' | 'soon' | 'normal' | null => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'overdue';
    if (diff <= 7) return 'soon';
    return 'normal';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {filtered.length} of {sites.length} sites{isDept ? ` in ${config.departmentLabel} lane` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search sites..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">All Stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s] || s.replaceAll('_', ' ')}</option>
            ))}
          </select>
          {totalBlocked > 0 && (
            <button
              onClick={() => setBlockedOnly(!blockedOnly)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                blockedOnly
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-white text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-rose-200 hover:text-rose-600'
              }`}
            >
              <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />{totalBlocked} Blocked
            </button>
          )}
        </div>
      </div>

      {!filtered.length ? (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">No sites match the current filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                {!isDept && <th className="px-4 py-3 font-medium">Dept Lane</th>}
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Milestones</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Last Updated</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((site) => {
                const urgency = deadlineUrgency(site.latest_planned_end_date);
                return (
                <tr key={site.name} className={`hover:bg-[var(--surface-raised)]/60 ${site.site_blocked ? 'bg-rose-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-main)]">{site.site_name || site.site_code || site.name}</div>
                    {site.site_code && site.site_name && <div className="text-xs text-[var(--text-muted)]">{site.site_code}</div>}
                    <Link
                      href={`/sites/${encodeURIComponent(site.name)}/dossier`}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-700"
                    >
                      <BookOpen className="h-3 w-3" /> Site dossier
                    </Link>
                    <Link
                      href={`/execution/sites/${encodeURIComponent(site.name)}`}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="h-3 w-3" /> Detail
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {STAGE_LABELS[site.current_site_stage || 'SURVEY'] || (site.current_site_stage || 'SURVEY').replaceAll('_', ' ')}
                    </span>
                  </td>
                  {!isDept && <td className="px-4 py-3 text-[var(--text-muted)]">{(site.department_lane || '-').replaceAll('_', ' ')}</td>}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-gray-200">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(site.site_progress_pct || 0, 100)}%` }} />
                      </div>
                      <span className="text-xs">{formatPercent(site.site_progress_pct || 0)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {site.open_milestone_count || 0} open / {site.milestone_count || 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[var(--text-main)]">{(site.current_owner_role || '-').replaceAll('_', ' ')}</div>
                    <div className="text-xs text-[var(--text-muted)]">{site.current_owner_user || 'Unassigned'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {site.latest_planned_end_date ? (
                      <span className={`text-xs font-medium ${
                        urgency === 'overdue' ? 'text-rose-600' :
                        urgency === 'soon' ? 'text-amber-600' :
                        'text-[var(--text-muted)]'
                      }`}>
                        {new Date(site.latest_planned_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {urgency === 'overdue' && <span className="ml-1 rounded bg-rose-100 px-1 py-0.5 text-[10px]">Overdue</span>}
                        {urgency === 'soon' && <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px]">This week</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {site.modified
                      ? new Date(site.modified).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : site.latest_dpr_date || '-'
                    }
                  </td>
                  <td className="px-4 py-3">
                    {site.site_blocked ? (
                      <div>
                        <span className="inline-block rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">Blocked</span>
                        {site.blocker_reason && (
                          <p className="mt-1 max-w-[180px] truncate text-[10px] text-rose-500" title={site.blocker_reason}>{site.blocker_reason}</p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{site.status || 'Active'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {getNextStages(site.current_site_stage).length > 0 && (
                        <button
                          onClick={() => { setAdvanceTarget(site); setAdvanceStage(getNextStages(site.current_site_stage)[0]); setAdvanceNotes(''); setActionError(''); }}
                          className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                          title="Advance Stage"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setBlockTarget(site); setBlockReason(site.blocker_reason || ''); setActionError(''); }}
                        className={`rounded-lg p-1.5 ${site.site_blocked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-600 hover:bg-rose-50'}`}
                        title={site.site_blocked ? 'Unblock Site' : 'Block Site'}
                      >
                        {site.site_blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Advance Stage Modal ── */}
      {advanceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--text-main)]">Advance Site Stage</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {advanceTarget.site_name || advanceTarget.name} &mdash; currently <strong>{STAGE_LABELS[advanceTarget.current_site_stage || 'SURVEY']}</strong>
            </p>
            {actionError && <p className="mt-2 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">New Stage</label>
                <select
                  value={advanceStage}
                  onChange={(e) => setAdvanceStage(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getNextStages(advanceTarget.current_site_stage).map((s) => (
                    <option key={s} value={s}>{STAGE_LABELS[s] || s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setAdvanceTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" disabled={advancing}>Cancel</button>
              <button onClick={handleAdvanceSite} disabled={advancing || !advanceStage} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {advancing ? 'Advancing...' : 'Advance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Block / Unblock Modal ── */}
      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--text-main)]">
              {blockTarget.site_blocked ? 'Unblock Site' : 'Block Site'}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{blockTarget.site_name || blockTarget.name}</p>
            {actionError && <p className="mt-2 text-sm text-rose-600">{actionError}</p>}
            {!blockTarget.site_blocked && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Blocking Reason (required)</label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Why is this site being blocked?"
                />
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setBlockTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" disabled={blocking}>Cancel</button>
              <button
                onClick={handleToggleBlocked}
                disabled={blocking}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${blockTarget.site_blocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {blocking ? (blockTarget.site_blocked ? 'Unblocking...' : 'Blocking...') : (blockTarget.site_blocked ? 'Unblock' : 'Block')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SitesTab;
