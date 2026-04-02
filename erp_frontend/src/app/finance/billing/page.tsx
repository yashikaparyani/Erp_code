'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Plus, X } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import {
  callApi, callOps, formatCurrency, formatDate, badge,
  INVOICE_BADGES, statusVariant, hasAnyRole,
} from '@/components/finance/fin-helpers';
import { useAuth } from '@/context/AuthContext';

interface Invoice {
  name: string; customer?: string; linked_project?: string; linked_site?: string;
  invoice_date?: string; invoice_type?: string; status?: string; amount?: number;
  gst_amount?: number; tds_amount?: number; net_receivable?: number;
  milestone_complete?: number; approved_by?: string;
}
interface Stats { total?: number; draft?: number; submitted?: number; approved?: number;
  payment_received?: number; total_amount?: number; total_receivable?: number; }
interface ReceiptStats { total_received?: number; total_tds?: number; }
interface PartyOption { name: string; party_name?: string; }
interface ProjectOption { name: string; project_name?: string; customer?: string; }
interface SiteOption { name: string; site_name?: string; }

const INIT = {
  customer: '', linked_project: '', linked_site: '', invoice_date: '',
  invoice_type: 'MILESTONE', description: '', qty: 1, rate: 0,
  milestone_complete: true, audit_note: '',
};

