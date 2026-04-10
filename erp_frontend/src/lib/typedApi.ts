/**
 * Typed client-side API wrappers for high-traffic workflows.
 * These call dedicated typed Next.js API routes instead of the generic /api/ops RPC.
 * Usage: import { projectInventoryApi, commercialApi, ... } from '@/lib/typedApi';
 */

/* ── Generic fetch helper ─────────────────────────────────── */

async function typedFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed: ${url}`);
  }
  return (payload.data ?? payload) as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function projectWorkspaceFetch<T = unknown>(method: string, args?: Record<string, unknown>): Promise<T> {
  return typedFetch<T>('/api/project-workspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args: args || {} }),
  });
}

/* ── Project Inventory ────────────────────────────────────── */

export const projectInventoryApi = {
  getRecords: <T = unknown>(project: string) =>
    typedFetch<T>(`/api/project-inventory${qs({ project, type: 'records' })}`),

  getConsumption: <T = unknown>(project: string) =>
    typedFetch<T>(`/api/project-inventory${qs({ project, type: 'consumption' })}`),

  getSummary: <T = unknown>(project: string) =>
    typedFetch<T>(`/api/project-inventory${qs({ project, type: 'summary' })}`),

  getIndents: <T = unknown>(project: string, limit?: number, start?: number) =>
    typedFetch<T>(`/api/project-inventory${qs({ project, type: 'indents', limit_page_length: limit, limit_start: start })}`),

  recordReceipt: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/project-inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'receipt', data }),
    }),

  createConsumption: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/project-inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'consumption', data }),
    }),

  createIndent: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/project-inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'indent', data }),
    }),
};

/* ── Commercial Docs/Comments ─────────────────────────────── */

export const commercialApi = {
  getDocuments: <T = unknown>(customer?: string) =>
    typedFetch<T>(`/api/commercial${qs({ type: 'documents', customer })}`),

  getComments: <T = unknown>(customer?: string) =>
    typedFetch<T>(`/api/commercial${qs({ type: 'comments', customer })}`),

  addComment: <T = unknown>(reference_doctype: string, reference_name: string, content: string) =>
    typedFetch<T>('/api/commercial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_comment', reference_doctype, reference_name, content }),
    }),

  createDocument: <T = unknown>(fields: Record<string, unknown>) =>
    typedFetch<T>('/api/commercial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_document', ...fields }),
    }),
};

/* ── Closeout ─────────────────────────────────────────────── */

export const closeoutApi = {
  getEligibility: <T = unknown>(project: string) =>
    typedFetch<T>(`/api/closeout${qs({ project, type: 'eligibility' })}`),

  getItems: <T = unknown>(project: string) =>
    typedFetch<T>(`/api/closeout${qs({ project, type: 'items' })}`),

  issueCertificate: <T = unknown>(project: string, closeout_type: string, remarks?: string, kt_handover_plan?: string) =>
    typedFetch<T>('/api/closeout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'issue', project, closeout_type, remarks, kt_handover_plan }),
    }),

  revokeCertificate: <T = unknown>(name: string, reason?: string) =>
    typedFetch<T>('/api/closeout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke', name, reason }),
    }),

  completeKt: <T = unknown>(name: string) =>
    typedFetch<T>('/api/closeout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_kt', name }),
    }),
};

/* ── Indents (detail + workflow actions) ──────────────────── */

export const indentApi = {
  get: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/indents/${encodeURIComponent(id)}`),

  action: <T = unknown>(id: string, action: string, remarks?: string) =>
    typedFetch<T>(`/api/indents/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, remarks }),
    }),
};

/* ── Costing Queue ────────────────────────────────────────── */

export const costingApi = {
  getQueue: <T = unknown>(status?: string, source_type?: string) =>
    typedFetch<T>(`/api/costing${qs({ status, source_type })}`),

  getItem: <T = unknown>(name: string) =>
    typedFetch<T>(`/api/costing${qs({ name })}`),

  release: <T = unknown>(name: string, remarks?: string) =>
    typedFetch<T>('/api/costing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'release', name, remarks }),
    }),

  hold: <T = unknown>(name: string, remarks?: string) =>
    typedFetch<T>('/api/costing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hold', name, remarks }),
    }),

  reject: <T = unknown>(name: string, remarks?: string) =>
    typedFetch<T>('/api/costing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', name, remarks }),
    }),
};

/* ── ANDA Import ──────────────────────────────────────────── */

export const andaApi = {
  checkIntegrity: <T = unknown>() =>
    typedFetch<T>('/api/anda?type=integrity'),

  getTabs: <T = unknown>() =>
    typedFetch<T>('/api/anda?type=tabs'),

  getLogs: <T = unknown>(limit?: number) =>
    typedFetch<T>(`/api/anda${qs({ type: 'logs', limit })}`),

  getOrder: <T = unknown>(include_complex?: boolean) =>
    typedFetch<T>(`/api/anda${qs({ type: 'order', include_complex: include_complex ? 'true' : undefined })}`),

  loadMasters: <T = unknown>() =>
    typedFetch<T>('/api/anda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load_masters' }),
    }),

  importSingle: <T = unknown>(args: Record<string, unknown>) =>
    typedFetch<T>('/api/anda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import_single', ...args }),
    }),

  importOrchestrated: <T = unknown>(args?: Record<string, unknown>) =>
    typedFetch<T>('/api/anda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import_orchestrated', ...(args || {}) }),
    }),
};

/* ── Communication Logs ──────────────────────────────────── */

export const commLogApi = {
  list: <T = unknown>(params?: { project?: string; site?: string; comm_type?: string; direction?: string }) =>
    typedFetch<T>(`/api/comm-logs${qs(params || {})}`),

  get: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/comm-logs/${encodeURIComponent(id)}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/comm-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: <T = unknown>(id: string, data: Record<string, unknown>) =>
    typedFetch<T>(`/api/comm-logs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/comm-logs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

/* ── EMD / PBG Instruments ───────────────────────────────── */

export const emdPbgApi = {
  list: <T = unknown>(params?: { tender?: string; type?: string }) =>
    typedFetch<T>(`/api/emd-pbg${qs(params || {})}`),

  get: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/emd-pbg/${encodeURIComponent(id)}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/emd-pbg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: <T = unknown>(id: string, data: Record<string, unknown>) =>
    typedFetch<T>(`/api/emd-pbg/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/emd-pbg/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

/* ── Execution Summary ────────────────────────────────────── */

export const executionApi = {
  getSummary: <T = unknown>(init?: RequestInit) =>
    typedFetch<T>('/api/execution/summary', init),

  createDpr: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/dprs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  bulkUploadSites: <T = unknown>(args: { file_url: string; dry_run: boolean; default_project?: string; default_tender?: string }) =>
    typedFetch<T>('/api/sites/bulk-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...args, dry_run: args.dry_run ? 1 : 0 }),
    }),

  downloadSiteTemplate: async (): Promise<Blob> => {
    const response = await fetch('/api/sites/bulk-upload/template');
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Download failed');
    }
    return response.blob();
  },
};

/* ── Projects ─────────────────────────────────────────────── */

export const projectApi = {
  list: <T = unknown>(department?: string) =>
    typedFetch<T>(`/api/projects${qs({ department })}`),

  get: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/projects/${encodeURIComponent(id)}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: <T = unknown>(id: string, data: Record<string, unknown>) =>
    typedFetch<T>(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  addSites: <T = unknown>(id: string, sites: { site_name: string; site_code: string }[]) =>
    typedFetch<T>(`/api/projects/${encodeURIComponent(id)}/sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initial_sites: sites }),
    }),
};

