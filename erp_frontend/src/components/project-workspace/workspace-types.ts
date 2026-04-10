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

export type WorkflowRequirement = {
  label: string;
  satisfied: boolean;
  detail: string;
};

export type WorkflowHistoryEntry = {
  action?: string;
  stage?: string;
  next_stage?: string;
  actor?: string;
  timestamp?: string;
  remarks?: string;
};

export type WorkflowState = {
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

export type WorkspaceShortcut = {
  label: string;
  href?: string;
  tab?: TabKey;
  tone: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
  detail: string;
};

export type WorkspacePriority = {
  title: string;
  detail: string;
  tone: 'rose' | 'amber' | 'emerald' | 'blue';
};

/* ═══════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════ */

export const SPINE_STAGES = [
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

export const STAGE_LABELS: Record<string, string> = {
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

export const DOCUMENT_TRACE_STAGES = [
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

export const DOCUMENT_TRACE_STAGE_LABELS: Record<string, string> = {
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

export const PROJECT_TO_DOCUMENT_STAGE: Record<string, string> = {
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

export const DOSSIER_STAGE_ORDER = [
  'Survey', 'BOM_BOQ', 'Drawing', 'Indent', 'Quotation_Vendor_Comparison',
  'PO', 'Dispatch', 'GRN_Inventory', 'Execution', 'Commissioning',
  'O_M', 'SLA', 'RMA', 'Commercial', 'Closure', 'Unclassified',
];

export const DOSSIER_STAGE_LABELS: Record<string, string> = {
  Survey: 'Survey', BOM_BOQ: 'BOM / BOQ', Drawing: 'Drawings', Indent: 'Indent',
  Quotation_Vendor_Comparison: 'Quotation / Vendor Comparison', PO: 'Purchase Order',
  Dispatch: 'Dispatch', GRN_Inventory: 'GRN / Inventory', Execution: 'Execution / I&C',
  Commissioning: 'Commissioning', O_M: 'O&M', SLA: 'SLA', RMA: 'RMA',
  Commercial: 'Commercial', Closure: 'Closure', Unclassified: 'Unclassified',
};

/* ═══════════════════════════════════════════════════════════
   API helper (shared across workspace tabs)
   ═══════════════════════════════════════════════════════════ */

export async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/project-workspace', {
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

export function getDocumentExtension(fileUrl?: string) {
  let source = (fileUrl || '').trim().toLowerCase();
  if (source.startsWith('/api/files?')) {
    const query = source.split('?', 2)[1] || '';
    const params = new URLSearchParams(query);
    source = params.get('url') || source;
  }
  const cleaned = source.split('?', 1)[0].trim().toLowerCase();
  return cleaned.includes('.') ? cleaned.split('.').pop() || '' : '';
}

export function isPreviewableDocument(fileUrl?: string) {
  return ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'].includes(getDocumentExtension(fileUrl));
}

export function formatWorkflowText(value?: string | null) {
  return value ? value.replaceAll('_', ' ') : '-';
}
