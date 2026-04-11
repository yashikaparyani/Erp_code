'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Plus, X, Banknote, CreditCard, RefreshCcw, BookOpen, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import OpsWorkspace from '@/components/ops/OpsWorkspace';
import LinkPicker from '@/components/ui/LinkPicker';
import {
  callApi, callOps, formatCurrency, formatDate, badge,
  INVOICE_BADGES, statusVariant, hasAnyRole,
} from '@/components/finance/fin-helpers';
import { useAuth } from '@/context/AuthContext';
import { Download } from 'lucide-react';

type BillingTab = 'invoices' | 'receipts' | 'follow-ups' | 'statement' | 'aging' | 'retention' | 'penalties';

interface Invoice {
  name: string; customer?: string; linked_project?: string; linked_site?: string;
  invoice_date?: string; invoice_type?: string; status?: string; amount?: number;
  gst_amount?: number; tds_amount?: number; net_receivable?: number;
  milestone_complete?: number; approved_by?: string;
}
interface Stats { total?: number; draft?: number; submitted?: number; approved?: number;
  payment_received?: number; total_amount?: number; total_receivable?: number; }

const INIT = {
  customer: '', linked_project: '', linked_site: '', invoice_date: '',
  invoice_type: 'MILESTONE', description: '', qty: 1, rate: 0,
  milestone_complete: true, audit_note: '',
};

