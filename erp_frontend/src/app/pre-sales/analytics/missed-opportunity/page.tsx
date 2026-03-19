'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CircleOff, FileX2, TrendingDown } from 'lucide-react';
import {
  type Tender,
  fetchJson,
  formatCurrency,
  formatDate,
  formatPercent,
  statusBadge,
} from '../_lib';

type TenderResponse = { data?: Tender[] };

type MissedRow = Tender & {
  opportunityType: 'Lost' | 'Dropped' | 'Cancelled' | 'Stale Draft';
};

export default function MissedOpportunityPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<TenderResponse>('/api/tenders')
      .then((res) => setTenders(res.data || []))
      .catch(() => setTenders([]))
      .finally(() => setLoading(false));
  }, []);

  const missedRows = useMemo<MissedRow[]>(() => {
    const now = Date.now();
    return tenders.flatMap<MissedRow>((row) => {
      if (row.status === 'LOST') return [{ ...row, opportunityType: 'Lost' }];
      if (row.status === 'DROPPED') return [{ ...row, opportunityType: 'Dropped' }];
      if (row.status === 'CANCELLED') return [{ ...row, opportunityType: 'Cancelled' }];

      const submissionTs = new Date(row.submission_date || 0).getTime();
      const staleDraft = row.status === 'DRAFT' && submissionTs && submissionTs < now;
      return staleDraft ? [{ ...row, opportunityType: 'Stale Draft' }] : [];
    });
  }, [tenders]);

  const metrics = useMemo(() => {
    const totalValue = missedRows.reduce((sum, row) => sum + (row.estimated_value || 0), 0);
    const lostValue = missedRows.filter((row) => row.opportunityType === 'Lost').reduce((sum, row) => sum + (row.estimated_value || 0), 0);
    const droppedValue = missedRows.filter((row) => row.opportunityType === 'Dropped').reduce((sum, row) => sum + (row.estimated_value || 0), 0);
    const closed = tenders.filter((row) => ['WON', 'LOST', 'DROPPED', 'CANCELLED'].includes(row.status || ''));
    const missedRate = closed.length ? (missedRows.filter((row) => row.opportunityType !== 'Stale Draft').length / closed.length) * 100 : 0;

    return {
      totalValue,
      lostValue,
      droppedValue,
      missedRate,
    };
  }, [missedRows, tenders]);

  const opportunityBreakdown = useMemo(() => {
    const grouped = missedRows.reduce<Record<string, { count: number; value: number }>>((acc, row) => {
      const key = row.opportunityType;
      if (!acc[key]) {
        acc[key] = { count: 0, value: 0 };
      }
      acc[key].count += 1;
      acc[key].value += row.estimated_value || 0;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([type, stats]) => ({ type, ...stats }))
      .sort((a, b) => b.value - a.value);
  }, [missedRows]);

  const organizationBreakdown = useMemo(() => {
    const grouped = missedRows.reduce<Record<string, { count: number; value: number }>>((acc, row) => {
      const key = row.organization || row.client || 'Unassigned';
      if (!acc[key]) {
        acc[key] = { count: 0, value: 0 };
      }
      acc[key].count += 1;
      acc[key].value += row.estimated_value || 0;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([organization, stats]) => ({ organization, ...stats }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [missedRows]);

  const sortedMissedRows = useMemo(
    () => [...missedRows].sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0)),
    [missedRows],
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Missed Opportunity</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Track lost, dropped, cancelled, and stale-draft tenders so the team can learn and recover pipeline faster.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><AlertTriangle className="w-5 h-5" /></div><div><div className="stat-value">{missedRows.length}</div><div className="stat-label">Missed Opportunities</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600"><TrendingDown className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(metrics.totalValue)}</div><div className="stat-label">Value At Risk</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><FileX2 className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(metrics.lostValue)}</div><div className="stat-label">Lost Value</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-200 text-slate-700"><CircleOff className="w-5 h-5" /></div><div><div className="stat-value">{formatPercent(metrics.missedRate)}</div><div className="stat-label">Miss Rate</div></div></div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Opportunity Breakdown</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Type</th><th>Count</th><th>Value</th></tr></thead>
              <tbody>
                {opportunityBreakdown.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-gray-500">No missed opportunities found</td></tr> : opportunityBreakdown.map((row) => (
                  <tr key={row.type}>
                    <td><span className={`badge ${row.type === 'Lost' ? 'badge-red' : row.type === 'Dropped' ? 'badge-orange' : row.type === 'Cancelled' ? 'badge-gray' : 'badge-yellow'}`}>{row.type}</span></td>
                    <td><div className="text-sm text-gray-700">{row.count}</div></td>
                    <td><div className="text-sm text-gray-900 font-medium">{formatCurrency(row.value)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Most Impacted Organizations</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Organization</th><th>Count</th><th>Value</th></tr></thead>
              <tbody>
                {organizationBreakdown.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-gray-500">No organization breakdown available</td></tr> : organizationBreakdown.map((row) => (
                  <tr key={row.organization}>
                    <td><div className="font-medium text-gray-900">{row.organization}</div></td>
                    <td><div className="text-sm text-gray-700">{row.count}</div></td>
                    <td><div className="text-sm text-gray-900">{formatCurrency(row.value)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Missed Tender Register</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Tender</th><th>Organization</th><th>Opportunity Type</th><th>Status</th><th>Submission Date</th><th>Estimated Value</th></tr></thead>
            <tbody>
              {sortedMissedRows.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No lost, dropped, cancelled, or stale-draft tenders found</td></tr> : sortedMissedRows.map((row) => (
                <tr key={`${row.name}-${row.opportunityType}`}>
                  <td><div className="font-medium text-gray-900">{row.title || row.tender_number || row.name}</div><div className="text-xs text-gray-500">{row.tender_number || row.name}</div></td>
                  <td><div className="text-sm text-gray-700">{row.organization || row.client || '-'}</div></td>
                  <td><span className={`badge ${row.opportunityType === 'Lost' ? 'badge-red' : row.opportunityType === 'Dropped' ? 'badge-orange' : row.opportunityType === 'Cancelled' ? 'badge-gray' : 'badge-yellow'}`}>{row.opportunityType}</span></td>
                  <td><span className={`badge ${statusBadge(row.status)}`}>{(row.status || '-').replaceAll('_', ' ')}</span></td>
                  <td><div className="text-sm text-gray-700">{formatDate(row.submission_date)}</div></td>
                  <td><div className="text-sm text-gray-900 font-medium">{formatCurrency(row.estimated_value)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
