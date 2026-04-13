'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Award, FileCheck2 } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import LinkPicker from '@/components/ui/LinkPicker';
import CloseoutTab from '@/components/project-workspace/CloseoutTab';

export default function ProjectHeadLetterOfCompletionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [projectId, setProjectId] = useState(searchParams?.get('project') || '');

  useEffect(() => {
    setProjectId(searchParams?.get('project') || '');
  }, [searchParams]);

  const handleProjectChange = (value: string) => {
    setProjectId(value);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value) params.set('project', value);
    else params.delete('project');
    router.replace(`/project-head/letter-of-completion${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  return (
    <RegisterPage
      title="Letter of Completion"
      description="Select a project, review closeout eligibility, and issue or revoke completion certificates from one focused Project Head surface."
      loading={false}
      error={undefined}
      empty={false}
      stats={projectId ? [{ label: 'Selected Project', value: projectId, variant: 'info' }] : undefined}
      filterBar={(
        <div className="flex min-w-[280px] flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Project
          </label>
          <LinkPicker
            entity="project"
            value={projectId}
            onChange={handleProjectChange}
            placeholder="Search project to open closeout controls..."
          />
        </div>
      )}
      headerActions={projectId ? (
        <Link
          href={`/projects/${encodeURIComponent(projectId)}?tab=closeout`}
          className="btn btn-secondary"
        >
          <ArrowRight className="h-4 w-4" />
          Open Full Workspace
        </Link>
      ) : undefined}
    >
      <div className="p-4">
        {!projectId ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-main)] px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-raised)]">
              <FileCheck2 className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--text-main)]">Choose a project to start closeout</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              This page is the Project Head shortcut into certificate issuance. Pick a project above to open the closeout workflow.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <div className="flex items-center gap-2 font-semibold">
                <Award className="h-4 w-4" />
                Completion controls for {projectId}
              </div>
              <p className="mt-1 text-xs text-blue-700">
                Use the workflow below to issue closeout certificates in the backend-approved sequence.
              </p>
            </div>
            <CloseoutTab projectId={projectId} />
          </div>
        )}
      </div>
    </RegisterPage>
  );
}
