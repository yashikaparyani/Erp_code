'use client';

import TenderTaskBoard from '@/components/tender-task/TenderTaskBoard';

export default function DroppedTenderPage() {
  return (
    <TenderTaskBoard
      title="Dropped Tender"
      subtitle="Live tenders dropped from the pipeline before award."
      emptyTitle="No dropped tenders"
      emptyHint="No tenders are currently marked as dropped."
      statusFilter={['DROPPED']}
      disclaimer="Drop-reason analytics are not stored yet, so this page stays focused on the live dropped-tender list instead of showing made-up reason charts."
    />
  );
}
