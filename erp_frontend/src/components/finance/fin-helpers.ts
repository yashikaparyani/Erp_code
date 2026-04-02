/**
 * Shared utilities for the Finance & Costing surfaces.
 * Centralises API helpers, formatters, and badge maps used across
 * costing queue, billing, payment receipts, follow-ups, retention,
 * penalties, estimates, proformas, and financial visibility pages.
 */

export { useAuth } from '@/context/AuthContext';

/* ── API helper ─────────────────────────────────────────────── */

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

/* ── Currency formatter (INR, Lakh / Crore) ─────────────────── */

export function formatCurrency(val?: number): string {
  if (!val) return '₹0';
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

/* ── Date formatter ─────────────────────────────────────────── */

export function formatDate(v?: string): string {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ── Badge maps ─────────────────────────────────────────────── */

export const INVOICE_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  SUBMITTED: 'badge-yellow',
  PENDING_APPROVAL: 'badge-yellow',
  APPROVED: 'badge-blue',
  PAYMENT_RECEIVED: 'badge-green',
  PAID: 'badge-green',
  REJECTED: 'badge-red',
  CANCELLED: 'badge-gray',
};

export const COST_SHEET_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  SUBMITTED: 'badge-yellow',
  PENDING_APPROVAL: 'badge-yellow',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
};

export const QUEUE_BADGES: Record<string, string> = {
  Pending: 'badge-yellow',
  Released: 'badge-green',
  Held: 'badge-orange',
  Rejected: 'badge-red',
  'Disbursed / Released': 'badge-gray',
};

export const ESTIMATE_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  SENT: 'badge-blue',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
  CONVERTED: 'badge-purple',
};

export const PROFORMA_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  SENT: 'badge-blue',
  APPROVED: 'badge-green',
  CANCELLED: 'badge-red',
  CONVERTED: 'badge-purple',
};

export const PENALTY_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING: 'badge-yellow',
  APPROVED: 'badge-green',
  APPLIED: 'badge-blue',
  REVERSED: 'badge-purple',
};

export const RETENTION_BADGES: Record<string, string> = {
  RETAINED: 'badge-yellow',
  'PARTIALLY RELEASED': 'badge-blue',
  RELEASED: 'badge-green',
};

export const FOLLOW_UP_BADGES: Record<string, string> = {
  OPEN: 'badge-yellow',
  PROMISED: 'badge-blue',
  ESCALATED: 'badge-red',
  CLOSED: 'badge-green',
};

export const RECEIPT_BADGES: Record<string, string> = {
  RECEIVED: 'badge-green',
  CONFIRMED: 'badge-green',
  ADJUSTED: 'badge-blue',
  PENDING: 'badge-yellow',
  CANCELLED: 'badge-red',
};

export const SLA_PENALTY_BADGES: Record<string, string> = {
  PENDING: 'badge-yellow',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
  WAIVED: 'badge-gray',
};

export function badge(map: Record<string, string>, status?: string): string {
  return map[status || ''] || map[(status || '').toUpperCase()] || 'badge-gray';
}

/* ── Status variant mapping (for DetailPage shell) ──────────── */

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info';

export function statusVariant(status?: string): Variant {
  const s = (status || '').toUpperCase().replace(/_/g, ' ');
  if (['APPROVED', 'PAID', 'PAYMENT RECEIVED', 'RELEASED', 'COMPLETED', 'CONFIRMED', 'CLOSED'].includes(s))
    return 'success';
  if (['SUBMITTED', 'PENDING', 'PENDING APPROVAL', 'DRAFT', 'OPEN', 'PROMISED', 'RETAINED', 'PARTIALLY RELEASED'].includes(s))
    return 'warning';
  if (['REJECTED', 'CANCELLED', 'ESCALATED'].includes(s))
    return 'error';
  if (['SENT', 'APPLIED', 'ADJUSTED', 'CONVERTED'].includes(s))
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
