'use client';

import { Database } from 'lucide-react';
import OpsWorkspace from '../../components/ops/OpsWorkspace';

export default function StockPositionPage() {
  return (
    <OpsWorkspace
      title="Stock Position"
      subtitle="Warehouse-wise live stock visibility."
      listMethod="get_stock_position"
      columns={[
        { key: 'item_code', label: 'Item Code', render: (row) => row.item_code || '-' },
        { key: 'item_name', label: 'Item Name', render: (row) => row.item_name || '-' },
        { key: 'warehouse', label: 'Warehouse', render: (row) => row.warehouse || '-' },
        { key: 'actual_qty', label: 'Actual Qty', render: (row) => row.actual_qty ?? '-' },
        { key: 'reserved_qty', label: 'Reserved Qty', render: (row) => row.reserved_qty ?? '-' },
        { key: 'projected_qty', label: 'Projected Qty', render: (row) => row.projected_qty ?? '-' },
      ]}
      statsCards={[
        { label: 'Stock Rows', path: 'length', hint: 'Loaded stock records', icon: Database, tone: 'teal' },
      ]}
      emptyMessage="No stock rows available"
    />
  );
}
