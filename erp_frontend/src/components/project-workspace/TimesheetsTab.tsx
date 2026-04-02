'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { callOps } from './workspace-types';

type TimesheetSummary = {
  dpr_count: number;
  dpr_rows: Array<{ name: string; linked_site?: string; report_date?: string; summary?: string; manpower_on_site?: number; equipment_count?: number; owner?: string }>;
  manpower_total_persons: number;
  manpower_rows: Array<{ name: string; linked_site?: string; log_date?: string; num_persons?: number; trade?: string; remarks?: string; owner?: string }>;
  overtime_total_hours: number;
  overtime_rows: Array<{ name: string; linked_site?: string; entry_date?: string; hours?: number; employee_name?: string; reason?: string; status?: string; owner?: string }>;
};

function TimesheetsTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<TimesheetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [section, setSection] = useState<'dpr' | 'manpower' | 'overtime'>('dpr');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await callOps<TimesheetSummary>('get_project_timesheet_summary', { project: projectId });
      setData(d);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load timesheet data'); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading timesheets...</div>;
  if (error) return <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button onClick={() => setSection('dpr')} className={`rounded-xl border px-4 py-3 text-left transition-colors ${section === 'dpr' ? 'border-[var(--accent)] bg-blue-50' : 'border-[var(--border-subtle)] bg-white'}`}>
          <div className="text-lg font-bold text-[var(--text-main)]">{data.dpr_count}</div>
          <div className="text-xs text-[var(--text-muted)]">DPR Reports</div>
        </button>
        <button onClick={() => setSection('manpower')} className={`rounded-xl border px-4 py-3 text-left transition-colors ${section === 'manpower' ? 'border-[var(--accent)] bg-blue-50' : 'border-[var(--border-subtle)] bg-white'}`}>
          <div className="text-lg font-bold text-[var(--text-main)]">{data.manpower_total_persons}</div>
          <div className="text-xs text-[var(--text-muted)]">Total Manpower Logged</div>
        </button>
        <button onClick={() => setSection('overtime')} className={`rounded-xl border px-4 py-3 text-left transition-colors ${section === 'overtime' ? 'border-[var(--accent)] bg-blue-50' : 'border-[var(--border-subtle)] bg-white'}`}>
          <div className="text-lg font-bold text-[var(--text-main)]">{data.overtime_total_hours.toFixed(1)}h</div>
          <div className="text-xs text-[var(--text-muted)]">Overtime Hours</div>
        </button>
      </div>

      {/* DPR section */}
      {section === 'dpr' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white shadow-sm">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h4 className="text-sm font-semibold text-[var(--text-main)]">Daily Progress Reports</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase text-[var(--text-muted)]"><th className="px-4 py-2">Date</th><th className="px-4 py-2">Site</th><th className="px-4 py-2">Summary</th><th className="px-4 py-2">Manpower</th><th className="px-4 py-2">Equipment</th></tr></thead>
              <tbody>
                {data.dpr_rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">No DPR entries yet.</td></tr>
                ) : data.dpr_rows.map((r) => (
                  <tr key={r.name} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-4 py-2 font-medium">{r.report_date || '—'}</td>
                    <td className="px-4 py-2">{r.linked_site || '—'}</td>
                    <td className="max-w-xs truncate px-4 py-2">{r.summary || '—'}</td>
                    <td className="px-4 py-2">{r.manpower_on_site ?? 0}</td>
                    <td className="px-4 py-2">{r.equipment_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manpower section */}
      {section === 'manpower' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white shadow-sm">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h4 className="text-sm font-semibold text-[var(--text-main)]">Manpower Logs</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase text-[var(--text-muted)]"><th className="px-4 py-2">Date</th><th className="px-4 py-2">Site</th><th className="px-4 py-2">Trade</th><th className="px-4 py-2">Persons</th><th className="px-4 py-2">Remarks</th></tr></thead>
              <tbody>
                {data.manpower_rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">No manpower logs yet.</td></tr>
                ) : data.manpower_rows.map((r) => (
                  <tr key={r.name} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-4 py-2 font-medium">{r.log_date || '—'}</td>
                    <td className="px-4 py-2">{r.linked_site || '—'}</td>
                    <td className="px-4 py-2">{r.trade || '—'}</td>
                    <td className="px-4 py-2">{r.num_persons ?? 0}</td>
                    <td className="max-w-xs truncate px-4 py-2">{r.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overtime section */}
      {section === 'overtime' && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white shadow-sm">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h4 className="text-sm font-semibold text-[var(--text-main)]">Overtime Entries</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase text-[var(--text-muted)]"><th className="px-4 py-2">Date</th><th className="px-4 py-2">Employee</th><th className="px-4 py-2">Hours</th><th className="px-4 py-2">Reason</th><th className="px-4 py-2">Status</th></tr></thead>
              <tbody>
                {data.overtime_rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">No overtime entries yet.</td></tr>
                ) : data.overtime_rows.map((r) => (
                  <tr key={r.name} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-4 py-2 font-medium">{r.entry_date || '—'}</td>
                    <td className="px-4 py-2">{r.employee_name || '—'}</td>
                    <td className="px-4 py-2">{r.hours ?? 0}h</td>
                    <td className="max-w-xs truncate px-4 py-2">{r.reason || '—'}</td>
                    <td className="px-4 py-2">{r.status || '—'}</td>
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

export default TimesheetsTab;
