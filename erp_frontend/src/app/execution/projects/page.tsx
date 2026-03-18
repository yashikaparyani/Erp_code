'use client';

import DepartmentProjectList from '../../../components/project-workspace/DepartmentProjectList';

export default function ExecutionProjectsPage() {
  return (
    <DepartmentProjectList
      config={{
        departmentLabel: 'Execution & I&C',
        workspaceBasePath: '/execution/projects',
        parentHref: '/execution',
        parentLabel: 'Execution',
        accentColor: 'bg-teal-50',
      }}
    />
  );
}
