'use client';

import Link from 'next/link';
import { ExternalLink, FileText } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || '';

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
        { name: 'drawing_file', label: 'Drawing PDF / File', type: 'file', accept: '.pdf,.dwg,.dxf,.jpg,.jpeg,.png' },
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
        { key: 'name', label: 'Drawing', render: (row) => (
          <Link href={`/engineering/drawings/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:text-blue-800 font-medium">{row.name || '-'}</Link>
        ) },
        { key: 'drawing_title', label: 'Title', render: (row) => row.drawing_title || row.title || '-' },
        { key: 'project', label: 'Project', render: (row) => row.project || '-' },
        { key: 'revision_no', label: 'Revision', render: (row) => row.revision_no || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
        {
          key: 'file_url',
          label: 'File',
          render: (row) => row.file_url ? (
            <a
              href={`${FRAPPE_URL}${row.file_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View
            </a>
          ) : <span className="text-gray-400">—</span>,
        },
      ]}
      emptyMessage="No drawings found"
    />
  );
}
