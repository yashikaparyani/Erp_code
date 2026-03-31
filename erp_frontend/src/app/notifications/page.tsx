'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Bell,
  Clock,
  FileWarning,
  Calendar,
  AlertTriangle,
  ClipboardCheck,
  RefreshCw,
  ExternalLink,
  CheckCheck,
  AtSign,
} from 'lucide-react';

/* ── Types ── */
interface FeedItem {
  type: 'alert' | 'reminder' | 'mention' | 'document' | 'tender' | 'approval';
  subtype: string;
  title: string;
  detail: string;
  ref_doctype?: string;
  ref_name?: string;
  route?: string;
  project?: string;
  is_read: number;
  timestamp: string;
  source_name: string;
}

interface NotificationSummary {
  unread_alerts: number;
  active_reminders: number;
  due_reminders: number;
  overdue_reminders: number;
  unread_mentions: number;
  expiring_documents: number;
  expired_documents: number;
  tender_deadlines: number;
  overdue_milestones: number;
  pending_approvals: number;
}

interface NotificationData {
  summary: NotificationSummary;
  feed: FeedItem[];
  alerts: unknown[];
  reminders: unknown[];
  mentions: unknown[];
  expiring_documents: unknown[];
  expired_documents: unknown[];
  upcoming_tenders: unknown[];
  overdue_milestones: unknown[];
  pending_approvals: unknown[];
}

type FilterType = 'all' | 'alerts' | 'reminders' | 'mentions' | 'documents' | 'tenders' | 'approvals';

/* ── Helpers ── */
async function callOps<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await res.json();
  if (!res.ok || !payload.success) throw new Error(payload.message || 'API error');
  return payload.data as T;
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  alert: Bell,
  reminder: Clock,
  mention: AtSign,
  document: FileWarning,
  tender: Calendar,
  approval: ClipboardCheck,
};

const TYPE_COLORS: Record<string, string> = {
  alert: 'bg-blue-100 text-blue-600',
  reminder: 'bg-amber-100 text-amber-600',
  mention: 'bg-violet-100 text-violet-600',
  document: 'bg-rose-100 text-rose-600',
  tender: 'bg-emerald-100 text-emerald-600',
  approval: 'bg-orange-100 text-orange-600',
};

const FILTER_OPTIONS: { key: FilterType; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: Bell },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'reminders', label: 'Reminders', icon: Clock },
  { key: 'mentions', label: 'Mentions', icon: AtSign },
  { key: 'documents', label: 'Documents', icon: FileWarning },
  { key: 'tenders', label: 'Tenders', icon: Calendar },
  { key: 'approvals', label: 'Approvals', icon: ClipboardCheck },
];

