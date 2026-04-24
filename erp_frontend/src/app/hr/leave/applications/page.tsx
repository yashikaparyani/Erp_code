'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2, AlertCircle, Filter, Users, CheckCircle2, Clock, XCircle,
} from 'lucide-react';

interface LeaveApp {
  name: string;
  employee?: string;
  leave_type?: string;
  leave_status?: string;
  from_date?: string;
  to_date?: string;
  total_leave_days?: number;
  reason?: string;
  submitted_by?: string;
  approved_by?: string;
}

function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'SUBMITTED').toUpperCase();
  const style = s === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'SUBMITTED' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function LeaveApplicationsPage() {
  const [rows, setRows] = useState<LeaveApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await fetch(`/api/hr/leave/applications${qs}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setRows(payload.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { reload(); }, [reload]);

  const total = rows.length;
  const pending = rows.filter(r => r.leave_status === 'SUBMITTED').length;
  const approved = rows.filter(r => r.leave_status === 'APPROVED').length;
  const rejected = rows.filter(r => r.leave_status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leave Applications</h1>
          <p className="text-sm text-gray-500 mt-1">Submit, approve and track leave requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All statuses</option>
            {['SUBMITTED', 'APPROVED', 'REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Users className="w-5 h-5" /></div><div><div className="stat-value">{total}</div><div className="stat-label">Total</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{pending}</div><div className="stat-label">Pending</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-100 text-rose-600"><XCircle className="w-5 h-5" /></div><div><div className="stat-value">{rejected}</div><div className="stat-label">Rejected</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div><div><div className="stat-value">{approved}</div><div className="stat-label">Approved</div></div></div></div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <AlertCircle className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No leave applications found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Application</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Leave Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">From</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">To</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Days</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(r => (
                  <tr key={r.name} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3"><Link href={`/hr/leave/applications/${encodeURIComponent(r.name)}`} className="font-medium text-blue-700 hover:underline">{r.name}</Link></td>
                    <td className="px-4 py-3 text-gray-700">{r.employee || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{r.leave_type || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(r.from_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(r.to_date)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{r.total_leave_days ?? '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.leave_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
