'use client';

import { Clock3 } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function HrOvertimePage() {
  return (
    <OpsWorkspace
      title="Overtime Management"
      subtitle="Create overtime entries and run submit, approve, and reject workflow."
      listMethod="get_overtime_entries"
      statsMethod="get_overtime_stats"
      createMethod="create_overtime_entry"
      createLabel="Create Overtime Entry"
      createFields={[
        { name: 'employee', label: 'Employee', placeholder: 'Employee ID/name' },
        { name: 'overtime_date', label: 'Date', type: 'date' },
        { name: 'overtime_hours', label: 'Hours', type: 'number', defaultValue: 0 },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      actions={[
        { label: 'Submit', tone: 'primary', buildRequest: (row) => ({ method: 'submit_overtime_entry', args: { name: row.name } }) },
        { label: 'Approve', tone: 'success', buildRequest: (row) => ({ method: 'approve_overtime_entry', args: { name: row.name } }) },
        { label: 'Reject', tone: 'danger', buildRequest: (row) => ({ method: 'reject_overtime_entry', args: { name: row.name } }), prompt: { message: 'Reject reason', field: 'reason' } },
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_overtime_entry', args: { name: row.name } }), confirmMessage: 'Delete this overtime entry?' },
      ]}
      statsCards={[
        { label: 'Overtime Entries', path: 'total', hint: 'Total overtime rows', icon: Clock3, tone: 'blue' },
        { label: 'Approved Hours', path: 'total_hours', hint: 'Aggregate hours', icon: Clock3, tone: 'purple' },
      ]}
      columns={[
        { key: 'name', label: 'Entry', render: (row) => row.name || '-' },
        { key: 'employee', label: 'Employee', render: (row) => row.employee || '-' },
        { key: 'overtime_date', label: 'Date', render: (row) => row.overtime_date || '-' },
        { key: 'overtime_hours', label: 'Hours', render: (row) => row.overtime_hours || '-' },
        { key: 'overtime_status', label: 'Status', render: (row) => row.overtime_status || row.status || '-' },
      ]}
      emptyMessage="No overtime entries found"
    />
  );
}
