'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { usePmContext, siteLabel } from '@/components/pm/pm-helpers';

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

export default function ProjectManagerDprPage() {
  const { assignedProjects, selectedProject, setSelectedProject, sites } = usePmContext();
  const [dprs, setDprs] = useState<DPRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadData = async (project: string) => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dprs?project=${encodeURIComponent(project)}`).then((r) => r.json()).catch(() => ({ data: [] }));
      setDprs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DPR data');
      setDprs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedProject) void loadData(selectedProject); }, [selectedProject]);

  const stats = useMemo(() => dprs.reduce(
    (acc, row) => ({
      reports: acc.reports + 1,
      manpower: acc.manpower + Number(row.manpower_on_site || 0),
      equipment: acc.equipment + Number(row.equipment_count || 0),
    }),
    { reports: 0, manpower: 0, equipment: 0 },
  ), [dprs]);

  const handleCreate = async (values: Record<string, string>) => {
    if (!selectedProject || !values.linked_site) { setError('Project and site are required.'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/dprs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linked_project: selectedProject,
          linked_site: values.linked_site,
          report_date: values.report_date || undefined,
          summary: values.summary || undefined,
          manpower_on_site: Number(values.manpower_on_site) || 0,
          equipment_count: Number(values.equipment_count) || 0,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to create DPR');
      setShowCreate(false);
      await loadData(selectedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create DPR');
    } finally {
      setCreating(false);
    }
  };

  if (!assignedProjects.length) {
    return (
      <RegisterPage title="Project DPR" loading={false} empty emptyTitle="No Assigned Projects" emptyDescription="No assigned projects were found for this Project Manager.">
        <div />
      </RegisterPage>
    );
  }

  return (
    <>
      <RegisterPage
        title="Project DPR"
        description="Daily progress reports for assigned projects only."
        loading={loading}
        error={error}
        empty={!loading && dprs.length === 0}
        emptyTitle="No DPRs"
        emptyDescription="No DPRs found for this project."
        onRetry={() => void loadData(selectedProject)}
        stats={[
          { label: 'Reports Submitted', value: stats.reports },
          { label: 'Manpower Reported', value: stats.manpower },
          { label: 'Equipment Reported', value: stats.equipment },
        ]}
        filterBar={
          <select className="input max-w-xs" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            {assignedProjects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        }
        headerActions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New DPR
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Date</th><th>Site</th><th>Summary</th><th>Manpower</th><th>Equipment</th></tr></thead>
            <tbody>
              {dprs.map((row) => (
                <tr key={row.name}>
                  <td><Link href={`/project-manager/dpr/${encodeURIComponent(row.name)}`} className="font-medium text-blue-700 hover:underline">{row.name}</Link></td>
                  <td>{row.report_date || '-'}</td>
                  <td>{row.linked_site || '-'}</td>
                  <td className="max-w-xs truncate">{row.summary || '-'}</td>
                  <td>{row.manpower_on_site || 0}</td>
                  <td>{row.equipment_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      <FormModal
        open={showCreate}
        title="New DPR"
        description={`Project: ${selectedProject}`}
        size="lg"
        busy={creating}
        confirmLabel="Submit DPR"
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
        fields={[
          { name: 'linked_site', label: 'Site', type: 'select', required: true, options: [{ value: '', label: 'Select site' }, ...sites.map((s) => ({ value: s.name, label: siteLabel(s) }))] },
          { name: 'report_date', label: 'Report Date', type: 'date' },
          { name: 'manpower_on_site', label: 'Manpower On Site', type: 'number', defaultValue: '0' },
          { name: 'equipment_count', label: 'Equipment Count', type: 'number', defaultValue: '0' },
          { name: 'summary', label: 'Summary', type: 'textarea' },
        ]}
      />
    </>
  );
}
