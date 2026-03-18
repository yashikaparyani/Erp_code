'use client';

import DepartmentProjectList from '../../../components/project-workspace/DepartmentProjectList';

export default function OMHelpdeskProjectsPage() {
  return (
    <DepartmentProjectList
      config={{
        departmentLabel: 'O&M & Helpdesk',
        workspaceBasePath: '/om-helpdesk/projects',
        parentHref: '/om-helpdesk',
        parentLabel: 'O&M & Helpdesk',
        accentColor: 'bg-orange-50',
      }}
    />
  );
}
