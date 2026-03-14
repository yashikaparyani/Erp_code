'use client';
import { useEffect, useState } from 'react';
import { Plus, IndianRupee, TrendingUp, Clock, CheckCircle2, Eye } from 'lucide-react';

interface Invoice {
  name: string;
  linked_project?: string;
  linked_site?: string;
  invoice_date?: string;
  invoice_type?: string;
  status?: string;
  amount?: number;
  gst_amount?: number;
  tds_amount?: number;
  net_receivable?: number;
  milestone_complete?: boolean;
  submitted_by?: string;
  approved_by?: string;
}

interface InvoiceStats {
  total?: number;
  draft?: number;
  submitted?: number;
  approved?: number;
  payment_received?: number;
  cancelled?: number;
  total_amount?: number;
  total_receivable?: number;
}

function formatCurrency(val?: number): string {
  if (!val) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/invoices').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/invoices/stats').then(r => r.json()).catch(() => ({ data: {} })),
    ]).then(([invRes, statsRes]) => {
      setInvoices(invRes.data || []);
      setStats(statsRes.data || {});
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const received = (stats.payment_received ?? 0);
  const pending = (stats.submitted ?? 0) + (stats.approved ?? 0);

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
              <div className="stat-value">{formatCurrency(stats.total_amount)}</div>
              <div className="stat-label">Total Invoiced</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{stats.total ?? invoices.length} invoices</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">{received}</div>
              <div className="stat-label">Payments Received</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">{formatCurrency(stats.total_receivable)} receivable</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">{pending}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{stats.draft ?? 0} drafts</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="stat-value">{stats.cancelled ?? 0}</div>
              <div className="stat-label">Cancelled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Invoices</h3>
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
                <th>Project / Site</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Net Receivable</th>
                <th>Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No invoices found</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.name}>
                  <td>
                    <div className="font-medium text-gray-900">{inv.name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{inv.linked_project || '-'}</div>
                    <div className="text-xs text-gray-500">{inv.linked_site || ''}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{inv.invoice_type || '-'}</span>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{formatCurrency(inv.amount)}</div>
                  </td>
                  <td>
                    <div className="text-gray-900">{formatCurrency(inv.net_receivable)}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{inv.invoice_date || '-'}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      inv.status === 'PAYMENT_RECEIVED' ? 'badge-success' :
                      inv.status === 'APPROVED' ? 'badge-info' :
                      inv.status === 'SUBMITTED' ? 'badge-warning' :
                      inv.status === 'CANCELLED' ? 'badge-error' :
                      'badge-gray'
                    }`}>
                      {inv.status}
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
    </div>
  );
}