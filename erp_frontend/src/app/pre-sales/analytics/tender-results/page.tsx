'use client';
import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

interface TenderResult {
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
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function stageBadge(s?: string) {
  const m: Record<string, string> = { Won: 'badge-green', Lost: 'badge-red', Pending: 'badge-yellow', 'Under Evaluation': 'badge-blue' };
  return m[s || ''] || 'badge-gray';
}

export default function TenderResultsAnalyticsPage() {
  const [items, setItems] = useState<TenderResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tender-results').then(r => r.json()).then(res => setItems(res.data || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const won = items.filter(i => i.result_stage === 'Won').length;
  const lost = items.filter(i => i.result_stage === 'Lost').length;

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tender Results Analytics</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Analyze tender outcomes across all bids.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Trophy className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Results</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Trophy className="w-5 h-5" /></div><div><div className="stat-value">{won}</div><div className="stat-label">Won</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><Trophy className="w-5 h-5" /></div><div><div className="stat-value">{lost}</div><div className="stat-label">Lost</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Tender Results</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Result ID</th><th>Tender</th><th>Reference</th><th>Organization</th><th>Published</th><th>Winner</th><th>Amount</th><th>Stage</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No tender results found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.result_id || item.name}</div></td>
                  <td><div className="text-sm text-gray-900">{item.tender || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.reference_no || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.organization_name || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.publication_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-900">{item.winner_company || '-'}</div></td>
                  <td><div className="text-sm font-medium text-gray-900">{formatCurrency(item.winning_amount)}</div></td>
                  <td><span className={`badge ${stageBadge(item.result_stage)}`}>{item.result_stage || '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
