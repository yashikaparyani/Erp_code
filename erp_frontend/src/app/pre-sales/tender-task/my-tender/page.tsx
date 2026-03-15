'use client';

import TenderTaskBoard from '@/components/tender-task/TenderTaskBoard';

export default function MyTenderPage() {
  return (
    <TenderTaskBoard
      title="My Tender"
      subtitle="Live tender list visible to your role."
      emptyTitle="No tenders found"
      emptyHint="No tender records are currently visible for your login."
      disclaimer="Individual owner assignment is not captured in the backend yet, so this page currently shows role-visible tenders rather than person-specific ownership."
    />
  );
}
