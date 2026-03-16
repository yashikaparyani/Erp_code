'use client';

import { ClipboardList, FileText } from 'lucide-react';
import OpsWorkspace from '../../components/ops/OpsWorkspace';

export default function IndentsPage() {
  return (
    <OpsWorkspace
      title="Material Indents"
      subtitle="Raise project material requests and watch them move toward procurement."
      listMethod="get_indents"
      statsMethod="get_indent_stats"
      createMethod="create_indent"
      createLabel="Create Indent"
      createFields={[
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'required_by_date', label: 'Required By', type: 'date' },
        { name: 'purpose', label: 'Purpose', type: 'textarea' },
      ]}
      statsCards={[
        { label: 'Total Indents', path: 'total', hint: 'All material requests', icon: FileText, tone: 'blue' },
        { label: 'Pending Purchase', path: 'pending_purchase', hint: 'Awaiting procurement action', icon: ClipboardList, tone: 'orange' },
      ]}
      columns={[
        { key: 'name', label: 'Indent', render: (row) => row.name || '-' },
        { key: 'project', label: 'Project', render: (row) => row.project || row.linked_project || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
        { key: 'required_by_date', label: 'Required By', render: (row) => row.required_by_date || '-' },
      ]}
      emptyMessage="No indents raised yet"
    />
  );
}
