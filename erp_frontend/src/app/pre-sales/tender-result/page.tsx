'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Trophy } from 'lucide-react';

type TenderResult = {
  name: string;
  result_id?: string;
  tender?: string;
  reference_no?: string;
  organization_name?: string;
  result_stage?: string;
  publication_date?: string;
  winning_amount?: number;
  winner_company?: string;
  is_fresh?: number;
};

const AWARD_STAGES = new Set(['AOC', 'LoI Issued', 'Work Order']);
const EVALUATION_STAGES = new Set(['Technical Evaluation', 'Financial Evaluation']);

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function stageTone(stage?: string) {
  if (!stage) return 'bg-slate-100 text-slate-700';
  if (AWARD_STAGES.has(stage)) return 'bg-emerald-100 text-emerald-700';
  if (EVALUATION_STAGES.has(stage)) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default function TenderResultPage() {
  const [items, setItems] = useState<TenderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [actionBusy, setActionBusy] = useState('');

  const loadResults = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/tender-results');
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to load tender results');
      }
      setItems(json.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load tender results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, []);

  const filteredItems = useMemo(() => {
    if (!stageFilter) return items;
    return items.filter((item) => item.result_stage === stageFilter);
  }, [items, stageFilter]);

  const availableStages = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.result_stage).filter(Boolean))) as string[];
  }, [items]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      awards: items.filter((item) => AWARD_STAGES.has(item.result_stage || '')).length,
      evaluation: items.filter((item) => EVALUATION_STAGES.has(item.result_stage || '')).length,
      linked: items.filter((item) => item.tender).length,
      totalValue: items.reduce((sum, item) => sum + (item.winning_amount || 0), 0),
    };
  }, [items]);

  const syncTenderStatus = async (tenderName: string, status: string) => {
    try {
      setActionBusy(`${tenderName}:${status}`);
      setError('');
      const response = await fetch(`/api/tenders/${encodeURIComponent(tenderName)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_status: status }),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to sync tender status');
      }
      await loadResults();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to sync tender status');
    } finally {
      setActionBusy('');
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tender Result</h1>
          <p className="mt-1 text-sm text-gray-500">Post-submission tracker linked back to the main tender workspace.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadResults()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#1e6b87] hover:text-[#1e6b87]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4 sm:mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
          <div className="mt-1 text-sm text-gray-500">Result rows</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-emerald-600">{summary.awards}</div>
          <div className="mt-1 text-sm text-gray-500">Award-stage rows</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{summary.evaluation}</div>
          <div className="mt-1 text-sm text-gray-500">Evaluation-stage rows</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalValue)}</div>
          <div className="mt-1 text-sm text-gray-500">Tracked winning amount</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{summary.linked}</div>
          <div className="mt-1 text-sm text-gray-500">Rows linked to tender workspace</div>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <div className="mb-1 text-xs text-gray-500">Filter by stage</div>
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All stages</option>
              {availableStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This page is the live result bridge. Keep rows linked to a tender so evaluation and award stages can sync back into the actual workspace instead of becoming dead reporting rows.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-14 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading tender result tracker...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-14 text-center">
            <Trophy className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <div className="text-sm font-medium text-gray-700">No result rows found</div>
            <div className="mt-1 text-sm text-gray-400">Result records appear here once tender outcomes are tracked.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Result</th>
                <th>Tender</th>
                <th>Organization</th>
                <th>Stage</th>
                <th>Winner / Amount</th>
                <th>Publication</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.name}>
                  <td>
                    <div className="font-medium text-gray-900">{item.result_id || item.name}</div>
                    <div className="text-sm text-gray-500">{item.reference_no || '-'}</div>
                  </td>
                  <td>
                    {item.tender ? (
                      <Link href={`/pre-sales/${encodeURIComponent(item.tender)}`} className="font-medium text-blue-600 hover:text-blue-800">
                        {item.tender}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">No linked tender</span>
                    )}
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{item.organization_name || '-'}</div>
                  </td>
                  <td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stageTone(item.result_stage)}`}>
                      {item.result_stage || '-'}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">{item.winner_company || '-'}</div>
                    <div className="text-sm text-gray-500">{formatCurrency(item.winning_amount)}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-700">{formatDate(item.publication_date)}</div>
                    <div className="text-xs text-gray-400">{item.is_fresh ? 'Fresh result' : 'Historical'}</div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {item.tender ? (
                        <Link href={`/pre-sales/${encodeURIComponent(item.tender)}`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
                          <ExternalLink className="h-4 w-4" />
                          Workspace
                        </Link>
                      ) : null}
                      {item.tender && EVALUATION_STAGES.has(item.result_stage || '') ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-amber-700 hover:text-amber-800"
                          disabled={actionBusy === `${item.tender}:UNDER_EVALUATION`}
                          onClick={() => void syncTenderStatus(item.tender!, 'UNDER_EVALUATION')}
                        >
                          {actionBusy === `${item.tender}:UNDER_EVALUATION` ? 'Syncing...' : 'Sync Evaluation'}
                        </button>
                      ) : null}
                      {item.tender && AWARD_STAGES.has(item.result_stage || '') ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                          disabled={actionBusy === `${item.tender}:WON`}
                          onClick={() => void syncTenderStatus(item.tender!, 'WON')}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {actionBusy === `${item.tender}:WON` ? 'Syncing...' : 'Sync Won'}
                        </button>
                      ) : null}
                      {!item.tender ? (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                          <AlertCircle className="h-4 w-4" />
                          Link tender first to keep result flow live
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
