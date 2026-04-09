'use client';

import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import OpsWorkspace from '../../../components/ops/OpsWorkspace';

export default function PaymentReceiptsPage() {
  return (
    <OpsWorkspace
      title="Payment Receipts"
      subtitle="Track invoice receipts, advance collections, and adjustment entries."
      listMethod="get_payment_receipts"
      statsMethod="get_payment_receipt_stats"
      createMethod="create_payment_receipt"
      createLabel="Create Payment Receipt"
      createFields={[
        {
          name: 'receipt_type',
          label: 'Receipt Type',
          type: 'select',
          defaultValue: 'AGAINST_INVOICE',
          options: [
            { label: 'Against Invoice', value: 'AGAINST_INVOICE' },
            { label: 'Advance', value: 'ADVANCE' },
            { label: 'Adjustment', value: 'ADJUSTMENT' },
          ],
        },
        { name: 'customer', label: 'Customer', type: 'link', linkEntity: 'customer', placeholder: 'Search customers…' },
        { name: 'linked_invoice', label: 'Linked Invoice', type: 'link', linkEntity: 'invoice', placeholder: 'Search invoices…' },
        { name: 'linked_project', label: 'Project', type: 'link', linkEntity: 'project', placeholder: 'Search projects…' },
        { name: 'advance_reference', label: 'Advance Ref', placeholder: 'Advance reference' },
        { name: 'received_date', label: 'Receipt Date', type: 'date' },
        { name: 'amount_received', label: 'Amount Received', type: 'number', defaultValue: 0 },
        { name: 'adjusted_amount', label: 'Adjusted Amount', type: 'number', defaultValue: 0 },
        { name: 'tds_amount', label: 'TDS Amount', type: 'number', defaultValue: 0 },
        {
          name: 'payment_mode',
          label: 'Payment Mode',
          type: 'select',
          defaultValue: 'BANK_TRANSFER',
          options: [
            { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
            { label: 'Cheque', value: 'CHEQUE' },
            { label: 'Cash', value: 'CASH' },
            { label: 'Other', value: 'OTHER' },
          ],
        },
        { name: 'payment_reference', label: 'Payment Ref', placeholder: 'UTR / cheque / note' },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      actions={[
        {
          label: 'Update',
          tone: 'primary',
          buildRequest: (row) => ({ method: 'update_payment_receipt', args: { name: row.name } }),
          prompt: { message: 'Update note', field: 'remarks' },
        },
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_payment_receipt', args: { name: row.name } }), confirmMessage: 'Delete this payment receipt?' },
      ]}
      statsCards={[
        { label: 'Receipts', path: 'total_receipts', hint: 'Total recorded receipts', icon: CreditCard, tone: 'blue' },
        { label: 'Received Amount', path: 'total_received', hint: 'Aggregate collections', icon: CreditCard, tone: 'green' },
        { label: 'Advance Received', path: 'advance_received', hint: 'Unapplied or partially applied advances', icon: CreditCard, tone: 'amber' },
        { label: 'Adjusted Amount', path: 'adjusted_amount', hint: 'Advance moved into invoices', icon: CreditCard, tone: 'purple' },
      ]}
      columns={[
        { key: 'name', label: 'Receipt', render: (row) => <Link href={`/finance/payment-receipts/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline font-medium">{row.name || '-'}</Link> },
        { key: 'receipt_type', label: 'Type', render: (row) => row.receipt_type || '-' },
        { key: 'customer', label: 'Customer', render: (row) => row.customer || '-' },
        { key: 'linked_invoice', label: 'Invoice', render: (row) => row.linked_invoice || '-' },
        { key: 'linked_project', label: 'Project', render: (row) => row.linked_project || '-' },
        { key: 'received_date', label: 'Date', render: (row) => row.received_date || '-' },
        { key: 'amount_received', label: 'Amount', render: (row) => row.amount_received || '-' },
        { key: 'adjusted_amount', label: 'Adjusted', render: (row) => row.adjusted_amount || '-' },
      ]}
      emptyMessage="No payment receipts recorded"
    />
  );
}
