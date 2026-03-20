'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, Download, Scale, Trophy } from 'lucide-react';
import {
  type Competitor,
  type Tender,
  type TenderResult,
  fetchJson,
  formatCurrency,
  formatDate,
  formatPercent,
  resultStageBadge,
} from '../_lib';

type TenderResponse = { data?: Tender[] };
type TenderResultsResponse = { data?: TenderResult[] };
type CompetitorResponse = { data?: Competitor[] };

type ScoreRow = {
  name: string;
  wins: number;
  losses: number;
  winRate: number;
  avgBid: number;
  source: 'our-team' | 'competitor';
};

export default function CompareBiddersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [results, setResults] = useState<TenderResult[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'our-team' | 'competitor'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJson<TenderResponse>('/api/tenders'),
      fetchJson<TenderResultsResponse>('/api/tender-results'),
      fetchJson<CompetitorResponse>('/api/competitors'),
    ])
      .then(([tendersRes, resultsRes, competitorsRes]) => {
        setTenders(tendersRes.data || []);
        setResults(resultsRes.data || []);
        setCompetitors(competitorsRes.data || []);
      })
      .catch(() => {
        setTenders([]);
        setResults([]);
        setCompetitors([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const ourScore = useMemo<ScoreRow>(() => {
    const wins = tenders.filter((row) => row.status === 'WON').length;
    const losses = tenders.filter((row) => ['LOST', 'DROPPED'].includes(row.status || '')).length;
    const avgBid = tenders.length ? tenders.reduce((sum, row) => sum + (row.estimated_value || 0), 0) / tenders.length : 0;
    const denominator = wins + losses;
    return {
      name: 'Technosys / Our Bid Team',
      wins,
      losses,
      avgBid,
      winRate: denominator ? (wins / denominator) * 100 : 0,
      source: 'our-team',
    };
  }, [tenders]);

  const scoreRows = useMemo<ScoreRow[]>(() => {
    const competitorRows = competitors.map((row) => {
      const wins = row.win_count || 0;
      const losses = row.loss_count || 0;
      return {
        name: row.company_name || row.name,
        wins,
        losses,
        winRate: row.win_rate || (wins + losses ? (wins / (wins + losses)) * 100 : 0),
        avgBid: ((row.typical_bid_range_min || 0) + (row.typical_bid_range_max || 0)) / 2,
        source: 'competitor' as const,
      };
    });

    return [ourScore, ...competitorRows].sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.wins - a.wins;
    });
  }, [competitors, ourScore]);

  const filteredScoreRows = useMemo(
    () => scoreRows.filter((row) => (sourceFilter === 'all' ? true : row.source === sourceFilter)),
    [scoreRows, sourceFilter],
  );

  const winnerLeaderboard = useMemo(() => {
    const grouped = results.reduce<Record<string, { wins: number; value: number; lastAward?: string }>>((acc, row) => {
      const key = row.winner_company || 'Unspecified winner';
      if (!acc[key]) {
        acc[key] = { wins: 0, value: 0, lastAward: row.publication_date };
      }
      acc[key].wins += 1;
      acc[key].value += row.winning_amount || 0;
      if (!acc[key].lastAward || new Date(row.publication_date || 0).getTime() > new Date(acc[key].lastAward || 0).getTime()) {
        acc[key].lastAward = row.publication_date;
      }
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.wins - a.wins || b.value - a.value)
      .slice(0, 10);
  }, [results]);

  const stageRows = useMemo(() => {
    const grouped = results.reduce<Record<string, number>>((acc, row) => {
      const key = row.result_stage || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([stage, count]) => ({ stage, count }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  const competitiveSignals = useMemo(() => {
    const strongerCompetitors = scoreRows.filter((row) => row.source === 'competitor' && row.winRate > ourScore.winRate).slice(0, 3);
    const highBidCompetitors = scoreRows.filter((row) => row.source === 'competitor' && row.avgBid > ourScore.avgBid).slice(0, 3);
    const unlinkedWinners = winnerLeaderboard.filter((row) => !competitors.some((item) => (item.company_name || item.name) === row.name)).slice(0, 5);
    return { strongerCompetitors, highBidCompetitors, unlinkedWinners };
  }, [competitors, ourScore.avgBid, ourScore.winRate, scoreRows, winnerLeaderboard]);

  const exportCsv = () => {
    const lines = [
      ['Bidder', 'Type', 'Wins', 'Losses', 'Win Rate', 'Avg Bid Size'],
      ...filteredScoreRows.map((row) => [row.name, row.source, row.wins, row.losses, row.winRate, row.avgBid]),
    ];
    const csv = lines.map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'compare-bidders.csv';
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Compare Bidders</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Compare our pre-sales performance against competitor master data and published winners.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className="input min-w-40" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as 'all' | 'our-team' | 'competitor')}>
              <option value="all">All bidders</option>
              <option value="our-team">Our team only</option>
              <option value="competitor">Competitors only</option>
            </select>
            <button className="btn btn-secondary" onClick={exportCsv} disabled={!filteredScoreRows.length}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Building2 className="w-5 h-5" /></div><div><div className="stat-value">{competitors.length}</div><div className="stat-label">Competitors Tracked</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Trophy className="w-5 h-5" /></div><div><div className="stat-value">{formatPercent(ourScore.winRate)}</div><div className="stat-label">Our Win Rate</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Scale className="w-5 h-5" /></div><div><div className="stat-value">{winnerLeaderboard.length}</div><div className="stat-label">Published Winners</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600"><BarChart3 className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(ourScore.avgBid)}</div><div className="stat-label">Our Avg Bid Size</div></div></div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Who is beating us</h3></div>
          <div className="p-5 space-y-2">
            {competitiveSignals.strongerCompetitors.length === 0 ? <div className="text-sm text-gray-500">No competitor is currently outperforming our tracked win rate.</div> : competitiveSignals.strongerCompetitors.map((row) => (
              <div key={row.name} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{row.name} | {formatPercent(row.winRate)}</div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Pricing pressure</h3></div>
          <div className="p-5 space-y-2">
            {competitiveSignals.highBidCompetitors.length === 0 ? <div className="text-sm text-gray-500">No major pricing pressure signal found from tracked competitors.</div> : competitiveSignals.highBidCompetitors.map((row) => (
              <div key={row.name} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{row.name} | avg {formatCurrency(row.avgBid)}</div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Live result coverage gaps</h3></div>
          <div className="p-5 space-y-2">
            {competitiveSignals.unlinkedWinners.length === 0 ? <div className="text-sm text-gray-500">Published winners are already represented in competitor master.</div> : competitiveSignals.unlinkedWinners.map((row) => (
              <div key={row.name} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{row.name} | {row.wins} award(s)</div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Bidder Scoreboard</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Bidder</th><th>Type</th><th>Wins</th><th>Losses</th><th>Win Rate</th><th>Avg Bid Size</th></tr></thead>
              <tbody>
                {filteredScoreRows.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No bidder data found</td></tr> : filteredScoreRows.map((row) => (
                  <tr key={row.name}>
                    <td><div className="font-medium text-gray-900">{row.name}</div></td>
                    <td><span className={`badge ${row.source === 'our-team' ? 'badge-blue' : 'badge-gray'}`}>{row.source === 'our-team' ? 'Our team' : 'Competitor'}</span></td>
                    <td><div className="text-sm font-medium text-green-700">{row.wins}</div></td>
                    <td><div className="text-sm text-red-700">{row.losses}</div></td>
                    <td><div className="text-sm text-gray-900">{formatPercent(row.winRate)}</div></td>
                    <td><div className="text-sm text-gray-700">{formatCurrency(row.avgBid)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Result Stage Spread</h3></div>
          <div className="p-5 space-y-3">
            {stageRows.length === 0 ? <div className="text-sm text-gray-500">No tender result stages available.</div> : stageRows.map((row) => (
              <div key={row.stage} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className={`badge ${resultStageBadge(row.stage)}`}>{row.stage}</span>
                <span className="text-sm font-semibold text-slate-900">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Published Winner Leaderboard</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Winner Company</th><th>Awards</th><th>Total Award Value</th><th>Last Seen</th></tr></thead>
            <tbody>
              {winnerLeaderboard.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">No winner data published yet</td></tr> : winnerLeaderboard.map((row) => (
                <tr key={row.name}>
                  <td><div className="font-medium text-gray-900">{row.name}</div></td>
                  <td><div className="text-sm text-gray-700">{row.wins}</div></td>
                  <td><div className="text-sm text-gray-900 font-medium">{formatCurrency(row.value)}</div></td>
                  <td><div className="text-sm text-gray-700">{formatDate(row.lastAward)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
