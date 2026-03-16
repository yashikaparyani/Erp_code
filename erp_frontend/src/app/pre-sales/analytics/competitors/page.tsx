'use client';

import { Trophy } from 'lucide-react';
import OpsWorkspace from '../../../../components/ops/OpsWorkspace';

export default function CompetitorsPage() {
  return (
    <OpsWorkspace
      title="Competitors"
      subtitle="Visible page for competitor intelligence already linked from the sidebar."
      listMethod="get_competitors"
      statsMethod="get_competitor_stats"
      createMethod="create_competitor"
      createLabel="Create Competitor"
      createFields={[
        { name: 'competitor_name', label: 'Competitor Name', placeholder: 'ABC Infra' },
        { name: 'tender', label: 'Tender', placeholder: 'Tender ID' },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      actions={[
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_competitor', args: { name: row.name } }), confirmMessage: 'Delete this competitor record?' },
      ]}
      statsCards={[
        { label: 'Competitors', path: 'total', hint: 'Tracked competitor records', icon: Trophy, tone: 'blue' },
      ]}
      columns={[
        { key: 'name', label: 'ID', render: (row) => row.name || '-' },
        { key: 'competitor_name', label: 'Competitor', render: (row) => row.competitor_name || row.name || '-' },
        { key: 'tender', label: 'Tender', render: (row) => row.tender || row.linked_tender || '-' },
        { key: 'status', label: 'Status', render: (row) => row.status || '-' },
      ]}
      emptyMessage="No competitors found"
    />
  );
}
