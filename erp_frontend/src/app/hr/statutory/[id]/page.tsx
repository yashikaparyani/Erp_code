'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Hash,
  Loader2,
  Receipt,
  User,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';

type StatutoryDetail = {
  name: string;
  employee?: string;
  employee_name?: string;
  ledger_type?: string;
  period_start?: string;
  period_end?: string;
  employee_contribution?: number;
  employer_contribution?: number;
  payment_status?: string;
  payment_date?: string;
  challan_reference?: string;
  remarks?: string;
  owner?: string;
  creation?: string;
  modified?: string;
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (value?: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const badgeClass = (status?: string) => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'PAID') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized === 'HOLD') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
};

export default function HrStatutoryDetailPage() {
  const params = useParams();
  const entryName = decodeURIComponent((params?.id as string) || '');
  const [data, setData] = useState<StatutoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/statutory/${encodeURIComponent(entryName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load statutory ledger');
      setData(payload.data?.data || payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load statutory ledger');
    } finally {
      setLoading(false);
    }
  }, [entryName]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading statutory ledger...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-rose-600">{error}</p>
        <Link href="/hr/statutory" className="text-sm text-blue-600 hover:underline">
          ← Back to Statutory Ledger
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/hr/statutory" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Statutory Ledger
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.employee_name || data.employee || 'Unknown'} · {data.ledger_type || 'Ledger'}</p>
        </div>
        <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${badgeClass(data.payment_status)}`}>
          {data.payment_status || 'UNKNOWN'}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Ledger Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Entry', data.name],
                [<User key="e" className="h-3.5 w-3.5" />, 'Employee', data.employee_name || data.employee],
                [<Receipt key="t" className="h-3.5 w-3.5" />, 'Type', data.ledger_type],
                [<Calendar key="ps" className="h-3.5 w-3.5" />, 'Period Start', formatDate(data.period_start)],
                [<Calendar key="pe" className="h-3.5 w-3.5" />, 'Period End', formatDate(data.period_end)],
                [<CheckCircle2 key="pd" className="h-3.5 w-3.5" />, 'Payment Date', formatDate(data.payment_date)],
                [<FileText key="cr" className="h-3.5 w-3.5" />, 'Challan Ref', data.challan_reference],
                [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
                [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="w-32 shrink-0 text-gray-500">{String(label)}</dt>
                  <dd className="truncate font-medium text-gray-900">{String(value || '-')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Contribution Summary</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                <div className="text-2xl font-bold text-blue-900">{formatCurrency(data.employee_contribution)}</div>
                <div className="mt-1 text-xs text-blue-600">Employee Contribution</div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center">
                <div className="text-2xl font-bold text-amber-900">{formatCurrency(data.employer_contribution)}</div>
                <div className="mt-1 text-xs text-amber-600">Employer Contribution</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-900">{formatCurrency(Number(data.employee_contribution || 0) + Number(data.employer_contribution || 0))}</div>
                <div className="mt-1 text-xs text-emerald-600">Total Contribution</div>
              </div>
            </div>
            {data.remarks && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium text-gray-700">Remarks</h4>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-3 text-gray-700">
                  {data.remarks}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <LinkedRecordsPanel
        links={[
          ...(data.employee ? [{
            label: 'Employee Profile',
            doctype: 'GE Employee',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Employee',
              filters: JSON.stringify({ name: data.employee }),
              fields: JSON.stringify(['name', 'employee_name', 'designation', 'department', 'status']),
              limit_page_length: '5',
            },
            href: (name: string) => `/hr/employees/${name}`,
          }] : []),
        ]}
      />

      <RecordDocumentsPanel referenceDoctype="GE Statutory Ledger" referenceName={entryName} title="Linked Documents" initialLimit={5} />

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
        <div className="card-body">
          <AccountabilityTimeline subjectDoctype="GE Statutory Ledger" subjectName={entryName} compact={false} initialLimit={10} />
        </div>
      </div>
    </div>
  );
}
