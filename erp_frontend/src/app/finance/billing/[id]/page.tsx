'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, FileText, Calendar, User, Building2,
  Send, CheckCircle2, XCircle, IndianRupee, Hash, CreditCard, Ban,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';

interface InvoiceDetail {
  name: string;
  customer?: string;
  linked_project?: string;
  linked_site?: string;
  invoice_type?: string;
  invoice_date?: string;
  gross_amount?: number;
  gst_amount?: number;
  tds_amount?: number;
  retention_amount?: number;
  net_receivable?: number;
  amount_received?: number;
  status?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  items?: { description?: string; qty?: number; rate?: number; amount?: number }[];
  creation?: string;
  modified?: string;
  owner?: string;
}

function fmtCurrency(val?: number): string {
  if (!val) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'DRAFT').toUpperCase();
  const style = s === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'SUBMITTED' || s === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'PAYMENT_RECEIVED' || s === 'PAID' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'CANCELLED' ? 'bg-gray-50 text-gray-500 border-gray-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s.replace(/_/g, ' ')}</span>;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canSubmit = hasRole('Director', 'System Manager', 'Accounts', 'Department Head');
  const canApproveReject = hasRole('Director', 'System Manager', 'Department Head');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load invoice'); }
    finally { setLoading(false); }
  }, [invoiceName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceName)}/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action}`);
      showSuccess(result.message || `${action} completed`);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : `Failed to ${action}`); }
    finally { setActionBusy(''); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading invoice...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/finance/billing" className="text-sm text-blue-600 hover:underline">← Back to Billing</Link></div>;
  if (!data) return null;

  const items = data.items || [];
  const isDraft = !data.status || data.status === 'DRAFT';
  const isSubmitted = data.status === 'SUBMITTED' || data.status === 'PENDING_APPROVAL';
  const isApproved = data.status === 'APPROVED';
  const isRejected = data.status === 'REJECTED';
  const balance = (data.net_receivable || 0) - (data.amount_received || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/finance/billing" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Billing</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.customer || 'No customer'} &middot; {data.invoice_type || 'Invoice'} &middot; {formatDate(data.invoice_date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          {isDraft && canSubmit && (
            <button onClick={() => runAction('submit')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting...' : 'Submit'}</button>
          )}
          {isSubmitted && canApproveReject && (<>
            <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
            <button onClick={() => setRejectModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Reject</button>
          </>)}
          {isApproved && canSubmit && (
            <button onClick={() => runAction('mark_paid')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><CreditCard className="h-3.5 w-3.5" />{actionBusy === 'mark_paid' ? 'Updating...' : 'Mark Paid'}</button>
          )}
          {!(['PAYMENT_RECEIVED', 'PAID', 'CANCELLED'].includes(data.status || '')) && canApproveReject && (
            <button onClick={() => runAction('cancel')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"><Ban className="h-3.5 w-3.5" /> Cancel</button>
          )}
        </div>
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}
      {isRejected && data.rejection_reason && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><strong>Rejection Reason:</strong> {data.rejection_reason}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Invoice Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Invoice', data.name],
                [<User key="c" className="h-3.5 w-3.5" />, 'Customer', data.customer],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<Building2 key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
                [<FileText key="t" className="h-3.5 w-3.5" />, 'Type', data.invoice_type],
                [<Calendar key="d" className="h-3.5 w-3.5" />, 'Invoice Date', formatDate(data.invoice_date)],
                [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
                [<Calendar key="cr" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                  <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
                </div>
              ))}
            </dl>
            {data.approved_by && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-gray-600">Approved by <strong>{data.approved_by}</strong></span></div>
                {data.approved_at && <p className="mt-1 text-xs text-gray-400">on {formatDate(data.approved_at)}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Financial Summary</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                ['Gross Amount', fmtCurrency(data.gross_amount), 'gray'],
                ['GST', fmtCurrency(data.gst_amount), 'blue'],
                ['TDS', fmtCurrency(data.tds_amount), 'amber'],
                ['Retention', fmtCurrency(data.retention_amount), 'purple'],
                ['Net Receivable', fmtCurrency(data.net_receivable), 'emerald'],
                ['Balance Due', fmtCurrency(balance), balance > 0 ? 'rose' : 'emerald'],
              ].map(([label, value, color]) => (
                <div key={String(label)} className={`rounded-xl border border-${color}-100 bg-${color}-50 p-3 text-center`}>
                  <div className={`text-xl font-bold text-${color}-900`}>{String(value)}</div>
                  <div className={`text-xs text-${color}-600 mt-0.5`}>{String(label)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Line Items</h3><p className="text-xs text-gray-500 mt-0.5">{items.length} items</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-2.5 font-medium">#</th><th className="px-4 py-2.5 font-medium">Description</th><th className="px-4 py-2.5 font-medium text-right">Qty</th><th className="px-4 py-2.5 font-medium text-right">Rate</th><th className="px-4 py-2.5 font-medium text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx}><td className="px-4 py-2.5 text-gray-400">{idx + 1}</td><td className="px-4 py-2.5 font-medium text-gray-900 max-w-[300px] truncate">{item.description || '-'}</td><td className="px-4 py-2.5 text-right">{item.qty ?? '-'}</td><td className="px-4 py-2.5 text-right">{fmtCurrency(item.rate)}</td><td className="px-4 py-2.5 text-right font-medium">{fmtCurrency(item.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.linked_project && <Link href={`/finance/projects/${encodeURIComponent(data.linked_project)}`} className="card card-body flex items-center gap-3 hover:bg-blue-50 transition"><Building2 className="h-5 w-5 text-blue-500" /><div><div className="text-xs text-gray-500">Project</div><div className="text-sm font-medium text-gray-900">{data.linked_project}</div></div></Link>}
        {data.customer && <Link href={`/finance/customer-statement?customer=${encodeURIComponent(data.customer)}`} className="card card-body flex items-center gap-3 hover:bg-amber-50 transition"><IndianRupee className="h-5 w-5 text-amber-500" /><div><div className="text-xs text-gray-500">Customer Statement</div><div className="text-sm font-medium text-gray-900">{data.customer}</div></div></Link>}
      </div>

      <LinkedRecordsPanel links={[
        { label: 'Payment Receipts', doctype: 'GE Payment Receipt', method: 'frappe.client.get_list', args: { doctype: 'GE Payment Receipt', filters: JSON.stringify({ linked_invoice: data.name }), fields: JSON.stringify(['name', 'receipt_type', 'amount_received', 'received_date', 'payment_mode']), limit_page_length: '20' }, href: (name) => `/finance/payment-receipts/${name}` },
        { label: 'Penalty Deductions', doctype: 'GE Penalty Deduction', method: 'frappe.client.get_list', args: { doctype: 'GE Penalty Deduction', filters: JSON.stringify(data.linked_project ? { project: data.linked_project } : {}), fields: JSON.stringify(['name', 'source', 'penalty_amount', 'status']), limit_page_length: '20' }, href: (name) => `/finance/penalties/${name}` },
      ]} />

      <RecordDocumentsPanel referenceDoctype="GE Invoice" referenceName={invoiceName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Invoice" subjectName={invoiceName} compact={false} initialLimit={10} /></div></div>

      <ActionModal open={rejectModal} title="Reject Invoice" description={`Reject invoice ${data.name}. Please provide a reason.`} variant="danger" confirmLabel="Reject" busy={actionBusy === 'reject'} fields={[{ name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Why is this invoice being rejected?' }]} onConfirm={async (values) => { await runAction('reject', { reason: values.reason || '' }); setRejectModal(false); }} onCancel={() => setRejectModal(false)} />
    </div>
  );
}
