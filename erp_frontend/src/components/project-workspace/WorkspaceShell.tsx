'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Columns3,
  Copy,
  Edit3,
  FileText,
  Flag,
  FolderTree,
  History,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCcw,
  ShieldAlert,
  AlertCircle,
  Trash2,
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
import ActionModal from '../ui/ActionModal';
import { apiFetch } from '@/lib/api-client';

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

const STAGE_OPTIONS = [
  { value: 'SURVEY', label: 'Survey' },
  { value: 'BOQ_DESIGN', label: 'BOQ / Design' },
  { value: 'COSTING', label: 'Costing' },
  { value: 'PROCUREMENT', label: 'Procurement' },
  { value: 'STORES_DISPATCH', label: 'Stores / Dispatch' },
  { value: 'EXECUTION', label: 'Execution / I&C' },
  { value: 'BILLING_PAYMENT', label: 'Billing / Payment' },
  { value: 'OM_RMA', label: 'O&M / RMA' },
  { value: 'CLOSED', label: 'Closed' },
] as const;

type DirectoryUser = {
  name: string;
  full_name?: string;
  roles?: string[];
};

type ProjectEditForm = {
  project_name: string;
  customer: string;
  expected_start_date: string;
  expected_end_date: string;
  project_head: string;
  project_manager_user: string;
  current_project_stage: string;
  linked_tender: string;
  notes: string;
  status: string;
  estimated_costing: string;
  percent_complete: string;
  spine_blocked: boolean;
  blocker_summary: string;
};

/* ═══════════════════════════════════════════════════════════
   Main Workspace Shell
   ═══════════════════════════════════════════════════════════ */

