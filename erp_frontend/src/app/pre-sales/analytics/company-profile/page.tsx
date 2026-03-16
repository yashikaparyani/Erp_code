'use client';

import { Building2, Briefcase, Trophy, TrendingUp } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, useApiData } from '../../../../components/dashboards/shared';

type TenderStats = {
  total_pipeline: number;
  total_count: number;
  won_count: number;
  submitted_count: number;
  draft_count: number;
};

type TenderResultRow = {
  name: string;
  tender?: string;
  result_stage?: string;
  bidder_name?: string;
  final_rank?: string | number;
};

type CompetitorRow = {
  name: string;
  competitor_name?: string;
  tender?: string;
  status?: string;
};

const initialStats: TenderStats = {
  total_pipeline: 0,
  total_count: 0,
  won_count: 0,
  submitted_count: 0,
  draft_count: 0,
};

export default function CompanyProfilePage() {
  const statsState = useApiData<TenderStats>('/api/tenders/stats', initialStats);
  const resultsState = useApiData<TenderResultRow[]>('/api/tender-results', []);
  const competitorState = useApiData<CompetitorRow[]>('/api/competitors', []);

  const loading = statsState.loading || resultsState.loading || competitorState.loading;
  const error = statsState.error || resultsState.error || competitorState.error;
  const lastUpdated = statsState.lastUpdated || resultsState.lastUpdated || competitorState.lastUpdated;

  const winRate = statsState.data.total_count > 0
    ? ((statsState.data.won_count / statsState.data.total_count) * 100).toFixed(1)
    : '0.0';

  return (
    <DashboardShell
      title="Company Profile"
      subtitle="Pre-sales business profile from live tender, result, and competitor data."
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => {
        void statsState.refresh();
        void resultsState.refresh();
        void competitorState.refresh();
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Tender Pipeline" value={statsState.data.total_count} hint="Total tenders tracked" icon={Briefcase} tone="blue" />
        <StatCard title="Wins" value={statsState.data.won_count} hint={`${winRate}% win rate`} icon={Trophy} tone="green" />
        <StatCard title="Submitted" value={statsState.data.submitted_count} hint="Live submitted tenders" icon={TrendingUp} tone="orange" />
        <StatCard title="Competitors" value={competitorState.data.length} hint="Tracked competitor records" icon={Building2} tone="teal" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Business Snapshot" subtitle="Quick profile view from current ERP data">
          <MetricList
            items={[
              { label: 'Total pipeline value', value: statsState.data.total_pipeline || 0 },
              { label: 'Draft tenders', value: statsState.data.draft_count || 0, tone: 'warning' },
              { label: 'Submitted tenders', value: statsState.data.submitted_count || 0, tone: 'info' },
              { label: 'Won tenders', value: statsState.data.won_count || 0, tone: 'positive' },
              { label: 'Tracked competitors', value: competitorState.data.length || 0 },
            ]}
          />
        </SectionCard>

        <SectionCard title="Recent Result Activity" subtitle="Latest tender outcomes in the system">
          <MetricList
            items={resultsState.data.slice(0, 5).map((row) => ({
              label: row.tender || row.name,
              value: row.result_stage || row.final_rank || '-',
              tone: row.result_stage?.toLowerCase().includes('won') ? 'positive' : 'default',
            }))}
            emptyMessage="No tender result activity found."
          />
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
