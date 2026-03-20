'use client';

import { ReceiptText } from 'lucide-react';
import OpsWorkspace from '@/components/ops/OpsWorkspace';

export default function ProformasPage() {
  return (
    <OpsWorkspace
      title="Proforma Invoices"
      subtitle="Hold pre-billing commercial documents before final invoice generation."
      listMethod="get_proforma_invoices"
      statsMethod="get_proforma_invoice_stats"
      createMethod="create_proforma_invoice"
      createLabel="Create Proforma"
      createFields={[
        { name: 'customer', label: 'Customer', placeholder: 'GE Party name' },
        { name: 'linked_estimate', label: 'Linked Estimate', placeholder: 'Estimate ID' },
        { name: 'linked_project', label: 'Linked Project', placeholder: 'Project ID' },
        { name: 'proforma_date', label: 'Proforma Date', type: 'date' },
        { name: 'due_date', label: 'Due Date', type: 'date' },
        { name: 'gst_percent', label: 'GST %', type: 'number', defaultValue: 18 },
        { name: 'tds_percent', label: 'TDS %', type: 'number', defaultValue: 0 },
        { name: 'retention_percent', label: 'Retention %', type: 'number', defaultValue: 0 },
        { name: 'description', label: 'Line Description', type: 'textarea' },
        { name: 'qty', label: 'Qty', type: 'number', defaultValue: 1 },
        { name: 'rate', label: 'Rate', type: 'number', defaultValue: 0 },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      mapCreatePayload={(values) => ({
        customer: values.customer,
        linked_estimate: values.linked_estimate || undefined,
        linked_project: values.linked_project || undefined,
        proforma_date: values.proforma_date,
        due_date: values.due_date || undefined,
        gst_percent: Number(values.gst_percent) || 0,
        tds_percent: Number(values.tds_percent) || 0,
        retention_percent: Number(values.retention_percent) || 0,
        remarks: values.remarks || undefined,
        items: [{ description: values.description, qty: Number(values.qty) || 1, rate: Number(values.rate) || 0 }],
      })}
      actions={[
        { label: 'Send', tone: 'primary', visible: (row) => row.status === 'DRAFT', buildRequest: (row) => ({ method: 'submit_proforma_invoice', args: { name: row.name } }) },
        { label: 'Approve', tone: 'success', visible: (row) => row.status === 'SENT' || row.status === 'DRAFT', buildRequest: (row) => ({ method: 'approve_proforma_invoice', args: { name: row.name } }) },
        { label: 'Cancel', tone: 'danger', visible: (row) => row.status !== 'CONVERTED', buildRequest: (row) => ({ method: 'cancel_proforma_invoice', args: { name: row.name } }), prompt: { message: 'Reason', field: 'reason' } },
        { label: 'To Invoice', tone: 'warning', visible: (row) => row.status === 'APPROVED' || row.status === 'SENT', buildRequest: (row) => ({ method: 'convert_proforma_to_invoice', args: { name: row.name } }) },
      ]}
      statsCards={[
        { label: 'Proformas', path: 'total', hint: 'All proforma documents', icon: ReceiptText, tone: 'blue' },
        { label: 'Sent', path: 'sent', hint: 'Shared with customer', icon: ReceiptText, tone: 'amber' },
        { label: 'Approved', path: 'approved', hint: 'Ready for billing', icon: ReceiptText, tone: 'green' },
        { label: 'Value', path: 'total_value', hint: 'Aggregate proforma value', icon: ReceiptText, tone: 'purple' },
      ]}
      columns={[
        { key: 'name', label: 'Proforma', render: (row) => row.name || '-' },
        { key: 'customer', label: 'Customer', render: (row) => row.customer || '-' },
        { key: 'proforma_date', label: 'Date', render: (row) => row.proforma_date || '-' },
        { key: 'due_date', label: 'Due Date', render: (row) => row.due_date || '-' },
        { key: 'net_amount', label: 'Net Amount', render: (row) => row.net_amount || 0 },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
      ]}
      emptyMessage="No proforma invoices created yet"
    />
  );
}

