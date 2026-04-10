'use client';

import Link from 'next/link';
import { Network } from 'lucide-react';
import OpsWorkspace from '../../../../components/ops/OpsWorkspace';

export default function IpPoolsPage() {
  return (
    <OpsWorkspace
      title="IP Pool Management"
      subtitle="Manage IP address pools for commissioning and network configuration."
      listMethod="get_ip_pools"
      createMethod="create_ip_pool"
      createLabel="Create IP Pool"
      createFields={[
        { name: 'pool_name', label: 'Pool Name', placeholder: 'e.g. Site-A CCTV Pool' },
        { name: 'linked_project', label: 'Project', placeholder: 'Project ID' },
        { name: 'linked_site', label: 'Site', placeholder: 'Site ID' },
        { name: 'subnet', label: 'Subnet', placeholder: 'e.g. 192.168.1.0/24' },
        { name: 'gateway', label: 'Gateway', placeholder: 'e.g. 192.168.1.1' },
        { name: 'vlan_id', label: 'VLAN ID', placeholder: 'e.g. 100' },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      actions={[
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_ip_pool', args: { name: row.name } }), confirmMessage: 'Delete this IP pool?' },
      ]}
      statsCards={[
        { label: 'IP Pools', path: 'total', hint: 'Total pools configured', icon: Network, tone: 'blue' },
      ]}
      columns={[
        { key: 'name', label: 'Pool', render: (row) => <Link href={`/execution/commissioning/ip-pools/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline font-medium">{row.pool_name || row.name || '-'}</Link> },
        { key: 'linked_project', label: 'Project', render: (row) => row.linked_project || '-' },
        { key: 'linked_site', label: 'Site', render: (row) => row.linked_site || '-' },
        { key: 'subnet', label: 'Subnet', render: (row) => <span className="font-mono text-sm">{row.subnet || '-'}</span> },
        { key: 'gateway', label: 'Gateway', render: (row) => <span className="font-mono text-sm">{row.gateway || '-'}</span> },
        { key: 'vlan_id', label: 'VLAN', render: (row) => row.vlan_id || '-' },
      ]}
      emptyMessage="No IP pools configured"
    />
  );
}