export default function FinanceBillingPage() {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [receiptStats, setReceiptStats] = useState<ReceiptStats>({});
  const [customers, setCustomers] = useState<PartyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [busyName, setBusyName] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<{ name: string; action: 'reject' | 'cancel' } | null>(null);
  const [form, setForm] = useState(INIT);

  const computedAmount = useMemo(() => (form.qty || 0) * (form.rate || 0), [form.qty, form.rate]);
  const selectedProject = useMemo(() => projects.find(p => p.name === form.linked_project), [form.linked_project, projects]);

  const canSubmit = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'Accounts', 'Department Head');
  const canApprove = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'Department Head');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, st, rec] = await Promise.all([
        callApi<Invoice[]>('/api/invoices'),
        callApi<Stats>('/api/invoices/stats'),
        callOps<ReceiptStats>('get_payment_receipt_stats'),
      ]);
      setInvoices(inv || []);
      setStats(st || {});
      setReceiptStats(rec || {});
    } catch { /* swallow */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      setLookupLoading(true);
      try {
        const [p, pr] = await Promise.all([
          callApi<PartyOption[]>('/api/parties?type=CLIENT&active=1'),
          callOps<ProjectOption[]>('get_project_spine_list'),
        ]);
        setCustomers(p || []);
        setProjects(pr || []);
      } catch { /* swallow */ }
      setLookupLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!form.linked_project) { setSites([]); return; }
    callApi<SiteOption[]>(`/api/sites?project=${encodeURIComponent(form.linked_project)}`).then(s => setSites(s || [])).catch(() => setSites([]));
  }, [form.linked_project]);

  const handleProjectChange = (name: string) => {
    const matched = projects.find(p => p.name === name);
    setForm(prev => ({ ...prev, linked_project: name, linked_site: '', customer: matched?.customer || prev.customer }));
  };

  const handleCreate = async () => {
    if (!form.customer||!form.linked_project||!form.invoice_date||!form.description) { setError('Customer, Project, Date, Description required.'); return; }
    if (form.qty <= 0 || form.rate < 0) { setError('Qty > 0 and Rate >= 0 required.'); return; }
    if (form.invoice_type === 'MILESTONE' && !form.milestone_complete && !form.audit_note.trim()) { setError('Audit Note required when milestone incomplete.'); return; }
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
      setShowCreate(false); setForm(INIT); setSites([]); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setCreating(false);
  };

  const runAction = async (name: string, action: string, extra?: Record<string, string>) => {
    setBusyName(name); setError('');
    try {
      await callApi(`/api/invoices/${encodeURIComponent(name)}/actions`, {
        method: 'POST', body: { action, ...(extra || {}) },
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setBusyName(null);
  };

  const collectionGap = (stats.total_receivable || 0) - (receiptStats.total_received || 0);

  return (
    <RegisterPage
      title="Finance Billing"
      description="Invoice register, submission flow, and receivable tracking"
      loading={loading} error={error} onRetry={load} empty={!invoices.length && !loading}
      stats={[
        { label: 'Total Invoiced', value: formatCurrency(stats.total_amount), variant: 'info' },
        { label: 'Net Receivable', value: formatCurrency(stats.total_receivable), variant: 'warning' },
        { label: 'Collected', value: formatCurrency(receiptStats.total_received), variant: 'success' },
        { label: 'Collection Gap', value: formatCurrency(collectionGap), variant: collectionGap > 0 ? 'warning' : 'success' },
      ]}
      headerActions={<button className="btn btn-primary" onClick={() => { setForm(INIT); setShowCreate(true); }}><Plus className="w-4 h-4" /> New Invoice</button>}
    >
      {/* ── Billing pipeline ── */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Billing Pipeline</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr>
              <th>Invoice</th><th>Customer</th><th>Project / Site</th><th>Date</th><th>Type</th>
              <th>Gross</th><th>Net Receivable</th><th>Status</th><th>Why</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {invoices.map(inv => {
                const why = inv.status === 'PAYMENT_RECEIVED' ? 'Collected'
                  : inv.status === 'APPROVED' ? 'Approved — awaiting collection'
                  : inv.status === 'SUBMITTED' ? 'Waiting release'
                  : 'Draft commercial record';
                return (
                  <tr key={inv.name}>
                    <td><Link href={`/finance/billing/${encodeURIComponent(inv.name)}`} className="font-medium text-blue-600 hover:underline">{inv.name}</Link>
                      <div className="text-xs text-gray-500">{inv.approved_by || 'Not approved'}</div></td>
                    <td className="text-sm text-gray-900">{inv.customer || '-'}</td>
                    <td>{inv.linked_project ? <Link href={`/projects/${encodeURIComponent(inv.linked_project)}`} className="text-sm text-blue-600 hover:underline">{inv.linked_project}</Link> : '-'}
                      {inv.linked_site && <div className="text-xs text-gray-400">{inv.linked_site}</div>}</td>
                    <td className="text-gray-600">{formatDate(inv.invoice_date)}</td>
                    <td>{inv.invoice_type || '-'}</td>
                    <td>{formatCurrency(inv.amount)}</td>
                    <td className="font-medium text-gray-900">{formatCurrency(inv.net_receivable)}</td>
                    <td><span className={`badge ${badge(INVOICE_BADGES, inv.status)}`}>{inv.status || 'Unknown'}</span></td>
                    <td className="text-sm text-gray-700">{why}</td>
                    <td>
                      <div className="flex flex-wrap gap-1 items-center">
                        <Link href={`/finance/billing/${encodeURIComponent(inv.name)}`} className="text-blue-600 text-sm font-medium flex items-center gap-1"><Eye className="w-3.5 h-3.5" />View</Link>
                        {inv.status === 'DRAFT' && canSubmit && <button disabled={busyName===inv.name} onClick={() => runAction(inv.name,'submit')} className="text-indigo-600 text-sm font-medium">Submit</button>}
                        {inv.status === 'SUBMITTED' && canApprove && <>
                          <button disabled={busyName===inv.name} onClick={() => runAction(inv.name,'approve')} className="text-green-600 text-sm font-medium">Approve</button>
                          <button disabled={busyName===inv.name} onClick={() => setReasonTarget({ name: inv.name, action: 'reject' })} className="text-red-600 text-sm font-medium">Reject</button>
                        </>}
                        {inv.status === 'APPROVED' && canSubmit && <button disabled={busyName===inv.name} onClick={() => runAction(inv.name,'mark_paid')} className="text-orange-600 text-sm font-medium">Mark Paid</button>}
                        {!['CANCELLED','PAYMENT_RECEIVED'].includes(inv.status||'') && canApprove && <button disabled={busyName===inv.name} onClick={() => setReasonTarget({ name: inv.name, action: 'cancel' })} className="text-rose-600 text-sm font-medium">Cancel</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-lg font-semibold">Create Invoice</h2><button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select className="input" value={form.customer} onChange={e => setForm(p => ({...p, customer: e.target.value}))} disabled={lookupLoading}>
                  <option value="">{lookupLoading ? 'Loading...' : 'Select customer'}</option>
                  {customers.map(c => <option key={c.name} value={c.name}>{c.party_name || c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Project *</label>
                <select className="input" value={form.linked_project} onChange={e => handleProjectChange(e.target.value)} disabled={lookupLoading}>
                  <option value="">{lookupLoading ? 'Loading...' : 'Select project'}</option>
                  {projects.map(p => <option key={p.name} value={p.name}>{p.name}{p.project_name ? ` | ${p.project_name}` : ''}</option>)}
                </select>
                {selectedProject?.customer && <div className="mt-1 text-xs text-gray-500">Project customer: {selectedProject.customer}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Site</label>
                <select className="input" value={form.linked_site} onChange={e => setForm(p => ({...p, linked_site: e.target.value}))} disabled={!form.linked_project}>
                  <option value="">{form.linked_project ? 'Select site' : 'Select project first'}</option>
                  {sites.map(s => <option key={s.name} value={s.name}>{s.site_name ? `${s.name} | ${s.site_name}` : s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                <input className="input" type="date" value={form.invoice_date} onChange={e => setForm(p => ({...p, invoice_date: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="input" value={form.invoice_type} onChange={e => setForm(p => ({...p, invoice_type: e.target.value}))}>
                  <option value="MILESTONE">Milestone</option><option value="RA">RA</option><option value="O_AND_M">O&amp;M</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input className="input bg-gray-50" type="number" value={computedAmount} readOnly />
                <div className="mt-1 text-xs text-gray-500">Qty × Rate</div>
              </div>
              {form.invoice_type === 'MILESTONE' && (
                <div className="flex items-center gap-2 pt-7">
                  <input id="mc" type="checkbox" checked={form.milestone_complete} onChange={e => setForm(p => ({...p, milestone_complete: e.target.checked}))} />
                  <label htmlFor="mc" className="text-sm text-gray-700">Milestone Complete</label>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Line Description *</label>
                <textarea className="input min-h-24" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label><input className="input" type="number" min={1} value={form.qty} onChange={e => setForm(p => ({...p, qty: Number(e.target.value)||1}))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Rate *</label><input className="input" type="number" min={0} step={0.01} value={form.rate} onChange={e => setForm(p => ({...p, rate: Number(e.target.value)||0}))} /></div>
              {form.invoice_type === 'MILESTONE' && !form.milestone_complete && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Audit Note *</label>
                  <textarea className="input min-h-24" value={form.audit_note} onChange={e => setForm(p => ({...p, audit_note: e.target.value}))} />
                  <div className="mt-1 text-xs text-gray-500">Required when milestone incomplete.</div>
                </div>
              )}
            </div>
            {error && <p className="px-6 pb-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Invoice'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject/cancel reason modal ── */}
      <ActionModal
        open={!!reasonTarget}
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
    </RegisterPage>
  );
}
