'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import { callApi, formatDate, formatMinutes, statusVariant } from '@/components/om/om-helpers';

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

export default function SLAProfileDetailPage() {
  const params = useParams();
  const id = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<SLAProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sla-profiles/${encodeURIComponent(id)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load SLA profile'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data;
  const activeLabel = d?.is_active ? 'Active' : 'Inactive';

  return (
    <DetailPage
      title={d?.profile_name || d?.name || id}
      kicker={d ? `SLA Profile · ${d.name}` : 'SLA Profile'}
      backHref="/sla-profiles"
      backLabel="Back to SLA Profiles"
      loading={loading}
      error={error}
      onRetry={load}
      status={activeLabel}
      statusVariant={d?.is_active ? 'success' : 'default'}
      identityBlock={
        d ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card"><div className="stat-value text-sm">{formatMinutes(d.response_minutes)}</div><div className="stat-label">Response Time</div></div>
            <div className="stat-card"><div className="stat-value text-sm">{formatMinutes(d.resolution_minutes)}</div><div className="stat-label">Resolution Time</div></div>
            <div className="stat-card"><div className="stat-value text-sm">{d.working_hours_type || '-'}</div><div className="stat-label">Working Hours</div></div>
            <div className="stat-card"><div className="stat-value text-sm">{d.escalation_enabled ? 'Enabled' : 'Disabled'}</div><div className="stat-label">Escalation</div></div>
          </div>
        ) : null
      }
      sidePanels={
        <>
          {d && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Profile Details</h3></div>
              <div className="card-body">
                <dl className="space-y-2 text-sm">
                  {([
                    ['Profile ID', d.name], ['Profile Name', d.profile_name], ['Project', d.linked_project],
                    ['Response Time', formatMinutes(d.response_minutes)], ['Resolution Time', formatMinutes(d.resolution_minutes)],
                    ['Working Hours', d.working_hours_type], ['Escalation', d.escalation_enabled ? 'Enabled' : 'Disabled'],
                    ['Created By', d.owner], ['Created', formatDate(d.creation)], ['Modified', formatDate(d.modified)],
                  ] as [string, string | undefined][]).map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <dt className="text-gray-500 w-32 shrink-0">{label}</dt>
                      <dd className="font-medium text-gray-900 truncate">{value || '-'}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
          <LinkedRecordsPanel links={[{ label: 'Tickets Using Profile', doctype: 'GE Ticket', method: 'frappe.client.get_list', args: { doctype: 'GE Ticket', filters: JSON.stringify({ sla_profile: id }), fields: JSON.stringify(['name', 'title', 'status', 'priority']), limit_page_length: '10' }, href: (name: string) => `/om-helpdesk/${name}` }]} />
          <RecordDocumentsPanel referenceDoctype="GE SLA Profile" referenceName={id} title="Linked Documents" initialLimit={5} />
          <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE SLA Profile" subjectName={id} compact={false} initialLimit={10} /></div></div>
        </>
      }
    >
      <div />
    </DetailPage>
  );
}
