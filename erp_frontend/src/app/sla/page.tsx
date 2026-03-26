'use client';

import Link from 'next/link';
import { Clock3 } from 'lucide-react';
import OpsWorkspace from '../../components/ops/OpsWorkspace';

export default function SlaProfilesPage() {
  return (
    <OpsWorkspace
      title="SLA Profiles"
      subtitle="Visible UI for SLA profiles; timers and penalties are backend-connected through the same ops proxy."
      listMethod="get_sla_profiles"
      createMethod="create_sla_profile"
      createLabel="Create SLA Profile"
      createFields={[
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'profile_name', label: 'Profile Name', placeholder: 'Standard SLA' },
        { name: 'response_time_minutes', label: 'Response Time (mins)', type: 'number', defaultValue: 0 },
        { name: 'resolution_time_minutes', label: 'Resolution Time (mins)', type: 'number', defaultValue: 0 },
      ]}
      actions={[
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_sla_profile', args: { name: row.name } }), confirmMessage: 'Delete this SLA profile?' },
      ]}
      statsCards={[
        { label: 'Profiles', path: 'length', hint: 'Configured SLA profiles', icon: Clock3, tone: 'blue' },
      ]}
      columns={[
        { key: 'name', label: 'Profile', render: (row) => <Link href={`/sla-profiles/${encodeURIComponent(row.name)}`} className="text-blue-700 hover:text-blue-900 hover:underline font-medium">{row.name || '-'}</Link> },
        { key: 'project', label: 'Project', render: (row) => row.project || '-' },
        { key: 'profile_name', label: 'Name', render: (row) => row.profile_name || row.title || '-' },
        { key: 'active', label: 'Active', render: (row) => String(row.active ?? '-') },
      ]}
      emptyMessage="No SLA profiles configured"
    />
  );
}
