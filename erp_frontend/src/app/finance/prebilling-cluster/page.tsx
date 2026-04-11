'use client';

import { useState } from 'react';
import { FileText, ReceiptText, PieChart, CheckSquare } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import OpsWorkspace from '@/components/ops/OpsWorkspace';

type PreBillingTab = 'estimates' | 'proformas' | 'costing' | 'queue';

export default function PreBillingClusterPage() {
  const [activeTab, setActiveTab] = useState<PreBillingTab>('estimates');

  const tabs = [
    { key: 'estimates' as PreBillingTab, label: 'Estimates', icon: FileText },
    { key: 'proformas' as PreBillingTab, label: 'Proformas', icon: ReceiptText },
    { key: 'costing' as PreBillingTab, label: 'Costing', icon: PieChart },
    { key: 'queue' as PreBillingTab, label: 'Queue', icon: CheckSquare },
  ];

  return (
    <RegisterPage
      title="Pre-Billing Cluster"
      description="Consolidated estimates, proformas, costing, and approval queue"
      loading={false}
      empty={false}
    >
      {/* Tab buttons */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Estimates Tab */}
      {activeTab === 'estimates' && (
        <OpsWorkspace
          title=""
          subtitle=""
          listMethod="get_estimates"
          statsMethod="get_estimate_stats"
          createMethod="create_estimate"
          createLabel="Create Estimate"
          createFields={[
            { name: 'customer', label: 'Customer', placeholder: 'GE Party name' },
            { name: 'linked_project', label: 'Project', placeholder: 'Project ID' },
            { name: 'estimate_date', label: 'Estimate Date', type: 'date' },
            { name: 'valid_until', label: 'Valid Until', type: 'date' },
            { name: 'gst_percent', label: 'GST %', type: 'number', defaultValue: 18 },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'qty', label: 'Qty', type: 'number', defaultValue: 1 },
            { name: 'rate', label: 'Rate', type: 'number', defaultValue: 0 },
            { name: 'remarks', label: 'Remarks', type: 'textarea' },
          ]}
          mapCreatePayload={(values) => ({
            customer: values.customer,
            linked_project: values.linked_project || undefined,
            estimate_date: values.estimate_date,
            valid_until: values.valid_until || undefined,
            gst_percent: Number(values.gst_percent) || 0,
            remarks: values.remarks || undefined,
            items: [{ description: values.description, qty: Number(values.qty) || 1, rate: Number(values.rate) || 0 }],
          })}
          actions={[
            { label: 'Send', tone: 'primary', visible: (row) => row.status === 'DRAFT', buildRequest: (row) => ({ method: 'submit_estimate', args: { name: row.name } }) },
            { label: 'Approve', tone: 'success', visible: (row) => row.status === 'SENT', buildRequest: (row) => ({ method: 'approve_estimate', args: { name: row.name } }) },
            { label: 'To Proforma', tone: 'warning', visible: (row) => row.status === 'APPROVED', buildRequest: (row) => ({ method: 'convert_estimate_to_proforma', args: { name: row.name } }) },
            { label: 'Delete', tone: 'danger', visible: (row) => row.status === 'DRAFT', buildRequest: (row) => ({ method: 'delete_estimate', args: { name: row.name } }), confirmMessage: 'Delete?' },
          ]}
          statsCards={[
            { label: 'Total', path: 'total', icon: FileText, tone: 'blue' },
            { label: 'Approved', path: 'approved', icon: FileText, tone: 'green' },
            { label: 'Value', path: 'total_value', icon: FileText, tone: 'purple' },
          ]}
          columns={[
            { key: 'name', label: 'Estimate', render: (row) => row.name },
            { key: 'customer', label: 'Customer', render: (row) => row.customer || '-' },
            { key: 'estimate_date', label: 'Date', render: (row) => row.estimate_date || '-' },
            { key: 'net_amount', label: 'Amount', render: (row) => row.net_amount || 0 },
            { key: 'status', label: 'Status', render: (row) => row.status || '-' },
          ]}
          emptyMessage="No estimates yet"
        />
      )}

      {/* Proformas Tab */}
      {activeTab === 'proformas' && (
        <OpsWorkspace
          title=""
          subtitle=""
          listMethod="get_proforma_invoices"
          statsMethod="get_proforma_invoice_stats"
          createMethod="create_proforma_invoice"
          createLabel="Create Proforma"
          createFields={[
            { name: 'customer', label: 'Customer', placeholder: 'GE Party name' },
            { name: 'linked_estimate', label: 'Estimate', placeholder: 'Estimate ID' },
            { name: 'linked_project', label: 'Project', placeholder: 'Project ID' },
            { name: 'proforma_date', label: 'Date', type: 'date' },
            { name: 'due_date', label: 'Due Date', type: 'date' },
            { name: 'gst_percent', label: 'GST %', type: 'number', defaultValue: 18 },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'qty', label: 'Qty', type: 'number', defaultValue: 1 },
            { name: 'rate', label: 'Rate', type: 'number', defaultValue: 0 },
          ]}
          mapCreatePayload={(values) => ({
            customer: values.customer,
            linked_estimate: values.linked_estimate || undefined,
            linked_project: values.linked_project || undefined,
            proforma_date: values.proforma_date,
            due_date: values.due_date || undefined,
            gst_percent: Number(values.gst_percent) || 0,
            items: [{ description: values.description, qty: Number(values.qty) || 1, rate: Number(values.rate) || 0 }],
          })}
          actions={[
            { label: 'Send', tone: 'primary', visible: (row) => row.status === 'DRAFT', buildRequest: (row) => ({ method: 'submit_proforma_invoice', args: { name: row.name } }) },
            { label: 'Approve', tone: 'success', visible: (row) => row.status === 'SENT', buildRequest: (row) => ({ method: 'approve_proforma_invoice', args: { name: row.name } }) },
            { label: 'To Invoice', tone: 'warning', visible: (row) => row.status === 'APPROVED', buildRequest: (row) => ({ method: 'convert_proforma_to_invoice', args: { name: row.name } }) },
            { label: 'Delete', tone: 'danger', visible: (row) => row.status === 'DRAFT', buildRequest: (row) => ({ method: 'delete_proforma_invoice', args: { name: row.name } }), confirmMessage: 'Delete?' },
          ]}
          statsCards={[
            { label: 'Total', path: 'total', icon: ReceiptText, tone: 'blue' },
            { label: 'Approved', path: 'approved', icon: ReceiptText, tone: 'green' },
            { label: 'Value', path: 'total_value', icon: ReceiptText, tone: 'purple' },
          ]}
          columns={[
            { key: 'name', label: 'Proforma', render: (row) => row.name },
            { key: 'customer', label: 'Customer', render: (row) => row.customer || '-' },
            { key: 'proforma_date', label: 'Date', render: (row) => row.proforma_date || '-' },
            { key: 'net_amount', label: 'Amount', render: (row) => row.net_amount || 0 },
            { key: 'status', label: 'Status', render: (row) => row.status || '-' },
          ]}
          emptyMessage="No proformas yet"
        />
      )}

      {/* Costing Tab */}
      {activeTab === 'costing' && (
        <OpsWorkspace
          title=""
          subtitle=""
          listMethod="get_cost_sheets"
          statsMethod="get_cost_sheet_stats"
          createMethod="create_cost_sheet"
          createLabel="Create Cost Sheet"
          createFields={[
            { name: 'linked_project', label: 'Project', placeholder: 'Project ID' },
            { name: 'linked_tender', label: 'Tender', placeholder: 'Tender ID' },
            { name: 'version', label: 'Version', type: 'number', defaultValue: 1 },
            { name: 'margin_percent', label: 'Margin %', type: 'number', defaultValue: 0 },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'cost_type', label: 'Cost Type', placeholder: 'Material / Labor / Other' },
            { name: 'quantity', label: 'Quantity', type: 'number', defaultValue: 1 },
            { name: 'rate', label: 'Rate', type: 'number', defaultValue: 0 },
          ]}
          mapCreatePayload={(values) => ({
            linked_project: values.linked_project || undefined,
            linked_tender: values.linked_tender || undefined,
            version: Number(values.version) || 1,
            margin_percent: Number(values.margin_percent) || 0,
            items: [{ description: values.description, cost_type: values.cost_type, quantity: Number(values.quantity) || 1, rate: Number(values.rate) || 0 }],
          })}
          actions={[
            { label: 'Submit', tone: 'primary', visible: (row) => row.status === 'DRAFT', buildRequest: (row) => ({ method: 'submit_cost_sheet', args: { name: row.name } }) },
            { label: 'Approve', tone: 'success', visible: (row) => row.status === 'PENDING_APPROVAL', buildRequest: (row) => ({ method: 'approve_cost_sheet', args: { name: row.name } }) },
            { label: 'Reject', tone: 'danger', visible: (row) => row.status === 'PENDING_APPROVAL', buildRequest: (row) => ({ method: 'reject_cost_sheet', args: { name: row.name } }), prompt: { message: 'Reason', field: 'reason' } },
            { label: 'Delete', tone: 'danger', visible: (row) => row.status === 'DRAFT', buildRequest: (row) => ({ method: 'delete_cost_sheet', args: { name: row.name } }), confirmMessage: 'Delete?' },
          ]}
          statsCards={[
            { label: 'Total', path: 'total', icon: PieChart, tone: 'blue' },
            { label: 'Approved', path: 'approved', icon: PieChart, tone: 'green' },
            { label: 'Base Cost', path: 'total_base_cost', icon: PieChart, tone: 'purple' },
          ]}
          columns={[
            { key: 'name', label: 'Cost Sheet', render: (row) => row.name },
            { key: 'linked_project', label: 'Project', render: (row) => row.linked_project || '-' },
            { key: 'version', label: 'V', render: (row) => row.version || '-' },
            { key: 'base_cost', label: 'Base', render: (row) => row.base_cost || 0 },
            { key: 'sell_value', label: 'Sell', render: (row) => row.sell_value || 0 },
            { key: 'status', label: 'Status', render: (row) => row.status || '-' },
          ]}
          emptyMessage="No cost sheets yet"
        />
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <OpsWorkspace
          title=""
          subtitle=""
          listMethod="get_costing_queue"
          statsMethod="get_costing_queue_stats"
          createLabel="N/A"
          actions={[
            { label: 'Release', tone: 'success', buildRequest: (row) => ({ method: 'release_costing_queue_item', args: { name: row.name } }) },
            { label: 'Hold', tone: 'warning', buildRequest: (row) => ({ method: 'hold_costing_queue_item', args: { name: row.name } }), prompt: { message: 'Hold reason', field: 'reason' } },
            { label: 'Reject', tone: 'danger', buildRequest: (row) => ({ method: 'reject_costing_queue_item', args: { name: row.name } }), prompt: { message: 'Reject reason', field: 'reason' } },
          ]}
          statsCards={[
            { label: 'Pending', path: 'pending', icon: CheckSquare, tone: 'amber' },
            { label: 'Released', path: 'released', icon: CheckSquare, tone: 'green' },
            { label: 'Held', path: 'held', icon: CheckSquare, tone: 'orange' },
            { label: 'Rejected', path: 'rejected', icon: CheckSquare, tone: 'red' },
          ]}
          columns={[
            { key: 'name', label: 'Item', render: (row) => row.name },
            { key: 'source_type', label: 'Source', render: (row) => row.source_type || '-' },
            { key: 'project', label: 'Project', render: (row) => row.project || '-' },
            { key: 'amount', label: 'Amount', render: (row) => row.amount || 0 },
            { key: 'disbursement_status', label: 'Status', render: (row) => row.disbursement_status || 'Pending' },
          ]}
          emptyMessage="No queue items"
        />
      )}
    </RegisterPage>
  );
}
