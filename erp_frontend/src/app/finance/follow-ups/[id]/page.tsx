'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, DollarSign, Phone,
  CheckCircle2, TrendingUp, FileText, User, Building2, MapPin,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';

interface FollowUpDetail {
  name: string;
  customer?: string;
  linked_invoice?: string;
  linked_project?: string;
  follow_up_date?: string;
  follow_up_mode?: string;
  status?: string;
  contact_person?: string;
  summary?: string;
  promised_payment_date?: string;
  promised_payment_amount?: number;
  next_follow_up_on?: string;
  assigned_to?: string;
  escalation_level?: number;
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
  const s = (status || 'OPEN').toUpperCase();
  const style =
    s === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'ESCALATED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'PROMISED' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function FollowUpDetailPage() {
  const params = useParams();
  const fuName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<FollowUpDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [closeModal, setCloseModal] = useState(false);
  const [escalateModal, setEscalateModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some(r => set.has(r));
  };
  const canAct = hasRole('Finance Manager', 'Finance User', 'Billing Manager', 'Director', 'System Manager');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/finance/follow-ups/${encodeURIComponent(fuName)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [fuName]);

  useEffect(() => { reload(); }, [reload]);

  const runAction = async (action: string, extra?: Record<string, string>) => {
    setActionBusy(action);
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch(`/api/finance/follow-ups/${encodeURIComponent(fuName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      setSuccessMsg(payload.message || 'Done');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <p className="text-gray-600">{error || 'Follow-up not found'}</p>
      <Link href="/finance/follow-ups" className="text-sm text-blue-600 hover:underline">← Back to Follow-Ups</Link>
    </div>
  );

  const d = data;
  const st = (d.status || 'OPEN').toUpperCase();

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/finance/follow-ups" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />Back to Follow-Ups
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{fuName}</h1>
          <p className="text-sm text-gray-500 mt-1">{d.customer || 'Customer'} — {formatDate(d.follow_up_date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={st} />

          {st !== 'CLOSED' && canAct && (
            <>
              <button onClick={() => setCloseModal(true)} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" />Close
              </button>
              <button onClick={() => setEscalateModal(true)} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <TrendingUp className="h-3.5 w-3.5" />Escalate
              </button>
            </>
          )}
        </div>
      </div>

      {/* messages */}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><DollarSign className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatCurrency(d.promised_payment_amount)}</div><div className="stat-label">Promised Amount</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Calendar className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatDate(d.promised_payment_date)}</div><div className="stat-label">Promised Date</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Calendar className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatDate(d.next_follow_up_on)}</div><div className="stat-label">Next Follow-Up</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-100 text-rose-600"><TrendingUp className="w-5 h-5" /></div><div><div className="stat-value">{d.escalation_level ?? 0}</div><div className="stat-label">Escalation Level</div></div></div></div>
      </div>

      {/* detail card */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Follow-Up Details</h3></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {d.customer && (
            <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Customer</div><div className="font-medium text-gray-900">{d.customer}</div></div></div>
          )}
          {d.linked_invoice && (
            <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Linked Invoice</div><Link href={`/finance/billing/${encodeURIComponent(d.linked_invoice)}`} className="font-medium text-blue-700 hover:underline">{d.linked_invoice}</Link></div></div>
          )}
          {d.linked_project && (
            <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Linked Project</div><Link href={`/projects/${encodeURIComponent(d.linked_project)}`} className="font-medium text-blue-700 hover:underline">{d.linked_project}</Link></div></div>
          )}
          {d.follow_up_mode && (
            <div className="flex items-start gap-3"><Phone className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Follow-Up Mode</div><div className="font-medium text-gray-900">{d.follow_up_mode}</div></div></div>
          )}
          {d.contact_person && (
            <div className="flex items-start gap-3"><User className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Contact Person</div><div className="font-medium text-gray-900">{d.contact_person}</div></div></div>
          )}
          {d.assigned_to && (
            <div className="flex items-start gap-3"><User className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Assigned To</div><div className="font-medium text-gray-900">{d.assigned_to}</div></div></div>
          )}
          {d.summary && (
            <div className="sm:col-span-2 flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Summary</div><div className="font-medium text-gray-900 whitespace-pre-wrap">{d.summary}</div></div></div>
          )}
          {d.remarks && (
            <div className="sm:col-span-2 flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Remarks</div><div className="font-medium text-gray-900 whitespace-pre-wrap">{d.remarks}</div></div></div>
          )}
        </div>
      </div>

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

      <RecordDocumentsPanel referenceDoctype="GE Payment Follow Up" referenceName={fuName} title="Follow-Up Documents" />
      <section>
        <details open>
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-3">Accountability Trail</summary>
          <AccountabilityTimeline subjectDoctype="GE Payment Follow Up" subjectName={fuName} />
        </details>
      </section>

      {/* close modal */}
      <ActionModal
        open={closeModal}
        title="Close Follow-Up"
        description="Add closing remarks for this follow-up."
        busy={actionBusy === 'close'}
        fields={[{ name: 'remarks', label: 'Closing Remarks', type: 'textarea', required: false, placeholder: 'Optional closing notes...' }]}
        onConfirm={async (values) => { await runAction('close', { remarks: values.remarks || '' }); setCloseModal(false); }}
        onCancel={() => setCloseModal(false)}
      />

      {/* escalate modal */}
      <ActionModal
        open={escalateModal}
        title="Escalate Follow-Up"
        description="This will increase the escalation level. Add remarks to explain."
        busy={actionBusy === 'escalate'}
        fields={[{ name: 'remarks', label: 'Escalation Remarks', type: 'textarea', required: false, placeholder: 'Reason for escalation...' }]}
        onConfirm={async (values) => { await runAction('escalate', { remarks: values.remarks || '' }); setEscalateModal(false); }}
        onCancel={() => setEscalateModal(false)}
      />
    </div>
  );
}