/* ── Project Workspace ───────────────────────────────────── */

export const projectWorkspaceApi = {
  listProjects: <T = unknown>(department?: string) =>
    projectWorkspaceFetch<T>('get_project_spine_list', department ? { department } : {}),

  getDetail: <T = unknown>(project: string, department?: string) =>
    projectWorkspaceFetch<T>('get_project_spine_detail', {
      project,
      ...(department ? { department } : {}),
    }),

  getFavorites: <T = unknown>() =>
    projectWorkspaceFetch<T>('get_project_favorites'),

  toggleFavorite: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('toggle_project_favorite', { project }),

  getWorkflowState: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_project_workflow_state', { project }),

  runWorkflowAction: <T = unknown>(action: string, args: Record<string, unknown>) =>
    projectWorkspaceFetch<T>(action, args),

  getCockpitSummary: <T = unknown>(project: string, limit?: number) =>
    projectWorkspaceFetch<T>('get_pm_cockpit_summary', { project, ...(limit ? { limit } : {}) }),

  getCentralStatus: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_pm_central_status', { project }),

  getActivity: <T = unknown>(project: string, limit?: number) =>
    projectWorkspaceFetch<T>('get_project_activity', { project, ...(limit ? { limit } : {}) }),

  getTasks: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_project_tasks', { project }),

  getTaskSummary: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_task_summary', { project }),

  createTask: <T = unknown>(data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('create_project_task', { data }),

  updateTask: <T = unknown>(name: string, data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('update_project_task', { name, data }),

  deleteTask: <T = unknown>(name: string) =>
    projectWorkspaceFetch<T>('delete_project_task', { name }),

  updateTaskStatus: <T = unknown>(name: string, status: string) =>
    projectWorkspaceFetch<T>('update_task_status', { name, status }),

  getNotes: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_project_notes', { project }),

  createNote: <T = unknown>(data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('create_project_note', { data }),

  updateNote: <T = unknown>(name: string, data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('update_project_note', { name, data }),

  deleteNote: <T = unknown>(name: string) =>
    projectWorkspaceFetch<T>('delete_project_note', { name }),

  getDocuments: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_project_documents', { project }),

  updateDocumentStatus: <T = unknown>(name: string, status: string) =>
    projectWorkspaceFetch<T>('update_document_status', { name, status }),

  deleteDocument: <T = unknown>(name: string) =>
    projectWorkspaceFetch<T>('delete_project_document', { name }),

  getRecordDocuments: <T = unknown>(reference_doctype: string, reference_name: string) =>
    projectWorkspaceFetch<T>('get_record_documents', { reference_doctype, reference_name }),

  getStageCompleteness: <T = unknown>(project: string, stage: string) =>
    projectWorkspaceFetch<T>('check_stage_document_completeness', { project, stage }),

  getProgressionGate: <T = unknown>(project: string, target_stage: string) =>
    projectWorkspaceFetch<T>('check_progression_gate', { project, target_stage }),

  getIssues: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_project_issues', { project }),

  createIssue: <T = unknown>(data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('create_project_issue', { data: JSON.stringify(data) }),

  updateIssue: <T = unknown>(name: string, data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('update_project_issue', { name, data: JSON.stringify(data) }),

  deleteIssue: <T = unknown>(name: string) =>
    projectWorkspaceFetch<T>('delete_project_issue', { name }),

  getPettyCashEntries: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_petty_cash_entries', { project }),

  createPettyCashEntry: <T = unknown>(data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('create_petty_cash_entry', { data: JSON.stringify(data) }),

  updatePettyCashEntry: <T = unknown>(name: string, data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('update_petty_cash_entry', { name, data: JSON.stringify(data) }),

  approvePettyCashEntry: <T = unknown>(name: string) =>
    projectWorkspaceFetch<T>('approve_petty_cash_entry', { name }),

  rejectPettyCashEntry: <T = unknown>(name: string, reason?: string) =>
    projectWorkspaceFetch<T>('reject_petty_cash_entry', { name, reason }),

  deletePettyCashEntry: <T = unknown>(name: string) =>
    projectWorkspaceFetch<T>('delete_petty_cash_entry', { name }),

  submitPettyCashToPh: <T = unknown>(name: string, remarks?: string) =>
    projectWorkspaceFetch<T>('submit_petty_cash_to_ph', { name, ...(remarks ? { remarks } : {}) }),

  getCommLogs: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_comm_logs', { project }),

  createCommLog: <T = unknown>(data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('create_comm_log', { data: JSON.stringify(data) }),

  getPmRequests: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_pm_requests', { project }),

  createPmRequest: <T = unknown>(data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('create_pm_request', { data: JSON.stringify(data) }),

  runPmRequestAction: <T = unknown>(action: string, name: string, remarks?: string) =>
    projectWorkspaceFetch<T>(action, { name, ...(remarks ? { remarks } : {}) }),

  getPhApprovalItems: <T = unknown>(project: string, tab: string) =>
    projectWorkspaceFetch<T>('get_ph_approval_items', { project, tab }),

  runPhApprovalAction: <T = unknown>(action: 'ph_approve_item' | 'ph_reject_item', name: string) =>
    projectWorkspaceFetch<T>(action, { name }),

  getProjectTimesheetSummary: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_project_timesheet_summary', { project }),

  getProjectTeamMembers: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_project_team_members', { project }),

  createTeamMember: <T = unknown>(data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('create_project_team_member', { data: JSON.stringify(data) }),

  updateTeamMember: <T = unknown>(name: string, data: Record<string, unknown>) =>
    projectWorkspaceFetch<T>('update_project_team_member', { name, data: JSON.stringify(data) }),

  deleteTeamMember: <T = unknown>(name: string) =>
    projectWorkspaceFetch<T>('delete_project_team_member', { name }),

  getManpowerSummary: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_manpower_summary', { project }),

  getManpowerLogs: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_manpower_logs', { project }),

  getMilestones: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_milestones', { project }),

  getProjectDossier: <T = unknown>(project: string) =>
    projectWorkspaceFetch<T>('get_project_dossier', { project }),
};

/* ── Invoice Workflow Actions ─────────────────────────────── */

export const invoiceApi = {
  action: <T = unknown>(action: string, name?: string, reason?: string) =>
    typedFetch<T>('/api/invoices/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, name, reason }),
    }),

  reconcile: <T = unknown>() =>
    typedFetch<T>('/api/invoices/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reconcile' }),
    }),
};

/* ── DPR (Daily Progress Report) ──────────────────────────── */

export const dprApi = {
  list: <T = unknown>(project?: string, site?: string) =>
    typedFetch<T>(`/api/dprs${qs({ project, site })}`),

  get: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/dprs/${encodeURIComponent(id)}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/dprs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  action: <T = unknown>(id: string, action: string, remarks?: string) =>
    typedFetch<T>(`/api/dprs/${encodeURIComponent(id)}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, remarks }),
    }),

  stats: <T = unknown>() =>
    typedFetch<T>('/api/dprs/stats'),
};

/* ── Notification Center ──────────────────────────────────── */

export const notificationApi = {
  get: <T = unknown>() =>
    typedFetch<T>('/api/notifications'),
};

/* ── Tenders ──────────────────────────────────────────────── */

export const tendersApi = {
  list: <T = unknown>(params?: { status?: string; limit?: number; offset?: number }) =>
    typedFetch<T>(`/api/tenders${qs(params || {})}`),

  get: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/tenders/${encodeURIComponent(id)}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/tenders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: <T = unknown>(id: string, data: Record<string, unknown>) =>
    typedFetch<T>(`/api/tenders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  patch: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/tenders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/tenders/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  stats: <T = unknown>() =>
    typedFetch<T>('/api/tenders/stats'),

  transitionStatus: <T = unknown>(id: string, target_status: string) =>
    typedFetch<T>(`/api/tenders/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_status }),
    }),

  workflow: <T = unknown>(id: string, action: string, reason?: string) =>
    typedFetch<T>(`/api/tenders/${encodeURIComponent(id)}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    }),

  assignUserColor: <T = unknown>(id: string, slot: string, remarks?: string) =>
    typedFetch<T>(`/api/tenders/${encodeURIComponent(id)}/user-color`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, remarks }),
    }),

  closure: <T = unknown>(id: string, action: string, data?: Record<string, unknown>) =>
    typedFetch<T>(`/api/tenders/${encodeURIComponent(id)}/closure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    }),
};

/* ── Bids ─────────────────────────────────────────────────── */

export const bidsApi = {
  list: <T = unknown>(params?: { tender?: string; status?: string; is_latest?: string; loi_decision_status?: string }) =>
    typedFetch<T>(`/api/bids${qs(params || {})}`),

  get: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: <T = unknown>(id: string, data: Record<string, unknown>) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  submit: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}/submit`, { method: 'POST' }),

  markWon: <T = unknown>(id: string, result_date?: string, remarks?: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}/won`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result_date, remarks }),
    }),

  markLost: <T = unknown>(id: string, result_date?: string, remarks?: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}/lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result_date, remarks }),
    }),

  cancel: <T = unknown>(id: string, reason: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }),

  underEvaluation: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}/under-evaluation`, { method: 'POST' }),

  retender: <T = unknown>(id: string, reason: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}/retender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }),

  loiRequest: <T = unknown>(id: string, loi_expected_by?: string, remarks?: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}/loi-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loi_expected_by, remarks }),
    }),

  loiDecision: <T = unknown>(id: string, decision: string, reason?: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}/loi-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason }),
    }),

  locRequest: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}/loc-request`, { method: 'POST' }),

  locSubmit: <T = unknown>(id: string, submission_date?: string, remarks?: string) =>
    typedFetch<T>(`/api/bids/${encodeURIComponent(id)}/loc-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_date, remarks }),
    }),
};

