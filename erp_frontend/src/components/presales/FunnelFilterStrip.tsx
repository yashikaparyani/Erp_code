'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, SlidersHorizontal, Calendar, DollarSign } from 'lucide-react';
import {
  SYSTEM_FUNNEL_META,
  USER_SLOT_DEFAULTS,
  SystemFunnelKey,
  PresalesColorConfig,
} from '../tenderFunnel';

export interface DashboardFilters {
  search: string;
  funnelColor: string;
  userColorSlot: string;
  status: string[];
  assignee: string[];
  client: string[];
  goNoGo: string;
  technical: string;
  bidStatus: string[];
  emdStatus: string;
  enquiryPending: string;
  puNzd: string;
  submissionDateFrom: string;
  submissionDateTo: string;
  bidOpeningFrom: string;
  bidOpeningTo: string;
  preBidMeetingFrom: string;
  preBidMeetingTo: string;
  corrigendumDateFrom: string;
  corrigendumDateTo: string;
  createdFrom: string;
  createdTo: string;
  overdueOnly: boolean;
  dueThisWeek: boolean;
  dueThisMonth: boolean;
  valueMin: string;
  valueMax: string;
  emdMin: string;
  emdMax: string;
  pbgPercentMin: string;
  pbgPercentMax: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export const DEFAULT_FILTERS: DashboardFilters = {
  search: '',
  funnelColor: '',
  userColorSlot: '',
  status: [],
  assignee: [],
  client: [],
  goNoGo: '',
  technical: '',
  bidStatus: [],
  emdStatus: '',
  enquiryPending: '',
  puNzd: '',
  submissionDateFrom: '',
  submissionDateTo: '',
  bidOpeningFrom: '',
  bidOpeningTo: '',
  preBidMeetingFrom: '',
  preBidMeetingTo: '',
  corrigendumDateFrom: '',
  corrigendumDateTo: '',
  createdFrom: '',
  createdTo: '',
  overdueOnly: false,
  dueThisWeek: false,
  dueThisMonth: false,
  valueMin: '',
  valueMax: '',
  emdMin: '',
  emdMax: '',
  pbgPercentMin: '',
  pbgPercentMax: '',
  sortBy: 'submission_date',
  sortDir: 'asc',
};

const FILTER_STORAGE_KEY = 'presales_dashboard_filters_v1';

export function loadSavedFilters(): DashboardFilters {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function saveFilters(f: DashboardFilters) {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(f));
  } catch {}
}

