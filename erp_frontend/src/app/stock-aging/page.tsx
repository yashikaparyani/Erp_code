'use client';

import { PackageCheck } from 'lucide-react';
import OpsWorkspace from '../../components/ops/OpsWorkspace';

export default function StockAgingPage() {
  return (
    <OpsWorkspace
      title="Stock Aging"
      subtitle="Identify aging, slow-moving, and dead stock."
      listMethod="get_stock_aging"
      columns={[
        { key: 'item_code', label: 'Item Code', render: (row) => row.item_code || '-' },
        { key: 'item_name', label: 'Item Name', render: (row) => row.item_name || '-' },
        { key: 'warehouse', label: 'Warehouse', render: (row) => row.warehouse || '-' },
        { key: 'qty', label: 'Qty', render: (row) => row.qty ?? '-' },
        { key: 'average_age', label: 'Avg Age', render: (row) => row.average_age || row.avg_age || '-' },
        { key: 'oldest_age', label: 'Oldest', render: (row) => row.oldest_age || '-' },
      ]}
      statsCards={[
        { label: 'Aging Rows', path: 'length', hint: 'Loaded aging records', icon: PackageCheck, tone: 'amber' },
      ]}
      emptyMessage="No stock aging data available"
    />
  );
}
