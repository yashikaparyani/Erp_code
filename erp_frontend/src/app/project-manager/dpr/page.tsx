'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, ClipboardCheck, Plus, X } from 'lucide-react';
import { usePermissions } from '@/context/PermissionContext';

interface DPRRow {
  name: string;
  linked_project?: string;
  linked_site?: string;
  report_date?: string;
  summary?: string;
  manpower_on_site?: number;
  equipment_count?: number;
  submitted_by?: string;
}

interface SiteRow {
  name: string;
  site_name?: string;
}

export default function ProjectManagerDprPage() {
  const { permissions } = usePermissions();
  const assignedProjects = permissions?.user_context.assigned_projects ?? [];
  const [selectedProject, setSelectedProject] = useState('');
  const [dprs, setDprs] = useState<DPRRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    linked_site: '',
    report_date: '',
    summary: '',
    manpower_on_site: 0,
    equipment_count: 0,
  });

  useEffect(() => {
    if (!selectedProject && assignedProjects.length) {
      setSelectedProject(assignedProjects[0]);
    }
  }, [assignedProjects, selectedProject]);

  const loadData = async (project: string) => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      const [dprRes, sitesRes] = await Promise.all([
        fetch(`/api/dprs?project=${encodeURIComponent(project)}`).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch(`/api/sites?project=${encodeURIComponent(project)}`).then((r) => r.json()).catch(() => ({ data: [] })),
      ]);
      setDprs(Array.isArray(dprRes.data) ? dprRes.data : []);
      setSites(Array.isArray(sitesRes.data) ? sitesRes.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DPR data');
      setDprs([]);
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      void loadData(selectedProject);
    }
  }, [selectedProject]);

  const stats = useMemo(() => {
    return dprs.reduce(
      (acc, row) => {
        acc.reports += 1;
        acc.manpower += Number(row.manpower_on_site || 0);
        acc.equipment += Number(row.equipment_count || 0);
        return acc;
      },
      { reports: 0, manpower: 0, equipment: 0 },
    );
  }, [dprs]);

  const handleCreate = async () => {
    if (!selectedProject || !form.linked_site) {
      setError('Project and site are required for DPR.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create_dpr',
          args: {
            data: JSON.stringify({
              linked_project: selectedProject,
              linked_site: form.linked_site,
              report_date: form.report_date || undefined,
              summary: form.summary || undefined,
              manpower_on_site: Number(form.manpower_on_site) || 0,
              equipment_count: Number(form.equipment_count) || 0,
            }),
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to create DPR');
      }
      setShowCreate(false);
      setForm({ linked_site: '', report_date: '', summary: '', manpower_on_site: 0, equipment_count: 0 });
      await loadData(selectedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create DPR');
    } finally {
      setCreating(false);
    }
  };

  if (!assignedProjects.length) {
    return (
      <div className="card">
        <div className="card-body py-12 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Project DPR</h1>
          <p className="mt-2 text-sm text-gray-500">No assigned projects were found for this Project Manager.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project DPR</h1>
          <p className="mt-1 text-sm text-gray-500">Daily progress reports for assigned projects only. This replaces the shared execution command view for PM.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select className="input min-w-[240px]" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            {assignedProjects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New DPR
          </button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stat-card"><div className="stat-value">{stats.reports}</div><div className="stat-label">Reports Submitted</div></div>
        <div className="stat-card"><div className="stat-value">{stats.manpower}</div><div className="stat-label">Manpower Reported</div></div>
        <div className="stat-card"><div className="stat-value">{stats.equipment}</div><div className="stat-label">Equipment Reported</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="font-semibold text-gray-900">DPR Register</h3>
            <p className="mt-1 text-xs text-gray-500">Only DPRs for the selected assigned project are shown here.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Date</th><th>Site</th><th>Summary</th><th>Manpower</th><th>Equipment</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-500">Loading DPRs...</td></tr>
              ) : dprs.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-500">No DPRs found for this project.</td></tr>
              ) : (
                dprs.map((row) => (
                  <tr key={row.name}>
                    <td className="font-medium text-gray-900">{row.name}</td>
                    <td>{row.report_date || '-'}</td>
                    <td>{row.linked_site || '-'}</td>
                    <td>{row.summary || '-'}</td>
                    <td>{row.manpower_on_site || 0}</td>
                    <td>{row.equipment_count || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">New DPR</h2>
              <button className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label><div className="mb-2 text-sm font-medium text-gray-700">Site *</div><select className="input" value={form.linked_site} onChange={(e) => setForm((p) => ({ ...p, linked_site: e.target.value }))}><option value="">Select site</option>{sites.map((site) => <option key={site.name} value={site.name}>{site.site_name || site.name}</option>)}</select></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Report Date</div><input className="input" type="date" value={form.report_date} onChange={(e) => setForm((p) => ({ ...p, report_date: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Manpower On Site</div><input className="input" type="number" min="0" value={form.manpower_on_site} onChange={(e) => setForm((p) => ({ ...p, manpower_on_site: Number(e.target.value) || 0 }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Equipment Count</div><input className="input" type="number" min="0" value={form.equipment_count} onChange={(e) => setForm((p) => ({ ...p, equipment_count: Number(e.target.value) || 0 }))} /></label>
              <label className="md:col-span-2"><div className="mb-2 text-sm font-medium text-gray-700">Summary</div><textarea className="input min-h-[96px]" value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} /></label>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Submitting...' : 'Submit DPR'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
