'use client';
import React from 'react';
import Link from 'next/link';
import {
  ArrowUpDown, ArrowUp, ArrowDown, ExternalLink,
  User, AlertCircle, FileText,
} from 'lucide-react';
import { FunnelColorKey, PresalesColorConfig, getFunnelDisplayMeta } from '../tenderFunnel';
import { DashboardFilters } from './FunnelFilterStrip';

interface TenderRow {
  name: string;
  tender_number: string;
  title: string;
  client: string;
  organization?: string;
  submission_date?: string;
  status: string;
  funnel_color_key: FunnelColorKey;
  estimated_value?: number;
  emd_required?: boolean | number;
  emd_amount?: number;
  pbg_required?: boolean | number;
  pbg_percent?: number;
  tender_owner?: string;
  go_no_go_status?: string;
  technical_readiness?: string;
  enquiry_pending?: boolean | number;
  pu_nzd_qualified?: boolean | number;
  bid_opening_date?: string;
  latest_corrigendum_date?: string;
  consultant_name?: string;
  latest_bid?: {
    name?: string;
    status?: string;
    bid_amount?: number;
    bid_date?: string;
  } | null;
  closure_letter_received?: boolean | number;
}

type SortableColumn = 'submission_date' | 'estimated_value' | 'emd_amount' | 'creation';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: '#e5e7eb', text: '#374151', label: 'Draft' },
  GO_NO_GO_PENDING: { bg: '#dbeafe', text: '#1d4ed8', label: 'GO/NO-GO Pending' },
  NO_GO: { bg: '#fce7f3', text: '#9d174d', label: 'No-Go' },
  QUALIFIED: { bg: '#fef3c7', text: '#92400e', label: 'Qualified' },
  TECHNICAL_IN_PROGRESS: { bg: '#e0e7ff', text: '#4338ca', label: 'Technical In Progress' },
  TECHNICAL_NOT_QUALIFIED: { bg: '#ffedd5', text: '#c2410c', label: 'Technical Not Qualified' },
  BID_READY: { bg: '#dcfce7', text: '#166534', label: 'Bid Ready' },
  SUBMITTED: { bg: '#ffd60a20', text: '#b45309', label: 'Bid Submitted' },
  UNDER_EVALUATION: { bg: '#e0e7ff', text: '#4338ca', label: 'Evaluation' },
  WON: { bg: '#dcfce7', text: '#166534', label: 'Won' },
  LOST: { bg: '#fee2e2', text: '#991b1b', label: 'Lost' },
  CANCELLED: { bg: '#fee2e2', text: '#7c2d12', label: 'Cancelled' },
  CONVERTED_TO_PROJECT: { bg: '#dcfce7', text: '#166534', label: 'Converted to Project' },
};

const BID_STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#f3f4f6', text: '#6b7280' },
  SUBMITTED: { bg: '#fef9c3', text: '#854d0e' },
  UNDER_EVALUATION: { bg: '#e0e7ff', text: '#4338ca' },
  WON: { bg: '#dcfce7', text: '#166534' },
  LOST: { bg: '#fee2e2', text: '#991b1b' },
  CANCEL: { bg: '#f1f5f9', text: '#475569' },
  RETENDER: { bg: '#fce7f3', text: '#9d174d' },
};

function getBidStatusLabel(status?: string) {
  if (!status) return '';
  if (status === 'UNDER_EVALUATION') return 'Under Clarification';
  if (status === 'CANCEL') return 'Cancelled';
  return status.replace(/_/g, ' ');
}

function formatDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

