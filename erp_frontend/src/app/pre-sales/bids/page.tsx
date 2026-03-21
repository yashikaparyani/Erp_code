'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ListChecks, ExternalLink, RefreshCw, Filter } from 'lucide-react';

interface BidRow {
  name: string;
  tender: string;
  bid_date: string;
  status: string;
  bid_amount: number;
  result_date?: string;
  result_remarks?: string;
  is_latest: number;
}

const BID_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT:            { bg: '#f3f4f6', text: '#374151' },
  SUBMITTED:        { bg: '#fef9c3', text: '#854d0e' },
  UNDER_EVALUATION: { bg: '#e0e7ff', text: '#4338ca' },
  WON:              { bg: '#dcfce7', text: '#166534' },
  LOST:             { bg: '#fee2e2', text: '#991b1b' },
  CANCEL:           { bg: '#f1f5f9', text: '#475569' },
  RETENDER:         { bg: '#fce7f3', text: '#9d174d' },
};

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatValue(v?: number) {
  if (!v) return '—';
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export default function BidsPage() {
  const [bids, setBids] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [latestOnly, setLatestOnly] = useState(false);

  const fetchBids = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (latestOnly) params.set('is_latest', '1');
      const res = await fetch(`/api/bids?${params}`);
      const json = await res.json();
      if (json.success) setBids(json.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchBids(); }, [statusFilter, latestOnly]);

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-[var(--accent)]" />
            Bids Management
          </h1>
          <p className="text-xs text-[var(--text-soft)] mt-0.5">Track all bids across their full lifecycle</p>
        </div>
        <button onClick={fetchBids} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white/80 rounded-2xl border border-[var(--border-subtle)]">
        <Filter className="w-3.5 h-3.5 text-[var(--text-soft)]" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs rounded-xl border border-[var(--border-subtle)] px-2 py-1.5 bg-white"
        >
          <option value="">All Statuses</option>
          {Object.keys(BID_STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
          <input type="checkbox" checked={latestOnly} onChange={(e) => setLatestOnly(e.target.checked)} className="rounded" />
          Latest bids only
        </label>
        <span className="ml-auto text-xs text-[var(--text-soft)]">{bids.length} bids</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-[var(--surface)]">
            <tr className="border-b border-[var(--border-subtle)]">
              {['#', 'Bid ID', 'Tender', 'Bid Date', 'Bid Amount', 'Status', 'Result Date', 'Remarks', 'Actions'].map((h) => (
                <th key={h} className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={9} className="px-3 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : bids.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-[var(--text-soft)]">No bids found</td></tr>
            ) : (
              bids.map((bid, idx) => {
                const sc = BID_STATUS_COLORS[bid.status] || { bg: '#f3f4f6', text: '#374151' };
                return (
                  <tr key={bid.name} className="hover:bg-[var(--surface-hover)] group">
                    <td className="px-3 py-3 text-[var(--text-soft)]">{idx + 1}</td>
                    <td className="px-3 py-3 font-mono font-semibold text-[var(--text-main)]">{bid.name}</td>
                    <td className="px-3 py-3">
                      <Link href={`/pre-sales/${bid.tender}`} className="text-[var(--accent)] hover:underline">{bid.tender}</Link>
                    </td>
                    <td className="px-3 py-3">{formatDate(bid.bid_date)}</td>
                    <td className="px-3 py-3 font-semibold">{formatValue(bid.bid_amount)}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>
                        {bid.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">{formatDate(bid.result_date)}</td>
                    <td className="px-3 py-3 max-w-[160px] truncate text-[var(--text-muted)]">{bid.result_remarks || '—'}</td>
                    <td className="px-3 py-3">
                      <Link href={`/pre-sales/${bid.tender}`} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border border-[var(--border-subtle)] opacity-0 group-hover:opacity-100 transition-all hover:border-[var(--accent)]">
                        View Tender <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
