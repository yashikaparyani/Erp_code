/**
 * Shared utilities for the Procurement & Inventory chain pages.
 * Centralises API helpers, formatters, and badge maps used across
 * indents, vendor comparisons, purchase orders, dispatch challans,
 * GRNs, stock pages, and inventory.
 */

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

export const INDENT_BADGES: Record<string, string> = {
  Draft: 'badge-yellow',
  Pending: 'badge-blue',
  Submitted: 'badge-blue',
  Acknowledged: 'badge-purple',
  Accepted: 'badge-green',
  Rejected: 'badge-red',
  'Returned for Revision': 'badge-yellow',
  Escalated: 'badge-purple',
  'Partially Ordered': 'badge-purple',
  Ordered: 'badge-green',
  Transferred: 'badge-green',
  Cancelled: 'badge-red',
};

export const PO_BADGES: Record<string, string> = {
  Draft: 'badge-yellow',
  'To Receive and Bill': 'badge-blue',
  'To Bill': 'badge-purple',
  'To Receive': 'badge-yellow',
  Completed: 'badge-green',
  Cancelled: 'badge-red',
  Closed: 'badge-gray',
};

export const DC_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING_APPROVAL: 'badge-yellow',
  APPROVED: 'badge-blue',
  DISPATCHED: 'badge-green',
  REJECTED: 'badge-red',
  CANCELLED: 'badge-gray',
};

export const GRN_BADGES: Record<string, string> = {
  Draft: 'badge-yellow',
  Completed: 'badge-green',
  Cancelled: 'badge-red',
  Return: 'badge-yellow',
};

export const VC_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING_APPROVAL: 'badge-yellow',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
};

export function badge(map: Record<string, string>, status?: string): string {
  return map[status || ''] || 'badge-gray';
}

/* ── Status variant mapping (for DetailPage shell) ──────────── */

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info';

export function statusVariant(status?: string): Variant {
  const s = (status || '').toLowerCase().replace(/_/g, ' ');
  if (['accepted', 'approved', 'completed', 'ordered', 'transferred', 'dispatched'].includes(s))
    return 'success';
  if (['draft', 'returned for revision', 'to receive'].includes(s)) return 'warning';
  if (['rejected', 'cancelled'].includes(s)) return 'error';
  if (['submitted', 'pending', 'pending approval', 'acknowledged', 'to receive and bill', 'to bill'].includes(s))
    return 'info';
  return 'default';
}
