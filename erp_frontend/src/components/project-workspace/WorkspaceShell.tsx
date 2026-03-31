'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getFileProxyUrl } from '@/lib/fileLinks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Columns3,
  FileText,
  Flag,
  FolderTree,
  History,
  LayoutDashboard,
  Loader2,
  Search,
  ShieldAlert,
  AlertCircle,
  Upload,
  MessageSquare,
  Wallet,
  Building2,
  X,
  Download,
  Trash2,
  Clock,
  ChevronDown,
  Activity,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Wrench,
  ExternalLink,
  Send,
  Star,
  Settings,
  StickyNote,
  MoreVertical,
  Plus,
  Edit3,
  Eye,
  EyeOff,
  Save,
  ListFilter,
  GripVertical,
  Copy,
  Users,
  Shield,
  Scale,
  ClipboardList,
  Award,
} from 'lucide-react';
import { formatPercent } from '../dashboards/shared';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { useWorkspacePermissions, WorkspacePermissions } from '../../context/WorkspacePermissionContext';
import ReminderDrawer from '../reminders/ReminderDrawer';
import RecordComments from '../collaboration/RecordComments';
import MentionsPanel from '../mentions/MentionsPanel';
import { AccountabilityDashboard } from '../accountability/AccountabilityDashboard';
import IssuesTab from './IssuesTab';
import StaffTab from './StaffTab';
import PettyCashTab from './PettyCashTab';
import CommunicationsTab from './CommunicationsTab';
import CentralStatusTab from './CentralStatusTab';
import RequestsTab from './RequestsTab';

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

export type ProjectSummary = {
  name: string;
  project_name?: string;
  status?: string;
  customer?: string;
  company?: string;
  linked_tender?: string;
  project_head?: string;
  project_manager_user?: string;
  current_project_stage?: string;
  current_stage_status?: string;
  current_stage_owner_department?: string;
  spine_progress_pct?: number;
  spine_blocked?: number;
  blocker_summary?: string;
  total_sites?: number;
  expected_start_date?: string;
  expected_end_date?: string;
};

export type SiteRow = {
  name: string;
  site_code?: string;
  site_name?: string;
  status?: string;
  current_site_stage?: string;
  department_lane?: string;
  site_blocked?: number;
  blocker_reason?: string;
  current_owner_role?: string;
  current_owner_user?: string;
  site_progress_pct?: number;
  milestone_count?: number;
  open_milestone_count?: number;
  latest_planned_end_date?: string;
  latest_dpr_date?: string;
  modified?: string;
};

export type DepartmentLane = {
  department: string;
  label: string;
  allowed_stages: string[];
  site_count: number;
  blocked_count: number;
  avg_progress_pct: number;
  stage_coverage: Record<string, number>;
  sites: SiteRow[];
};

export type ProjectDetail = {
  project_summary: ProjectSummary;
  site_count: number;
  sites: SiteRow[];
  stage_coverage: Record<string, number>;
  department_lanes: Record<string, DepartmentLane>;
  selected_department_lane?: DepartmentLane | null;
  action_queue: {
    blocked_count: number;
    pending_count: number;
    overdue_count: number;
  };
  team_members: Array<{ name: string; user?: string; role_in_project?: string; linked_site?: string; is_active?: number }>;
  project_assets: Array<{ name: string; asset_name?: string; asset_type?: string; status?: string; linked_site?: string; assigned_to?: string }>;
};

export type ProjectDocument = {
  name: string;
  document_name?: string;
  category?: string;
  document_subcategory?: string;
  status?: string;
  linked_project?: string;
  linked_site?: string;
  linked_stage?: string;
  file?: string;
  file_url?: string;
  version?: number | string;
  reference_doctype?: string;
  reference_name?: string;
  supersedes_document?: string;
  is_mandatory?: 0 | 1;
  expiry_date?: string;
  uploaded_by?: string;
  uploaded_on?: string;
  remarks?: string;
  owner?: string;
  creation?: string;
  modified?: string;
};

export type ActivityEntry = {
  type: 'version' | 'comment' | 'site_comment' | 'workflow' | 'alert' | 'accountability';
  ref_doctype: string;
  ref_name: string;
  actor: string;
  timestamp: string;
  summary: string;
  comment_type?: string;
  stage?: string;
  action?: string;
  detail?: string[];
  event_type?: string;
  route?: string;
};

type WorkflowRequirement = {
  label: string;
  satisfied: boolean;
  detail: string;
};

type WorkflowHistoryEntry = {
  action?: string;
  stage?: string;
  next_stage?: string;
  actor?: string;
  timestamp?: string;
  remarks?: string;
};

type WorkflowState = {
  stage: string;
  stage_label: string;
  stage_status: string;
  owner_department?: string;
  owner_roles?: string[];
  description?: string;
  next_stage?: string | null;
  next_stage_label?: string | null;
  submitted_by?: string | null;
  submitted_at?: string | null;
  last_action?: string | null;
  last_actor?: string | null;
  last_action_at?: string | null;
  readiness: {
    ready: boolean;
    mode?: string;
    summary?: string;
    requirements: WorkflowRequirement[];
  };
  actions: {
    can_submit: boolean;
    can_approve: boolean;
    can_reject: boolean;
    can_restart: boolean;
    can_override: boolean;
  };
  history: WorkflowHistoryEntry[];
};

/* PM Cockpit Types */
export type DPREntry = {
  name: string;
  linked_site?: string;
  report_date?: string;
  manpower_on_site?: number;
  equipment_count?: number;
  summary?: string;
};

export type CommissioningChecklist = {
  name: string;
  checklist_name?: string;
  linked_site?: string;
  status?: string;
  commissioned_date?: string;
  template_type?: string;
};

export type TestReport = {
  name: string;
  report_name?: string;
  test_type?: string;
  linked_site?: string;
  status?: string;
  test_date?: string;
};

export type ClientSignoff = {
  name: string;
  signoff_type?: string;
  linked_site?: string;
  status?: string;
  signoff_date?: string;
  signed_by_client?: string;
};

export type ActionItem = {
  type: string;
  priority: string;
  title: string;
  detail: string;
  ref_doctype: string;
  ref_name: string;
};

export type WorkspaceAlert = {
  name: string;
  event_type?: string;
  summary?: string;
  detail?: string;
  linked_site?: string;
  linked_stage?: string;
  route_path?: string;
  is_read?: number;
  creation?: string;
};

export type WorkspaceReminder = {
  name: string;
  title?: string;
  next_reminder_at?: string;
  reminder_datetime?: string;
  linked_site?: string;
  linked_stage?: string;
  status?: string;
  reference_doctype?: string;
  reference_name?: string;
};

export type PMCockpitSummary = {
  dpr_summary: {
    recent: DPREntry[];
    total_count: number;
    this_week_count: number;
    total_manpower: number;
  };
  commissioning_summary: {
    checklists: CommissioningChecklist[];
    checklist_by_status: Record<string, number>;
    test_reports: TestReport[];
    test_by_status: Record<string, number>;
    signoffs: ClientSignoff[];
    signoff_by_status: Record<string, number>;
  };
  dependency_summary: {
    blocked_sites: number;
    hard_blocked: number;
    soft_blocked: number;
    blocked_details: Array<{ name: string; blocker_reason?: string; current_site_stage?: string }>;
    pending_overrides: Array<{ name: string; status?: string; requested_by?: string }>;
  };
  document_expiry: {
    expiring_soon: Array<{ name: string; document_name?: string; expiry_date?: string; category?: string }>;
    expired: Array<{ name: string; document_name?: string; expiry_date?: string; category?: string }>;
    expiring_count: number;
    expired_count: number;
  };
  milestones_summary: {
    by_status: Record<string, number>;
    overdue: Array<{ name: string; milestone_name?: string; planned_date?: string; status?: string }>;
    overdue_count: number;
    total: number;
  };
  signal_summary: {
    unread_alerts_count: number;
    recent_alerts: WorkspaceAlert[];
    active_reminders_count: number;
    due_reminders_count: number;
    reminders: WorkspaceReminder[];
  };
  action_items: ActionItem[];
};

export type TabKey = 'overview' | 'sites' | 'board' | 'milestones' | 'ops' | 'files' | 'activity' | 'issues' | 'staff' | 'petty_cash' | 'comms' | 'central_status' | 'requests' | 'notes' | 'tasks' | 'timesheets' | 'dossier' | 'accountability' | 'approvals' | 'closeout';

export type DepartmentConfig = {
  departmentKey: string;
  departmentLabel: string;
  backHref: string;
  backLabel: string;
  kickerLabel: string;
  /** stages this department can see – undefined means all */
  allowedStages?: string[];
  tabs: TabKey[];
};

type WorkspaceShortcut = {
  label: string;
  href?: string;
  tab?: TabKey;
  tone: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
  detail: string;
};

type WorkspacePriority = {
  title: string;
  detail: string;
  tone: 'rose' | 'amber' | 'emerald' | 'blue';
};

/* ═══════════════════════════════════════════════════════════
   API helper
   ═══════════════════════════════════════════════════════════ */

async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to load data');
  }
  return (payload.data ?? payload) as T;
}

function getDocumentExtension(fileUrl?: string) {
  const cleaned = (fileUrl || '').split('?', 1)[0].trim().toLowerCase();
  return cleaned.includes('.') ? cleaned.split('.').pop() || '' : '';
}

function isPreviewableDocument(fileUrl?: string) {
  return ['pdf', 'jpg', 'jpeg'].includes(getDocumentExtension(fileUrl));
}

/* ═══════════════════════════════════════════════════════════
   Tabs config
   ═══════════════════════════════════════════════════════════ */

