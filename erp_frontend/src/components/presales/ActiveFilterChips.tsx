'use client';
import React from 'react';
import { X } from 'lucide-react';
import { DashboardFilters } from './FunnelFilterStrip';
import { SYSTEM_FUNNEL_META, PresalesColorConfig, USER_SLOT_DEFAULTS, UserSlotKey } from '../tenderFunnel';

interface Props {
  filters: DashboardFilters;
  onChange: (f: Partial<DashboardFilters>) => void;
  onClearAll: () => void;
  colorConfig?: PresalesColorConfig;
}

type ChipDef = { label: string; onRemove: () => void; hex?: string };

export default function ActiveFilterChips({ filters, onChange, onClearAll, colorConfig }: Props) {
  const chips: ChipDef[] = [];

  if (filters.search) {
    chips.push({ label: `Search: "${filters.search}"`, onRemove: () => onChange({ search: '' }) });
  }

  if (filters.funnelColor) {
    const meta = SYSTEM_FUNNEL_META[filters.funnelColor as keyof typeof SYSTEM_FUNNEL_META];
    chips.push({
      label: meta?.label ?? filters.funnelColor,
      hex: meta?.hex,
      onRemove: () => onChange({ funnelColor: '' }),
    });
  }

  if (filters.userColorSlot) {
    const slotKey = `USER_SLOT_${filters.userColorSlot}` as UserSlotKey;
    const cfgKey = `slot_${filters.userColorSlot}`;
    const label = colorConfig?.[cfgKey]?.label ?? USER_SLOT_DEFAULTS[slotKey]?.label ?? `Slot ${filters.userColorSlot}`;
    const hex = colorConfig?.[cfgKey]?.hex ?? USER_SLOT_DEFAULTS[slotKey]?.hex;
    chips.push({ label, hex, onRemove: () => onChange({ userColorSlot: '' }) });
  }

  filters.status.forEach((s) =>
    chips.push({ label: `Status: ${s}`, onRemove: () => onChange({ status: filters.status.filter((x) => x !== s) }) })
  );

  filters.assignee.forEach((a) =>
    chips.push({ label: `Assignee: ${a.split('@')[0]}`, onRemove: () => onChange({ assignee: filters.assignee.filter((x) => x !== a) }) })
  );

  if (filters.goNoGo) chips.push({ label: `GO/NO-GO: ${filters.goNoGo}`, onRemove: () => onChange({ goNoGo: '' }) });
  if (filters.technical) chips.push({ label: `Technical: ${filters.technical}`, onRemove: () => onChange({ technical: '' }) });

  filters.bidStatus.forEach((s) =>
    chips.push({ label: `Bid: ${s}`, onRemove: () => onChange({ bidStatus: filters.bidStatus.filter((x) => x !== s) }) })
  );

  if (filters.emdStatus) chips.push({ label: `EMD: ${filters.emdStatus.replace('_', ' ')}`, onRemove: () => onChange({ emdStatus: '' }) });
  if (filters.enquiryPending) chips.push({ label: filters.enquiryPending === '1' ? 'Enquiry Pending' : 'No Enquiry', onRemove: () => onChange({ enquiryPending: '' }) });
  if (filters.puNzd) chips.push({ label: filters.puNzd === '1' ? 'PU-NZD: Yes' : 'PU-NZD: No', onRemove: () => onChange({ puNzd: '' }) });
  if (filters.overdueOnly) chips.push({ label: '⚠ Overdue', onRemove: () => onChange({ overdueOnly: false }) });
  if (filters.dueThisWeek) chips.push({ label: '📅 Due This Week', onRemove: () => onChange({ dueThisWeek: false }) });
  if (filters.dueThisMonth) chips.push({ label: '🗓 Due This Month', onRemove: () => onChange({ dueThisMonth: false }) });
  if (filters.submissionDateFrom || filters.submissionDateTo) {
    chips.push({
      label: `Closing: ${filters.submissionDateFrom || '...'} → ${filters.submissionDateTo || '...'}`,
      onRemove: () => onChange({ submissionDateFrom: '', submissionDateTo: '' }),
    });
  }
  if (filters.valueMin || filters.valueMax) {
    chips.push({
      label: `Value: ₹${filters.valueMin||'0'} – ₹${filters.valueMax||'∞'}`,
      onRemove: () => onChange({ valueMin: '', valueMax: '' }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
          style={
            chip.hex
              ? { backgroundColor: `${chip.hex}15`, borderColor: `${chip.hex}50`, color: chip.hex }
              : { backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--accent-strong)' }
          }
        >
          <span className="truncate">{chip.label}</span>
          <button onClick={chip.onRemove} className="hover:opacity-70 transition-opacity">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-0.5"
      >
        <X className="w-3 h-3" />
        Clear All
      </button>
    </div>
  );
}
