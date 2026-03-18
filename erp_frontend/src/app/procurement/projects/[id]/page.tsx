'use client';

import { useParams } from 'next/navigation';
import WorkspaceShell from '../../../../components/project-workspace/WorkspaceShell';
import type { DepartmentConfig } from '../../../../components/project-workspace/WorkspaceShell';

const CONFIG: DepartmentConfig = {
  departmentKey: 'procurement',
  departmentLabel: 'Procurement',
  backHref: '/procurement/projects',
  backLabel: 'Back to Procurement Projects',
  kickerLabel: 'Procurement Workspace',
  allowedStages: ['COSTING', 'PROCUREMENT', 'STORES_DISPATCH', 'BILLING_PAYMENT'],
  tabs: ['overview', 'sites', 'milestones', 'files', 'activity'],
};

export default function ProcurementProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params?.id || '');
  return <WorkspaceShell projectId={projectId} config={CONFIG} />;
}
