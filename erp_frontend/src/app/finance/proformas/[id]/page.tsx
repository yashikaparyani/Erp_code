'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, FileText, Calendar, User, Building2,
  Send, CheckCircle2, XCircle, RefreshCw, Clock, Hash,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { useAuth } from '@/context/AuthContext';

interface ProformaDetail {
  name: string;
  customer?: string;
  linked_estimate?: string;
  linked_project?: string;
  proforma_date?: string;
  due_date?: string;
  gst_percent?: number;
  tds_percent?: number;
  retention_percent?: number;
  gross_amount?: number;
  gst_amount?: number;
  tds_amount?: number;
  retention_amount?: number;
  net_amount?: number;
  status?: string;
  notes?: string;
  items?: { description?: string; qty?: number; unit?: string; rate?: number; amount?: number }[];
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
    : s === 'SENT' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'CONVERTED' ? 'bg-purple-50 text-purple-700 border-purple-200'
    : s === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function ProformaDetailPage() {
  const params = useParams();
  const piName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<ProformaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canSend = hasRole('Director', 'System Manager', 'Accounts', 'Presales Tendering Head');
  const canApprove = hasRole('Director', 'System Manager', 'Department Head');
  const canConvert = hasRole('Director', 'System Manager', 'Accounts');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/proformas/${encodeURIComponent(piName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load proforma'); }
    finally { setLoading(false); }
  }, [piName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch(`/api/proformas/${encodeURIComponent(piName)}/actions`, {
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading proforma...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/finance/proformas" className="text-sm text-blue-600 hover:underline">← Back to Proformas</Link></div>;
  if (!data) return null;

  const isDraft = !data.status || data.status === 'DRAFT';
  const isSent = data.status === 'SENT';
  const isApproved = data.status === 'APPROVED';
  const items = data.items || [];

  const dueInDays = data.due_date ? Math.ceil((new Date(data.due_date).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/finance/proformas" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Proformas</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.customer || 'No customer'} &middot; {formatDate(data.proforma_date)}
            {dueInDays !== null && <span className={dueInDays < 0 ? ' text-rose-600 font-medium' : dueInDays <= 7 ? ' text-amber-600 font-medium' : ''}> &middot; {dueInDays < 0 ? `Overdue by ${Math.abs(dueInDays)}d` : `Due in ${dueInDays}d`}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          {isDraft && canSend && (
            <button onClick={() => runAction('send')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Send className="h-3.5 w-3.5" /> Send</button>
          )}
          {isSent && canApprove && (
            <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
          )}
          {(isSent || isDraft) && canSend && (
            <button onClick={() => runAction('cancel')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Cancel</button>
          )}
          {isApproved && canConvert && (
            <button onClick={() => runAction('convert')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />{actionBusy === 'convert' ? 'Converting...' : 'Convert to Invoice'}</button>
          )}
        </div>
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Proforma Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Proforma', data.name],
                [<Building2 key="c" className="h-3.5 w-3.5" />, 'Customer', data.customer],
                [<FileText key="e" className="h-3.5 w-3.5" />, 'Estimate', data.linked_estimate],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<Calendar key="d" className="h-3.5 w-3.5" />, 'Date', formatDate(data.proforma_date)],
                [<Clock key="du" className="h-3.5 w-3.5" />, 'Due Date', formatDate(data.due_date)],
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
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Financial Summary</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"><div className="text-xl font-bold text-gray-900">{fmtCurrency(data.gross_amount)}</div><div className="text-xs text-gray-500 mt-0.5">Gross Amount</div></div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center"><div className="text-lg font-bold text-blue-900">+ {fmtCurrency(data.gst_amount)}</div><div className="text-xs text-blue-600 mt-0.5">GST ({data.gst_percent || 0}%)</div></div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center"><div className="text-lg font-bold text-amber-900">− {fmtCurrency(data.tds_amount)}</div><div className="text-xs text-amber-600 mt-0.5">TDS ({data.tds_percent || 0}%)</div></div>
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-center"><div className="text-lg font-bold text-orange-900">− {fmtCurrency(data.retention_amount)}</div><div className="text-xs text-orange-600 mt-0.5">Retention ({data.retention_percent || 0}%)</div></div>
              <div className="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center"><div className="text-2xl font-bold text-emerald-900">{fmtCurrency(data.net_amount)}</div><div className="text-xs text-emerald-600 mt-0.5">Net Amount</div></div>
            </div>
            {data.notes && <div className="mt-4 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{data.notes}</div>}
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Line Items</h3></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-2.5 font-medium">#</th><th className="px-4 py-2.5 font-medium">Description</th><th className="px-4 py-2.5 font-medium text-right">Qty</th><th className="px-4 py-2.5 font-medium">Unit</th><th className="px-4 py-2.5 font-medium text-right">Rate</th><th className="px-4 py-2.5 font-medium text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx}><td className="px-4 py-2.5 text-gray-400">{idx + 1}</td><td className="px-4 py-2.5 font-medium text-gray-900 max-w-[250px] truncate">{item.description || '-'}</td><td className="px-4 py-2.5 text-right">{item.qty ?? '-'}</td><td className="px-4 py-2.5 text-gray-500">{item.unit || '-'}</td><td className="px-4 py-2.5 text-right">{fmtCurrency(item.rate)}</td><td className="px-4 py-2.5 text-right font-medium">{fmtCurrency(item.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LinkedRecordsPanel links={[
        ...(data.linked_estimate ? [{ label: 'Source Estimate', doctype: 'GE Estimate', method: 'frappe.client.get_list', args: { doctype: 'GE Estimate', filters: JSON.stringify({ name: data.linked_estimate }), fields: JSON.stringify(['name', 'customer', 'net_amount', 'status']), limit_page_length: '5' }, href: (name: string) => `/finance/estimates/${name}` }] : []),
        { label: 'Related Invoices', doctype: 'GE Invoice', method: 'frappe.client.get_list', args: { doctype: 'GE Invoice', filters: JSON.stringify(data.linked_project ? { linked_project: data.linked_project } : {}), fields: JSON.stringify(['name', 'customer', 'net_receivable', 'status']), limit_page_length: '20' }, href: (name: string) => `/finance/billing/${name}` },
      ]} />

      <TraceabilityPanel projectId={data.linked_project} />

      <RecordDocumentsPanel referenceDoctype="GE Proforma Invoice" referenceName={piName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Proforma Invoice" subjectName={piName} compact={false} initialLimit={10} /></div></div>
    </div>
  );
}
