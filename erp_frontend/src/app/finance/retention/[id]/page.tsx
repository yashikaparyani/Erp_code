'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, DollarSign, Percent,
  Unlock, FileText, Building2,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';

interface RetentionDetail {
  name: string;
  linked_project?: string;
  linked_invoice?: string;
  retention_percent?: number;
  retention_amount?: number;
  release_due_date?: string;
  released_on?: string;
  release_amount?: number;
  status?: string;
  customer?: string;
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
  return '₹ ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'RETAINED').toUpperCase().replace(/_/g, ' ');
  const style =
    s === 'RELEASED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'PARTIALLY RELEASED' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function RetentionDetailPage() {
  const params = useParams();
  const retName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<RetentionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [releaseModal, setReleaseModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some(r => set.has(r));
  };
  const canRelease = hasRole('Accounts', 'Director', 'System Manager');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/retention/${encodeURIComponent(retName)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [retName]);

  useEffect(() => { reload(); }, [reload]);

  const runRelease = async (release_amount: string) => {
    setActionBusy('release');
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch(`/api/retention/${encodeURIComponent(retName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release', release_amount: parseFloat(release_amount) }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Release failed');
      setSuccessMsg(payload.message || 'Released');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Release failed');
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <p className="text-gray-600">{error || 'Retention record not found'}</p>
      <Link href="/finance/retention" className="text-sm text-blue-600 hover:underline">← Back to Retention</Link>
    </div>
  );

  const d = data;
  const st = (d.status || 'RETAINED').toUpperCase();
  const remainingAmount = (d.retention_amount || 0) - (d.release_amount || 0);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/finance/retention" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />Back to Retention
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{retName}</h1>
          <p className="text-sm text-gray-500 mt-1">Retention Ledger — {d.linked_project || 'Project'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={st} />

          {st !== 'RELEASED' && canRelease && (
            <button onClick={() => setReleaseModal(true)} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              <Unlock className="h-3.5 w-3.5" />{actionBusy === 'release' ? 'Releasing...' : 'Release Retention'}
            </button>
          )}
        </div>
      </div>

      {/* messages */}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><DollarSign className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatCurrency(d.retention_amount)}</div><div className="stat-label">Retained Amount</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600"><DollarSign className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatCurrency(d.release_amount)}</div><div className="stat-label">Released</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><DollarSign className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatCurrency(remainingAmount)}</div><div className="stat-label">Remaining</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Percent className="w-5 h-5" /></div><div><div className="stat-value">{d.retention_percent ?? '-'}%</div><div className="stat-label">Retention %</div></div></div></div>
      </div>

      {/* detail card */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Retention Details</h3></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {d.linked_project && (
            <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Linked Project</div><Link href={`/projects/${encodeURIComponent(d.linked_project)}`} className="font-medium text-blue-700 hover:underline">{d.linked_project}</Link></div></div>
          )}
          {d.linked_invoice && (
            <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Linked Invoice</div><Link href={`/finance/billing/${encodeURIComponent(d.linked_invoice)}`} className="font-medium text-blue-700 hover:underline">{d.linked_invoice}</Link></div></div>
          )}
          {d.release_due_date && (
            <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Release Due Date</div><div className="font-medium text-gray-900">{formatDate(d.release_due_date)}</div></div></div>
          )}
          {d.released_on && (
            <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-emerald-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Released On</div><div className="font-medium text-gray-900">{formatDate(d.released_on)}</div></div></div>
          )}
          {d.customer && (
            <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Customer</div><div className="font-medium text-gray-900">{d.customer}</div></div></div>
          )}
          {d.remarks && (
            <div className="sm:col-span-2 flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Remarks</div><div className="font-medium text-gray-900 whitespace-pre-wrap">{d.remarks}</div></div></div>
          )}
        </div>
      </div>

      {/* release progress bar */}
      {(d.retention_amount || 0) > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Release Progress</h3></div>
          <div className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Released: {formatCurrency(d.release_amount)}</span>
              <span>Total: {formatCurrency(d.retention_amount)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${Math.min(100, ((d.release_amount || 0) / (d.retention_amount || 1)) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* linked records */}
      <LinkedRecordsPanel
        links={[
          ...(d.linked_project ? [{
            label: 'Project',
            doctype: 'GE Project',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Project',
              filters: JSON.stringify({ name: d.linked_project }),
              fields: JSON.stringify(['name', 'project_name', 'status']),
              limit_page_length: '5',
            },
            href: (name: string) => `/projects/${name}`,
          }] : []),
          ...(d.linked_invoice ? [{
            label: 'Invoice',
            doctype: 'GE Invoice',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Invoice',
              filters: JSON.stringify({ name: d.linked_invoice }),
              fields: JSON.stringify(['name', 'customer', 'net_receivable', 'status']),
              limit_page_length: '5',
            },
            href: (name: string) => `/finance/billing/${name}`,
          }] : []),
        ]}
      />

      <RecordDocumentsPanel referenceDoctype="GE Retention Ledger" referenceName={retName} title="Retention Documents" />
      <section>
        <details open>
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-3">Accountability Trail</summary>
          <AccountabilityTimeline subjectDoctype="GE Retention Ledger" subjectName={retName} />
        </details>
      </section>

      {/* release modal */}
      <ActionModal
        open={releaseModal}
        title="Release Retention"
        description={`Enter the amount to release. Maximum remaining: ${formatCurrency(remainingAmount)}`}
        busy={actionBusy === 'release'}
        fields={[{
          name: 'release_amount',
          label: 'Release Amount',
          type: 'text',
          required: true,
          placeholder: `Max ${remainingAmount.toFixed(2)}`,
          defaultValue: String(remainingAmount),
        }]}
        onConfirm={async (values) => { await runRelease(values.release_amount || '0'); setReleaseModal(false); }}
        onCancel={() => setReleaseModal(false)}
      />
    </div>
  );
}