export default function BillingClusterPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<BillingTab>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [busyName, setBusyName] = useState<string | null>(null);
  const [form, setForm] = useState(INIT);

  // Receivable aging state
  const [agingRows, setAgingRows] = useState<any[]>([]);
  const [agingLoading, setAgingLoading] = useState(false);

  // Customer statement state
  const [statement, setStatement] = useState<any | null>(null);
  const [statementCustomer, setStatementCustomer] = useState('');
  const [statementLoading, setStatementLoading] = useState(false);

  const computedAmount = useMemo(() => (form.qty || 0) * (form.rate || 0), [form.qty, form.rate]);
  const selectedProject = useMemo(() => projects.find(p => p.name === form.linked_project), [form.linked_project, projects]);
  const canSubmit = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'Accounts', 'Department Head');
  const canApprove = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'Department Head');

  const loadInvoices = useCallback(async () => {
    if (activeTab !== 'invoices') return;
    setLoading(true);
    try {
      const [inv, st] = await Promise.all([
        callApi<Invoice[]>('/api/invoices'),
        callApi<Stats>('/api/invoices/stats'),
      ]);
      setInvoices(inv || []);
      setStats(st || {});
    } catch { /* swallow */ }
    setLoading(false);
  }, [activeTab]);

  const loadAging = useCallback(async () => {
    if (activeTab !== 'aging') return;
    setAgingLoading(true);
    try {
      const rows = await callOps<any[]>('get_receivable_aging');
      setAgingRows(rows || []);
    } catch { /* swallow */ }
    setAgingLoading(false);
  }, [activeTab]);

  const loadStatement = useCallback(async () => {
    if (!statement && statementCustomer) {
      setStatementLoading(true);
      try {
        const data = await callOps<any>('get_customer_statement', { customer: statementCustomer.trim() });
        setStatement(data);
      } catch { setStatement(null); }
      setStatementLoading(false);
    }
  }, [statementCustomer, statement]);

  useEffect(() => {
    if (activeTab === 'invoices') loadInvoices();
    else if (activeTab === 'aging') loadAging();
  }, [activeTab, loadInvoices, loadAging]);

  useEffect(() => {
    (async () => {
      setLookupLoading(true);
      try {
        const [p, pr] = await Promise.all([
          callApi<any[]>('/api/parties?type=CLIENT&active=1'),
          callOps<any[]>('get_project_spine_list'),
        ]);
        setCustomers(p || []);
        setProjects(pr || []);
      } catch { /* swallow */ }
      setLookupLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!form.linked_project) { setSites([]); return; }
    callApi<any[]>(`/api/sites?project=${encodeURIComponent(form.linked_project)}`).then(s => setSites(s || [])).catch(() => setSites([]));
  }, [form.linked_project]);

  const handleProjectChange = (name: string) => {
    const matched = projects.find(p => p.name === name);
    setForm(prev => ({ ...prev, linked_project: name, linked_site: '', customer: matched?.customer || prev.customer }));
  };

  const handleCreate = async () => {
    if (!form.customer||!form.linked_project||!form.invoice_date||!form.description) { setError('Customer, Project, Date, Description required.'); return; }
    if (form.qty <= 0 || form.rate < 0) { setError('Qty > 0 and Rate >= 0 required.'); return; }
    setCreating(true); setError('');
    try {
      await callApi('/api/invoices', {
        method: 'POST',
        body: {
          customer: form.customer, linked_project: form.linked_project,
          linked_site: form.linked_site || undefined, invoice_date: form.invoice_date,
          invoice_type: form.invoice_type, amount: computedAmount,
          milestone_complete: form.invoice_type === 'MILESTONE' ? (form.milestone_complete ? 1 : 0) : 0,
          audit_note: form.invoice_type === 'MILESTONE' && !form.milestone_complete ? form.audit_note : undefined,
          items: [{ description: form.description, qty: form.qty, rate: form.rate, amount: computedAmount }],
        },
      });
      setShowCreate(false); setForm(INIT); setSites([]); await loadInvoices();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setCreating(false);
  };

  const runAction = async (name: string, action: string, extra?: Record<string, string>) => {
    setBusyName(name); setError('');
    try {
      await callApi(`/api/invoices/${encodeURIComponent(name)}/actions`, {
        method: 'POST', body: { action, ...(extra || {}) },
      });
      await loadInvoices();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setBusyName(null);
  };

  const exportAgingCSV = () => {
    const hdr = 'Customer,0-30 Days,31-60 Days,61-90 Days,>90 Days,Total';
    const csv = [hdr, ...agingRows.map(r => [r.customer, r.bucket_0_30, r.bucket_31_60, r.bucket_61_90, r.bucket_90_plus, r.total].join(','))].join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = `receivable_aging_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const sumAging = (k: string) => agingRows.reduce((t, r) => t + Number(r[k] || 0), 0);

  const s = statement?.summary || {};

  const tabs = [
    { key: 'invoices' as BillingTab, label: 'Invoices', icon: Banknote },
    { key: 'receipts' as BillingTab, label: 'Receipts', icon: CreditCard },
    { key: 'follow-ups' as BillingTab, label: 'Follow Ups', icon: RefreshCcw },
    { key: 'statement' as BillingTab, label: 'Statement', icon: BookOpen },
    { key: 'aging' as BillingTab, label: 'Aging', icon: Clock },
    { key: 'retention' as BillingTab, label: 'Retention', icon: ShieldCheck },
    { key: 'penalties' as BillingTab, label: 'Penalties', icon: AlertTriangle },
  ];

  return (
    <RegisterPage
      title="Billing Cluster"
      description="Consolidated billing, receipts, follow-ups, and receivable management"
      loading={false}
      empty={false}
    >
      {/* Tab buttons */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 mb-6">
            <div className="stat-card border-l-4 border-blue-200">
              <div className="stat-value text-blue-600">{formatCurrency(stats.total_amount)}</div>
              <div className="stat-label">Total Invoiced</div>
            </div>
            <div className="stat-card border-l-4 border-amber-200">
              <div className="stat-value text-amber-600">{formatCurrency(stats.total_receivable)}</div>
              <div className="stat-label">Net Receivable</div>
            </div>
            <div className="stat-card border-l-4 border-gray-200">
              <div className="stat-value text-gray-600">{stats.draft || 0}</div>
              <div className="stat-label">Draft</div>
            </div>
            <div className="stat-card border-l-4 border-purple-200">
              <div className="stat-value text-purple-600">{stats.submitted || 0}</div>
              <div className="stat-label">Submitted</div>
            </div>
          </div>

          {/* Create button */}
          <div className="mb-6">
            <button className="btn btn-primary" onClick={() => { setForm(INIT); setShowCreate(true); }}>
              <Plus className="w-4 h-4" /> New Invoice
            </button>
          </div>

          {/* Invoices table */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900">Invoice Register</h3></div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr>
                  <th>Invoice</th><th>Customer</th><th>Project</th><th>Date</th><th>Type</th>
                  <th>Gross</th><th>Net</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {(invoices || []).map(inv => (
                    <tr key={inv.name}>
                      <td><Link href={`/finance/billing/${encodeURIComponent(inv.name)}`} className="font-medium text-blue-600 hover:underline">{inv.name}</Link></td>
                      <td>{inv.customer || '-'}</td>
                      <td>{inv.linked_project || '-'}</td>
                      <td>{formatDate(inv.invoice_date)}</td>
                      <td>{inv.invoice_type || '-'}</td>
                      <td>{formatCurrency(inv.amount)}</td>
                      <td className="font-medium">{formatCurrency(inv.net_receivable)}</td>
                      <td><span className={`badge ${badge(INVOICE_BADGES, inv.status)}`}>{inv.status}</span></td>
                      <td>
                        <div className="flex gap-1">
                          <Link href={`/finance/billing/${encodeURIComponent(inv.name)}`} className="text-blue-600 text-xs font-medium">View</Link>
                          {inv.status === 'DRAFT' && canSubmit && <button disabled={busyName===inv.name} onClick={() => runAction(inv.name,'submit')} className="text-indigo-600 text-xs font-medium">Submit</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Receipts Tab */}
      {activeTab === 'receipts' && (
        <OpsWorkspace
          title=""
          subtitle=""
          listMethod="get_payment_receipts"
          statsMethod="get_payment_receipt_stats"
          createMethod="create_payment_receipt"
          createLabel="Create Payment Receipt"
          createFields={[
            {
              name: 'receipt_type',
              label: 'Receipt Type',
              type: 'select',
              defaultValue: 'AGAINST_INVOICE',
              options: [
                { label: 'Against Invoice', value: 'AGAINST_INVOICE' },
                { label: 'Advance', value: 'ADVANCE' },
                { label: 'Adjustment', value: 'ADJUSTMENT' },
              ],
            },
            { name: 'customer', label: 'Customer', type: 'link', linkEntity: 'customer', placeholder: 'Search customers…' },
            { name: 'received_date', label: 'Receipt Date', type: 'date' },
            { name: 'amount_received', label: 'Amount Received', type: 'number', defaultValue: 0 },
            { name: 'payment_mode', label: 'Payment Mode', type: 'select', defaultValue: 'BANK_TRANSFER', options: [
              { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
              { label: 'Cheque', value: 'CHEQUE' },
              { label: 'Cash', value: 'CASH' },
            ]},
          ]}
          actions={[
            { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_payment_receipt', args: { name: row.name } }), confirmMessage: 'Delete this receipt?' },
          ]}
          statsCards={[
            { label: 'Receipts', path: 'total_receipts', icon: CreditCard, tone: 'blue' },
            { label: 'Received', path: 'total_received', icon: CreditCard, tone: 'green' },
          ]}
          columns={[
            { key: 'name', label: 'Receipt', render: (row) => row.name },
            { key: 'customer', label: 'Customer', render: (row) => row.customer || '-' },
            { key: 'receipt_type', label: 'Type', render: (row) => row.receipt_type || '-' },
            { key: 'received_date', label: 'Date', render: (row) => row.received_date || '-' },
            { key: 'amount_received', label: 'Amount', render: (row) => row.amount_received || '-' },
          ]}
          emptyMessage="No payment receipts"
        />
      )}

      {/* Follow Ups Tab */}
      {activeTab === 'follow-ups' && (
        <OpsWorkspace
          title=""
          subtitle=""
          listMethod="get_payment_follow_ups"
          statsMethod="get_payment_follow_up_stats"
          createMethod="create_payment_follow_up"
          createLabel="Add Follow Up"
          createFields={[
            { name: 'customer', label: 'Customer', type: 'link', linkEntity: 'customer' },
            { name: 'follow_up_date', label: 'Follow Up Date', type: 'date' },
            { name: 'follow_up_mode', label: 'Mode', type: 'select', options: [
              { label: 'Call', value: 'CALL' },
              { label: 'Email', value: 'EMAIL' },
              { label: 'WhatsApp', value: 'WHATSAPP' },
            ]},
            { name: 'promised_payment_date', label: 'Promised Date', type: 'date' },
            { name: 'promised_payment_amount', label: 'Promised Amount', type: 'number', defaultValue: 0 },
            { name: 'summary', label: 'Summary', type: 'textarea' },
          ]}
          actions={[
            { label: 'Close', tone: 'success', buildRequest: (row) => ({ method: 'close_payment_follow_up', args: { name: row.name } }) },
            { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_payment_follow_up', args: { name: row.name } }), confirmMessage: 'Delete?' },
          ]}
          statsCards={[]}
          columns={[
            { key: 'name', label: 'Follow Up', render: (row) => row.name },
            { key: 'customer', label: 'Customer', render: (row) => row.customer || '-' },
            { key: 'follow_up_date', label: 'Date', render: (row) => row.follow_up_date || '-' },
            { key: 'promised_payment_date', label: 'Promised', render: (row) => row.promised_payment_date || '-' },
          ]}
          emptyMessage="No follow-ups"
        />
      )}

      {/* Statement Tab */}
      {activeTab === 'statement' && (
        <div className="card">
          <div className="card-body space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Select Customer</label>
              <div className="flex gap-2">
                <LinkPicker
                  entity="customer"
                  value={statementCustomer}
                  onChange={setStatementCustomer}
                  placeholder="Search customer…"
                  className="flex-1"
                />
                <button
                  className="btn btn-primary"
                  onClick={loadStatement}
                  disabled={!statementCustomer || statementLoading}
                >
                  {statementLoading ? 'Loading...' : 'Load'}
                </button>
              </div>
            </div>

            {statement && (
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
                  <div className="stat-card"><div className="stat-value">{formatCurrency(s.invoice_value)}</div><div className="stat-label">Invoiced</div></div>
                  <div className="stat-card"><div className="stat-value text-green-600">{formatCurrency(s.receipts_total)}</div><div className="stat-label">Receipts</div></div>
                  <div className="stat-card"><div className="stat-value text-amber-600">{formatCurrency(s.closing_balance)}</div><div className="stat-label">Balance</div></div>
                </div>

                <table className="data-table">
                  <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                  <tbody>
                    {(statement.entries || []).map((e: any, i: number) => (
                      <tr key={i}>
                        <td>{e.date}</td>
                        <td>{e.type}</td>
                        <td>{e.reference}</td>
                        <td>{e.debit || '-'}</td>
                        <td>{e.credit || '-'}</td>
                        <td className="font-medium">{formatCurrency(e.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aging Tab */}
      {activeTab === 'aging' && (
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="font-semibold">Receivable Aging</h3>
            <button className="btn btn-secondary btn-sm" onClick={exportAgingCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6 p-6">
            <div className="stat-card"><div className="stat-value">{formatCurrency(sumAging('bucket_0_30'))}</div><div className="stat-label">0-30 Days</div></div>
            <div className="stat-card"><div className="stat-value">{formatCurrency(sumAging('bucket_31_60'))}</div><div className="stat-label">31-60 Days</div></div>
            <div className="stat-card"><div className="stat-value text-amber-600">{formatCurrency(sumAging('bucket_61_90'))}</div><div className="stat-label">61-90 Days</div></div>
            <div className="stat-card"><div className="stat-value text-red-600">{formatCurrency(sumAging('bucket_90_plus'))}</div><div className="stat-label">90+ Days</div></div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>0-30</th><th>31-60</th><th>61-90</th><th>90+</th><th>Total</th></tr></thead>
              <tbody>
                {agingRows.map((r, i) => (
                  <tr key={i}>
                    <td className="font-medium">{r.customer}</td>
                    <td>{formatCurrency(r.bucket_0_30)}</td>
                    <td>{formatCurrency(r.bucket_31_60)}</td>
                    <td>{formatCurrency(r.bucket_61_90)}</td>
                    <td className="text-red-600">{formatCurrency(r.bucket_90_plus)}</td>
                    <td className="font-semibold">{formatCurrency(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Retention Tab */}
      {activeTab === 'retention' && (
        <OpsWorkspace
          title=""
          subtitle=""
          listMethod="get_retention_ledgers"
          statsMethod="get_retention_stats"
          createMethod="create_retention_ledger"
          createLabel="Create Retention"
          createFields={[
            { name: 'customer', label: 'Customer', type: 'link', linkEntity: 'customer' },
            { name: 'retention_percent', label: 'Retention %', type: 'number', defaultValue: 0 },
            { name: 'retention_amount', label: 'Amount', type: 'number', defaultValue: 0 },
            { name: 'release_due_date', label: 'Release Due', type: 'date' },
          ]}
          actions={[
            { label: 'Release', tone: 'success', buildRequest: (row) => ({ method: 'release_retention', args: { name: row.name } }) },
            { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_retention_ledger', args: { name: row.name } }), confirmMessage: 'Delete?' },
          ]}
          statsCards={[
            { label: 'Entries', path: 'total', icon: ShieldCheck, tone: 'blue' },
            { label: 'Pending', path: 'pending', icon: ShieldCheck, tone: 'amber' },
          ]}
          columns={[
            { key: 'name', label: 'Entry', render: (row) => row.name },
            { key: 'customer', label: 'Customer', render: (row) => row.customer || '-' },
            { key: 'retention_amount', label: 'Amount', render: (row) => row.retention_amount || '-' },
            { key: 'status', label: 'Status', render: (row) => row.status || '-' },
          ]}
          emptyMessage="No retention entries"
        />
      )}

      {/* Penalties Tab */}
      {activeTab === 'penalties' && (
        <OpsWorkspace
          title=""
          subtitle=""
          listMethod="get_penalty_deductions"
          statsMethod="get_penalty_stats"
          createMethod="create_penalty_deduction"
          createLabel="Create Penalty"
          createFields={[
            { name: 'project', label: 'Project', placeholder: 'Project code' },
            { name: 'source', label: 'Source', placeholder: 'LD / SLA / Client' },
            { name: 'penalty_amount', label: 'Amount', type: 'number', defaultValue: 0 },
            { name: 'remarks', label: 'Remarks', type: 'textarea' },
          ]}
          actions={[
            { label: 'Approve', tone: 'success', buildRequest: (row) => ({ method: 'approve_penalty_deduction', args: { name: row.name } }) },
            { label: 'Apply', tone: 'warning', buildRequest: (row) => ({ method: 'apply_penalty_deduction', args: { name: row.name } }) },
            { label: 'Delete', tone: 'danger', buildRequest: (row) => ({ method: 'delete_penalty_deduction', args: { name: row.name } }), confirmMessage: 'Delete?' },
          ]}
          statsCards={[
            { label: 'Total', path: 'total', icon: AlertTriangle, tone: 'red' },
            { label: 'Pending', path: 'pending', icon: AlertTriangle, tone: 'amber' },
          ]}
          columns={[
            { key: 'name', label: 'Penalty', render: (row) => row.name },
            { key: 'project', label: 'Project', render: (row) => row.project || '-' },
            { key: 'penalty_amount', label: 'Amount', render: (row) => row.penalty_amount || '-' },
            { key: 'status', label: 'Status', render: (row) => row.status || '-' },
          ]}
          emptyMessage="No penalties"
        />
      )}

      {/* Create modal */}
      {showCreate && activeTab === 'invoices' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-lg font-semibold">Create Invoice</h2><button className="p-2 hover:bg-gray-100 rounded" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer *</label>
                <select className="input" value={form.customer} onChange={e => setForm(p => ({...p, customer: e.target.value}))} disabled={lookupLoading}>
                  <option value="">{lookupLoading ? 'Loading...' : 'Select'}</option>
                  {customers.map(c => <option key={c.name} value={c.name}>{c.party_name || c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project *</label>
                <select className="input" value={form.linked_project} onChange={e => handleProjectChange(e.target.value)}>
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p.name} value={p.name}>{p.project_name || p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Site</label>
                <select className="input" value={form.linked_site} onChange={e => setForm(p => ({...p, linked_site: e.target.value}))} disabled={!form.linked_project}>
                  <option value="">Select site</option>
                  {sites.map(s => <option key={s.name} value={s.name}>{s.site_name || s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Invoice Date *</label>
                <input className="input" type="date" value={form.invoice_date} onChange={e => setForm(p => ({...p, invoice_date: e.target.value}))} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea className="input min-h-20" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Qty *</label>
                <input className="input" type="number" min={1} value={form.qty} onChange={e => setForm(p => ({...p, qty: Number(e.target.value)||1}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rate *</label>
                <input className="input" type="number" min={0} value={form.rate} onChange={e => setForm(p => ({...p, rate: Number(e.target.value)||0}))} />
              </div>
            </div>
            {error && <p className="px-6 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? '...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </RegisterPage>
  );
}
