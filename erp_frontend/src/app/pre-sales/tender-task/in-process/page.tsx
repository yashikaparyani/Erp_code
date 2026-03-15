'use client';

import TenderTaskBoard from '@/components/tender-task/TenderTaskBoard';

export default function InProcessTenderPage() {
  return (
    <TenderTaskBoard
      title="In-Process Tender"
      subtitle="Live tenders currently moving through the working pipeline."
      emptyTitle="No in-process tenders"
      emptyHint="No tenders are currently in the in-process bucket."
      statusFilter={['DRAFT', 'IN_PROGRESS', 'UNDER_EVALUATION']}
    />
  );
}
