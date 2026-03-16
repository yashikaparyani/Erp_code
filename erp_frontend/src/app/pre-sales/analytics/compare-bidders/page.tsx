'use client';

import { GitBranch } from 'lucide-react';
import { DashboardShell, SectionCard, StatCard, useApiData } from '../../../../components/dashboards/shared';

type CompetitorRow = {
  name: string;
  competitor_name?: string;
  tender?: string;
  status?: string;
  quoted_amount?: number;
};

export default function CompareBiddersPage() {
  const { data, loading, error, lastUpdated, refresh } = useApiData<CompetitorRow[]>('/api/competitors', []);
  const tenderCount = new Set(data.map((row) => row.tender).filter(Boolean)).size;

  return (
    <DashboardShell
      title="Compare Bidders"
      subtitle="Live competitor register grouped around tender participation."
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => void refresh()}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Competitor Rows" value={data.length} hint="Tracked bidder records" icon={GitBranch} tone="blue" />
        <StatCard title="Tenders Covered" value={tenderCount} hint="Distinct tenders with competitor data" icon={GitBranch} tone="green" />
        <StatCard title="Active Records" value={data.filter((row) => String(row.status || '').toLowerCase() !== 'inactive').length} hint="Not marked inactive" icon={GitBranch} tone="amber" />
      </div>

      <div className="mt-6">
        <SectionCard title="Bidder Comparison Register" subtitle="Use competitor records to compare tender participation">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tender</th>
                  <th>Competitor</th>
                  <th>Status</th>
                  <th>Quoted Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">No competitor records found</td></tr>
                ) : data.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.tender || '-'}</td>
                    <td>{row.competitor_name || '-'}</td>
                    <td>{row.status || '-'}</td>
                    <td>{row.quoted_amount || '-'}</td>
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
