'use client';
import { Plus, IndianRupee, TrendingUp, Clock, CheckCircle2, Eye } from 'lucide-react';

const milestones = [
  {
    percentage: '10%',
    name: 'Advance',
    date: '2025-09-01',
    amount: '₹8.4 Cr',
    status: 'Received',
  },
  {
    percentage: '30%',
    name: 'on Material Delivery',
    date: '2025-11-15',
    amount: '₹25.2 Cr',
    status: 'Received',
  },
  {
    percentage: '50%',
    name: 'on Installation',
    date: '2026-01-20',
    amount: '₹42.0 Cr',
    status: 'Invoiced',
  },
  {
    percentage: '10%',
    name: 'on Go-Live',
    date: 'Not yet applicable',
    amount: '₹8.4 Cr',
    status: 'Pending',
  },
];

const invoices = [
  {
    id: 'INV-2026-042',
    client: 'Indore Smart City',
    amount: '₹42.0 Cr',
    date: '2026-01-20',
    status: 'Pending',
  },
  {
    id: 'INV-2025-038',
    client: 'Indore Smart City',
    amount: '₹25.2 Cr',
    date: '2025-11-15',
    status: 'Paid',
  },
  {
    id: 'INV-2025-021',
    client: 'Indore Smart City',
    amount: '₹8.4 Cr',
    date: '2025-09-01',
    status: 'Paid',
  },
];

const vendorPayments = [
  {
    vendor: 'Hikvision India',
    poNumber: 'PO-2026-145',
    amount: '₹12.4 L',
    dueDate: '2026-02-20',
    status: 'Pending',
  },
  {
    vendor: 'Sterlite Technologies',
    poNumber: 'PO-2026-132',
    amount: '₹8.6 L',
    dueDate: '2026-02-10',
    status: 'Paid',
  },
  {
    vendor: 'Cisco Systems',
    poNumber: 'PO-2026-128',
    amount: '₹4.2 L',
    dueDate: '2026-02-08',
    status: 'Paid',
  },
];

export default function FinancePage() {
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Invoicing, payments, and financial tracking</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">₹84.0 Cr</div>
              <div className="stat-label">Total Budget</div>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">₹33.6 Cr</div>
              <div className="stat-label">Revenue Received</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">40% of total</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">₹42.0 Cr</div>
              <div className="stat-label">Pending Invoices</div>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="stat-value">₹12.4 L</div>
              <div className="stat-label">Vendor Payables</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Milestone Tracker */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Payment Milestone Tracker</h3>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between gap-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex-1 relative">
                <div className={`flex flex-col items-center p-4 rounded-lg ${
                  milestone.status === 'Received' ? 'bg-green-50' :
                  milestone.status === 'Invoiced' ? 'bg-yellow-50' :
                  'bg-gray-50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    milestone.status === 'Received' ? 'bg-green-500 text-white' :
                    milestone.status === 'Invoiced' ? 'bg-yellow-500 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-gray-900">{milestone.percentage}</div>
                  <div className="text-xs text-gray-600 text-center">{milestone.name}</div>
                  <div className="text-xs text-gray-500 mt-1">Date: {milestone.date}</div>
                  <div className="font-semibold text-gray-900 mt-1">{milestone.amount}</div>
                  <span className={`badge mt-2 ${
                    milestone.status === 'Received' ? 'badge-success' :
                    milestone.status === 'Invoiced' ? 'badge-warning' :
                    'badge-gray'
                  }`}>
                    {milestone.status}
                  </span>
                </div>
                {index < milestones.length - 1 && (
                  <div className="absolute top-1/2 -right-2 w-4 h-0.5 bg-gray-300"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
            <button className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              Generate Invoice
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td>
                      <div className="font-medium text-gray-900">{invoice.id}</div>
                    </td>
                    <td>
                      <div className="text-gray-600">{invoice.client}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-gray-900">{invoice.amount}</div>
                    </td>
                    <td>
                      <div className="text-gray-600">{invoice.date}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        invoice.status === 'Paid' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vendor Payments */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Vendor Payments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>PO Number</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vendorPayments.map((payment, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="font-medium text-gray-900">{payment.vendor}</div>
                    </td>
                    <td>
                      <div className="text-gray-600">{payment.poNumber}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-gray-900">{payment.amount}</div>
                    </td>
                    <td>
                      <div className="text-gray-600">{payment.dueDate}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        payment.status === 'Paid' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td>
                      <button className={`text-sm font-medium ${
                        payment.status === 'Pending' ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400'
                      }`}>
                        {payment.status === 'Pending' ? 'Process' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}