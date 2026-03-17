'use client';
import { useEffect, useState } from 'react';
import { Users, TrendingUp } from 'lucide-react';

interface Competitor {
  name: string;
  company_name?: string;
  organization?: string;
  win_count?: number;
  loss_count?: number;
  win_rate?: number;
  typical_bid_range_min?: number;
  typical_bid_range_max?: number;
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function CompetitorsPage() {
  const [items, setItems] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/competitors').then(r => r.json()).then(res => setItems(res.data || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Competitor Analysis</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Win/loss rates and bid ranges of known competitors.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Users className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Competitors Tracked</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><TrendingUp className="w-5 h-5" /></div><div><div className="stat-value">{items.length ? (items.reduce((s, i) => s + (i.win_rate || 0), 0) / items.length).toFixed(1) : 0}%</div><div className="stat-label">Avg Win Rate</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Competitors</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Company</th><th>Organization</th><th>Wins</th><th>Losses</th><th>Win Rate</th><th>Bid Range (Min)</th><th>Bid Range (Max)</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-500">No competitor data found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.company_name || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.organization || '-'}</div></td>
                  <td><div className="text-sm text-green-700 font-medium">{item.win_count ?? 0}</div></td>
                  <td><div className="text-sm text-red-700">{item.loss_count ?? 0}</div></td>
                  <td><div className="text-sm font-medium text-gray-900">{(item.win_rate ?? 0).toFixed(1)}%</div></td>
                  <td><div className="text-sm text-gray-700">{formatCurrency(item.typical_bid_range_min)}</div></td>
                  <td><div className="text-sm text-gray-700">{formatCurrency(item.typical_bid_range_max)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
