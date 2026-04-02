'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import RegisterPage, { StatItem } from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { callApi, formatMinutes, useAuth, hasAnyRole } from '@/components/om/om-helpers';

interface SLAProfile {
  name: string;
  profile_name?: string;
  linked_project?: string;
  response_minutes?: number;
  resolution_minutes?: number;
  working_hours_type?: string;
  escalation_enabled?: number;
  is_active?: number;
}

export default function SLAProfilesPage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<SLAProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await callApi<SLAProfile[]>('/api/sla-profiles');
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const canManage = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'OM Operator');
  const active = items.filter(i => i.is_active).length;

  const stats: StatItem[] = [
    { label: 'Total Profiles', value: items.length },
    { label: 'Active', value: active, variant: 'success' },
  ];

  return (
    <>
      <RegisterPage
        title="SLA Profiles"
        description="Define service level agreements for helpdesk tickets"
        loading={loading}
        error={error}
        empty={!loading && items.length === 0}
        emptyTitle="No SLA profiles"
        emptyDescription="No SLA profiles configured"
        onRetry={load}
        stats={stats}
        headerActions={
          canManage ? <button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Profile</button> : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Profile Name</th>
                <th>Project</th>
                <th>Response</th>
                <th>Resolution</th>
                <th>Hours Type</th>
                <th>Escalation</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.name}>
                  <td><Link href={`/sla-profiles/${encodeURIComponent(item.name)}`} className="font-medium text-blue-700 hover:underline">{item.name}</Link></td>
                  <td>{item.profile_name || '-'}</td>
                  <td className="text-gray-700">{item.linked_project || '-'}</td>
                  <td className="text-gray-700">{formatMinutes(item.response_minutes)}</td>
                  <td className="text-gray-700">{formatMinutes(item.resolution_minutes)}</td>
                  <td className="text-gray-700">{item.working_hours_type || '-'}</td>
                  <td><span className={`badge ${item.escalation_enabled ? 'badge-green' : 'badge-gray'}`}>{item.escalation_enabled ? 'Yes' : 'No'}</span></td>
                  <td><span className={`badge ${item.is_active ? 'badge-green' : 'badge-red'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      <FormModal
        open={showCreate}
        title="New SLA Profile"
        size="md"
        busy={createBusy}
        confirmLabel="Create"
        fields={[
          { name: 'profile_name', label: 'Profile Name', type: 'text', required: true },
          { name: 'linked_project', label: 'Project', type: 'text' },
          { name: 'response_minutes', label: 'Response Time (min)', type: 'number', defaultValue: '60' },
          { name: 'resolution_minutes', label: 'Resolution Time (min)', type: 'number', defaultValue: '480' },
          { name: 'working_hours_type', label: 'Working Hours', type: 'select', defaultValue: 'Business Hours', options: [
            { value: 'Business Hours', label: 'Business Hours' },
            { value: '24x7', label: '24x7' },
            { value: 'Custom', label: 'Custom' },
          ]},
        ]}
        onConfirm={async (values) => {
          setCreateBusy(true);
          try {
            await callApi('/api/sla-profiles', { method: 'POST', body: {
              ...values,
              response_minutes: parseInt(values.response_minutes) || 60,
              resolution_minutes: parseInt(values.resolution_minutes) || 480,
            }});
            setShowCreate(false);
            await load();
          } catch { /* handled */ }
          finally { setCreateBusy(false); }
        }}
        onCancel={() => setShowCreate(false)}
      />
    </>
  );
}
