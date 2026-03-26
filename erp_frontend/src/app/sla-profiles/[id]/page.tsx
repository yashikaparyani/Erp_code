'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  Clock, Shield, ToggleLeft, ToggleRight, Hash, Zap,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';

interface SLAProfileDetail {
  name: string;
  profile_name?: string;
  linked_project?: string;
  response_minutes?: number;
  resolution_minutes?: number;
  working_hours_type?: string;
  escalation_enabled?: boolean;
  is_active?: boolean;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMinutes(val?: number) {
  if (val == null) return '-';
  if (val < 60) return `${val} min`;
  const h = Math.floor(val / 60);
  const m = val % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function ActiveBadge({ active }: { active?: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><ToggleRight className="h-3.5 w-3.5" /> Active</span>
    : <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500"><ToggleLeft className="h-3.5 w-3.5" /> Inactive</span>;
}

export default function SLAProfileDetailPage() {
  const params = useParams();
  const profileName = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<SLAProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sla-profiles/${encodeURIComponent(profileName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load SLA profile'); }
    finally { setLoading(false); }
  }, [profileName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading SLA profile...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/sla-profiles" className="text-sm text-blue-600 hover:underline">← Back to SLA Profiles</Link></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/sla-profiles" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to SLA Profiles</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.profile_name || data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.name}</p>
        </div>
        <ActiveBadge active={data.is_active} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Clock className="h-4 w-4" /> Response Time</div>
          <p className="text-xl font-bold text-gray-900">{formatMinutes(data.response_minutes)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Clock className="h-4 w-4" /> Resolution Time</div>
          <p className="text-xl font-bold text-gray-900">{formatMinutes(data.resolution_minutes)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Calendar className="h-4 w-4" /> Working Hours</div>
          <p className="text-xl font-bold text-gray-900">{data.working_hours_type || '-'}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Zap className="h-4 w-4" /> Escalation</div>
          <p className="text-xl font-bold text-gray-900">{data.escalation_enabled ? 'Enabled' : 'Disabled'}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Profile Details</h3></div>
        <div className="card-body">
          <dl className="space-y-3 text-sm">
            {[
              [<Hash key="n" className="h-3.5 w-3.5" />, 'Profile ID', data.name],
              [<Shield key="pn" className="h-3.5 w-3.5" />, 'Profile Name', data.profile_name],
              [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
              [<Clock key="rsp" className="h-3.5 w-3.5" />, 'Response Time', formatMinutes(data.response_minutes)],
              [<Clock key="res" className="h-3.5 w-3.5" />, 'Resolution Time', formatMinutes(data.resolution_minutes)],
              [<Calendar key="wh" className="h-3.5 w-3.5" />, 'Working Hours', data.working_hours_type],
              [<Zap key="esc" className="h-3.5 w-3.5" />, 'Escalation', data.escalation_enabled ? 'Enabled' : 'Disabled'],
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

      <LinkedRecordsPanel links={[
        { label: 'Tickets Using Profile', doctype: 'GE Service Ticket', method: 'frappe.client.get_list', args: { doctype: 'GE Service Ticket', filters: JSON.stringify({ sla_profile: data.name }), fields: JSON.stringify(['name', 'title', 'status', 'priority']), limit_page_length: '10' }, href: (name: string) => `/om-helpdesk/${name}` },
      ]} />

      <RecordDocumentsPanel referenceDoctype="GE SLA Profile" referenceName={profileName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE SLA Profile" subjectName={profileName} compact={false} initialLimit={10} /></div></div>
    </div>
  );
}
