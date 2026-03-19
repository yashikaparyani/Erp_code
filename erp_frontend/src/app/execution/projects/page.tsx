'use client';

import DepartmentProjectList from '../../../components/project-workspace/DepartmentProjectList';

export default function ExecutionProjectsPage() {
  return (
    <DepartmentProjectList
      config={{
        departmentKey: 'i_and_c',
        departmentLabel: 'Execution & I&C',
        workspaceBasePath: '/execution/projects',
        parentHref: '/execution',
        parentLabel: 'Execution',
        accentColor: 'bg-teal-50',
        allowedStages: ['STORES_DISPATCH', 'EXECUTION'],
      }}
    />
  );
}
