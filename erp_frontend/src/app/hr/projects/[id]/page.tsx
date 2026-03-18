'use client';

import { useParams } from 'next/navigation';
import WorkspaceShell from '../../../../components/project-workspace/WorkspaceShell';
import type { DepartmentConfig } from '../../../../components/project-workspace/WorkspaceShell';

const CONFIG: DepartmentConfig = {
  departmentKey: 'hr',
  departmentLabel: 'HR & Manpower',
  backHref: '/hr/projects',
  backLabel: 'Back to HR Projects',
  kickerLabel: 'HR & Manpower Workspace',
  /* HR is cross-cutting — sees all stages for people/manpower readiness */
  tabs: ['overview', 'sites', 'activity'],
};

export default function HRProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params?.id || '');
  return <WorkspaceShell projectId={projectId} config={CONFIG} />;
}