/* ── Parties ──────────────────────────────────────────────── */

export const partiesApi = {
  list: <T = unknown>(params?: { type?: string; active?: string }) =>
    typedFetch<T>(`/api/parties${qs(params || {})}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/parties', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: <T = unknown>(name: string) =>
    typedFetch<T>(`/api/parties?name=${encodeURIComponent(name)}`, { method: 'DELETE' }),
};

/* ── Organizations ────────────────────────────────────────── */

export const organizationsApi = {
  list: <T = unknown>(params?: { active?: string }) =>
    typedFetch<T>(`/api/organizations${qs(params || {})}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
};

/* ── Tender Approvals ─────────────────────────────────────── */

export const tenderApprovalsApi = {
  list: <T = unknown>(params?: { tender?: string; status?: string }) =>
    typedFetch<T>(`/api/tender-approvals${qs(params || {})}`),

  submit: <T = unknown>(name: string, approval_type: string, remarks?: string) =>
    typedFetch<T>('/api/tender-approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, approval_type, remarks }),
    }),

  action: <T = unknown>(id: string, action: 'approve' | 'reject', remarks?: string) =>
    typedFetch<T>(`/api/tender-approvals/${encodeURIComponent(id)}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, remarks }),
    }),
};

/* ── Tender Checklists ────────────────────────────────────── */

export const tenderChecklistsApi = {
  list: <T = unknown>(params?: { status?: string; checklist_type?: string }) =>
    typedFetch<T>(`/api/tender-checklists${qs(params || {})}`),

  get: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/tender-checklists/${encodeURIComponent(id)}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/tender-checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: <T = unknown>(id: string, data: Record<string, unknown>) =>
    typedFetch<T>(`/api/tender-checklists/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/tender-checklists/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ── Tender Reminders ─────────────────────────────────────── */

export const tenderRemindersApi = {
  list: <T = unknown>(params?: { tender?: string; status?: string }) =>
    typedFetch<T>(`/api/tender-reminders${qs(params || {})}`),

  get: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/tender-reminders/${encodeURIComponent(id)}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/tender-reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  update: <T = unknown>(id: string, data: Record<string, unknown>) =>
    typedFetch<T>(`/api/tender-reminders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/tender-reminders/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ── Tender Organizations ─────────────────────────────────── */

export const tenderOrganizationsApi = {
  list: <T = unknown>(params?: { tender?: string }) =>
    typedFetch<T>(`/api/tender-organizations${qs(params || {})}`),

  create: <T = unknown>(data: Record<string, unknown>) =>
    typedFetch<T>('/api/tender-organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  delete: <T = unknown>(name: string) =>
    typedFetch<T>(`/api/tender-organizations?name=${encodeURIComponent(name)}`, { method: 'DELETE' }),
};

/* ── LOI Tracker ──────────────────────────────────────────── */

export const loiTrackerApi = {
  getStatus: <T = unknown>(bid: string) =>
    typedFetch<T>(`/api/loi-tracker${qs({ bid })}`),

  create: <T = unknown>(data: { bid: string; department?: string; loi_expected_by?: string; remarks?: string }) =>
    typedFetch<T>('/api/loi-tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  markReceived: <T = unknown>(id: string, loi_received_date?: string, loi_document?: string) =>
    typedFetch<T>(`/api/loi-tracker/${encodeURIComponent(id)}/received`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loi_received_date, loi_document }),
    }),
};

/* ── Presales Color Config ────────────────────────────────── */

export const presalesConfigApi = {
  get: <T = unknown>() =>
    typedFetch<T>('/api/presales/color-config'),

  update: <T = unknown>(slot: number, color: string, label: string, description?: string) =>
    typedFetch<T>('/api/presales/color-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, color, label, description }),
    }),
};

/* ── Tender Convert ───────────────────────────────────────── */

export const tenderConvertApi = {
  convert: <T = unknown>(tender_name: string) =>
    typedFetch<T>('/api/tender-convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tender_name }),
    }),
};

/* ── Tender Workspace ─────────────────────────────────────── */

export const tenderWorkspaceApi = {
  get: <T = unknown>(id: string) =>
    typedFetch<T>(`/api/tender-workspace/${encodeURIComponent(id)}`),
};
