'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Clock, Send,
  CheckCircle2, XCircle, RotateCcw, FileText, MapPin,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';

interface RegDetail {
  name: string;
  employee?: string;
  employee_name?: string;
  regularization_date?: string;
  regularization_status?: string;
  requested_check_in?: string;
  requested_check_out?: string;
  requested_status?: string;
  linked_attendance_log?: string;
  reason?: string;
  submitted_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(v?: string) {
  if (!v) return '-';
  if (v.includes('T') || v.includes(' ')) {
    return new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return v.slice(0, 5);
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'DRAFT').toUpperCase();
  const style = s === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'SUBMITTED' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : s === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function RegularizationDetailPage() {
  const params = useParams();
  const regName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<RegDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some(r => set.has(r));
  };
  const canSubmit = hasRole('HR Manager', 'HR User', 'System Manager', 'Director');
  const canApprove = hasRole('HR Manager', 'Department Head', 'Director', 'System Manager');
  const canReopen = hasRole('HR Manager', 'HR User', 'System Manager', 'Director');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/hr/regularizations/${encodeURIComponent(regName)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [regName]);

  useEffect(() => { reload(); }, [reload]);

  const runAction = async (action: string, extra?: Record<string, string>) => {
    setActionBusy(action);
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch(`/api/hr/regularizations/${encodeURIComponent(regName)}/actions`, {
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
      <p className="text-gray-600">{error || 'Regularization not found'}</p>
      <Link href="/hr/regularizations" className="text-sm text-blue-600 hover:underline">← Back to list</Link>
    </div>
  );

  const d = data;
  const st = (d.regularization_status || 'DRAFT').toUpperCase();

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/hr/regularizations" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />Back to Regularizations
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{regName}</h1>
          <p className="text-sm text-gray-500 mt-1">Attendance Regularization — {d.employee || 'Employee'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={st} />

          {st === 'DRAFT' && canSubmit && (
            <button onClick={() => runAction('submit')} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting...' : 'Submit'}
            </button>
          )}
          {st === 'SUBMITTED' && canApprove && (
            <>
              <button onClick={() => runAction('approve')} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" />{actionBusy === 'approve' ? 'Approving...' : 'Approve'}
              </button>
              <button onClick={() => setRejectModal(true)} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                <XCircle className="h-3.5 w-3.5" />Reject
              </button>
            </>
          )}
          {(st === 'SUBMITTED' || st === 'REJECTED') && canReopen && (
            <button onClick={() => runAction('reopen')} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
              <RotateCcw className="h-3.5 w-3.5" />Reopen
            </button>
          )}
        </div>
      </div>

      {/* messages */}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
      {st === 'REJECTED' && d.rejection_reason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-xs font-semibold text-rose-800">Rejection Reason</p>
          <p className="text-sm text-rose-700 mt-1">{d.rejection_reason}</p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Calendar className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatDate(d.regularization_date)}</div><div className="stat-label">Date</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatTime(d.requested_check_in)}</div><div className="stat-label">Requested Check-In</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatTime(d.requested_check_out)}</div><div className="stat-label">Requested Check-Out</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><FileText className="w-5 h-5" /></div><div><div className="stat-value text-sm">{d.requested_status || '-'}</div><div className="stat-label">Requested Status</div></div></div></div>
      </div>

      {/* detail card */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Regularization Details</h3></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3"><User className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Employee</div><div className="font-medium text-gray-900">{d.employee || '-'}{d.employee_name ? ` — ${d.employee_name}` : ''}</div></div></div>
          {d.linked_attendance_log && (
            <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Attendance Log</div><div className="font-medium text-gray-900">{d.linked_attendance_log}</div></div></div>
          )}
          {d.submitted_by && (
            <div className="flex items-start gap-3"><Send className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Submitted By</div><div className="font-medium text-gray-900">{d.submitted_by}</div></div></div>
          )}
          {d.approved_by && (
            <div className="flex items-start gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Approved By</div><div className="font-medium text-gray-900">{d.approved_by}</div></div></div>
          )}
          {d.reason && (
            <div className="sm:col-span-2 flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Reason</div><div className="font-medium text-gray-900 whitespace-pre-wrap">{d.reason}</div></div></div>
          )}
        </div>
      </div>

      {/* linked records */}
      <LinkedRecordsPanel
        links={[
          ...(d.employee ? [{
            label: 'Employee',
            doctype: 'GE Employee',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Employee',
              filters: JSON.stringify({ name: d.employee }),
              fields: JSON.stringify(['name', 'employee_name', 'department']),
              limit_page_length: '5',
            },
            href: (name: string) => `/hr/employees/${name}`,
          }] : []),
          ...(d.linked_attendance_log ? [{
            label: 'Attendance Log',
            doctype: 'GE Attendance Log',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'GE Attendance Log',
              filters: JSON.stringify({ name: d.linked_attendance_log }),
              fields: JSON.stringify(['name', 'employee', 'attendance_date', 'attendance_status']),
              limit_page_length: '5',
            },
            href: (name: string) => `/hr/attendance/${name}`,
          }] : []),
        ]}
      />

      <RecordDocumentsPanel referenceDoctype="GE Attendance Regularization" referenceName={regName} title="Regularization Documents" />
      <section>
        <details open>
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-3">Accountability Trail</summary>
          <AccountabilityTimeline subjectDoctype="GE Attendance Regularization" subjectName={regName} />
        </details>
      </section>

      {/* reject modal */}
      <ActionModal
        open={rejectModal}
        title="Reject Regularization"
        description="Provide a reason for rejecting this attendance regularization."
        busy={actionBusy === 'reject'}
        fields={[{ name: 'reason', label: 'Rejection Reason', type: 'textarea', required: true, placeholder: 'Why is this regularization being rejected?' }]}
        onConfirm={async (values) => { await runAction('reject', { reason: values.reason || '' }); setRejectModal(false); }}
        onCancel={() => setRejectModal(false)}
      />
    </div>
  );
}
