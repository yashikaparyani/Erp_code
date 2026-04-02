'use client';

import React from 'react';
import { Scale } from 'lucide-react';
import { AccountabilityDashboard } from '../accountability/AccountabilityDashboard';

function AccountabilityTab({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <Scale className="h-5 w-5 text-[var(--accent-strong)]" />
          Accountability &amp; RCA
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Full audit trail, blocked items, escalations, and rejection history</p>
      </div>
      <AccountabilityDashboard project={projectId} />
    </div>
  );
}

export default AccountabilityTab;
