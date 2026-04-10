'use client';

import Link from 'next/link';
import { Wifi } from 'lucide-react';
import OpsWorkspace from '../../../../components/ops/OpsWorkspace';

export default function IpAllocationsPage() {
  return (
    <OpsWorkspace
      title="IP Allocation Register"
      subtitle="Track assigned IP addresses per device and site."
      listMethod="get_ip_allocations"
      createMethod="create_ip_allocation"
      createLabel="Allocate IP"
      createFields={[
        { name: 'ip_pool', label: 'IP Pool', placeholder: 'Pool ID' },
        { name: 'ip_address', label: 'IP Address', placeholder: 'e.g. 192.168.1.10' },
        { name: 'device', label: 'Device', placeholder: 'Device ID / MAC' },
        { name: 'linked_site', label: 'Site', placeholder: 'Site ID' },
        { name: 'hostname', label: 'Hostname', placeholder: 'e.g. cam-lobby-01' },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ]}
      actions={[
        { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_ip_allocation', args: { name: row.name } }), confirmMessage: 'Release this IP allocation?' },
      ]}
      statsCards={[
        { label: 'Allocations', path: 'total', hint: 'Total IPs assigned', icon: Wifi, tone: 'blue' },
      ]}
      columns={[
        { key: 'name', label: 'Allocation', render: (row) => <Link href={`/execution/commissioning/ip-allocations/${encodeURIComponent(row.name)}`} className="text-blue-600 hover:underline font-medium">{row.name || '-'}</Link> },
        { key: 'ip_address', label: 'IP Address', render: (row) => <span className="font-mono text-sm">{row.ip_address || '-'}</span> },
        { key: 'ip_pool', label: 'Pool', render: (row) => row.ip_pool || '-' },
        { key: 'device', label: 'Device', render: (row) => row.device || '-' },
        { key: 'hostname', label: 'Hostname', render: (row) => row.hostname || '-' },
        { key: 'linked_site', label: 'Site', render: (row) => row.linked_site || '-' },
      ]}
      emptyMessage="No IP allocations found"
    />
  );
}
