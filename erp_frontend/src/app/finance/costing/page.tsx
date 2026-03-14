'use client';

import { Calculator, CircleDollarSign, FileSpreadsheet, TrendingDown } from 'lucide-react';

const costHeads = [
  {
    id: 'CST-001',
    packageName: 'Camera & Pole Package',
    budget: '₹28.40 Cr',
    actual: '₹27.10 Cr',
    variance: '-₹1.30 Cr',
    status: 'Under Budget',
  },
  {
    id: 'CST-002',
    packageName: 'Network & OFC Package',
    budget: '₹19.25 Cr',
    actual: '₹20.05 Cr',
    variance: '+₹0.80 Cr',
    status: 'Over Budget',
  },
  {
    id: 'CST-003',
    packageName: 'Civil & Installation',
    budget: '₹11.80 Cr',
    actual: '₹11.10 Cr',
    variance: '-₹0.70 Cr',
    status: 'Under Budget',
  },
];

export default function FinanceCostingPage() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance Costing</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Track cost heads, budget variance, and package-level spending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">₹59.45 Cr</div>
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
              <div className="stat-value">₹58.25 Cr</div>
              <div className="stat-label">Actual Cost</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="stat-value">₹1.20 Cr</div>
              <div className="stat-label">Net Savings</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="stat-value">3</div>
              <div className="stat-label">Tracked Packages</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Package Cost Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cost ID</th>
                <th>Package</th>
                <th>Budget</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {costHeads.map(costHead => (
                <tr key={costHead.id}>
                  <td>
                    <div className="font-medium text-gray-900">{costHead.id}</div>
                  </td>
                  <td>
                    <div className="text-gray-700">{costHead.packageName}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{costHead.budget}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{costHead.actual}</div>
                  </td>
                  <td>
                    <div className={costHead.variance.startsWith('+') ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {costHead.variance}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${costHead.status === 'Over Budget' ? 'badge-danger' : 'badge-success'}`}>
                      {costHead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}