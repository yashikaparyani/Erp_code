'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarRange, CheckCircle2, Loader2, ReceiptText, Search, XCircle } from 'lucide-react';

type SalarySlip = {
  name: string;
  employee?: string;
  employee_name?: string;
  posting_date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  gross_pay?: number;
  net_pay?: number;
  currency?: string;
  company?: string;
};

type PayrollStats = {
  total: number;
  draft: number;
  submitted: number;
  cancelled: number;
  gross_pay: number;
  net_pay: number;
};

const STATUS_OPTIONS = ['', 'Draft', 'Submitted', 'Cancelled'] as const;

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(value?: number, currency?: string) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusChip(status?: string) {
  const normalized = String(status || 'Draft');
  if (normalized === 'Submitted') {
    return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Submitted</span>;
  }
  if (normalized === 'Cancelled') {
    return <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">Cancelled</span>;
  }
  return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{normalized}</span>;
}

export default function PayrollPage() {
  const [rows, setRows] = useState<SalarySlip[]>([]);
  const [stats, setStats] = useState<PayrollStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('include_stats', '1');
        if (statusFilter) params.set('status', statusFilter);
        if (search.trim()) params.set('search', search.trim());

        const response = await fetch(`/api/hr/payroll?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || payload.success === false) {
          throw new Error(payload.message || 'Failed to load payroll records');
        }
        setRows(payload.data || []);
        setStats(payload.stats || null);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load payroll records');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, statusFilter]);

  const summary = useMemo(
    () => stats || { total: 0, draft: 0, submitted: 0, cancelled: 0, gross_pay: 0, net_pay: 0 },
    [stats],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <p className="mt-1 text-sm text-gray-500">
          Native HRMS salary slips, payroll totals, and processing status in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <div className="stat-card"><div className="stat-label">Total Slips</div><div className="stat-value mt-1 flex items-center gap-2"><ReceiptText className="h-5 w-5 text-blue-500" />{summary.total}</div></div>
        <div className="stat-card"><div className="stat-label">Draft</div><div className="stat-value mt-1 flex items-center gap-2"><CalendarRange className="h-5 w-5 text-amber-500" />{summary.draft}</div></div>
        <div className="stat-card"><div className="stat-label">Submitted</div><div className="stat-value mt-1 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" />{summary.submitted}</div></div>
        <div className="stat-card"><div className="stat-label">Cancelled</div><div className="stat-value mt-1 flex items-center gap-2"><XCircle className="h-5 w-5 text-rose-500" />{summary.cancelled}</div></div>
        <div className="stat-card"><div className="stat-label">Gross Pay</div><div className="stat-value mt-1 text-base">{formatMoney(summary.gross_pay)}</div></div>
        <div className="stat-card"><div className="stat-label">Net Pay</div><div className="stat-value mt-1 text-base flex items-center gap-2"><Banknote className="h-5 w-5 text-[#1e6b87]" />{formatMoney(summary.net_pay)}</div></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search salary slip, employee, company..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6b87]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6b87]"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading payroll...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500">
          No salary slips found for the current filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Salary Slip</th>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Payroll Window</th>
                <th className="px-4 py-3 font-medium">Posting Date</th>
                <th className="px-4 py-3 font-medium">Gross Pay</th>
                <th className="px-4 py-3 font-medium">Net Pay</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{row.name}</div>
                    <div className="text-xs text-gray-400">{row.company || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{row.employee_name || row.employee || '-'}</div>
                    <div className="text-xs text-gray-400">{row.employee || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(row.start_date)} to {formatDate(row.end_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(row.posting_date)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatMoney(row.gross_pay, row.currency)}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{formatMoney(row.net_pay, row.currency)}</td>
                  <td className="px-4 py-3">{statusChip(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-gray-500">
        Payroll records are sourced from HRMS <code>Salary Slip</code>. Creation and payroll runs still happen through native HRMS workflows.
      </div>
    </div>
  );
}
