'use client';

import { useParams } from 'next/navigation';
import WorkspaceShell from '../../../../components/project-workspace/WorkspaceShell';
import type { DepartmentConfig } from '../../../../components/project-workspace/WorkspaceShell';

const CONFIG: DepartmentConfig = {
  departmentKey: 'engineering',
  departmentLabel: 'Engineering',
  backHref: '/engineering/projects',
  backLabel: 'Back to Engineering Projects',
  kickerLabel: 'Engineering Workspace',
  allowedStages: ['SURVEY', 'BOQ_DESIGN', 'COSTING', 'PROCUREMENT', 'EXECUTION'],
  tabs: ['overview', 'sites', 'board', 'files', 'activity'],
};

export default function EngineeringProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params?.id || '');
  return <WorkspaceShell projectId={projectId} config={CONFIG} />;
}