export default function WorkspaceShell({ projectId, config }: { projectId: string; config: DepartmentConfig }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const { permissions, isLoaded: isPermissionLoaded, hasCapability, hasCapabilityWithMode } = usePermissions();
  const { wp, isLoaded: isWpLoaded, loadForProject } = useWorkspacePermissions();

  // Load workspace permissions for this project
  useEffect(() => {
    if (projectId) { void loadForProject(projectId); }
  }, [projectId, loadForProject]);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Listen for workspace-reload from child components (e.g. SitesTab advance/block)
  useEffect(() => {
    const handler = () => setReloadKey((k) => k + 1);
    window.addEventListener('workspace-reload', handler);
    return () => window.removeEventListener('workspace-reload', handler);
  }, []);

  // ── Clone Project state ──
  const [showClone, setShowClone] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [cloneTasks, setCloneTasks] = useState(true);
  const [cloneMilestones, setCloneMilestones] = useState(true);
  const [cloneNotes, setCloneNotes] = useState(true);
  const [cloning, setCloning] = useState(false);

  const initialTab = useMemo<TabKey>(() => {
    const requestedTab = searchParams?.get('tab') as TabKey | null;
    if (requestedTab && config.tabs.includes(requestedTab)) {
      return requestedTab;
    }
    return config.tabs[0] || 'overview';
  }, [config.tabs, searchParams]);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  // Ref so the URL-sync effect can read the current activeTab without being a dep
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

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

  const handleCloneProject = useCallback(async () => {
    if (!cloneName.trim()) return;
    setCloning(true);
    setNotice(null);
    try {
      await apiFetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'clone_project',
          source_project: projectId,
          new_project_name: cloneName.trim(),
          copy_tasks: cloneTasks ? 1 : 0,
          copy_milestones: cloneMilestones ? 1 : 0,
          copy_notes: cloneNotes ? 1 : 0,
        }),
      });
      setShowClone(false);
      setCloneName('');
      setNotice({ tone: 'success', message: `Project cloned as "${cloneName.trim()}".` });
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to clone project' });
    } finally {
      setCloning(false);
    }
  }, [projectId, cloneName, cloneTasks, cloneMilestones, cloneNotes]);

  const handleRefreshSpine = useCallback(async () => {
    setNotice(null);
    try {
      await apiFetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'refresh_project_spine', project: projectId }),
      });
      setReloadKey((k) => k + 1);
      setNotice({ tone: 'success', message: 'Project spine recalculated.' });
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to refresh project spine' });
    }
  }, [projectId]);

  /* ── Actions dropdown ── */
  const [actionsOpen, setActionsOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [showUpdateProject, setShowUpdateProject] = useState(false);
  const [showAddSites, setShowAddSites] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [addingSites, setAddingSites] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState('');
  const [siteRowsText, setSiteRowsText] = useState('');
  const [editForm, setEditForm] = useState<ProjectEditForm>({
    project_name: '',
    customer: '',
    expected_start_date: '',
    expected_end_date: '',
    project_head: '',
    project_manager_user: '',
    current_project_stage: 'SURVEY',
    linked_tender: '',
    notes: '',
    status: 'Open',
    estimated_costing: '',
    percent_complete: '',
    spine_blocked: false,
    blocker_summary: '',
  });

  const canManageProject =
    permissions?.is_superuser
    || hasCapability('project.member.manage');
  const canDeleteProject =
    permissions?.is_superuser
    || hasCapabilityWithMode('project.member.manage', 'approve');

  const projectHeadOptions = directory.filter((u) => (u.roles || []).includes('Project Head'));
  const projectManagerOptions = directory.filter((u) => (u.roles || []).includes('Project Manager'));

  const loadDirectory = useCallback(async () => {
    if (directory.length || directoryLoading) return;
    setDirectoryLoading(true);
    try {
      const response = await fetch('/api/users-list', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to load project owner directory');
      }
      setDirectory(Array.isArray(payload.data) ? payload.data : []);
      setDirectoryError('');
    } catch (err) {
      setDirectoryError(err instanceof Error ? err.message : 'Failed to load project owner directory');
    } finally {
      setDirectoryLoading(false);
    }
  }, [directory.length, directoryLoading]);

  const openUpdateProjectModal = useCallback(async () => {
    setActionsOpen(false);
    setNotice(null);
    await loadDirectory();
    try {
      const result = await apiFetch<{ data?: any }>(`/api/projects/${encodeURIComponent(projectId)}`);
      const project = result.data || result;
      setEditForm({
        project_name: project.project_name || '',
        customer: project.customer || '',
        expected_start_date: project.expected_start_date || '',
        expected_end_date: project.expected_end_date || '',
        project_head: project.project_head || '',
        project_manager_user: project.project_manager_user || '',
        current_project_stage: project.current_project_stage || 'SURVEY',
        linked_tender: project.linked_tender || '',
        notes: project.notes || '',
        status: project.status || 'Open',
        estimated_costing: project.estimated_costing != null ? String(project.estimated_costing) : '',
        percent_complete: project.percent_complete != null ? String(project.percent_complete) : '',
        spine_blocked: (project.spine_blocked || 0) > 0,
        blocker_summary: project.blocker_summary || '',
      });
      setShowUpdateProject(true);
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to load project for editing' });
    }
  }, [loadDirectory, projectId]);

  const handleUpdateProject = useCallback(async () => {
    if (!editForm.project_name.trim()) return;
    setSavingProject(true);
    setNotice(null);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: editForm.project_name.trim(),
          customer: editForm.customer.trim() || undefined,
          expected_start_date: editForm.expected_start_date || undefined,
          expected_end_date: editForm.expected_end_date || undefined,
          project_head: editForm.project_head || undefined,
          project_manager_user: editForm.project_manager_user || undefined,
          current_project_stage: editForm.current_project_stage || 'SURVEY',
          linked_tender: editForm.linked_tender.trim() || undefined,
          notes: editForm.notes.trim() || undefined,
          status: editForm.status || 'Open',
          estimated_costing: editForm.estimated_costing ? Number(editForm.estimated_costing) : undefined,
          percent_complete: editForm.percent_complete ? Number(editForm.percent_complete) : undefined,
          spine_blocked: editForm.spine_blocked ? 1 : 0,
          blocker_summary: editForm.spine_blocked ? editForm.blocker_summary.trim() || undefined : undefined,
        }),
      });
      setShowUpdateProject(false);
      setReloadKey((k) => k + 1);
      setNotice({ tone: 'success', message: 'Project updated successfully.' });
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update project' });
    } finally {
      setSavingProject(false);
    }
  }, [editForm, projectId]);

  const handleAddSites = useCallback(async () => {
    const parsed = siteRowsText
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => {
        const [site_name, site_code] = row.split('|').map((part) => part.trim());
        return { site_name, site_code: site_code || '' };
      })
      .filter((site) => site.site_name);

    if (!parsed.length) {
      setNotice({ tone: 'error', message: 'Add at least one site row before saving.' });
      return;
    }

    setAddingSites(true);
    setNotice(null);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_sites: parsed }),
      });
      setShowAddSites(false);
      setSiteRowsText('');
      setReloadKey((k) => k + 1);
      setNotice({ tone: 'success', message: `${parsed.length} site${parsed.length === 1 ? '' : 's'} added.` });
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to add sites' });
    } finally {
      setAddingSites(false);
    }
  }, [projectId, siteRowsText]);

  const handleDeleteProject = useCallback(async () => {
    setDeletingProject(true);
    setNotice(null);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
      });
      setShowDeleteProject(false);
      router.push(config.backHref);
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to delete project' });
    } finally {
      setDeletingProject(false);
    }
  }, [config.backHref, projectId, router]);

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

    // Superusers (Director / System Manager) see every configured tab without restriction.
    if (isPermissionLoaded && permissions?.is_superuser) return configured;

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
  }, [config.tabs, isPermissionLoaded, permissions?.is_superuser, permissions?.visible_tabs, isWpLoaded, wp?.visible_tabs]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] || 'overview');
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    const requestedTab = searchParams?.get('tab') as TabKey | null;
    if (requestedTab && visibleTabs.includes(requestedTab) && requestedTab !== activeTabRef.current) {
      setActiveTab(requestedTab);
      return;
    }
    if (!requestedTab && activeTabRef.current !== (config.tabs[0] || 'overview')) {
      setActiveTab(config.tabs[0] || 'overview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.tabs, searchParams, visibleTabs]);

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
                      {canManageProject && (
                        <button
                          onClick={() => { setActionsOpen(false); setSiteRowsText(''); setShowAddSites(true); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-raised)]"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Sites
                        </button>
                      )}
                      {canManageProject && (
                        <button
                          onClick={() => { void openUpdateProjectModal(); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-raised)]"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Update Project
                        </button>
                      )}
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
                      {canManageProject && (
                        <button
                          onClick={() => { setActionsOpen(false); setCloneName(''); setShowClone(true); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-raised)]"
                        >
                          <Copy className="h-3.5 w-3.5" /> Clone Project
                        </button>
                      )}
                      <button
                        onClick={() => { setActionsOpen(false); void handleRefreshSpine(); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-main)] hover:bg-[var(--surface-raised)]"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" /> Recalculate Spine
                      </button>
                      {canDeleteProject && (
                        <>
                          <div className="my-1 border-t border-[var(--border-subtle)]" />
                          <button
                            onClick={() => { setActionsOpen(false); setShowDeleteProject(true); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Project
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {notice.message}
        </div>
      )}

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

      <ActionModal
        open={showAddSites}
        title="Add Sites"
        description="One site per line. Optional format: Site Name | SITE-CODE"
        variant="default"
        confirmLabel="Add Sites"
        busy={addingSites}
        onCancel={() => { if (!addingSites) setShowAddSites(false); }}
        onConfirm={handleAddSites}
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Site Rows</label>
          <textarea
            rows={7}
            value={siteRowsText}
            onChange={(e) => setSiteRowsText(e.target.value)}
            placeholder={'Site Alpha | S01\nSite Bravo | S02\nSite Charlie'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">If site code is skipped, backend will auto-generate it.</p>
        </div>
      </ActionModal>

      <ActionModal
        open={showUpdateProject}
        title="Update Project"
        description="Update project header information for this workspace."
        variant="default"
        confirmLabel="Save Changes"
        busy={savingProject}
        onCancel={() => { if (!savingProject) setShowUpdateProject(false); }}
        onConfirm={handleUpdateProject}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Project Name <span className="text-rose-500">*</span></label>
            <input type="text" value={editForm.project_name} onChange={(e) => setEditForm((p) => ({ ...p, project_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Customer</label>
            <input type="text" value={editForm.customer} onChange={(e) => setEditForm((p) => ({ ...p, customer: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Linked Tender</label>
            <input type="text" value={editForm.linked_tender} onChange={(e) => setEditForm((p) => ({ ...p, linked_tender: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Expected Start Date</label>
            <input type="date" value={editForm.expected_start_date} onChange={(e) => setEditForm((p) => ({ ...p, expected_start_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Expected End Date</label>
            <input type="date" value={editForm.expected_end_date} onChange={(e) => setEditForm((p) => ({ ...p, expected_end_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Project Head</label>
            <select value={editForm.project_head} onChange={(e) => setEditForm((p) => ({ ...p, project_head: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select project head...</option>
              {projectHeadOptions.map((u) => (<option key={u.name} value={u.name}>{u.full_name || u.name}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Project Manager</label>
            <select value={editForm.project_manager_user} onChange={(e) => setEditForm((p) => ({ ...p, project_manager_user: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select project manager...</option>
              {projectManagerOptions.map((u) => (<option key={u.name} value={u.name}>{u.full_name || u.name}</option>))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Current Stage</label>
            <select value={editForm.current_project_stage} onChange={(e) => setEditForm((p) => ({ ...p, current_project_stage: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {STAGE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Open">Open</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Estimated Costing</label>
            <input type="number" min="0" step="0.01" value={editForm.estimated_costing} onChange={(e) => setEditForm((p) => ({ ...p, estimated_costing: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Percent Complete</label>
            <input type="number" min="0" max="100" step="0.1" value={editForm.percent_complete} onChange={(e) => setEditForm((p) => ({ ...p, percent_complete: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={editForm.spine_blocked} onChange={(e) => setEditForm((p) => ({ ...p, spine_blocked: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Blocked
            </label>
          </div>
          {editForm.spine_blocked && (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Blocker Summary</label>
              <input type="text" value={editForm.blocker_summary} onChange={(e) => setEditForm((p) => ({ ...p, blocker_summary: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {(directoryLoading || directoryError) && (
            <div className="sm:col-span-2 text-sm text-amber-700">
              {directoryLoading ? 'Loading project owner directory...' : directoryError}
            </div>
          )}
        </div>
      </ActionModal>

      <ActionModal
        open={showDeleteProject}
        title="Delete Project"
        description={`Delete ${ps?.project_name || projectId}? This only succeeds if linked records are already cleared.`}
        variant="danger"
        confirmLabel="Delete Project"
        busy={deletingProject}
        onCancel={() => { if (!deletingProject) setShowDeleteProject(false); }}
        onConfirm={handleDeleteProject}
      />

      {/* ── Clone Project Modal ── */}
      <ActionModal
        open={showClone}
        title="Clone Project"
        description={`Create a copy of "${ps?.project_name || projectId}" with its tasks, milestones, and notes.`}
        variant="default"
        confirmLabel="Clone"
        busy={cloning}
        onCancel={() => { if (!cloning) setShowClone(false); }}
        onConfirm={handleCloneProject}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">New Project Name</label>
            <input
              type="text"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder="e.g. Phase-2 Extension"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cloneTasks} onChange={(e) => setCloneTasks(e.target.checked)} className="rounded" /> Copy Tasks
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cloneMilestones} onChange={(e) => setCloneMilestones(e.target.checked)} className="rounded" /> Copy Milestones
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cloneNotes} onChange={(e) => setCloneNotes(e.target.checked)} className="rounded" /> Copy Notes
            </label>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
