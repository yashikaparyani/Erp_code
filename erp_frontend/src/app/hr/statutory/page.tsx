'use client';

import Link from 'next/link';
import { Scale } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function HrStatutoryLedgerPage() {
  return (
    <OpsWorkspace
      title="Statutory Ledger"
      subtitle="PF, ESI, PT, and other statutory compliance entries."
      listMethod="get_statutory_ledgers"
      statsMethod="get_statutory_ledger_stats"
      createMethod="create_statutory_ledger"
      createLabel="Create Entry"
      createFields={[
        { name: 'employee', label: 'Employee', placeholder: 'Employee ID/name' },
        { name: 'ledger_type', label: 'Type', placeholder: 'PF / ESI / PT / TDS / LWF' },
        { name: 'period', label: 'Period', placeholder: 'e.g. 2026-04' },
        { name: 'employee_share', label: 'Employee Share', type: 'number', defaultValue: 0 },
        { name: 'employer_share', label: 'Employer Share', type: 'number', defaultValue: 0 },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      actions={[
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_statutory_ledger', args: { name: row.name } }), confirmMessage: 'Delete this statutory entry?' },
      ]}
      statsCards={[
        { label: 'Total Entries', path: 'total', hint: 'Statutory ledger rows', icon: Scale, tone: 'blue' },
        { label: 'Total Amount', path: 'total_amount', hint: 'Aggregate statutory', icon: Scale, tone: 'purple' },
      ]}
      columns={[
        { key: 'name', label: 'Entry', render: (row) => <Link href={`/hr/statutory/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline font-medium">{row.name || '-'}</Link> },
        { key: 'employee', label: 'Employee', render: (row) => row.employee || '-' },
        { key: 'ledger_type', label: 'Type', render: (row) => row.ledger_type || '-' },
        { key: 'period', label: 'Period', render: (row) => row.period || '-' },
        { key: 'employee_share', label: 'Emp Share', render: (row) => row.employee_share ?? '-' },
        { key: 'employer_share', label: 'Empr Share', render: (row) => row.employer_share ?? '-' },
      ]}
      emptyMessage="No statutory ledger entries found"
    />
  );
}
