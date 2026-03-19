'use client';

import TenderTaskBoard from '@/components/tender-task/TenderTaskBoard';

export default function MyTenderPage() {
  return (
    <TenderTaskBoard
      title="My Tender"
      subtitle="Tenders where you are the current tender owner."
      emptyTitle="No tenders found"
      emptyHint="No tender records are currently assigned to you."
      currentUserOnly
    />
  );
}
