'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import OpsWorkspace from '@/components/ops/OpsWorkspace';

export default function EstimatesPage() {
  return (
    <OpsWorkspace
      title="Estimates"
      subtitle="Create customer quotations and move them toward proforma conversion."
      listMethod="get_estimates"
      statsMethod="get_estimate_stats"
      createMethod="create_estimate"
      createLabel="Create Estimate"
      createFields={[
        { name: 'customer', label: 'Customer', placeholder: 'GE Party name' },
        { name: 'linked_tender', label: 'Linked Tender', placeholder: 'Tender ID' },
        { name: 'linked_project', label: 'Linked Project', placeholder: 'Project ID' },
        { name: 'estimate_date', label: 'Estimate Date', type: 'date' },
        { name: 'valid_until', label: 'Valid Until', type: 'date' },
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
        linked_tender: values.linked_tender || undefined,
        linked_project: values.linked_project || undefined,
        estimate_date: values.estimate_date,
        valid_until: values.valid_until || undefined,
        gst_percent: Number(values.gst_percent) || 0,
        tds_percent: Number(values.tds_percent) || 0,
        retention_percent: Number(values.retention_percent) || 0,
        remarks: values.remarks || undefined,
        items: [{ description: values.description, qty: Number(values.qty) || 1, rate: Number(values.rate) || 0 }],
      })}
      actions={[
        { label: 'Send', tone: 'primary', visible: (row) => row.status === 'DRAFT', buildRequest: (row) => ({ method: 'submit_estimate', args: { name: row.name } }) },
        { label: 'Approve', tone: 'success', visible: (row) => row.status === 'SENT' || row.status === 'DRAFT', buildRequest: (row) => ({ method: 'approve_estimate', args: { name: row.name } }) },
        { label: 'Reject', tone: 'danger', visible: (row) => row.status !== 'CONVERTED' && row.status !== 'CANCELLED', buildRequest: (row) => ({ method: 'reject_estimate', args: { name: row.name } }), prompt: { message: 'Reason', field: 'reason' } },
        {
          label: 'Update',
          tone: 'primary',
          visible: (row) => row.status === 'DRAFT' || row.status === 'SENT',
          buildRequest: (row) => ({ method: 'update_estimate', args: { name: row.name } }),
          prompt: { message: 'Update note', field: 'remarks' },
        },
        { label: 'To Proforma', tone: 'warning', visible: (row) => row.status === 'APPROVED' || row.status === 'SENT', buildRequest: (row) => ({ method: 'convert_estimate_to_proforma', args: { name: row.name } }) },
        {
          label: 'Delete',
          tone: 'danger',
          visible: (row) => row.status === 'DRAFT',
          buildRequest: (row) => ({ method: 'delete_estimate', args: { name: row.name } }),
          confirmMessage: 'Delete this estimate?',
        },
      ]}
      statsCards={[
        { label: 'Estimates', path: 'total', hint: 'All quotation records', icon: FileText, tone: 'blue' },
        { label: 'Sent', path: 'sent', hint: 'Shared with customer', icon: FileText, tone: 'amber' },
        { label: 'Approved', path: 'approved', hint: 'Internally approved estimates', icon: FileText, tone: 'green' },
        { label: 'Value', path: 'total_value', hint: 'Aggregate estimate value', icon: FileText, tone: 'purple' },
      ]}
      columns={[
        { key: 'name', label: 'Estimate', render: (row) => <Link href={`/finance/estimates/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline font-medium">{row.name || '-'}</Link> },
        { key: 'customer', label: 'Customer', render: (row) => row.customer || '-' },
        { key: 'estimate_date', label: 'Date', render: (row) => row.estimate_date || '-' },
        { key: 'valid_until', label: 'Valid Until', render: (row) => row.valid_until || '-' },
        { key: 'net_amount', label: 'Net Amount', render: (row) => row.net_amount || 0 },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
      ]}
      emptyMessage="No estimates created yet"
    />
  );
}

