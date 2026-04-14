'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Banknote, BookOpen, Clock, CreditCard, Download, Eye, Plus, RefreshCcw, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import LinkPicker from '@/components/ui/LinkPicker';
import {
  callApi, callOps, formatCurrency, formatDate, badge,
  INVOICE_BADGES, statusVariant, hasAnyRole,
} from '@/components/finance/fin-helpers';
import { useAuth } from '@/context/AuthContext';

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

function ClusterLaunchCard({
  title,
  description,
  href,
  bullets,
}: {
  title: string;
  description: string;
  href: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-orange)]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <Link href={href} className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-strong)]">
          Open Workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

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

      {activeTab === 'receipts' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ClusterLaunchCard
            title="Payment Receipts Workspace"
            description="Use the standalone receipts register for create, update, and delete flows."
            href="/finance/payment-receipts"
            bullets={[
              'Receipt type, customer, and payment mode are already managed there.',
              'The dedicated page is the canonical route for receipt CRUD.',
              'This cluster avoids duplicating receipt logic through generic ops.',
            ]}
          />
          <ClusterLaunchCard
            title="Cluster Role"
            description="Billing Cluster now acts as a finance hub while operational work happens in the stronger standalone receipts page."
            href="/finance/payment-receipts"
            bullets={[
              'One source of truth for payment receipt behavior.',
              'Less UI drift between cluster and finance registers.',
              'Cleaner maintenance as receipt rules evolve.',
            ]}
          />
        </div>
      )}

      {activeTab === 'follow-ups' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ClusterLaunchCard
            title="Payment Follow-Up Workspace"
            description="Open the dedicated follow-up register for create, close, and delete actions."
            href="/finance/follow-ups"
            bullets={[
              'The standalone follow-up page already uses dedicated finance routes.',
              'Customer and promised-payment fields are stronger there.',
              'This keeps follow-up workflow out of the old embedded ops surface.',
            ]}
          />
          <ClusterLaunchCard
            title="Why This Tab Launches Out"
            description="The dedicated follow-up page is now the operational workspace, while Billing Cluster stays focused on navigation and visibility."
            href="/finance/follow-ups"
            bullets={[
              'No duplicate follow-up form to maintain.',
              'No split behavior between cluster and finance register.',
              'Simpler operator path into the real payment-chasing workflow.',
            ]}
          />
        </div>
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

      {activeTab === 'retention' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ClusterLaunchCard
            title="Retention Workspace"
            description="Use the standalone retention ledger for create, update, release, and delete flows."
            href="/finance/retention"
            bullets={[
              'Release actions and detail views already live there.',
              'Retention routing is stronger on the dedicated page.',
              'This avoids maintaining a second retention register in the cluster.',
            ]}
          />
          <ClusterLaunchCard
            title="Recommended Finance Flow"
            description="Keep Billing Cluster for navigation, and move into the dedicated retention page for operational changes."
            href="/finance/retention"
            bullets={[
              'One source of truth for release logic.',
              'Fewer duplicated retention forms.',
              'Cleaner handoff between finance visibility and finance action pages.',
            ]}
          />
        </div>
      )}

      {activeTab === 'penalties' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ClusterLaunchCard
            title="Penalty Workspace"
            description="Use the dedicated penalties page for create, approve, apply, and delete flows."
            href="/finance/penalties"
            bullets={[
              'Penalty actions are already implemented on the standalone page.',
              'That page now uses dedicated penalty routes instead of embedded ops.',
              'Billing Cluster no longer needs its own penalty register.',
            ]}
          />
          <ClusterLaunchCard
            title="Why It Launches Out"
            description="Penalties are now handled in one canonical workspace so approval and application logic do not drift."
            href="/finance/penalties"
            bullets={[
              'Single finance path for penalty lifecycle.',
              'No duplicate generic ops forms inside the cluster.',
              'Cleaner ownership between hub page and register page.',
            ]}
          />
        </div>
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
