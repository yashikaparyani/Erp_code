'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AccountabilityDashboard } from '../../../../components/accountability/AccountabilityDashboard';

export default function ProjectAccountabilityPage() {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params?.id || '');

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <Link
          href={`/projects/${encodeURIComponent(projectId)}`}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to project
        </Link>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Accountability &amp; RCA — {projectId}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Full audit trail, blocked items, escalations, and rejection history for this project
        </p>
      </div>

      <AccountabilityDashboard project={projectId} />
    </div>
  );
}
