'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCcw, Users2 } from 'lucide-react';
import { callOps } from './pm-helpers';

type TeamMember = {
  name: string;
  user: string;
  role_in_project: string;
  linked_site?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
};

type ManpowerSummary = {
  total_entries: number;
  total_man_days: number;
  total_overtime_hours: number;
  total_cost: number;
};

type ManpowerLog = {
  name: string;
  linked_site?: string;
  log_date: string;
  worker_name: string;
  designation?: string;
  role_in_project?: string;
  is_contractor?: boolean;
  man_days: number;
  overtime_hours?: number;
};

export default function StaffTab({ projectId }: { projectId: string }) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [summary, setSummary] = useState<ManpowerSummary | null>(null);
  const [recentLogs, setRecentLogs] = useState<ManpowerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teamData, summaryData, logsData] = await Promise.all([
        callOps<TeamMember[]>('get_project_team_members', { project: projectId }),
        callOps<ManpowerSummary>('get_manpower_summary', { project: projectId }),
        callOps<ManpowerLog[]>('get_manpower_logs', { project: projectId }),
      ]);
      setTeam(Array.isArray(teamData) ? teamData : []);
      setSummary(summaryData || null);
      setRecentLogs(Array.isArray(logsData) ? logsData.slice(0, 20) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const activeMembers = team.filter((m) => m.is_active);
  const inactiveMembers = team.filter((m) => !m.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button onClick={() => void load()} className="btn btn-secondary text-xs">
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Manpower summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Active Staff" value={activeMembers.length} />
          <SummaryCard label="Total Man-Days" value={Math.round(summary.total_man_days)} />
          <SummaryCard label="Overtime Hours" value={Math.round(summary.total_overtime_hours)} />
          <SummaryCard label="Manpower Entries" value={summary.total_entries} />
        </div>
      )}

      {/* Active team */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">
          <Users2 className="mr-1.5 inline h-4 w-4" />
          Active Team ({activeMembers.length})
        </h3>
        {activeMembers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No active team members assigned.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Site</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((m) => (
                  <tr key={m.name}>
                    <td className="font-medium">{m.user}</td>
                    <td>{m.role_in_project || '—'}</td>
                    <td>{m.linked_site || 'All sites'}</td>
                    <td className="text-xs text-[var(--text-muted)]">{m.start_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent manpower logs */}
      {recentLogs.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">Recent Manpower Logs</h3>
          <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Designation</th>
                  <th>Site</th>
                  <th>Man-Days</th>
                  <th>OT Hrs</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.name}>
                    <td className="text-xs">{log.log_date}</td>
                    <td className="font-medium">{log.worker_name}</td>
                    <td>{log.designation || '—'}</td>
                    <td>{log.linked_site || '—'}</td>
                    <td>{log.man_days}</td>
                    <td>{log.overtime_hours || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Inactive members */}
      {inactiveMembers.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-muted)]">
            Inactive / Past Members ({inactiveMembers.length})
          </h3>
          <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] opacity-60">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Period</th>
                </tr>
              </thead>
              <tbody>
                {inactiveMembers.map((m) => (
                  <tr key={m.name}>
                    <td>{m.user}</td>
                    <td>{m.role_in_project || '—'}</td>
                    <td className="text-xs">{m.start_date || '?'} – {m.end_date || '?'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 text-center">
      <div className="text-xl font-bold text-[var(--text-main)]">{value.toLocaleString()}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
