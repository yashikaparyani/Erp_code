'use client';

import { Plane } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function HrTravelLogsPage() {
  return (
    <OpsWorkspace
      title="Travel Log Management"
      subtitle="Create travel requests and run submit, approve, and reject workflow."
      listMethod="get_travel_logs"
      statsMethod="get_travel_log_stats"
      createMethod="create_travel_log"
      createLabel="Create Travel Log"
      createFields={[
        { name: 'employee', label: 'Employee', placeholder: 'Employee ID/name' },
        { name: 'travel_date', label: 'Travel Date', type: 'date' },
        { name: 'from_location', label: 'From', placeholder: 'Origin' },
        { name: 'to_location', label: 'To', placeholder: 'Destination' },
        { name: 'expense_amount', label: 'Expense Amount', type: 'number', defaultValue: 0 },
      ]}
      actions={[
        { label: 'Submit', tone: 'primary', buildRequest: (row) => ({ method: 'submit_travel_log', args: { name: row.name } }) },
        { label: 'Approve', tone: 'success', buildRequest: (row) => ({ method: 'approve_travel_log', args: { name: row.name } }) },
        { label: 'Reject', tone: 'danger', buildRequest: (row) => ({ method: 'reject_travel_log', args: { name: row.name } }), prompt: { message: 'Reject reason', field: 'reason' } },
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_travel_log', args: { name: row.name } }), confirmMessage: 'Delete this travel log?' },
      ]}
      statsCards={[
        { label: 'Travel Logs', path: 'total', hint: 'Total travel entries', icon: Plane, tone: 'blue' },
        { label: 'Approved', path: 'approved', hint: 'Approved travel entries', icon: Plane, tone: 'green' },
      ]}
      columns={[
        { key: 'name', label: 'Log', render: (row) => row.name || '-' },
        { key: 'employee', label: 'Employee', render: (row) => row.employee || '-' },
        { key: 'travel_date', label: 'Date', render: (row) => row.travel_date || '-' },
        { key: 'route', label: 'Route', render: (row) => `${row.from_location || '-'} -> ${row.to_location || '-'}` },
        { key: 'travel_status', label: 'Status', render: (row) => row.travel_status || row.status || '-' },
      ]}
      emptyMessage="No travel logs found"
    />
  );
}
