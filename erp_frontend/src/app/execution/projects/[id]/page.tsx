'use client';

import { useParams } from 'next/navigation';
import WorkspaceShell from '../../../../components/project-workspace/WorkspaceShell';
import type { DepartmentConfig } from '../../../../components/project-workspace/WorkspaceShell';

const CONFIG: DepartmentConfig = {
  departmentKey: 'i_and_c',
  departmentLabel: 'Execution & I&C',
  backHref: '/execution/projects',
  backLabel: 'Back to Execution Projects',
  kickerLabel: 'Execution & I&C Workspace',
  allowedStages: ['STORES_DISPATCH', 'EXECUTION', 'BILLING_PAYMENT'],
  tabs: ['overview', 'sites', 'board', 'ops', 'files', 'activity'],
};

export default function ExecutionProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params?.id || '');
  return <WorkspaceShell projectId={projectId} config={CONFIG} />;
}
