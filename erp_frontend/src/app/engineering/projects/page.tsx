'use client';

import DepartmentProjectList from '../../../components/project-workspace/DepartmentProjectList';

export default function EngineeringProjectsPage() {
  return (
    <DepartmentProjectList
      config={{
        departmentLabel: 'Engineering',
        workspaceBasePath: '/engineering/projects',
        parentHref: '/engineering',
        parentLabel: 'Engineering',
        accentColor: 'bg-indigo-50',
      }}
    />
  );
}
