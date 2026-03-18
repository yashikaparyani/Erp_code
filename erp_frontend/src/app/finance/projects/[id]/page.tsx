'use client';

import { useParams } from 'next/navigation';
import WorkspaceShell from '../../../../components/project-workspace/WorkspaceShell';
import type { DepartmentConfig } from '../../../../components/project-workspace/WorkspaceShell';

const CONFIG: DepartmentConfig = {
  departmentKey: 'accounts',
  departmentLabel: 'Finance & Accounts',
  backHref: '/finance/projects',
  backLabel: 'Back to Finance Projects',
  kickerLabel: 'Finance & Accounts Workspace',
  allowedStages: ['COSTING', 'PROCUREMENT', 'BILLING_PAYMENT', 'CLOSED'],
  tabs: ['overview', 'milestones', 'files', 'activity'],
};

export default function FinanceProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params?.id || '');
  return <WorkspaceShell projectId={projectId} config={CONFIG} />;
}
