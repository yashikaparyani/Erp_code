'use client';

import { BadgeCheck, CircleX, CreditCard, FolderCheck, Wallet } from 'lucide-react';
import RouteHubPage from '@/components/navigation/RouteHubPage';

export default function PreSalesFinanceHubPage() {
  return (
    <RouteHubPage
      title="Pre-Sales Finance"
      subtitle="Use this hub to access request and approval queues without a 404 parent route."
      items={[
        { title: 'New Request', href: '/pre-sales/finance/new-request', description: 'Raise a new finance request for pre-sales operations.', icon: CreditCard },
        { title: 'Approve Request', href: '/pre-sales/finance/approve-request', description: 'Review requests awaiting finance sign-off.', icon: BadgeCheck },
        { title: 'Denied Request', href: '/pre-sales/finance/denied-request', description: 'Inspect denied requests and their outcomes.', icon: CircleX },
        { title: 'Completed Request', href: '/pre-sales/finance/completed-request', description: 'See requests already processed and closed.', icon: FolderCheck },
      ]}
    />
  );
}
