'use client';

import { useParams } from 'next/navigation';
import WorkspaceShell from '../../../../components/project-workspace/WorkspaceShell';
import type { DepartmentConfig } from '../../../../components/project-workspace/WorkspaceShell';

const CONFIG: DepartmentConfig = {
  departmentKey: 'om_rma',
  departmentLabel: 'O&M & Helpdesk',
  backHref: '/om-helpdesk/projects',
  backLabel: 'Back to O&M Projects',
  kickerLabel: 'O&M & RMA Workspace',
  allowedStages: ['OM_RMA', 'CLOSED'],
  tabs: ['overview', 'sites', 'files', 'activity'],
};

export default function OMHelpdeskProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params?.id || '');
  return <WorkspaceShell projectId={projectId} config={CONFIG} />;
}
