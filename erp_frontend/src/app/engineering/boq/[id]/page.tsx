'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  Send,
  XCircle,
  RotateCcw,
  Hash,
  IndianRupee,
  Building2,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { useAuth } from '@/context/AuthContext';

interface BoqItem {
  name?: string;
  site_name?: string;
  item_link?: string;
  description?: string;
  qty?: number;
  unit?: string;
  rate?: number;
  amount?: number;
  make?: string;
  model?: string;
  boq_code?: string;
  source_group?: string;
  module_name?: string;
  line_type?: string;
  source_sequence?: number;
  is_om_item?: number;
  is_manpower_item?: number;
  sor_rate?: number;
  quoted_rate?: number;
  source_total?: number;
}

interface BoqDetail {
  name: string;
  linked_tender?: string;
  linked_project?: string;
  version?: number;
  status?: string;
  total_amount?: number;
  total_items?: number;
  approved_by?: string;
  approved_at?: string;
  creation?: string;
  modified?: string;
  owner?: string;
  items?: BoqItem[];
}

function formatCurrency(val?: number): string {
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
  const style = s === 'APPROVED'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'PENDING_APPROVAL'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'REJECTED'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>
      {s.replace(/_/g, ' ')}
    </span>
  );
}

export default function BoqDetailPage() {
  const params = useParams();
  const boqName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<BoqDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canSubmit = hasRole('Director', 'System Manager', 'Presales Tendering Head', 'Presales Executive');
  const canApproveReject = hasRole('Director', 'System Manager', 'Department Head', 'Project Head');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/boqs/${encodeURIComponent(boqName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BOQ');
    } finally {
      setLoading(false);
    }
  }, [boqName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action);
    setError('');
    try {
      const res = await fetch(`/api/boqs/${encodeURIComponent(boqName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action}`);
      showSuccess(result.message || `${action} completed`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionBusy('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading BOQ...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-rose-600">{error}</p>
        <Link href="/engineering/boq" className="text-sm text-blue-600 hover:underline">← Back to BOQ Workspace</Link>
      </div>
    );
  }

  if (!data) return null;

  const items: BoqItem[] = data.items || [];
  const isDraft = data.status === 'DRAFT';
  const isPending = data.status === 'PENDING_APPROVAL';
  const isApproved = data.status === 'APPROVED';
  const isRejected = data.status === 'REJECTED';

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/engineering/boq" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to BOQ Workspace
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Version {data.version || 1} &middot; {data.total_items || 0} items &middot; {formatCurrency(data.total_amount)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          {isDraft && canSubmit && (
            <button onClick={() => runAction('submit')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          {isPending && canApproveReject && (
            <>
              <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
              <button onClick={() => setRejectModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
          {(isApproved || isRejected) && canSubmit && (
            <button onClick={() => runAction('revise')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50">
              <RotateCcw className="h-3.5 w-3.5" />{actionBusy === 'revise' ? 'Revising...' : 'Create Revision'}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Detail + Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">BOQ Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'BOQ Name', data.name],
                [<FileText key="t" className="h-3.5 w-3.5" />, 'Tender', data.linked_tender],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<FileSpreadsheet key="v" className="h-3.5 w-3.5" />, 'Version', `v${data.version || 1}`],
                [<IndianRupee key="a" className="h-3.5 w-3.5" />, 'Total Amount', formatCurrency(data.total_amount)],
                [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
                [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
                [<Calendar key="m" className="h-3.5 w-3.5" />, 'Modified', formatDate(data.modified)],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                  <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
                </div>
              ))}
            </dl>

            {/* Approval info */}
            {data.approved_by && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-gray-600">Approved by <strong>{data.approved_by}</strong></span>
                </div>
                {data.approved_at && <p className="mt-1 text-xs text-gray-400">on {formatDate(data.approved_at)}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Stats summary */}
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Summary</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{data.total_items || items.length || 0}</div>
                <div className="text-xs text-gray-500 mt-0.5">Line Items</div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
                <div className="text-2xl font-bold text-blue-900">v{data.version || 1}</div>
                <div className="text-xs text-blue-600 mt-0.5">Version</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-900">{formatCurrency(data.total_amount)}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Total Value</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">BOQ Line Items</h3>
          <p className="text-xs text-gray-500 mt-0.5">{items.length} items</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Code</th>
                <th className="px-4 py-2.5 font-medium">Site</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                <th className="px-4 py-2.5 font-medium">Unit</th>
                <th className="px-4 py-2.5 font-medium text-right">Rate</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                <th className="px-4 py-2.5 font-medium">Make / Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No line items</td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.name || idx}>
                  <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{item.boq_code || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{item.site_name || '-'}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[250px]">
                    <div className="truncate">{item.description || '-'}</div>
                    {(item.source_group || item.module_name) && (
                      <div className="mt-0.5 text-xs text-gray-400 truncate">{[item.source_group, item.module_name].filter(Boolean).join(' · ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {item.line_type && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{item.line_type}</span>}
                      {item.is_om_item ? <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">O&amp;M</span> : null}
                      {item.is_manpower_item ? <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">MP</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">{item.qty ?? '-'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{item.unit || '-'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {formatCurrency(item.rate)}
                    {item.sor_rate ? <div className="text-[10px] text-gray-400" title="SOR Rate">SOR: {formatCurrency(item.sor_rate)}</div> : null}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{[item.make, item.model].filter(Boolean).join(' / ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Linked Navigation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.linked_project && (
          <Link href={`/projects/${encodeURIComponent(data.linked_project)}`} className="card card-body flex items-center gap-3 hover:bg-blue-50 transition">
            <Building2 className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-xs text-gray-500">Linked Project</div>
              <div className="text-sm font-medium text-gray-900">{data.linked_project}</div>
            </div>
          </Link>
        )}
        {data.linked_tender && (
          <Link href={`/pre-sales?search=${encodeURIComponent(data.linked_tender)}`} className="card card-body flex items-center gap-3 hover:bg-amber-50 transition">
            <FileText className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs text-gray-500">Linked Tender</div>
              <div className="text-sm font-medium text-gray-900">{data.linked_tender}</div>
            </div>
          </Link>
        )}
      </div>

      {/* Linked Records */}
      <LinkedRecordsPanel
        links={[
          {
            label: 'Related Drawings',
            doctype: 'GE Drawing',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Drawing',
              filters: JSON.stringify(data.linked_project ? { linked_project: data.linked_project } : {}),
              fields: JSON.stringify(['name', 'title', 'status', 'revision', 'linked_project']),
              limit_page_length: '20',
            },
            href: (name) => `/engineering/drawings/${name}`,
          },
          {
            label: 'Vendor Comparisons',
            doctype: 'GE Vendor Comparison',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Vendor Comparison',
              filters: JSON.stringify(data.linked_tender ? { linked_boq: data.name } : {}),
              fields: JSON.stringify(['name', 'status', 'recommended_supplier', 'selected_total_amount']),
              limit_page_length: '20',
            },
            href: (name) => `/vendor-comparisons/${name}`,
          },
        ]}
      />

      {/* Linked Documents */}
      <TraceabilityPanel projectId={data.linked_project} />

      <RecordDocumentsPanel
        referenceDoctype="GE BOQ"
        referenceName={boqName}
        title="Linked Documents"
        initialLimit={5}
      />

      {/* Accountability Trail */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
        <div className="card-body">
          <AccountabilityTimeline
            subjectDoctype="GE BOQ"
            subjectName={boqName}
            compact={false}
            initialLimit={10}
          />
        </div>
      </div>

      {/* Reject Modal */}
      <ActionModal
        open={rejectModal}
        title="Reject BOQ"
        description={`Reject ${data.name} (v${data.version || 1}). Please provide a reason.`}
        variant="danger"
        confirmLabel="Reject"
        busy={actionBusy === 'reject'}
        fields={[
          { name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Mandatory — why is this BOQ being rejected?' },
        ]}
        onConfirm={async (values) => {
          await runAction('reject', { reason: values.reason || '' });
          setRejectModal(false);
        }}
        onCancel={() => setRejectModal(false)}
      />
    </div>
  );
}
