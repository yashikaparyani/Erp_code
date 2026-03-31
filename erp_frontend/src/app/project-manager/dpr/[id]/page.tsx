'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, Users, Wrench, MapPin, FileText,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';

interface DprDetail {
  name: string;
  linked_project?: string;
  linked_site?: string;
  report_date?: string;
  summary?: string;
  manpower_on_site?: number;
  equipment_count?: number;
  submitted_by?: string;
  creation?: string;
  modified?: string;
  owner?: string;
  weather_conditions?: string;
  safety_incidents?: number;
  work_activities?: string;
  issues_delays?: string;
  material_received?: string;
  status?: string;
  approved_by?: string;
  approved_on?: string;
  rejected_by?: string;
  rejected_on?: string;
  remarks?: string;
}

function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DprDetailPage() {
  const params = useParams();
  const dprName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const approverRoles = new Set(['Project Head', 'Department Head', 'Director', 'System Manager']);
  const canApproveDpr = (currentUser?.roles || []).some(r => approverRoles.has(r));

  const [data, setData] = useState<DprDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');

  const runDprAction = async (method: string, extraArgs?: Record<string, string>) => {
    setActionBusy(method);
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, name: dprName, ...extraArgs }),
      });
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Action failed');
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionBusy('');
    }
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dprs/${encodeURIComponent(dprName)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [dprName]);

  useEffect(() => { reload(); }, [reload]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <p className="text-gray-600">{error || 'DPR not found'}</p>
      <Link href="/project-manager/dpr" className="text-sm text-blue-600 hover:underline">← Back to DPRs</Link>
    </div>
  );

  const d = data;

  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <Link href="/project-manager/dpr" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-3.5 w-3.5" />Back to DPRs
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{dprName}</h1>
          {d.status && (
            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
              d.status === 'Approved' ? 'bg-emerald-50 text-emerald-700'
              : d.status === 'Rejected' ? 'bg-rose-50 text-rose-700'
              : d.status === 'Submitted' ? 'bg-blue-50 text-blue-700'
              : 'bg-gray-100 text-gray-600'
            }`}>{d.status}</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">Daily Progress Report — {formatDate(d.report_date)}</p>
        {/* Workflow actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(!d.status || d.status === 'Draft') && (
            <button onClick={() => runDprAction('submit_dpr')} disabled={!!actionBusy} className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {actionBusy === 'submit_dpr' ? 'Submitting…' : 'Submit for Approval'}
            </button>
          )}
          {d.status === 'Submitted' && canApproveDpr && (
            <>
              <button onClick={() => runDprAction('approve_dpr')} disabled={!!actionBusy} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {actionBusy === 'approve_dpr' ? 'Approving…' : 'Approve'}
              </button>
              <button onClick={() => runDprAction('reject_dpr')} disabled={!!actionBusy} className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                {actionBusy === 'reject_dpr' ? 'Rejecting…' : 'Reject'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Calendar className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatDate(d.report_date)}</div><div className="stat-label">Report Date</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><Users className="w-5 h-5" /></div><div><div className="stat-value">{d.manpower_on_site ?? 0}</div><div className="stat-label">Manpower on Site</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600"><Wrench className="w-5 h-5" /></div><div><div className="stat-value">{d.equipment_count ?? 0}</div><div className="stat-label">Equipment Count</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600"><MapPin className="w-5 h-5" /></div><div><div className="stat-value text-sm truncate">{d.linked_site || '-'}</div><div className="stat-label">Site</div></div></div></div>
      </div>

      {/* detail card */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Report Details</h3></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {d.linked_project && (
            <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Project</div><Link href={`/projects/${encodeURIComponent(d.linked_project)}`} className="font-medium text-blue-700 hover:underline">{d.linked_project}</Link></div></div>
          )}
          {d.linked_site && (
            <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Site</div><div className="font-medium text-gray-900">{d.linked_site}</div></div></div>
          )}
          {d.submitted_by && (
            <div className="flex items-start gap-3"><Users className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Submitted By</div><div className="font-medium text-gray-900">{d.submitted_by}</div></div></div>
          )}
          {d.weather_conditions && (
            <div className="flex items-start gap-3"><FileText className="h-4 w-4 text-gray-400 mt-0.5" /><div><div className="text-gray-500 text-xs">Weather Conditions</div><div className="font-medium text-gray-900">{d.weather_conditions}</div></div></div>
          )}
          {d.safety_incidents != null && (
            <div className="flex items-start gap-3"><AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" /><div><div className="text-gray-500 text-xs">Safety Incidents</div><div className="font-medium text-gray-900">{d.safety_incidents}</div></div></div>
          )}
        </div>
      </div>

      {/* summary */}
      {d.summary && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Summary</h3></div>
          <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap">{d.summary}</div>
        </div>
      )}

      {/* work activities */}
      {d.work_activities && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Work Activities</h3></div>
          <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap">{d.work_activities}</div>
        </div>
      )}

      {/* issues / delays */}
      {d.issues_delays && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Issues &amp; Delays</h3></div>
          <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap">{d.issues_delays}</div>
        </div>
      )}

      {/* material received */}
      {d.material_received && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Material Received</h3></div>
          <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap">{d.material_received}</div>
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
        ]}
      />

      <RecordDocumentsPanel referenceDoctype="GE DPR" referenceName={dprName} title="DPR Documents" />
      <section>
        <details open>
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-3">Accountability Trail</summary>
          <AccountabilityTimeline subjectDoctype="GE DPR" subjectName={dprName} />
        </details>
      </section>
    </div>
  );
}
