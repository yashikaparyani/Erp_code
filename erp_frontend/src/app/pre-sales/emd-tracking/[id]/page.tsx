'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, Building2, Hash,
  DollarSign, Clock, Banknote, FileText, User,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';

interface EmdInstrument {
  name: string;
  instrument_type?: string;
  linked_tender?: string;
  linked_project?: string;
  linked_agreement_no?: string;
  beneficiary_name?: string;
  release_condition?: string;
  instrument_number?: string;
  amount?: number;
  status?: string;
  bank_name?: string;
  issue_date?: string;
  expiry_date?: string;
  remarks?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(v?: number) {
  if (v == null) return '-';
  if (v >= 1e7) return `₹ ${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹ ${(v / 1e5).toFixed(2)} L`;
  return `₹ ${v.toLocaleString('en-IN')}`;
}

function StatusBadge({ status }: { status?: string }) {
  const s = status || 'Pending';
  const style = s === 'Released' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'Forfeited' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'Expired' ? 'bg-gray-100 text-gray-600 border-gray-200'
    : s === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function EmdInstrumentDetailPage() {
  const params = useParams();
  const instrName = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<EmdInstrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/emd-pbg/${encodeURIComponent(instrName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load instrument'); }
    finally { setLoading(false); }
  }, [instrName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading instrument...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/pre-sales/emd-tracking" className="text-sm text-blue-600 hover:underline">← Back to EMD Tracking</Link></div>;
  if (!data) return null;

  const isExpiringSoon = data.expiry_date && (new Date(data.expiry_date).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/pre-sales/emd-tracking" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to EMD Tracking</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.instrument_type || 'Instrument'} · {data.bank_name || 'No bank'}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {isExpiringSoon && data.status !== 'Released' && data.status !== 'Forfeited' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          Instrument expires on {formatDate(data.expiry_date)} — less than 30 days remaining.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Amount</div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(data.amount)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Issue Date</div>
          <p className="text-xl font-bold text-gray-900">{formatDate(data.issue_date)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Expiry Date</div>
          <p className={`text-xl font-bold ${isExpiringSoon ? 'text-amber-600' : 'text-gray-900'}`}>{formatDate(data.expiry_date)}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Instrument Details</h3></div>
        <div className="card-body">
          <dl className="space-y-3 text-sm">
            {[
              [<Hash key="n" className="h-3.5 w-3.5" />, 'Instrument ID', data.name],
              [<Banknote key="t" className="h-3.5 w-3.5" />, 'Type', data.instrument_type],
              [<FileText key="no" className="h-3.5 w-3.5" />, 'Instrument No.', data.instrument_number],
              [<Building2 key="b" className="h-3.5 w-3.5" />, 'Bank Name', data.bank_name],
              [<DollarSign key="a" className="h-3.5 w-3.5" />, 'Amount', formatCurrency(data.amount)],
              [<Hash key="lt" className="h-3.5 w-3.5" />, 'Linked Tender', data.linked_tender],
              [<Building2 key="lp" className="h-3.5 w-3.5" />, 'Linked Project', data.linked_project],
              [<FileText key="ag" className="h-3.5 w-3.5" />, 'Agreement No.', data.linked_agreement_no],
              [<User key="bn" className="h-3.5 w-3.5" />, 'Beneficiary', data.beneficiary_name],
              [<Calendar key="id" className="h-3.5 w-3.5" />, 'Issue Date', formatDate(data.issue_date)],
              [<Calendar key="ed" className="h-3.5 w-3.5" />, 'Expiry Date', formatDate(data.expiry_date)],
              [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
              [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
            ].map(([icon, label, value]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <span className="text-gray-400">{icon}</span>
                <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                <dd className="font-medium text-gray-900 truncate">
                  {String(label) === 'Linked Tender' && data.linked_tender
                    ? <Link href={`/pre-sales/${encodeURIComponent(data.linked_tender)}`} className="text-blue-600 hover:underline">{data.linked_tender}</Link>
                    : String(value || '-')}
                </dd>
              </div>
            ))}
          </dl>
          {data.remarks && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Remarks</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.remarks}</p>
            </div>
          )}
          {data.release_condition && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-600 mb-1">Release Condition</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.release_condition}</p>
            </div>
          )}
        </div>
      </div>

      <RecordDocumentsPanel referenceDoctype="GE EMD PBG Instrument" referenceName={instrName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE EMD PBG Instrument" subjectName={instrName} compact={false} initialLimit={10} /></div></div>
    </div>
  );
}
