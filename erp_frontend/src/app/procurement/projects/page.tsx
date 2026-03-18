'use client';

import DepartmentProjectList from '../../../components/project-workspace/DepartmentProjectList';

export default function ProcurementProjectsPage() {
  return (
    <DepartmentProjectList
      config={{
        departmentLabel: 'Procurement',
        workspaceBasePath: '/procurement/projects',
        parentHref: '/procurement',
        parentLabel: 'Procurement',
        accentColor: 'bg-amber-50',
      }}
    />
  );
}
