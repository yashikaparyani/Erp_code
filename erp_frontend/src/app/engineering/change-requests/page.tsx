'use client';

import Link from 'next/link';
import { RefreshCcw } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function ChangeRequestsPage() {
  return (
    <OpsWorkspace
      title="Change Requests"
      subtitle="Manage scope, engineering, and execution change requests."
      listMethod="get_change_requests"
      createMethod="create_change_request"
      createLabel="Create Change Request"
      createFields={[
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'title', label: 'Title', placeholder: 'Scope change' },
        { name: 'impact_summary', label: 'Impact Summary', type: 'textarea' },
      ]}
      actions={[
        { label: 'Submit', tone: 'primary', buildRequest: (row) => ({ method: 'submit_change_request', args: { name: row.name } }) },
        { label: 'Approve', tone: 'success', buildRequest: (row) => ({ method: 'approve_change_request', args: { name: row.name } }) },
        { label: 'Reject', tone: 'danger', buildRequest: (row) => ({ method: 'reject_change_request', args: { name: row.name } }), prompt: { message: 'Reject reason', field: 'reason' } },
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_change_request', args: { name: row.name } }), confirmMessage: 'Delete this change request?' },
      ]}
      statsCards={[
        { label: 'Change Requests', path: 'length', hint: 'Loaded change requests', icon: RefreshCcw, tone: 'amber' },
      ]}
      columns={[
        { key: 'name', label: 'CR', render: (row) => (
          <Link href={`/engineering/change-requests/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:text-blue-800 font-medium">{row.name || '-'}</Link>
        ) },
        { key: 'title', label: 'Title', render: (row) => row.title || '-' },
        { key: 'project', label: 'Project', render: (row) => row.project || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
      ]}
      emptyMessage="No change requests found"
    />
  );
}