/* ── Component ── */
export default function NotificationsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await callOps<NotificationData>('get_notification_center', {});
      setData(result);
    } catch {
      // Silent fail - show empty state
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const requested = searchParams ? searchParams.get('filter') : null;
    if (requested && FILTER_OPTIONS.some(opt => opt.key === requested)) {
      setFilter(requested as FilterType);
    }
  }, [searchParams]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      await loadData();
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load notifications. Please refresh.
      </div>
    );
  }

  const { summary, feed } = data;

  // Filter feed
  const filteredFeed = filter === 'all' 
    ? feed 
    : feed.filter(item => {
        if (filter === 'alerts') return item.type === 'alert';
        if (filter === 'reminders') return item.type === 'reminder';
        if (filter === 'mentions') return item.type === 'mention';
        if (filter === 'documents') return item.type === 'document';
        if (filter === 'tenders') return item.type === 'tender';
        if (filter === 'approvals') return item.type === 'approval';
        return true;
      });

  const totalActionable = summary.unread_alerts + summary.due_reminders + summary.unread_mentions + 
    summary.pending_approvals + summary.expiring_documents + summary.tender_deadlines;
  const criticalFeed = filteredFeed.filter((item) =>
    item.type === 'approval' || item.type === 'document' || (item.type === 'reminder' && item.subtype === 'overdue') || !item.is_read,
  );
  const collaborationFeed = filteredFeed.filter((item) => item.type === 'mention' || item.type === 'alert');
  const executionFeed = filteredFeed.filter((item) =>
    item.project || item.route?.startsWith('/projects/') || item.route?.startsWith('/execution'),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notification Center</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Alerts, reminders, mentions, and actionable items in one place
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh} 
            className="btn btn-secondary"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {summary.unread_alerts > 0 && (
            <button onClick={handleMarkAllRead} className="btn btn-primary">
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <SummaryCard 
          icon={Bell} 
          color="blue" 
          value={summary.unread_alerts} 
          label="Unread Alerts"
          highlight={summary.unread_alerts > 0}
        />
        <SummaryCard 
          icon={Clock} 
          color="amber" 
          value={summary.due_reminders} 
          label="Due Reminders"
          hint={`${summary.overdue_reminders} overdue`}
          highlight={summary.overdue_reminders > 0}
        />
        <SummaryCard 
          icon={AtSign} 
          color="violet" 
          value={summary.unread_mentions} 
          label="Mentions"
          highlight={summary.unread_mentions > 0}
        />
        <SummaryCard 
          icon={FileWarning} 
          color="rose" 
          value={summary.expiring_documents} 
          label="Expiring Docs"
          hint={`${summary.expired_documents} expired`}
          highlight={summary.expired_documents > 0}
        />
        <SummaryCard 
          icon={Calendar} 
          color="emerald" 
          value={summary.tender_deadlines} 
          label="Tender Deadlines"
        />
        <SummaryCard 
          icon={ClipboardCheck} 
          color="orange" 
          value={summary.pending_approvals} 
          label="Pending Approvals"
          highlight={summary.pending_approvals > 0}
        />
      </div>

      {/* Quick Action Banner */}
      {totalActionable > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-800">
                {totalActionable} item{totalActionable > 1 ? 's' : ''} require your attention
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/notifications?filter=approvals" className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                Clear approvals
              </Link>
              <Link href="/notifications?filter=documents" className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                Review documents
              </Link>
              <Link href="/notifications?filter=mentions" className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                Handle mentions
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-6">
        <TriageCard
          title="Critical Queue"
          count={criticalFeed.length}
          tone="rose"
          detail="Unread alerts, approvals, overdue reminders, and document governance signals."
          href="/notifications?filter=approvals"
        />
        <TriageCard
          title="Collaboration Queue"
          count={collaborationFeed.length}
          tone="violet"
          detail="Mentions and project-side alert traffic that needs a human response."
          href="/notifications?filter=mentions"
        />
        <TriageCard
          title="Execution-Linked Signals"
          count={executionFeed.length}
          tone="blue"
          detail="Signals already tied to projects and execution routes so teams can act without context switching."
          href="/execution"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`btn ${filter === opt.key ? 'btn-primary' : 'btn-secondary'} text-sm`}
          >
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Activity Feed</h3>
          <span className="text-xs text-gray-500">{filteredFeed.length} items</span>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredFeed.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No notifications in this category</p>
            </div>
          ) : (
            filteredFeed.map((item, idx) => (
              <FeedItemRow key={`${item.source_name}-${idx}`} item={item} />
            ))
          )}
        </div>
      </div>

      {/* Sections for specific types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Overdue Milestones */}
        {data.overdue_milestones.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Overdue Milestones</h3>
            </div>
            <div className="p-4 space-y-2">
              {(data.overdue_milestones as { name: string; milestone_name: string; linked_project: string; planned_date: string }[]).slice(0, 5).map(m => (
                <Link key={m.name} href={`/projects/${encodeURIComponent(m.linked_project)}?tab=milestones`} className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2 hover:bg-rose-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{m.milestone_name}</div>
                    <div className="text-xs text-blue-600">{m.linked_project}</div>
                  </div>
                  <div className="text-xs text-rose-600 font-medium">Due {m.planned_date}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Expired Documents */}
        {data.expired_documents.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Expired Documents</h3>
            </div>
            <div className="p-4 space-y-2">
              {(data.expired_documents as { name: string; document_name: string; linked_project: string; expiry_date: string }[]).slice(0, 5).map(d => (
                <Link key={d.name} href={`/projects/${encodeURIComponent(d.linked_project)}?tab=dossier`} className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2 hover:bg-rose-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{d.document_name}</div>
                    <div className="text-xs text-blue-600">{d.linked_project}</div>
                  </div>
                  <div className="text-xs text-rose-600 font-medium">Expired {d.expiry_date}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helper Components ── */

function SummaryCard({ 
  icon: Icon, 
  color, 
  value, 
  label, 
  hint,
  highlight 
}: { 
  icon: React.ElementType; 
  color: string; 
  value: number; 
  label: string;
  hint?: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    violet: 'bg-violet-100 text-violet-600',
    rose: 'bg-rose-100 text-rose-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className={`stat-card ${highlight ? 'ring-2 ring-amber-300' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label text-xs">{label}</div>
        </div>
      </div>
      {hint && <div className="text-xs text-gray-500 mt-2">{hint}</div>}
    </div>
  );
}

function FeedItemRow({ item }: { item: FeedItem }) {
  const Icon = TYPE_ICONS[item.type] || Bell;
  const colorClass = TYPE_COLORS[item.type] || TYPE_COLORS.alert;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition ${!item.is_read ? 'bg-blue-50/30' : ''}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-medium text-gray-900">{item.title}</div>
            <div className="text-xs text-gray-500 line-clamp-2">{item.detail}</div>
          </div>
          <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
            {timeAgo(item.timestamp)}
          </div>
        </div>
        {(item.project || item.route) && (
          <div className="mt-1 flex items-center gap-2">
            {item.project && (
              <Link 
                href={`/projects/${item.project}`}
                className="text-xs text-blue-600 hover:underline"
              >
                {item.project}
              </Link>
            )}
            {item.route && (
              <Link 
                href={item.route}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                View <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </div>
      {!item.is_read && (
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
      )}
    </div>
  );
}

function TriageCard({
  title,
  count,
  detail,
  tone,
  href,
}: {
  title: string;
  count: number;
  detail: string;
  tone: 'rose' | 'violet' | 'blue';
  href: string;
}) {
  const styles = {
    rose: 'border-rose-200 bg-rose-50/70 text-rose-700',
    violet: 'border-violet-200 bg-violet-50/70 text-violet-700',
    blue: 'border-blue-200 bg-blue-50/70 text-blue-700',
  }[tone];

  return (
    <Link href={href} className={`rounded-2xl border px-4 py-4 transition hover:shadow-sm ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xl font-semibold">{count}</div>
      </div>
      <div className="mt-2 text-xs leading-5 text-gray-600">{detail}</div>
    </Link>
  );
}
