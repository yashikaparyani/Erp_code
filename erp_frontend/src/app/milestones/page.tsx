'use client';

import { Flag } from 'lucide-react';
import OpsWorkspace from '../../components/ops/OpsWorkspace';

export default function MilestonesPage() {
  return (
    <OpsWorkspace
      title="Project Milestones"
      subtitle="Track milestone commitments and progress."
      listMethod="get_milestones"
      createMethod="create_milestone"
      createLabel="Create Milestone"
      createFields={[
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'site', label: 'Site', placeholder: 'Site' },
        { name: 'milestone_name', label: 'Milestone Name', placeholder: 'Foundation complete' },
        { name: 'target_date', label: 'Target Date', type: 'date' },
      ]}
      actions={[
        {
          label: 'Delete',
          tone: 'danger',
          buildRequest: (row) => ({ method: 'delete_milestone', args: { name: row.name } }),
          confirmMessage: 'Delete this milestone?',
        },
      ]}
      statsCards={[
        { label: 'Milestones', path: 'length', hint: 'Tracked milestone rows', icon: Flag, tone: 'blue' },
      ]}
      columns={[
        { key: 'name', label: 'ID', render: (row) => row.name || '-' },
        { key: 'milestone_name', label: 'Milestone', render: (row) => row.milestone_name || row.title || '-' },
        { key: 'project', label: 'Project', render: (row) => row.project || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
        { key: 'target_date', label: 'Target Date', render: (row) => row.target_date || '-' },
      ]}
      emptyMessage="No milestones available"
    />
  );
}
