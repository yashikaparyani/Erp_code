'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, Flag, FolderTree, Layers3, Pencil, Plus, ShieldAlert, Trash2, Users, X } from 'lucide-react';
import {
  DashboardShell,
  EmptyState,
  MetricList,
  SectionCard,
  StatCard,
  formatCurrency,
  formatDateTime,
  formatPercent,
} from '../../components/dashboards/shared';
import { useRole } from '../../context/RoleContext';

type ProjectListItem = {
  name: string;
  project_name?: string;
  customer?: string;
  current_project_stage?: string;
  project_head?: string;
  project_manager_user?: string;
  total_sites?: number;
  spine_progress_pct?: number;
  spine_blocked?: number;
  blocker_summary?: string;
};

type ProjectSpineSummary = {
  project_summary: {
    name: string;
    project_name?: string;
    current_project_stage?: string;
    current_stage_status?: string;
    current_stage_owner_department?: string;
    project_head?: string;
    project_manager?: string;
    total_sites?: number;
    spine_progress_pct?: number;
    status?: string;
    customer?: string;
    blocker_summary?: string;
  } | null;
  site_count: number;
  stage_coverage: Record<string, number>;
  action_queue: {
    blocked_count: number;
    pending_count: number;
    overdue_count: number;
  };
};

type WorkflowRequirement = {
  label: string;
  satisfied: boolean;
  detail: string;
};

type ProjectWorkflowState = {
  stage: string;
  stage_label: string;
  stage_status: string;
  owner_department: string;
  owner_roles: string[];
  description: string;
  next_stage?: string | null;
  next_stage_label?: string | null;
  readiness: {
    ready: boolean;
    mode: string;
    summary: string;
    requirements: WorkflowRequirement[];
  };
  submitted_by?: string | null;
  submitted_at?: string | null;
  last_action?: string | null;
  last_actor?: string | null;
  last_action_at?: string | null;
  actions: {
    can_submit: boolean;
    can_approve: boolean;
    can_reject: boolean;
    can_restart: boolean;
    can_override: boolean;
  };
  history: Array<{
    timestamp: string;
    actor: string;
    action: string;
    stage: string;
    next_stage?: string | null;
    remarks?: string | null;
    metadata?: Record<string, unknown>;
  }>;
};

type ProjectRecord = {
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
  spine_blocked?: number | boolean;
  blocker_summary?: string;
  creation?: string;
  modified?: string;
};

type TeamMember = {
  name: string;
  linked_project: string;
  user: string;
  role_in_project: string;
  linked_site?: string;
  start_date?: string;
  end_date?: string;
  is_active?: number | boolean;
  creation?: string;
  modified?: string;
};

type ProjectAsset = {
  name: string;
  linked_project: string;
  linked_site?: string;
  asset_name: string;
  asset_type: string;
  status: string;
  serial_no?: string;
  make_model?: string;
  quantity?: number;
  unit_cost?: number;
  vendor?: string;
  deployment_date?: string;
  warranty_end_date?: string;
  assigned_to?: string;
  creation?: string;
  modified?: string;
};

type TeamMemberForm = {
  user: string;
  role_in_project: string;
  linked_site: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type AssetForm = {
  linked_site: string;
  asset_name: string;
  asset_type: string;
  status: string;
  serial_no: string;
  make_model: string;
  quantity: string;
  unit_cost: string;
  vendor: string;
  deployment_date: string;
  warranty_end_date: string;
  assigned_to: string;
};

type ProjectForm = {
  project_name: string;
  customer: string;
  company: string;
  status: string;
  expected_start_date: string;
  expected_end_date: string;
  linked_tender: string;
  project_head: string;
  project_manager_user: string;
  current_project_stage: string;
  estimated_costing: string;
  notes: string;
  spine_blocked: boolean;
  blocker_summary: string;
};

type FeedbackState = { tone: 'success' | 'error'; message: string } | null;

const TEAM_ROLE_OPTIONS = ['PROJECT_MANAGER', 'ENGINEER', 'TECHNICIAN', 'SITE_SUPERVISOR', 'INSPECTOR', 'ACCOUNTS', 'OTHER'];
const ASSET_TYPE_OPTIONS = ['Hardware', 'Software', 'Service', 'License', 'Consumable', 'Other'];
const ASSET_STATUS_OPTIONS = ['Deployed', 'In Transit', 'Returned', 'Damaged', 'Expired'];
const PROJECT_STATUS_OPTIONS = ['Open', 'Completed', 'Cancelled'];
const SPINE_STAGE_OPTIONS = ['SURVEY', 'BOQ_DESIGN', 'COSTING', 'PROCUREMENT', 'STORES_DISPATCH', 'EXECUTION', 'BILLING_PAYMENT', 'OM_RMA', 'CLOSED'];

const initialTeamMemberForm: TeamMemberForm = {
  user: '',
  role_in_project: 'ENGINEER',
  linked_site: '',
  start_date: '',
  end_date: '',
  is_active: true,
};

const initialAssetForm: AssetForm = {
  linked_site: '',
  asset_name: '',
  asset_type: 'Hardware',
  status: 'Deployed',
  serial_no: '',
  make_model: '',
  quantity: '1',
  unit_cost: '',
  vendor: '',
  deployment_date: '',
  warranty_end_date: '',
  assigned_to: '',
};

const initialProjectForm: ProjectForm = {
  project_name: '',
  customer: '',
  company: '',
  status: 'Open',
  expected_start_date: '',
  expected_end_date: '',
  linked_tender: '',
  project_head: '',
  project_manager_user: '',
  current_project_stage: 'SURVEY',
  estimated_costing: '',
  notes: '',
  spine_blocked: false,
  blocker_summary: '',
};

async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to load project workspace');
  }

  return (payload.data ?? payload) as T;
}

