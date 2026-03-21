'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Building2,
  ChevronRight,
  Loader2,
} from 'lucide-react';

type Employee = {
  name: string;
  employee_name: string;
  first_name?: string;
  last_name?: string;
  designation?: string;
  department?: string;
  branch?: string;
  status: string;
  gender?: string;
  date_of_joining?: string;
  cell_phone?: string;
  company_email?: string;
  personal_email?: string;
  image?: string;
  company?: string;
};

type Stats = {
  total: number;
  active: number;
  inactive: number;
  male: number;
  female: number;
  departments: number;
};

const STATUS_OPTIONS = ['', 'Active', 'Inactive', 'Suspended', 'Left'] as const;

function statusChip(status: string) {
  switch (status) {
    case 'Active':
      return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Active</span>;
    case 'Inactive':
      return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">Inactive</span>;
    case 'Suspended':
      return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Suspended</span>;
    case 'Left':
      return <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">Left</span>;
    default:
      return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">{status}</span>;
  }
}

export default function EmployeeDirectoryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (deptFilter) params.set('department', deptFilter);
      if (search) params.set('search', search);

      const [empRes, statsRes] = await Promise.all([
        fetch(`/api/hr/employees?${params}`),
        fetch('/api/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'get_employee_stats' }),
        }),
      ]);

      const empData = await empRes.json();
      const statsData = await statsRes.json();

      if (!empRes.ok || empData.success === false) throw new Error(empData.message || 'Failed to load employees');
      setEmployees(empData.data || []);
      setStats(statsData.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter, deptFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { loadData(); }, 400);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(set).sort();
  }, [employees]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Directory</h1>
          <p className="mt-1 text-sm text-gray-500">Search, filter, and manage employee records</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value mt-1 flex items-center gap-2"><Users className="h-5 w-5 text-gray-400" />{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value mt-1 flex items-center gap-2"><UserCheck className="h-5 w-5 text-emerald-500" />{stats.active}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Inactive / Left</div>
            <div className="stat-value mt-1 flex items-center gap-2"><UserX className="h-5 w-5 text-gray-400" />{stats.inactive}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Male</div>
            <div className="stat-value mt-1">{stats.male}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Female</div>
            <div className="stat-value mt-1">{stats.female}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Departments</div>
            <div className="stat-value mt-1 flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-500" />{stats.departments}</div>
          </div>
        </div>
      )}

      {/* Filters toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, phone, designation..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6b87]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6b87]"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6b87]"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading employees...
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={loadData} className="mt-4 rounded-lg bg-[#1e6b87] px-4 py-2 text-sm font-medium text-white hover:bg-[#185a73]">Retry</button>
        </div>
      ) : !employees.length ? (
        <div className="py-16 text-center text-sm text-gray-500">
          {search || statusFilter || deptFilter ? 'No employees match the current filters.' : 'No employees found in the system.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Designation</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map(emp => (
                <tr key={emp.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/hr/employees/${encodeURIComponent(emp.name)}`} className="flex items-center gap-3 group">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e6b87] text-xs font-bold text-white uppercase shrink-0">
                        {(emp.first_name?.[0] || emp.employee_name?.[0] || '?')}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900 group-hover:text-[#1e6b87]">{emp.employee_name}</div>
                        <div className="truncate text-xs text-gray-400">{emp.name}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{emp.designation || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{emp.department || '-'}</td>
                  <td className="px-4 py-3">{statusChip(emp.status)}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {emp.cell_phone || emp.company_email || emp.personal_email || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/hr/employees/${encodeURIComponent(emp.name)}`} className="text-gray-400 hover:text-[#1e6b87]">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
