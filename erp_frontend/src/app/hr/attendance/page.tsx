'use client';

import { CalendarCheck2 } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function HrAttendancePage() {
  return (
    <OpsWorkspace
      title="Attendance Management"
      subtitle="Create and maintain attendance logs."
      listMethod="get_attendance_logs"
      statsMethod="get_attendance_stats"
      createMethod="create_attendance_log"
      createLabel="Create Attendance"
      createFields={[
        { name: 'employee', label: 'Employee', placeholder: 'Employee ID/name' },
        { name: 'attendance_date', label: 'Date', type: 'date' },
        { name: 'attendance_status', label: 'Status', placeholder: 'Present / Absent / Leave' },
        { name: 'linked_site', label: 'Site', placeholder: 'Site' },
      ]}
      actions={[
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_attendance_log', args: { name: row.name } }), confirmMessage: 'Delete this attendance log?' },
      ]}
      statsCards={[
        { label: 'Attendance Logs', path: 'total', hint: 'Total attendance rows', icon: CalendarCheck2, tone: 'blue' },
        { label: 'Present', path: 'present', hint: 'Present entries', icon: CalendarCheck2, tone: 'green' },
      ]}
      columns={[
        { key: 'name', label: 'Log', render: (row) => row.name || '-' },
        { key: 'employee', label: 'Employee', render: (row) => row.employee || '-' },
        { key: 'attendance_date', label: 'Date', render: (row) => row.attendance_date || '-' },
        { key: 'linked_site', label: 'Site', render: (row) => row.linked_site || '-' },
        { key: 'attendance_status', label: 'Status', render: (row) => row.attendance_status || '-' },
      ]}
      emptyMessage="No attendance logs found"
    />
  );
}