interface Props {
  filters: DashboardFilters;
  onChange: (f: Partial<DashboardFilters>) => void;
  onClearAll: () => void;
  resultCount?: number;
  totalCount?: number;
  colorConfig?: PresalesColorConfig;
  assigneeOptions?: string[];
  clientOptions?: string[];
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
        active
          ? 'bg-[var(--accent)] text-white border-transparent'
          : 'bg-white text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--accent)]'
      }`}
    >
      {label}
    </button>
  );
}

function MultiSelectPill({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (val: string) => {
    const next = selected.includes(val) ? selected.filter((x) => x !== val) : [...selected, val];
    onChange(next);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
          selected.length > 0
            ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-strong)]'
            : 'bg-white border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent)]'
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-[var(--accent)] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
            {selected.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-lg border border-[var(--border-subtle)] min-w-[180px] max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-hover)] flex items-center gap-2 ${
                selected.includes(opt.value) ? 'text-[var(--accent-strong)] font-semibold' : 'text-[var(--text-main)]'
              }`}
            >
              <span className={`w-3 h-3 rounded border flex-shrink-0 ${selected.includes(opt.value) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-subtle)]'}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FunnelFilterStrip({
  filters,
  onChange,
  onClearAll,
  resultCount,
  totalCount,
  colorConfig,
  assigneeOptions = [],
  clientOptions = [],
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const systemColors = Object.keys(SYSTEM_FUNNEL_META) as SystemFunnelKey[];
  const hasActiveFilters =
    filters.search ||
    filters.funnelColor ||
    filters.userColorSlot ||
    filters.status.length > 0 ||
    filters.assignee.length > 0 ||
    filters.goNoGo ||
    filters.technical ||
    filters.bidStatus.length > 0 ||
    filters.overdueOnly ||
    filters.dueThisWeek ||
    filters.dueThisMonth ||
    filters.submissionDateFrom ||
    filters.submissionDateTo ||
    filters.valueMin ||
    filters.valueMax;

  return (
    <div className="space-y-2">
      {/* ── Primary filter strip ── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white/80 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-soft)]" />
          <input
            type="text"
            placeholder="Search tender, client, consultant..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent)] text-[var(--text-main)]"
          />
        </div>

        {/* Funnel Color quick filter */}
        <div className="flex items-center gap-1">
          {systemColors.map((key) => {
            const meta = SYSTEM_FUNNEL_META[key];
            const isActive = filters.funnelColor === key;
            return (
              <button
                key={key}
                title={meta.label}
                onClick={() => onChange({ funnelColor: isActive ? '' : key })}
                className={`h-6 w-6 rounded-full border-2 transition-all hover:scale-110 ${isActive ? 'border-white shadow-md scale-110' : 'border-transparent opacity-70'}`}
                style={{ backgroundColor: meta.hex }}
              />
            );
          })}
        </div>

        {/* Status multi-select */}
        <MultiSelectPill
          label="Status"
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'SUBMITTED', label: 'Submitted' },
            { value: 'UNDER_EVALUATION', label: 'Under Evaluation' },
            { value: 'WON', label: 'Won' },
            { value: 'LOST', label: 'Lost' },
            { value: 'DROPPED', label: 'Dropped' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          selected={filters.status}
          onChange={(v) => onChange({ status: v })}
        />

        {/* Assignee */}
        {assigneeOptions.length > 0 && (
          <MultiSelectPill
            label="Assignee"
            options={assigneeOptions.map((a) => ({ value: a, label: a.split('@')[0] }))}
            selected={filters.assignee}
            onChange={(v) => onChange({ assignee: v })}
          />
        )}

        {/* Date quick toggles */}
        <Toggle label="⚠ Overdue" active={filters.overdueOnly} onClick={() => onChange({ overdueOnly: !filters.overdueOnly, dueThisWeek: false, dueThisMonth: false })} />
        <Toggle label="📅 This Week" active={filters.dueThisWeek} onClick={() => onChange({ dueThisWeek: !filters.dueThisWeek, overdueOnly: false, dueThisMonth: false })} />
        <Toggle label="🗓 This Month" active={filters.dueThisMonth} onClick={() => onChange({ dueThisMonth: !filters.dueThisMonth, overdueOnly: false, dueThisWeek: false })} />

        {/* Advanced + Clear */}
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
            advancedOpen ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-strong)]' : 'bg-white border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent)]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          More Filters
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}

        {/* Result count */}
        {totalCount !== undefined && (
          <span className="ml-auto text-xs text-[var(--text-soft)]">
            Showing <strong>{resultCount ?? totalCount}</strong> of <strong>{totalCount}</strong>
          </span>
        )}
      </div>

      {/* ── Advanced filter drawer ── */}
      {advancedOpen && (
        <div className="p-4 bg-white/90 rounded-2xl border border-[var(--border-subtle)] shadow-md grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* GO/NO-GO */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide">GO/NO-GO</label>
            <select
              value={filters.goNoGo}
              onChange={(e) => onChange({ goNoGo: e.target.value })}
              className="w-full text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="GO">GO</option>
              <option value="NO_GO">NO-GO</option>
            </select>
          </div>

          {/* Technical */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide">Technical</label>
            <select
              value={filters.technical}
              onChange={(e) => onChange({ technical: e.target.value })}
              className="w-full text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white"
            >
              <option value="">All</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Bid Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide">Bid Status</label>
            <select
              value={filters.bidStatus[0] || ''}
              onChange={(e) => onChange({ bidStatus: e.target.value ? [e.target.value] : [] })}
              className="w-full text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white"
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_EVALUATION">Under Evaluation</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
              <option value="CANCEL">Cancelled</option>
              <option value="RETENDER">Retender</option>
            </select>
          </div>

          {/* EMD Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide">EMD Status</label>
            <select
              value={filters.emdStatus}
              onChange={(e) => onChange({ emdStatus: e.target.value })}
              className="w-full text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white"
            >
              <option value="">All</option>
              <option value="required_submitted">Required</option>
              <option value="not_required">Not Required</option>
            </select>
          </div>

          {/* Enquiry Pending */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide">Enquiry Pending</label>
            <select
              value={filters.enquiryPending}
              onChange={(e) => onChange({ enquiryPending: e.target.value })}
              className="w-full text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white"
            >
              <option value="">All</option>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>

          {/* PU-NZD */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide">PU-NZD Qualified</label>
            <select
              value={filters.puNzd}
              onChange={(e) => onChange({ puNzd: e.target.value })}
              className="w-full text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white"
            >
              <option value="">All</option>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>

          {/* Submission Date Range */}
          <div className="space-y-1 col-span-2">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide flex items-center gap-1"><Calendar className="w-3 h-3" />Submission Date</label>
            <div className="flex gap-2">
              <input type="date" value={filters.submissionDateFrom} onChange={(e) => onChange({ submissionDateFrom: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
              <input type="date" value={filters.submissionDateTo} onChange={(e) => onChange({ submissionDateTo: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
            </div>
          </div>

          {/* Bid Opening Date */}
          <div className="space-y-1 col-span-2">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide flex items-center gap-1"><Calendar className="w-3 h-3" />Bid Opening Date</label>
            <div className="flex gap-2">
              <input type="date" value={filters.bidOpeningFrom} onChange={(e) => onChange({ bidOpeningFrom: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
              <input type="date" value={filters.bidOpeningTo} onChange={(e) => onChange({ bidOpeningTo: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
            </div>
          </div>

          {/* Value Range */}
          <div className="space-y-1 col-span-2">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide flex items-center gap-1"><DollarSign className="w-3 h-3" />Est. Value (₹)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={filters.valueMin} onChange={(e) => onChange({ valueMin: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
              <input type="number" placeholder="Max" value={filters.valueMax} onChange={(e) => onChange({ valueMax: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
            </div>
          </div>

          {/* Pre-bid Meeting */}
          <div className="space-y-1 col-span-2">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide flex items-center gap-1"><Calendar className="w-3 h-3" />Pre-Bid Meeting</label>
            <div className="flex gap-2">
              <input type="date" value={filters.preBidMeetingFrom} onChange={(e) => onChange({ preBidMeetingFrom: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
              <input type="date" value={filters.preBidMeetingTo} onChange={(e) => onChange({ preBidMeetingTo: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
            </div>
          </div>

          {/* Corrigendum Date */}
          <div className="space-y-1 col-span-2">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide flex items-center gap-1"><Calendar className="w-3 h-3" />Corrigendum Date</label>
            <div className="flex gap-2">
              <input type="date" value={filters.corrigendumDateFrom} onChange={(e) => onChange({ corrigendumDateFrom: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
              <input type="date" value={filters.corrigendumDateTo} onChange={(e) => onChange({ corrigendumDateTo: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
            </div>
          </div>

          {/* EMD Amount Range */}
          <div className="space-y-1 col-span-2">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide">EMD Amount (₹)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={filters.emdMin} onChange={(e) => onChange({ emdMin: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
              <input type="number" placeholder="Max" value={filters.emdMax} onChange={(e) => onChange({ emdMax: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
            </div>
          </div>

          {/* PBG % Range */}
          <div className="space-y-1 col-span-2">
            <label className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wide">PBG % Range</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min %" value={filters.pbgPercentMin} onChange={(e) => onChange({ pbgPercentMin: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
              <input type="number" placeholder="Max %" value={filters.pbgPercentMax} onChange={(e) => onChange({ pbgPercentMax: e.target.value })} className="flex-1 text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white" />
            </div>
          </div>

          {/* Reset button */}
          <div className="col-span-full flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <button
              onClick={onClearAll}
              className="px-4 py-2 text-xs rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            >
              Reset All
            </button>
            <button
              onClick={() => setAdvancedOpen(false)}
              className="px-4 py-2 text-xs rounded-xl bg-[var(--accent)] text-white hover:opacity-90"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
