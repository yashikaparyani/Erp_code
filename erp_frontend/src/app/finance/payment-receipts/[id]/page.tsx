'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, FileText, Calendar, User, Building2,
  CreditCard, IndianRupee, Hash, Receipt,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';

interface PaymentReceiptDetail {
  name: string;
  receipt_type?: string;
  customer?: string;
  linked_invoice?: string;
  linked_project?: string;
  amount_received?: number;
  adjusted_amount?: number;
  tds_amount?: number;
  payment_mode?: string;
  payment_reference?: string;
  payment_date?: string;
  bank_name?: string;
  cheque_number?: string;
  notes?: string;
  status?: string;
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
  const s = (status || 'RECEIVED').toUpperCase();
  const style = s === 'RECEIVED' || s === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'ADJUSTED' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

function TypeBadge({ type }: { type?: string }) {
  const t = (type || '').toUpperCase();
  const style = t === 'AGAINST_INVOICE' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : t === 'ADVANCE' ? 'bg-purple-50 text-purple-700 border-purple-200'
    : t === 'ADJUSTMENT' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${style}`}>{t.replace(/_/g, ' ') || 'N/A'}</span>;
}

export default function PaymentReceiptDetailPage() {
  const params = useParams();
  const prName = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<PaymentReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/payment-receipts/${encodeURIComponent(prName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load payment receipt'); }
    finally { setLoading(false); }
  }, [prName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading payment receipt...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/finance/payment-receipts" className="text-sm text-blue-600 hover:underline">← Back to Payment Receipts</Link></div>;
  if (!data) return null;

  const unadjusted = (data.amount_received || 0) - (data.adjusted_amount || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/finance/payment-receipts" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Payment Receipts</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.customer || 'No customer'} &middot; {formatDate(data.payment_date || data.creation)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={data.receipt_type} />
          <StatusBadge status={data.status} />
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Receipt Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Receipt', data.name],
                [<Receipt key="rt" className="h-3.5 w-3.5" />, 'Type', data.receipt_type?.replace(/_/g, ' ')],
                [<Building2 key="c" className="h-3.5 w-3.5" />, 'Customer', data.customer],
                [<FileText key="i" className="h-3.5 w-3.5" />, 'Invoice', data.linked_invoice],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<Calendar key="d" className="h-3.5 w-3.5" />, 'Payment Date', formatDate(data.payment_date)],
                [<CreditCard key="pm" className="h-3.5 w-3.5" />, 'Payment Mode', data.payment_mode],
                [<FileText key="ref" className="h-3.5 w-3.5" />, 'Reference', data.payment_reference],
                [<Building2 key="b" className="h-3.5 w-3.5" />, 'Bank', data.bank_name],
                [<Hash key="ch" className="h-3.5 w-3.5" />, 'Cheque No.', data.cheque_number],
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
          <div className="card-header"><h3 className="font-semibold text-gray-900">Amount Summary</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center"><div className="text-2xl font-bold text-emerald-900">{fmtCurrency(data.amount_received)}</div><div className="text-xs text-emerald-600 mt-1">Amount Received</div></div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center"><div className="text-xl font-bold text-blue-900">{fmtCurrency(data.adjusted_amount)}</div><div className="text-xs text-blue-600 mt-1">Adjusted</div></div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center"><div className="text-xl font-bold text-amber-900">{fmtCurrency(data.tds_amount)}</div><div className="text-xs text-amber-600 mt-1">TDS Deducted</div></div>
              <div className={`rounded-xl border p-4 text-center ${unadjusted > 0 ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}><div className={`text-xl font-bold ${unadjusted > 0 ? 'text-orange-900' : 'text-gray-900'}`}>{fmtCurrency(unadjusted)}</div><div className={`text-xs mt-1 ${unadjusted > 0 ? 'text-orange-600' : 'text-gray-500'}`}>Unadjusted</div></div>
            </div>
            {data.notes && <div className="mt-4 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{data.notes}</div>}
          </div>
        </div>
      </div>

      <LinkedRecordsPanel links={[
        ...(data.linked_invoice ? [{ label: 'Linked Invoice', doctype: 'GE Invoice', method: 'frappe.client.get_list', args: { doctype: 'GE Invoice', filters: JSON.stringify({ name: data.linked_invoice }), fields: JSON.stringify(['name', 'customer', 'invoice_type', 'net_receivable', 'status']), limit_page_length: '5' }, href: (name: string) => `/finance/billing/${name}` }] : []),
      ]} />

      <RecordDocumentsPanel referenceDoctype="GE Payment Receipt" referenceName={prName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Payment Receipt" subjectName={prName} compact={false} initialLimit={10} /></div></div>
    </div>
  );
}
