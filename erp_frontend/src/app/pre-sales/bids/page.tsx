'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Banknote, Ban, ExternalLink, ListChecks, RefreshCw, Timer } from 'lucide-react';

type WonBidRow = {
  tender_id: string;
  tender_number: string;
  tender_title: string;
  bid_id: string;
  bid_amount: number;
  bid_date?: string;
  result_date?: string;
  bid_status?: string;
  loi_n_expected?: number;
  loi_n_received?: number;
  loi_decision_status?: string;
};

type InProcessBidRow = {
  bid_id: string;
  tender_number: string;
  tender_title: string;
  bid_amount: number;
  tenure_years?: number;
  tenure_end_date?: string;
  days_left?: number | null;
  closure_letter_received?: boolean;
  completion_certificate_due?: boolean;
};

type CancelBidRow = {
  bid_id: string;
  tender_number: string;
  tender_title: string;
  bid_amount: number;
  tender: string;
  bid_date?: string;
  result_date?: string;
  cancel_reason?: string;
};

type BidInnerTab = 'won' | 'in-process' | 'cancel';

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatValue(value?: number) {
  if (!value) return '-';
  if (value >= 1e7) return `Rs ${(value / 1e7).toFixed(1)} Cr`;
  if (value >= 1e5) return `Rs ${(value / 1e5).toFixed(1)} L`;
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export default function BidsPage() {
  const [activeTab, setActiveTab] = useState<BidInnerTab>('won');
  const [wonRows, setWonRows] = useState<WonBidRow[]>([]);
  const [inProcessRows, setInProcessRows] = useState<InProcessBidRow[]>([]);
  const [cancelRows, setCancelRows] = useState<CancelBidRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'won') {
        const response = await fetch('/api/pre-sales/won-bids', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        setWonRows(payload?.success && Array.isArray(payload.data) ? payload.data : []);
      } else if (activeTab === 'in-process') {
        const response = await fetch('/api/pre-sales/in-process-bids', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        setInProcessRows(payload?.success && Array.isArray(payload.data) ? payload.data : []);
      } else {
        const response = await fetch('/api/pre-sales/cancel-bids', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        setCancelRows(payload?.success && Array.isArray(payload.data) ? payload.data : []);
      }
    } catch {
      if (activeTab === 'won') setWonRows([]);
      else if (activeTab === 'in-process') setInProcessRows([]);
      else setCancelRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const currentCount =
    activeTab === 'won' ? wonRows.length :
      activeTab === 'in-process' ? inProcessRows.length :
        cancelRows.length;

  const wonTotal = wonRows.reduce((sum, row) => sum + (row.bid_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[var(--bg)] p-3 sm:p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-[var(--accent)]" />
            Bids Management
          </h1>
          <p className="text-xs text-[var(--text-soft)] mt-0.5">
            Sidebar mein sirf Bids rakha gaya hai. Neeche tabs se detail section dekho.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchRows()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-white/80 p-3">
        <button
          type="button"
          onClick={() => setActiveTab('won')}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
            activeTab === 'won'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-[var(--border-subtle)] bg-white text-[var(--text-muted)] hover:border-green-200 hover:text-green-700'
          }`}
        >
          <Banknote className="h-3.5 w-3.5" /> Won Bids & LOI
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('in-process')}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
            activeTab === 'in-process'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-[var(--border-subtle)] bg-white text-[var(--text-muted)] hover:border-emerald-200 hover:text-emerald-700'
          }`}
        >
          <Timer className="h-3.5 w-3.5" /> In Process Bid
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cancel')}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
            activeTab === 'cancel'
              ? 'border-slate-300 bg-slate-100 text-slate-700'
              : 'border-[var(--border-subtle)] bg-white text-[var(--text-muted)] hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          <Ban className="h-3.5 w-3.5" /> Cancel Bid
        </button>

        <span className="text-xs text-[var(--text-soft)] sm:ml-auto">
          {currentCount} rows
          {activeTab === 'won' ? ` · Total ${formatValue(wonTotal)}` : ''}
        </span>
      </div>

      <div className="table-scroll rounded-2xl border border-[var(--border-subtle)] shadow-sm">
        {activeTab === 'won' ? (
          <table className="w-full min-w-[860px] text-xs">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--border-subtle)]">
                {['#', 'Bid ID', 'Tender', 'Bid Date', 'Won Value', 'Result Date', 'LOI Status', 'Decision', 'Actions'].map((heading) => (
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
                    <td colSpan={9} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-green-50" /></td>
                  </tr>
                ))
              ) : wonRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-[var(--text-soft)]">No won bids are pending in the LOI stage</td>
                </tr>
              ) : (
                wonRows.map((row, index) => {
                  const allLoi = row.loi_n_expected ? row.loi_n_received === row.loi_n_expected : false;
                  return (
                    <tr key={row.bid_id} className="group hover:bg-green-50/30">
                      <td className="px-3 py-3 text-[var(--text-soft)]">{index + 1}</td>
                      <td className="px-3 py-3">
                        <div className="font-mono font-semibold text-green-700">{row.bid_id}</div>
                        {row.bid_status ? <div className="mt-1 text-[11px] text-[var(--text-soft)]">Status: {row.bid_status}</div> : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-[var(--text-main)]">{row.tender_number}</div>
                        <div className="mt-1 text-[11px] text-[var(--text-soft)]">{row.tender_title || '-'}</div>
                      </td>
                      <td className="px-3 py-3">{formatDate(row.bid_date)}</td>
                      <td className="px-3 py-3 font-bold text-green-700">{formatValue(row.bid_amount)}</td>
                      <td className="px-3 py-3">{formatDate(row.result_date)}</td>
                      <td className="px-3 py-3">
                        {row.loi_n_expected ? (
                          <span className={allLoi ? 'font-semibold text-green-700' : 'text-amber-600'}>{row.loi_n_received}/{row.loi_n_expected} received</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">No LOI rows</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[var(--text-soft)]">{row.loi_decision_status || 'PENDING'}</td>
                      <td className="px-3 py-3">
                        <Link href={`/pre-sales/bids/${row.bid_id}`} className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-2 py-1 text-[10px] text-green-700 opacity-0 transition-all group-hover:opacity-100 hover:bg-green-50">
                          Open Bid <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : activeTab === 'in-process' ? (
          <table className="w-full min-w-[860px] text-xs">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--border-subtle)]">
                {['#', 'Bid ID', 'Tender', 'Accepted Value', 'Tenure', 'End Date', 'Countdown', 'Completion', 'Actions'].map((heading) => (
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
                    <td colSpan={9} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                  </tr>
                ))
              ) : inProcessRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-[var(--text-soft)]">No in-process bids available</td>
                </tr>
              ) : (
                inProcessRows.map((row, index) => (
                  <tr key={row.bid_id} className="group hover:bg-[var(--surface-hover)]">
                    <td className="px-3 py-3 text-[var(--text-soft)]">{index + 1}</td>
                    <td className="px-3 py-3 font-mono font-semibold text-[var(--text-main)]">{row.bid_id}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[var(--text-main)]">{row.tender_number}</div>
                      <div className="mt-1 text-[11px] text-[var(--text-soft)]">{row.tender_title || '-'}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-emerald-700">{formatValue(row.bid_amount)}</td>
                    <td className="px-3 py-3">{row.tenure_years || 0} years</td>
                    <td className="px-3 py-3">{formatDate(row.tenure_end_date)}</td>
                    <td className="px-3 py-3">
                      {typeof row.days_left === 'number' ? (
                        <span className={row.days_left <= 90 ? 'font-semibold text-amber-700' : 'text-[var(--text-main)]'}>{row.days_left} days</span>
                      ) : (
                        <span className="text-[var(--text-soft)]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {row.closure_letter_received ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Received</span>
                      ) : row.completion_certificate_due ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">Certificate Due</span>
                      ) : (
                        <span className="text-[var(--text-soft)]">Not due</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/pre-sales/bids/${row.bid_id}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[10px] opacity-0 transition-all group-hover:opacity-100 hover:border-[var(--accent)]">
                        Open Bid <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[860px] text-xs">
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
                    <td colSpan={8} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                  </tr>
                ))
              ) : cancelRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[var(--text-soft)]">No cancelled bids found</td>
                </tr>
              ) : (
                cancelRows.map((row, index) => (
                  <tr key={row.bid_id} className="group hover:bg-[var(--surface-hover)]">
                    <td className="px-3 py-3 text-[var(--text-soft)]">{index + 1}</td>
                    <td className="px-3 py-3 font-mono font-semibold text-[var(--text-main)]">{row.bid_id}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[var(--text-main)]">{row.tender_number}</div>
                      <div className="mt-1 text-[11px] text-[var(--text-soft)]">{row.tender_title || '-'}</div>
                    </td>
                    <td className="px-3 py-3">{formatDate(row.bid_date)}</td>
                    <td className="px-3 py-3 font-semibold">{formatValue(row.bid_amount)}</td>
                    <td className="px-3 py-3">{formatDate(row.result_date)}</td>
                    <td className="max-w-[280px] px-3 py-3 text-[var(--text-soft)]">{row.cancel_reason || '-'}</td>
                    <td className="px-3 py-3">
                      <Link href={`/pre-sales/bids/${row.bid_id}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[10px] opacity-0 transition-all group-hover:opacity-100 hover:border-[var(--accent)]">
                        Open Bid <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
