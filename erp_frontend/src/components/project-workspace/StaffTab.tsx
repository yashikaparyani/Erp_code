'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Plus, RefreshCcw, Users2, Trash2, X } from 'lucide-react';
import { projectWorkspaceApi } from '@/lib/typedApi';

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
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [memberForm, setMemberForm] = useState({ user: '', role_in_project: '', linked_site: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teamData, summaryData, logsData] = await Promise.all([
        projectWorkspaceApi.getProjectTeamMembers<TeamMember[]>(projectId),
        projectWorkspaceApi.getManpowerSummary<ManpowerSummary>(projectId),
        projectWorkspaceApi.getManpowerLogs<ManpowerLog[]>(projectId),
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

  const addMember = async () => {
    if (!memberForm.user.trim() || !memberForm.role_in_project.trim()) return;
    setAdding(true);
    try {
      await projectWorkspaceApi.createTeamMember({
        linked_project: projectId,
        user: memberForm.user.trim(),
        role_in_project: memberForm.role_in_project.trim(),
        linked_site: memberForm.linked_site.trim() || undefined,
        is_active: true,
      });
      setShowAdd(false);
      setMemberForm({ user: '', role_in_project: '', linked_site: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add team member');
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (name: string) => {
    if (!confirm('Remove this team member from the project?')) return;
    try {
      await projectWorkspaceApi.deleteTeamMember(name);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove team member');
    }
  };

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

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => void load()} className="btn btn-secondary text-xs">
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh
        </button>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" /> Add Member
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
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((m) => (
                  <tr key={m.name}>
                    <td className="font-medium">{m.user}</td>
                    <td>{m.role_in_project || '—'}</td>
                    <td>{m.linked_site || 'All sites'}</td>
                    <td className="text-xs text-[var(--text-muted)]">{m.start_date || '—'}</td>
                    <td className="text-right">
                      <button onClick={() => void removeMember(m.name)} className="text-gray-400 hover:text-rose-600" title="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
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

      {/* Add member modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">User / Email *</label>
                <input className="input" placeholder="e.g. john@company.com" value={memberForm.user} onChange={(e) => setMemberForm((p) => ({ ...p, user: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Role in Project *</label>
                <input className="input" placeholder="e.g. Site Engineer, Supervisor" value={memberForm.role_in_project} onChange={(e) => setMemberForm((p) => ({ ...p, role_in_project: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Linked Site (optional)</label>
                <input className="input" placeholder="Site name" value={memberForm.linked_site} onChange={(e) => setMemberForm((p) => ({ ...p, linked_site: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => void addMember()} disabled={adding || !memberForm.user.trim() || !memberForm.role_in_project.trim()} className="btn btn-primary">
                {adding ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
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