const TAB_META: Record<TabKey, { label: string; icon: typeof LayoutDashboard }> = {
  overview:       { label: 'Overview',       icon: LayoutDashboard },
  sites:          { label: 'Sites',          icon: FolderTree },
  board:          { label: 'Site Board',     icon: Columns3 },
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

const SPINE_STAGES = [
  'SURVEY',
  'BOQ_DESIGN',
  'COSTING',
  'PROCUREMENT',
  'STORES_DISPATCH',
  'EXECUTION',
  'BILLING_PAYMENT',
  'OM_RMA',
  'CLOSED',
];

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

const DOCUMENT_TRACE_STAGES = [
  'Survey',
  'BOM_BOQ',
  'Drawing',
  'Indent',
  'Quotation_Vendor_Comparison',
  'PO',
  'Dispatch',
  'GRN_Inventory',
  'Execution',
  'Commissioning',
  'O_M',
  'SLA',
  'RMA',
  'Commercial',
  'Closure',
] as const;

const DOCUMENT_TRACE_STAGE_LABELS: Record<string, string> = {
  Survey: 'Survey',
  BOM_BOQ: 'BOM / BOQ',
  Drawing: 'Drawing',
  Indent: 'Indent',
  Quotation_Vendor_Comparison: 'Quotation / Vendor Comparison',
  PO: 'Purchase Order',
  Dispatch: 'Dispatch',
  GRN_Inventory: 'GRN / Inventory',
  Execution: 'Execution / I&C',
  Commissioning: 'Commissioning',
  O_M: 'O&M',
  SLA: 'SLA',
  RMA: 'RMA',
  Commercial: 'Commercial',
  Closure: 'Closure',
};

const PROJECT_TO_DOCUMENT_STAGE: Record<string, string> = {
  SURVEY: 'Survey',
  BOQ_DESIGN: 'BOM_BOQ',
  COSTING: 'Commercial',
  PROCUREMENT: 'Quotation_Vendor_Comparison',
  STORES_DISPATCH: 'GRN_Inventory',
  EXECUTION: 'Execution',
  BILLING_PAYMENT: 'Commercial',
  OM_RMA: 'SLA',
  CLOSED: 'Closure',
};

/* ═══════════════════════════════════════════════════════════
   Shared helpers
   ═══════════════════════════════════════════════════════════ */

function StatPill({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'error' }) {
  const toneClass = {
    default: 'bg-[var(--surface-raised)] text-[var(--text-main)]',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-rose-50 text-rose-700',
  }[tone];
  return (
    <div className={`rounded-2xl border border-[var(--border-subtle)] px-4 py-3 ${toneClass}`}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-[var(--text-main)]">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>}
    </div>
  );
}

function formatWorkflowText(value?: string | null) {
  return value ? value.replaceAll('_', ' ') : '-';
}

function WorkflowControlPanel({
  projectId,
  wp,
}: {
  projectId: string;
  wp: WorkspacePermissions | null;
}) {
  const [state, setState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [remarks, setRemarks] = useState('');
  const [overrideStage, setOverrideStage] = useState('');

  const loadState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callOps<WorkflowState>('get_project_workflow_state', { project: projectId });
      setState(data);
      setOverrideStage(data.next_stage || data.stage || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow state');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const runAction = async (method: string, successFallback: string) => {
    setBusyAction(method);
    setError('');
    try {
      const args: Record<string, unknown> = {
        project: projectId,
        remarks: remarks.trim() || undefined,
      };
      if (method === 'override_project_stage') {
        args.new_stage = overrideStage;
      }
      const data = await callOps<WorkflowState>(method, args);
      setState(data);
      setRemarks('');
      if (data.next_stage) {
        setOverrideStage(data.next_stage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : successFallback);
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h4 className="font-semibold text-[var(--text-main)]">Workflow Control</h4>
      </div>
      <div className="card-body space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading workflow state...
          </div>
        ) : null}

        {!loading && state ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatPill label="Stage" value={state.stage_label || formatWorkflowText(state.stage)} />
              <StatPill
                label="Status"
                value={formatWorkflowText(state.stage_status)}
                tone={state.stage_status === 'REJECTED' ? 'error' : state.stage_status === 'PENDING_APPROVAL' ? 'warning' : 'success'}
              />
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 text-sm">
              <div className="font-medium text-[var(--text-main)]">{state.description || 'Workflow stage details are available from backend state.'}</div>
              <div className="mt-1 text-[var(--text-muted)]">
                Next stage: {state.next_stage_label || 'Final stage'}
              </div>
              {state.submitted_by || state.submitted_at ? (
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  Submitted by {state.submitted_by || '-'} {state.submitted_at ? `on ${new Date(state.submitted_at).toLocaleString('en-IN')}` : ''}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-main)]">Readiness</div>
                  <div className="text-xs text-[var(--text-muted)]">{state.readiness.summary || 'Backend readiness rules apply here.'}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${state.readiness.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {state.readiness.ready ? 'Ready' : 'Blocked'}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {state.readiness.requirements.map((item) => (
                  <div key={item.label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                    <div className="flex items-start gap-2">
                      {item.satisfied ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--text-main)]">{item.label}</div>
                        <div className="text-xs text-[var(--text-muted)]">{item.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
            ) : null}

            <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3">
              <div className="text-sm font-semibold text-[var(--text-main)]">Action Remarks</div>
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[var(--border-subtle)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Optional remarks for submit, approve, reject, restart, or override"
              />

              {state.actions.can_override || wp?.can_override_stage ? (
                <label className="block text-sm text-[var(--text-muted)]">
                  Override Stage
                  <select
                    value={overrideStage}
                    onChange={(event) => setOverrideStage(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-[var(--border-subtle)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
                  >
                    {SPINE_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {STAGE_LABELS[stage] || formatWorkflowText(stage)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {state.actions.can_submit ? (
                  <button
                    type="button"
                    onClick={() => void runAction('submit_project_stage_for_approval', 'Failed to submit stage')}
                    disabled={busyAction.length > 0}
                    className="inline-flex items-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busyAction === 'submit_project_stage_for_approval' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit Stage
                  </button>
                ) : null}
                {state.actions.can_approve ? (
                  <button
                    type="button"
                    onClick={() => void runAction('approve_project_stage', 'Failed to approve stage')}
                    disabled={busyAction.length > 0}
                    className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busyAction === 'approve_project_stage' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Approve Stage
                  </button>
                ) : null}
                {state.actions.can_reject ? (
                  <button
                    type="button"
                    onClick={() => void runAction('reject_project_stage', 'Failed to reject stage')}
                    disabled={busyAction.length > 0}
                    className="inline-flex items-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busyAction === 'reject_project_stage' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Reject Stage
                  </button>
                ) : null}
                {state.actions.can_restart ? (
                  <button
                    type="button"
                    onClick={() => void runAction('restart_project_stage', 'Failed to restart stage')}
                    disabled={busyAction.length > 0}
                    className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-main)] disabled:opacity-60"
                  >
                    {busyAction === 'restart_project_stage' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                    Restart Stage
                  </button>
                ) : null}
                {state.actions.can_override ? (
                  <button
                    type="button"
                    onClick={() => void runAction('override_project_stage', 'Failed to override stage')}
                    disabled={busyAction.length > 0 || !overrideStage}
                    className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-60"
                  >
                    {busyAction === 'override_project_stage' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileWarning className="mr-2 h-4 w-4" />}
                    Override Stage
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[var(--text-main)]">Workflow History</div>
                <button type="button" onClick={() => void loadState()} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">
                  Refresh
                </button>
              </div>
              {state.history.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No workflow history recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {state.history.slice(0, 5).map((entry, index) => (
                    <div key={`${entry.timestamp || 'entry'}-${index}`} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                      <div className="text-sm font-medium text-[var(--text-main)]">
                        {formatWorkflowText(entry.action)} {entry.stage ? `• ${STAGE_LABELS[entry.stage] || formatWorkflowText(entry.stage)}` : ''}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {entry.actor || 'System'} {entry.timestamp ? `• ${new Date(entry.timestamp).toLocaleString('en-IN')}` : ''}
                        {entry.next_stage ? ` • Next: ${STAGE_LABELS[entry.next_stage] || formatWorkflowText(entry.next_stage)}` : ''}
                      </div>
                      {entry.remarks ? <div className="mt-1 text-xs text-[var(--text-muted)]">{entry.remarks}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Overview Tab
   ═══════════════════════════════════════════════════════════ */

function OverviewTab({ detail, config, deptSites, projectId, onTabChange, buildTabHref, wp }: { detail: ProjectDetail; config: DepartmentConfig; deptSites: SiteRow[]; projectId: string; onTabChange: (tab: TabKey) => void; buildTabHref: (tab: TabKey) => string; wp: WorkspacePermissions | null }) {
  const { currentUser } = useAuth();
  const ps = detail.project_summary;
  const aq = detail.action_queue;
  const allLanes = Object.values(detail.department_lanes || {});
  // Filter department lanes by workspace permissions when available
  const lanes = wp?.department_access
    ? allLanes.filter((lane) => {
        const access = wp.department_access[lane.department];
        return !access || access.can_view; // allow if no access entry (not gated)
      })
    : allLanes;
  const isDept = config.departmentKey !== 'all';

  const blockedSites = isDept
    ? deptSites.filter((s) => s.site_blocked)
    : detail.sites.filter((s) => s.site_blocked);
  const blockedCount = blockedSites.length;
  const progressAvg = isDept
    ? (deptSites.reduce((sum, s) => sum + (s.site_progress_pct || 0), 0) / (deptSites.length || 1))
    : (ps.spine_progress_pct || 0);

  // Sites close to or past deadline
  const overdueSites = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (isDept ? deptSites : detail.sites).filter((s) => {
      if (!s.latest_planned_end_date) return false;
      return new Date(s.latest_planned_end_date) < today;
    });
  }, [isDept, deptSites, detail.sites]);

  // Stage coverage — filtered to department stages if applicable
  const visibleCoverage = useMemo(() => {
    if (!config.allowedStages) return detail.stage_coverage || {};
    const filtered: Record<string, number> = {};
    for (const stage of config.allowedStages) {
      if ((detail.stage_coverage || {})[stage] !== undefined) {
        filtered[stage] = detail.stage_coverage[stage];
      }
    }
    return filtered;
  }, [detail.stage_coverage, config.allowedStages]);

  const roleFocus = currentUser?.role || currentUser?.roles?.[0] || 'Project User';

  const priorities = useMemo<WorkspacePriority[]>(() => {
    const items: WorkspacePriority[] = [];
    if (blockedCount > 0) {
      items.push({
        title: `${blockedCount} blocked site${blockedCount > 1 ? 's' : ''} need decisions`,
        detail: 'Start with the site blockers below and move the blocked records before opening new work.',
        tone: 'rose',
      });
    }
    if (aq.pending_count > 0) {
      items.push({
        title: `${aq.pending_count} pending workflow item${aq.pending_count > 1 ? 's' : ''}`,
        detail: 'Use the operations tab to clear approvals, submissions, and workflow actions waiting on this project.',
        tone: 'amber',
      });
    }
    if (aq.overdue_count > 0 || overdueSites.length > 0) {
      items.push({
        title: `${aq.overdue_count + overdueSites.length} overdue execution signal${aq.overdue_count + overdueSites.length > 1 ? 's' : ''}`,
        detail: 'Review overdue sites and milestones before continuing with new commissioning or billing steps.',
        tone: 'amber',
      });
    }
    if (!items.length) {
      items.push({
        title: 'Project is operationally clear',
        detail: 'Use the shortcuts below to drive the next stage, verify controlled documents, and monitor signals.',
        tone: 'emerald',
      });
    }
    return items.slice(0, 3);
  }, [aq.overdue_count, aq.pending_count, blockedCount, overdueSites.length]);

  const shortcuts = useMemo<WorkspaceShortcut[]>(() => {
    const items: WorkspaceShortcut[] = [
      {
        label: 'Open Operations Queue',
        href: buildTabHref('ops'),
        tab: 'ops',
        tone: 'amber',
        detail: 'Dependencies, commissioning readiness, document expiry, and live signals',
      },
      {
        label: 'Review Project Files',
        href: buildTabHref('files'),
        tab: 'files',
        tone: 'violet',
        detail: 'Latest documents, version history, expiry, and uploads in project context',
      },
      {
        label: 'Check Site Board',
        href: buildTabHref('board'),
        tab: 'board',
        tone: 'blue',
        detail: 'See site distribution by lifecycle stage and move toward the next action',
      },
      {
        label: 'Execution Workspace',
        href: `/execution/projects/${encodeURIComponent(projectId)}`,
        tone: 'emerald',
        detail: 'Open the execution-focused lane for DPR, commissioning, and site delivery',
      },
    ];

    if ((currentUser?.roles || []).some((role) => role === 'Director' || role === 'Project Head' || role === 'Project Manager')) {
      items.unshift({
        label: 'PH Approvals',
        href: buildTabHref('approvals'),
        tab: 'approvals',
        tone: 'amber',
        detail: 'PO, RMA PO, and Petty Cash requests pending Project Head approval and costing queue',
      });
      items.unshift({
        label: 'Project Dossier',
        href: buildTabHref('dossier'),
        tab: 'dossier',
        tone: 'violet',
        detail: 'Stage-wise document completeness signals and controlled document inventory',
      });
      items.unshift({
        label: 'Project Activity',
        href: buildTabHref('activity'),
        tab: 'activity',
        tone: 'rose',
        detail: 'Trace recent comments, workflow changes, and team coordination on this project',
      });
      items.unshift({
        label: 'Accountability & RCA',
        href: buildTabHref('accountability'),
        tab: 'accountability',
        tone: 'rose',
        detail: 'Blocked items, escalations, rejections, and full audit trail for this project',
      });
    }

    return items.slice(0, 5);
  }, [buildTabHref, currentUser?.roles, projectId]);

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(237,244,255,0.92))] p-5 shadow-[var(--shadow-subtle)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">Mission Control</div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-main)]">
              {roleFocus} daily operating view for {ps.project_name || projectId}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              This workspace should answer what is blocked, what is due now, which records need governance, and which lane should move next.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill label="Action Queue" value={aq.pending_count + aq.overdue_count + blockedCount} tone={aq.pending_count + aq.overdue_count + blockedCount ? 'warning' : 'success'} />
            <StatPill label="Blocked" value={blockedCount} tone={blockedCount ? 'error' : 'success'} />
            <StatPill label="Visible Sites" value={isDept ? deptSites.length : detail.site_count} tone="default" />
            <StatPill label="Progress" value={formatPercent(progressAvg)} tone="success" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {priorities.map((priority) => (
            <div
              key={priority.title}
              className={`rounded-2xl border px-4 py-3 ${
                priority.tone === 'rose'
                  ? 'border-rose-200 bg-rose-50/70'
                  : priority.tone === 'amber'
                    ? 'border-amber-200 bg-amber-50/70'
                    : priority.tone === 'emerald'
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-blue-200 bg-blue-50/70'
              }`}
            >
              <div className="text-sm font-semibold text-[var(--text-main)]">{priority.title}</div>
              <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{priority.detail}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((shortcut) => {
            const toneClasses = {
              blue: 'border-blue-200 bg-blue-50/50 text-blue-700',
              emerald: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
              amber: 'border-amber-200 bg-amber-50/50 text-amber-700',
              violet: 'border-violet-200 bg-violet-50/50 text-violet-700',
              rose: 'border-rose-200 bg-rose-50/50 text-rose-700',
            }[shortcut.tone];

            const content = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{shortcut.label}</div>
                  <ExternalLink className="h-4 w-4" />
                </div>
                <div className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{shortcut.detail}</div>
              </>
            );

            if (shortcut.href) {
              return (
                <Link key={shortcut.label} href={shortcut.href} className={`rounded-2xl border px-4 py-3 transition hover:shadow-[var(--shadow-subtle)] ${toneClasses}`}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={shortcut.label}
                type="button"
                onClick={() => shortcut.tab && onTabChange(shortcut.tab)}
                className={`rounded-2xl border px-4 py-3 text-left transition hover:shadow-[var(--shadow-subtle)] ${toneClasses}`}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <button onClick={() => onTabChange('sites')} className="text-left">
          <StatPill label={isDept ? `${config.departmentLabel} Sites` : 'Total Sites'} value={isDept ? deptSites.length : detail.site_count} />
        </button>
        <StatPill label={isDept ? 'Avg Progress' : 'Spine Progress'} value={formatPercent(progressAvg)} tone="success" />
        <button onClick={() => onTabChange('sites')} className="text-left">
          <StatPill label="Blocked" value={blockedCount} tone={blockedCount ? 'error' : 'default'} />
        </button>
        {!isDept && <StatPill label="Overdue" value={overdueSites.length} tone={overdueSites.length ? 'warning' : 'default'} />}
        {isDept && <StatPill label="Total Project Sites" value={detail.site_count} />}
      </div>

      {/* Project metadata + team */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header"><h4 className="font-semibold text-[var(--text-main)]">Project Details</h4></div>
          <div className="card-body">
            <dl className="space-y-2 text-sm">
              {([
                ['Customer', ps.customer],
                ['Company', ps.company],
                ['Project Head', ps.project_head],
                ['Project Manager', ps.project_manager_user],
                ['Current Stage', STAGE_LABELS[ps.current_project_stage || ''] || ps.current_project_stage],
                ['Stage Status', ps.current_stage_status],
                ['Owner Dept', ps.current_stage_owner_department],
                ['Linked Tender', ps.linked_tender],
                ['Dates', `${ps.expected_start_date || '?'} → ${ps.expected_end_date || '?'}`],
                ['Status', ps.status],
              ] as [string, string | undefined][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">{k}</dt>
                  <dd className="font-medium text-[var(--text-main)] text-right">{v || '-'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <WorkflowControlPanel projectId={projectId} wp={wp} />

          <div className="card">
            <div className="card-header"><h4 className="font-semibold text-[var(--text-main)]">Team</h4></div>
            <div className="card-body">
              {!detail.team_members?.length ? (
                <p className="text-sm text-[var(--text-muted)]">No team members assigned.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {detail.team_members.slice(0, 10).map((m) => (
                    <div key={m.name} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                      <span className="font-medium text-[var(--text-main)]">{m.user || 'Unknown'}</span>
                      <span className="text-[var(--text-muted)]">{(m.role_in_project || '-').replaceAll('_', ' ')}</span>
                    </div>
                  ))}
                  {detail.team_members.length > 10 && (
                    <p className="text-xs text-[var(--text-muted)]">+ {detail.team_members.length - 10} more</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {ps.blocker_summary && (
            <div className="card border-rose-200 bg-rose-50/50">
              <div className="card-body">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-500" />
                  <div>
                    <h4 className="text-sm font-semibold text-rose-700">Blocker Summary</h4>
                    <p className="mt-1 text-sm text-rose-600">{ps.blocker_summary}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blocker triage — individual blocked sites with reasons */}
      {blockedSites.length > 0 && (
        <div>
          <SectionHeader title="Blocked Sites" subtitle={`${blockedSites.length} site${blockedSites.length > 1 ? 's' : ''} need attention`} />
          <div className="space-y-2">
            {blockedSites.slice(0, 8).map((site) => (
              <div key={site.name} className="flex items-center gap-4 rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-2.5">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-medium text-[var(--text-main)]">{site.site_name || site.site_code || site.name}</span>
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                      {STAGE_LABELS[site.current_site_stage || ''] || (site.current_site_stage || 'SURVEY').replaceAll('_', ' ')}
                    </span>
                  </div>
                  {site.blocker_reason && (
                    <p className="mt-0.5 text-xs text-rose-600">{site.blocker_reason}</p>
                  )}
                </div>
                <div className="text-right text-xs text-[var(--text-muted)] whitespace-nowrap">
                  {site.current_owner_role ? (site.current_owner_role).replaceAll('_', ' ') : 'Unassigned'}
                </div>
              </div>
            ))}
            {blockedSites.length > 8 && (
              <button onClick={() => onTabChange('sites')} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">
                View all {blockedSites.length} blocked sites →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stage distribution with human-readable labels and blocked counts */}
      {Object.keys(visibleCoverage).length > 0 && (
        <div>
          <SectionHeader title="Stage Distribution" subtitle={isDept ? `Stages within ${config.departmentLabel} lane` : 'How sites are distributed across the lifecycle'} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Object.entries(visibleCoverage).map(([stage, count]) => {
              const stageBlocked = (isDept ? deptSites : detail.sites).filter(
                (s) => (s.current_site_stage || 'SURVEY') === stage && s.site_blocked,
              ).length;
              return (
                <div key={stage} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 text-center">
                  <div className="text-xs font-medium text-[var(--text-muted)]">{STAGE_LABELS[stage] || stage.replaceAll('_', ' ')}</div>
                  <div className="mt-1 text-xl font-bold text-[var(--text-main)]">{count}</div>
                  {stageBlocked > 0 && (
                    <div className="mt-1 text-[10px] font-semibold text-rose-600">{stageBlocked} blocked</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Department health — lanes with readiness signals */}
      {lanes.length > 0 && (
        <div>
          <SectionHeader
            title={isDept ? 'All Department Lanes' : 'Department Health'}
            subtitle="Each department's operational readiness at a glance"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lanes.map((lane) => {
              const isOwn = isDept && lane.department === config.departmentKey;
              const healthTone = lane.blocked_count > 0
                ? (lane.blocked_count / (lane.site_count || 1) > 0.3 ? 'border-l-rose-500' : 'border-l-amber-400')
                : (lane.avg_progress_pct >= 50 ? 'border-l-emerald-500' : 'border-l-blue-400');
              return (
                <div key={lane.department} className={`card border-l-4 ${healthTone} ${isOwn ? 'ring-2 ring-[var(--accent)]' : ''}`}>
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-[var(--text-main)]">
                        {lane.label}
                        {isOwn && <span className="ml-2 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">Current</span>}
                      </h5>
                      <span className="text-xs text-[var(--text-muted)]">{lane.site_count} sites</span>
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      {lane.allowed_stages.map((s) => STAGE_LABELS[s] || s).join(' → ')}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                        <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(lane.avg_progress_pct || 0, 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-muted)]">{formatPercent(lane.avg_progress_pct || 0)}</span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs">
                      {lane.blocked_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-600">
                          <ShieldAlert className="h-3 w-3" />{lane.blocked_count} blocked
                        </span>
                      )}
                      {lane.blocked_count === 0 && lane.site_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">Clear</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Items Preview */}
      <ActionItemsPreview projectId={projectId} onViewAll={() => onTabChange('ops')} config={config} />

      {/* Recent Activity Preview */}
      <RecentActivityPreview projectId={projectId} onViewAll={() => onTabChange('activity')} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Action Items Preview (used in Overview)
   ═══════════════════════════════════════════════════════════ */

function ActionItemsPreview({ projectId, onViewAll, config }: { projectId: string; onViewAll: () => void; config: DepartmentConfig }) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await callOps<PMCockpitSummary>('get_pm_cockpit_summary', {
          project: projectId,
          stages: config.allowedStages || [],
        });
        if (active) setItems(data.action_items || []);
      } catch {
        // Silently skip — overview still works without action items
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId, config.allowedStages]);

  if (loading || items.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionHeader title="Requires Attention" subtitle={`${items.length} item${items.length > 1 ? 's' : ''} need follow-up`} />
        <button onClick={onViewAll} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">View Operations →</button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 3).map((item, idx) => (
          <div key={idx} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
            item.priority === 'high' ? 'border-rose-200 bg-rose-50/50' : 'border-amber-200 bg-amber-50/50'
          }`}>
            <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              item.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }`}>{item.type}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--text-main)]">{item.title}</div>
              <div className="text-xs text-[var(--text-muted)] line-clamp-2">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
      {items.length > 3 && (
        <button onClick={onViewAll} className="mt-2 text-xs font-medium text-[var(--accent-strong)] hover:underline">
          View all {items.length} action items →
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Recent Activity Preview (used in Overview)
   ═══════════════════════════════════════════════════════════ */

function RecentActivityPreview({ projectId, onViewAll }: { projectId: string; onViewAll: () => void }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await callOps<ActivityEntry[]>('get_project_activity', { project: projectId, limit: 5 });
        if (active) setEntries(data);
      } catch {
        // Silently skip — overview still works without activity
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  const typeLabel: Record<string, string> = { version: 'Update', comment: 'Comment', site_comment: 'Site', workflow: 'Workflow' };
  const typeBg: Record<string, string> = { version: 'bg-blue-50 text-blue-700', comment: 'bg-violet-50 text-violet-700', site_comment: 'bg-amber-50 text-amber-700', workflow: 'bg-emerald-50 text-emerald-700' };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionHeader title="Recent Activity" subtitle="Latest changes across the project" />
        <button onClick={onViewAll} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">View all</button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-sm text-[var(--text-muted)]">No recent activity.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={`${entry.type}-${entry.timestamp}-${idx}`} className="flex gap-3 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5">
              <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeBg[entry.type] || 'bg-gray-100 text-gray-600'}`}>
                {typeLabel[entry.type] || entry.type}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--text-main)]">{entry.summary}</p>
                <div className="mt-0.5 flex gap-3 text-[11px] text-[var(--text-muted)]">
                  <span>{entry.actor}</span>
                  <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Sites Tab
   ═══════════════════════════════════════════════════════════ */

function SitesTab({ sites, config }: { sites: SiteRow[]; config: DepartmentConfig; projectId: string; wp: WorkspacePermissions | null }) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [blockedOnly, setBlockedOnly] = useState(false);

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
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Files Tab
   ═══════════════════════════════════════════════════════════ */

const DOC_CATEGORIES = ['All', 'Survey', 'Engineering', 'Procurement', 'Execution', 'O&M', 'Finance', 'HR', 'Other'] as const;

function ExpiryBadge({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700"><Clock className="h-3 w-3" />Expired</span>;
  }
  if (diffDays <= 7) {
    return <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"><Clock className="h-3 w-3" />{diffDays}d left</span>;
  }
  if (diffDays <= 30) {
    return <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-50 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">{diffDays}d left</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{new Date(expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
}

type StageCompleteness = {
  requirements: Array<{
    requirement: string;
    stage: string;
    category: string;
    subcategory?: string;
    mandatory: boolean;
    satisfied: boolean;
  }>;
  all_mandatory_satisfied: boolean;
  total: number;
  satisfied_count: number;
  missing_mandatory_count: number;
};

type ProgressionGate = {
  target_stage: string;
  can_proceed: boolean;
  missing_mandatory: Array<{ stage: string; category: string; subcategory?: string }>;
  missing_count: number;
  message: string;
};

function FilesTab({ projectId, currentStage, wp }: { projectId: string; currentStage?: string; wp: WorkspacePermissions | null }) {
  const canUpload = wp?.can_upload_files ?? true;
  const canDelete = wp?.can_delete_files ?? false;
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadForm, setUploadForm] = useState({ document_name: '', category: 'Engineering', linked_site: '', expiry_date: '', remarks: '', linked_stage: '', document_subcategory: '', reference_doctype: '', reference_name: '', is_mandatory: false });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  // Version drawer state
  const [versionDoc, setVersionDoc] = useState<ProjectDocument | null>(null);
  const [versions, setVersions] = useState<ProjectDocument[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedTraceStage, setSelectedTraceStage] = useState<string>(PROJECT_TO_DOCUMENT_STAGE[currentStage || ''] || 'Survey');
  const [stageCompleteness, setStageCompleteness] = useState<StageCompleteness | null>(null);
  const [progressionGate, setProgressionGate] = useState<ProgressionGate | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [selectedRecordKey, setSelectedRecordKey] = useState('');
  const [recordDocsLoading, setRecordDocsLoading] = useState(false);
  const [recordDocs, setRecordDocs] = useState<ProjectDocument[]>([]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await callOps<ProjectDocument[]>('get_project_documents', { project: projectId });
      setDocs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSelectedTraceStage(PROJECT_TO_DOCUMENT_STAGE[currentStage || ''] || 'Survey');
  }, [currentStage, projectId]);

  const filtered = activeCategory === 'All' ? docs : docs.filter(d => d.category === activeCategory);

  // Group docs by document_name to detect multi-version docs
  const versionCounts = docs.reduce<Record<string, number>>((acc, d) => {
    const key = `${d.document_name || d.name}::${d.linked_site || ''}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const handleUpload = async () => {
    if (!uploadForm.document_name.trim() || !uploadFile) return;
    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_name', uploadForm.document_name.trim());
      formData.append('linked_project', projectId);
      formData.append('category', uploadForm.category);
      if (uploadForm.linked_site) formData.append('linked_site', uploadForm.linked_site);
      if (uploadForm.expiry_date) formData.append('expiry_date', uploadForm.expiry_date);
      if (uploadForm.remarks) formData.append('remarks', uploadForm.remarks);
      if (uploadForm.linked_stage) formData.append('linked_stage', uploadForm.linked_stage);
      if (uploadForm.document_subcategory) formData.append('document_subcategory', uploadForm.document_subcategory);
      if (uploadForm.reference_doctype) formData.append('reference_doctype', uploadForm.reference_doctype);
      if (uploadForm.reference_name) formData.append('reference_name', uploadForm.reference_name);
      if (uploadForm.is_mandatory) formData.append('is_mandatory', '1');
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const payload = await res.json();
      if (!res.ok || payload.success === false) {
        setError(payload.message || 'Upload failed');
      } else {
        setUploadForm({ document_name: '', category: 'Engineering', linked_site: '', expiry_date: '', remarks: '', linked_stage: '', document_subcategory: '', reference_doctype: '', reference_name: '', is_mandatory: false });
        setUploadFile(null);
        setShowUpload(false);
        loadDocs();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadBusy(false);
    }
  };

  const handleStatusChange = async (docName: string, status: string) => {
    try {
      await callOps('update_document_status', { name: docName, status });
      loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await callOps('delete_project_document', { name });
      loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const openVersions = async (doc: ProjectDocument) => {
    setVersionDoc(doc);
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/documents/versions?name=${encodeURIComponent(doc.name)}`);
      const payload = await res.json();
      setVersions(payload.data || []);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  // Document statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiredDocs = docs.filter(d => d.expiry_date && new Date(d.expiry_date) < today);
  const expiringDocs = docs.filter(d => {
    if (!d.expiry_date) return false;
    const exp = new Date(d.expiry_date);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  });
  const versionedDocCount = Object.values(versionCounts).filter(c => c > 1).length;
  const controlledDocs = docs.filter(d => d.expiry_date);
  const linkedRecordBundles = useMemo(() => {
    const map = new Map<string, { key: string; reference_doctype: string; reference_name: string; count: number }>();
    for (const doc of docs) {
      if (!doc.reference_doctype || !doc.reference_name) continue;
      const key = `${doc.reference_doctype}::${doc.reference_name}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          key,
          reference_doctype: doc.reference_doctype,
          reference_name: doc.reference_name,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.reference_doctype.localeCompare(b.reference_doctype) || a.reference_name.localeCompare(b.reference_name));
  }, [docs]);

  useEffect(() => {
    if (!linkedRecordBundles.length) {
      setSelectedRecordKey('');
      return;
    }
    if (!selectedRecordKey || !linkedRecordBundles.some((bundle) => bundle.key === selectedRecordKey)) {
      setSelectedRecordKey(linkedRecordBundles[0].key);
    }
  }, [linkedRecordBundles, selectedRecordKey]);

  const selectedRecordBundle = useMemo(
    () => linkedRecordBundles.find((bundle) => bundle.key === selectedRecordKey) || null,
    [linkedRecordBundles, selectedRecordKey],
  );

  useEffect(() => {
    let active = true;
    const loadTrace = async () => {
      if (!selectedTraceStage) return;
      setTraceLoading(true);
      try {
        const [completeness, gate] = await Promise.all([
          callOps<StageCompleteness>('check_stage_document_completeness', { project: projectId, stage: selectedTraceStage }),
          callOps<ProgressionGate>('check_progression_gate', { project: projectId, target_stage: selectedTraceStage }),
        ]);
        if (!active) return;
        setStageCompleteness(completeness);
        setProgressionGate(gate);
      } catch (err) {
        if (!active) return;
        setStageCompleteness(null);
        setProgressionGate(null);
        setError(err instanceof Error ? err.message : 'Failed to load document readiness');
      } finally {
        if (active) setTraceLoading(false);
      }
    };
    void loadTrace();
    return () => { active = false; };
  }, [projectId, selectedTraceStage]);

  useEffect(() => {
    let active = true;
    const loadRecordDocs = async () => {
      if (!selectedRecordBundle) {
        setRecordDocs([]);
        return;
      }
      setRecordDocsLoading(true);
      try {
        const data = await callOps<ProjectDocument[]>('get_record_documents', {
          reference_doctype: selectedRecordBundle.reference_doctype,
          reference_name: selectedRecordBundle.reference_name,
        });
        if (!active) return;
        setRecordDocs(data);
      } catch (err) {
        if (!active) return;
        setRecordDocs([]);
        setError(err instanceof Error ? err.message : 'Failed to load record-linked documents');
      } finally {
        if (active) setRecordDocsLoading(false);
      }
    };
    void loadRecordDocs();
    return () => { active = false; };
  }, [selectedRecordBundle]);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading documents...</div>;
  if (error && !docs.length) return <p className="py-12 text-center text-sm text-rose-600">{error}</p>;

  return (
    <div className="space-y-4">
      {/* DMS Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-3">
          <div className="text-xs text-[var(--text-muted)]">Total Documents</div>
          <div className="mt-1 text-xl font-bold text-[var(--text-main)]">{docs.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-3">
          <div className="text-xs text-[var(--text-muted)]">Multi-Version</div>
          <div className="mt-1 text-xl font-bold text-violet-600">{versionedDocCount}</div>
        </div>
        {expiredDocs.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <div className="text-xs text-rose-600">Expired</div>
            <div className="mt-1 flex items-center gap-1.5 text-xl font-bold text-rose-700">
              <AlertCircle className="h-4 w-4" />{expiredDocs.length}
            </div>
          </div>
        )}
        {expiringDocs.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs text-amber-600">Expiring Soon</div>
            <div className="mt-1 flex items-center gap-1.5 text-xl font-bold text-amber-700">
              <Clock className="h-4 w-4" />{expiringDocs.length}
            </div>
          </div>
        )}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-3">
          <div className="text-xs text-[var(--text-muted)]">Controlled</div>
          <div className="mt-1 text-xl font-bold text-emerald-600">{controlledDocs.length}</div>
          <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">with expiry tracking</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text-main)]">Stage Readiness</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Document completeness and progression gate for the selected lifecycle stage.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedTraceStage}
                onChange={(e) => setSelectedTraceStage(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                {DOCUMENT_TRACE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {DOCUMENT_TRACE_STAGE_LABELS[stage] || stage}
                  </option>
                ))}
              </select>
              <Link
                href={`/projects/${encodeURIComponent(projectId)}/dossier`}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50"
              >
                <BookOpen className="h-3.5 w-3.5" /> Open dossier
              </Link>
            </div>
          </div>

          {traceLoading ? (
            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking stage readiness...
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className={`rounded-xl border px-3 py-3 ${
                progressionGate?.can_proceed
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-rose-200 bg-rose-50'
              }`}>
                <div className="text-xs font-semibold text-[var(--text-main)]">
                  {progressionGate?.can_proceed ? 'Progression gate is clear' : 'Progression gate is blocked'}
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  {progressionGate?.message || 'No progression summary available yet.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <div className="text-[11px] text-[var(--text-muted)]">Requirements</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--text-main)]">{stageCompleteness?.total || 0}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <div className="text-[11px] text-[var(--text-muted)]">Satisfied</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-600">{stageCompleteness?.satisfied_count || 0}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <div className="text-[11px] text-[var(--text-muted)]">Missing Mandatory</div>
                  <div className="mt-1 text-lg font-semibold text-rose-600">{stageCompleteness?.missing_mandatory_count || 0}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <div className="text-[11px] text-[var(--text-muted)]">Target Stage</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">{DOCUMENT_TRACE_STAGE_LABELS[selectedTraceStage] || selectedTraceStage}</div>
                </div>
              </div>

              {progressionGate?.missing_mandatory?.length ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="text-xs font-semibold text-rose-700">Missing before stage entry</div>
                  <div className="mt-2 space-y-1">
                    {progressionGate.missing_mandatory.slice(0, 6).map((item, index) => (
                      <div key={`${item.stage}-${item.category}-${item.subcategory || index}`} className="text-[11px] text-rose-700">
                        {DOCUMENT_TRACE_STAGE_LABELS[item.stage] || item.stage}: {item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text-main)]">Record-linked Documents</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Pull the document bundle for a specific BOQ, PO, drawing, GRN, or other linked record.
              </div>
            </div>
            <div className="rounded-full bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] text-[var(--text-muted)]">
              {linkedRecordBundles.length} linked bundle{linkedRecordBundles.length !== 1 ? 's' : ''}
            </div>
          </div>

          {!linkedRecordBundles.length ? (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-6 text-center text-xs text-[var(--text-muted)]">
              No record-linked document bundle exists yet for this project.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {linkedRecordBundles.map((bundle) => (
                  <button
                    key={bundle.key}
                    onClick={() => setSelectedRecordKey(bundle.key)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      selectedRecordKey === bundle.key
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]'
                    }`}
                  >
                    {bundle.reference_doctype}: {bundle.reference_name} ({bundle.count})
                  </button>
                ))}
              </div>

              {recordDocsLoading ? (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading linked documents...
                </div>
              ) : (
                <div className="space-y-2">
                  {recordDocs.slice(0, 5).map((doc) => (
                    <div key={doc.name} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-[var(--text-main)]">{doc.document_name || doc.name}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[var(--text-muted)]">
                            {doc.category && <span>{doc.category}</span>}
                            {doc.document_subcategory && <span>/ {doc.document_subcategory}</span>}
                            {doc.linked_stage && <span>Stage: {doc.linked_stage}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.file && (
                            <a href={getFileProxyUrl(doc.file, true)} target="_blank" rel="noreferrer" className="text-violet-600 hover:text-violet-700">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <span className="text-[10px] text-[var(--text-muted)]">v{doc.version || 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedRecordBundle && !recordDocs.length ? (
                    <div className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-4 text-xs text-[var(--text-muted)]">
                      No documents returned for {selectedRecordBundle.reference_doctype}: {selectedRecordBundle.reference_name}.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Category filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {DOC_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-[var(--brand-orange)] text-white'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {(expiredDocs.length + expiringDocs.length) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />{expiredDocs.length + expiringDocs.length} need attention
            </span>
          )}
          {canUpload && (
            <button onClick={() => setShowUpload(!showUpload)} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity">
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
          )}
        </div>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--text-main)]">Upload Document</h4>
            <button onClick={() => setShowUpload(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Document Name *</label>
              <input
                type="text"
                value={uploadForm.document_name}
                onChange={e => setUploadForm(f => ({ ...f, document_name: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="e.g. Site Survey Report"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">File *</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-orange)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              />
              {uploadFile && <p className="mt-1 text-xs text-[var(--text-muted)]">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Category *</label>
              <select
                value={uploadForm.category}
                onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
              >
                {DOC_CATEGORIES.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Site (optional)</label>
              <input
                type="text"
                value={uploadForm.linked_site}
                onChange={e => setUploadForm(f => ({ ...f, linked_site: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="Site name or ID"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Expiry Date (optional)</label>
              <input
                type="date"
                value={uploadForm.expiry_date}
                onChange={e => setUploadForm(f => ({ ...f, expiry_date: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Remarks</label>
              <input
                type="text"
                value={uploadForm.remarks}
                onChange={e => setUploadForm(f => ({ ...f, remarks: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="Optional notes"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Stage</label>
              <select
                value={uploadForm.linked_stage}
                onChange={e => setUploadForm(f => ({ ...f, linked_stage: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
              >
                <option value="">— Select stage —</option>
                {DOSSIER_STAGE_ORDER.filter(s => s !== 'Unclassified').map(s => <option key={s} value={s}>{DOSSIER_STAGE_LABELS[s] || s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Subcategory</label>
              <input
                type="text"
                value={uploadForm.document_subcategory}
                onChange={e => setUploadForm(f => ({ ...f, document_subcategory: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="e.g. As-Built Drawing"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Reference Type</label>
              <input
                type="text"
                value={uploadForm.reference_doctype}
                onChange={e => setUploadForm(f => ({ ...f, reference_doctype: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="e.g. GE Purchase Order"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Reference Name</label>
              <input
                type="text"
                value={uploadForm.reference_name}
                onChange={e => setUploadForm(f => ({ ...f, reference_name: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="e.g. PO-00042"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_mandatory_upload"
                checked={uploadForm.is_mandatory}
                onChange={e => setUploadForm(f => ({ ...f, is_mandatory: e.target.checked }))}
                className="rounded border-[var(--border-subtle)] text-[var(--brand-orange)] focus:ring-[var(--brand-orange)]"
              />
              <label htmlFor="is_mandatory_upload" className="text-xs text-[var(--text-muted)]">Mandatory document</label>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleUpload} disabled={uploadBusy || !uploadForm.document_name.trim() || !uploadForm.category.trim() || !uploadFile} className="rounded-xl bg-[var(--brand-orange)] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {uploadBusy ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {/* Documents table */}
      {!filtered.length ? (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">
          {activeCategory !== 'All' ? `No ${activeCategory} documents found.` : 'No documents are linked to this project yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Status / Expiry</th>
                <th className="px-4 py-3 font-medium">Uploaded By</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((doc) => {
                const hasVersions = (versionCounts[`${doc.document_name || doc.name}::${doc.linked_site || ''}`] || 0) > 1;
                return (
                  <tr key={doc.name} className="hover:bg-[var(--surface-raised)]/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text-main)]">{doc.document_name || doc.name}</div>
                      {(doc.file_url || doc.file) && (
                        <div className="flex items-center gap-3">
                          {isPreviewableDocument(doc.file_url || doc.file) ? (
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <FileText className="h-3 w-3" />Preview
                            </button>
                          ) : null}
                          <a href={getFileProxyUrl(doc.file_url || doc.file, true)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Download className="h-3 w-3" />{isPreviewableDocument(doc.file_url || doc.file) ? 'Open' : 'Download'}
                          </a>
                        </div>
                      )}
                      {doc.remarks && <div className="mt-0.5 text-[11px] text-[var(--text-muted)] italic">{doc.remarks}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{doc.category || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{doc.linked_site || 'Project-level'}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const versionCount = versionCounts[`${doc.document_name || doc.name}::${doc.linked_site || ''}`] || 1;
                        return (
                          <button
                            onClick={() => openVersions(doc)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${
                              hasVersions
                                ? 'bg-violet-50 text-violet-700 hover:bg-violet-100 cursor-pointer'
                                : 'bg-gray-50 text-gray-600'
                            }`}
                            title={hasVersions ? `${versionCount} versions available` : 'Single version'}
                          >
                            v{doc.version || 1}
                            {hasVersions && (
                              <>
                                <span className="text-[10px] opacity-70">of {versionCount}</span>
                                <ChevronDown className="h-3 w-3" />
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <ExpiryBadge expiryDate={doc.expiry_date} />
                      {!doc.expiry_date && (
                        <span className="text-[10px] text-[var(--text-muted)] italic">Untracked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{doc.uploaded_by || doc.owner || '-'}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{doc.creation ? new Date(doc.creation).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                          (doc.status || '').toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-700'
                          : (doc.status || '').toLowerCase() === 'rejected' ? 'bg-rose-50 text-rose-700'
                          : (doc.status || '').toLowerCase() === 'in review' ? 'bg-purple-50 text-purple-700'
                          : 'bg-blue-50 text-blue-700'
                        }`}>{doc.status || 'Submitted'}</span>
                        {!['approved', 'rejected', 'closed'].includes((doc.status || '').toLowerCase()) && (
                          <>
                            <button onClick={() => handleStatusChange(doc.name, 'In Review')} className="rounded px-1.5 py-0.5 text-[10px] text-purple-600 hover:bg-purple-50" title="Mark In Review">Review</button>
                            <button onClick={() => handleStatusChange(doc.name, 'Approved')} className="rounded px-1.5 py-0.5 text-[10px] text-emerald-600 hover:bg-emerald-50" title="Approve">Approve</button>
                            <button onClick={() => handleStatusChange(doc.name, 'Rejected')} className="rounded px-1.5 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50" title="Reject">Reject</button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc.name)}
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* Version History Drawer */}
      {versionDoc && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setVersionDoc(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-md bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-main)]">Version History</h3>
                <p className="text-xs text-[var(--text-muted)]">{versionDoc.document_name}</p>
              </div>
              <button onClick={() => setVersionDoc(null)} className="rounded-lg p-1 hover:bg-[var(--surface-raised)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(100vh - 80px)' }}>
              {versionsLoading ? (
                <div className="flex items-center justify-center py-12 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading...</div>
              ) : !versions.length ? (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">No version history found.</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v, i) => (
                    <div key={v.name} className={`rounded-xl border p-3 ${i === 0 ? 'border-violet-200 bg-violet-50/50' : 'border-[var(--border-subtle)]'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-semibold ${i === 0 ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-600'}`}>
                          v{v.version}{i === 0 ? ' (latest)' : ''}
                        </span>
                        {(v.file_url || v.file) && (
                          <div className="flex items-center gap-3">
                            {isPreviewableDocument(v.file_url || v.file) ? (
                              <button
                                onClick={() => setPreviewDoc(v)}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                              >
                                <FileText className="h-3 w-3" />Preview
                              </button>
                            ) : null}
                            <a href={getFileProxyUrl(v.file_url || v.file, true)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <Download className="h-3 w-3" />{isPreviewableDocument(v.file_url || v.file) ? 'Open' : 'Download'}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                        <div>Uploaded by: {v.uploaded_by || '-'}</div>
                        <div>{v.uploaded_on ? new Date(v.uploaded_on).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : v.creation ? new Date(v.creation).toLocaleString('en-IN') : '-'}</div>
                        {v.remarks && <div className="italic">{v.remarks}</div>}
                        {v.expiry_date && <div className="flex items-center gap-1"><ExpiryBadge expiryDate={v.expiry_date} /></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {previewDoc && (previewDoc.file_url || previewDoc.file) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-main)]">{previewDoc.document_name || previewDoc.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{previewDoc.category || 'Document'}</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="rounded-lg p-1 hover:bg-[var(--surface-raised)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="relative h-[75vh] bg-[var(--surface-raised)]">
              {getDocumentExtension(previewDoc.file_url || previewDoc.file) === 'pdf' ? (
                <iframe title={previewDoc.document_name || previewDoc.name} src={getFileProxyUrl(previewDoc.file_url || previewDoc.file)} className="h-full w-full" />
              ) : (
                <img
                  src={getFileProxyUrl(previewDoc.file_url || previewDoc.file) || ''}
                  alt={previewDoc.document_name || previewDoc.name}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Activity Tab
   ═══════════════════════════════════════════════════════════ */

const ACTIVITY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'version', label: 'Updates' },
  { key: 'comment', label: 'Comments' },
  { key: 'site_comment', label: 'Sites' },
  { key: 'workflow', label: 'Workflow' },
  { key: 'alert', label: 'Alerts' },
  { key: 'accountability', label: 'Accountability' },
] as const;

class TabErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="py-12 text-center">
          <p className="text-sm text-rose-600 mb-2">Something went wrong rendering this tab.</p>
          <button className="text-sm text-[var(--accent)] hover:underline" onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        const data = await callOps<ActivityEntry[]>('get_project_activity', { project: projectId, limit: 50 });
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

/* ═══════════════════════════════════════════════════════════
   Site Board Tab
   ═══════════════════════════════════════════════════════════ */

const STAGE_COLUMN_COLORS: Record<string, string> = {
  SURVEY: 'border-t-sky-400',
  BOQ_DESIGN: 'border-t-indigo-400',
  COSTING: 'border-t-amber-400',
  PROCUREMENT: 'border-t-orange-400',
  STORES_DISPATCH: 'border-t-lime-500',
  EXECUTION: 'border-t-teal-500',
  BILLING_PAYMENT: 'border-t-emerald-500',
  OM_RMA: 'border-t-violet-400',
  CLOSED: 'border-t-gray-400',
};

function SiteBoardTab({ sites, config }: { sites: SiteRow[]; config: DepartmentConfig; wp: WorkspacePermissions | null }) {
  const visibleStages = config.allowedStages || SPINE_STAGES;

  const columns = useMemo(() => {
    const grouped: Record<string, SiteRow[]> = {};
    for (const stage of visibleStages) grouped[stage] = [];
    for (const site of sites) {
      const stage = site.current_site_stage || 'SURVEY';
      if (grouped[stage]) grouped[stage].push(site);
    }
    return visibleStages.map((stage) => {
      const colSites = grouped[stage] || [];
      return {
        stage,
        label: STAGE_LABELS[stage] || stage.replaceAll('_', ' '),
        sites: colSites,
        blockedCount: colSites.filter((s) => s.site_blocked).length,
      };
    });
  }, [sites, visibleStages]);

  if (!sites.length) {
    return <p className="py-12 text-center text-sm text-[var(--text-muted)]">No sites to display on the board.</p>;
  }

  // Deadline urgency helper
  const deadlineUrgency = (dateStr?: string): 'overdue' | 'soon' | null => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'overdue';
    if (diff <= 7) return 'soon';
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {sites.length} sites grouped by lifecycle stage
          {config.departmentKey !== 'all' ? ` (${config.departmentLabel} lane)` : ''}
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">Read-only board — stage transitions via site workflow</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map(({ stage, label, sites: colSites, blockedCount }) => (
          <div
            key={stage}
            className={`flex w-72 flex-shrink-0 flex-col rounded-xl border border-[var(--border-subtle)] border-t-4 bg-white ${STAGE_COLUMN_COLORS[stage] || 'border-t-gray-300'}`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-main)]">{label}</h4>
              <div className="flex items-center gap-1.5">
                {blockedCount > 0 && (
                  <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                    {blockedCount} blocked
                  </span>
                )}
                <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                  {colSites.length}
                </span>
              </div>
            </div>
            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2 p-2" style={{ minHeight: '5rem' }}>
              {colSites.length === 0 && (
                <p className="py-4 text-center text-[11px] text-[var(--text-muted)]">No sites</p>
              )}
              {colSites.map((site) => {
                const urgency = deadlineUrgency(site.latest_planned_end_date);
                return (
                <div
                  key={site.name}
                  className={`rounded-lg border px-3 py-2.5 text-sm ${
                    site.site_blocked
                      ? 'border-rose-200 bg-rose-50/50'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-raised)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--text-main)] truncate">
                        {site.site_name || site.site_code || site.name}
                      </div>
                      {site.site_code && site.site_name && (
                        <div className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate">{site.site_code}</div>
                      )}
                    </div>
                    {site.site_blocked ? (
                      <span className="flex-shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">Blocked</span>
                    ) : (
                      <span className="flex-shrink-0 text-[10px] font-medium text-emerald-600">{site.status || 'Active'}</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(site.site_progress_pct || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                      {formatPercent(site.site_progress_pct || 0)}
                    </span>
                  </div>
                  {/* Meta row: owner, deadline, milestones */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <span className="text-[var(--text-muted)]" title={site.current_owner_user || undefined}>
                      {(site.current_owner_role || '-').replaceAll('_', ' ')}
                    </span>
                    {(site.milestone_count || 0) > 0 && (
                      <span className="text-[var(--text-muted)]">
                        <Flag className="mr-0.5 inline h-3 w-3" />{site.open_milestone_count || 0}/{site.milestone_count}
                      </span>
                    )}
                    {site.latest_planned_end_date && (
                      <span className={`${
                        urgency === 'overdue' ? 'text-rose-600 font-semibold' :
                        urgency === 'soon' ? 'text-amber-600 font-semibold' :
                        'text-[var(--text-muted)]'
                      }`}>
                        {new Date(site.latest_planned_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        {urgency === 'overdue' && ' ⚠'}
                      </span>
                    )}
                  </div>
                  {/* Blocker reason */}
                  {site.site_blocked && site.blocker_reason && (
                    <p className="mt-1.5 truncate text-[10px] text-rose-500" title={site.blocker_reason}>
                      {site.blocker_reason}
                    </p>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Milestones Tab
   ═══════════════════════════════════════════════════════════ */

type MilestoneRecord = {
  name: string;
  milestone_name?: string;
  status?: string;
  linked_project?: string;
  linked_site?: string;
  planned_date?: string;
  actual_date?: string;
  owner_user?: string;
};

function MilestonesTab({ sites, projectId, config }: { sites: SiteRow[]; projectId: string; config: DepartmentConfig }) {
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [msLoading, setMsLoading] = useState(true);
  const [msError, setMsError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setMsLoading(true);
      try {
        const data = await callOps<MilestoneRecord[]>('get_milestones', { project: projectId });
        if (active) setMilestones(data);
      } catch (err) {
        if (active) setMsError(err instanceof Error ? err.message : 'Failed to load milestones');
      } finally {
        if (active) setMsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId]);

  const visibleStages = config.allowedStages || SPINE_STAGES;

  // Build stage-level milestone rows from real site data
  const stageRows = useMemo(() => {
    return visibleStages.map((stage) => {
      const label = STAGE_LABELS[stage] || stage.replaceAll('_', ' ');
      const stageIdx = SPINE_STAGES.indexOf(stage);

      // Sites currently in this stage
      const inStage = sites.filter((s) => (s.current_site_stage || 'SURVEY') === stage);
      // Sites past this stage (higher index)
      const pastStage = sites.filter((s) => {
        const idx = SPINE_STAGES.indexOf(s.current_site_stage || 'SURVEY');
        return idx > stageIdx;
      });
      const blocked = inStage.filter((s) => s.site_blocked);

      // Find related milestones
      const relatedMs = milestones.filter((m) =>
        (m.milestone_name || '').toUpperCase().includes(stage.replaceAll('_', ' ')) ||
        (m.milestone_name || '').toUpperCase().includes(stage)
      );

      return { stage, label, inStage, pastStage, blocked, relatedMs };
    });
  }, [sites, milestones, visibleStages]);

  const totalSites = sites.length;

  if (msLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading milestones...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Could not load milestone records: {msError}. Showing stage-based overview.
        </div>
      )}

      <p className="text-sm text-[var(--text-muted)]">
        Lifecycle milestone progress across {totalSites} sites
        {config.departmentKey !== 'all' ? ` (${config.departmentLabel} lane)` : ''}
      </p>

      <div className="space-y-3">
        {stageRows.map(({ stage, label, inStage, pastStage, blocked, relatedMs }) => {
          const completedPct = totalSites > 0 ? Math.round((pastStage.length / totalSites) * 100) : 0;
          return (
            <div
              key={stage}
              className="rounded-xl border border-[var(--border-subtle)] bg-white"
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-[var(--text-main)]">{label}</h4>
                    {blocked.length > 0 && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                        {blocked.length} blocked
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 w-40 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${completedPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{completedPct}% passed</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{inStage.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">In Stage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600">{pastStage.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${blocked.length ? 'text-rose-600' : 'text-[var(--text-muted)]'}`}>{blocked.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Blocked</div>
                  </div>
                </div>
              </div>

              {/* Related milestone records */}
              {relatedMs.length > 0 && (
                <div className="border-t border-[var(--border-subtle)] px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    {relatedMs.map((m) => (
                      <div key={m.name} className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface-raised)] px-2.5 py-1 text-xs">
                        <Flag className="h-3 w-3 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-main)]">{m.milestone_name}</span>
                        <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                          m.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                          m.status === 'Overdue' ? 'bg-rose-50 text-rose-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {m.status || 'Open'}
                        </span>
                        {m.planned_date && <span className="text-[var(--text-muted)]">{m.planned_date}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Operations Tab (PM Cockpit)
   ═══════════════════════════════════════════════════════════ */

function OpsTab({ projectId, config }: { projectId: string; config: DepartmentConfig }) {
  const [data, setData] = useState<PMCockpitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const result = await callOps<PMCockpitSummary>('get_pm_cockpit_summary', {
          project: projectId,
          stages: config.allowedStages || [],
        });
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load operations data');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId, config.allowedStages]);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading operations...</div>;
  if (error) return <p className="py-12 text-center text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="py-12 text-center text-sm text-[var(--text-muted)]">No operations data available.</p>;

  const { dpr_summary, commissioning_summary, dependency_summary, document_expiry, milestones_summary, signal_summary, action_items } = data;

  return (
    <div className="space-y-8">
      {/* Action Items Banner */}
      {action_items.length > 0 && (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50/50 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-700">
            <AlertCircle className="h-4 w-4" /> Requires Attention ({action_items.length})
          </h3>
          <div className="space-y-2">
            {action_items.map((item, idx) => (
              <div key={idx} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                item.priority === 'high' ? 'border-rose-200 bg-white' : 'border-amber-200 bg-amber-50/50'
              }`}>
                <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  item.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}>{item.type}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--text-main)]">{item.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-blue-50 px-4 py-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-wider text-blue-600">DPRs This Week</div>
          <div className="mt-1 text-2xl font-bold text-blue-700">{dpr_summary.this_week_count}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-emerald-50 px-4 py-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">Manpower Logged</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{dpr_summary.total_manpower}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-violet-50 px-4 py-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-wider text-violet-600">Test Reports</div>
          <div className="mt-1 text-2xl font-bold text-violet-700">{commissioning_summary.test_reports.length}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-teal-50 px-4 py-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-wider text-teal-600">Signoffs</div>
          <div className="mt-1 text-2xl font-bold text-teal-700">{commissioning_summary.signoffs.length}</div>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-center ${
          document_expiry.expired_count > 0 ? 'border-rose-200 bg-rose-50' : 'border-[var(--border-subtle)] bg-amber-50'
        }`}>
          <div className={`text-[11px] font-medium uppercase tracking-wider ${document_expiry.expired_count > 0 ? 'text-rose-600' : 'text-amber-600'}`}>Docs Expiring</div>
          <div className={`mt-1 text-2xl font-bold ${document_expiry.expired_count > 0 ? 'text-rose-700' : 'text-amber-700'}`}>
            {document_expiry.expiring_count + document_expiry.expired_count}
          </div>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-center ${
          dependency_summary.hard_blocked > 0 ? 'border-rose-200 bg-rose-50' : 'border-[var(--border-subtle)] bg-gray-50'
        }`}>
          <div className={`text-[11px] font-medium uppercase tracking-wider ${dependency_summary.hard_blocked > 0 ? 'text-rose-600' : 'text-gray-600'}`}>Hard Blocks</div>
          <div className={`mt-1 text-2xl font-bold ${dependency_summary.hard_blocked > 0 ? 'text-rose-700' : 'text-gray-700'}`}>
            {dependency_summary.hard_blocked}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* DPR Section */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[var(--text-muted)]" />
              <h4 className="font-semibold text-[var(--text-main)]">Daily Progress Reports</h4>
            </div>
            <Link href={`/execution?project=${encodeURIComponent(projectId)}`} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-strong)] hover:underline">
              View All <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="card-body">
            {dpr_summary.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">No DPRs recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {dpr_summary.recent.slice(0, 5).map((dpr) => (
                  <div key={dpr.name} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[var(--text-main)]">{dpr.linked_site || 'Project-level'}</div>
                      <div className="text-xs text-[var(--text-muted)]">{dpr.report_date || '-'}</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {dpr.manpower_on_site && <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">{dpr.manpower_on_site} staff</span>}
                      {dpr.equipment_count && <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">{dpr.equipment_count} equip</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-4 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)]">
              <span>Total: {dpr_summary.total_count} DPRs</span>
              <span>Manpower: {dpr_summary.total_manpower}</span>
            </div>
          </div>
        </div>

        {/* Commissioning Section */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[var(--text-muted)]" />
              <h4 className="font-semibold text-[var(--text-main)]">Commissioning & Handover</h4>
            </div>
            <Link href={`/execution/commissioning?project=${encodeURIComponent(projectId)}`} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-strong)] hover:underline">
              View All <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="card-body space-y-4">
            {/* Checklists */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">Checklists</span>
                <div className="flex gap-2">
                  {Object.entries(commissioning_summary.checklist_by_status).map(([status, count]) => (
                    <span key={status} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                      status === 'In Progress' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{status}: {count}</span>
                  ))}
                </div>
              </div>
              {commissioning_summary.checklists.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No checklists yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {commissioning_summary.checklists.slice(0, 4).map((c) => (
                    <span key={c.name} className={`rounded-lg border px-2 py-1 text-xs ${
                      c.status === 'Completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      'border-[var(--border-subtle)] bg-white text-[var(--text-main)]'
                    }`}>
                      {c.checklist_name || c.linked_site || c.name}
                    </span>
                  ))}
                  {commissioning_summary.checklists.length > 4 && (
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-[var(--text-muted)]">+{commissioning_summary.checklists.length - 4} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Test Reports */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">Test Reports</span>
                <div className="flex gap-2">
                  {Object.entries(commissioning_summary.test_by_status).map(([status, count]) => (
                    <span key={status} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      status === 'Passed' ? 'bg-emerald-50 text-emerald-700' :
                      status === 'Failed' ? 'bg-rose-50 text-rose-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{status}: {count}</span>
                  ))}
                </div>
              </div>
              {commissioning_summary.test_reports.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No test reports yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {commissioning_summary.test_reports.slice(0, 4).map((t) => (
                    <span key={t.name} className={`rounded-lg border px-2 py-1 text-xs ${
                      t.status === 'Passed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      t.status === 'Failed' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                      'border-[var(--border-subtle)] bg-white text-[var(--text-main)]'
                    }`}>
                      {t.report_name || t.test_type || t.name}
                    </span>
                  ))}
                  {commissioning_summary.test_reports.length > 4 && (
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-[var(--text-muted)]">+{commissioning_summary.test_reports.length - 4} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Signoffs */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">Client Signoffs</span>
                <div className="flex gap-2">
                  {Object.entries(commissioning_summary.signoff_by_status).map(([status, count]) => (
                    <span key={status} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      status === 'Signed' ? 'bg-emerald-50 text-emerald-700' :
                      status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{status}: {count}</span>
                  ))}
                </div>
              </div>
              {commissioning_summary.signoffs.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No signoffs yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {commissioning_summary.signoffs.slice(0, 4).map((s) => (
                    <span key={s.name} className={`rounded-lg border px-2 py-1 text-xs ${
                      s.status === 'Signed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      'border-[var(--border-subtle)] bg-white text-[var(--text-main)]'
                    }`}>
                      {s.signoff_type || s.linked_site || s.name}
                    </span>
                  ))}
                  {commissioning_summary.signoffs.length > 4 && (
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-[var(--text-muted)]">+{commissioning_summary.signoffs.length - 4} more</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Expiry + Dependencies Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Document Expiry */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-[var(--text-main)]">Document Expiry</h4>
          </div>
          <div className="card-body">
            {document_expiry.expired.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 text-xs font-medium text-rose-600">Expired ({document_expiry.expired_count})</div>
                <div className="space-y-1.5">
                  {document_expiry.expired.slice(0, 3).map((doc) => (
                    <div key={doc.name} className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-1.5 text-xs">
                      <span className="font-medium text-rose-700">{doc.document_name || doc.name}</span>
                      <span className="text-rose-500">{doc.expiry_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {document_expiry.expiring_soon.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-medium text-amber-600">Expiring Soon ({document_expiry.expiring_count})</div>
                <div className="space-y-1.5">
                  {document_expiry.expiring_soon.slice(0, 3).map((doc) => (
                    <div key={doc.name} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-xs">
                      <span className="font-medium text-amber-700">{doc.document_name || doc.name}</span>
                      <span className="text-amber-500">{doc.expiry_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {document_expiry.expired.length === 0 && document_expiry.expiring_soon.length === 0 && (
              <p className="py-4 text-center text-sm text-emerald-600">
                <CheckCircle2 className="mr-1 inline h-4 w-4" /> All documents current
              </p>
            )}
          </div>
        </div>

        {/* Dependencies & Blocks */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <h4 className="font-semibold text-[var(--text-main)]">Dependencies & Blocks</h4>
            </div>
            <Link href={`/execution/dependencies?project=${encodeURIComponent(projectId)}`} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-strong)] hover:underline">
              Manage <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="card-body">
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] py-2">
                <div className="text-lg font-bold text-[var(--text-main)]">{dependency_summary.blocked_sites}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Total Blocked</div>
              </div>
              <div className={`rounded-lg border py-2 ${dependency_summary.hard_blocked > 0 ? 'border-rose-200 bg-rose-50' : 'border-[var(--border-subtle)] bg-[var(--surface-raised)]'}`}>
                <div className={`text-lg font-bold ${dependency_summary.hard_blocked > 0 ? 'text-rose-700' : 'text-[var(--text-main)]'}`}>{dependency_summary.hard_blocked}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Hard Blocked</div>
              </div>
              <div className={`rounded-lg border py-2 ${dependency_summary.soft_blocked > 0 ? 'border-amber-200 bg-amber-50' : 'border-[var(--border-subtle)] bg-[var(--surface-raised)]'}`}>
                <div className={`text-lg font-bold ${dependency_summary.soft_blocked > 0 ? 'text-amber-700' : 'text-[var(--text-main)]'}`}>{dependency_summary.soft_blocked}</div>
                <div className="text-[10px] text-[var(--text-muted)]">Soft Blocked</div>
              </div>
            </div>
            {dependency_summary.blocked_details.length > 0 && (
              <div className="space-y-1.5">
                {dependency_summary.blocked_details.slice(0, 4).map((site) => (
                  <div key={site.name} className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-rose-700">{site.name}</span>
                      {site.blocker_reason && <p className="mt-0.5 text-rose-600">{site.blocker_reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {dependency_summary.pending_overrides.length > 0 && (
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                <div className="mb-2 text-xs font-medium text-amber-600">Pending Override Requests ({dependency_summary.pending_overrides.length})</div>
                {dependency_summary.pending_overrides.slice(0, 2).map((o) => (
                  <div key={o.name} className="text-xs text-[var(--text-muted)]">• {o.name} - requested by {o.requested_by}</div>
                ))}
              </div>
            )}
            {dependency_summary.blocked_sites === 0 && (
              <p className="py-4 text-center text-sm text-emerald-600">
                <CheckCircle2 className="mr-1 inline h-4 w-4" /> No blocking issues
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <h4 className="font-semibold text-[var(--text-main)]">Signals & Follow-ups</h4>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {signal_summary.unread_alerts_count} unread alerts • {signal_summary.due_reminders_count} due reminders
            </div>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">Recent Alerts</div>
              {signal_summary.recent_alerts.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No project alerts right now.</p>
              ) : (
                <div className="space-y-2">
                  {signal_summary.recent_alerts.slice(0, 4).map((alert) => (
                    <div
                      key={alert.name}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        alert.is_read ? 'border-[var(--border-subtle)] bg-white' : 'border-blue-200 bg-blue-50/50'
                      }`}
                    >
                      <div className="font-medium text-[var(--text-main)]">{alert.summary || alert.event_type || 'Alert'}</div>
                      <div className="mt-0.5 text-[var(--text-muted)]">
                        {alert.linked_site || alert.linked_stage || 'Project-wide'}
                        {alert.creation
                          ? ` • ${new Date(alert.creation).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">Active Reminders</div>
              {signal_summary.reminders.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No project reminders right now.</p>
              ) : (
                <div className="space-y-2">
                  {signal_summary.reminders.slice(0, 4).map((reminder) => (
                    <div key={reminder.name} className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs">
                      <div className="font-medium text-[var(--text-main)]">{reminder.title || 'Reminder'}</div>
                      <div className="mt-0.5 text-[var(--text-muted)]">
                        {(reminder.next_reminder_at || reminder.reminder_datetime)
                          ? new Date(reminder.next_reminder_at || reminder.reminder_datetime || '').toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : 'No due date'}
                        {reminder.linked_site ? ` • ${reminder.linked_site}` : reminder.linked_stage ? ` • ${reminder.linked_stage}` : ' • Project-wide'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center gap-2">
            <History className="h-4 w-4 text-violet-500" />
            <h4 className="font-semibold text-[var(--text-main)]">Activity & Collaboration</h4>
          </div>
          <div className="card-body">
            <p className="text-sm text-[var(--text-muted)]">
              Project discussion, workflow comments, mentions, and site-level change history continue in the activity tab so the cockpit stays focused on live operational signals.
            </p>
          </div>
        </div>
      </div>

      {/* Overdue Milestones */}
      {milestones_summary.overdue_count > 0 && (
        <div className="card border-amber-200">
          <div className="card-header flex items-center gap-2 bg-amber-50">
            <Flag className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-amber-700">Overdue Milestones ({milestones_summary.overdue_count})</h4>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {milestones_summary.overdue.slice(0, 6).map((m) => (
                <div key={m.name} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs">
                  <span className="font-medium text-amber-700">{m.milestone_name || m.name}</span>
                  <span className="text-amber-500">Due: {m.planned_date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Tasks Tab (RISE-ported: list + kanban toggle)
   ═══════════════════════════════════════════════════════════ */

type ProjectTask = {
  name: string;
  linked_project: string;
  linked_site?: string;
  title: string;
  status: string;
  priority: string;
  assigned_to?: string;
  collaborators?: string;
  start_date?: string;
  deadline?: string;
  description?: string;
  parent_task?: string;
  milestone_id?: string;
  points?: number;
  labels?: string;
  sort_order?: number;
  owner?: string;
  creation?: string;
  modified?: string;
};

type TaskSummary = {
  'To Do': { count: number; points: number };
  'In Progress': { count: number; points: number };
  'Review': { count: number; points: number };
  'Done': { count: number; points: number };
  total: number;
  total_points: number;
};

const TASK_STATUSES = ['To Do', 'In Progress', 'Review', 'Done'] as const;
const TASK_STATUS_COLORS: Record<string, string> = {
  'To Do': 'bg-gray-100 text-gray-700 border-gray-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Review': 'bg-amber-50 text-amber-700 border-amber-200',
  'Done': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const TASK_PRIORITY_COLORS: Record<string, string> = {
  Low: 'text-gray-400',
  Normal: 'text-blue-500',
  High: 'text-amber-500',
  Urgent: 'text-rose-500',
};

function TasksTab({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formTitle, setFormTitle] = useState('');
  const [formStatus, setFormStatus] = useState('To Do');
  const [formPriority, setFormPriority] = useState('Normal');
  const [formAssigned, setFormAssigned] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPoints, setFormPoints] = useState('0');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        callOps<ProjectTask[]>('get_project_tasks', { project: projectId }),
        callOps<TaskSummary>('get_task_summary', { project: projectId }),
      ]);
      setTasks(Array.isArray(t) ? t : []);
      setSummary(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setFormTitle(''); setFormStatus('To Do'); setFormPriority('Normal');
    setFormAssigned(''); setFormDeadline(''); setFormDescription(''); setFormPoints('0');
    setShowCreate(false); setEditingTask(null);
  };

  const openEdit = (t: ProjectTask) => {
    setEditingTask(t); setFormTitle(t.title); setFormStatus(t.status);
    setFormPriority(t.priority); setFormAssigned(t.assigned_to || '');
    setFormDeadline(t.deadline || ''); setFormDescription(t.description || '');
    setFormPoints(String(t.points || 0)); setShowCreate(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: formTitle, status: formStatus, priority: formPriority,
        assigned_to: formAssigned || undefined, deadline: formDeadline || undefined,
        description: formDescription || undefined, points: parseInt(formPoints) || 0,
      };
      if (editingTask) {
        await callOps('update_project_task', { name: editingTask.name, data: payload });
      } else {
        payload.linked_project = projectId;
        await callOps('create_project_task', { data: payload });
      }
      resetForm(); void load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save task'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (name: string) => {
    try { await callOps('delete_project_task', { name }); void load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete task'); }
  };

  const handleStatusChange = async (name: string, status: string) => {
    try { await callOps('update_task_status', { name, status }); void load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update status'); }
  };

  const filtered = statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading tasks...</div>;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-center">
            <div className="text-lg font-bold text-[var(--text-main)]">{summary.total}</div>
            <div className="text-[11px] text-[var(--text-muted)]">Total</div>
          </div>
          {TASK_STATUSES.map((s) => (
            <div key={s} className="rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-center">
              <div className="text-lg font-bold text-[var(--text-main)]">{summary[s].count}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{s}</div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {['all', ...TASK_STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-gray-200'}`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'list' ? 'kanban' : 'list')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--surface-raised)]">
            {view === 'list' ? <><Columns3 className="h-3.5 w-3.5" /> Kanban</> : <><ListFilter className="h-3.5 w-3.5" /> List</>}
          </button>
          <button onClick={() => { resetForm(); setShowCreate(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New Task
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}

      {/* Create / Edit form */}
      {showCreate && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-[var(--text-main)]">{editingTask ? 'Edit Task' : 'New Task'}</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Title *</label>
              <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Task title..." className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm">
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Priority</label>
              <select value={formPriority} onChange={(e) => setFormPriority(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm">
                {['Low', 'Normal', 'High', 'Urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Assigned To</label>
              <input type="text" value={formAssigned} onChange={(e) => setFormAssigned(e.target.value)} placeholder="user@example.com" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Deadline</label>
              <input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Points</label>
              <input type="number" min="0" value={formPoints} onChange={(e) => setFormPoints(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Description</label>
              <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} placeholder="Details..." className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <button onClick={handleSave} disabled={!formTitle.trim() || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {editingTask ? 'Update' : 'Save'}
              </button>
              <button onClick={resetForm} className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {filtered.length === 0 && !showCreate && (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--text-muted)] opacity-40" />
              <p className="mt-3 text-sm text-[var(--text-muted)]">No tasks yet. Create your first task to get started.</p>
            </div>
          )}
          {filtered.map((task) => (
            <div key={task.name} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3 shadow-sm">
              <button onClick={() => handleStatusChange(task.name, task.status === 'Done' ? 'To Do' : 'Done')}
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${task.status === 'Done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'}`}>
                {task.status === 'Done' && <CheckCircle2 className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${task.status === 'Done' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)]'}`}>{task.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TASK_STATUS_COLORS[task.status] || ''}`}>{task.status}</span>
                  {task.priority !== 'Normal' && <span className={`text-[10px] font-semibold ${TASK_PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>}
                  {(task.points ?? 0) > 0 && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">{task.points}pt</span>}
                </div>
                <div className="mt-1 flex gap-3 text-[10px] text-[var(--text-muted)]">
                  {task.assigned_to && <span>{task.assigned_to}</span>}
                  {task.deadline && <span>Due: {task.deadline}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(task)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-main)]"><Edit3 className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDelete(task.name)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {TASK_STATUSES.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            return (
              <div key={col} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[var(--text-main)]">{col}</h4>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <div key={task.name} className="rounded-lg border border-[var(--border-subtle)] bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-[var(--text-main)]">{task.title}</span>
                        <div className="flex gap-0.5">
                          <button onClick={() => openEdit(task)} className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)]"><Edit3 className="h-3 w-3" /></button>
                        </div>
                      </div>
                      {task.priority !== 'Normal' && <span className={`mt-1 inline-block text-[10px] font-semibold ${TASK_PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {TASK_STATUSES.filter((s) => s !== col).map((s) => (
                          <button key={s} onClick={() => handleStatusChange(task.name, s)}
                            className="rounded px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]">{s}</button>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2 text-[10px] text-[var(--text-muted)]">
                        {task.assigned_to && <span><Users className="mr-0.5 inline h-2.5 w-2.5" />{task.assigned_to.split('@')[0]}</span>}
                        {task.deadline && <span>{task.deadline}</span>}
                        {(task.points ?? 0) > 0 && <span className="text-violet-500">{task.points}pt</span>}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && <p className="py-4 text-center text-[10px] text-[var(--text-muted)]">No tasks</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Timesheets Tab (RISE-ported: aggregation shell)
   ═══════════════════════════════════════════════════════════ */

type TimesheetSummary = {
  dpr_count: number;
  dpr_rows: Array<{ name: string; linked_site?: string; report_date?: string; summary?: string; manpower_on_site?: number; equipment_count?: number; owner?: string }>;
  manpower_total_persons: number;
  manpower_rows: Array<{ name: string; linked_site?: string; log_date?: string; num_persons?: number; trade?: string; remarks?: string; owner?: string }>;
  overtime_total_hours: number;
  overtime_rows: Array<{ name: string; linked_site?: string; entry_date?: string; hours?: number; employee_name?: string; reason?: string; status?: string; owner?: string }>;
};

function TimesheetsTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<TimesheetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [section, setSection] = useState<'dpr' | 'manpower' | 'overtime'>('dpr');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await callOps<TimesheetSummary>('get_project_timesheet_summary', { project: projectId });
      setData(d);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load timesheet data'); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading timesheets...</div>;
  if (error) return <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button onClick={() => setSection('dpr')} className={`rounded-xl border px-4 py-3 text-left transition-colors ${section === 'dpr' ? 'border-[var(--accent)] bg-blue-50' : 'border-[var(--border-subtle)] bg-white'}`}>
          <div className="text-lg font-bold text-[var(--text-main)]">{data.dpr_count}</div>
          <div className="text-xs text-[var(--text-muted)]">DPR Reports</div>
        </button>
        <button onClick={() => setSection('manpower')} className={`rounded-xl border px-4 py-3 text-left transition-colors ${section === 'manpower' ? 'border-[var(--accent)] bg-blue-50' : 'border-[var(--border-subtle)] bg-white'}`}>
          <div className="text-lg font-bold text-[var(--text-main)]">{data.manpower_total_persons}</div>
          <div className="text-xs text-[var(--text-muted)]">Total Manpower Logged</div>
        </button>
        <button onClick={() => setSection('overtime')} className={`rounded-xl border px-4 py-3 text-left transition-colors ${section === 'overtime' ? 'border-[var(--accent)] bg-blue-50' : 'border-[var(--border-subtle)] bg-white'}`}>
          <div className="text-lg font-bold text-[var(--text-main)]">{data.overtime_total_hours.toFixed(1)}h</div>
          <div className="text-xs text-[var(--text-muted)]">Overtime Hours</div>
        </button>
      </div>

      {/* DPR section */}
      {section === 'dpr' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white shadow-sm">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h4 className="text-sm font-semibold text-[var(--text-main)]">Daily Progress Reports</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase text-[var(--text-muted)]"><th className="px-4 py-2">Date</th><th className="px-4 py-2">Site</th><th className="px-4 py-2">Summary</th><th className="px-4 py-2">Manpower</th><th className="px-4 py-2">Equipment</th></tr></thead>
              <tbody>
                {data.dpr_rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">No DPR entries yet.</td></tr>
                ) : data.dpr_rows.map((r) => (
                  <tr key={r.name} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-4 py-2 font-medium">{r.report_date || '—'}</td>
                    <td className="px-4 py-2">{r.linked_site || '—'}</td>
                    <td className="max-w-xs truncate px-4 py-2">{r.summary || '—'}</td>
                    <td className="px-4 py-2">{r.manpower_on_site ?? 0}</td>
                    <td className="px-4 py-2">{r.equipment_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manpower section */}
      {section === 'manpower' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white shadow-sm">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h4 className="text-sm font-semibold text-[var(--text-main)]">Manpower Logs</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase text-[var(--text-muted)]"><th className="px-4 py-2">Date</th><th className="px-4 py-2">Site</th><th className="px-4 py-2">Trade</th><th className="px-4 py-2">Persons</th><th className="px-4 py-2">Remarks</th></tr></thead>
              <tbody>
                {data.manpower_rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">No manpower logs yet.</td></tr>
                ) : data.manpower_rows.map((r) => (
                  <tr key={r.name} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-4 py-2 font-medium">{r.log_date || '—'}</td>
                    <td className="px-4 py-2">{r.linked_site || '—'}</td>
                    <td className="px-4 py-2">{r.trade || '—'}</td>
                    <td className="px-4 py-2">{r.num_persons ?? 0}</td>
                    <td className="max-w-xs truncate px-4 py-2">{r.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overtime section */}
      {section === 'overtime' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white shadow-sm">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h4 className="text-sm font-semibold text-[var(--text-main)]">Overtime Entries</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase text-[var(--text-muted)]"><th className="px-4 py-2">Date</th><th className="px-4 py-2">Employee</th><th className="px-4 py-2">Hours</th><th className="px-4 py-2">Reason</th><th className="px-4 py-2">Status</th></tr></thead>
              <tbody>
                {data.overtime_rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">No overtime entries yet.</td></tr>
                ) : data.overtime_rows.map((r) => (
                  <tr key={r.name} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-4 py-2 font-medium">{r.entry_date || '—'}</td>
                    <td className="px-4 py-2">{r.employee_name || '—'}</td>
                    <td className="px-4 py-2">{r.hours ?? 0}h</td>
                    <td className="max-w-xs truncate px-4 py-2">{r.reason || '—'}</td>
                    <td className="px-4 py-2">{r.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Notes Tab (RISE-style private notes)
   ═══════════════════════════════════════════════════════════ */

type ProjectNote = {
  name: string;
  linked_project: string;
  title: string;
  content?: string;
  is_private?: number;
  owner?: string;
  creation?: string;
  modified?: string;
};

function NotesTab({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPrivate, setFormPrivate] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callOps<ProjectNote[]>('get_project_notes', { project: projectId });
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void loadNotes(); }, [loadNotes]);

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormPrivate(true);
    setShowCreate(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await callOps('update_project_note', { name: editingId, data: { title: formTitle, content: formContent, is_private: formPrivate ? 1 : 0 } });
      } else {
        await callOps('create_project_note', { data: { linked_project: projectId, title: formTitle, content: formContent, is_private: formPrivate ? 1 : 0 } });
      }
      resetForm();
      void loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (note: ProjectNote) => {
    setEditingId(note.name);
    setFormTitle(note.title);
    setFormContent(note.content || '');
    setFormPrivate(!!note.is_private);
    setShowCreate(true);
  };

  const handleDelete = async (name: string) => {
    try {
      await callOps('delete_project_note', { name });
      void loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading notes...</div>;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-main)]">Project Notes</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Private notes are only visible to their creator</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New Note
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}

      {/* Create / Edit form */}
      {showCreate && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-[var(--text-main)]">{editingId ? 'Edit Note' : 'New Note'}</h4>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Title *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Content</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Write your note here..."
                rows={5}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <input type="checkbox" checked={formPrivate} onChange={(e) => setFormPrivate(e.target.checked)} className="rounded" />
              {formPrivate ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              Private (only visible to you)
            </label>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!formTitle.trim() || saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {editingId ? 'Update' : 'Save'}
              </button>
              <button onClick={resetForm} className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !showCreate && (
        <div className="py-12 text-center">
          <StickyNote className="mx-auto h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">No notes yet. Create your first note to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.name} className="rounded-xl border border-[var(--border-subtle)] bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--text-main)]">{note.title}</h4>
                  {note.is_private ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                      <EyeOff className="h-2.5 w-2.5" /> Private
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                      <Eye className="h-2.5 w-2.5" /> Shared
                    </span>
                  )}
                </div>
                {note.content && (
                  <div className="mt-2 text-sm text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">{note.content}</div>
                )}
                <div className="mt-2 flex gap-4 text-[11px] text-[var(--text-muted)]">
                  <span>{note.owner}</span>
                  <span>{note.modified ? new Date(note.modified).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(note)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-main)]" title="Edit">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(note.name)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Dossier Tab (embedded project dossier)
   ═══════════════════════════════════════════════════════════ */

type DossierDocument = {
  name: string;
  document_name: string;
  linked_stage?: string;
  linked_site?: string;
  category?: string;
  document_subcategory?: string;
  reference_doctype?: string;
  reference_name?: string;
  file?: string;
  version?: number;
  status?: string;
  is_mandatory?: 0 | 1;
  uploaded_by?: string;
  uploaded_on?: string;
  reviewed_by?: string;
  approved_by?: string;
  valid_from?: string;
  valid_till?: string;
  expiry_date?: string;
  supersedes_document?: string;
  creation?: string;
};

type DossierData = {
  project: string;
  stages: Record<string, DossierDocument[]>;
  total_documents: number;
};

type DossierCompletenessResult = {
  requirements: {
    requirement: string;
    stage: string;
    category: string;
    subcategory?: string;
    mandatory: boolean;
    satisfied: boolean;
  }[];
  all_mandatory_satisfied: boolean;
  total: number;
  satisfied_count: number;
  missing_mandatory_count: number;
};

const DOSSIER_STAGE_ORDER = [
  'Survey', 'BOM_BOQ', 'Drawing', 'Indent', 'Quotation_Vendor_Comparison',
  'PO', 'Dispatch', 'GRN_Inventory', 'Execution', 'Commissioning',
  'O_M', 'SLA', 'RMA', 'Commercial', 'Closure', 'Unclassified',
];

const DOSSIER_STAGE_LABELS: Record<string, string> = {
  Survey: 'Survey', BOM_BOQ: 'BOM / BOQ', Drawing: 'Drawings', Indent: 'Indent',
  Quotation_Vendor_Comparison: 'Quotation / Vendor Comparison', PO: 'Purchase Order',
  Dispatch: 'Dispatch', GRN_Inventory: 'GRN / Inventory', Execution: 'Execution / I&C',
  Commissioning: 'Commissioning', O_M: 'O&M', SLA: 'SLA', RMA: 'RMA',
  Commercial: 'Commercial', Closure: 'Closure', Unclassified: 'Unclassified',
};

function DossierStatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  const tone = s === 'approved' ? 'bg-emerald-100 text-emerald-700'
    : s === 'rejected' ? 'bg-rose-100 text-rose-700'
    : s === 'blocked' ? 'bg-amber-100 text-amber-700'
    : s === 'in review' ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700';
  return <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{status || 'Draft'}</span>;
}

function DossierStageSection({ stage, docs, completeness, projectId, onUploaded }: { stage: string; docs: DossierDocument[]; completeness: DossierCompletenessResult | null; projectId: string; onUploaded: () => void }) {
  const [open, setOpen] = useState(true);
  const [uploadTarget, setUploadTarget] = useState<{ category: string; subcategory: string } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const label = DOSSIER_STAGE_LABELS[stage] || stage;
  const mandatoryCount = completeness?.total || 0;
  const satisfiedCount = completeness?.satisfied_count || 0;
  const missingCount = completeness?.missing_mandatory_count || 0;

  const handleDossierUpload = async () => {
    if (!uploadFile || !uploadTarget || !uploadName.trim()) return;
    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_name', uploadName.trim());
      formData.append('linked_project', projectId);
      formData.append('category', uploadTarget.category);
      formData.append('linked_stage', stage);
      if (uploadTarget.subcategory) formData.append('document_subcategory', uploadTarget.subcategory);
      formData.append('is_mandatory', '1');
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const payload = await res.json();
      if (!res.ok || payload.success === false) return;
      setUploadTarget(null);
      setUploadFile(null);
      setUploadName('');
      onUploaded();
    } finally {
      setUploadBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-white">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3 text-left">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" /> : <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />}
          <h3 className="text-sm font-semibold text-[var(--text-main)]">{label}</h3>
          <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
            {docs.length} doc{docs.length !== 1 ? 's' : ''}
          </span>
        </div>
        {mandatoryCount > 0 && (
          <div className="flex items-center gap-2 text-[10px]">
            {missingCount > 0 ? (
              <span className="flex items-center gap-1 text-rose-600"><AlertCircle className="h-3 w-3" />{missingCount} missing</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" />{satisfiedCount}/{mandatoryCount} complete</span>
            )}
          </div>
        )}
      </button>
      {open && (
        <div className="border-t border-[var(--border-subtle)] px-5 py-3">
          {docs.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">No documents for this stage</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.name} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-main)] truncate">{doc.document_name}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-[var(--text-muted)]">{doc.category}</span>
                        {doc.document_subcategory && <span className="text-[10px] text-[var(--text-muted)]">/ {doc.document_subcategory}</span>}
                        {doc.reference_doctype && <span className="text-[10px] text-purple-500">{doc.reference_doctype}: {doc.reference_name}</span>}
                        {doc.is_mandatory ? <span className="text-[10px] text-rose-500 font-medium">Mandatory</span> : null}
                        {doc.expiry_date && (
                          <ExpiryBadge expiryDate={doc.expiry_date} />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <DossierStatusBadge status={doc.status} />
                    <span className="text-[10px] text-[var(--text-muted)]">v{doc.version || 1}</span>
                    {doc.file && (
                      <a href={doc.file} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {completeness && completeness.requirements.filter(r => r.mandatory && !r.satisfied).length > 0 && (
            <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3">
              <p className="text-[10px] font-semibold text-rose-700 mb-1.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Missing Mandatory Documents
              </p>
              <div className="space-y-1">
                {completeness.requirements.filter(r => r.mandatory && !r.satisfied).map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <p className="text-[10px] text-rose-600">
                      {r.category}{r.subcategory ? ` / ${r.subcategory}` : ''}
                    </p>
                    <button
                      onClick={() => { setUploadTarget({ category: r.category, subcategory: r.subcategory || '' }); setUploadName(`${r.category}${r.subcategory ? ' - ' + r.subcategory : ''}`); }}
                      className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-rose-700"
                    >
                      <Upload className="h-2.5 w-2.5" /> Upload Now
                    </button>
                  </div>
                ))}
              </div>
              {uploadTarget && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-white p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-[var(--text-main)]">Upload: {uploadTarget.category}{uploadTarget.subcategory ? ` / ${uploadTarget.subcategory}` : ''}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input type="text" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Document name" className="rounded-lg border border-[var(--border-subtle)] bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]" />
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="rounded-lg border border-[var(--border-subtle)] bg-white px-2 py-1 text-xs file:mr-2 file:rounded file:border-0 file:bg-[var(--brand-orange)] file:px-2 file:py-0.5 file:text-[10px] file:font-medium file:text-white" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setUploadTarget(null)} className="rounded px-2 py-1 text-[10px] text-[var(--text-muted)] hover:bg-gray-100">Cancel</button>
                    <button onClick={handleDossierUpload} disabled={uploadBusy || !uploadFile || !uploadName.trim()} className="rounded bg-[var(--brand-orange)] px-3 py-1 text-[10px] font-medium text-white hover:opacity-90 disabled:opacity-50">
                      {uploadBusy ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DossierTab({ projectId }: { projectId: string }) {
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [completenessMap, setCompletenessMap] = useState<Record<string, DossierCompletenessResult>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    callOps<DossierData>('get_project_dossier', { project: projectId })
      .then((data) => setDossier(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dossier'))
      .finally(() => setLoading(false));
  }, [projectId, refreshKey]);

  useEffect(() => {
    if (!dossier) return;
    const stages = DOSSIER_STAGE_ORDER.filter((s) => s !== 'Unclassified');
    for (const stage of stages) {
      callOps<DossierCompletenessResult>('check_stage_document_completeness', { project: projectId, stage })
        .then((data) => setCompletenessMap((prev) => ({ ...prev, [stage]: data })))
        .catch(() => {});
    }
  }, [dossier, projectId]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" /></div>;
  }
  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  }

  const sortedStages = DOSSIER_STAGE_ORDER.filter((stage) => {
    if (stage === 'Unclassified') return Boolean(dossier?.stages[stage]?.length);
    const docsCount = dossier?.stages[stage]?.length || 0;
    const completeness = completenessMap[stage];
    return docsCount > 0 || Boolean(completeness?.total) || Boolean(completeness?.missing_mandatory_count);
  });

  const totalDocs = dossier?.total_documents || 0;
  const totalMissing = Object.values(completenessMap).reduce((sum, c) => sum + c.missing_mandatory_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--accent-strong)]" />
            Project Dossier
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Stage-wise document completeness and controlled document inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs text-[var(--text-muted)]">
            {totalDocs} document{totalDocs !== 1 ? 's' : ''}
          </div>
          {totalMissing > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />{totalMissing} mandatory missing
            </div>
          )}
        </div>
      </div>
      {sortedStages.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-[var(--text-muted)] opacity-40" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedStages.map((stage) => (
            <DossierStageSection key={stage} stage={stage} docs={dossier?.stages[stage] || []} completeness={completenessMap[stage] || null} projectId={projectId} onUploaded={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Accountability Tab (embedded accountability dashboard)
   ═══════════════════════════════════════════════════════════ */

function AccountabilityTab({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <Scale className="h-5 w-5 text-[var(--accent-strong)]" />
          Accountability &amp; RCA
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Full audit trail, blocked items, escalations, and rejection history</p>
      </div>
      <AccountabilityDashboard project={projectId} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Approvals Tab (PH Approval Queue)
   ═══════════════════════════════════════════════════════════ */

type PHApprovalItem = {
  name: string;
  source_type?: string;
  source_name?: string;
  project?: string;
  status?: string;
  submitted_by?: string;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  remarks?: string;
  amount?: number;
  description?: string;
  creation?: string;
  modified?: string;
};

function ApprovalsTab({ projectId }: { projectId: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'po' | 'rma_po' | 'petty_cash'>('po');
  const [items, setItems] = useState<PHApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callOps<PHApprovalItem[]>('get_ph_approval_items', {
        tab: activeSubTab === 'po' ? 'PO' : activeSubTab === 'rma_po' ? 'RMA PO' : 'Petty Cash',
        project: projectId,
      });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval items');
    } finally {
      setLoading(false);
    }
  }, [activeSubTab, projectId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleApprove = async (name: string) => {
    setActionBusy(name);
    try {
      await callOps('ph_approve_item', { name });
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
    setActionBusy('');
  };

  const handleReject = async (name: string) => {
    setActionBusy(name);
    try {
      await callOps('ph_reject_item', { name });
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection failed');
    }
    setActionBusy('');
  };

  const subTabs: { key: typeof activeSubTab; label: string }[] = [
    { key: 'po', label: 'Purchase Orders' },
    { key: 'rma_po', label: 'RMA POs' },
    { key: 'petty_cash', label: 'Petty Cash' },
  ];

  const pendingItems = items.filter((i) => (i.status || '').toLowerCase().includes('submitted'));
  const processedItems = items.filter((i) => !(i.status || '').toLowerCase().includes('submitted'));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[var(--accent-strong)]" />
          PH Approval Hub
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Purchase Orders, RMA POs, and Petty Cash requests pending Project Head approval
        </p>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b border-[var(--border-subtle)]">
        {subTabs.map((st) => (
          <button
            key={st.key}
            onClick={() => setActiveSubTab(st.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === st.key
                ? 'border-[var(--accent)] text-[var(--accent-strong)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-12 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">No approval items in this category</p>
        </div>
      )}

      {!loading && !error && pendingItems.length > 0 && (
        <div>
          <SectionHeader title="Pending Approval" subtitle={`${pendingItems.length} item${pendingItems.length !== 1 ? 's' : ''} awaiting PH action`} />
          <div className="space-y-3">
            {pendingItems.map((item) => (
              <div key={item.name} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text-main)]">{item.source_name || item.name}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{item.status}</span>
                      {item.source_type && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">{item.source_type}</span>
                      )}
                    </div>
                    {item.description && <p className="mt-1 text-xs text-[var(--text-muted)]">{item.description}</p>}
                    <div className="mt-2 flex gap-4 text-[11px] text-[var(--text-muted)]">
                      {item.submitted_by && <span>By: {item.submitted_by}</span>}
                      {item.submitted_at && <span>{new Date(item.submitted_at).toLocaleDateString('en-IN')}</span>}
                      {item.amount != null && <span className="font-medium">₹{Number(item.amount).toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(item.name)}
                      disabled={actionBusy === item.name}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionBusy === item.name ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(item.name)}
                      disabled={actionBusy === item.name}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && processedItems.length > 0 && (
        <div>
          <SectionHeader title="Processed" subtitle="Previously approved or rejected items" />
          <div className="space-y-2">
            {processedItems.map((item) => {
              const isApproved = (item.status || '').toLowerCase().includes('approved');
              return (
                <div key={item.name} className={`rounded-xl border p-3 ${isApproved ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--text-main)]">{item.source_name || item.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {item.status}
                        </span>
                        {item.source_type && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{item.source_type}</span>}
                      </div>
                      <div className="mt-1 flex gap-4 text-[11px] text-[var(--text-muted)]">
                        {item.amount != null && <span>₹{Number(item.amount).toLocaleString('en-IN')}</span>}
                        {isApproved && item.approved_by && <span>Approved: {item.approved_by}</span>}
                        {!isApproved && item.rejected_by && <span>Rejected: {item.rejected_by}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Closeout Tab (Project Head closeout certificates)
   ═══════════════════════════════════════════════════════════ */

type CloseoutEligibility = {
  contract_scope: string | null;
  sequence: string[];
  issued: string[];
  next_eligible: string | null;
  all_complete: boolean;
  message?: string;
};

type CloseoutItem = {
  name: string;
  closeout_type: string;
  project: string;
  linked_tender?: string;
  contract_scope?: string;
  status: string;
  issued_by?: string;
  issued_on?: string;
  certificate_date?: string;
  remarks?: string;
  kt_handover_plan?: string;
  kt_completed_on?: string;
  kt_completed_by?: string;
  revoked_by?: string;
  revoked_on?: string;
  revocation_reason?: string;
};

function CloseoutTab({ projectId }: { projectId: string }) {
  const [eligibility, setEligibility] = useState<CloseoutEligibility | null>(null);
  const [items, setItems] = useState<CloseoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [issueRemarks, setIssueRemarks] = useState('');
  const [ktPlan, setKtPlan] = useState('');
  const [showRevokeFor, setShowRevokeFor] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eligRes, itemsRes] = await Promise.all([
        callOps<CloseoutEligibility>('get_project_closeout_eligibility', { project: projectId }),
        callOps<CloseoutItem[]>('get_project_closeout_items', { project: projectId }),
      ]);
      setEligibility(eligRes);
      setItems(itemsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load closeout data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleIssue = async () => {
    if (!eligibility?.next_eligible) return;
    setActionBusy(true);
    try {
      await callOps('issue_closeout_certificate', {
        project: projectId,
        closeout_type: eligibility.next_eligible,
        remarks: issueRemarks.trim() || undefined,
        kt_handover_plan: eligibility.next_eligible === 'Exit Management KT' ? ktPlan.trim() || undefined : undefined,
      });
      setIssueRemarks('');
      setKtPlan('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue certificate');
    }
    setActionBusy(false);
  };

  const handleRevoke = async (name: string) => {
    if (!revokeReason.trim()) return;
    setActionBusy(true);
    try {
      await callOps('revoke_closeout_certificate', { name, reason: revokeReason.trim() });
      setShowRevokeFor(null);
      setRevokeReason('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke certificate');
    }
    setActionBusy(false);
  };

  const handleCompleteKt = async (name: string) => {
    setActionBusy(true);
    try {
      await callOps('complete_exit_management_kt', { name });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark KT as complete');
    }
    setActionBusy(false);
  };

  const stepStatusMap = useMemo(() => {
    const map: Record<string, 'issued' | 'revoked' | 'pending' | 'locked'> = {};
    if (!eligibility) return map;
    const issuedItems = items.filter((i) => i.status === 'Issued');
    const issuedTypes = new Set(issuedItems.map((i) => i.closeout_type));
    const revokedTypes = new Set(items.filter((i) => i.status === 'Revoked').map((i) => i.closeout_type));
    for (const step of eligibility.sequence) {
      if (issuedTypes.has(step)) map[step] = 'issued';
      else if (step === eligibility.next_eligible) map[step] = 'pending';
      else if (revokedTypes.has(step)) map[step] = 'revoked';
      else map[step] = 'locked';
    }
    return map;
  }, [eligibility, items]);

  const STEP_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    issued:  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
    pending: { bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
    revoked: { bg: 'bg-rose-50/30', border: 'border-rose-200', text: 'text-rose-600', badge: 'bg-rose-100 text-rose-700' },
    locked:  { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', badge: 'bg-gray-100 text-gray-500' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <Award className="h-5 w-5 text-[var(--accent-strong)]" />
          Project Closeout
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Issue closeout certificates in strict sequence based on contract scope
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {!loading && !error && eligibility && !eligibility.contract_scope && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <FileWarning className="mx-auto h-10 w-10 text-amber-400" />
          <p className="mt-3 text-sm font-medium text-amber-800">Contract scope not set</p>
          <p className="mt-1 text-xs text-amber-600">
            {eligibility.message || 'Set the Contract Scope on the linked tender (I&C Only or I&C + O&M) before issuing closeout certificates.'}
          </p>
        </div>
      )}

      {!loading && !error && eligibility && eligibility.contract_scope && (
        <>
          {/* Contract scope badge */}
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              {eligibility.contract_scope}
            </span>
            {eligibility.all_complete && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                All certificates issued
              </span>
            )}
          </div>

          {/* Sequence pipeline */}
          <div className="space-y-3">
            {eligibility.sequence.map((step, idx) => {
              const status = stepStatusMap[step] || 'locked';
              const styles = STEP_STYLES[status];
              const issuedItem = items.find((i) => i.closeout_type === step && i.status === 'Issued');
              const revokedItem = items.find((i) => i.closeout_type === step && i.status === 'Revoked');

              return (
                <div key={step} className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-[var(--text-muted)]">Step {idx + 1}</span>
                        <span className="text-sm font-semibold text-[var(--text-main)]">{step}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles.badge}`}>
                          {status === 'issued' ? 'Issued' : status === 'pending' ? 'Next' : status === 'revoked' ? 'Revoked' : 'Locked'}
                        </span>
                      </div>

                      {issuedItem && (
                        <div className="mt-2 flex gap-4 text-[11px] text-[var(--text-muted)]">
                          <span>Issued by: {issuedItem.issued_by}</span>
                          {issuedItem.certificate_date && <span>Date: {issuedItem.certificate_date}</span>}
                          {issuedItem.remarks && <span>{issuedItem.remarks}</span>}
                        </div>
                      )}

                      {issuedItem && issuedItem.closeout_type === 'Exit Management KT' && (
                        <div className="mt-2">
                          {issuedItem.kt_completed_on ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              KT completed on {issuedItem.kt_completed_on}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCompleteKt(issuedItem.name)}
                              disabled={actionBusy}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Mark KT Complete
                            </button>
                          )}
                        </div>
                      )}

                      {revokedItem && (
                        <div className="mt-2 text-[11px] text-rose-600">
                          Revoked by {revokedItem.revoked_by} — {revokedItem.revocation_reason}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {status === 'issued' && issuedItem && (
                        <>
                          {showRevokeFor === issuedItem.name ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={revokeReason}
                                onChange={(e) => setRevokeReason(e.target.value)}
                                placeholder="Reason for revocation"
                                className="rounded-lg border border-rose-300 px-2 py-1 text-xs w-48"
                              />
                              <button
                                onClick={() => handleRevoke(issuedItem.name)}
                                disabled={actionBusy || !revokeReason.trim()}
                                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => { setShowRevokeFor(null); setRevokeReason(''); }}
                                className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowRevokeFor(issuedItem.name)}
                              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Revoke
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Issue next certificate form */}
          {eligibility.next_eligible && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-5">
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                Issue: {eligibility.next_eligible}
              </h3>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Remarks (optional)</label>
                  <textarea
                    value={issueRemarks}
                    onChange={(e) => setIssueRemarks(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                    placeholder="Add any notes..."
                  />
                </div>
                {eligibility.next_eligible === 'Exit Management KT' && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">KT / Handover Plan</label>
                    <textarea
                      value={ktPlan}
                      onChange={(e) => setKtPlan(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                      placeholder="Describe knowledge transfer plan and handover activities..."
                    />
                  </div>
                )}
                <button
                  onClick={handleIssue}
                  disabled={actionBusy}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionBusy ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                  Issue {eligibility.next_eligible}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Shell
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
    callOps<string[]>('get_project_favorites').then((favs) => {
      if (Array.isArray(favs) && favs.includes(projectId)) setIsFavorite(true);
    }).catch(() => {});
  }, [projectId]);
  const toggleFavorite = useCallback(async () => {
    setFavoriteLoading(true);
    try {
      const res = await callOps<{ is_favorite: boolean }>('toggle_project_favorite', { project: projectId });
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
        const data = await callOps<ProjectDetail>('get_project_spine_detail', {
          project: projectId,
          ...(config.departmentKey !== 'all' ? { department: config.departmentKey } : {}),
        });
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
  }, [projectId, reloadKey]);

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
