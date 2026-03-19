'use client';

import TenderTaskBoard from '@/components/tender-task/TenderTaskBoard';

export default function AssignedToTeamPage() {
  return (
    <TenderTaskBoard
      title="Assigned To Team"
      subtitle="Active tenders that are already in the team workflow."
      emptyTitle="No team-stage tenders"
      emptyHint="No tenders are currently sitting in the active team workflow."
      statusFilter={['DRAFT', 'SUBMITTED', 'UNDER_EVALUATION']}
      disclaimer="Dedicated team assignment fields are not stored on tenders yet, so this view uses live active statuses as the current shared-workflow signal."
    />
  );
}
