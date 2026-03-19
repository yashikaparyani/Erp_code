'use client';

export interface Tender {
  name: string;
  tender_number?: string;
  title?: string;
  client?: string;
  organization?: string;
  submission_date?: string;
  status?: string;
  tender_owner?: string;
  estimated_value?: number;
  emd_amount?: number;
  pbg_amount?: number;
  creation?: string;
  modified?: string;
}

export interface TenderResult {
  name: string;
  result_id?: string;
  tender?: string;
  reference_no?: string;
  organization_name?: string;
  result_stage?: string;
  publication_date?: string;
  winning_amount?: number;
  winner_company?: string;
  site_location?: string;
  is_fresh?: number;
}

export interface Competitor {
  name: string;
  company_name?: string;
  organization?: string;
  win_count?: number;
  loss_count?: number;
  win_rate?: number;
  typical_bid_range_min?: number;
  typical_bid_range_max?: number;
}

export function formatCurrency(value?: number) {
  const amount = value || 0;
  if (!amount) return 'Rs 0';
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)} Lakh`;
  return `Rs ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value?: number, digits = 1) {
  return `${(value || 0).toFixed(digits)}%`;
}

export function formatDate(value?: string) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function statusBadge(status?: string) {
  const map: Record<string, string> = {
    DRAFT: 'badge-gray',
    SUBMITTED: 'badge-blue',
    UNDER_EVALUATION: 'badge-yellow',
    WON: 'badge-green',
    LOST: 'badge-red',
    CANCELLED: 'badge-gray',
    DROPPED: 'badge-orange',
    CONVERTED_TO_PROJECT: 'badge-purple',
  };
  return map[status || ''] || 'badge-gray';
}

export function resultStageBadge(stage?: string) {
  const map: Record<string, string> = {
    'Technical Evaluation': 'badge-blue',
    'Financial Evaluation': 'badge-yellow',
    'LoI Issued': 'badge-green',
    'Work Order': 'badge-green',
    AOC: 'badge-green',
  };
  return map[stage || ''] || 'badge-gray';
}

export function byDateDesc<T>(rows: T[], pick: (row: T) => string | undefined) {
  return [...rows].sort((a, b) => {
    const aTs = new Date(pick(a) || 0).getTime();
    const bTs = new Date(pick(b) || 0).getTime();
    return bTs - aTs;
  });
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}
