'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Banknote, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface WonBidRow {
  tender_id: string;
  tender_number: string;
  tender_title: string;
  client?: string;
  organization?: string;
  bid_id: string;
  bid_date?: string;
  bid_amount: number;
  bid_status?: string;
  result_date?: string;
  loi_n_expected?: number;
  loi_n_received?: number;
  has_bid: boolean;
}

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatValue(v?: number) {
  if (!v) return '-';
  if (v >= 1e7) return `Rs ${(v / 1e7).toFixed(1)} Cr`;
  if (v >= 1e5) return `Rs ${(v / 1e5).toFixed(1)} L`;
  return `Rs ${v.toLocaleString('en-IN')}`;
}

export default function WonBidsPage() {
  const [rows, setRows] = useState<WonBidRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pre-sales/won-bids', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setRows(json.data || []);
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRows();
  }, []);

  const totalValue = rows.reduce((sum, row) => sum + (row.bid_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Banknote className="w-6 h-6 text-green-600" />
            Won Bids & LOI Tracker
          </h1>
          <p className="text-xs text-[var(--text-soft)] mt-0.5">
            {rows.length} won tenders · Total: {formatValue(totalValue)}
          </p>
        </div>
        <button
          onClick={() => void fetchRows()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-[var(--surface)]">
            <tr className="border-b border-[var(--border-subtle)]">
              {['#', 'Bid ID', 'Tender', 'Bid Date', 'Won Value', 'Result Date', 'LOI Status', 'Actions'].map((heading) => (
                <th key={heading} className="text-left px-3 py-3 font-semibold text-[var(--text-soft)] uppercase tracking-wide">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={8} className="px-3 py-3">
                    <div className="h-4 bg-green-50 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-[var(--text-soft)]">
                  No won tenders yet
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const allLoi = row.loi_n_expected ? row.loi_n_received === row.loi_n_expected : null;
                return (
                  <tr
                    key={`${row.tender_id}-${row.bid_id || 'no-bid'}`}
                    className="hover:bg-green-50/30 group"
                    style={{ borderLeft: '4px solid #22c55e', backgroundColor: '#22c55e08' }}
                  >
                    <td className="px-3 py-3 text-[var(--text-soft)]">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <div className="font-mono font-semibold text-green-700">{row.bid_id || 'No linked bid'}</div>
                      {row.bid_status ? <div className="mt-1 text-[11px] text-[var(--text-soft)]">Status: {row.bid_status}</div> : null}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/pre-sales/${row.tender_id}`} className="text-[var(--accent)] hover:underline">
                        {row.tender_number}
                      </Link>
                      <div className="mt-1 text-[11px] text-[var(--text-soft)]">{row.tender_title || '-'}</div>
                    </td>
                    <td className="px-3 py-3">{formatDate(row.bid_date)}</td>
                    <td className="px-3 py-3 font-bold text-green-700">{formatValue(row.bid_amount)}</td>
                    <td className="px-3 py-3">{formatDate(row.result_date)}</td>
                    <td className="px-3 py-3">
                      {row.loi_n_expected ? (
                        <div className="flex items-center gap-1.5">
                          {allLoi ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-amber-500" />}
                          <span className={allLoi ? 'text-green-700 font-semibold' : 'text-amber-600'}>
                            {row.loi_n_received}/{row.loi_n_expected} received
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">{row.has_bid ? 'No LOI rows' : 'Bid not linked yet'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/pre-sales/${row.tender_id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border border-green-200 text-green-700 opacity-0 group-hover:opacity-100 transition-all hover:bg-green-50"
                      >
                        Open <ExternalLink className="w-2.5 h-2.5" />
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
