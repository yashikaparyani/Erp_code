'use client';

import { ClipboardList } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function CommLogsPage() {
  return (
    <OpsWorkspace
      title="Communication Logs"
      subtitle="Track site and project communications in one place."
      listMethod="get_comm_logs"
      createMethod="create_comm_log"
      createLabel="Create Communication Log"
      createFields={[
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'site', label: 'Site', placeholder: 'Site' },
        { name: 'comm_type', label: 'Communication Type', placeholder: 'Email / Call / Meeting' },
        { name: 'direction', label: 'Direction', placeholder: 'Inbound / Outbound' },
        { name: 'summary', label: 'Summary', type: 'textarea' },
      ]}
      actions={[
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_comm_log', args: { name: row.name } }), confirmMessage: 'Delete this communication log?' },
      ]}
      statsCards={[
        { label: 'Communication Logs', path: 'length', hint: 'Loaded communications', icon: ClipboardList, tone: 'blue' },
      ]}
      columns={[
        { key: 'name', label: 'Log', render: (row) => row.name || '-' },
        { key: 'project', label: 'Project', render: (row) => row.project || '-' },
        { key: 'comm_type', label: 'Type', render: (row) => row.comm_type || '-' },
        { key: 'direction', label: 'Direction', render: (row) => row.direction || '-' },
        { key: 'summary', label: 'Summary', render: (row) => row.summary || '-' },
      ]}
      emptyMessage="No communication logs found"
    />
  );
}
