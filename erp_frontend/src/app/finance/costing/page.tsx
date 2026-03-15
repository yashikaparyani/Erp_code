'use client';

import { useEffect, useState } from 'react';
import { Calculator, CircleDollarSign, FileSpreadsheet, TrendingDown } from 'lucide-react';

type CostSheet = {
  name: string;
  linked_tender?: string;
  linked_project?: string;
  linked_boq?: string;
  version?: number;
  status?: string;
  margin_percent?: number;
  base_cost?: number;
  sell_value?: number;
  total_items?: number;
};

type CostSheetStats = {
  total?: number;
  draft?: number;
  pending_approval?: number;
  approved?: number;
  rejected?: number;
  total_base_cost?: number;
  total_sell_value?: number;
};

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function FinanceCostingPage() {
  const [rows, setRows] = useState<CostSheet[]>([]);
  const [stats, setStats] = useState<CostSheetStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/cost-sheets').then((response) => response.json()).catch(() => ({ data: [] })),
      fetch('/api/cost-sheets/stats').then((response) => response.json()).catch(() => ({ data: {} })),
    ])
      .then(([sheetRes, statsRes]) => {
        setRows(sheetRes.data || []);
        setStats(statsRes.data || {});
      })
      .finally(() => setLoading(false));
  }, []);

  const variance = (stats.total_sell_value || 0) - (stats.total_base_cost || 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance Costing</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Live cost sheets, base cost, sell value, and approval tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.total_base_cost)}</div>
              <div className="stat-label">Planned Cost</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.total_sell_value)}</div>
              <div className="stat-label">Sell Value</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(variance)}</div>
              <div className="stat-label">Gross Margin Pool</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? rows.length}</div>
              <div className="stat-label">Cost Sheets</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Cost Sheet Register</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">Loading cost sheets...</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No cost sheets found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cost Sheet</th>
                  <th>Tender / Project</th>
                  <th>Linked BOQ</th>
                  <th>Base Cost</th>
                  <th>Sell Value</th>
                  <th>Margin %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <div className="font-medium text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500">v{row.version || 1} • {row.total_items || 0} items</div>
                    </td>
                    <td>
                      <div className="text-gray-700">{row.linked_project || '-'}</div>
                      <div className="text-xs text-gray-400">{row.linked_tender || '-'}</div>
                    </td>
                    <td>{row.linked_boq || '-'}</td>
                    <td>{formatCurrency(row.base_cost)}</td>
                    <td className="font-medium text-gray-900">{formatCurrency(row.sell_value)}</td>
                    <td>{row.margin_percent || 0}%</td>
                    <td>
                      <span className={`badge ${
                        row.status === 'APPROVED'
                          ? 'badge-success'
                          : row.status === 'PENDING_APPROVAL'
                            ? 'badge-warning'
                            : row.status === 'REJECTED'
                              ? 'badge-error'
                              : 'badge-gray'
                      }`}>
                        {row.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
