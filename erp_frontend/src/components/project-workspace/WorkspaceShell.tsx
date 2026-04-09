'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Columns3,
  FileText,
  Flag,
  FolderTree,
  History,
  LayoutDashboard,
  Loader2,
  ShieldAlert,
  AlertCircle,
  Upload,
  MessageSquare,
  Wallet,
  Building2,
  Clock,
  ChevronDown,
  Activity,
  CheckCircle2,
  Wrench,
  Send,
  Star,
  StickyNote,
  Shield,
  Scale,
  ClipboardList,
  Award,
} from 'lucide-react';
import { formatPercent } from '../dashboards/shared';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { useWorkspacePermissions } from '../../context/WorkspacePermissionContext';
import ReminderDrawer from '../reminders/ReminderDrawer';
import { projectWorkspaceApi } from '@/lib/typedApi';

// ── Shared types & constants ──
import type {
  ProjectDetail, TabKey, DepartmentConfig,
} from './workspace-types';
import { TabErrorBoundary } from './workspace-helpers';

// Re-export types so existing consumers keep working
export type {
  ProjectSummary,
  SiteRow,
  DepartmentLane,
  ProjectDetail,
  ProjectDocument,
  ActivityEntry,
  PMCockpitSummary,
  TabKey,
  DepartmentConfig,
  ActionItem,
} from './workspace-types';
export { SPINE_STAGES, STAGE_LABELS, DOCUMENT_TRACE_STAGES, DOCUMENT_TRACE_STAGE_LABELS, PROJECT_TO_DOCUMENT_STAGE } from './workspace-types';

// ── Tab components (extracted) ──
import OverviewTab from './OverviewTab';
import SitesTab from './SitesTab';
import SiteBoardTab from './SiteBoardTab';
import MilestonesTab from './MilestonesTab';
import OpsTab from './OpsTab';
import IssuesTab from './IssuesTab';
import StaffTab from './StaffTab';
import PettyCashTab from './PettyCashTab';
import CommunicationsTab from './CommunicationsTab';
import CentralStatusTab from './CentralStatusTab';
import RequestsTab from './RequestsTab';
import TasksTab from './TasksTab';
import TimesheetsTab from './TimesheetsTab';
import NotesTab from './NotesTab';
import FilesTab from './FilesTab';
import ActivityTab from './ActivityTab';
import DossierTab from './DossierTab';
import AccountabilityTab from './AccountabilityTab';
import ApprovalsTab from './ApprovalsTab';
import CloseoutTab from './CloseoutTab';

/* ═══════════════════════════════════════════════════════════
   Tab config
   ═══════════════════════════════════════════════════════════ */

const TAB_META: Record<TabKey, { label: string; icon: typeof LayoutDashboard }> = {
  overview:         { label: 'Overview',         icon: LayoutDashboard },
  sites:            { label: 'Sites',            icon: FolderTree },
  board:            { label: 'Site Board',       icon: Columns3 },
  milestones:       { label: 'Milestones',       icon: Flag },
  ops:              { label: 'Operations',       icon: Activity },
  issues:           { label: 'Issues',           icon: AlertCircle },
  staff:            { label: 'Staff',            icon: ShieldAlert },
  petty_cash:       { label: 'Petty Cash',       icon: Wallet },
  comms:            { label: 'Communications',   icon: MessageSquare },
  central_status:   { label: 'Central Status',   icon: Building2 },
  requests:         { label: 'Requests',         icon: Send },
  notes:            { label: 'Notes',            icon: StickyNote },
  tasks:            { label: 'Tasks',            icon: CheckCircle2 },
  timesheets:       { label: 'Timesheets',       icon: Clock },
  files:            { label: 'Files',            icon: FileText },
  activity:         { label: 'Activity',         icon: History },
  dossier:          { label: 'Dossier',          icon: Shield },
  accountability:   { label: 'Accountability',   icon: Scale },
  approvals:        { label: 'Approvals',        icon: ClipboardList },
  closeout:         { label: 'Closeout',         icon: Award },
};

/* ═══════════════════════════════════════════════════════════
   Main Workspace Shell
   ═══════════════════════════════════════════════════════════ */

