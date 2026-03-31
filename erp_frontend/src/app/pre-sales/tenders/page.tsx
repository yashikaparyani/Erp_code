'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Download, Filter, Loader2, Plus, RefreshCw, Search, X,
} from 'lucide-react';

type Tender = {
  name: string;
  title: string;
  client: string;
  department: string;
  tender_type: string;
  status: string;
  estimated_value: number;
  submission_date: string;
  opening_date: string;
  bid_validity: string;
  emd_amount: number;
  funnel_color: string;
  created_by: string;
};

function formatCurrency(v?: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
}

async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed');
  return (payload.data ?? payload) as T;
}

const statusColor: Record<string, string> = {
  INITIAL: 'bg-gray-100 text-gray-700',
  IDENTIFIED: 'bg-sky-100 text-sky-700',
  DOCUMENT_PURCHASED: 'bg-blue-100 text-blue-700',
  PREPARING_BID: 'bg-violet-100 text-violet-700',
  BID_SUBMITTED: 'bg-amber-100 text-amber-700',
  TECHNICAL_OPENED: 'bg-indigo-100 text-indigo-700',
  FINANCIAL_OPENED: 'bg-cyan-100 text-cyan-700',
  WON: 'bg-emerald-100 text-emerald-700',
  LOST: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function TendersListPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (fStatus) filters.status = fStatus;
      const data = await callOps<Tender[]>('get_tenders', { filters: JSON.stringify(filters), limit_page_length: 200 });
      setTenders(data);
    } catch {
      setTenders([]);
    }
    setLoading(false);
  }, [fStatus]);

  useEffect(() => { void load(); }, [load]);

  const filtered = search
    ? tenders.filter((t) => `${t.name} ${t.title} ${t.client}`.toLowerCase().includes(search.toLowerCase()))
    : tenders;

  const exportCsv = () => {
    const headers = ['Tender', 'Title', 'Client', 'Status', 'Estimated Value', 'Submission', 'EMD'];
    const rows = filtered.map((t) => [t.name, t.title || '', t.client || '', t.status || '', String(t.estimated_value || 0), t.submission_date || '', String(t.emd_amount || 0)]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statuses = ['INITIAL', 'IDENTIFIED', 'DOCUMENT_PURCHASED', 'PREPARING_BID', 'BID_SUBMITTED', 'TECHNICAL_OPENED', 'FINANCIAL_OPENED', 'WON', 'LOST', 'CANCELLED'];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tenders</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">All tenders in a searchable list. For the funnel view, use the <Link href="/pre-sales/dashboard" className="text-blue-600 hover:text-blue-800 underline">Pre-Sales Dashboard</Link>.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn btn-secondary text-xs flex items-center gap-1"><Download className="h-3.5 w-3.5" /> Export</button>
          <Link href="/pre-sales/dashboard" className="btn btn-primary text-xs flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Create Tender</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: tenders.length, color: 'text-gray-900' },
          { label: 'Active Pipeline', value: tenders.filter((t) => !['WON', 'LOST', 'CANCELLED'].includes(t.status)).length, color: 'text-blue-600' },
          { label: 'Won', value: tenders.filter((t) => t.status === 'WON').length, color: 'text-emerald-600' },
          { label: 'Total Value', value: formatCurrency(tenders.reduce((s, t) => s + (t.estimated_value || 0), 0)), color: 'text-violet-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className={`text-lg font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center text-sm">
        <Filter className="h-4 w-4 text-gray-400" />
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenders..." className="border rounded pl-7 pr-2 py-1 text-sm w-48" />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        {(search || fStatus) && (
          <button onClick={() => { setSearch(''); setFStatus(''); }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        <button onClick={load} className="ml-auto text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading tenders...
        </div>
      )}

      {!loading && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">Tender</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Est. Value</th>
                  <th className="px-4 py-3">EMD</th>
                  <th className="px-4 py-3">Submission</th>
                  <th className="px-4 py-3">Opening</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/pre-sales/${t.name}`} className="font-medium text-blue-600 hover:text-blue-800">{t.title || t.name}</Link>
                      <div className="text-[10px] text-gray-400">{t.name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{t.client || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[t.status] || 'bg-gray-100 text-gray-700'}`}>
                        {(t.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(t.estimated_value)}</td>
                    <td className="px-4 py-3 text-gray-500">{t.emd_amount ? formatCurrency(t.emd_amount) : '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{t.submission_date || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{t.opening_date || '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No tenders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
