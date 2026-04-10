'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AtSign, Check, ExternalLink, MessageSquare } from 'lucide-react';

/* ── Types ── */
interface Mention {
  name: string;
  mentioned_user: string;
  mentioned_by: string;
  reference_doctype: string;
  reference_name: string;
  context_summary?: string;
  is_read: 0 | 1;
  creation: string;
}

interface MentionsPanelProps {
  /** If provided, filter to mentions in this project context */
  projectId?: string;
  /** Max number of mentions to show */
  limit?: number;
  /** Whether to show a compact version */
  compact?: boolean;
}

/* ── Helpers ── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getDocTypeRoute(doctype: string, name: string): string | null {
  const routes: Record<string, string> = {
    Project: `/projects/${name}`,
    'GE Site': `/execution?site=${name}`,
    'GE Tender': `/pre-sales/${encodeURIComponent(name)}`,
    'GE Milestone': `/milestones?id=${name}`,
    'GE Drawing': `/drawings?id=${name}`,
    'GE Project Document': `/documents?id=${name}`,
    'GE Indent': `/indents?id=${name}`,
    'GE Purchase Order': `/purchase-orders?id=${name}`,
    'GE GRN': `/grns?id=${name}`,
    'GE Invoice': `/finance/invoices?id=${name}`,
    'GE Ticket': `/om-helpdesk?id=${name}`,
  };
  return routes[doctype] || null;
}

/* ── Component ── */
export default function MentionsPanel({ projectId, limit = 10, compact = false }: MentionsPanelProps) {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMentions = useCallback(async () => {
    try {
      // Use collaboration API for mentions
      const params = new URLSearchParams();
      params.set('type', 'mentions');
      params.set('limit', String(limit));
      if (projectId) params.set('project', projectId);

      const res = await fetch(`/api/collaboration/mentions?${params.toString()}`);
      const json = await res.json();
      const list: Mention[] = json?.data ?? json ?? [];
      setMentions(Array.isArray(list) ? list : []);
    } catch {
      // silent - may not have mentions endpoint yet
    }
    setLoading(false);
  }, [projectId, limit]);

  useEffect(() => {
    fetchMentions();
  }, [fetchMentions]);

  const markAsRead = async (mentionName: string) => {
    try {
      await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'mark_mention_read', args: { mention_name: mentionName } }),
      });
      setMentions(prev => prev.map(m => m.name === mentionName ? { ...m, is_read: 1 } : m));
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-gray-400">
        Loading mentions…
      </div>
    );
  }

  const unreadCount = mentions.filter(m => !m.is_read).length;

  if (compact) {
    // Compact chip view for workspace header
    if (unreadCount === 0) return null;
    return (
      <Link 
        href="/notifications?filter=mentions"
        className="workspace-chip inline-flex items-center gap-1.5 cursor-pointer hover:!bg-[var(--surface-hover)]"
        title={`${unreadCount} unread mention${unreadCount > 1 ? 's' : ''}`}
      >
        <AtSign className="w-3.5 h-3.5" />
        <span>{unreadCount}</span>
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <AtSign className="w-4 h-4 text-violet-500" />
          <h4 className="text-sm font-semibold text-[var(--text-main)]">Mentions</h4>
          {unreadCount > 0 && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
              {unreadCount} new
            </span>
          )}
        </div>
        <Link 
          href="/notifications?filter=mentions"
          className="text-xs text-[var(--accent-strong)] hover:underline"
        >
          View All
        </Link>
      </div>

      {/* List */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {mentions.length === 0 ? (
          <div className="py-8 text-center">
            <AtSign className="mx-auto w-6 h-6 text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">No mentions yet</p>
          </div>
        ) : (
          mentions.map(mention => {
            const route = getDocTypeRoute(mention.reference_doctype, mention.reference_name);
            return (
              <div 
                key={mention.name} 
                className={`px-4 py-3 ${!mention.is_read ? 'bg-violet-50/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread indicator */}
                  <div className="mt-1.5 flex-shrink-0">
                    {!mention.is_read ? (
                      <span className="block w-2 h-2 rounded-full bg-violet-500" />
                    ) : (
                      <Check className="w-3 h-3 text-gray-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--text-main)]">
                        {mention.mentioned_by}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {timeAgo(mention.creation)}
                      </span>
                    </div>

                    {mention.context_summary && (
                      <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
                        {mention.context_summary}
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                        <MessageSquare className="w-3 h-3" />
                        {mention.reference_doctype?.replace('GE ', '')}
                      </span>
                      {route && (
                        <Link
                          href={route}
                          className="inline-flex items-center gap-0.5 text-[10px] text-[var(--accent-strong)] hover:underline"
                          onClick={() => !mention.is_read && markAsRead(mention.name)}
                        >
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                      {!mention.is_read && (
                        <button
                          onClick={() => markAsRead(mention.name)}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
