'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Send, Eye, ThumbsUp, ThumbsDown,
  Undo2, RefreshCw, UserCheck, GraduationCap, Briefcase, FileText,
  Building2, MapPin, Calendar, User,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';

interface OnboardingDetail {
  name: string;
  employee_name?: string;
  company?: string;
  designation?: string;
  onboarding_status?: string;
  date_of_joining?: string;
  employee_reference?: string;
  submitted_by?: string;
  reviewed_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  form_source?: string;
  project_location?: string;
  project_city?: string;
  creation?: string;
  modified?: string;
  owner?: string;
  education?: Array<Record<string, any>>;
  experience?: Array<Record<string, any>>;
  documents?: Array<Record<string, any>>;
}

function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'DRAFT').toUpperCase().replace(/_/g, ' ');
  const style =
    s === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'MAPPED TO EMPLOYEE' ? 'bg-green-50 text-green-700 border-green-200'
    : s === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'UNDER REVIEW' ? 'bg-purple-50 text-purple-700 border-purple-200'
    : s === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-gray-50 text-gray-700 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s}</span>;
}

export default function OnboardingDetailPage() {
  const params = useParams();
  const docName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<OnboardingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some(r => set.has(r));
  };

  const canSubmit = hasRole('HR Manager', 'HR User', 'System Manager');
  const canReview = hasRole('HR Manager', 'System Manager');
  const canApprove = hasRole('HR Manager', 'Department Head', 'Director', 'System Manager');
  const canMap = hasRole('HR Manager', 'System Manager');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/hr/onboarding/${encodeURIComponent(docName)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [docName]);

  useEffect(() => { reload(); }, [reload]);

  const runAction = async (action: string, extra: Record<string, any> = {}) => {
    setActionBusy(action);
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch(`/api/hr/onboarding/${encodeURIComponent(docName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || `${action} failed`);
      setSuccessMsg(payload.message || `Action "${action}" completed`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <p className="text-gray-600">{error || 'Onboarding record not found'}</p>
      <Link href="/hr/onboarding" className="text-sm text-blue-600 hover:underline">← Back to Onboarding</Link>
    </div>
  );

  const d = data;
  const st = (d.onboarding_status || 'DRAFT').toUpperCase();

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/hr/onboarding" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />Back to Onboarding
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{d.employee_name || docName}</h1>
          <p className="text-sm text-gray-500 mt-1">{d.designation || 'Onboarding'} — {d.company || ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={st} />

          {st === 'DRAFT' && canSubmit && (
            <button onClick={() => runAction('submit')} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{actionBusy === 'submit' ? 'Submitting...' : 'Submit'}
            </button>
          )}
          {st === 'SUBMITTED' && canReview && (
            <button onClick={() => runAction('review')} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">
              <Eye className="h-3.5 w-3.5" />{actionBusy === 'review' ? 'Starting...' : 'Start Review'}
            </button>
          )}
          {st === 'UNDER_REVIEW' && canApprove && (
            <>
              <button onClick={() => runAction('approve')} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <ThumbsUp className="h-3.5 w-3.5" />{actionBusy === 'approve' ? 'Approving...' : 'Approve'}
              </button>
              <button onClick={() => setRejectModal(true)} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                <ThumbsDown className="h-3.5 w-3.5" />Reject
              </button>
              <button onClick={() => runAction('send_back')} disabled={!!actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                <Undo2 className="h-3.5 w-3.5" />{actionBusy === 'send_back' ? 'Sending...' : 'Send Back'}
              </button>
            </>
          )}
          {(st === 'REJECTED' || st === 'SUBMITTED') && canSubmit && (
            <button onClick={() => runAction('reopen')} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className="h-3.5 w-3.5" />{actionBusy === 'reopen' ? 'Reopening...' : 'Reopen'}
            </button>
          )}
          {st === 'APPROVED' && canMap && (
            <button onClick={() => runAction('map')} disabled={!!actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
              <UserCheck className="h-3.5 w-3.5" />{actionBusy === 'map' ? 'Mapping...' : 'Map to Employee'}
            </button>
          )}
        </div>
      </div>

      {/* messages */}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Calendar className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatDate(d.date_of_joining)}</div><div className="stat-label">Date of Joining</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><MapPin className="w-5 h-5" /></div><div><div className="stat-value text-sm">{d.project_city || d.project_location || '-'}</div><div className="stat-label">Location</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><FileText className="w-5 h-5" /></div><div><div className="stat-value text-sm">{d.form_source || '-'}</div><div className="stat-label">Form Source</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600"><UserCheck className="w-5 h-5" /></div><div><div className="stat-value text-sm">{d.employee_reference || '-'}</div><div className="stat-label">Employee Ref</div></div></div></div>
      </div>

      {/* detail card */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Onboarding Details</h3></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3"><User className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Employee Name</div><div className="font-medium text-gray-900">{d.employee_name || '-'}</div></div></div>
          <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Company</div><div className="font-medium text-gray-900">{d.company || '-'}</div></div></div>
          <div className="flex items-start gap-3"><Briefcase className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Designation</div><div className="font-medium text-gray-900">{d.designation || '-'}</div></div></div>
          <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Date of Joining</div><div className="font-medium text-gray-900">{formatDate(d.date_of_joining)}</div></div></div>
          <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Project Location</div><div className="font-medium text-gray-900">{d.project_location || '-'}{d.project_city ? `, ${d.project_city}` : ''}</div></div></div>
          <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Form Source</div><div className="font-medium text-gray-900">{d.form_source || '-'}</div></div></div>
          <div className="flex items-start gap-3"><User className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Submitted By</div><div className="font-medium text-gray-900">{d.submitted_by || '-'}</div></div></div>
          <div className="flex items-start gap-3"><User className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Reviewed By</div><div className="font-medium text-gray-900">{d.reviewed_by || '-'}</div></div></div>
          {d.approved_by && (
            <div className="flex items-start gap-3"><UserCheck className="h-4 w-4 text-emerald-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Approved By</div><div className="font-medium text-gray-900">{d.approved_by} {d.approved_at ? `on ${formatDate(d.approved_at)}` : ''}</div></div></div>
          )}
          {d.rejected_by && (
            <div className="flex items-start gap-3"><ThumbsDown className="h-4 w-4 text-rose-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Rejected By</div><div className="font-medium text-gray-900">{d.rejected_by}</div></div></div>
          )}
          {d.rejection_reason && (
            <div className="sm:col-span-2 flex items-start gap-3"><AlertCircle className="h-4 w-4 text-rose-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Rejection Reason</div><div className="font-medium text-rose-700 whitespace-pre-wrap">{d.rejection_reason}</div></div></div>
          )}
          {d.employee_reference && (
            <div className="flex items-start gap-3"><UserCheck className="h-4 w-4 text-green-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Employee Reference</div><div className="font-medium text-gray-900">{d.employee_reference}</div></div></div>
          )}
        </div>
      </div>

      {/* education table */}
      {d.education && d.education.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Education</h3></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50"><tr>{['Qualification', 'Institution', 'Year', 'Percentage / Grade'].map(h => <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {d.education.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium text-gray-900">{row.qualification || row.degree || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{row.institution || row.school_univ || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{row.year_of_passing || row.year || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{row.percentage || row.grade || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* experience table */}
      {d.experience && d.experience.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Briefcase className="h-4 w-4" /> Experience</h3></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50"><tr>{['Company', 'Designation', 'From', 'To', 'Total Experience'].map(h => <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {d.experience.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium text-gray-900">{row.company_name || row.company || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{row.designation || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{formatDate(row.from_date)}</td>
                    <td className="px-4 py-2 text-gray-600">{formatDate(row.to_date)}</td>
                    <td className="px-4 py-2 text-gray-600">{row.total_experience || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* documents table */}
      {d.documents && d.documents.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="h-4 w-4" /> Onboarding Documents</h3></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50"><tr>{['Document Type', 'Document Name', 'Is Mandatory', 'Attached'].map(h => <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {d.documents.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium text-gray-900">{row.document_type || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{row.document_name || '-'}</td>
                    <td className="px-4 py-2">{row.is_mandatory ? <span className="text-rose-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</td>
                    <td className="px-4 py-2">{row.attached || row.file_url ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-gray-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* linked records, documents, timeline */}
      <LinkedRecordsPanel
        links={[
          ...(d.employee_reference ? [{
            label: 'Employee',
            doctype: 'Employee',
            method: 'frappe.client.get_list',
            args: {
              doctype: 'Employee',
              filters: JSON.stringify({ name: d.employee_reference }),
              fields: JSON.stringify(['name', 'employee_name', 'designation', 'status']),
              limit_page_length: '5',
            },
            href: (name: string) => `/hr/employees/${name}`,
          }] : []),
        ]}
      />

      <RecordDocumentsPanel referenceDoctype="GE Employee Onboarding" referenceName={docName} title="Attached Documents" />
      <section>
        <details open>
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-3">Accountability Trail</summary>
          <AccountabilityTimeline subjectDoctype="GE Employee Onboarding" subjectName={docName} />
        </details>
      </section>

      {/* reject modal */}
      <ActionModal
        open={rejectModal}
        title="Reject Onboarding"
        description="Provide a reason for rejection."
        busy={actionBusy === 'reject'}
        fields={[{
          name: 'reason',
          label: 'Rejection Reason',
          type: 'textarea',
          required: true,
          placeholder: 'Enter reason for rejection...',
        }]}
        onConfirm={async (values) => { await runAction('reject', { reason: values.reason }); setRejectModal(false); }}
        onCancel={() => setRejectModal(false)}
      />
    </div>
  );
}
