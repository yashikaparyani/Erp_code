'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import LinkPicker from '@/components/ui/LinkPicker';

interface ClientSignoff {
  name: string;
  linked_project?: string;
  linked_site?: string;
  signoff_type?: string;
  signoff_date?: string;
  signed_by_client?: string;
  status?: string;
  attachment?: string;
  remarks?: string;
}

const STATUS_CLASSES: Record<string, string> = {
  Pending: 'badge-warning',
  Signed: 'badge-success',
  Approved: 'badge-success',
};

export default function ClientSignoffsPage() {
  const [rows, setRows] = useState<ClientSignoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (projectFilter) params.set('project', projectFilter);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch(`/api/execution/commissioning/client-signoffs${qs}`);
      setRows(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load signoffs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, projectFilter]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (name: string, action: string) => {
    setActionBusy(name);
    setError('');
    try {
      const res = await fetch('/api/execution/commissioning/client-signoffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionBusy('');
    }
  };

  const pending = rows.filter(r => r.status === 'Pending').length;
  const signed = rows.filter(r => r.status === 'Signed').length;
  const approved = rows.filter(r => r.status === 'Approved').length;

  return (
    <RegisterPage
      title="Client Signoffs"
      description="Track client sign-off approvals for commissioned sites."
      loading={loading}
      error={error}
      empty={!loading && rows.length === 0}
      emptyTitle="No signoffs"
      emptyDescription="No client signoffs found"
      onRetry={load}
      stats={[
        { label: 'Total', value: rows.length },
        { label: 'Pending', value: pending, variant: 'warning' as const },
        { label: 'Signed', value: signed, variant: 'success' as const },
        { label: 'Approved', value: approved, variant: 'success' as const },
      ]}
      filterBar={(
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Signed">Signed</option>
            <option value="Approved">Approved</option>
          </select>
          <LinkPicker entity="project" value={projectFilter} onChange={setProjectFilter} placeholder="Filter by project…" className="w-56" />
        </div>
      )}
      headerActions={
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Signoff</button>
      }
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Project / Site</th>
            <th>Type</th>
            <th>Signed By Client</th>
            <th>Date</th>
            <th>Status</th>
            <th>Attachment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={8} className="text-center py-8 text-gray-500">No signoffs found</td></tr>
          ) : rows.map(s => (
            <tr key={s.name}>
              <td><Link href={`/execution/commissioning/client-signoffs/${encodeURIComponent(s.name)}`} className="font-medium text-blue-700 hover:underline">{s.name}</Link></td>
              <td>
                <div className="text-sm text-gray-900">{s.linked_project || '-'}</div>
                <div className="text-xs text-gray-500">{s.linked_site || ''}</div>
              </td>
              <td className="text-gray-900">{s.signoff_type || '-'}</td>
              <td>
                <div className="text-sm text-gray-900">{s.signed_by_client || '-'}</div>
                {s.remarks ? <div className="text-xs text-gray-500 max-w-[220px] truncate">{s.remarks}</div> : null}
              </td>
              <td className="text-gray-600">{s.signoff_date || '-'}</td>
              <td><span className={`badge ${STATUS_CLASSES[s.status || ''] || 'badge-gray'}`}>{s.status || '-'}</span></td>
              <td>
                {s.attachment ? (
                  <a href={`/api/files?url=${encodeURIComponent(s.attachment)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </a>
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </td>
              <td>
                <div className="flex gap-1 flex-wrap">
                  {s.status === 'Pending' && (
                    <button disabled={actionBusy === s.name} onClick={() => runAction(s.name, 'sign')} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50">Sign</button>
                  )}
                  {s.status === 'Signed' && (
                    <button disabled={actionBusy === s.name} onClick={() => runAction(s.name, 'approve')} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50">Approve</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <FormModal
        open={showCreate}
        title="New Client Signoff"
        description="Record a new client signoff for a commissioned site."
        busy={createBusy}
        confirmLabel="Create"
        fields={[
          { name: 'signoff_type', label: 'Signoff Type', type: 'text', required: true, placeholder: 'e.g. SAT Acceptance' },
          { name: 'linked_project', label: 'Project', type: 'link', linkEntity: 'project' as const, placeholder: 'Search project…', required: true },
          { name: 'linked_site', label: 'Site', type: 'link', linkEntity: 'site' as const, placeholder: 'Search site…' },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ]}
        onConfirm={async (values) => {
          setCreateBusy(true);
          try {
            const res = await fetch('/api/execution/commissioning/client-signoffs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
            setShowCreate(false);
            await load();
          } catch (e) {
            throw e;
          } finally {
            setCreateBusy(false);
          }
        }}
        onCancel={() => setShowCreate(false)}
      />
    </RegisterPage>
  );
}
