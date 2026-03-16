'use client';

import { FileText } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function DrawingsPage() {
  return (
    <OpsWorkspace
      title="Engineering Drawings"
      subtitle="Create, submit, approve, and supersede project drawings."
      listMethod="get_drawings"
      createMethod="create_drawing"
      createLabel="Create Drawing"
      createFields={[
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'site', label: 'Site', placeholder: 'Site' },
        { name: 'drawing_title', label: 'Drawing Title', placeholder: 'GA layout' },
        { name: 'revision_no', label: 'Revision', placeholder: 'R0' },
      ]}
      actions={[
        { label: 'Submit', tone: 'primary', buildRequest: (row) => ({ method: 'submit_drawing', args: { name: row.name } }) },
        { label: 'Approve', tone: 'success', buildRequest: (row) => ({ method: 'approve_drawing', args: { name: row.name } }) },
        { label: 'Supersede', tone: 'warning', buildRequest: (row) => ({ method: 'supersede_drawing', args: { name: row.name } }), prompt: { message: 'Superseded by drawing name', field: 'superseded_by' } },
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_drawing', args: { name: row.name } }), confirmMessage: 'Delete this drawing?' },
      ]}
      statsCards={[
        { label: 'Drawings', path: 'length', hint: 'Loaded drawings', icon: FileText, tone: 'blue' },
      ]}
      columns={[
        { key: 'name', label: 'Drawing', render: (row) => row.name || '-' },
        { key: 'drawing_title', label: 'Title', render: (row) => row.drawing_title || row.title || '-' },
        { key: 'project', label: 'Project', render: (row) => row.project || '-' },
        { key: 'revision_no', label: 'Revision', render: (row) => row.revision_no || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
      ]}
      emptyMessage="No drawings found"
    />
  );
}
