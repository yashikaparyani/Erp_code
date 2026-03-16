'use client';

import { CreditCard } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function PaymentReceiptsPage() {
  return (
    <OpsWorkspace
      title="Payment Receipts"
      subtitle="Track client payment receipts against invoices."
      listMethod="get_payment_receipts"
      statsMethod="get_payment_receipt_stats"
      createMethod="create_payment_receipt"
      createLabel="Create Payment Receipt"
      createFields={[
        { name: 'invoice', label: 'Invoice', placeholder: 'Invoice ID' },
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'receipt_date', label: 'Receipt Date', type: 'date' },
        { name: 'amount_received', label: 'Amount Received', type: 'number', defaultValue: 0 },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      actions={[
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_payment_receipt', args: { name: row.name } }), confirmMessage: 'Delete this payment receipt?' },
      ]}
      statsCards={[
        { label: 'Receipts', path: 'total', hint: 'Total recorded receipts', icon: CreditCard, tone: 'blue' },
        { label: 'Received Amount', path: 'total_amount_received', hint: 'Aggregate collections', icon: CreditCard, tone: 'green' },
      ]}
      columns={[
        { key: 'name', label: 'Receipt', render: (row) => row.name || '-' },
        { key: 'invoice', label: 'Invoice', render: (row) => row.invoice || '-' },
        { key: 'project', label: 'Project', render: (row) => row.project || '-' },
        { key: 'receipt_date', label: 'Date', render: (row) => row.receipt_date || '-' },
        { key: 'amount_received', label: 'Amount', render: (row) => row.amount_received || '-' },
      ]}
      emptyMessage="No payment receipts recorded"
    />
  );
}
