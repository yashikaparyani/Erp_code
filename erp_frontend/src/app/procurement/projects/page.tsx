'use client';

import DepartmentProjectList from '../../../components/project-workspace/DepartmentProjectList';

export default function ProcurementProjectsPage() {
  return (
    <DepartmentProjectList
      config={{
        departmentKey: 'procurement',
        departmentLabel: 'Procurement',
        workspaceBasePath: '/procurement/projects',
        parentHref: '/procurement',
        parentLabel: 'Procurement',
        accentColor: 'bg-amber-50',
        allowedStages: ['COSTING', 'PROCUREMENT', 'STORES_DISPATCH'],
      }}
    />
  );
}
