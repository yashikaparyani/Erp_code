'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ── Types ── */
type Alert = {
  name: string;
  event_type: string;
  actor: string;
  actor_name?: string;
  summary: string;
  detail?: string;
  linked_project?: string;
  linked_site?: string;
  route_path?: string;
  is_read: 0 | 1;
  creation: string;
};

/* ── Helpers ── */
const EVENT_LABELS: Record<string, string> = {
  project_created: 'Project Created',
  project_stage_submitted: 'Stage Submitted',
  project_stage_approved: 'Stage Approved',
  project_stage_rejected: 'Stage Rejected',
  site_stage_changed: 'Site Stage Changed',
  site_blocked: 'Site Blocked',
  site_unblocked: 'Site Unblocked',
  milestone_overdue: 'Milestone Overdue',
  milestone_completed: 'Milestone Completed',
  document_uploaded: 'Document Uploaded',
  document_expiring: 'Document Expiring',
  approval_assigned: 'Approval Assigned',
  approval_acted: 'Approval Acted',
  dependency_override_raised: 'Override Raised',
  dependency_override_acted: 'Override Acted',
  dispatch_created: 'Dispatch Created',
  grn_received: 'GRN Received',
  ticket_escalated: 'Ticket Escalated',
  rma_created: 'RMA Created',
  invoice_created: 'Invoice Created',
  mention: 'Mentioned You',
  reminder_due: 'Reminder Due',
  general: 'Notification',
};

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

/* ── Component ── */
export default function AlertBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Fetch unread count */
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts/count');
      const json = await res.json();
      setUnreadCount(json?.data?.count ?? json?.count ?? 0);
    } catch { /* silent */ }
  }, []);

  /* Fetch recent alerts */
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts?limit=20');
      const json = await res.json();
      const list: Alert[] = json?.data ?? json ?? [];
      setAlerts(Array.isArray(list) ? list : []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  /* Poll count every 30s */
  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 30_000);
    return () => clearInterval(iv);
  }, [fetchCount]);

  /* When dropdown opens, load alerts */
  useEffect(() => {
    if (open) fetchAlerts();
  }, [open, fetchAlerts]);

  /* Click outside to close */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  /* Mark single alert read */
  const markRead = async (alertName: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', alert_name: alertName }),
      });
      setAlerts((prev) => prev.map((a) => (a.name === alertName ? { ...a, is_read: 1 } : a)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  /* Mark all read */
  const markAllRead = async () => {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: 1 })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  /* Navigate on alert click */
  const handleAlertClick = (alert: Alert) => {
    if (!alert.is_read) markRead(alert.name);
    if (alert.route_path) {
      router.push(alert.route_path);
      setOpen(false);
    }
  };

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative shell-glass p-3 rounded-[22px] transition-colors flex-shrink-0 hover:bg-[var(--surface-hover)]"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-[var(--text-main)]" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-[10px] h-2.5 bg-[var(--brand-orange)] rounded-full ring-2 ring-white" />
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-[22rem] shell-panel z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--text-main)]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-[var(--accent-strong)] hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[24rem] overflow-y-auto">
            {loading && alerts.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">Loading…</div>
            )}

            {!loading && alerts.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">No notifications yet</div>
            )}

            {alerts.map((alert) => (
              <button
                key={alert.name}
                onClick={() => handleAlertClick(alert)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 transition-colors hover:bg-[var(--surface-hover)] ${
                  !alert.is_read ? 'bg-blue-50/40' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Unread dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    {!alert.is_read ? (
                      <span className="block w-2 h-2 rounded-full bg-[var(--brand-orange)]" />
                    ) : (
                      <Check className="w-3 h-3 text-[var(--text-muted)] opacity-40" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Event label + time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-strong)]">
                        {EVENT_LABELS[alert.event_type] || alert.event_type}
                      </span>
                      <span className="flex-shrink-0 text-[10px] text-[var(--text-muted)]">
                        {timeAgo(alert.creation)}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="mt-0.5 text-sm text-[var(--text-main)] line-clamp-2">{alert.summary}</p>

                    {/* Context chips */}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {alert.actor_name && (
                        <span className="text-[10px] text-[var(--text-muted)]">by {alert.actor_name}</span>
                      )}
                      {alert.linked_project && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-strong)]">
                          {alert.linked_project}
                        </span>
                      )}
                      {alert.route_path && (
                        <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
