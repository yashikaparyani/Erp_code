'use client';

import { useEffect, useState } from 'react';
import { Flag, FolderTree, Layers3, ShieldAlert } from 'lucide-react';
import { DashboardShell, EmptyState, MetricList, SectionCard, StatCard, formatPercent } from '../../components/dashboards/shared';
import { useRole } from '../../context/RoleContext';

type ProjectListItem = {
  name: string;
  project_name?: string;
  customer?: string;
  current_project_stage?: string;
  project_head?: string;
  project_manager_user?: string;
  total_sites?: number;
  spine_progress_pct?: number;
  spine_blocked?: number;
  blocker_summary?: string;
};

type ProjectSpineSummary = {
  project_summary: {
    name: string;
    project_name?: string;
    current_project_stage?: string;
    project_head?: string;
    project_manager?: string;
    total_sites?: number;
    spine_progress_pct?: number;
  } | null;
  site_count: number;
  stage_coverage: Record<string, number>;
  action_queue: {
    blocked_count: number;
    pending_count: number;
    overdue_count: number;
  };
};

async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to load project workspace');
  }

  return (payload.data ?? payload) as T;
}

export default function ProjectsPage() {
  const { currentRole } = useRole();

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [summary, setSummary] = useState<ProjectSpineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const projectList = await callOps<ProjectListItem[]>('get_project_spine_list');
        if (!active) return;

        setProjects(projectList);
        const initialProject = selectedProject || projectList[0]?.name || '';
        setSelectedProject(initialProject);

        const spine = await callOps<ProjectSpineSummary>('get_project_spine_summary', {
          project: initialProject || undefined,
        });
        if (!active) return;
        setSummary(spine);

        setLastUpdated(
          new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        );
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load project workspace');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [currentRole, selectedProject]);

  const filteredProjects = projects;

  return (
    <DashboardShell
      title="Projects"
      subtitle="Full project picture across lifecycle stages"
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => setSelectedProject((value) => value)}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Visible Projects" value={filteredProjects.length} hint="Projects in your role-visible lane" icon={FolderTree} tone="blue" />
        <StatCard
          title="Lifecycle View"
          value="Full Spine"
          hint="Visibility depends on stage and designation"
          icon={Layers3}
          tone="green"
        />
        <StatCard
          title="Coverage"
          value={formatPercent(summary?.project_summary?.spine_progress_pct || 0)}
          hint="Overall project spine progress"
          icon={Flag}
          tone="orange"
        />
        <StatCard
          title="Blocked"
          value={summary?.action_queue?.blocked_count || 0}
          hint="Items needing escalation or unblock"
          icon={ShieldAlert}
          tone="red"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Project List" subtitle="Project now lives in the left navigation, not the top header">
          {!filteredProjects.length ? (
            <EmptyState message="No projects are visible for this role." />
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => {
                const selected = project.name === selectedProject;
                return (
                  <button
                    key={project.name}
                    onClick={() => setSelectedProject(project.name)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      selected ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-900">{project.project_name || project.name}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {project.customer || 'No customer'} • {project.current_project_stage || 'SURVEY'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Project Summary" subtitle="Full project ownership view">
          {summary?.project_summary ? (
            <MetricList
              items={[
                { label: 'Project', value: summary.project_summary.project_name || summary.project_summary.name },
                { label: 'Current Stage', value: summary.project_summary.current_project_stage || '-' },
                { label: 'Project Head', value: summary.project_summary.project_head || '-' },
                { label: 'Project Manager', value: summary.project_summary.project_manager || '-' },
                { label: 'Total Sites', value: summary.project_summary.total_sites || 0 },
                { label: 'Spine Progress', value: formatPercent(summary.project_summary.spine_progress_pct || 0) },
              ]}
            />
          ) : (
            <EmptyState message="Select a project to see its full summary." />
          )}
        </SectionCard>

        <SectionCard title="Site Coverage" subtitle="Site-level truth inside each project">
          {summary ? (
            <MetricList items={Object.entries(summary.stage_coverage).map(([stage, count]) => ({ label: stage, value: count }))} />
          ) : (
            <EmptyState message="Select a project to see its site-stage coverage." />
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
