'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ban, ExternalLink, RefreshCw } from 'lucide-react';

interface CancelBidRow {
  bid_id: string;
  tender_id: string;
  tender_number: string;
  tender_title: string;
  client?: string;
  organization?: string;
  bid_amount: number;
  bid_date?: string;
  result_date?: string;
  cancel_reason?: string;
}

const formatDate = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatValue = (value?: number) => {
  if (!value) return '-';
  if (value >= 1e7) return `Rs ${(value / 1e7).toFixed(1)} Cr`;
  if (value >= 1e5) return `Rs ${(value / 1e5).toFixed(1)} L`;
  return `Rs ${value.toLocaleString('en-IN')}`;
};

export default function CancelBidPage() {
  const [rows, setRows] = useState<CancelBidRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pre-sales/cancel-bids', { cache: 'no-store' });
      const json = await response.json();
      setRows(json.success ? json.data || [] : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRows();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Ban className="w-6 h-6 text-slate-600" />
            Cancel Bid
          </h1>
          <p className="text-xs text-[var(--text-soft)] mt-0.5">
            View cancelled bids, including LOI-stage rejections and direct cancellations
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
              {['#', 'Bid ID', 'Tender', 'Bid Date', 'Bid Amount', 'Result Date', 'Reason', 'Actions'].map((heading) => (
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
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-[var(--text-soft)]">
                  No cancelled bids found
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.bid_id} className="hover:bg-[var(--surface-hover)] group">
                  <td className="px-3 py-3 text-[var(--text-soft)]">{index + 1}</td>
                  <td className="px-3 py-3 font-mono font-semibold text-[var(--text-main)]">{row.bid_id}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-[var(--text-main)]">{row.tender_number}</div>
                    <div className="mt-1 text-[11px] text-[var(--text-soft)]">{row.tender_title || '-'}</div>
                  </td>
                  <td className="px-3 py-3">{formatDate(row.bid_date)}</td>
                  <td className="px-3 py-3 font-semibold">{formatValue(row.bid_amount)}</td>
                  <td className="px-3 py-3">{formatDate(row.result_date)}</td>
                  <td className="px-3 py-3 max-w-[280px] text-[var(--text-soft)]">{row.cancel_reason || '-'}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/pre-sales/bids/${row.bid_id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border border-[var(--border-subtle)] opacity-0 group-hover:opacity-100 transition-all hover:border-[var(--accent)]"
                    >
                      Open Bid <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
