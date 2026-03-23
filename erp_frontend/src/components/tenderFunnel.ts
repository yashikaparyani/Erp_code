/**
 * tenderFunnel.ts  — 12-Color Funnel System
 *
 * 6 SYSTEM colors (lifecycle-driven, fixed meanings)
 * 6 USER slots  (user-customizable labels + display colors)
 *
 * System colors are derived from tender fields (bid-aware).
 * User color slots are stored in GE Presales Color Config (singleton)
 * and override the system color for DISPLAY only — workflow logic
 * always uses the system-derived color internally.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type SystemFunnelKey =
  | 'Blue'    // GO/NO-GO evaluation
  | 'Yellow'  // Technical cleared, EMD pending
  | 'Red'     // Not qualified (tech rejected)
  | 'Green'   // Bid ready (tech + EMD confirmed)
  | 'Orange'  // Locked (bid submitted)
  | 'Pink';   // Under observation

export type UserSlotKey =
  | 'USER_SLOT_1'
  | 'USER_SLOT_2'
  | 'USER_SLOT_3'
  | 'USER_SLOT_4'
  | 'USER_SLOT_5'
  | 'USER_SLOT_6';

export type FunnelColorKey = SystemFunnelKey | UserSlotKey;

export interface FunnelDisplayMeta {
  key: FunnelColorKey;
  label: string;
  description: string;
  hex: string;
  bgClass: string;          // Tailwind-compatible class string
  borderClass: string;
  textClass: string;
  badgeBg: string;          // inline style hex for badge
  isSystem: boolean;
  // Backward-compat props used by existing pages
  toneClass?: string;
  dotClass?: string;
}

export interface PresalesColorConfig {
  [slotKey: string]: {
    color: string;
    label: string;
    description: string;
    hex: string;
    count?: number;
  };
}

export interface TenderFunnelSignals {
  status?: string;
  go_no_go_status?: string;
  technical_readiness?: string;
  commercial_readiness?: string;
  finance_readiness?: string;
  submission_status?: string;
  emd_required?: number | boolean;
  pbg_required?: number | boolean;
  bid_denied_by_presales?: number | boolean;
  user_color_slot?: string;
  computed_funnel_status?: string;
  latest_bid?: { status?: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM COLOR DEFINITIONS (fixed, not user-changeable)
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEM_FUNNEL_META: Record<SystemFunnelKey, FunnelDisplayMeta> = {
  Blue: {
    key: 'Blue',
    label: 'GO/NO-GO Evaluation',
    description: 'Tender received, team evaluating whether to bid.',
    hex: '#3b82f6',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-400',
    textClass: 'text-blue-700',
    badgeBg: '#3b82f6',
    isSystem: true,
    toneClass: 'bg-blue-50 border-blue-200 text-blue-700',
    dotClass: 'bg-blue-500',
  },
  Yellow: {
    key: 'Yellow',
    label: 'Qualified',
    description: 'GO decision made and presales qualification completed.',
    hex: '#eab308',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-400',
    textClass: 'text-yellow-700',
    badgeBg: '#eab308',
    isSystem: true,
    toneClass: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    dotClass: 'bg-yellow-500',
  },
  Red: {
    key: 'Red',
    label: 'Qualification Rejected',
    description: 'Presales qualification marked this tender as not qualified.',
    hex: '#ef4444',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-400',
    textClass: 'text-red-700',
    badgeBg: '#ef4444',
    isSystem: true,
    toneClass: 'bg-red-50 border-red-200 text-red-700',
    dotClass: 'bg-red-500',
  },
  Green: {
    key: 'Green',
    label: 'Technical Approved',
    description: 'Director approved technical review. Ready to convert into a bid.',
    hex: '#22c55e',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-400',
    textClass: 'text-green-700',
    badgeBg: '#22c55e',
    isSystem: true,
    toneClass: 'bg-green-50 border-green-200 text-green-700',
    dotClass: 'bg-green-500',
  },
  Orange: {
    key: 'Orange',
    label: 'Technical Rejected',
    description: 'Director rejected technical review for this tender.',
    hex: '#f97316',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-400',
    textClass: 'text-orange-700',
    badgeBg: '#f97316',
    isSystem: true,
    toneClass: 'bg-orange-50 border-orange-200 text-orange-700',
    dotClass: 'bg-orange-500',
  },
  Pink: {
    key: 'Pink',
    label: 'Under Observation',
    description: 'NO-GO or manually kept under observation after rejection.',
    hex: '#ec4899',
    bgClass: 'bg-pink-50',
    borderClass: 'border-pink-400',
    textClass: 'text-pink-700',
    badgeBg: '#ec4899',
    isSystem: true,
    toneClass: 'bg-pink-50 border-pink-200 text-pink-700',
    dotClass: 'bg-pink-500',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// USER SLOT DEFAULT COLORS (overridable via color config)
// ─────────────────────────────────────────────────────────────────────────────

export const USER_SLOT_DEFAULTS: Record<UserSlotKey, { color: string; hex: string; label: string }> = {
  USER_SLOT_1: { color: 'Purple',   hex: '#a855f7', label: 'Custom 1' },
  USER_SLOT_2: { color: 'Teal',     hex: '#14b8a6', label: 'Custom 2' },
  USER_SLOT_3: { color: 'Brown',    hex: '#92400e', label: 'Custom 3' },
  USER_SLOT_4: { color: 'DarkGray', hex: '#374151', label: 'Custom 4' },
  USER_SLOT_5: { color: 'Indigo',   hex: '#4f46e5', label: 'Custom 5' },
  USER_SLOT_6: { color: 'Maroon',   hex: '#9f1239', label: 'Custom 6' },
};

/** 20-color palette for user slot picker */
export const COLOR_PALETTE: { name: string; hex: string }[] = [
  { name: 'Purple',   hex: '#a855f7' },
  { name: 'Teal',     hex: '#14b8a6' },
  { name: 'Brown',    hex: '#92400e' },
  { name: 'DarkGray', hex: '#374151' },
  { name: 'Indigo',   hex: '#4f46e5' },
  { name: 'Maroon',   hex: '#9f1239' },
  { name: 'Violet',   hex: '#8b5cf6' },
  { name: 'Cyan',     hex: '#06b6d4' },
  { name: 'Lime',     hex: '#84cc16' },
  { name: 'SkyBlue',  hex: '#0ea5e9' },
  { name: 'Rose',     hex: '#f43f5e' },
  { name: 'Fuchsia',  hex: '#d946ef' },
  { name: 'Amber',    hex: '#f59e0b' },
  { name: 'Emerald',  hex: '#10b981' },
  { name: 'Slate',    hex: '#64748b' },
  { name: 'Zinc',     hex: '#71717a' },
  { name: 'Coral',    hex: '#f97316' },
  { name: 'Navy',     hex: '#1e3a5f' },
  { name: 'Gold',     hex: '#d97706' },
  { name: 'Olive',    hex: '#7c7a2e' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM FUNNEL DERIVATION (bid-aware, 6-color logic)
// ─────────────────────────────────────────────────────────────────────────────

/** Derive the system funnel color from tender + active bid state */
export function deriveSystemFunnelKey(tender: TenderFunnelSignals): SystemFunnelKey {
  const status = tender.status || '';
  const gng = tender.go_no_go_status || 'PENDING';
  const tech = tender.technical_readiness || 'NOT_STARTED';
  const qualification = tender.commercial_readiness || 'NOT_STARTED';
  const bidDenied = Boolean(tender.bid_denied_by_presales);

  if (gng === 'NO_GO' || bidDenied || ['DROPPED', 'CANCELLED', 'LOST'].includes(status)) return 'Pink';
  if (!gng || gng === 'PENDING') return 'Blue';
  if (qualification === 'REJECTED') return 'Red';
  if (tech === 'REJECTED') return 'Orange';
  if (tech === 'APPROVED' || ['WON', 'CONVERTED_TO_PROJECT'].includes(status)) return 'Green';
  if (qualification === 'APPROVED') return 'Yellow';
  return 'Blue';
}

/** Map backend computed_funnel_status string to system key */
export function mapComputedFunnelStatusToKey(label: string): SystemFunnelKey {
  const map: Record<string, SystemFunnelKey> = {
    'Tender under evaluation for GO-NOGO':    'Blue',
    'Working but not confirmed by technical': 'Yellow',
    'Not Qualified Tender':                   'Red',
    'EMD done and technical confirmed':        'Green',
    'Locked Tender':                          'Orange',
    'Tender not bided but under observation': 'Pink',
  };
  return map[label] || 'Blue';
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVED DISPLAY (user slot takes priority over system)
// ─────────────────────────────────────────────────────────────────────────────

/** Get the effective funnel color key, considering user override */
export function getEffectiveFunnelKey(tender: TenderFunnelSignals): FunnelColorKey {
  if (tender.user_color_slot) {
    const slotKey = `USER_SLOT_${tender.user_color_slot}` as UserSlotKey;
    if (slotKey in USER_SLOT_DEFAULTS) return slotKey;
  }
  // Prefer backend-computed if available, else derive client-side
  if (tender.computed_funnel_status) {
    return mapComputedFunnelStatusToKey(tender.computed_funnel_status);
  }
  return deriveSystemFunnelKey(tender);
}

/** Build display metadata for any funnel key, using user config if provided */
export function getFunnelDisplayMeta(
  key: FunnelColorKey,
  colorConfig?: PresalesColorConfig
): FunnelDisplayMeta {
  if (!key.startsWith('USER_SLOT_')) {
    return SYSTEM_FUNNEL_META[key as SystemFunnelKey];
  }
  const slotNum = key.replace('USER_SLOT_', '');
  const cfgKey = `slot_${slotNum}`;
  const cfg = colorConfig?.[cfgKey];
  const defaults = USER_SLOT_DEFAULTS[key as UserSlotKey];
  const hex = cfg?.hex || defaults.hex;
  const label = cfg?.label || defaults.label;
  const description = cfg?.description || '';
  return {
    key,
    label,
    description,
    hex,
    bgClass: '',   // user-defined: use inline style
    borderClass: '',
    textClass: '',
    badgeBg: hex,
    isSystem: false,
  };
}

/** Get a consistent row tint style for color-tinted table rows */
export function getFunnelRowStyle(
  key: FunnelColorKey,
  colorConfig?: PresalesColorConfig
): React.CSSProperties {
  const meta = getFunnelDisplayMeta(key, colorConfig);
  return {
    borderLeft: `4px solid ${meta.hex}`,
    backgroundColor: `${meta.hex}0d`,   // 5% opacity
  };
}

// Keep backward compat with existing code that uses TENDER_FUNNEL_META
export const TENDER_FUNNEL_META = SYSTEM_FUNNEL_META;

/** Legacy function name still used by some existing components */
export function deriveTenderFunnelStatus(tender: TenderFunnelSignals): SystemFunnelKey {
  return deriveSystemFunnelKey(tender);
}

/** Legacy function — maps a system funnel key to display meta (backward compat) */
export function getTenderFunnelMeta(key?: SystemFunnelKey | string): FunnelDisplayMeta {
  if (!key) return SYSTEM_FUNNEL_META['Blue'];
  return SYSTEM_FUNNEL_META[key as SystemFunnelKey] ?? SYSTEM_FUNNEL_META['Blue'];
}
