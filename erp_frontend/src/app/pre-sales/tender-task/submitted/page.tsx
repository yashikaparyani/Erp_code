'use client';

import TenderTaskBoard from '@/components/tender-task/TenderTaskBoard';

export default function SubmittedTenderPage() {
  return (
    <TenderTaskBoard
      title="Submitted Tender"
      subtitle="Live tenders submitted to the client and awaiting result."
      emptyTitle="No submitted tenders"
      emptyHint="No tenders are currently marked as submitted."
      statusFilter={['SUBMITTED']}
    />
  );
}
