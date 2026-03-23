'use client';

import { useParams } from 'next/navigation';
import WorkspaceShell from '../../../components/project-workspace/WorkspaceShell';
import type { DepartmentConfig } from '../../../components/project-workspace/WorkspaceShell';

const CONFIG: DepartmentConfig = {
  departmentKey: 'all',
  departmentLabel: 'All Departments',
  backHref: '/projects',
  backLabel: 'Back to Projects',
  kickerLabel: 'Project Workspace',
  tabs: ['overview', 'sites', 'board', 'milestones', 'ops', 'files', 'activity'],
};

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params?.id || '');
  return <WorkspaceShell projectId={projectId} config={CONFIG} />;
}
