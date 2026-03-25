'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  Printer,
  RefreshCcw,
  Search,
  Star,
  Users,
} from 'lucide-react';

type ReportRow = Record<string, string | number | null>;

type ReportDefinition = {
  key: string;
  title: string;
  category: string;
  description: string;
  formats: string[];
  rowCount: number;
  primaryMetric: string;
  drilldownPath: string;
  highlights: string[];
  updatedAt: string;
  columns: string[];
  rows: ReportRow[];
};

type ReportsPayload = {
  summary: {
    reports: number;
    totalRows: number;
    filteredEmployees: number;
    attendanceDate: string;
  };
  filters: {
    departments: string[];
    branches: string[];
    statuses: string[];
  };
  reports: ReportDefinition[];
};

const FAVORITES_KEY = 'hr-report-favorites';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function serializeCell(value: string | number | null | undefined) {
  return String(value ?? '');
}

function downloadBlob(content: BlobPart, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportReportAsXls(report: ReportDefinition) {
  const header = report.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const body = report.rows
    .map((row) => `<tr>${report.columns.map((column) => `<td>${escapeHtml(serializeCell(row[column]))}</td>`).join('')}</tr>`)
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8" /><style>table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}th,td{border:1px solid #cbd5e1;padding:6px 8px}th{background:#e2e8f0;text-transform:capitalize}</style></head><body><h2>${escapeHtml(report.title)}</h2><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  downloadBlob(html, 'application/vnd.ms-excel;charset=utf-8;', `${report.key}.xls`);
}

function exportReportAsPdf(report: ReportDefinition) {
  const header = report.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const body = report.rows
    .map((row) => `<tr>${report.columns.map((column) => `<td>${escapeHtml(serializeCell(row[column]))}</td>`).join('')}</tr>`)
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(report.title)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{font-size:22px;margin:0 0 8px}p{font-size:12px;color:#475569;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#e2e8f0;text-transform:capitalize} @media print{body{padding:0}}</style></head><body><h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.description)}</p><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
}

export default function HrReportsPage() {
  const [data, setData] = useState<ReportsPayload>({
    summary: { reports: 0, totalRows: 0, filteredEmployees: 0, attendanceDate: new Date().toISOString().slice(0, 10) },
    filters: { departments: [], branches: [], statuses: [] },
    reports: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [department, setDepartment] = useState('');
  const [branch, setBranch] = useState('');
  const [status, setStatus] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedReportKey, setSelectedReportKey] = useState('');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FAVORITES_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [department, branch, status, attendanceDate]);

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (department) params.set('department', department);
      if (branch) params.set('branch', branch);
      if (status) params.set('status', status);
      if (attendanceDate) params.set('attendanceDate', attendanceDate);
      const res = await fetch(`/api/hr/reports?${params.toString()}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to load HR reports');
      setData(payload.data);
      if (!selectedReportKey && payload.data.reports.length > 0) {
        setSelectedReportKey(payload.data.reports[0].key);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load HR reports');
    } finally {
      setLoading(false);
    }
  }

  function toggleFavorite(key: string) {
    setFavorites((current) => {
      const next = current.includes(key) ? current.filter((value) => value !== key) : [...current, key];
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }

  const categories = useMemo(() => ['all', ...Array.from(new Set(data.reports.map((report) => report.category)))], [data.reports]);

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.reports.filter((report) => {
      if (category !== 'all' && report.category !== category) return false;
      if (favoritesOnly && !favorites.includes(report.key)) return false;
      if (!term) return true;
      return [report.title, report.description, report.category, ...report.highlights].some((value) => value.toLowerCase().includes(term));
    });
  }, [category, data.reports, favorites, favoritesOnly, search]);

  const selectedReport = visibleReports.find((report) => report.key === selectedReportKey) || visibleReports[0] || null;

  useEffect(() => {
    if (selectedReport && selectedReport.key !== selectedReportKey) {
      setSelectedReportKey(selectedReport.key);
    }
  }, [selectedReport, selectedReportKey]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fffef2_0%,#f9fbff_42%,#eefaf4_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Phase 5 <span className="h-1 w-1 rounded-full bg-amber-500" /> Reports Gallery</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">HR Reports Gallery</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Discoverable HR reporting for employee master, statutory summaries, leave balances, attendance muster, overtime, travel, and onboarding status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/hr" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">HR Dashboard</Link>
            <button onClick={() => void loadReports()} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600"><RefreshCcw className="h-4 w-4" /> Refresh</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Reports</div><div className="mt-2 text-2xl font-semibold text-slate-900">{data.summary.reports}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Rows In Scope</div><div className="mt-2 text-2xl font-semibold text-slate-900">{data.summary.totalRows}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Employees In Scope</div><div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-900"><Users className="h-5 w-5 text-slate-400" /> {data.summary.filteredEmployees}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Favorites</div><div className="mt-2 text-2xl font-semibold text-slate-900">{favorites.length}</div></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports or metadata" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200" />
          </div>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
            {categories.map((item) => <option key={item} value={item}>{item === 'all' ? 'All Categories' : item}</option>)}
          </select>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
            <option value="">All Departments</option>
            {data.filters.departments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={branch} onChange={(event) => setBranch(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
            <option value="">All Locations / Branches</option>
            {data.filters.branches.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
            <option value="">All Employment Status</option>
            {data.filters.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"><Filter className="h-4 w-4" /> Muster date</div>
          <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
          <button onClick={() => setFavoritesOnly((current) => !current)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${favoritesOnly ? 'bg-amber-500 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><Star className={`h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`} /> Favorites only</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-24 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading HR reports...</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">{error}</div>
      ) : !visibleReports.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-24 text-center text-sm text-slate-500">No HR reports match the current search and filters.</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
          <div className="space-y-4">
            {visibleReports.map((report) => {
              const isFavorite = favorites.includes(report.key);
              const isActive = selectedReport?.key === report.key;
              return (
                <button key={report.key} onClick={() => setSelectedReportKey(report.key)} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${isActive ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{report.category}</div>
                      <div className="mt-1 text-base font-semibold text-slate-900">{report.title}</div>
                    </div>
                    <button type="button" onClick={(event) => { event.stopPropagation(); toggleFavorite(report.key); }} className={`rounded-full p-2 transition ${isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}>
                      <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{report.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.highlights.map((item) => <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{item}</span>)}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{report.rowCount} rows</span>
                    <span>{formatDate(report.updatedAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedReport ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{selectedReport.category}</div>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-950">{selectedReport.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">{selectedReport.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => exportReportAsPdf(selectedReport)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> PDF</button>
                    <button onClick={() => exportReportAsXls(selectedReport)} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"><Download className="h-4 w-4" /> XLS</button>
                    <Link href={selectedReport.drilldownPath} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><FileSpreadsheet className="h-4 w-4" /> Open workspace</Link>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Primary Metric</div><div className="mt-2 text-lg font-semibold text-slate-900">{selectedReport.primaryMetric}</div></div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Available Formats</div><div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700">{selectedReport.formats.map((format) => <span key={format} className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">{format}</span>)}</div></div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Updated</div><div className="mt-2 text-lg font-semibold text-slate-900">{formatDate(selectedReport.updatedAt)}</div></div>
                </div>
              </div>

              <div className="overflow-x-auto px-5 py-4">
                {selectedReport.rows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500">This report has no rows in the current scope.</div>
                ) : (
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-slate-400">
                      <tr>
                        {selectedReport.columns.map((column) => (
                          <th key={column} className="px-3 py-3 font-medium capitalize">{column.replaceAll('_', ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedReport.rows.map((row, index) => (
                        <tr key={`${selectedReport.key}-${index}`}>
                          {selectedReport.columns.map((column) => (
                            <td key={column} className="px-3 py-3 text-slate-700">{serializeCell(row[column]) || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
