'use client';

import { PackageCheck, Truck } from 'lucide-react';
import OpsWorkspace from '../../components/ops/OpsWorkspace';

export default function GrnsPage() {
  return (
    <OpsWorkspace
      title="Goods Receipts"
      subtitle="Receive goods against purchase orders and track completed inwarding."
      listMethod="get_grns"
      statsMethod="get_grn_stats"
      createMethod="create_grn"
      createLabel="Create GRN"
      createFields={[
        { name: 'purchase_order', label: 'Purchase Order', placeholder: 'PO-0001' },
        { name: 'supplier', label: 'Supplier', placeholder: 'Supplier name' },
        { name: 'project', label: 'Project', placeholder: 'Project code/name' },
        { name: 'posting_date', label: 'Posting Date', type: 'date' },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      statsCards={[
        { label: 'Total GRNs', path: 'total', hint: 'All goods receipts', icon: PackageCheck, tone: 'blue' },
        { label: 'Completed', path: 'completed', hint: 'Completed receipts', icon: Truck, tone: 'green' },
      ]}
      columns={[
        { key: 'name', label: 'GRN', render: (row) => row.name || '-' },
        { key: 'purchase_order', label: 'PO', render: (row) => row.purchase_order || '-' },
        { key: 'supplier', label: 'Supplier', render: (row) => row.supplier || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
        { key: 'posting_date', label: 'Posting', render: (row) => row.posting_date || '-' },
      ]}
      emptyMessage="No GRNs recorded"
    />
  );
}
