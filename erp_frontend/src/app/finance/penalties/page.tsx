'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function PenaltiesPage() {
  return (
    <OpsWorkspace
      title="Penalty Deductions"
      subtitle="Manage LD penalties, approval, application, and reversals."
      listMethod="get_penalty_deductions"
      statsMethod="get_penalty_stats"
      createMethod="create_penalty_deduction"
      createLabel="Create Penalty"
      createFields={[
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'source', label: 'Source', placeholder: 'LD / SLA / Client' },
        { name: 'penalty_amount', label: 'Penalty Amount', type: 'number', defaultValue: 0 },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      actions={[
        { label: 'Approve', tone: 'success', buildRequest: (row) => ({ method: 'approve_penalty_deduction', args: { name: row.name } }) },
        { label: 'Apply', tone: 'warning', buildRequest: (row) => ({ method: 'apply_penalty_deduction', args: { name: row.name } }), prompt: { message: 'Invoice name to apply against', field: 'invoice_name' } },
        { label: 'Reverse', tone: 'danger', buildRequest: (row) => ({ method: 'reverse_penalty_deduction', args: { name: row.name } }), prompt: { message: 'Reverse reason', field: 'reason' } },
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_penalty_deduction', args: { name: row.name } }), confirmMessage: 'Delete this penalty deduction?' },
      ]}
      statsCards={[
        { label: 'Total Penalties', path: 'total', hint: 'Penalty records tracked', icon: AlertTriangle, tone: 'red' },
        { label: 'Pending', path: 'pending', hint: 'Pending penalty actions', icon: AlertTriangle, tone: 'amber' },
      ]}
      columns={[
        { key: 'name', label: 'Penalty', render: (row) => <Link href={`/finance/penalties/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline font-medium">{row.name || '-'}</Link> },
        { key: 'project', label: 'Project', render: (row) => row.project || '-' },
        { key: 'source', label: 'Source', render: (row) => row.source || '-' },
        { key: 'penalty_amount', label: 'Amount', render: (row) => row.penalty_amount || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
      ]}
      emptyMessage="No penalty deductions found"
    />
  );
}
