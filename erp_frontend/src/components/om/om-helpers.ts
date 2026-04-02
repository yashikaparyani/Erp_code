/**
 * Shared utilities for O&M, Helpdesk, SLA and RMA surfaces.
 * Centralises API helpers, formatters and badge maps for
 * tickets, SLA profiles, and RMA trackers.
 */

export { useAuth } from '@/context/AuthContext';

/* ── REST helper ────────────────────────────────────────────── */

export async function callApi<T = unknown>(
  path: string,
  opts?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(path, {
    method: opts?.method || 'GET',
    headers: opts?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  const payload = await res.json();
  if (!res.ok || payload.success === false)
    throw new Error(payload.message || `Failed: ${path}`);
  return (payload.data?.data ?? payload.data) as T;
}

/* ── Ops proxy helper ───────────────────────────────────────── */

export async function callOps<T = unknown>(
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await res.json();
  if (!payload.success) throw new Error(payload.message || `Failed: ${method}`);
  return (payload.data?.data ?? payload.data) as T;
}

/* ── Formatters ─────────────────────────────────────────────── */

export function formatDate(v?: string): string {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(v?: string): string {
  if (!v) return '-';
  return new Date(v).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatCurrency(val?: number): string {
  if (val == null) return '-';
  return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatMinutes(val?: number): string {
  if (val == null) return '-';
  if (val < 60) return `${val} min`;
  const h = Math.floor(val / 60);
  const m = val % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/* ── Badge maps ─────────────────────────────────────────────── */

export const TICKET_BADGES: Record<string, string> = {
  NEW: 'badge-purple',
  ASSIGNED: 'badge-blue',
  IN_PROGRESS: 'badge-info',
  ON_HOLD: 'badge-warning',
  RESOLVED: 'badge-green',
  CLOSED: 'badge-gray',
  ESCALATED: 'badge-red',
};

export const PRIORITY_BADGES: Record<string, string> = {
  CRITICAL: 'badge-red',
  HIGH: 'badge-orange',
  MEDIUM: 'badge-yellow',
  LOW: 'badge-green',
};

export const RMA_BADGES: Record<string, string> = {
  PENDING: 'badge-yellow',
  APPROVED: 'badge-blue',
  IN_TRANSIT: 'badge-info',
  UNDER_REPAIR: 'badge-warning',
  REPAIRED: 'badge-green',
  REPLACED: 'badge-green',
  REJECTED: 'badge-red',
  CLOSED: 'badge-gray',
};

export const WARRANTY_BADGES: Record<string, string> = {
  UNDER_WARRANTY: 'badge-green',
  NON_WARRANTY: 'badge-orange',
};

export const SLA_BADGES: Record<string, string> = {
  Active: 'badge-green',
  Inactive: 'badge-gray',
};

export function badge(map: Record<string, string>, status?: string): string {
  return map[status || ''] || map[(status || '').toUpperCase()] || 'badge-gray';
}

/* ── Status variant mapping (for DetailPage shell) ──────────── */

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info';

export function statusVariant(status?: string): Variant {
  const s = (status || '').toUpperCase().replace(/_/g, ' ');
  if (['RESOLVED', 'CLOSED', 'REPAIRED', 'REPLACED', 'APPROVED'].includes(s))
    return 'success';
  if (['NEW', 'PENDING', 'ASSIGNED', 'ON HOLD', 'UNDER WARRANTY'].includes(s))
    return 'warning';
  if (['REJECTED', 'ESCALATED', 'CRITICAL'].includes(s))
    return 'error';
  if (['IN PROGRESS', 'IN TRANSIT', 'UNDER REPAIR'].includes(s))
    return 'info';
  return 'default';
}

/* ── Role checker ───────────────────────────────────────────── */

export function hasAnyRole(
  userRoles: string[] | undefined,
  ...requiredRoles: string[]
): boolean {
  const set = new Set(userRoles || []);
  return requiredRoles.some((r) => set.has(r));
}
