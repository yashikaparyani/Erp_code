'use client';

import { AlertTriangle } from 'lucide-react';
import { DashboardShell, SectionCard, StatCard, useApiData } from '../../../../components/dashboards/shared';

type TenderResultRow = {
  name: string;
  tender?: string;
  result_stage?: string;
  bidder_name?: string;
  final_rank?: string | number;
  remarks?: string;
};

export default function MissedOpportunityPage() {
  const { data, loading, error, lastUpdated, refresh } = useApiData<TenderResultRow[]>('/api/tender-results', []);
  const missedRows = data.filter((row) => {
    const stage = String(row.result_stage || '').toLowerCase();
    return stage && !stage.includes('won') && !stage.includes('award');
  });

  return (
    <DashboardShell
      title="Missed Opportunity"
      subtitle="Non-winning tender outcomes surfaced from tender result records."
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => void refresh()}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Missed Rows" value={missedRows.length} hint="Non-winning outcomes" icon={AlertTriangle} tone="red" />
        <StatCard title="Total Results" value={data.length} hint="All tender result rows" icon={AlertTriangle} tone="blue" />
        <StatCard title="Opportunity Review" value={missedRows.filter((row) => row.final_rank === 2 || row.final_rank === '2').length} hint="Near-miss rank 2 cases" icon={AlertTriangle} tone="amber" />
      </div>

      <div className="mt-6">
        <SectionCard title="Missed Tender Outcomes" subtitle="Use this page to review lost or non-awarded opportunities">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tender</th>
                  <th>Stage</th>
                  <th>Bidder</th>
                  <th>Rank</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {missedRows.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">No missed opportunities identified from current result stages</td></tr>
                ) : missedRows.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.tender || '-'}</td>
                    <td>{row.result_stage || '-'}</td>
                    <td>{row.bidder_name || '-'}</td>
                    <td>{row.final_rank || '-'}</td>
                    <td>{row.remarks || '-'}</td>
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
