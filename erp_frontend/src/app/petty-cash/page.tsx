'use client';

import { Banknote } from 'lucide-react';
import OpsWorkspace from '../../components/ops/OpsWorkspace';

export default function PettyCashPage() {
  return (
    <OpsWorkspace
      title="Petty Cash"
      subtitle="Capture petty cash requests and approval workflow."
      listMethod="get_petty_cash_entries"
      createMethod="create_petty_cash_entry"
      createLabel="New Petty Cash Entry"
      createFields={[
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'site', label: 'Site', placeholder: 'Site' },
        { name: 'category', label: 'Category', placeholder: 'Travel / Site / Office' },
        { name: 'amount', label: 'Amount', type: 'number', defaultValue: 0 },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      actions={[
        { label: 'Approve', tone: 'success', buildRequest: (row) => ({ method: 'approve_petty_cash_entry', args: { name: row.name } }), visible: (row) => row.status !== 'Approved' },
        { label: 'Reject', tone: 'danger', buildRequest: (row) => ({ method: 'reject_petty_cash_entry', args: { name: row.name } }), visible: (row) => row.status !== 'Rejected', prompt: { message: 'Reject reason', field: 'reason' } },
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_petty_cash_entry', args: { name: row.name } }), confirmMessage: 'Delete this entry?' },
      ]}
      statsCards={[
        { label: 'Entries', path: 'length', hint: 'Petty cash requests loaded', icon: Banknote, tone: 'amber' },
      ]}
      columns={[
        { key: 'name', label: 'Entry', render: (row) => row.name || '-' },
        { key: 'project', label: 'Project', render: (row) => row.project || '-' },
        { key: 'category', label: 'Category', render: (row) => row.category || '-' },
        { key: 'amount', label: 'Amount', render: (row) => row.amount || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
      ]}
      emptyMessage="No petty cash entries found"
    />
  );
}
