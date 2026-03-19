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
    toneClass: 'bg-red-100 text-red-700 border border-red-200',
    dotClass: 'bg-red-500',
    shortLabel: 'Red',
    colorName: 'Red',
  },
  'Working but not confirmed by technical': {
    toneClass: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    dotClass: 'bg-yellow-500',
    shortLabel: 'Yellow',
    colorName: 'Yellow',
  },
  'EMD done and technical confirmed': {
    toneClass: 'bg-green-100 text-green-700 border border-green-200',
    dotClass: 'bg-green-500',
    shortLabel: 'Green',
    colorName: 'Green',
  },
  'Tender under evaluation for GO-NOGO': {
    toneClass: 'bg-blue-100 text-blue-700 border border-blue-200',
    dotClass: 'bg-blue-500',
    shortLabel: 'Blue',
    colorName: 'Blue',
  },
  'Tender not bided but under observation': {
    toneClass: 'bg-pink-100 text-pink-700 border border-pink-200',
    dotClass: 'bg-pink-500',
    shortLabel: 'Pink',
    colorName: 'Pink',
  },
  'Locked Tender': {
    toneClass: 'bg-orange-100 text-orange-700 border border-orange-200',
    dotClass: 'bg-orange-500',
    shortLabel: 'Orange',
    colorName: 'Orange',
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
