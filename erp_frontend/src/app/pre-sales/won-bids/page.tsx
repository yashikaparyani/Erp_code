'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Banknote, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface WonBid {
  name: string;
  tender: string;
  bid_date: string;
  bid_amount: number;
  result_date?: string;
  loi_n_expected?: number;
  loi_n_received?: number;
}

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

export default function WonBidsPage() {
  const [bids, setBids] = useState<WonBid[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBids = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bids?status=WON&is_latest=1');
      const json = await res.json();
      if (json.success) setBids(json.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchBids(); }, []);

  const totalValue = bids.reduce((s, b) => s + (b.bid_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Banknote className="w-6 h-6 text-green-600" />
            Won Bids & LOI Tracker
          </h1>
          <p className="text-xs text-[var(--text-soft)] mt-0.5">
            {bids.length} won bids · Total: {formatValue(totalValue)}
          </p>
        </div>
        <button onClick={fetchBids} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-[var(--surface)]">
            <tr className="border-b border-[var(--border-subtle)]">
              {['#', 'Bid ID', 'Tender', 'Bid Date', 'Won Value', 'Result Date', 'LOI Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-3 py-3">
                  <div className="h-4 bg-green-50 rounded animate-pulse" />
                </td></tr>
              ))
            ) : bids.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-[var(--text-soft)]">No won bids yet</td></tr>
            ) : bids.map((bid, idx) => {
              const allLoi = bid.loi_n_expected ? bid.loi_n_received === bid.loi_n_expected : null;
              return (
                <tr key={bid.name} className="hover:bg-green-50/30 group" style={{ borderLeft: '4px solid #22c55e', backgroundColor: '#22c55e08' }}>
                  <td className="px-3 py-3 text-[var(--text-soft)]">{idx + 1}</td>
                  <td className="px-3 py-3 font-mono font-semibold text-green-700">{bid.name}</td>
                  <td className="px-3 py-3">
                    <Link href={`/pre-sales/${bid.tender}`} className="text-[var(--accent)] hover:underline">{bid.tender}</Link>
                  </td>
                  <td className="px-3 py-3">{formatDate(bid.bid_date)}</td>
                  <td className="px-3 py-3 font-bold text-green-700">{formatValue(bid.bid_amount)}</td>
                  <td className="px-3 py-3">{formatDate(bid.result_date)}</td>
                  <td className="px-3 py-3">
                    {bid.loi_n_expected ? (
                      <div className="flex items-center gap-1.5">
                        {allLoi ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-amber-500" />}
                        <span className={allLoi ? 'text-green-700 font-semibold' : 'text-amber-600'}>
                          {bid.loi_n_received}/{bid.loi_n_expected} received
                        </span>
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)]">No LOI rows</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/pre-sales/${bid.tender}`} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border border-green-200 text-green-700 opacity-0 group-hover:opacity-100 transition-all hover:bg-green-50">
                      Open <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
