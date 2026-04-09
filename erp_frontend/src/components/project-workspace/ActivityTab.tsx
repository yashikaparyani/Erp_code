'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { projectWorkspaceApi } from '@/lib/typedApi';
import RecordComments from '../collaboration/RecordComments';
import MentionsPanel from '../mentions/MentionsPanel';
import type { ActivityEntry } from './workspace-types';
import { STAGE_LABELS } from './workspace-types';

const ACTIVITY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'version', label: 'Updates' },
  { key: 'comment', label: 'Comments' },
  { key: 'site_comment', label: 'Sites' },
  { key: 'workflow', label: 'Workflow' },
  { key: 'alert', label: 'Alerts' },
  { key: 'accountability', label: 'Accountability' },
] as const;



function ActivityTab({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await projectWorkspaceApi.getActivity<ActivityEntry[]>(projectId, 50);
        if (active) setEntries(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  const filtered = typeFilter === 'all' ? entries : entries.filter((e) => e.type === typeFilter);

  // Count per type for filter badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.type] = (counts[e.type] || 0) + 1;
    return counts;
  }, [entries]);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading activity...</div>;
  if (error) return <p className="py-12 text-center text-sm text-rose-600">{error}</p>;
  if (!entries.length) return <p className="py-12 text-center text-sm text-[var(--text-muted)]">No activity recorded for this project yet.</p>;

  const typeLabel: Record<string, string> = { version: 'Update', comment: 'Comment', site_comment: 'Site', workflow: 'Workflow', alert: 'Alert', accountability: 'Accountability' };
  const typeBg: Record<string, string> = { version: 'bg-blue-50 text-blue-700', comment: 'bg-violet-50 text-violet-700', site_comment: 'bg-amber-50 text-amber-700', workflow: 'bg-emerald-50 text-emerald-700', alert: 'bg-rose-50 text-rose-700', accountability: 'bg-orange-50 text-orange-700' };
  const typeIcon: Record<string, string> = { version: '🔄', comment: '💬', site_comment: '📍', workflow: '⚡', alert: '🔔', accountability: '📋' };

  return (
    <div className="space-y-6">
      {/* Project Discussion */}
      <RecordComments referenceDoctype="Project" referenceName={projectId} />

      {/* Mentions */}
      <MentionsPanel projectId={projectId} compact limit={5} />

      {/* Type filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)] pb-3">
        {ACTIVITY_FILTERS.map(({ key, label }) => {
          const active = typeFilter === key;
          const count = key === 'all' ? entries.length : (typeCounts[key] || 0);
          if (key !== 'all' && count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-[var(--brand-orange)] text-white'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]'
              }`}
            >
              {label}
              <span className={`ml-1 ${active ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Activity Feed */}
      <div className="space-y-2">
      {filtered.map((entry, idx) => {
        const isWorkflow = entry.type === 'workflow';
        const isApproval = isWorkflow && (entry.action === 'approve' || entry.action === 'submit');
        const isReject = isWorkflow && (entry.action === 'reject' || entry.action === 'block');

        return (
        <div
          key={`${entry.type}-${entry.timestamp}-${idx}`}
          className={`flex gap-4 rounded-xl border px-4 py-3 ${
            isReject ? 'border-rose-200 bg-rose-50/30' :
            isApproval ? 'border-emerald-200 bg-emerald-50/30' :
            'border-[var(--border-subtle)] bg-white'
          }`}
        >
          <div className="pt-0.5 flex-shrink-0">
            <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeBg[entry.type] || 'bg-gray-100 text-gray-600'}`}>
              {typeIcon[entry.type] || ''} {typeLabel[entry.type] || entry.type}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[var(--text-main)]">{entry.summary}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
              <span className="font-medium">{entry.actor}</span>
              <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
              {entry.ref_doctype === 'GE Site' && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Site: {entry.ref_name}
                </span>
              )}
              {isWorkflow && entry.stage && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                  {STAGE_LABELS[entry.stage] || entry.stage}
                </span>
              )}
            </div>
            {entry.type === 'version' && Array.isArray(entry.detail) && entry.detail.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {entry.detail.slice(0, 5).map((field) => (
                  <span key={field} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{field}</span>
                ))}
                {entry.detail.length > 5 && <span className="text-[10px] text-[var(--text-muted)]">+{entry.detail.length - 5} more</span>}
              </div>
            )}
            {(entry.type === 'alert' || entry.type === 'accountability') && entry.route && (
              <Link href={entry.route} className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                View details →
              </Link>
            )}
          </div>
        </div>
        );
      })}
      </div>

      {filtered.length === 0 && entries.length > 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">No {typeFilter} entries found.</p>
      )}
    </div>
  );
}

export default ActivityTab;