function formatValue(v?: number) {
  if (!v) return '—';
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

function isOverdue(date?: string) {
  if (!date) return false;
  return new Date(date) < new Date();
}

interface Props {
  tenders: TenderRow[];
  filters: DashboardFilters;
  onSortChange: (col: SortableColumn) => void;
  isLoading?: boolean;
  colorConfig?: PresalesColorConfig;
}

function SortIcon({ col, filters }: { col: string; filters: DashboardFilters }) {
  if (filters.sortBy !== col) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />;
  return filters.sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[var(--accent)]" /> : <ArrowDown className="w-3.5 h-3.5 text-[var(--accent)]" />;
}

export default function FunnelTenderTable({ tenders, filters, onSortChange, isLoading, colorConfig }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    );
  }

  if (tenders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--text-soft)]">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">No tenders match your filters</p>
        <p className="text-xs mt-1">Try relaxing the filter criteria</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] shadow-sm">
      <table className="w-full text-xs">
        <thead className="bg-[var(--surface)] sticky top-0 z-10">
          <tr className="border-b border-[var(--border-subtle)]">
            <th className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide w-8">#</th>
            <th className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide min-w-[200px]">Tender / Client</th>
            <th className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide">Status</th>
            <th className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide">Bid</th>
            <th
              className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-main)] select-none"
              onClick={() => onSortChange('submission_date')}
            >
              <span className="inline-flex items-center gap-1">
                Closing Date <SortIcon col="submission_date" filters={filters} />
              </span>
            </th>
            <th
              className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-main)] select-none"
              onClick={() => onSortChange('estimated_value')}
            >
              <span className="inline-flex items-center gap-1">
                Value <SortIcon col="estimated_value" filters={filters} />
              </span>
            </th>
            <th className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide">GO/NO-GO</th>
            <th className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide">Technical</th>
            <th className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide">Flags</th>
            <th className="text-right px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {tenders.map((tender, idx) => {
            const meta = getFunnelDisplayMeta(tender.funnel_color_key, colorConfig);
            const overdue = isOverdue(tender.submission_date);
            const statusMeta = STATUS_BADGE[tender.status] || { bg: '#f3f4f6', text: '#374151', label: tender.status };
            const bidMeta = BID_STATUS_BADGE[tender.latest_bid?.status || ''];

            return (
              <tr
                key={tender.name}
                className="hover:bg-[var(--surface-hover)] transition-colors group"
                style={{
                  borderLeft: `4px solid ${meta.hex}`,
                  backgroundColor: `${meta.hex}08`,
                }}
              >
                {/* # */}
                <td className="px-3 py-3 text-[var(--text-soft)]">{idx + 1}</td>

                {/* Tender / Client */}
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: meta.hex }}
                        title={meta.label}
                      />
                      <span className="font-semibold text-[var(--text-main)] truncate max-w-[180px]" title={tender.title}>
                        {tender.tender_number}
                      </span>
                    </div>
                    <span className="text-[var(--text-soft)] truncate max-w-[220px] pl-4" title={tender.title}>
                      {tender.title}
                    </span>
                    <div className="flex items-center gap-1 pl-4 text-[var(--text-muted)]">
                      <User className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[160px]">{tender.client}</span>
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
                  >
                    {statusMeta.label}
                  </span>
                </td>

                {/* Bid Status */}
                <td className="px-3 py-3">
                  {tender.latest_bid?.status ? (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: bidMeta?.bg ?? '#f3f4f6', color: bidMeta?.text ?? '#374151' }}
                    >
                      {getBidStatusLabel(tender.latest_bid.status)}
                    </span>
                  ) : <span className="text-[var(--text-muted)]">—</span>}
                </td>

                {/* Closing Date */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    {overdue && !['WON', 'LOST', 'CANCELLED', 'CONVERTED_TO_PROJECT'].includes(tender.status) && (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                    <span className={overdue && !['WON', 'LOST', 'CANCELLED', 'CONVERTED_TO_PROJECT'].includes(tender.status) ? 'text-red-600 font-semibold' : 'text-[var(--text-main)]'}>
                      {formatDate(tender.submission_date)}
                    </span>
                  </div>
                  {tender.bid_opening_date && (
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      Open: {formatDate(tender.bid_opening_date)}
                    </div>
                  )}
                </td>

                {/* Value */}
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-[var(--text-main)]">{formatValue(tender.estimated_value)}</span>
                    {tender.emd_required ? (
                      <span className="text-[10px] text-amber-600">EMD: {formatValue(tender.emd_amount)}</span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)]">No EMD</span>
                    )}
                  </div>
                </td>

                {/* GO/NO-GO */}
                <td className="px-3 py-3">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      tender.go_no_go_status === 'GO' ? 'bg-green-100 text-green-700' :
                      tender.go_no_go_status === 'NO_GO' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {tender.go_no_go_status || 'PENDING'}
                  </span>
                </td>

                {/* Technical */}
                <td className="px-3 py-3">
                  <span
                    className={`text-[10px] font-medium ${
                      tender.technical_readiness === 'APPROVED' ? 'text-green-600' :
                      tender.technical_readiness === 'REJECTED' ? 'text-red-600' :
                      tender.technical_readiness === 'PENDING_APPROVAL' ? 'text-amber-600' :
                      'text-gray-400'
                    }`}
                  >
                    {tender.technical_readiness?.replace('_', ' ') || 'NOT STARTED'}
                  </span>
                </td>

                {/* Flags */}
                <td className="px-3 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {tender.enquiry_pending ? <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">ENQ</span> : null}
                    {tender.pu_nzd_qualified ? <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded">PU-NZD</span> : null}
                    {tender.closure_letter_received ? <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">CLOSED</span> : null}
                    {tender.consultant_name ? <span className="text-[9px] bg-teal-100 text-teal-700 px-1 rounded" title={tender.consultant_name}>CONS</span> : null}
                    {tender.latest_corrigendum_date ? <span className="text-[9px] bg-rose-100 text-rose-700 px-1 rounded">CORR</span> : null}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/pre-sales/${tender.name}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold bg-white border border-[var(--border-subtle)] text-[var(--text-main)] opacity-0 group-hover:opacity-100 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    Open <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