async function fetchRoute<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to load project workspace');
  }
  return (payload.data ?? payload) as T;
}

async function postRoute<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Operation failed');
  }
  return (payload.data ?? payload) as T;
}

function buildTimestamp() {
  return new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRoleLabel(role?: string) {
  return (role || '-').replaceAll('_', ' ');
}

function formatWorkflowAction(action?: string | null) {
  return (action || '-').replaceAll('_', ' ');
}

function getAssetStatusBadge(status?: string) {
  const badgeMap: Record<string, string> = {
    Deployed: 'badge-success',
    'In Transit': 'badge-warning',
    Returned: 'badge-gray',
    Damaged: 'badge-error',
    Expired: 'badge-error',
  };
  return badgeMap[status || ''] || 'badge-gray';
}

function toOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  helper,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  helper?: string;
  full?: boolean;
}) {
  return (
    <label className={full ? 'md:col-span-2' : ''}>
      <div className="mb-2 text-sm font-medium text-gray-700">{label}</div>
      {children}
      {helper ? <div className="mt-1 text-xs text-gray-500">{helper}</div> : null}
    </label>
  );
}

export default function ProjectsPage() {
  const { currentRole } = useRole();
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectRecord, setProjectRecord] = useState<ProjectRecord | null>(null);
  const [summary, setSummary] = useState<ProjectSpineSummary | null>(null);
  const [workflow, setWorkflow] = useState<ProjectWorkflowState | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [pageReloadKey, setPageReloadKey] = useState(0);
  const [detailsReloadKey, setDetailsReloadKey] = useState(0);

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectForm>(initialProjectForm);
  const [memberForm, setMemberForm] = useState<TeamMemberForm>(initialTeamMemberForm);
  const [assetForm, setAssetForm] = useState<AssetForm>(initialAssetForm);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingAsset, setEditingAsset] = useState<ProjectAsset | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProjectList = async () => {
      setLoading(true);
      setError('');

      try {
        const projectList = await callOps<ProjectListItem[]>('get_project_spine_list');
        if (!active) return;

        setProjects(projectList);
        setSelectedProject((currentValue) => {
          if (currentValue && projectList.some((project) => project.name === currentValue)) {
            return currentValue;
          }
          return projectList[0]?.name || '';
        });
        setLastUpdated(buildTimestamp());
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load project workspace');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProjectList();
    return () => {
      active = false;
    };
  }, [currentRole, pageReloadKey]);

  useEffect(() => {
    if (!selectedProject) {
      setProjectRecord(null);
      setSummary(null);
      setWorkflow(null);
      setTeamMembers([]);
      setAssets([]);
      setWorkspaceError('');
      return;
    }

    let active = true;

    const loadProjectWorkspace = async () => {
      setDetailsLoading(true);
      setWorkspaceError('');

      try {
        const [projectData, spine, workflowState, membersData, assetsData] = await Promise.all([
          callOps<ProjectRecord>('get_project', { name: selectedProject }),
          callOps<ProjectSpineSummary>('get_project_spine_summary', { project: selectedProject }),
          callOps<ProjectWorkflowState>('get_project_workflow_state', { project: selectedProject }),
          fetchRoute<TeamMember[]>(`/api/execution/project-team-members?project=${encodeURIComponent(selectedProject)}`),
          fetchRoute<ProjectAsset[]>(`/api/execution/project-assets?project=${encodeURIComponent(selectedProject)}`),
        ]);

        if (!active) return;

        setProjectRecord(projectData);
        setSummary(spine);
        setWorkflow(workflowState);
        setTeamMembers(membersData);
        setAssets(assetsData);
        setLastUpdated(buildTimestamp());
      } catch (err) {
        if (!active) return;
        setWorkspaceError(err instanceof Error ? err.message : 'Failed to load project details');
      } finally {
        if (active) setDetailsLoading(false);
      }
    };

    void loadProjectWorkspace();
    return () => {
      active = false;
    };
  }, [currentRole, selectedProject, detailsReloadKey]);

  const applyProjectRecordToForm = (project: ProjectRecord | null) => {
    if (!project) {
      setProjectForm(initialProjectForm);
      return;
    }

    setProjectForm({
      project_name: project.project_name || '',
      customer: project.customer || '',
      company: project.company || '',
      status: project.status || 'Open',
      expected_start_date: project.expected_start_date || '',
      expected_end_date: project.expected_end_date || '',
      linked_tender: project.linked_tender || '',
      project_head: project.project_head || '',
      project_manager_user: project.project_manager_user || '',
      current_project_stage: project.current_project_stage || 'SURVEY',
      estimated_costing: project.estimated_costing != null ? String(project.estimated_costing) : '',
      notes: project.notes || '',
      spine_blocked: project.spine_blocked !== false && project.spine_blocked !== 0,
      blocker_summary: project.blocker_summary || '',
    });
  };

  const openCreateProjectModal = () => {
    setEditingProject(null);
    setFeedback(null);
    setProjectForm(initialProjectForm);
    setShowProjectModal(true);
  };

  const openEditProjectModal = () => {
    if (!projectRecord) return;
    setEditingProject(projectRecord);
    setFeedback(null);
    applyProjectRecordToForm(projectRecord);
    setShowProjectModal(true);
  };

  const openCreateMemberModal = () => {
    if (!selectedProject) {
      setFeedback({ tone: 'error', message: 'Create or select a project first, then add team members.' });
      return;
    }
    setEditingMember(null);
    setFeedback(null);
    setMemberForm(initialTeamMemberForm);
    setShowMemberModal(true);
  };

  const openEditMemberModal = (member: TeamMember) => {
    setEditingMember(member);
    setFeedback(null);
    setMemberForm({
      user: member.user || '',
      role_in_project: member.role_in_project || 'ENGINEER',
      linked_site: member.linked_site || '',
      start_date: member.start_date || '',
      end_date: member.end_date || '',
      is_active: member.is_active !== false && member.is_active !== 0,
    });
    setShowMemberModal(true);
  };

  const openCreateAssetModal = () => {
    if (!selectedProject) {
      setFeedback({ tone: 'error', message: 'Create or select a project first, then add assets.' });
      return;
    }
    setEditingAsset(null);
    setFeedback(null);
    setAssetForm(initialAssetForm);
    setShowAssetModal(true);
  };

  const openEditAssetModal = (asset: ProjectAsset) => {
    setEditingAsset(asset);
    setFeedback(null);
    setAssetForm({
      linked_site: asset.linked_site || '',
      asset_name: asset.asset_name || '',
      asset_type: asset.asset_type || 'Hardware',
      status: asset.status || 'Deployed',
      serial_no: asset.serial_no || '',
      make_model: asset.make_model || '',
      quantity: String(asset.quantity ?? 1),
      unit_cost: asset.unit_cost != null ? String(asset.unit_cost) : '',
      vendor: asset.vendor || '',
      deployment_date: asset.deployment_date || '',
      warranty_end_date: asset.warranty_end_date || '',
      assigned_to: asset.assigned_to || '',
    });
    setShowAssetModal(true);
  };

  const handleSaveProject = async () => {
    if (!projectForm.project_name.trim()) {
      setFeedback({ tone: 'error', message: 'Project name is required.' });
      return;
    }

    setSavingProject(true);
    setFeedback(null);

    const payload = {
      project_name: projectForm.project_name.trim(),
      customer: projectForm.customer.trim() || undefined,
      company: projectForm.company.trim() || undefined,
      status: projectForm.status,
      expected_start_date: projectForm.expected_start_date || undefined,
      expected_end_date: projectForm.expected_end_date || undefined,
      linked_tender: projectForm.linked_tender.trim() || undefined,
      project_head: projectForm.project_head.trim() || undefined,
      project_manager_user: projectForm.project_manager_user.trim() || undefined,
      current_project_stage: projectForm.current_project_stage,
      estimated_costing: toOptionalNumber(projectForm.estimated_costing),
      notes: projectForm.notes.trim() || undefined,
      spine_blocked: projectForm.spine_blocked ? 1 : 0,
      blocker_summary: projectForm.spine_blocked ? projectForm.blocker_summary.trim() || undefined : undefined,
    };

    try {
      const result = editingProject
        ? await callOps<ProjectRecord>('update_project', { name: editingProject.name, data: payload })
        : await callOps<ProjectRecord>('create_project', { data: payload });

      setShowProjectModal(false);
      setEditingProject(null);
      setProjectForm(initialProjectForm);
      setFeedback({ tone: 'success', message: editingProject ? 'Project updated.' : 'Project created.' });
      setSelectedProject(result.name);
      setPageReloadKey((value) => value + 1);
      setDetailsReloadKey((value) => value + 1);
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to save project.' });
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectRecord) return;
    if (!window.confirm(`Delete project ${projectRecord.project_name || projectRecord.name}?`)) return;

    try {
      const result = await callOps<{ dependencies?: Array<{ doctype: string; count: number }> }>('delete_project', {
        name: projectRecord.name,
      });
      setFeedback({ tone: 'success', message: 'Project deleted.' });
      setSelectedProject('');
      setProjectRecord(null);
      setSummary(null);
      setTeamMembers([]);
      setAssets([]);
      setPageReloadKey((value) => value + 1);
      setDetailsReloadKey((value) => value + 1);
      return result;
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to delete project.' });
    }
  };

  const handleSaveMember = async () => {
    if (!selectedProject) return;
    if (!memberForm.user.trim()) {
      setFeedback({ tone: 'error', message: 'User is required for a project team assignment.' });
      return;
    }

    setSavingMember(true);
    setFeedback(null);

    const payload = {
      linked_project: selectedProject,
      user: memberForm.user.trim(),
      role_in_project: memberForm.role_in_project,
      linked_site: memberForm.linked_site.trim() || undefined,
      start_date: memberForm.start_date || undefined,
      end_date: memberForm.end_date || undefined,
      is_active: memberForm.is_active ? 1 : 0,
    };

    try {
      if (editingMember) {
        await postRoute('/api/execution/project-team-members', {
          action: 'update',
          name: editingMember.name,
          data: payload,
        });
        setFeedback({ tone: 'success', message: 'Project team member updated.' });
      } else {
        await postRoute('/api/execution/project-team-members', payload);
        setFeedback({ tone: 'success', message: 'Project team member created.' });
      }

      setShowMemberModal(false);
      setEditingMember(null);
      setMemberForm(initialTeamMemberForm);
      setDetailsReloadKey((value) => value + 1);
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to save team member.' });
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (!window.confirm(`Remove ${member.user} from ${selectedProject}?`)) return;

    try {
      await postRoute('/api/execution/project-team-members', { action: 'delete', name: member.name });
      setFeedback({ tone: 'success', message: 'Project team member removed.' });
      setDetailsReloadKey((value) => value + 1);
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to remove team member.' });
    }
  };

  const handleSaveAsset = async () => {
    if (!selectedProject) return;
    if (!assetForm.asset_name.trim()) {
      setFeedback({ tone: 'error', message: 'Asset name is required.' });
      return;
    }

    setSavingAsset(true);
    setFeedback(null);

    const payload = {
      linked_project: selectedProject,
      linked_site: assetForm.linked_site.trim() || undefined,
      asset_name: assetForm.asset_name.trim(),
      asset_type: assetForm.asset_type,
      status: assetForm.status,
      serial_no: assetForm.serial_no.trim() || undefined,
      make_model: assetForm.make_model.trim() || undefined,
      quantity: toOptionalNumber(assetForm.quantity) ?? 1,
      unit_cost: toOptionalNumber(assetForm.unit_cost),
      vendor: assetForm.vendor.trim() || undefined,
      deployment_date: assetForm.deployment_date || undefined,
      warranty_end_date: assetForm.warranty_end_date || undefined,
      assigned_to: assetForm.assigned_to.trim() || undefined,
    };

    try {
      if (editingAsset) {
        await postRoute('/api/execution/project-assets', {
          action: 'update',
          name: editingAsset.name,
          data: payload,
        });
        setFeedback({ tone: 'success', message: 'Project asset updated.' });
      } else {
        await postRoute('/api/execution/project-assets', payload);
        setFeedback({ tone: 'success', message: 'Project asset created.' });
      }

      setShowAssetModal(false);
      setEditingAsset(null);
      setAssetForm(initialAssetForm);
      setDetailsReloadKey((value) => value + 1);
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to save project asset.' });
    } finally {
      setSavingAsset(false);
    }
  };

  const handleDeleteAsset = async (asset: ProjectAsset) => {
    if (!window.confirm(`Delete asset ${asset.asset_name} from ${selectedProject}?`)) return;

    try {
      await postRoute('/api/execution/project-assets', { action: 'delete', name: asset.name });
      setFeedback({ tone: 'success', message: 'Project asset deleted.' });
      setDetailsReloadKey((value) => value + 1);
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to delete project asset.' });
    }
  };

  const runWorkflowAction = async (
    method: string,
    options?: {
      promptLabel?: string;
      successMessage?: string;
      extraArgs?: Record<string, unknown>;
    },
  ) => {
    if (!selectedProject) return;

    let remarks = '';
    if (options?.promptLabel != null) {
      const promptValue = window.prompt(options.promptLabel, '');
      if (promptValue === null) return;
      remarks = promptValue;
    }

    setWorkflowBusy(true);
    setFeedback(null);

    try {
      await callOps<ProjectWorkflowState>(method, {
        project: selectedProject,
        remarks: remarks.trim() || undefined,
        ...(options?.extraArgs || {}),
      });
      setFeedback({ tone: 'success', message: options?.successMessage || 'Workflow updated.' });
      setDetailsReloadKey((value) => value + 1);
      setPageReloadKey((value) => value + 1);
    } catch (err) {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update workflow.' });
    } finally {
      setWorkflowBusy(false);
    }
  };

  const handleOverrideStage = async () => {
    if (!selectedProject || !workflow) return;
    const stageOptions = SPINE_STAGE_OPTIONS.join(', ');
    const nextValue = window.prompt(`Enter a stage override. Allowed values: ${stageOptions}`, workflow.stage || 'SURVEY');
    if (!nextValue) return;

    await runWorkflowAction('override_project_stage', {
      promptLabel: 'Reason for override',
      successMessage: 'Project stage overridden.',
      extraArgs: { new_stage: nextValue.trim() },
    });
  };

  const filteredProjects = projects;
  const activeMembers = teamMembers.filter((member) => member.is_active !== false && member.is_active !== 0).length;
  const deployedAssets = assets.filter((asset) => asset.status === 'Deployed').length;
  const selectedProjectLabel = projectRecord?.project_name || summary?.project_summary?.project_name || selectedProject || 'No project selected';
  const selectedProjectStatus = projectRecord?.status || summary?.project_summary?.status || '-';
  const selectedProjectStage = workflow?.stage || projectRecord?.current_project_stage || summary?.project_summary?.current_project_stage || '-';

  return (
    <DashboardShell
      title="Projects"
      subtitle="Full project picture across lifecycle stages"
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => setPageReloadKey((value) => value + 1)}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Visible Projects" value={filteredProjects.length} hint="Projects in your role-visible lane" icon={FolderTree} tone="blue" />
        <StatCard title="Selected Project" value={selectedProjectLabel} hint="Current working project context" icon={Layers3} tone="green" />
        <StatCard title="Current Stage" value={selectedProjectStage} hint="Backed by the active project record" icon={Flag} tone="orange" />
        <StatCard title="Blocked Items" value={summary?.action_queue?.blocked_count || 0} hint={`Status: ${selectedProjectStatus}`} icon={ShieldAlert} tone="red" />
      </div>

      <div className="workspace-toolbar mt-6">
        <div className="max-w-3xl">
          <div className="workspace-kicker">Project Control Desk</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="workspace-chip">{selectedProjectLabel}</span>
            <span className="workspace-chip">Status {selectedProjectStatus}</span>
            <span className="workspace-chip">Stage {selectedProjectStage}</span>
            <span className="workspace-chip">{activeMembers} active members</span>
            <span className="workspace-chip">{deployedAssets} deployed assets</span>
          </div>
          <div className="mt-3 text-sm text-[var(--text-muted)]">
            Manage the base project record first, then use linked workflow, team, and asset actions below for daily execution control.
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="btn btn-primary" onClick={openCreateProjectModal}>
            <Plus className="h-4 w-4" /> New Project
          </button>
          <button className="btn btn-secondary" onClick={() => selectedProject && router.push(`/projects/${encodeURIComponent(selectedProject)}`)} disabled={!selectedProject}>
            <FolderTree className="h-4 w-4" /> Open Site Breakdown
          </button>
          <button className="btn btn-secondary" onClick={openEditProjectModal} disabled={!projectRecord}>
            <Pencil className="h-4 w-4" /> Edit Project
          </button>
          <button className="btn btn-secondary text-red-700 hover:text-red-800" onClick={handleDeleteProject} disabled={!projectRecord}>
            <Trash2 className="h-4 w-4" /> Delete Project
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          className={`mt-4 rounded-[22px] border px-4 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'border-[rgba(69,152,90,0.35)] bg-[var(--success-bg)] text-[var(--success-text)]'
              : 'border-[rgba(200,93,77,0.35)] bg-[var(--error-bg)] text-[var(--error-text)]'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {workspaceError ? (
        <div className="mt-4 rounded-[22px] border border-[rgba(200,93,77,0.35)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{workspaceError}</div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Project List" subtitle="Project now lives in the left navigation, not the top header">
          {!filteredProjects.length ? (
            <EmptyState message="No projects are visible for this role." />
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => {
                const selected = project.name === selectedProject;
                return (
                  <button
                    key={project.name}
                    onClick={() => {
                      setFeedback(null);
                      setSelectedProject(project.name);
                    }}
                    className={`workspace-list-item ${selected ? 'is-active' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-main)]">{project.project_name || project.name}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {project.customer || 'No customer'} | {project.current_project_stage || 'SURVEY'}
                        </div>
                      </div>
                      <span className={`badge ${project.spine_blocked ? 'badge-warning' : 'badge-info'}`}>
                        {project.spine_blocked ? 'Blocked' : 'Open'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>{project.total_sites || 0} sites</span>
                      <span>{formatPercent(project.spine_progress_pct || 0)}</span>
                    </div>
                    <div className="mt-3 progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, project.spine_progress_pct || 0))}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>
 
        <SectionCard title="Project Overview" subtitle="Core ownership, dates, notes, and delivery posture">
          {summary?.project_summary || projectRecord ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-4">
                <div className="workspace-kicker">Selected Project</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="workspace-chip">{summary?.project_summary?.project_name || projectRecord?.project_name || '-'}</span>
                  <span className="workspace-chip">Customer {summary?.project_summary?.customer || projectRecord?.customer || '-'}</span>
                  <span className="workspace-chip">PM {summary?.project_summary?.project_manager || projectRecord?.project_manager_user || '-'}</span>
                </div>
              </div>
              <MetricList
                items={[
                  { label: 'Project', value: summary?.project_summary?.project_name || projectRecord?.project_name || summary?.project_summary?.name || projectRecord?.name || '-' },
                  { label: 'Status', value: summary?.project_summary?.status || projectRecord?.status || '-' },
                  { label: 'Current Stage', value: summary?.project_summary?.current_project_stage || projectRecord?.current_project_stage || '-' },
                  { label: 'Customer', value: summary?.project_summary?.customer || projectRecord?.customer || '-' },
                  { label: 'Company', value: projectRecord?.company || '-' },
                  { label: 'Project Head', value: summary?.project_summary?.project_head || projectRecord?.project_head || '-' },
                  { label: 'Project Manager', value: summary?.project_summary?.project_manager || projectRecord?.project_manager_user || '-' },
                  { label: 'Start / End', value: `${projectRecord?.expected_start_date || '-'} -> ${projectRecord?.expected_end_date || '-'}` },
                  { label: 'Total Sites', value: summary?.project_summary?.total_sites || projectRecord?.total_sites || 0 },
                  { label: 'Spine Progress', value: formatPercent(summary?.project_summary?.spine_progress_pct || projectRecord?.spine_progress_pct || 0) },
                ]}
              />
              <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-4">
                <div className="workspace-kicker">Project Notes</div>
                <div className="mt-2 text-sm leading-6 text-[var(--text-main)]">{projectRecord?.notes || 'No project notes captured yet.'}</div>
              </div>
            </div>
          ) : (
            <EmptyState message="Select a project to see its core record and ownership details." />
          )}
        </SectionCard>

        <SectionCard title="Action Queue" subtitle="Operational pressure points surfaced from the backend spine">
          {summary ? (
            <div className="space-y-4">
              <MetricList
                items={[
                  { label: 'Blocked Sites', value: summary.action_queue.blocked_count },
                  { label: 'Pending Sites', value: summary.action_queue.pending_count },
                  { label: 'Overdue Milestones', value: summary.action_queue.overdue_count },
                ]}
              />
              <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-4">
                <div className="workspace-kicker">Blocker Summary</div>
                <div className="mt-2 text-sm leading-6 text-[var(--text-main)]">{projectRecord?.blocker_summary || summary.project_summary?.blocker_summary || 'No blocker summary on the selected project.'}</div>
              </div>
            </div>
          ) : (
            <EmptyState message="Select a project to see action counts and blocker context." />
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Workflow Control" subtitle="Use this as the main stage handoff desk for the selected project">
          {workflow ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
                <div className="workspace-kicker">Stage Snapshot</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="workspace-chip">{workflow.stage_label || workflow.stage}</span>
                  <span className="workspace-chip">{formatWorkflowAction(workflow.stage_status)}</span>
                  <span className="workspace-chip">{workflow.owner_department || '-'}</span>
                  <span className="workspace-chip">{workflow.next_stage_label || workflow.next_stage || 'Final stage'}</span>
                </div>
              </div>
              <MetricList
                items={[
                  { label: 'Current Stage', value: workflow.stage_label || workflow.stage },
                  { label: 'Stage Status', value: formatWorkflowAction(workflow.stage_status) },
                  { label: 'Owner Department', value: workflow.owner_department || '-' },
                  { label: 'Next Stage', value: workflow.next_stage_label || workflow.next_stage || 'Final stage' },
                  { label: 'Submitted By', value: workflow.submitted_by || '-' },
                  { label: 'Last Action', value: formatWorkflowAction(workflow.last_action) },
                ]}
              />

              <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-4">
                <div className="workspace-kicker">Stage Guidance</div>
                <div className="mt-2 text-sm leading-6 text-[var(--text-main)]">{workflow.description}</div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">{workflow.readiness.summary}</div>
              </div>

              <div className={`rounded-[24px] border px-4 py-4 ${workflow.readiness.ready ? 'border-[rgba(69,152,90,0.35)] bg-[var(--success-bg)]' : 'border-[rgba(194,122,28,0.32)] bg-[var(--warning-bg)]'}`}>
                <div className={`workspace-kicker ${workflow.readiness.ready ? 'text-[var(--success-text)]' : 'text-[var(--warning-text)]'}`}>
                  Readiness Check
                </div>
                <div className={`mt-2 text-sm ${workflow.readiness.ready ? 'text-[var(--success-text)]' : 'text-[var(--warning-text)]'}`}>
                  {workflow.readiness.ready ? 'Stage can be submitted for approval.' : 'Complete the missing checks before submission.'}
                </div>
                <div className="mt-3 space-y-2">
                  {workflow.readiness.requirements.map((requirement) => (
                    <div key={requirement.label} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-[var(--text-main)]">{requirement.label}</div>
                        <span className={`badge ${requirement.satisfied ? 'badge-success' : 'badge-warning'}`}>
                          {requirement.satisfied ? 'Ready' : 'Pending'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">{requirement.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  className="btn btn-primary"
                  disabled={!workflow.actions.can_submit || workflowBusy}
                  onClick={() =>
                    runWorkflowAction('submit_project_stage_for_approval', {
                      promptLabel: 'Submission notes (optional)',
                      successMessage: 'Stage submitted for approval.',
                    })
                  }
                >
                  Submit Stage
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={!workflow.actions.can_approve || workflowBusy}
                  onClick={() =>
                    runWorkflowAction('approve_project_stage', {
                      promptLabel: 'Approval notes (optional)',
                      successMessage: 'Stage approved and advanced.',
                    })
                  }
                >
                  Approve Stage
                </button>
                <button
                  className="btn btn-secondary text-red-700 hover:text-red-800"
                  disabled={!workflow.actions.can_reject || workflowBusy}
                  onClick={() =>
                    runWorkflowAction('reject_project_stage', {
                      promptLabel: 'Rejection reason',
                      successMessage: 'Stage rejected.',
                    })
                  }
                >
                  Reject Stage
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={!workflow.actions.can_restart || workflowBusy}
                  onClick={() =>
                    runWorkflowAction('restart_project_stage', {
                      promptLabel: 'Restart note (optional)',
                      successMessage: 'Stage moved back to in-progress.',
                    })
                  }
                >
                  Restart Stage
                </button>
                <button className="btn btn-secondary" disabled={!workflow.actions.can_override || workflowBusy} onClick={handleOverrideStage}>
                  Override Stage
                </button>
              </div>
            </div>
          ) : (
            <EmptyState message="Select a project to manage workflow handoff and approvals." />
          )}
        </SectionCard>

        <SectionCard title="Workflow History" subtitle="Every stage handoff is logged here to keep the project trail clean">
          {!workflow?.history?.length ? (
            <EmptyState message="No workflow events have been recorded for this project yet." />
          ) : (
            <div className="space-y-3">
              {workflow.history.slice(0, 8).map((event, index) => (
                <div key={`${event.timestamp}-${event.action}-${index}`} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-main)]">{formatWorkflowAction(event.action)}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {event.stage}
                        {event.next_stage ? ` -> ${event.next_stage}` : ''}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">{formatDateTime(event.timestamp)}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[var(--text-main)] sm:grid-cols-2">
                    <div>
                      <div className="workspace-kicker">Actor</div>
                      <div className="mt-1">{event.actor}</div>
                    </div>
                    <div>
                      <div className="workspace-kicker">Remarks</div>
                      <div className="mt-1">{event.remarks || 'No remarks added.'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Team Members" value={teamMembers.length} hint="Assignments available through verified API" icon={Users} tone="cyan" />
        <StatCard title="Active Members" value={activeMembers} hint="Currently active assignments on this project" icon={Users} tone="teal" />
        <StatCard title="Project Assets" value={assets.length} hint="Tracked project-linked assets and services" icon={Boxes} tone="purple" />
        <StatCard title="Deployed Assets" value={deployedAssets} hint="Assets currently marked as deployed" icon={Boxes} tone="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Project Team" subtitle="Live assignment register from GE Project Team Member APIs">
          <div className="workspace-toolbar">
            <div className="text-sm text-[var(--text-muted)]">
              {selectedProject ? `Assignments scoped to ${selectedProject}` : 'Select a project to manage team assignments.'}
              {detailsLoading ? ' Refreshing live data...' : ''}
            </div>
            <button className="btn btn-primary w-full sm:w-auto" onClick={openCreateMemberModal}>
              <Plus className="h-4 w-4" /> Add Team Member
            </button>
          </div>

          {!selectedProject ? (
            <div className="mt-4">
              <EmptyState message="Choose a project first to manage team members." />
            </div>
          ) : !teamMembers.length ? (
            <div className="mt-4">
              <EmptyState message="No team members have been mapped to this project yet." />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Site</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.name} className="align-top">
                      <td>
                        <div className="font-medium text-[var(--text-main)]">{member.user}</div>
                        <div className="text-xs text-[var(--text-muted)]">{member.name}</div>
                      </td>
                      <td className="text-[var(--text-main)]">{formatRoleLabel(member.role_in_project)}</td>
                      <td className="text-[var(--text-main)]">{member.linked_site || '-'}</td>
                      <td className="text-[var(--text-main)]">
                        <div>{member.start_date || '-'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{member.end_date || 'Open-ended'}</div>
                      </td>
                      <td>
                        <span className={`badge ${member.is_active !== false && member.is_active !== 0 ? 'badge-success' : 'badge-gray'}`}>
                          {member.is_active !== false && member.is_active !== 0 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button className="btn btn-secondary px-3 py-2 text-xs" onClick={() => openEditMemberModal(member)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button className="btn btn-secondary px-3 py-2 text-xs text-red-700 hover:text-red-800" onClick={() => handleDeleteMember(member)}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Project Assets" subtitle="Live asset register from GE Project Asset APIs">
          <div className="workspace-toolbar">
            <div className="text-sm text-[var(--text-muted)]">
              {selectedProject ? `Asset register for ${selectedProject}` : 'Select a project to manage assets.'}
              {detailsLoading ? ' Refreshing live data...' : ''}
            </div>
            <button className="btn btn-primary w-full sm:w-auto" onClick={openCreateAssetModal}>
              <Plus className="h-4 w-4" /> Add Asset
            </button>
          </div>

          {!selectedProject ? (
            <div className="mt-4">
              <EmptyState message="Choose a project first to manage assets." />
            </div>
          ) : !assets.length ? (
            <div className="mt-4">
              <EmptyState message="No assets are registered against this project yet." />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {assets.map((asset) => (
                <div key={asset.name} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-[var(--text-main)]">{asset.asset_name}</div>
                        <span className={`badge ${getAssetStatusBadge(asset.status)}`}>{asset.status || '-'}</span>
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">{asset.name}</div>
                      <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-[var(--text-main)] sm:grid-cols-2">
                        <div>
                          <div className="workspace-kicker">Type</div>
                          <div className="mt-1">{asset.asset_type || '-'}</div>
                        </div>
                        <div>
                          <div className="workspace-kicker">Site</div>
                          <div className="mt-1">{asset.linked_site || '-'}</div>
                        </div>
                        <div>
                          <div className="workspace-kicker">Serial / Model</div>
                          <div className="mt-1">{asset.serial_no || asset.make_model || '-'}</div>
                        </div>
                        <div>
                          <div className="workspace-kicker">Assigned To</div>
                          <div className="mt-1">{asset.assigned_to || '-'}</div>
                        </div>
                        <div>
                          <div className="workspace-kicker">Quantity / Cost</div>
                          <div className="mt-1">
                            {asset.quantity ?? 1}
                            {asset.unit_cost ? ` • ${formatCurrency(asset.unit_cost)}` : ''}
                          </div>
                        </div>
                        <div>
                          <div className="workspace-kicker">Timeline</div>
                          <div className="mt-1">{asset.deployment_date || asset.warranty_end_date ? `${asset.deployment_date || '-'} -> ${asset.warranty_end_date || '-'}` : '-'}</div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-[var(--text-muted)]">Last updated {formatDateTime(asset.modified || asset.creation)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary px-3 py-2 text-xs" onClick={() => openEditAssetModal(asset)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button className="btn btn-secondary px-3 py-2 text-xs text-red-700 hover:text-red-800" onClick={() => handleDeleteAsset(asset)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {showProjectModal ? (
        <ModalShell
          title={editingProject ? 'Edit Project' : 'Create Project'}
          subtitle={editingProject ? `Updating ${editingProject.project_name || editingProject.name}` : 'Create a new project record first'}
          onClose={() => setShowProjectModal(false)}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Project Name">
              <input
                className="input"
                value={projectForm.project_name}
                onChange={(event) => setProjectForm((current) => ({ ...current, project_name: event.target.value }))}
                placeholder="e.g. Mohali Surveillance Project"
              />
            </Field>
            <Field label="Status">
              <select
                className="input"
                value={projectForm.status}
                onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value }))}
              >
                {PROJECT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Customer">
              <input
                className="input"
                value={projectForm.customer}
                onChange={(event) => setProjectForm((current) => ({ ...current, customer: event.target.value }))}
                placeholder="Customer / client"
              />
            </Field>
            <Field label="Company" helper="Optional in UI; backend will fallback to default company if available.">
              <input
                className="input"
                value={projectForm.company}
                onChange={(event) => setProjectForm((current) => ({ ...current, company: event.target.value }))}
                placeholder="Default company"
              />
            </Field>
            <Field label="Expected Start Date">
              <input
                className="input"
                type="date"
                value={projectForm.expected_start_date}
                onChange={(event) => setProjectForm((current) => ({ ...current, expected_start_date: event.target.value }))}
              />
            </Field>
            <Field label="Expected End Date">
              <input
                className="input"
                type="date"
                value={projectForm.expected_end_date}
                onChange={(event) => setProjectForm((current) => ({ ...current, expected_end_date: event.target.value }))}
              />
            </Field>
            <Field label="Linked Tender">
              <input
                className="input"
                value={projectForm.linked_tender}
                onChange={(event) => setProjectForm((current) => ({ ...current, linked_tender: event.target.value }))}
                placeholder="Optional tender name"
              />
            </Field>
            <Field label="Current Project Stage">
              <select
                className="input"
                value={projectForm.current_project_stage}
                onChange={(event) => setProjectForm((current) => ({ ...current, current_project_stage: event.target.value }))}
              >
                {SPINE_STAGE_OPTIONS.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project Head">
              <input
                className="input"
                value={projectForm.project_head}
                onChange={(event) => setProjectForm((current) => ({ ...current, project_head: event.target.value }))}
                placeholder="project.head@technosys.local"
              />
            </Field>
            <Field label="Project Manager">
              <input
                className="input"
                value={projectForm.project_manager_user}
                onChange={(event) => setProjectForm((current) => ({ ...current, project_manager_user: event.target.value }))}
                placeholder="project.manager@technosys.local"
              />
            </Field>
            <Field label="Estimated Costing">
              <input
                className="input"
                type="number"
                min="0"
                value={projectForm.estimated_costing}
                onChange={(event) => setProjectForm((current) => ({ ...current, estimated_costing: event.target.value }))}
                placeholder="Optional"
              />
            </Field>
            <Field label="Blocked">
              <label className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={projectForm.spine_blocked}
                  onChange={(event) => setProjectForm((current) => ({ ...current, spine_blocked: event.target.checked }))}
                />
                Mark this project as blocked
              </label>
            </Field>
            <Field label="Blocker Summary" full>
              <textarea
                className="input min-h-[96px]"
                value={projectForm.blocker_summary}
                onChange={(event) => setProjectForm((current) => ({ ...current, blocker_summary: event.target.value }))}
                placeholder="Only needed when project is blocked"
              />
            </Field>
            <Field label="Notes" full>
              <textarea
                className="input min-h-[120px]"
                value={projectForm.notes}
                onChange={(event) => setProjectForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Internal project notes"
              />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveProject} disabled={savingProject}>
              {savingProject ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {showMemberModal ? (
        <ModalShell
          title={editingMember ? 'Edit Team Member' : 'Add Team Member'}
          subtitle={selectedProject ? `Saving into ${selectedProject}` : 'Select a project first'}
          onClose={() => setShowMemberModal(false)}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Project">
              <input className="input" value={selectedProject} disabled />
            </Field>
            <Field label="User" helper="Use the exact User ID available in Frappe.">
              <input
                className="input"
                value={memberForm.user}
                onChange={(event) => setMemberForm((current) => ({ ...current, user: event.target.value }))}
                placeholder="project.manager@company.com"
              />
            </Field>
            <Field label="Role in Project">
              <select
                className="input"
                value={memberForm.role_in_project}
                onChange={(event) => setMemberForm((current) => ({ ...current, role_in_project: event.target.value }))}
              >
                {TEAM_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Linked Site">
              <input
                className="input"
                value={memberForm.linked_site}
                onChange={(event) => setMemberForm((current) => ({ ...current, linked_site: event.target.value }))}
                placeholder="Optional site name"
              />
            </Field>
            <Field label="Start Date">
              <input
                className="input"
                type="date"
                value={memberForm.start_date}
                onChange={(event) => setMemberForm((current) => ({ ...current, start_date: event.target.value }))}
              />
            </Field>
            <Field label="End Date">
              <input
                className="input"
                type="date"
                value={memberForm.end_date}
                onChange={(event) => setMemberForm((current) => ({ ...current, end_date: event.target.value }))}
              />
            </Field>
            <Field label="Assignment Status" full>
              <label className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={memberForm.is_active}
                  onChange={(event) => setMemberForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                Mark this assignment as active
              </label>
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveMember} disabled={savingMember}>
              {savingMember ? 'Saving...' : editingMember ? 'Update Member' : 'Create Member'}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {showAssetModal ? (
        <ModalShell
          title={editingAsset ? 'Edit Project Asset' : 'Add Project Asset'}
          subtitle={selectedProject ? `Saving into ${selectedProject}` : 'Select a project first'}
          onClose={() => setShowAssetModal(false)}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Project">
              <input className="input" value={selectedProject} disabled />
            </Field>
            <Field label="Linked Site">
              <input
                className="input"
                value={assetForm.linked_site}
                onChange={(event) => setAssetForm((current) => ({ ...current, linked_site: event.target.value }))}
                placeholder="Optional site name"
              />
            </Field>
            <Field label="Asset Name">
              <input
                className="input"
                value={assetForm.asset_name}
                onChange={(event) => setAssetForm((current) => ({ ...current, asset_name: event.target.value }))}
                placeholder="Camera batch, switch, AMC service"
              />
            </Field>
            <Field label="Asset Type">
              <select
                className="input"
                value={assetForm.asset_type}
                onChange={(event) => setAssetForm((current) => ({ ...current, asset_type: event.target.value }))}
              >
                {ASSET_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="input"
                value={assetForm.status}
                onChange={(event) => setAssetForm((current) => ({ ...current, status: event.target.value }))}
              >
                {ASSET_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assigned To">
              <input
                className="input"
                value={assetForm.assigned_to}
                onChange={(event) => setAssetForm((current) => ({ ...current, assigned_to: event.target.value }))}
                placeholder="Optional user ID"
              />
            </Field>
            <Field label="Serial No">
              <input
                className="input"
                value={assetForm.serial_no}
                onChange={(event) => setAssetForm((current) => ({ ...current, serial_no: event.target.value }))}
              />
            </Field>
            <Field label="Make / Model">
              <input
                className="input"
                value={assetForm.make_model}
                onChange={(event) => setAssetForm((current) => ({ ...current, make_model: event.target.value }))}
              />
            </Field>
            <Field label="Quantity">
              <input
                className="input"
                type="number"
                min="1"
                value={assetForm.quantity}
                onChange={(event) => setAssetForm((current) => ({ ...current, quantity: event.target.value }))}
              />
            </Field>
            <Field label="Unit Cost">
              <input
                className="input"
                type="number"
                min="0"
                value={assetForm.unit_cost}
                onChange={(event) => setAssetForm((current) => ({ ...current, unit_cost: event.target.value }))}
                placeholder="Optional"
              />
            </Field>
            <Field label="Vendor">
              <input
                className="input"
                value={assetForm.vendor}
                onChange={(event) => setAssetForm((current) => ({ ...current, vendor: event.target.value }))}
                placeholder="GE Organization name"
              />
            </Field>
            <Field label="Deployment Date">
              <input
                className="input"
                type="date"
                value={assetForm.deployment_date}
                onChange={(event) => setAssetForm((current) => ({ ...current, deployment_date: event.target.value }))}
              />
            </Field>
            <Field label="Warranty End Date" full>
              <input
                className="input"
                type="date"
                value={assetForm.warranty_end_date}
                onChange={(event) => setAssetForm((current) => ({ ...current, warranty_end_date: event.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setShowAssetModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveAsset} disabled={savingAsset}>
              {savingAsset ? 'Saving...' : editingAsset ? 'Update Asset' : 'Create Asset'}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </DashboardShell>
  );
}
