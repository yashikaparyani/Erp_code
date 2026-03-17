'use client';

import { BriefcaseBusiness, Landmark, LogIn } from 'lucide-react';
import RouteHubPage from '@/components/navigation/RouteHubPage';

export default function PreSalesMisHubPage() {
  return (
    <RouteHubPage
      title="Pre-Sales MIS"
      subtitle="Jump into the right MIS stream from this consolidated landing page."
      items={[
        { title: 'Finance MIS', href: '/pre-sales/mis/finance', description: 'Financial reporting and request-level MIS insights.', icon: Landmark },
        { title: 'Sales MIS', href: '/pre-sales/mis/sales', description: 'Sales pipeline and tender movement reporting.', icon: BriefcaseBusiness },
        { title: 'Login MIS', href: '/pre-sales/mis/login', description: 'Operational access and login trail reporting.', icon: LogIn },
      ]}
    />
  );
}
