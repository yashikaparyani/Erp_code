'use client';

import { Cpu, FileCheck2 } from 'lucide-react';
import RouteHubPage from '@/components/navigation/RouteHubPage';

export default function CommissioningHubPage() {
  return (
    <RouteHubPage
      title="Commissioning"
      subtitle="Parent route restored so commissioning deep links no longer 404."
      items={[
        { title: 'Devices & IP', href: '/execution/commissioning/devices', description: 'Inspect device inventory and IP allocation.', icon: Cpu },
        { title: 'Test Reports & Signoffs', href: '/execution/commissioning/test-reports', description: 'Review commissioning reports and signoff records.', icon: FileCheck2 },
      ]}
    />
  );
}
