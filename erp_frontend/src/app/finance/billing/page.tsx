'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Receipt, TimerReset, WalletCards } from 'lucide-react';

type Invoice = {
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
  milestone_complete?: number;
  approved_by?: string;
};

type InvoiceStats = {
  total?: number;
  draft?: number;
  submitted?: number;
  approved?: number;
  payment_received?: number;
  total_amount?: number;
  total_net_receivable?: number;
};

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

export default function FinanceBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/invoices').then((response) => response.json()).catch(() => ({ data: [] })),
      fetch('/api/invoices/stats').then((response) => response.json()).catch(() => ({ data: {} })),
    ])
      .then(([invoiceRes, statsRes]) => {
        setInvoices(invoiceRes.data || []);
        setStats(statsRes.data || {});
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingCollection = (stats.total_net_receivable || 0) - (stats.payment_received ? 0 : 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance Billing</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Live invoice register, submission flow, and receivable tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? invoices.length}</div>
              <div className="stat-label">Invoices</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <TimerReset className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.total_net_receivable)}</div>
              <div className="stat-label">Net Receivable</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <WalletCards className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="stat-value">{stats.payment_received ?? 0}</div>
              <div className="stat-label">Paid Invoices</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="stat-value">{stats.submitted ?? 0}</div>
              <div className="stat-label">Awaiting Approval</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Billing Pipeline</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">Loading invoice records...</div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No invoices found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Project / Site</th>
                  <th>Invoice Date</th>
                  <th>Type</th>
                  <th>Gross</th>
                  <th>Net Receivable</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.name}>
                    <td>
                      <div className="font-medium text-gray-900">{invoice.name}</div>
                      <div className="text-xs text-gray-500">{invoice.approved_by || 'Not approved yet'}</div>
                    </td>
                    <td>
                      <div className="text-gray-700">{invoice.linked_project || '-'}</div>
                      <div className="text-xs text-gray-400">{invoice.linked_site || '-'}</div>
                    </td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td>{invoice.invoice_type || '-'}</td>
                    <td>{formatCurrency(invoice.amount)}</td>
                    <td className="font-medium text-gray-900">{formatCurrency(invoice.net_receivable)}</td>
                    <td>
                      <span className={`badge ${
                        invoice.status === 'PAYMENT_RECEIVED'
                          ? 'badge-success'
                          : invoice.status === 'APPROVED'
                            ? 'badge-info'
                            : invoice.status === 'SUBMITTED'
                              ? 'badge-warning'
                              : 'badge-gray'
                      }`}>
                        {invoice.status || 'Unknown'}
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
