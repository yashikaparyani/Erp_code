'use client';

import TenderTaskBoard from '@/components/tender-task/TenderTaskBoard';

export default function AssignedToTeamPage() {
  return (
    <TenderTaskBoard
      title="Assigned To Team"
      subtitle="Active tenders that are already in the team workflow."
      emptyTitle="No team-stage tenders"
      emptyHint="No tenders are currently sitting in the active team workflow."
      statusFilter={['IN_PROGRESS', 'SUBMITTED', 'UNDER_EVALUATION']}
      disclaimer="Dedicated team assignment and assignee fields are not yet stored on tenders, so this view uses live workflow status as the closest current signal."
    />
  );
}
