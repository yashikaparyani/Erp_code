'use client';

import { AlertTriangle, ClipboardCheck, Compass, DraftingCompass, GitBranchPlus, MapPinned } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatPercent, useApiData } from './shared';

type EngineeringHeadDashboardData = {
  surveys: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
  boqs: {
    total: number;
    draft: number;
    pending_approval: number;
    approved: number;
    rejected: number;
  };
  execution: {
    sites: {
      total: number;
      avg_progress_pct: number;
      active: number;
    };
    milestones: {
      total: number;
      completed: number;
      avg_progress_pct: number;
      overdue: number;
    };
    dependencies: {
      active_rules: number;
      hard_blocks: number;
    };
    dprs: {
      total_reports: number;
      total_manpower_logged: number;
      total_equipment_logged: number;
    };
  };
  projects: {
    total: number;
    blocked: number;
    survey_stage: number;
    design_stage: number;
    awaiting_approval: number;
  };
  drawings: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  change_requests: {
    total: number;
    open: number;
    resolved: number;
    rejected: number;
  };
  technical_deviations: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

const initialData: EngineeringHeadDashboardData = {
  surveys: { total: 0, completed: 0, in_progress: 0, pending: 0 },
  boqs: { total: 0, draft: 0, pending_approval: 0, approved: 0, rejected: 0 },
  execution: {
    sites: { total: 0, avg_progress_pct: 0, active: 0 },
    milestones: { total: 0, completed: 0, avg_progress_pct: 0, overdue: 0 },
    dependencies: { active_rules: 0, hard_blocks: 0 },
    dprs: { total_reports: 0, total_manpower_logged: 0, total_equipment_logged: 0 },
  },
  projects: { total: 0, blocked: 0, survey_stage: 0, design_stage: 0, awaiting_approval: 0 },
  drawings: { total: 0, approved: 0, pending: 0, rejected: 0 },
  change_requests: { total: 0, open: 0, resolved: 0, rejected: 0 },
  technical_deviations: { total: 0, pending: 0, approved: 0, rejected: 0 },
};

export default function EngineeringHeadDashboard() {
  const { data, loading, error, lastUpdated, refresh } = useApiData<EngineeringHeadDashboardData>(
    '/api/dashboards/engineering-head',
    initialData,
  );

  return (
    <DashboardShell
      title="Engineering Head Dashboard"
      subtitle="Design, survey, approvals, and execution readiness in one calm workspace"
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => void refresh()}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Survey Queue" value={data.surveys.total} hint={`${data.surveys.completed} completed and ready for design`} icon={Compass} tone="blue" />
        <StatCard title="BOQ Approval Queue" value={data.boqs.pending_approval} hint={`${data.boqs.approved} already approved`} icon={ClipboardCheck} tone="orange" />
        <StatCard title="Drawing Review" value={data.drawings.pending} hint={`${data.drawings.total} drawing records tracked`} icon={DraftingCompass} tone="cyan" />
        <StatCard title="Open Change Requests" value={data.change_requests.open} hint={`${data.technical_deviations.pending} technical deviations need attention`} icon={GitBranchPlus} tone="amber" />
        <StatCard title="Execution Readiness" value={formatPercent(data.execution.sites.avg_progress_pct)} hint={`${data.execution.sites.active} sites active in the field`} icon={MapPinned} tone="green" />
        <StatCard title="Hard Blocks" value={data.execution.dependencies.hard_blocks + data.projects.blocked} hint={`${data.projects.awaiting_approval} projects waiting for approval`} icon={AlertTriangle} tone="red" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Engineering Command Line" subtitle="What should move first today">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
              <div className="workspace-kicker">Survey to Design</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{data.projects.survey_stage}</div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Projects still in survey lane before BOQ and drawing work can stabilize.
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
              <div className="workspace-kicker">Design in Motion</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{data.projects.design_stage}</div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Active design-stage projects that need BOQ, drawing, or clarification closure.
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
              <div className="workspace-kicker">Execution Support</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{data.execution.dependencies.active_rules}</div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Active dependency rules where engineering decisions still influence site progress.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Attention Stack" subtitle="Fast risk read for the engineering lane">
          <MetricList
            items={[
              { label: 'Projects Awaiting Approval', value: data.projects.awaiting_approval, tone: data.projects.awaiting_approval > 0 ? 'warning' : 'positive' },
              { label: 'Blocked Projects', value: data.projects.blocked, tone: data.projects.blocked > 0 ? 'negative' : 'positive' },
              { label: 'Overdue Milestones', value: data.execution.milestones.overdue, tone: data.execution.milestones.overdue > 0 ? 'negative' : 'positive' },
              { label: 'Pending Drawings', value: data.drawings.pending, tone: data.drawings.pending > 0 ? 'warning' : 'positive' },
              { label: 'Open Change Requests', value: data.change_requests.open, tone: data.change_requests.open > 0 ? 'warning' : 'positive' },
              { label: 'Pending Deviations', value: data.technical_deviations.pending, tone: data.technical_deviations.pending > 0 ? 'warning' : 'positive' },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Survey and BOQ Gate" subtitle="How cleanly engineering can move presales output forward">
          <MetricList
            items={[
              { label: 'Surveys Completed', value: data.surveys.completed, tone: 'positive' },
              { label: 'Surveys In Progress', value: data.surveys.in_progress, tone: 'info' },
              { label: 'Surveys Pending', value: data.surveys.pending, tone: 'warning' },
              { label: 'BOQs Draft', value: data.boqs.draft, tone: 'warning' },
              { label: 'BOQs Pending Approval', value: data.boqs.pending_approval, tone: 'warning' },
              { label: 'BOQs Approved', value: data.boqs.approved, tone: 'positive' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Design Quality Desk" subtitle="Documents and exceptions that shape engineering delivery">
          <MetricList
            items={[
              { label: 'Drawings Approved', value: data.drawings.approved, tone: 'positive' },
              { label: 'Drawings Pending', value: data.drawings.pending, tone: 'warning' },
              { label: 'Drawing Rejections', value: data.drawings.rejected, tone: data.drawings.rejected > 0 ? 'negative' : 'positive' },
              { label: 'Resolved Change Requests', value: data.change_requests.resolved, tone: 'positive' },
              { label: 'Rejected Change Requests', value: data.change_requests.rejected, tone: data.change_requests.rejected > 0 ? 'negative' : 'positive' },
              { label: 'Approved Deviations', value: data.technical_deviations.approved, tone: 'positive' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Field Signal" subtitle="Whether engineering intent is surviving into execution">
          <MetricList
            items={[
              { label: 'Active Sites', value: data.execution.sites.active, tone: 'info' },
              { label: 'Average Site Progress', value: formatPercent(data.execution.sites.avg_progress_pct), tone: data.execution.sites.avg_progress_pct >= 70 ? 'positive' : 'warning' },
              { label: 'Completed Milestones', value: data.execution.milestones.completed, tone: 'positive' },
              { label: 'DPR Reports', value: data.execution.dprs.total_reports },
              { label: 'Hard Dependency Blocks', value: data.execution.dependencies.hard_blocks, tone: data.execution.dependencies.hard_blocks > 0 ? 'negative' : 'positive' },
              { label: 'Manpower Logged', value: data.execution.dprs.total_manpower_logged },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Approval Rhythm" subtitle="Signals for the Engineering Head approval desk">
          <MetricList
            items={[
              { label: 'Projects Total', value: data.projects.total },
              { label: 'Projects Awaiting Approval', value: data.projects.awaiting_approval, tone: data.projects.awaiting_approval > 0 ? 'warning' : 'positive' },
              { label: 'BOQ Rejections', value: data.boqs.rejected, tone: data.boqs.rejected > 0 ? 'negative' : 'positive' },
              { label: 'Drawing Rejections', value: data.drawings.rejected, tone: data.drawings.rejected > 0 ? 'negative' : 'positive' },
              { label: 'Deviation Rejections', value: data.technical_deviations.rejected, tone: data.technical_deviations.rejected > 0 ? 'negative' : 'positive' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Delivery Confidence" subtitle="A calm summary of whether engineering flow is healthy">
          <MetricList
            items={[
              { label: 'Execution Progress', value: formatPercent(data.execution.sites.avg_progress_pct), tone: data.execution.sites.avg_progress_pct >= 70 ? 'positive' : 'warning' },
              { label: 'Milestone Progress', value: formatPercent(data.execution.milestones.avg_progress_pct), tone: data.execution.milestones.avg_progress_pct >= 70 ? 'positive' : 'warning' },
              { label: 'Survey Backlog', value: data.surveys.pending + data.surveys.in_progress, tone: data.surveys.pending + data.surveys.in_progress > 0 ? 'warning' : 'positive' },
              { label: 'Open Change Volume', value: data.change_requests.open, tone: data.change_requests.open > 0 ? 'warning' : 'positive' },
              { label: 'Blocked Engineering Signals', value: data.projects.blocked + data.execution.dependencies.hard_blocks, tone: data.projects.blocked + data.execution.dependencies.hard_blocks > 0 ? 'negative' : 'positive' },
            ]}
          />
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
