'use client';

import { CheckSquare, Clock3, CreditCard, FileText, MapPin, ShieldCheck } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatCurrency, formatPercent, useApiData } from './shared';

type PresalesDashboardData = {
  tenders: {
    total: number;
    won: number;
    submitted: number;
    draft: number;
    under_evaluation: number;
    lost: number;
    cancelled: number;
    dropped: number;
    total_pipeline: number;
  };
  boqs: {
    total: number;
    draft: number;
    pending_approval: number;
    approved: number;
    rejected: number;
    total_value: number;
  };
  surveys: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
  finance_requests: {
    total: number;
    pending: number;
    submitted: number;
    released: number;
    forfeited: number;
    expired: number;
    total_amount: number;
    pending_amount: number;
    emd_count: number;
    pbg_count: number;
  };
  checklist_completion_pct: number;
};

const initialData: PresalesDashboardData = {
  tenders: { total: 0, won: 0, submitted: 0, draft: 0, under_evaluation: 0, lost: 0, cancelled: 0, dropped: 0, total_pipeline: 0 },
  boqs: { total: 0, draft: 0, pending_approval: 0, approved: 0, rejected: 0, total_value: 0 },
  surveys: { total: 0, completed: 0, in_progress: 0, pending: 0 },
  finance_requests: { total: 0, pending: 0, submitted: 0, released: 0, forfeited: 0, expired: 0, total_amount: 0, pending_amount: 0, emd_count: 0, pbg_count: 0 },
  checklist_completion_pct: 0,
};

export default function PresalesExecutiveDashboard() {
  const { data, loading, error, lastUpdated, refresh } = useApiData<PresalesDashboardData>('/api/dashboards/presales', initialData);

  const tendersNeedingAction =
    data.tenders.draft +
    data.tenders.under_evaluation +
    data.surveys.pending +
    data.surveys.in_progress;

  const financeBlockers = data.finance_requests.pending + data.finance_requests.expired + data.finance_requests.forfeited;

  return (
    <DashboardShell
      title="Presales Executive Workspace"
      subtitle="Your daily operating view for tender movement, surveys, finance gates, and bid readiness."
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => void refresh()}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Open Tenders" value={data.tenders.total} hint={`${data.tenders.draft} still in early funnel work`} icon={FileText} tone="blue" />
        <StatCard title="Needs Action" value={tendersNeedingAction} hint="Draft, active survey, and evaluation work combined" icon={Clock3} tone="orange" />
        <StatCard title="Bids In Motion" value={data.tenders.submitted + data.tenders.under_evaluation} hint="Bids already moved beyond draft" icon={ShieldCheck} tone="green" />
        <StatCard title="Survey Queue" value={data.surveys.pending + data.surveys.in_progress} hint={`${data.surveys.completed} surveys already completed`} icon={MapPin} tone="cyan" />
        <StatCard title="Finance Blockers" value={financeBlockers} hint={`${formatCurrency(data.finance_requests.pending_amount)} currently waiting`} icon={CreditCard} tone="red" />
        <StatCard title="Checklist Health" value={formatPercent(data.checklist_completion_pct)} hint="Readiness across active presales records" icon={CheckSquare} tone="teal" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Tender Work Queue" subtitle="What the executive should push forward first">
          <MetricList
            items={[
              { label: 'Draft Tenders', value: data.tenders.draft, tone: data.tenders.draft > 0 ? 'warning' : 'positive' },
              { label: 'Under Evaluation', value: data.tenders.under_evaluation, tone: 'info' },
              { label: 'Submitted', value: data.tenders.submitted, tone: 'positive' },
              { label: 'Lost / Dropped', value: data.tenders.lost + data.tenders.dropped + data.tenders.cancelled, tone: 'negative' },
              { label: 'Pipeline Value', value: formatCurrency(data.tenders.total_pipeline) },
            ]}
          />
        </SectionCard>

        <SectionCard title="Readiness Bottlenecks" subtitle="Cross-functional items stopping conversion">
          <MetricList
            items={[
              { label: 'BOQ Pending Approval', value: data.boqs.pending_approval, tone: data.boqs.pending_approval > 0 ? 'warning' : 'positive' },
              { label: 'BOQ Draft', value: data.boqs.draft, tone: data.boqs.draft > 0 ? 'warning' : 'positive' },
              { label: 'Surveys Pending', value: data.surveys.pending, tone: data.surveys.pending > 0 ? 'warning' : 'positive' },
              { label: 'Surveys In Progress', value: data.surveys.in_progress, tone: 'info' },
              { label: 'Pending Finance Requests', value: data.finance_requests.pending, tone: data.finance_requests.pending > 0 ? 'warning' : 'positive' },
              { label: 'Pending Finance Amount', value: formatCurrency(data.finance_requests.pending_amount), tone: 'negative' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Submission Readiness" subtitle="Signals that tell you whether bids can move cleanly">
          <MetricList
            items={[
              { label: 'Checklist Completion', value: formatPercent(data.checklist_completion_pct), tone: data.checklist_completion_pct >= 80 ? 'positive' : 'warning' },
              { label: 'Approved BOQs', value: data.boqs.approved, tone: 'positive' },
              { label: 'Survey Coverage', value: `${data.surveys.completed}/${data.surveys.total || 0}`, tone: 'info' },
              { label: 'Finance Submitted', value: data.finance_requests.submitted, tone: 'positive' },
              { label: 'Won Bids', value: data.tenders.won, tone: 'positive' },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Finance And Instrument View" subtitle="EMD and PBG pressure points to clear">
          <MetricList
            items={[
              { label: 'Total Finance Requests', value: data.finance_requests.total },
              { label: 'EMD Count', value: data.finance_requests.emd_count, tone: 'info' },
              { label: 'PBG Count', value: data.finance_requests.pbg_count, tone: 'info' },
              { label: 'Released', value: data.finance_requests.released, tone: 'positive' },
              { label: 'Expired', value: data.finance_requests.expired, tone: data.finance_requests.expired > 0 ? 'warning' : 'positive' },
              { label: 'Forfeited', value: data.finance_requests.forfeited, tone: data.finance_requests.forfeited > 0 ? 'negative' : 'positive' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Executive Focus Today" subtitle="Simple read of where to spend effort">
          <MetricList
            items={[
              { label: 'Move Draft Tenders Forward', value: data.tenders.draft, tone: data.tenders.draft > 0 ? 'warning' : 'positive' },
              { label: 'Clear Survey Queue', value: data.surveys.pending + data.surveys.in_progress, tone: data.surveys.pending + data.surveys.in_progress > 0 ? 'warning' : 'positive' },
              { label: 'Resolve Finance Blockers', value: financeBlockers, tone: financeBlockers > 0 ? 'negative' : 'positive' },
              { label: 'BOQs Awaiting Approval', value: data.boqs.pending_approval, tone: data.boqs.pending_approval > 0 ? 'warning' : 'positive' },
              { label: 'Current BOQ Value', value: formatCurrency(data.boqs.total_value) },
            ]}
          />
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
