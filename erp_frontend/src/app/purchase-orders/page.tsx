'use client';

import { Banknote, ShoppingCart, Truck } from 'lucide-react';
import OpsWorkspace from '../../components/ops/OpsWorkspace';

export default function PurchaseOrdersPage() {
  return (
    <OpsWorkspace
      title="Purchase Orders"
      subtitle="Track issued purchase orders and receiving exposure."
      listMethod="get_purchase_orders"
      statsMethod="get_po_stats"
      statsCards={[
        { label: 'Total POs', path: 'total', hint: 'Overall purchase orders', icon: ShoppingCart, tone: 'blue' },
        { label: 'To Receive', path: 'to_receive', hint: 'Open receiving backlog', icon: Truck, tone: 'orange' },
        { label: 'PO Value', path: 'total_value', hint: 'Committed PO value', icon: Banknote, tone: 'green' },
      ]}
      columns={[
        { key: 'name', label: 'PO', render: (row) => row.name || '-' },
        { key: 'supplier', label: 'Supplier', render: (row) => row.supplier || '-' },
        { key: 'project', label: 'Project', render: (row) => row.project || row.linked_project || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
        { key: 'grand_total', label: 'Value', render: (row) => row.grand_total || row.base_grand_total || '-' },
      ]}
      emptyMessage="No purchase orders available"
    />
  );
}
