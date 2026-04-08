'use client';

import { ShieldCheck } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function RetentionPage() {
  return (
    <OpsWorkspace
      title="Retention Ledger"
      subtitle="Track retention deductions and release workflow."
      listMethod="get_retention_ledgers"
      statsMethod="get_retention_stats"
      createMethod="create_retention_ledger"
      createLabel="Create Retention Entry"
      createFields={[
        { name: 'customer', label: 'Customer', placeholder: 'Customer name/id' },
        { name: 'linked_project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'linked_invoice', label: 'Invoice', placeholder: 'Invoice ID' },
        { name: 'retention_percent', label: 'Retention %', type: 'number', defaultValue: 0 },
        { name: 'retention_amount', label: 'Retention Amount', type: 'number', defaultValue: 0 },
        { name: 'release_due_date', label: 'Release Due Date', type: 'date' },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      actions={[
        {
          label: 'Update',
          tone: 'primary',
          buildRequest: (row) => ({ method: 'update_retention_ledger', args: { name: row.name } }),
          prompt: { message: 'Update note', field: 'remarks' },
        },
        { label: 'Release', tone: 'success', buildRequest: (row) => ({ method: 'release_retention', args: { name: row.name } }), prompt: { message: 'Release amount', field: 'release_amount' } },
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_retention_ledger', args: { name: row.name } }), confirmMessage: 'Delete this retention entry?' },
      ]}
      statsCards={[
        { label: 'Total Entries', path: 'total', hint: 'Tracked retention records', icon: ShieldCheck, tone: 'blue' },
        { label: 'Pending Release', path: 'pending', hint: 'Pending retention items', icon: ShieldCheck, tone: 'amber' },
      ]}
      columns={[
        { key: 'name', label: 'Entry', render: (row) => row.name || '-' },
        { key: 'customer', label: 'Customer', render: (row) => row.customer || '-' },
        { key: 'linked_project', label: 'Project', render: (row) => row.linked_project || '-' },
        { key: 'linked_invoice', label: 'Invoice', render: (row) => row.linked_invoice || '-' },
        { key: 'retention_amount', label: 'Retention', render: (row) => row.retention_amount || '-' },
        { key: 'release_amount', label: 'Released', render: (row) => row.release_amount || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
      ]}
      emptyMessage="No retention entries found"
    />
  );
}
