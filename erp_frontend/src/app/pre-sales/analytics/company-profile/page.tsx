'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Briefcase, CircleDollarSign, Download, Trophy } from 'lucide-react';
import {
  type Tender,
  type TenderResult,
  byDateDesc,
  fetchJson,
  formatCurrency,
  formatDate,
  formatPercent,
  statusBadge,
} from '../_lib';

type TenderResponse = { data?: Tender[] };
type TenderResultsResponse = { data?: TenderResult[] };
type CostSheetResponse = { data?: Array<{ linked_tender?: string; status?: string }> };
type ApprovalResponse = { data?: Array<{ tender_id?: string; approval_for?: string; status?: string }> };

export default function CompanyProfilePage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [results, setResults] = useState<TenderResult[]>([]);
  const [costSheets, setCostSheets] = useState<Array<{ linked_tender?: string; status?: string }>>([]);
  const [approvals, setApprovals] = useState<Array<{ tender_id?: string; approval_for?: string; status?: string }>>([]);
  const [organizationFilter, setOrganizationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJson<TenderResponse>('/api/tenders'),
      fetchJson<TenderResultsResponse>('/api/tender-results'),
      fetchJson<CostSheetResponse>('/api/cost-sheets'),
      fetchJson<ApprovalResponse>('/api/approvals'),
    ])
      .then(([tendersRes, resultsRes, costSheetRes, approvalRes]) => {
        setTenders(tendersRes.data || []);
        setResults(resultsRes.data || []);
        setCostSheets(costSheetRes.data || []);
        setApprovals(approvalRes.data || []);
      })
      .catch(() => {
        setTenders([]);
        setResults([]);
        setCostSheets([]);
        setApprovals([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const organizationOptions = useMemo(
    () => ['ALL', ...new Set(tenders.map((row) => row.organization || row.client).filter(Boolean) as string[])],
    [tenders],
  );

  const statusOptions = useMemo(
    () => ['ALL', ...new Set(tenders.map((row) => row.status).filter(Boolean) as string[])],
    [tenders],
  );

  const filteredTenders = useMemo(
    () =>
      tenders.filter((row) => {
        const matchesOrganization =
          organizationFilter === 'ALL' || (row.organization || row.client || 'Unassigned') === organizationFilter;
        const matchesStatus = statusFilter === 'ALL' || (row.status || 'UNKNOWN') === statusFilter;
        return matchesOrganization && matchesStatus;
      }),
    [organizationFilter, statusFilter, tenders],
  );

  const metrics = useMemo(() => {
    const totalPipeline = filteredTenders.reduce((sum, row) => sum + (row.estimated_value || 0), 0);
    const activeTenders = filteredTenders.filter((row) => !['WON', 'LOST', 'CANCELLED', 'DROPPED', 'CONVERTED_TO_PROJECT'].includes(row.status || ''));
    const wonTenders = filteredTenders.filter((row) => row.status === 'WON');
    const closedTenders = filteredTenders.filter((row) => ['WON', 'LOST'].includes(row.status || ''));
    const winRate = closedTenders.length ? (wonTenders.length / closedTenders.length) * 100 : 0;
    const organizations = [...new Set(filteredTenders.map((row) => row.organization || row.client).filter(Boolean))];
    const filteredIds = new Set(filteredTenders.map((row) => row.name));
    const recentWins = results.filter((row) => ['AOC', 'LoI Issued', 'Work Order'].includes(row.result_stage || '') && (!filteredIds.size || filteredIds.has(row.tender || '')));

    return {
      totalPipeline,
      activeCount: activeTenders.length,
      wonCount: wonTenders.length,
      winRate,
      organizationCount: organizations.length,
      recentWinValue: recentWins.reduce((sum, row) => sum + (row.winning_amount || 0), 0),
    };
  }, [filteredTenders, results]);

  const statusRows = useMemo(() => {
    const counts = filteredTenders.reduce<Record<string, { count: number; value: number }>>((acc, row) => {
      const key = row.status || 'UNKNOWN';
      if (!acc[key]) acc[key] = { count: 0, value: 0 };
      acc[key].count += 1;
      acc[key].value += row.estimated_value || 0;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([status, stats]) => ({ status, ...stats }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTenders]);

  const organizationRows = useMemo(() => {
    const grouped = filteredTenders.reduce<Record<string, { count: number; value: number; won: number }>>((acc, row) => {
      const key = row.organization || row.client || 'Unassigned';
      if (!acc[key]) acc[key] = { count: 0, value: 0, won: 0 };
      acc[key].count += 1;
      acc[key].value += row.estimated_value || 0;
      if (row.status === 'WON') acc[key].won += 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([organization, stats]) => ({ organization, ...stats }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredTenders]);

  const actionQueue = useMemo(() => {
    const today = new Date();
    const costingReady = new Set(costSheets.filter((row) => row.linked_tender).map((row) => row.linked_tender as string));
    const pendingApprovalTenderIds = new Set(approvals.map((row) => row.tender_id).filter(Boolean) as string[]);

    const urgentDeadlines = filteredTenders
      .filter((row) => row.submission_date && !['WON', 'LOST', 'CANCELLED', 'DROPPED', 'CONVERTED_TO_PROJECT'].includes(row.status || ''))
      .map((row) => {
        const dueInDays = Math.ceil((new Date(row.submission_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...row, dueInDays };
      })
      .filter((row) => row.dueInDays <= 3)
      .sort((a, b) => a.dueInDays - b.dueInDays)
      .slice(0, 5);

    const missingCosting = filteredTenders
      .filter((row) => ['DRAFT', 'SUBMITTED'].includes(row.status || '') && !costingReady.has(row.name))
      .slice(0, 5);

    const pendingApprovals = filteredTenders
      .filter((row) => pendingApprovalTenderIds.has(row.name))
      .slice(0, 5);

    return { urgentDeadlines, missingCosting, pendingApprovals };
  }, [approvals, costSheets, filteredTenders]);

  const recentTenders = useMemo(
    () => byDateDesc(filteredTenders, (row) => row.modified || row.creation).slice(0, 8),
    [filteredTenders],
  );

  const exportCsv = () => {
    const lines = [
      ['Tender', 'Organization', 'Submission Date', 'Status', 'Value'],
      ...filteredTenders.map((row) => [row.title || row.tender_number || row.name, row.organization || row.client || '-', row.submission_date || '', row.status || '', row.estimated_value || 0]),
    ];
    const csv = lines.map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'company-profile-analytics.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Company Profile Analytics</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Snapshot of tender pipeline, organization spread, and overall bid performance.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className="input min-w-48" value={organizationFilter} onChange={(event) => setOrganizationFilter(event.target.value)}>
              {organizationOptions.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All organizations' : option}</option>)}
            </select>
            <select className="input min-w-40" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All statuses' : option.replaceAll('_', ' ')}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={exportCsv} disabled={!filteredTenders.length}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><CircleDollarSign className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(metrics.totalPipeline)}</div><div className="stat-label">Pipeline Value</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600"><Briefcase className="w-5 h-5" /></div><div><div className="stat-value">{metrics.activeCount}</div><div className="stat-label">Active Tenders</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Trophy className="w-5 h-5" /></div><div><div className="stat-value">{formatPercent(metrics.winRate)}</div><div className="stat-label">Win Rate</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Building2 className="w-5 h-5" /></div><div><div className="stat-value">{metrics.organizationCount}</div><div className="stat-label">Organizations Covered</div></div></div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {[
          {
            title: 'Urgent submission focus',
            count: actionQueue.urgentDeadlines.length,
            rows: actionQueue.urgentDeadlines.map((row) => `${row.title || row.tender_number || row.name} | due in ${row.dueInDays}d`),
          },
          {
            title: 'Costing still missing',
            count: actionQueue.missingCosting.length,
            rows: actionQueue.missingCosting.map((row) => `${row.title || row.tender_number || row.name} | ${row.status || '-'}`),
          },
          {
            title: 'Approval queue affecting tenders',
            count: actionQueue.pendingApprovals.length,
            rows: actionQueue.pendingApprovals.map((row) => `${row.title || row.tender_number || row.name} | waiting approval`),
          },
        ].map((card) => (
          <div key={card.title} className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900">{card.title}</h3></div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                {card.count}
              </div>
              <div className="mt-3 space-y-2">
                {card.rows.length === 0 ? <div className="text-sm text-gray-500">No immediate action found.</div> : card.rows.map((row) => (
                  <div key={row} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{row}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Pipeline By Status</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Status</th><th>Tenders</th><th>Value</th></tr></thead>
              <tbody>
                {statusRows.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-gray-500">No tender data found</td></tr> : statusRows.map((row) => (
                  <tr key={row.status}>
                    <td><span className={`badge ${statusBadge(row.status)}`}>{row.status.replaceAll('_', ' ')}</span></td>
                    <td><div className="text-sm font-medium text-gray-900">{row.count}</div></td>
                    <td><div className="text-sm text-gray-700">{formatCurrency(row.value)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Top Organizations</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Organization</th><th>Tenders</th><th>Wins</th><th>Pipeline</th></tr></thead>
              <tbody>
                {organizationRows.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">No organizations found</td></tr> : organizationRows.map((row) => (
                  <tr key={row.organization}>
                    <td><div className="font-medium text-gray-900">{row.organization}</div></td>
                    <td><div className="text-sm text-gray-700">{row.count}</div></td>
                    <td><div className="text-sm text-green-700 font-medium">{row.won}</div></td>
                    <td><div className="text-sm text-gray-700">{formatCurrency(row.value)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 sm:gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Recent Tender Activity</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Tender</th><th>Organization</th><th>Submission</th><th>Status</th><th>Value</th></tr></thead>
              <tbody>
                {recentTenders.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">No recent tenders found</td></tr> : recentTenders.map((row) => (
                  <tr key={row.name}>
                    <td><div className="font-medium text-gray-900">{row.title || row.tender_number || row.name}</div><div className="text-xs text-gray-500">{row.tender_number || row.name}</div></td>
                    <td><div className="text-sm text-gray-700">{row.organization || row.client || '-'}</div></td>
                    <td><div className="text-sm text-gray-700">{formatDate(row.submission_date)}</div></td>
                    <td><span className={`badge ${statusBadge(row.status)}`}>{(row.status || '-').replaceAll('_', ' ')}</span></td>
                    <td><div className="text-sm text-gray-900 font-medium">{formatCurrency(row.estimated_value)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Win Snapshot</h3></div>
          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <div className="text-sm text-green-700">Won tenders</div>
              <div className="mt-1 text-2xl font-semibold text-green-900">{metrics.wonCount}</div>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm text-blue-700">Recent win order value</div>
              <div className="mt-1 text-2xl font-semibold text-blue-900">{formatCurrency(metrics.recentWinValue)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-600">Tender results tracked</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{results.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
