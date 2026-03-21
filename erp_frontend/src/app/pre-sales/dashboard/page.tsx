'use client';
import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { RefreshCw, LayoutDashboard, Palette, TrendingUp, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import FunnelColorCard from '../../../components/presales/FunnelColorCard';
import FunnelFilterStrip, { DashboardFilters, DEFAULT_FILTERS, loadSavedFilters, saveFilters } from '../../../components/presales/FunnelFilterStrip';
import ActiveFilterChips from '../../../components/presales/ActiveFilterChips';
import FunnelTenderTable from '../../../components/presales/FunnelTenderTable';
import ColorLegendPage from '../../../components/presales/ColorLegendPage';
import { FunnelColorKey, SYSTEM_FUNNEL_META, USER_SLOT_DEFAULTS, PresalesColorConfig, getFunnelDisplayMeta } from '../../../components/tenderFunnel';

// ─────────────────────────────────────────────────── Types

interface StatsData {
  system: Record<string, { count: number; value: number }>;
  user: Record<string, { count: number; value: number; label: string; color: string; hex: string }>;
  quick_stats: {
    total_pipeline: number;
    active_bids: number;
    won_this_year: number;
    emd_pending_refund: number;
    overdue: number;
    due_this_week: number;
  };
}

type Tab = 'dashboard' | 'color-legend';

// ─────────────────────────────────────────────────── Helpers

function formatCrore(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

function buildQueryString(filters: DashboardFilters): string {
  const p = new URLSearchParams();
  if (filters.search) p.set('search', filters.search);
  if (filters.funnelColor) p.set('funnel_color', filters.funnelColor);
  if (filters.userColorSlot) p.set('user_color_slot', filters.userColorSlot);
  if (filters.status.length) p.set('status', filters.status.join(','));
  if (filters.assignee.length) p.set('assignee', filters.assignee.join(','));
  if (filters.client.length) p.set('client', filters.client.join(','));
  if (filters.goNoGo) p.set('go_no_go', filters.goNoGo);
  if (filters.technical) p.set('technical', filters.technical);
  if (filters.bidStatus.length) p.set('bid_status', filters.bidStatus.join(','));
  if (filters.emdStatus) p.set('emd_status', filters.emdStatus);
  if (filters.enquiryPending) p.set('enquiry_pending', filters.enquiryPending);
  if (filters.puNzd) p.set('pu_nzd', filters.puNzd);
  if (filters.submissionDateFrom) p.set('submission_date_from', filters.submissionDateFrom);
  if (filters.submissionDateTo) p.set('submission_date_to', filters.submissionDateTo);
  if (filters.bidOpeningFrom) p.set('bid_opening_from', filters.bidOpeningFrom);
  if (filters.bidOpeningTo) p.set('bid_opening_to', filters.bidOpeningTo);
  if (filters.preBidMeetingFrom) p.set('pre_bid_meeting_from', filters.preBidMeetingFrom);
  if (filters.preBidMeetingTo) p.set('pre_bid_meeting_to', filters.preBidMeetingTo);
  if (filters.corrigendumDateFrom) p.set('corrigendum_date_from', filters.corrigendumDateFrom);
  if (filters.corrigendumDateTo) p.set('corrigendum_date_to', filters.corrigendumDateTo);
  if (filters.createdFrom) p.set('created_from', filters.createdFrom);
  if (filters.createdTo) p.set('created_to', filters.createdTo);
  if (filters.overdueOnly) p.set('overdue_only', '1');
  if (filters.dueThisWeek) p.set('due_this_week', '1');
  if (filters.dueThisMonth) p.set('due_this_month', '1');
  if (filters.valueMin) p.set('value_min', filters.valueMin);
  if (filters.valueMax) p.set('value_max', filters.valueMax);
  if (filters.emdMin) p.set('emd_min', filters.emdMin);
  if (filters.emdMax) p.set('emd_max', filters.emdMax);
  if (filters.pbgPercentMin) p.set('pbg_percent_min', filters.pbgPercentMin);
  if (filters.pbgPercentMax) p.set('pbg_percent_max', filters.pbgPercentMax);
  p.set('sort_by', filters.sortBy);
  p.set('sort_dir', filters.sortDir);
  return p.toString();
}

// ─────────────────────────────────────────────────── Quick Stat Card

function QuickStat({ icon: Icon, label, value, accent, sub }: { icon: any; label: string; value: number | string; accent: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 border border-[var(--border-subtle)]">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[11px] text-[var(--text-soft)]">{label}</p>
        <p className="text-lg font-bold leading-tight" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-[10px] text-[var(--text-muted)]">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────── Main Page

export default function PresalesDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [tenders, setTenders] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [colorConfig, setColorConfig] = useState<PresalesColorConfig | undefined>(undefined);
  const [activeFunnelKey, setActiveFunnelKey] = useState<FunnelColorKey | ''>('');
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingTenders, setIsLoadingTenders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();

  // Load saved filters on mount
  useEffect(() => {
    const saved = loadSavedFilters();
    setFilters(saved);
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/presales/funnel-stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard stats');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch color config
  const fetchColorConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/presales/color-config');
      const json = await res.json();
      if (json.success) setColorConfig(json.data);
    } catch {}
  }, []);

  // Fetch tenders
  const fetchTenders = useCallback(async (f: DashboardFilters) => {
    setIsLoadingTenders(true);
    try {
      const qs = buildQueryString(f);
      const res = await fetch(`/api/presales/funnel-tenders?${qs}`);
      const json = await res.json();
      if (json.success) {
        setTenders(json.data || []);
        setTotalCount(json.total || 0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tenders');
    } finally {
      setIsLoadingTenders(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchColorConfig();
  }, []);

  // Fetch tenders when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenders(filters);
      saveFilters(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, fetchTenders]);

  const handleRefresh = () => {
    setLastRefresh(new Date());
    fetchStats();
    fetchTenders(filters);
    fetchColorConfig();
  };

  const handleFilterChange = (partial: Partial<DashboardFilters>) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, ...partial }));
    });
  };

  const handleClearAll = () => {
    startTransition(() => {
      setFilters(DEFAULT_FILTERS);
      setActiveFunnelKey('');
    });
  };

  const handleFunnelCardClick = (key: FunnelColorKey) => {
    startTransition(() => {
      if (activeFunnelKey === key) {
        setActiveFunnelKey('');
        if (key.startsWith('USER_SLOT_')) {
          setFilters((p) => ({ ...p, userColorSlot: '', funnelColor: '' }));
        } else {
          setFilters((p) => ({ ...p, funnelColor: '', userColorSlot: '' }));
        }
      } else {
        setActiveFunnelKey(key);
        if (key.startsWith('USER_SLOT_')) {
          const slot = key.replace('USER_SLOT_', '');
          setFilters((p) => ({ ...p, userColorSlot: slot, funnelColor: '' }));
        } else {
          setFilters((p) => ({ ...p, funnelColor: key as string, userColorSlot: '' }));
        }
      }
    });
  };

  const handleSortChange = (col: 'submission_date' | 'estimated_value' | 'emd_amount' | 'creation') => {
    setFilters((prev) => ({
      ...prev,
      sortBy: col,
      sortDir: prev.sortBy === col ? (prev.sortDir === 'asc' ? 'desc' : 'asc') : 'asc',
    }));
  };

  const handleUpdateColorSlot = async (slot: number, color: string, label: string, description: string) => {
    await fetch('/api/presales/color-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, color, label, description }),
    });
    await fetchColorConfig();
    await fetchStats(); // refresh counts
  };

  // ─── Derived data for funnel bar
  const systemKeys = Object.keys(SYSTEM_FUNNEL_META) as (keyof typeof SYSTEM_FUNNEL_META)[];
  const userSlotKeys = Array.from({ length: 6 }, (_, i) => `USER_SLOT_${i + 1}` as FunnelColorKey);

  return (
    <div className="min-h-screen bg-[var(--bg)] space-y-5 p-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[var(--accent)]" />
            Pre-Sales Funnel Dashboard
          </h1>
          <p className="text-xs text-[var(--text-soft)] mt-0.5">
            Live pipeline tracker · Sorted by Closing Date · Last refreshed: {lastRefresh.toLocaleTimeString('en-IN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-soft)]">{totalCount} tenders</span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-[var(--border-subtle)] text-[var(--text-main)] hover:border-[var(--accent)] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats || isLoadingTenders ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 p-1 bg-white/70 rounded-2xl border border-[var(--border-subtle)] w-fit">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { key: 'color-legend', label: 'Color Legend & Customization', icon: Palette },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === key
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── DASHBOARD TAB ─── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* Quick Stats Row */}
          {stats?.quick_stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <QuickStat icon={DollarSign} label="Total Pipeline" value={formatCrore(stats.quick_stats.total_pipeline)} accent="#6366f1" />
              <QuickStat icon={TrendingUp} label="Active Bids" value={stats.quick_stats.active_bids} accent="#3b82f6" />
              <QuickStat icon={CheckCircle} label="Won This Year" value={stats.quick_stats.won_this_year} accent="#22c55e" />
              <QuickStat icon={AlertCircle} label="Overdue" value={stats.quick_stats.overdue} accent="#ef4444" />
              <QuickStat icon={Clock} label="Due This Week" value={stats.quick_stats.due_this_week} accent="#f97316" />
              <QuickStat icon={AlertCircle} label="EMD Pending Refund" value={stats.quick_stats.emd_pending_refund} accent="#eab308" />
            </div>
          )}

          {/* ── 12-Color Funnel Bar ─── */}
          <div className="space-y-3">
            {/* System Colors: Row 1 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {systemKeys.map((key) => {
                const bucketData = stats?.system?.[key];
                return (
                  <FunnelColorCard
                    key={key}
                    colorKey={key}
                    count={bucketData?.count ?? 0}
                    value={bucketData?.value ?? 0}
                    isActive={activeFunnelKey === key}
                    onClick={() => handleFunnelCardClick(key)}
                    colorConfig={colorConfig}
                  />
                );
              })}
            </div>

            {/* User Slots: Row 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {userSlotKeys
                .filter((key, i) => {
                  const bucketData = stats?.user?.[key];
                  const cfgKey = `slot_${i + 1}`;
                  const cfgSlot = colorConfig?.[cfgKey];
                  // Import USER_SLOT_DEFAULTS inline to compare default label
                  const defaultLabel = require('../../../components/tenderFunnel').USER_SLOT_DEFAULTS[key]?.label;
                  // Show only if label is NOT default or count > 0
                  return ((cfgSlot?.label && cfgSlot.label.trim() !== '' && cfgSlot.label !== defaultLabel) || (bucketData?.count > 0));
                })
                .map((key, i) => {
                  const bucketData = stats?.user?.[key];
                  const cfgKey = `slot_${i + 1}`;
                  const cfgSlot = colorConfig?.[cfgKey];
                  const slotConfig = cfgSlot ? colorConfig : undefined;
                  return (
                    <FunnelColorCard
                      key={key}
                      colorKey={key}
                      count={bucketData?.count ?? 0}
                      value={bucketData?.value ?? 0}
                      isActive={activeFunnelKey === key}
                      onClick={() => handleFunnelCardClick(key)}
                      colorConfig={slotConfig}
                    />
                  );
                })}
            </div>
          </div>

          {/* ── Filters ─── */}
          <FunnelFilterStrip
            filters={filters}
            onChange={handleFilterChange}
            onClearAll={handleClearAll}
            resultCount={tenders.length}
            totalCount={totalCount}
            colorConfig={colorConfig}
          />

          {/* ── Active Filter Chips ─── */}
          <ActiveFilterChips
            filters={filters}
            onChange={handleFilterChange}
            onClearAll={handleClearAll}
            colorConfig={colorConfig}
          />

          {/* ── Tender Table ─── */}
          <FunnelTenderTable
            tenders={tenders}
            filters={filters}
            onSortChange={handleSortChange}
            isLoading={isLoadingTenders || isPending}
            colorConfig={colorConfig}
          />

          {/* Pagination info */}
          {totalCount > tenders.length && (
            <p className="text-center text-xs text-[var(--text-soft)] py-2">
              Showing {tenders.length} of {totalCount} tenders — refine your filters to narrow results
            </p>
          )}
        </div>
      )}

      {/* ─── COLOR LEGEND TAB ─── */}
      {activeTab === 'color-legend' && (
        <ColorLegendPage
          colorConfig={colorConfig}
          onUpdateSlot={handleUpdateColorSlot}
        />
      )}
    </div>
  );
}
