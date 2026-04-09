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
