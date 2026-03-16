'use client';

import { Trophy } from 'lucide-react';
import { DashboardShell, SectionCard, StatCard, useApiData } from '../../../../components/dashboards/shared';

type TenderResultRow = {
  name: string;
  tender?: string;
  result_stage?: string;
  bidder_name?: string;
  final_rank?: string | number;
  l1_amount?: number;
  quoted_amount?: number;
};

export default function TenderResultsAnalyticsPage() {
  const { data, loading, error, lastUpdated, refresh } = useApiData<TenderResultRow[]>('/api/tender-results', []);
  const wonCount = data.filter((row) => String(row.result_stage || '').toLowerCase().includes('won')).length;
  const lostCount = data.filter((row) => {
    const stage = String(row.result_stage || '').toLowerCase();
    return stage && !stage.includes('won');
  }).length;

  return (
    <DashboardShell
      title="Tender Results Analytics"
      subtitle="Outcome-level visibility of submitted tenders."
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => void refresh()}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Total Results" value={data.length} hint="Result rows available" icon={Trophy} tone="blue" />
        <StatCard title="Won" value={wonCount} hint="Rows marked won" icon={Trophy} tone="green" />
        <StatCard title="Other Outcomes" value={lostCount} hint="Lost / pending / other stages" icon={Trophy} tone="amber" />
      </div>

      <div className="mt-6">
        <SectionCard title="Tender Result Register" subtitle="Live result-level records">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tender</th>
                  <th>Stage</th>
                  <th>Bidder</th>
                  <th>Rank</th>
                  <th>Quoted</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">No tender result records found</td></tr>
                ) : data.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.tender || '-'}</td>
                    <td>{row.result_stage || '-'}</td>
                    <td>{row.bidder_name || '-'}</td>
                    <td>{row.final_rank || '-'}</td>
                    <td>{row.quoted_amount || row.l1_amount || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
