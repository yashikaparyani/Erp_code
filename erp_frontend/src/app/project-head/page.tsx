'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Briefcase, CheckSquare, Send, ScrollText,
  AlertCircle, Loader2, RefreshCcw, ChevronRight,
  Clock, IndianRupee,
} from 'lucide-react';
import RegisterPage, { StatItem } from '@/components/shells/RegisterPage';

interface DashboardStats {
  active_projects: number;
  pending_approvals: number;
  pending_pm_requests: number;
  pending_petty_cash: number;
  total_approved_value: number;
}

const QUICK_LINKS = [
  { label: 'Project Workspace', href: '/projects', icon: Briefcase, description: 'View and manage all projects' },
  { label: 'Approval Hub', href: '/project-head/approval', icon: CheckSquare, description: 'POs, RMA POs, petty cash approvals' },
  { label: 'PM Requests', href: '/project-head/requests', icon: Send, description: 'Review PM escalations and requests' },
  { label: 'Letter of Completion', href: '/project-head/letter-of-completion', icon: ScrollText, description: 'Issue letters of completion' },
];

export default function ProjectHeadDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [approvalRes, requestsRes] = await Promise.all([
        fetch('/api/approval-hub?tab=po').then(r => r.json()),
        fetch('/api/pm-requests').then(r => r.json()),
      ]);
      const approvalStats = approvalRes.stats || {};
      const pmRequests = Array.isArray(requestsRes.data) ? requestsRes.data : [];
      const pendingPm = pmRequests.filter((r: { status?: string }) => r.status === 'Pending').length;
      setStats({
        active_projects: 0,
        pending_approvals: approvalStats.pending ?? 0,
        pending_pm_requests: pendingPm,
        pending_petty_cash: 0,
        total_approved_value: approvalStats.approved ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const statItems: StatItem[] = stats ? [
    { label: 'Pending Approvals', value: stats.pending_approvals, variant: stats.pending_approvals > 0 ? 'warning' : 'default' },
    { label: 'PM Requests', value: stats.pending_pm_requests, variant: stats.pending_pm_requests > 0 ? 'warning' : 'default' },
    { label: 'Approved Items', value: stats.total_approved_value, variant: 'success' },
  ] : [];

  return (
    <RegisterPage
      title="Project Head Workspace"
      description="Central hub for project oversight, approvals, and PM request management"
      loading={loading}
      error={error}
      empty={false}
      onRetry={load}
      stats={statItems}
      headerActions={
        <button onClick={() => void load()} className="btn btn-secondary text-xs" disabled={loading}>
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh
        </button>
      }
    >
      <div className="p-4 space-y-6">
        {/* Action alerts */}
        {stats && stats.pending_approvals > 0 && (
          <Link href="/project-head/approval" className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-800">{stats.pending_approvals} item{stats.pending_approvals !== 1 ? 's' : ''} awaiting your approval</div>
              <div className="text-xs text-amber-600">Purchase Orders, RMA POs, and Petty Cash requests</div>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-400" />
          </Link>
        )}

        {stats && stats.pending_pm_requests > 0 && (
          <Link href="/project-head/requests" className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100">
            <Send className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-blue-800">{stats.pending_pm_requests} PM request{stats.pending_pm_requests !== 1 ? 's' : ''} pending review</div>
              <div className="text-xs text-blue-600">Timeline extensions, staffing, petty cash exceptions</div>
            </div>
            <ChevronRight className="h-4 w-4 text-blue-400" />
          </Link>
        )}

        {/* Quick links grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map(({ label, href, icon: Icon, description }) => (
            <Link key={href} href={href} className="flex items-start gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-main)] p-5 transition-all hover:shadow-md hover:border-[var(--accent)]">
              <div className="rounded-lg bg-[var(--surface-raised)] p-2.5">
                <Icon className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--text-main)]">{label}</div>
                <div className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-muted)] mt-1 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </RegisterPage>
  );
}