export default function WorkspaceShell({ projectId, config }: { projectId: string; config: DepartmentConfig }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions, isLoaded: isPermissionLoaded } = usePermissions();
  const { wp, isLoaded: isWpLoaded, loadForProject } = useWorkspacePermissions();

  // Load workspace permissions for this project
  useEffect(() => {
    if (projectId) { void loadForProject(projectId); }
  }, [projectId, loadForProject]);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const initialTab = useMemo<TabKey>(() => {
    const requestedTab = searchParams?.get('tab') as TabKey | null;
    if (requestedTab && config.tabs.includes(requestedTab)) {
      return requestedTab;
    }
    return config.tabs[0] || 'overview';
  }, [config.tabs, searchParams]);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  /* ── Favorite state ── */
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  useEffect(() => {
    projectWorkspaceApi.getFavorites<string[]>().then((favs) => {
      if (Array.isArray(favs) && favs.includes(projectId)) setIsFavorite(true);
    }).catch(() => {});
  }, [projectId]);
  const toggleFavorite = useCallback(async () => {
    setFavoriteLoading(true);
    try {
      const res = await projectWorkspaceApi.toggleFavorite<{ is_favorite: boolean }>(projectId);
      setIsFavorite(res.is_favorite);
    } catch { /* ignore */ }
    setFavoriteLoading(false);
  }, [projectId]);

  /* ── Actions dropdown ── */
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!projectId) return;
      setLoading(true);
      setError('');
      try {
        const data = await projectWorkspaceApi.getDetail<ProjectDetail>(
          projectId,
          config.departmentKey !== 'all' ? config.departmentKey : undefined,
        );
        if (!active) return;
        setDetail(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load project workspace');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [projectId, reloadKey, config.departmentKey]);

  // Filter sites by department's allowed stages
  const deptSites = useMemo(() => {
    if (!detail?.sites) return [];
    if (config.departmentKey !== 'all' && detail.selected_department_lane?.sites?.length) {
      return detail.selected_department_lane.sites;
    }
    if (!config.allowedStages) return detail.sites;
    const allowed = new Set(config.allowedStages);
    return detail.sites.filter((s) => allowed.has(s.current_site_stage || 'SURVEY'));
  }, [detail?.sites, detail?.selected_department_lane, config.allowedStages, config.departmentKey]);

  const ps = detail?.project_summary;
  const visibleTabs = useMemo(() => {
    const configured = config.tabs;
    const tabSource = isWpLoaded && wp?.visible_tabs?.length
      ? wp.visible_tabs
      : (isPermissionLoaded && permissions?.visible_tabs?.length
        ? permissions.visible_tabs
        : null);

    if (!tabSource) return configured;

    const backendVisible = new Set(
      tabSource.filter((tab): tab is TabKey => configured.includes(tab as TabKey)),
    );

    const intersected = configured.filter((tab) => backendVisible.has(tab));
    return intersected.length ? intersected : configured;
  }, [config.tabs, isPermissionLoaded, permissions?.visible_tabs, isWpLoaded, wp?.visible_tabs]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] || 'overview');
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    const requestedTab = searchParams?.get('tab') as TabKey | null;
    if (requestedTab && visibleTabs.includes(requestedTab) && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
      return;
    }
    if (!requestedTab && activeTab !== (config.tabs[0] || 'overview')) {
      setActiveTab(config.tabs[0] || 'overview');
    }
  }, [activeTab, config.tabs, searchParams, visibleTabs]);

  const buildWorkspaceHref = useCallback((tab: TabKey) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tab);
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    router.replace(buildWorkspaceHref(tab), { scroll: false });
  }, [buildWorkspaceHref, router]);

  /* –– Loading / Error states –– */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading {config.kickerLabel.toLowerCase()}...</span>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-rose-600">{error || 'Project not found'}</p>
        <button onClick={() => setReloadKey((k) => k + 1)} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ── Workspace Header ── */}
      <div className="workspace-hero mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link href={config.backHref} className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">
              <ArrowLeft className="h-3.5 w-3.5" /> {config.backLabel}
            </Link>
            <div className="workspace-kicker">{config.kickerLabel}</div>
            <h1 className="mt-2 flex items-center gap-3 text-[clamp(1.5rem,2.2vw,2.2rem)] font-semibold tracking-tight text-[var(--text-main)]">
              {ps?.project_name || projectId}
              {/* Star / Favourite */}
              <button
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                className="inline-flex items-center justify-center rounded-lg p-1 transition-colors hover:bg-[var(--surface-raised)]"
              >
                <Star className={`h-5 w-5 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-[var(--text-muted)]'}`} />
              </button>
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {ps?.customer || 'No customer'} &middot; {((ps?.current_project_stage) || 'SURVEY').replaceAll('_', ' ')} &middot; {formatPercent(ps?.spine_progress_pct || 0)} complete
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:pt-6">
            {config.departmentKey !== 'all' && (
              <div className="workspace-chip !border-blue-200 !bg-blue-50 !text-blue-700">{config.departmentLabel}</div>
            )}
            <div className="workspace-chip">{config.departmentKey === 'all' ? detail.site_count : deptSites.length} sites</div>
            <div className="workspace-chip">{ps?.status || 'Open'}</div>
            {detail.action_queue.blocked_count > 0 && (
              <div className="workspace-chip !border-rose-200 !bg-rose-50 !text-rose-600">{detail.action_queue.blocked_count} blocked</div>
            )}

            {/* ── RISE-style action cluster ── */}
            <div className="flex items-center gap-1.5 ml-1">
              <ReminderDrawer projectId={projectId} projectName={ps?.project_name || projectId} />

              {/* Actions dropdown */}
              <div className="relative">
                <button
                  onClick={() => setActionsOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-main)] shadow-sm transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Actions
                  <ChevronDown className={`h-3 w-3 transition-transform ${actionsOpen ? 'rotate-180' : ''}`} />
                </button>
                {actionsOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setActionsOpen(false)} />
                    <div className="absolute right-0 z-40 mt-1 w-52 rounded-xl border border-[var(--border-subtle)] bg-white py-1 shadow-lg">
                      <button
                        onClick={() => { setActionsOpen(false); handleTabChange('overview'); setReloadKey((k) => k + 1); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-raised)]"
                      >
                        <Activity className="h-3.5 w-3.5" /> Refresh Workspace
                      </button>
                      <button
                        onClick={() => { setActionsOpen(false); handleTabChange('notes'); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-raised)]"
                      >
                        <StickyNote className="h-3.5 w-3.5" /> Add Note
                      </button>
                      <button
                        onClick={() => { setActionsOpen(false); handleTabChange('files'); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-raised)]"
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload File
                      </button>
                      <div className="my-1 border-t border-[var(--border-subtle)]" />
                      <button
                        onClick={() => { setActionsOpen(false); handleTabChange('staff'); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-raised)]"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" /> Manage Staff
                      </button>
                      <button
                        onClick={() => { setActionsOpen(false); handleTabChange('comms'); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-raised)]"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Communications
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="mb-6 border-b border-[var(--border-subtle)]">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Workspace tabs">
          {visibleTabs.map((tabKey) => {
            const meta = TAB_META[tabKey];
            const active = tabKey === activeTab;
            return (
              <button
                key={tabKey}
                onClick={() => handleTabChange(tabKey)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-[var(--accent)] text-[var(--accent-strong)]'
                    : 'border-transparent text-[var(--text-muted)] hover:border-gray-300 hover:text-[var(--text-main)]'
                }`}
              >
                <meta.icon className="h-4 w-4" />
                {meta.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'overview' && <OverviewTab detail={detail} config={config} deptSites={deptSites} projectId={projectId} onTabChange={handleTabChange} buildTabHref={buildWorkspaceHref} wp={wp} />}
      {activeTab === 'sites' && <SitesTab sites={deptSites} config={config} projectId={projectId} wp={wp} />}
      {activeTab === 'board' && <SiteBoardTab sites={deptSites} config={config} wp={wp} />}
      {activeTab === 'milestones' && <MilestonesTab sites={deptSites} projectId={projectId} config={config} />}
      {activeTab === 'ops' && <OpsTab projectId={projectId} config={config} />}
      {activeTab === 'issues' && <IssuesTab projectId={projectId} />}
      {activeTab === 'staff' && <StaffTab projectId={projectId} />}
      {activeTab === 'petty_cash' && <PettyCashTab projectId={projectId} />}
      {activeTab === 'comms' && <CommunicationsTab projectId={projectId} />}
      {activeTab === 'central_status' && <CentralStatusTab projectId={projectId} />}
      {activeTab === 'requests' && <RequestsTab projectId={projectId} />}
      {activeTab === 'tasks' && <TasksTab projectId={projectId} />}
      {activeTab === 'timesheets' && <TimesheetsTab projectId={projectId} />}
      {activeTab === 'notes' && <NotesTab projectId={projectId} />}
      {activeTab === 'files' && <FilesTab projectId={projectId} currentStage={ps?.current_project_stage} wp={wp} />}
      {activeTab === 'activity' && <TabErrorBoundary><ActivityTab projectId={projectId} /></TabErrorBoundary>}
      {activeTab === 'dossier' && <DossierTab projectId={projectId} />}
      {activeTab === 'accountability' && <AccountabilityTab projectId={projectId} />}
      {activeTab === 'approvals' && <ApprovalsTab projectId={projectId} />}
      {activeTab === 'closeout' && <CloseoutTab projectId={projectId} />}
    </div>
  );
}
