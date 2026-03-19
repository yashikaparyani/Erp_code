'use client';

import DepartmentProjectList from '../../../components/project-workspace/DepartmentProjectList';

export default function HRProjectsPage() {
  return (
    <DepartmentProjectList
      config={{
        departmentKey: 'hr',
        departmentLabel: 'HR & Manpower',
        workspaceBasePath: '/hr/projects',
        parentHref: '/hr',
        parentLabel: 'HR',
        accentColor: 'bg-violet-50',
      }}
    />
  );
}
