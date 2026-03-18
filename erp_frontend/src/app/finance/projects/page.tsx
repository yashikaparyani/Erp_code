'use client';

import DepartmentProjectList from '../../../components/project-workspace/DepartmentProjectList';

export default function FinanceProjectsPage() {
  return (
    <DepartmentProjectList
      config={{
        departmentLabel: 'Finance & Accounts',
        workspaceBasePath: '/finance/projects',
        parentHref: '/finance',
        parentLabel: 'Finance',
        accentColor: 'bg-emerald-50',
      }}
    />
  );
}
