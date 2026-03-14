'use client';

import { CreditCard, Receipt, TimerReset, WalletCards } from 'lucide-react';

const billingRecords = [
  {
    id: 'BIL-2026-001',
    customer: 'Indore Smart City',
    milestone: 'Installation Completion',
    amount: '₹18.50 Cr',
    dueDate: '2026-03-25',
    status: 'Draft',
  },
  {
    id: 'BIL-2026-002',
    customer: 'Indore Smart City',
    milestone: 'Command Center Integration',
    amount: '₹11.40 Cr',
    dueDate: '2026-03-10',
    status: 'Submitted',
  },
  {
    id: 'BIL-2026-003',
    customer: 'Ujjain Smart Mobility',
    milestone: 'Advance Billing',
    amount: '₹6.20 Cr',
    dueDate: '2026-02-28',
    status: 'Paid',
  },
];

export default function FinanceBillingPage() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance Billing</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Monitor invoice readiness, submissions, and payment collection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">3</div>
              <div className="stat-label">Billing Records</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <TimerReset className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="stat-value">₹29.90 Cr</div>
              <div className="stat-label">Pending Collection</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <WalletCards className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="stat-value">₹6.20 Cr</div>
              <div className="stat-label">Collected</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="stat-value">1</div>
              <div className="stat-label">Paid Bills</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Billing Pipeline</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Billing ID</th>
                <th>Customer</th>
                <th>Milestone</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {billingRecords.map(record => (
                <tr key={record.id}>
                  <td>
                    <div className="font-medium text-gray-900">{record.id}</div>
                  </td>
                  <td>
                    <div className="text-gray-700">{record.customer}</div>
                  </td>
                  <td>
                    <div className="text-gray-700">{record.milestone}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{record.amount}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{record.dueDate}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      record.status === 'Paid'
                        ? 'badge-success'
                        : record.status === 'Submitted'
                          ? 'badge-info'
                          : 'badge-warning'
                    }`}>
                      {record.status}
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