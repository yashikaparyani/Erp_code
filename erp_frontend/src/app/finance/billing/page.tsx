'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Eye, Plus, Receipt, TimerReset, WalletCards, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [actionLoadingName, setActionLoadingName] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    linked_project: '',
    linked_site: '',
    invoice_date: '',
    invoice_type: 'MILESTONE',
    amount: 0,
    description: '',
    qty: 1,
    rate: 0,
    milestone_complete: true,
  });

  const hasAnyRole = (...roles: string[]) => {
    const assigned = new Set(currentUser?.roles || []);
    return roles.some((role) => assigned.has(role));
  };

  const canCreateOrSubmit = hasAnyRole('Director', 'System Manager', 'Accounts', 'Department Head');
  const canApproveReject = hasAnyRole('Director', 'System Manager', 'Department Head');

  const loadData = async () => {
    setLoading(true);
    Promise.all([
      fetch('/api/invoices').then((response) => response.json()).catch(() => ({ data: [] })),
      fetch('/api/invoices/stats').then((response) => response.json()).catch(() => ({ data: {} })),
    ])
      .then(([invoiceRes, statsRes]) => {
        setInvoices(invoiceRes.data || []);
        setStats(statsRes.data || {});
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvoice = async () => {
    if (!createForm.linked_project.trim() || !createForm.invoice_date || !createForm.description.trim()) {
      setError('Linked Project, Invoice Date and line Description are required.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const payload = {
        linked_project: createForm.linked_project,
        linked_site: createForm.linked_site || undefined,
        invoice_date: createForm.invoice_date,
        invoice_type: createForm.invoice_type,
        amount: Number(createForm.amount) || 0,
        milestone_complete: createForm.milestone_complete ? 1 : 0,
        items: [
          {
            description: createForm.description,
            qty: Number(createForm.qty) || 1,
            rate: Number(createForm.rate) || 0,
          },
        ],
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create invoice');
      }

      setShowCreateModal(false);
      setCreateForm({
        linked_project: '',
        linked_site: '',
        invoice_date: '',
        invoice_type: 'MILESTONE',
        amount: 0,
        description: '',
        qty: 1,
        rate: 0,
        milestone_complete: true,
      });
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (name: string, action: 'submit' | 'approve' | 'reject' | 'mark_paid' | 'cancel') => {
    setError('');
    setActionLoadingName(name);
    try {
      const payload: Record<string, unknown> = { action };
      if (action === 'reject' || action === 'cancel') {
        payload.reason = prompt(`${action === 'reject' ? 'Reject' : 'Cancel'} reason`) || '';
      }

      const response = await fetch(`/api/invoices/${encodeURIComponent(name)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to ${action}`);
      }
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action}`);
    } finally {
      setActionLoadingName(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance Billing</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Live invoice register, submission flow, and receivable tracking.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Project *</label>
                <input className="input" value={createForm.linked_project} onChange={(e) => setCreateForm((p) => ({ ...p, linked_project: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Site</label>
                <input className="input" value={createForm.linked_site} onChange={(e) => setCreateForm((p) => ({ ...p, linked_site: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                <input className="input" type="date" value={createForm.invoice_date} onChange={(e) => setCreateForm((p) => ({ ...p, invoice_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type *</label>
                <select className="input" value={createForm.invoice_type} onChange={(e) => setCreateForm((p) => ({ ...p, invoice_type: e.target.value }))}>
                  <option value="MILESTONE">MILESTONE</option>
                  <option value="RA">RA</option>
                  <option value="O_AND_M">O_AND_M</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input className="input" type="number" min={0} step={0.01} value={createForm.amount} onChange={(e) => setCreateForm((p) => ({ ...p, amount: Number(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-center gap-2 pt-7">
                <input id="milestone-complete" type="checkbox" checked={createForm.milestone_complete} onChange={(e) => setCreateForm((p) => ({ ...p, milestone_complete: e.target.checked }))} />
                <label htmlFor="milestone-complete" className="text-sm text-gray-700">Milestone Complete</label>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Line Description *</label>
                <input className="input" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label>
                <input className="input" type="number" min={1} step={1} value={createForm.qty} onChange={(e) => setCreateForm((p) => ({ ...p, qty: Number(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate *</label>
                <input className="input" type="number" min={0} step={0.01} value={createForm.rate} onChange={(e) => setCreateForm((p) => ({ ...p, rate: Number(e.target.value) || 0 }))} />
              </div>
            </div>
            {error ? <p className="px-6 pb-2 text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateInvoice} disabled={creating}>{creating ? 'Creating...' : 'Create Invoice'}</button>
            </div>
          </div>
        </div>
      ) : null}

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
                  <th>Actions</th>
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
                    <td>
                      <div className="flex flex-wrap gap-2 items-center">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1" onClick={() => alert(`Invoice: ${invoice.name}\nStatus: ${invoice.status || '-'}`)}>
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {invoice.status === 'DRAFT' && canCreateOrSubmit ? (
                          <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium" disabled={actionLoadingName === invoice.name} onClick={() => runAction(invoice.name, 'submit')}>Submit</button>
                        ) : null}
                        {invoice.status === 'SUBMITTED' && canApproveReject ? (
                          <>
                            <button className="text-green-600 hover:text-green-800 text-sm font-medium" disabled={actionLoadingName === invoice.name} onClick={() => runAction(invoice.name, 'approve')}>Approve</button>
                            <button className="text-red-600 hover:text-red-800 text-sm font-medium" disabled={actionLoadingName === invoice.name} onClick={() => runAction(invoice.name, 'reject')}>Reject</button>
                          </>
                        ) : null}
                        {invoice.status === 'APPROVED' && canCreateOrSubmit ? (
                          <button className="text-orange-600 hover:text-orange-800 text-sm font-medium" disabled={actionLoadingName === invoice.name} onClick={() => runAction(invoice.name, 'mark_paid')}>Mark Paid</button>
                        ) : null}
                        {(invoice.status === 'DRAFT' || invoice.status === 'SUBMITTED' || invoice.status === 'APPROVED') && canApproveReject ? (
                          <button className="text-rose-600 hover:text-rose-800 text-sm font-medium" disabled={actionLoadingName === invoice.name} onClick={() => runAction(invoice.name, 'cancel')}>Cancel</button>
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
    </div>
  );
}
