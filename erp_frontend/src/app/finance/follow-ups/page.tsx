'use client';

import { BellRing } from 'lucide-react';
import OpsWorkspace from '@/components/ops/OpsWorkspace';

export default function FollowUpsPage() {
  return (
    <OpsWorkspace
      title="Payment Follow Ups"
      subtitle="Track collections, promised dates, and escalation actions customer-wise."
      listMethod="get_payment_follow_ups"
      statsMethod="get_payment_follow_up_stats"
      createMethod="create_payment_follow_up"
      createLabel="Add Follow Up"
      createFields={[
        { name: 'customer', label: 'Customer', type: 'link', linkEntity: 'customer', placeholder: 'Search customer…' },
        { name: 'linked_invoice', label: 'Linked Invoice', type: 'link', linkEntity: 'invoice', placeholder: 'Search invoice…' },
        { name: 'linked_project', label: 'Linked Project', type: 'link', linkEntity: 'project', placeholder: 'Search project…' },
        { name: 'follow_up_date', label: 'Follow Up Date', type: 'date' },
        { name: 'follow_up_mode', label: 'Mode', type: 'select', options: [{ label: 'Call', value: 'CALL' }, { label: 'Email', value: 'EMAIL' }, { label: 'WhatsApp', value: 'WHATSAPP' }, { label: 'Meeting', value: 'MEETING' }] },
        { name: 'contact_person', label: 'Contact Person' },
        { name: 'promised_payment_date', label: 'Promised Payment Date', type: 'date' },
        { name: 'promised_payment_amount', label: 'Promised Amount', type: 'number', defaultValue: 0 },
        { name: 'next_follow_up_on', label: 'Next Follow Up', type: 'date' },
        { name: 'summary', label: 'Summary', type: 'textarea' },
      ]}
      mapCreatePayload={(values) => ({
        customer: values.customer || undefined,
        linked_invoice: values.linked_invoice || undefined,
        linked_project: values.linked_project || undefined,
        follow_up_date: values.follow_up_date,
        follow_up_mode: values.follow_up_mode || 'CALL',
        contact_person: values.contact_person || undefined,
        promised_payment_date: values.promised_payment_date || undefined,
        promised_payment_amount: Number(values.promised_payment_amount) || 0,
        next_follow_up_on: values.next_follow_up_on || undefined,
        summary: values.summary,
      })}
      actions={[
        {
          label: 'Update',
          tone: 'primary',
          visible: (row) => row.status !== 'CLOSED',
          buildRequest: (row) => ({ method: 'update_payment_follow_up', args: { name: row.name } }),
          prompt: { message: 'Update note', field: 'remarks' },
        },
        { label: 'Escalate', tone: 'warning', visible: (row) => row.status !== 'CLOSED', buildRequest: (row) => ({ method: 'escalate_payment_follow_up', args: { name: row.name } }), prompt: { message: 'Escalation note', field: 'remarks' } },
        { label: 'Close', tone: 'success', visible: (row) => row.status !== 'CLOSED', buildRequest: (row) => ({ method: 'close_payment_follow_up', args: { name: row.name } }), prompt: { message: 'Closing note', field: 'remarks' } },
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_payment_follow_up', args: { name: row.name } }), confirmMessage: 'Delete this follow-up?' },
      ]}
      statsCards={[
        { label: 'Total', path: 'total', hint: 'Recorded follow-up actions', icon: BellRing, tone: 'blue' },
        { label: 'Open', path: 'open', hint: 'Still in active chase', icon: BellRing, tone: 'amber' },
        { label: 'Promised', path: 'promised', hint: 'Payment promised by customer', icon: BellRing, tone: 'green' },
        { label: 'Promised Amount', path: 'promised_amount', hint: 'Expected collection', icon: BellRing, tone: 'purple' },
      ]}
      columns={[
        { key: 'customer', label: 'Customer', render: (row) => row.customer || '-' },
        { key: 'linked_invoice', label: 'Invoice', render: (row) => row.linked_invoice || '-' },
        { key: 'follow_up_date', label: 'Follow Up Date', render: (row) => row.follow_up_date || '-' },
        { key: 'next_follow_up_on', label: 'Next Follow Up', render: (row) => row.next_follow_up_on || '-' },
        { key: 'summary', label: 'Summary', render: (row) => row.summary || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
      ]}
      emptyMessage="No payment follow-ups recorded"
    />
  );
}
