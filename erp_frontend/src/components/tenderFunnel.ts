export const TENDER_FUNNEL_OPTIONS = [
  'Not Qualified Tender',
  'Working but not confirmed by technical',
  'EMD done and technical confirmed',
  'Tender under evaluation for GO-NOGO',
  'Tender not bided but under observation',
  'Locked Tender',
] as const;

export type TenderFunnelStatus = typeof TENDER_FUNNEL_OPTIONS[number];

export type TenderFunnelSignals = {
  status?: string;
  go_no_go_status?: string;
  technical_readiness?: string;
  commercial_readiness?: string;
  finance_readiness?: string;
  submission_status?: string;
  emd_required?: number | boolean;
  pbg_required?: number | boolean;
};

type FunnelMeta = {
  toneClass: string;
  dotClass: string;
  shortLabel: string;
  colorName: string;
};

export const TENDER_FUNNEL_META: Record<TenderFunnelStatus, FunnelMeta> = {
  'Not Qualified Tender': {
    toneClass: 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm',
    dotClass: 'bg-rose-500',
    shortLabel: 'Red',
    colorName: 'Red',
  },
  'Working but not confirmed by technical': {
    toneClass: 'bg-slate-50 text-slate-700 border border-slate-200 shadow-sm',
    dotClass: 'bg-amber-500',
    shortLabel: 'Neutral',
    colorName: 'Slate',
  },
  'EMD done and technical confirmed': {
    toneClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm',
    dotClass: 'bg-emerald-500',
    shortLabel: 'Green',
    colorName: 'Green',
  },
  'Tender under evaluation for GO-NOGO': {
    toneClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm',
    dotClass: 'bg-indigo-500',
    shortLabel: 'Blue',
    colorName: 'Blue',
  },
  'Tender not bided but under observation': {
    toneClass: 'bg-violet-50 text-violet-700 border border-violet-200 shadow-sm',
    dotClass: 'bg-violet-500',
    shortLabel: 'Violet',
    colorName: 'Violet',
  },
  'Locked Tender': {
    toneClass: 'bg-stone-100 text-stone-700 border border-stone-200 shadow-sm',
    dotClass: 'bg-stone-500',
    shortLabel: 'Locked',
    colorName: 'Stone',
  },
};

export const DEFAULT_TENDER_FUNNEL_STATUS: TenderFunnelStatus = 'Working but not confirmed by technical';

export function deriveTenderFunnelStatus(signals: TenderFunnelSignals): TenderFunnelStatus {
  const status = signals.status || '';
  const goNoGo = signals.go_no_go_status || 'PENDING';
  const technical = signals.technical_readiness || 'NOT_STARTED';
  const commercial = signals.commercial_readiness || 'NOT_STARTED';
  const finance = signals.finance_readiness || 'NOT_STARTED';
  const submission = signals.submission_status || 'NOT_READY';
  const financeApplicable = Boolean(signals.emd_required) || Boolean(signals.pbg_required);

  if (status === 'LOST' || status === 'NO_GO' || goNoGo === 'NO_GO') {
    return 'Not Qualified Tender';
  }

  if (status === 'CANCELLED' || status === 'DROPPED') {
    return 'Tender not bided but under observation';
  }

  if (status === 'WON' || status === 'CONVERTED_TO_PROJECT' || status === 'SUBMITTED' || status === 'UNDER_EVALUATION') {
    return 'Locked Tender';
  }

  if (goNoGo !== 'GO') {
    return 'Tender under evaluation for GO-NOGO';
  }

  const technicalApproved = technical === 'APPROVED';
  const commercialApproved = commercial === 'APPROVED';
  const financeApproved = !financeApplicable || finance === 'APPROVED';

  if (technicalApproved && commercialApproved && financeApproved && submission !== 'REJECTED') {
    return 'EMD done and technical confirmed';
  }

  return 'Working but not confirmed by technical';
}

export function getTenderFunnelMeta(status?: string) {
  if (!status || !(status in TENDER_FUNNEL_META)) {
    return {
      toneClass: 'bg-slate-100 text-slate-700 border border-slate-200 shadow-sm',
      dotClass: 'bg-gray-400',
      shortLabel: 'N/A',
      colorName: 'Gray',
    };
  }

  return TENDER_FUNNEL_META[status as TenderFunnelStatus];
}
