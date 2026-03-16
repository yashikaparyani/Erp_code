'use client';

import { Wrench } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function HrTechnicianVisitsPage() {
  return (
    <OpsWorkspace
      title="Technician Visit Logs"
      subtitle="Track field technician movement and visit status."
      listMethod="get_technician_visit_logs"
      statsMethod="get_technician_visit_stats"
      createMethod="create_technician_visit_log"
      createLabel="Create Visit Log"
      createFields={[
        { name: 'employee', label: 'Employee', placeholder: 'Employee ID/name' },
        { name: 'visit_date', label: 'Visit Date', type: 'date' },
        { name: 'linked_site', label: 'Site', placeholder: 'Site' },
        { name: 'customer_location', label: 'Customer Location', placeholder: 'Customer location' },
        { name: 'visit_status', label: 'Status', placeholder: 'Scheduled / In Progress / Completed' },
      ]}
      actions={[
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_technician_visit_log', args: { name: row.name } }), confirmMessage: 'Delete this visit log?' },
      ]}
      statsCards={[
        { label: 'Visit Logs', path: 'total', hint: 'Total field visits', icon: Wrench, tone: 'blue' },
        { label: 'Completed', path: 'completed', hint: 'Completed visits', icon: Wrench, tone: 'green' },
      ]}
      columns={[
        { key: 'name', label: 'Visit', render: (row) => row.name || '-' },
        { key: 'employee', label: 'Employee', render: (row) => row.employee || '-' },
        { key: 'visit_date', label: 'Date', render: (row) => row.visit_date || '-' },
        { key: 'site', label: 'Site / Location', render: (row) => row.linked_site || row.customer_location || '-' },
        { key: 'visit_status', label: 'Status', render: (row) => row.visit_status || '-' },
      ]}
      emptyMessage="No technician visits found"
    />
  );
}
