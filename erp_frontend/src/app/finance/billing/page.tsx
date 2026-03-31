'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Eye, Plus, Receipt, TimerReset, WalletCards, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ActionModal from '@/components/ui/ActionModal';

type Invoice = {
  name: string;
  customer?: string;
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

type ReceiptStats = {
  total_received?: number;
  total_tds?: number;
};

type InvoiceStats = {
  total?: number;
  draft?: number;
  submitted?: number;
  approved?: number;
  payment_received?: number;
  total_amount?: number;
  total_receivable?: number;
};

type PartyOption = {
  name: string;
  party_name?: string;
};

type ProjectOption = {
  name: string;
  project_name?: string;
  customer?: string;
};

type SiteOption = {
  name: string;
  site_name?: string;
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

async function fetchOps<T>(method: string, args: Record<string, unknown> = {}) {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Failed to load ${method}`);
  }
  return (payload.data || []) as T;
}

const initialCreateForm = {
  customer: '',
  linked_project: '',
  linked_site: '',
  invoice_date: '',
  invoice_type: 'MILESTONE',
  description: '',
  qty: 1,
  rate: 0,
  milestone_complete: true,
  audit_note: '',
};

export default function FinanceBillingPage() {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({});
  const [receiptStats, setReceiptStats] = useState<ReceiptStats>({});
  const [customers, setCustomers] = useState<PartyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [actionLoadingName, setActionLoadingName] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<{ name: string; action: 'reject' | 'cancel' } | null>(null);
  const [createForm, setCreateForm] = useState(initialCreateForm);

  const computedAmount = useMemo(
    () => Number(createForm.qty || 0) * Number(createForm.rate || 0),
    [createForm.qty, createForm.rate],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.name === createForm.linked_project),
    [createForm.linked_project, projects],
  );

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
      fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'get_payment_receipt_stats' }),
      }).then((response) => response.json()).catch(() => ({ data: {} })),
    ])
      .then(([invoiceRes, statsRes, receiptRes]) => {
        setInvoices(invoiceRes.data || []);
        setStats(statsRes.data || {});
        setReceiptStats(receiptRes.data || {});
      })
      .finally(() => setLoading(false));
  };

  const loadLookups = async () => {
    setLookupLoading(true);
    try {
      const [partyRes, projectList] = await Promise.all([
        fetch('/api/parties?type=CLIENT&active=1').then((response) => response.json()),
        fetchOps<ProjectOption[]>('get_project_spine_list'),
      ]);
      setCustomers(partyRes.data || []);
      setProjects(projectList || []);
    } finally {
      setLookupLoading(false);
    }
  };

  const loadSites = async (projectName: string) => {
    if (!projectName) {
      setSites([]);
      return;
    }
    const response = await fetch(`/api/sites?project=${encodeURIComponent(projectName)}`);
    const payload = await response.json().catch(() => ({ data: [] }));
    setSites(payload.data || []);
  };

  useEffect(() => {
    void loadData();
    void loadLookups();
  }, []);

  useEffect(() => {
    void loadSites(createForm.linked_project);
  }, [createForm.linked_project]);

  const resetCreateForm = () => {
    setCreateForm(initialCreateForm);
    setSites([]);
    setError('');
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetCreateForm();
  };

  const handleProjectChange = (projectName: string) => {
    const matched = projects.find((project) => project.name === projectName);
    setCreateForm((prev) => ({
      ...prev,
      linked_project: projectName,
      linked_site: '',
      customer: matched?.customer || prev.customer,
    }));
  };

  const handleCreateInvoice = async () => {
    if (!createForm.customer.trim() || !createForm.linked_project.trim() || !createForm.invoice_date || !createForm.description.trim()) {
      setError('Customer, Linked Project, Invoice Date, and Line Description are required.');
      return;
    }

    if (createForm.qty <= 0 || createForm.rate < 0) {
      setError('Qty must be greater than 0 and Rate cannot be negative.');
      return;
    }

    if (createForm.invoice_type === 'MILESTONE' && !createForm.milestone_complete && !createForm.audit_note.trim()) {
      setError('Audit Note is required when a milestone invoice is raised before milestone completion.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const payload = {
        customer: createForm.customer,
        linked_project: createForm.linked_project,
        linked_site: createForm.linked_site || undefined,
        invoice_date: createForm.invoice_date,
        invoice_type: createForm.invoice_type,
        amount: computedAmount,
        milestone_complete: createForm.invoice_type === 'MILESTONE' ? (createForm.milestone_complete ? 1 : 0) : 0,
        audit_note: createForm.invoice_type === 'MILESTONE' && !createForm.milestone_complete ? createForm.audit_note : undefined,
        items: [
          {
            description: createForm.description,
            qty: Number(createForm.qty) || 1,
            rate: Number(createForm.rate) || 0,
            amount: computedAmount,
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

      closeCreateModal();
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (name: string, action: 'submit' | 'approve' | 'reject' | 'mark_paid' | 'cancel', extra?: Record<string, string>) => {
    setError('');
    setActionLoadingName(name);
    try {
      const payload: Record<string, unknown> = { action };
      if (action === 'reject' || action === 'cancel') {
        payload.reason = extra?.reason || '';
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
        <button className="btn btn-primary w-full sm:w-auto" onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={closeCreateModal}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select className="input" value={createForm.customer} onChange={(e) => setCreateForm((p) => ({ ...p, customer: e.target.value }))} disabled={lookupLoading}>
                  <option value="">{lookupLoading ? 'Loading customers...' : 'Select customer'}</option>
                  {customers.map((customer) => (
                    <option key={customer.name} value={customer.name}>
                      {customer.party_name || customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Project *</label>
                <select className="input" value={createForm.linked_project} onChange={(e) => handleProjectChange(e.target.value)} disabled={lookupLoading}>
                  <option value="">{lookupLoading ? 'Loading projects...' : 'Select project'}</option>
                  {projects.map((project) => (
                    <option key={project.name} value={project.name}>
                      {project.name}{project.project_name ? ` | ${project.project_name}` : ''}
                    </option>
                  ))}
                </select>
                {selectedProject?.customer ? <div className="mt-1 text-xs text-gray-500">Project customer: {selectedProject.customer}</div> : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Site</label>
                <select className="input" value={createForm.linked_site} onChange={(e) => setCreateForm((p) => ({ ...p, linked_site: e.target.value }))} disabled={!createForm.linked_project}>
                  <option value="">{createForm.linked_project ? 'Select site' : 'Select project first'}</option>
                  {sites.map((site) => (
                    <option key={site.name} value={site.name}>
                      {site.site_name ? `${site.name} | ${site.site_name}` : site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                <input className="input" type="date" value={createForm.invoice_date} onChange={(e) => setCreateForm((p) => ({ ...p, invoice_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type *</label>
                <select className="input" value={createForm.invoice_type} onChange={(e) => setCreateForm((p) => ({ ...p, invoice_type: e.target.value }))}>
                  <option value="MILESTONE">Milestone</option>
                  <option value="RA">RA</option>
                  <option value="O_AND_M">O&amp;M</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input className="input bg-gray-50" type="number" min={0} step={0.01} value={computedAmount} readOnly />
                <div className="mt-1 text-xs text-gray-500">Auto-calculated from Qty x Rate.</div>
              </div>
              {createForm.invoice_type === 'MILESTONE' ? (
                <div className="flex items-center gap-2 pt-7">
                  <input id="milestone-complete" type="checkbox" checked={createForm.milestone_complete} onChange={(e) => setCreateForm((p) => ({ ...p, milestone_complete: e.target.checked }))} />
                  <label htmlFor="milestone-complete" className="text-sm text-gray-700">Milestone Complete</label>
                </div>
              ) : (
                <div className="pt-7 text-sm text-gray-500">Milestone flag is only used for milestone invoices.</div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Line Description *</label>
                <textarea className="input min-h-24" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label>
                <input className="input" type="number" min={1} step={1} value={createForm.qty} onChange={(e) => setCreateForm((p) => ({ ...p, qty: Number(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate *</label>
                <input className="input" type="number" min={0} step={0.01} value={createForm.rate} onChange={(e) => setCreateForm((p) => ({ ...p, rate: Number(e.target.value) || 0 }))} />
              </div>
              {createForm.invoice_type === 'MILESTONE' && !createForm.milestone_complete ? (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Audit Note *</label>
                  <textarea className="input min-h-24" value={createForm.audit_note} onChange={(e) => setCreateForm((p) => ({ ...p, audit_note: e.target.value }))} />
                  <div className="mt-1 text-xs text-gray-500">Required when a milestone invoice is raised before milestone completion.</div>
                </div>
              ) : null}
            </div>
            {error ? <p className="px-6 pb-2 text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button className="btn btn-secondary" onClick={closeCreateModal}>Cancel</button>
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
              <div className="stat-value">{formatCurrency(stats.total_receivable)}</div>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Collected Amount</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-700">{formatCurrency(receiptStats.total_received)}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Collection Gap</div>
          <div className="mt-2 text-2xl font-semibold text-amber-700">{formatCurrency((stats.total_receivable || 0) - (receiptStats.total_received || 0))}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">TDS Recorded</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(receiptStats.total_tds)}</div>
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
                  <th>Customer</th>
                  <th>Project / Site</th>
                  <th>Invoice Date</th>
                  <th>Type</th>
                  <th>Gross</th>
                  <th>Net Receivable</th>
                  <th>Status</th>
                  <th>Commercial Visibility</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.name}>
                    <td>
                      <Link href={`/finance/billing/${encodeURIComponent(invoice.name)}`} className="font-medium text-blue-600 hover:underline">{invoice.name}</Link>
                      <div className="text-xs text-gray-500">{invoice.approved_by || 'Not approved yet'}</div>
                    </td>
                    <td>
                      <div className="text-sm font-medium text-gray-900">{invoice.customer || '-'}</div>
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
                      <div className="text-sm text-gray-700">
                        {invoice.status === 'PAYMENT_RECEIVED'
                          ? 'Collected'
                          : invoice.status === 'APPROVED'
                            ? 'Approved, waiting collection'
                            : invoice.status === 'SUBMITTED'
                              ? 'Waiting release'
                              : 'Draft commercial record'}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Link href={`/finance/billing/${encodeURIComponent(invoice.name)}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                        {invoice.status === 'DRAFT' && canCreateOrSubmit ? (
                          <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium" disabled={actionLoadingName === invoice.name} onClick={() => runAction(invoice.name, 'submit')}>Submit</button>
                        ) : null}
                        {invoice.status === 'SUBMITTED' && canApproveReject ? (
                          <>
                            <button className="text-green-600 hover:text-green-800 text-sm font-medium" disabled={actionLoadingName === invoice.name} onClick={() => runAction(invoice.name, 'approve')}>Approve</button>
                            <button className="text-red-600 hover:text-red-800 text-sm font-medium" disabled={actionLoadingName === invoice.name} onClick={() => setReasonTarget({ name: invoice.name, action: 'reject' })}>Reject</button>
                          </>
                        ) : null}
                        {invoice.status === 'APPROVED' && canCreateOrSubmit ? (
                          <button className="text-orange-600 hover:text-orange-800 text-sm font-medium" disabled={actionLoadingName === invoice.name} onClick={() => runAction(invoice.name, 'mark_paid')}>Mark Paid</button>
                        ) : null}
                        {(invoice.status === 'DRAFT' || invoice.status === 'SUBMITTED' || invoice.status === 'APPROVED') && canApproveReject ? (
                          <button className="text-rose-600 hover:text-rose-800 text-sm font-medium" disabled={actionLoadingName === invoice.name} onClick={() => setReasonTarget({ name: invoice.name, action: 'cancel' })}>Cancel</button>
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
      <ActionModal
        open={reasonTarget !== null}
        title={reasonTarget?.action === 'reject' ? 'Reject Invoice' : 'Cancel Invoice'}
        description={`${reasonTarget?.action === 'reject' ? 'Reject' : 'Cancel'} ${reasonTarget?.name}?`}
        confirmLabel={reasonTarget?.action === 'reject' ? 'Reject' : 'Cancel'}
        variant="danger"
        fields={[{ name: 'reason', label: 'Reason', type: 'textarea' }]}
        onCancel={() => setReasonTarget(null)}
        onConfirm={async (values) => {
          if (reasonTarget) await runAction(reasonTarget.name, reasonTarget.action, { reason: values.reason || '' });
          setReasonTarget(null);
        }}
      />
    </div>
  );
}
