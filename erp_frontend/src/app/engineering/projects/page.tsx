'use client';

import DepartmentProjectList from '../../../components/project-workspace/DepartmentProjectList';

export default function EngineeringProjectsPage() {
  return (
    <DepartmentProjectList
      config={{
        departmentKey: 'engineering',
        departmentLabel: 'Engineering',
        workspaceBasePath: '/engineering/projects',
        parentHref: '/engineering',
        parentLabel: 'Engineering',
        accentColor: 'bg-indigo-50',
        allowedStages: ['SURVEY', 'BOQ_DESIGN', 'COSTING', 'PROCUREMENT', 'EXECUTION'],
      }}
    />
  );
}
