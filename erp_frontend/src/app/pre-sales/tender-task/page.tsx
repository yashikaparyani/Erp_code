'use client';

import { CheckCheck, ClipboardList, FileClock, FolderKanban, Send, Users } from 'lucide-react';
import RouteHubPage from '@/components/navigation/RouteHubPage';

export default function TenderTaskHubPage() {
  return (
    <RouteHubPage
      title="Tender Task"
      subtitle="Choose a tender work queue from the parent task hub."
      items={[
        { title: 'My Tender', href: '/pre-sales/tender-task/my-tender', description: 'Tenders assigned to your own working list.', icon: ClipboardList },
        { title: 'In-Process Tender', href: '/pre-sales/tender-task/in-process', description: 'Track tenders actively under preparation.', icon: FileClock },
        { title: 'Assigned To Team', href: '/pre-sales/tender-task/assigned-to-team', description: 'Review team-wise tender allocations.', icon: Users },
        { title: 'Submitted Tender', href: '/pre-sales/tender-task/submitted', description: 'See all tenders already submitted.', icon: Send },
        { title: 'Dropped Tender', href: '/pre-sales/tender-task/dropped', description: 'Review dropped opportunities and reasons.', icon: FolderKanban },
      ]}
    />
  );
}
