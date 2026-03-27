'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  User,
  Building2,
  Send,
  CheckCircle2,
  ExternalLink,
  Layers,
  Hash,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import { useAuth } from '@/context/AuthContext';

const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || '';

interface DrawingDetail {
  name: string;
  drawing_title?: string;
  title?: string;
  project?: string;
  site?: string;
  revision_no?: string;
  revision?: string;
  status?: string;
  client_approval_status?: string;
  file_url?: string;
  superseded_by?: string;
  remarks?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'Draft').toLowerCase();
  const style = s === 'approved'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'submitted' || s === 'pending'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'superseded'
    ? 'bg-purple-50 text-purple-700 border-purple-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function DrawingDetailPage() {
  const params = useParams();
  const drawingName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<DrawingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canSubmit = hasRole('Director', 'System Manager', 'Presales Tendering Head', 'Engineering Executive');
  const canApprove = hasRole('Director', 'System Manager', 'Department Head', 'Project Head');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/engineering/drawings/${encodeURIComponent(drawingName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drawing');
    } finally {
      setLoading(false);
    }
  }, [drawingName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action);
    setError('');
    try {
      const res = await fetch(`/api/engineering/drawings/${encodeURIComponent(drawingName)}/actions`, {
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
        <span className="ml-2 text-gray-500">Loading drawing...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-rose-600">{error}</p>
        <Link href="/engineering/drawings" className="text-sm text-blue-600 hover:underline">← Back to Drawings</Link>
      </div>
    );
  }

  if (!data) return null;

  const isDraft = !data.status || data.status === 'Draft';
  const isSubmitted = data.status === 'Submitted' || data.status === 'Pending';
  const isApproved = data.status === 'Approved';
  const isSuperseded = data.status === 'Superseded';
  const drawingTitle = data.drawing_title || data.title || data.name;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/engineering/drawings" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Drawings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{drawingTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Rev {data.revision_no || data.revision || '0'} &middot; {data.project || 'No project'} &middot; {formatDate(data.creation)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} />
          {data.client_approval_status && (
            <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Client: {data.client_approval_status}
            </span>
          )}
          {isDraft && canSubmit && (
            <button onClick={() => runAction('submit')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          {isSubmitted && canApprove && (
            <button onClick={() => runAction('approve')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
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

      {/* Superseded Warning */}
      {isSuperseded && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
          This drawing has been superseded{data.superseded_by ? ` by ${data.superseded_by}` : ''}.
        </div>
      )}

      {/* Detail Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Context Card */}
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Drawing Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Name', data.name],
                [<FileText key="t" className="h-3.5 w-3.5" />, 'Title', drawingTitle],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.project],
                [<Building2 key="s" className="h-3.5 w-3.5" />, 'Site', data.site],
                [<Layers key="r" className="h-3.5 w-3.5" />, 'Revision', data.revision_no || data.revision],
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
          </div>
        </div>

        {/* File + Remarks */}
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Drawing File &amp; Remarks</h3></div>
          <div className="card-body space-y-4">
            {data.file_url ? (
              <a
                href={`${FRAPPE_URL}${data.file_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
              >
                <ExternalLink className="h-4 w-4" />
                Open Drawing File
              </a>
            ) : (
              <p className="text-sm text-gray-400">No drawing file attached.</p>
            )}
            {data.remarks ? (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{data.remarks}</div>
            ) : (
              <p className="text-sm text-gray-400">No remarks.</p>
            )}
          </div>
        </div>
      </div>

      {/* Linked Navigation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.project && (
          <Link href={`/engineering/projects/${encodeURIComponent(data.project)}`} className="card card-body flex items-center gap-3 hover:bg-blue-50 transition">
            <Building2 className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-xs text-gray-500">Project</div>
              <div className="text-sm font-medium text-gray-900">{data.project}</div>
            </div>
          </Link>
        )}
        {isSuperseded && data.superseded_by && (
          <Link href={`/engineering/drawings/${encodeURIComponent(data.superseded_by)}`} className="card card-body flex items-center gap-3 hover:bg-purple-50 transition">
            <Layers className="h-5 w-5 text-purple-500" />
            <div>
              <div className="text-xs text-gray-500">Superseded By</div>
              <div className="text-sm font-medium text-gray-900">{data.superseded_by}</div>
            </div>
          </Link>
        )}
      </div>

      {/* Linked Records */}
      <LinkedRecordsPanel
        links={[
          {
            label: 'Related BOQs',
            doctype: 'GE Bill of Quantities',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Bill of Quantities',
              filters: JSON.stringify(data.project ? { linked_project: data.project } : {}),
              fields: JSON.stringify(['name', 'status', 'total_amount', 'total_items', 'linked_project']),
              limit_page_length: '20',
            },
            href: (name) => `/engineering/boq/${name}`,
          },
          {
            label: 'Technical Deviations',
            doctype: 'GE Technical Deviation',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Technical Deviation',
              filters: JSON.stringify({ linked_drawing: data.name }),
              fields: JSON.stringify(['name', 'deviation_id', 'status', 'impact', 'description']),
              limit_page_length: '20',
            },
            href: (name) => `/engineering/deviations/${name}`,
          },
        ]}
      />

      {/* Linked Documents */}
      <TraceabilityPanel projectId={data.project} />

      <RecordDocumentsPanel
        referenceDoctype="GE Drawing"
        referenceName={drawingName}
        title="Linked Documents"
        initialLimit={5}
      />

      {/* Accountability Trail */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
        <div className="card-body">
          <AccountabilityTimeline
            subjectDoctype="GE Drawing"
            subjectName={drawingName}
            compact={false}
            initialLimit={10}
          />
        </div>
      </div>
    </div>
  );
}
