'use client';

import { Users2 } from 'lucide-react';
import OpsWorkspace from '../../components/ops/OpsWorkspace';

export default function ManpowerPage() {
  return (
    <OpsWorkspace
      title="Manpower Logs"
      subtitle="Log daily manpower deployment at project and site level."
      listMethod="get_manpower_logs"
      statsMethod="get_manpower_summary"
      createMethod="create_manpower_log"
      createLabel="Create Manpower Log"
      createFields={[
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'site', label: 'Site', placeholder: 'Site' },
        { name: 'log_date', label: 'Log Date', type: 'date' },
        { name: 'skilled_count', label: 'Skilled Count', type: 'number', defaultValue: 0 },
        { name: 'unskilled_count', label: 'Unskilled Count', type: 'number', defaultValue: 0 },
      ]}
      actions={[
        {
          label: 'Delete',
          tone: 'danger',
          buildRequest: (row) => ({ method: 'delete_manpower_log', args: { name: row.name } }),
          confirmMessage: 'Delete this manpower log?',
        },
      ]}
      statsCards={[
        { label: 'Total Logs', path: 'total_logs', hint: 'Recorded manpower days', icon: Users2, tone: 'blue' },
        { label: 'Total Manpower', path: 'total_manpower', hint: 'Total logged manpower', icon: Users2, tone: 'green' },
      ]}
      columns={[
        { key: 'name', label: 'Log', render: (row) => row.name || '-' },
        { key: 'project', label: 'Project', render: (row) => row.project || '-' },
        { key: 'site', label: 'Site', render: (row) => row.site || '-' },
        { key: 'log_date', label: 'Date', render: (row) => row.log_date || '-' },
        { key: 'total', label: 'Total', render: (row) => (Number(row.skilled_count || 0) + Number(row.unskilled_count || 0)) },
      ]}
      emptyMessage="No manpower logs available"
    />
  );
}
