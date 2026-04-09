'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Edit3,
  Eye,
  FolderTree,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import RegisterPage from '@/components/shells/RegisterPage';
import type { StatItem } from '@/components/shells/RegisterPage';
import { formatPercent } from '@/components/dashboards/shared';
import { useAuth } from '@/context/AuthContext';
import { projectApi } from '@/lib/typedApi';

// ── Types ──────────────────────────────────────────────────────────────────

type ProjectListItem = {
  name: string;
  project_name?: string;
  status?: string;
  customer?: string;
  company?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  percent_complete?: number;
  estimated_costing?: number;
  notes?: string;
  linked_tender?: string;
  project_head?: string;
  project_manager_user?: string;
  total_sites?: number;
  current_project_stage?: string;
  current_stage_status?: string;
  current_stage_owner_department?: string;
  stage_submitted_by?: string;
  stage_submitted_at?: string;
  workflow_last_action?: string;
  workflow_last_actor?: string;
  workflow_last_action_at?: string;
  spine_progress_pct?: number;
  spine_blocked?: number;
  blocker_summary?: string;
  creation?: string;
  modified?: string;
};

type UserListItem = {
  name: string;
  full_name?: string;
  roles?: string[];
};

type DraftSiteRow = {
  site_name: string;
  site_code: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  SURVEY: 'Survey',
  BOQ_DESIGN: 'BOQ / Design',
  COSTING: 'Costing',
  PROCUREMENT: 'Procurement',
  STORES_DISPATCH: 'Stores / Dispatch',
  EXECUTION: 'Execution / I&C',
  BILLING_PAYMENT: 'Billing / Payment',
  OM_RMA: 'O&M / RMA',
  CLOSED: 'Closed',
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

// ── TriagePanel ────────────────────────────────────────────────────────────

function TriagePanel({
  projects,
  resolveUserName,
}: {
  projects: ProjectListItem[];
  resolveUserName: (email?: string) => string | undefined;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const blockedProjects = projects.filter((p) => (p.spine_blocked || 0) > 0);
  const overdueProjects = projects.filter((p) => {
    if (!p.expected_end_date || (p.status || 'Open') === 'Completed') return false;
    return new Date(p.expected_end_date) < today;
  });
  const pendingWorkflow = projects.filter(
    (p) =>
      p.current_stage_status &&
      ['submitted', 'pending', 'in_review'].includes(p.current_stage_status.toLowerCase().replaceAll(' ', '_')),
  );

  const stageCounts: Record<string, number> = {};
  for (const p of projects) {
    const stage = p.current_project_stage || 'SURVEY';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  }

  const hasTriageItems = blockedProjects.length > 0 || overdueProjects.length > 0 || pendingWorkflow.length > 0;

  if (!projects.length) return null;

  return (
    <div className="space-y-4">
      {/* Stage distribution bar */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Stage Distribution</div>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(stageCounts).map(([stage, count]) => (
            <div key={stage} className="rounded-xl bg-[var(--surface-raised)] px-3 py-1.5 text-xs">
              <span className="font-medium text-[var(--text-main)]">
                {STAGE_LABELS[stage] || stage.replaceAll('_', ' ')}
              </span>
              <span className="ml-1.5 font-semibold text-[var(--accent-strong)]">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {hasTriageItems && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {blockedProjects.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                <span className="text-sm font-semibold text-rose-800">Blocked ({blockedProjects.length})</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {blockedProjects.slice(0, 5).map((p) => (
                  <Link
                    key={p.name}
                    href={`/projects/${encodeURIComponent(p.name)}`}
                    className="block rounded-xl bg-white border border-rose-100 px-3 py-2 hover:shadow-sm transition-shadow"
                  >
                    <div className="text-xs font-semibold text-[var(--text-main)]">{p.project_name || p.name}</div>
                    <div className="text-[10px] text-rose-600 mt-0.5">{p.blocker_summary || 'Blocked'}</div>
                  </Link>
                ))}
                {blockedProjects.length > 5 && (
                  <div className="text-[10px] text-rose-500 font-medium">+{blockedProjects.length - 5} more</div>
                )}
              </div>
            </div>
          )}

          {overdueProjects.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Overdue ({overdueProjects.length})</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {overdueProjects.slice(0, 5).map((p) => {
                  const daysOver = Math.ceil(
                    (today.getTime() - new Date(p.expected_end_date!).getTime()) / (1000 * 60 * 60 * 24),
                  );
                  return (
                    <Link
                      key={p.name}
                      href={`/projects/${encodeURIComponent(p.name)}`}
                      className="block rounded-xl bg-white border border-amber-100 px-3 py-2 hover:shadow-sm transition-shadow"
                    >
                      <div className="text-xs font-semibold text-[var(--text-main)]">{p.project_name || p.name}</div>
                      <div className="text-[10px] text-amber-600 mt-0.5">
                        {daysOver} day{daysOver !== 1 ? 's' : ''} past deadline &middot;{' '}
                        {resolveUserName(p.project_manager_user) || 'No PM'}
                      </div>
                    </Link>
                  );
                })}
                {overdueProjects.length > 5 && (
                  <div className="text-[10px] text-amber-500 font-medium">+{overdueProjects.length - 5} more</div>
                )}
              </div>
            </div>
          )}

          {pendingWorkflow.length > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">
                  Pending Workflow ({pendingWorkflow.length})
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingWorkflow.slice(0, 5).map((p) => (
                  <Link
                    key={p.name}
                    href={`/projects/${encodeURIComponent(p.name)}`}
                    className="block rounded-xl bg-white border border-blue-100 px-3 py-2 hover:shadow-sm transition-shadow"
                  >
                    <div className="text-xs font-semibold text-[var(--text-main)]">{p.project_name || p.name}</div>
                    <div className="text-[10px] text-blue-600 mt-0.5">
                      {STAGE_LABELS[p.current_project_stage || ''] || p.current_project_stage} &middot;{' '}
                      {p.current_stage_status}
                      {p.workflow_last_actor &&
                        ` · by ${resolveUserName(p.workflow_last_actor) || p.workflow_last_actor}`}
                    </div>
                  </Link>
                ))}
                {pendingWorkflow.length > 5 && (
                  <div className="text-[10px] text-blue-500 font-medium">+{pendingWorkflow.length - 5} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasTriageItems && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-700">
          All projects are on track — no blockers, overdue items, or pending workflow actions.
        </div>
      )}
    </div>
  );
}

// ── SiteSetup (shared between create and add-sites modals) ─────────────

function SiteSetup({
  sites,
  onResize,
  onUpdate,
  siteCount,
}: {
  sites: DraftSiteRow[];
  siteCount: string;
  onResize: (count: string) => void;
  onUpdate: (index: number, field: keyof DraftSiteRow, value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-gray-800">Site Setup</div>
          <div className="text-xs text-gray-500">
            Enter one site name per row. Site code is optional and will auto-generate from the project if left blank.
          </div>
        </div>
        <div className="text-xs font-medium text-gray-500">
          {sites.length} site row{sites.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="mt-2 mb-3">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Number of Sites</label>
        <input
          type="number"
          min="0"
          max="50"
          value={siteCount}
          onChange={(e) => onResize(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="space-y-3">
        {sites.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">
            This project will be created without sites for now.
          </div>
        ) : (
          sites.map((site, index) => (
            <div key={`site-${index}`} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <input
                type="text"
                value={site.site_name}
                onChange={(e) => onUpdate(index, 'site_name', e.target.value)}
                placeholder={`Site ${index + 1} name`}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={site.site_code}
                onChange={(e) => onUpdate(index, 'site_code', e.target.value)}
                placeholder={`S${String(index + 1).padStart(2, '0')} (optional)`}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ProjectsDashboardPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  // ── Data state ──
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  // ── Modal state ──
  const [showActions, setShowActions] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddSites, setShowAddSites] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectListItem | null>(null);
  const [siteTarget, setSiteTarget] = useState<ProjectListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);

  // ── Busy flags ──
  const [addingSites, setAddingSites] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);

  // ── Directory (PH/PM dropdowns) ──
  const [directory, setDirectory] = useState<UserListItem[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState('');

  // ── Row actions ──
  const [openRowActions, setOpenRowActions] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const rowActionsRef = useRef<HTMLDivElement>(null);

  // ── Create form ──
  const [createForm, setCreateForm] = useState({
    project_name: '',
    customer: '',
    expected_start_date: '',
    expected_end_date: '',
    project_head: '',
    project_manager_user: '',
    current_project_stage: 'SURVEY',
    linked_tender: '',
    notes: '',
    estimated_costing: '',
    site_count: '1',
    initial_sites: [{ site_name: '', site_code: '' }] as DraftSiteRow[],
  });

  // ── Edit form ──
  const [editForm, setEditForm] = useState({
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

  // ── Add-sites form ──
  const [addSitesForm, setAddSitesForm] = useState({
    site_count: '1',
    initial_sites: [{ site_name: '', site_code: '' }] as DraftSiteRow[],
  });

  // ── Data loading ──
  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await projectApi.list<ProjectListItem[]>();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await projectApi.list<ProjectListItem[]>();
        if (active) setProjects(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ── User directory ──
  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const user of directory) {
      if (user.full_name) map[user.name] = user.full_name;
    }
    return map;
  }, [directory]);

  const resolveUserName = useCallback((email?: string) => {
    if (!email) return undefined;
    return userNameMap[email] || email;
  }, [userNameMap]);

  // ── Click-outside for dropdowns ──
  useEffect(() => {
    if (!showActions) return;
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showActions]);

  useEffect(() => {
    if (!openRowActions) return;
    const handler = (e: MouseEvent) => {
      if (rowActionsRef.current && !rowActionsRef.current.contains(e.target as Node)) setOpenRowActions(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openRowActions]);

  // ── Derived data ──
  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((project) =>
      [
        project.project_name,
        project.name,
        project.customer,
        project.project_head,
        resolveUserName(project.project_head),
        project.project_manager_user,
        resolveUserName(project.project_manager_user),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [projects, resolveUserName, search]);

  const blockedCount = projects.filter((p) => (p.spine_blocked || 0) > 0).length;
  const activeProjects = projects.filter((p) => (p.status || 'Open') !== 'Completed').length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((sum, p) => sum + (p.spine_progress_pct || 0), 0) / projects.length)
    : 0;

  const stats = useMemo<StatItem[]>(
    () => [
      { label: 'Projects', value: projects.length },
      { label: 'Active', value: activeProjects, variant: 'success' },
      { label: 'Blocked', value: blockedCount, variant: blockedCount ? 'error' : 'default' },
      { label: 'Avg Progress', value: formatPercent(avgProgress), variant: 'warning' },
    ],
    [projects.length, activeProjects, blockedCount, avgProgress],
  );

  // ── Role checks ──
  const roleSet = new Set(currentUser?.roles || []);
  const canCreateProject =
    currentUser?.role === 'Director' ||
    roleSet.has('Director') ||
    roleSet.has('Presales Tendering Head') ||
    roleSet.has('Project Head') ||
    roleSet.has('Project Manager') ||
    roleSet.has('System Manager');
  const canEditProject = canCreateProject;
  const canDeleteProject =
    currentUser?.role === 'Director' ||
    roleSet.has('Director') ||
    roleSet.has('Presales Tendering Head') ||
    roleSet.has('Project Head') ||
    roleSet.has('System Manager');
  const projectHeadOptions = directory.filter((u) => (u.roles || []).includes('Project Head'));
  const projectManagerOptions = directory.filter((u) => (u.roles || []).includes('Project Manager'));

  // ── Form helpers ──
  const resetCreateForm = () => {
    setCreateForm({
      project_name: '',
      customer: '',
      expected_start_date: '',
      expected_end_date: '',
      project_head: '',
      project_manager_user: '',
      current_project_stage: 'SURVEY',
      linked_tender: '',
      notes: '',
      estimated_costing: '',
      site_count: '1',
      initial_sites: [{ site_name: '', site_code: '' }],
    });
    setDirectoryError('');
  };

  const resetAddSitesForm = () => {
    setAddSitesForm({ site_count: '1', initial_sites: [{ site_name: '', site_code: '' }] });
  };

  const resizeSites = (
    setter: typeof setCreateForm | typeof setAddSitesForm,
    countValue: string,
  ) => {
    const parsed = Number.parseInt(countValue, 10);
    const safeCount = Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 50)) : 0;
    setter((prev: any) => {
      const nextSites = Array.from({ length: safeCount }, (_, i) => prev.initial_sites[i] || { site_name: '', site_code: '' });
      return { ...prev, site_count: String(safeCount), initial_sites: nextSites };
    });
  };

  const updateSite = (
    setter: typeof setCreateForm | typeof setAddSitesForm,
    index: number,
    field: keyof DraftSiteRow,
    value: string,
  ) => {
    setter((prev: any) => ({
      ...prev,
      initial_sites: prev.initial_sites.map((s: DraftSiteRow, i: number) =>
        i === index ? { ...s, [field]: value } : s,
      ),
    }));
  };

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

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  // ── CRUD handlers ──
  const openCreateModal = async () => {
    setShowActions(false);
    setOpenRowActions(null);
    setNotice(null);
    resetCreateForm();
    setShowCreate(true);
    if (canCreateProject) await loadDirectory();
  };

  const handleCreateProject = async () => {
    if (!createForm.project_name.trim()) return;
    const parsedSiteCount = Number.parseInt(createForm.site_count, 10);
    const siteCount = Number.isFinite(parsedSiteCount) ? Math.max(0, parsedSiteCount) : 0;
    const initialSites = createForm.initial_sites
      .slice(0, siteCount)
      .map((s) => ({ site_name: s.site_name.trim(), site_code: s.site_code.trim() }))
      .filter((s) => s.site_name);

    if (siteCount > 0 && initialSites.length !== siteCount) {
      setNotice({ tone: 'error', message: 'Please enter a name for every site you want created.' });
      return;
    }

    setCreating(true);
    setNotice(null);
    setError('');
    try {
      const payload = {
        project_name: createForm.project_name.trim(),
        customer: createForm.customer.trim() || undefined,
        expected_start_date: createForm.expected_start_date || undefined,
        expected_end_date: createForm.expected_end_date || undefined,
        project_head: createForm.project_head || undefined,
        project_manager_user: createForm.project_manager_user || undefined,
        current_project_stage: createForm.current_project_stage || 'SURVEY',
        linked_tender: createForm.linked_tender.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
        estimated_costing: createForm.estimated_costing ? Number(createForm.estimated_costing) : undefined,
        initial_sites: initialSites,
      };
      const created = await projectApi.create<ProjectListItem>(payload);
      await loadProjects();
      setShowCreate(false);
      setNotice({ tone: 'success', message: `Project ${created.project_name || created.name} created.` });
      router.push(`/projects/${encodeURIComponent(created.name)}`);
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to create project' });
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = async (projectName: string) => {
    setShowActions(false);
    setOpenRowActions(null);
    setNotice(null);
    await loadDirectory();
    try {
      const project = await projectApi.get<ProjectListItem>(projectName);
      setEditTarget(project);
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
      setShowEdit(true);
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to load project for editing' });
    }
  };

  const openAddSitesModal = (project: ProjectListItem) => {
    setShowActions(false);
    setOpenRowActions(null);
    setNotice(null);
    setSiteTarget(project);
    resetAddSitesForm();
    setShowAddSites(true);
  };

  const handleAddSites = async () => {
    if (!siteTarget) return;
    const parsedSiteCount = Number.parseInt(addSitesForm.site_count, 10);
    const siteCount = Number.isFinite(parsedSiteCount) ? Math.max(0, parsedSiteCount) : 0;
    const initialSites = addSitesForm.initial_sites
      .slice(0, siteCount)
      .map((s) => ({ site_name: s.site_name.trim(), site_code: s.site_code.trim() }))
      .filter((s) => s.site_name);

    if (!initialSites.length) {
      setNotice({ tone: 'error', message: 'Add at least one site name before saving.' });
      return;
    }
    if (siteCount > 0 && initialSites.length !== siteCount) {
      setNotice({ tone: 'error', message: 'Please enter a name for every site row you want to add.' });
      return;
    }

    setAddingSites(true);
    setNotice(null);
    try {
      await projectApi.addSites<ProjectListItem>(siteTarget.name, initialSites);
      await loadProjects();
      setShowAddSites(false);
      setSiteTarget(null);
      setNotice({
        tone: 'success',
        message: `${initialSites.length} site${initialSites.length === 1 ? '' : 's'} added to ${siteTarget.project_name || siteTarget.name}.`,
      });
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to add sites' });
    } finally {
      setAddingSites(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!editTarget || !editForm.project_name.trim()) return;
    setSavingEdit(true);
    setNotice(null);
    try {
      const payload = {
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
      };
      await projectApi.update<ProjectListItem>(editTarget.name, payload);
      await loadProjects();
      setShowEdit(false);
      setEditTarget(null);
      setNotice({ tone: 'success', message: `Project ${payload.project_name} updated.` });
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update project' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setNotice(null);
    try {
      await projectApi.delete(deleteTarget.name);
      await loadProjects();
      setNotice({ tone: 'success', message: `Project ${deleteTarget.project_name || deleteTarget.name} deleted.` });
      setDeleteTarget(null);
    } catch (err) {
      setNotice({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to delete project' });
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ──
  return (
    <>
      <RegisterPage
        title="Project Triage"
        description="What is blocked, what needs decisions, what is overdue. Open any project to reach overview, dossier, approvals, and accountability."
        loading={loading}
        error={error}
        empty={!filteredProjects.length && !search.trim()}
        onRetry={loadProjects}
        emptyTitle="No projects yet"
        emptyDescription="Create a project to get started with the project/site spine."
        stats={stats}
        filterBar={
          <>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search projects, client, PM, PH..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] py-2.5 pl-11 pr-4 text-sm text-[var(--text-main)] placeholder:text-[13px] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </>
        }
        headerActions={
          canCreateProject ? (
            <div className="relative shrink-0" ref={actionsRef}>
              <button
                type="button"
                onClick={() => setShowActions((o) => !o)}
                className="inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-2xl border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
              >
                Actions <ChevronDown className="h-4 w-4" />
              </button>
              {showActions && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-10 min-w-[240px] rounded-2xl border border-[var(--border-subtle)] bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                  <button
                    type="button"
                    onClick={() => void openCreateModal()}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--text-main)] transition hover:bg-[var(--surface-raised)]"
                  >
                    <Plus className="h-4 w-4 text-[var(--accent-strong)]" />
                    <span>
                      <span className="block font-medium">Create Project</span>
                      <span className="block text-xs text-[var(--text-muted)]">Start a new project workspace entry</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActions(false);
                      void loadProjects();
                    }}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--text-main)] transition hover:bg-[var(--surface-raised)]"
                  >
                    <RefreshCcw className="h-4 w-4 text-[var(--accent-strong)]" />
                    <span>
                      <span className="block font-medium">Refresh List</span>
                      <span className="block text-xs text-[var(--text-muted)]">Reload projects and current spine status</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : undefined
        }
      >
        {/* ── Notice banner ── */}
        {notice && (
          <div
            className={`mx-5 mt-4 rounded-2xl border px-4 py-3 text-sm ${
              notice.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {notice.message}
          </div>
        )}

        {/* ── Triage Panel ── */}
        <div className="px-5 py-4">
          <TriagePanel projects={projects} resolveUserName={resolveUserName} />
        </div>

        {/* ── Project Table ── */}
        {filteredProjects.length === 0 && search.trim() ? (
          <div className="px-6 py-20 text-center text-sm text-[var(--text-muted)]">
            No projects match the current search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-6 py-4 font-medium">Project</th>
                  <th className="px-4 py-4 font-medium">Client</th>
                  <th className="px-4 py-4 font-medium">Stage</th>
                  <th className="px-4 py-4 font-medium">Sites</th>
                  <th className="px-4 py-4 font-medium">Progress</th>
                  <th className="px-4 py-4 font-medium">Project Manager</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredProjects.map((project) => {
                  const href = `/projects/${encodeURIComponent(project.name)}`;
                  const blocked = (project.spine_blocked || 0) > 0;
                  const noSitesUploaded = (project.total_sites || 0) === 0;
                  return (
                    <tr key={project.name} className="group hover:bg-[var(--surface-raised)]/55 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={href} className="block">
                          <div className="font-semibold text-[var(--text-main)] group-hover:text-[var(--accent-strong)]">
                            {project.project_name || project.name}
                          </div>
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            {resolveUserName(project.project_head) || 'No project head'}
                            {blocked && ` · ${project.blocker_summary || 'Blocked'}`}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-[var(--text-muted)]">{project.customer || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {STAGE_LABELS[project.current_project_stage || ''] ||
                              (project.current_project_stage || 'SURVEY').replaceAll('_', ' ')}
                          </span>
                          {project.current_stage_status && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600">
                              {project.current_stage_status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2 text-[var(--text-main)]">
                          <div className="inline-flex items-center gap-2">
                            <FolderTree className="h-4 w-4 text-[var(--text-muted)]" />
                            <span className="font-medium">{project.total_sites || 0}</span>
                          </div>
                          {noSitesUploaded && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700">
                              No sites uploaded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[140px] items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${blocked ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(project.spine_progress_pct || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[var(--text-muted)]">
                            {formatPercent(project.spine_progress_pct || 0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[var(--text-muted)]">
                        {resolveUserName(project.project_manager_user) || '—'}
                      </td>
                      <td className="px-4 py-4">
                        {blocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            {project.status || 'Open'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div
                          className="relative inline-flex justify-end"
                          ref={openRowActions === project.name ? rowActionsRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenRowActions((c) => (c === project.name ? null : project.name))
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-main)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                          >
                            Actions <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          {openRowActions === project.name && (
                            <div className="absolute right-0 top-[calc(100%+0.45rem)] z-10 min-w-[220px] rounded-2xl border border-[var(--border-subtle)] bg-white p-2 text-left shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                              <Link
                                href={href}
                                onClick={() => setOpenRowActions(null)}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--text-main)] transition hover:bg-[var(--surface-raised)]"
                              >
                                <Eye className="h-4 w-4 text-[var(--accent-strong)]" />
                                <span>
                                  <span className="block font-medium">Open Workspace</span>
                                  <span className="block text-xs text-[var(--text-muted)]">
                                    View overview, sites, files, and activity
                                  </span>
                                </span>
                              </Link>
                              {canEditProject && (
                                <button
                                  type="button"
                                  onClick={() => void openEditModal(project.name)}
                                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--text-main)] transition hover:bg-[var(--surface-raised)]"
                                >
                                  <Edit3 className="h-4 w-4 text-[var(--accent-strong)]" />
                                  <span>
                                    <span className="block font-medium">Edit Project</span>
                                    <span className="block text-xs text-[var(--text-muted)]">
                                      Update owners, stage, dates, and notes
                                    </span>
                                  </span>
                                </button>
                              )}
                              {canEditProject && (
                                <button
                                  type="button"
                                  onClick={() => openAddSitesModal(project)}
                                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--text-main)] transition hover:bg-[var(--surface-raised)]"
                                >
                                  <Plus className="h-4 w-4 text-[var(--accent-strong)]" />
                                  <span>
                                    <span className="block font-medium">Add Sites</span>
                                    <span className="block text-xs text-[var(--text-muted)]">
                                      Append site names and codes after project creation
                                    </span>
                                  </span>
                                </button>
                              )}
                              {canDeleteProject && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenRowActions(null);
                                    setDeleteTarget(project);
                                  }}
                                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>
                                    <span className="block font-medium">Delete Project</span>
                                    <span className="block text-xs text-rose-500">
                                      Only works if linked records are cleared
                                    </span>
                                  </span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </RegisterPage>

      {/* ═══ Create Project Modal ═══ */}
      <ActionModal
        open={showCreate}
        title="Create Project"
        description="New projects open directly into the workspace after creation."
        variant="default"
        confirmLabel="Create Project"
        busy={creating}
        onCancel={() => { if (!creating) setShowCreate(false); }}
        onConfirm={handleCreateProject}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={createForm.project_name}
              onChange={(e) => setCreateForm((p) => ({ ...p, project_name: e.target.value }))}
              placeholder="Enter the project name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Customer</label>
            <input type="text" value={createForm.customer} onChange={(e) => setCreateForm((p) => ({ ...p, customer: e.target.value }))} placeholder="Client or customer name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Linked Tender</label>
            <input type="text" value={createForm.linked_tender} onChange={(e) => setCreateForm((p) => ({ ...p, linked_tender: e.target.value }))} placeholder="Optional tender ID" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Expected Start Date</label>
            <input type="date" value={createForm.expected_start_date} onChange={(e) => setCreateForm((p) => ({ ...p, expected_start_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Expected End Date</label>
            <input type="date" value={createForm.expected_end_date} onChange={(e) => setCreateForm((p) => ({ ...p, expected_end_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Project Head</label>
            <select value={createForm.project_head} onChange={(e) => setCreateForm((p) => ({ ...p, project_head: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select project head...</option>
              {projectHeadOptions.map((u) => (<option key={u.name} value={u.name}>{u.full_name || u.name}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Project Manager</label>
            <select value={createForm.project_manager_user} onChange={(e) => setCreateForm((p) => ({ ...p, project_manager_user: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select project manager...</option>
              {projectManagerOptions.map((u) => (<option key={u.name} value={u.name}>{u.full_name || u.name}</option>))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Starting Stage</label>
            <select value={createForm.current_project_stage} onChange={(e) => setCreateForm((p) => ({ ...p, current_project_stage: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {STAGE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Estimated Costing</label>
            <input type="number" min="0" step="0.01" value={createForm.estimated_costing} onChange={(e) => setCreateForm((p) => ({ ...p, estimated_costing: e.target.value }))} placeholder="0.00" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <SiteSetup
              sites={createForm.initial_sites}
              siteCount={createForm.site_count}
              onResize={(v) => resizeSites(setCreateForm, v)}
              onUpdate={(i, f, v) => updateSite(setCreateForm, i, f, v)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={3} value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional kickoff notes or context" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {(directoryLoading || directoryError) && (
            <div className="sm:col-span-2">
              {directoryLoading ? (
                <div className="text-sm text-gray-500">Loading project owner directory...</div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {directoryError}. You can still create the project and assign ownership later.
                </div>
              )}
            </div>
          )}
        </div>
      </ActionModal>

      {/* ═══ Add Sites Modal ═══ */}
      <ActionModal
        open={showAddSites}
        title={siteTarget ? `Add Sites to ${siteTarget.project_name || siteTarget.name}` : 'Add Sites'}
        description="Register additional sites for this project."
        variant="default"
        confirmLabel="Add Sites"
        busy={addingSites}
        onCancel={() => { if (!addingSites) { setShowAddSites(false); setSiteTarget(null); } }}
        onConfirm={handleAddSites}
      >
        <SiteSetup
          sites={addSitesForm.initial_sites}
          siteCount={addSitesForm.site_count}
          onResize={(v) => resizeSites(setAddSitesForm, v)}
          onUpdate={(i, f, v) => updateSite(setAddSitesForm, i, f, v)}
        />
      </ActionModal>

      {/* ═══ Edit Project Modal ═══ */}
      <ActionModal
        open={showEdit}
        title={editTarget ? `Edit ${editTarget.project_name || editTarget.name}` : 'Edit Project'}
        description="Update the project header details."
        variant="default"
        confirmLabel="Save Changes"
        busy={savingEdit}
        onCancel={() => { if (!savingEdit) { setShowEdit(false); setEditTarget(null); } }}
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
            <input type="number" min="0" step="0.01" value={editForm.estimated_costing} onChange={(e) => setEditForm((p) => ({ ...p, estimated_costing: e.target.value }))} placeholder="0.00" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Percent Complete</label>
            <input type="number" min="0" max="100" step="0.1" value={editForm.percent_complete} onChange={(e) => setEditForm((p) => ({ ...p, percent_complete: e.target.value }))} placeholder="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
              <input type="text" value={editForm.blocker_summary} onChange={(e) => setEditForm((p) => ({ ...p, blocker_summary: e.target.value }))} placeholder="Describe what is blocking the project" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </ActionModal>

      {/* ═══ Delete Confirmation ═══ */}
      <ActionModal
        open={deleteTarget !== null}
        title="Delete Project"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.project_name || deleteTarget.name}? This only succeeds if all linked records are already cleared.`
            : 'Delete this project?'
        }
        variant="danger"
        confirmLabel="Delete Project"
        busy={deleting}
        onCancel={() => { if (!deleting) setDeleteTarget(null); }}
        onConfirm={handleDeleteProject}
      />
    </>
  );
}
