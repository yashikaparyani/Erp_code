'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Filter, X, Plus, Eye, Search, MapPin, FileText } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import LinkPicker from '@/components/ui/LinkPicker';

interface Site {
  name: string;
  site_code?: string;
  site_name?: string;
  status?: string;
  linked_project?: string;
  linked_tender?: string;
  latitude?: string;
  longitude?: string;
}

const STATUS_OPTIONS = ['PLANNED', 'NOT_STARTED', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'COMMISSIONED', 'BLOCKED'];

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toUpperCase();
  const style =
    s === 'COMMISSIONED' || s === 'COMPLETED' ? 'badge-success'
    : s === 'ACTIVE' || s === 'IN_PROGRESS' ? 'badge-info'
    : s === 'BLOCKED' ? 'badge-error'
    : s === 'PLANNED' || s === 'NOT_STARTED' ? 'badge-gray'
    : 'badge-warning';
  return <span className={`badge ${style}`}>{s.replace(/_/g, ' ') || 'N/A'}</span>;
}

export default function SiteRegisterPage() {
  const searchParams = useSearchParams();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState(searchParams?.get('project') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || '');

  const abortRef = useRef<AbortController | null>(null);

  const loadSites = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set('project', projectFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/sites?${params}`, { signal: controller.signal });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to load sites');
      setSites(payload.data || []);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  }, [projectFilter, statusFilter]);

  useEffect(() => {
    loadSites();
    return () => { abortRef.current?.abort(); };
  }, [loadSites]);

  const handleCreate = async (values: Record<string, string>) => {
    if (!values.site_code?.trim() || !values.site_name?.trim() || !values.linked_project?.trim()) {
      setError('Site Code, Site Name, and Linked Project are required.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to create site');
      setShowCreate(false);
      await loadSites();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create site');
    } finally {
      setCreating(false);
    }
  };

  // Client-side search filter on top of server filters
  const filtered = sites.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.site_code || '').toLowerCase().includes(q) ||
      (s.site_name || '').toLowerCase().includes(q) ||
      (s.linked_project || '').toLowerCase().includes(q)
    );
  });

  // Compute stats
  const statusCounts = sites.reduce((acc, s) => {
    const st = s.status || 'UNKNOWN';
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const clearFilters = () => {
    setSearchQuery('');
    setProjectFilter('');
    setStatusFilter('');
  };

  const hasFilters = searchQuery || projectFilter || statusFilter;

  return (
    <RegisterPage
      title="Site Register"
      description="Browse, filter, and manage all execution sites in one place."
      loading={loading}
      error={error}
      onRetry={loadSites}
      stats={[
        { label: 'Total Sites', value: sites.length },
        { label: 'Active / In Progress', value: (statusCounts['ACTIVE'] || 0) + (statusCounts['IN_PROGRESS'] || 0), variant: 'info' as const },
        { label: 'Completed', value: (statusCounts['COMPLETED'] || 0) + (statusCounts['COMMISSIONED'] || 0), variant: 'success' as const },
        { label: 'Blocked', value: statusCounts['BLOCKED'] || 0, variant: statusCounts['BLOCKED'] ? 'error' as const : 'default' as const },
      ]}
      headerActions={
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Site
        </button>
      }
      filterBar={
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              className="input pl-8 w-56"
              placeholder="Search sites…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <LinkPicker
              entity="project"
              value={projectFilter}
              onChange={setProjectFilter}
              placeholder="Project filter…"
              className="w-44"
            />
          </div>
          <select
            className="input w-40"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      }
    >
      {/* Site table */}
      <div className="shell-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Execution Sites</h3>
          <span className="text-xs text-gray-500">{filtered.length} of {sites.length} sites</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th>Site ID</th>
                <th>Site Name</th>
                <th>Project</th>
                <th>Tender</th>
                <th>Coordinates</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    {sites.length === 0 ? 'No sites have been uploaded yet. Create one here or use the bulk-upload flow from Execution.' : 'No sites match your current filters.'}
                  </td>
                </tr>
              ) : filtered.map(site => (
                <tr key={site.name}>
                  <td>
                    <Link
                      href={`/execution/sites/${encodeURIComponent(site.name)}`}
                      className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      {site.name}
                    </Link>
                    <div className="text-xs text-gray-500">{site.site_code}</div>
                  </td>
                  <td className="font-medium text-gray-900">{site.site_name || '-'}</td>
                  <td>
                    {site.linked_project ? (
                      <Link
                        href={`/projects/${encodeURIComponent(site.linked_project)}?tab=sites`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {site.linked_project}
                      </Link>
                    ) : '-'}
                  </td>
                  <td className="text-gray-600 text-sm">{site.linked_tender || '-'}</td>
                  <td>
                    <div className="text-xs text-gray-600 font-mono">
                      {site.latitude && site.longitude
                        ? `${site.latitude}, ${site.longitude}`
                        : '-'}
                    </div>
                  </td>
                  <td><StatusBadge status={site.status} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/execution/sites/${encodeURIComponent(site.name)}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </Link>
                      <Link
                        href={`/sites/${encodeURIComponent(site.name)}/dossier`}
                        className="text-violet-600 hover:text-violet-800 text-sm font-medium flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Dossier
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Site Modal */}
      <FormModal
        open={showCreate}
        title="Create Execution Site"
        description="Add a new site to the execution register."
        size="lg"
        busy={creating}
        confirmLabel="Create Site"
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
        fields={[
          { name: 'site_code', label: 'Site Code', type: 'text', required: true, placeholder: 'e.g. SITE-001' },
          { name: 'site_name', label: 'Site Name', type: 'text', required: true, placeholder: 'e.g. Sector 17 Control Room' },
          { name: 'linked_project', label: 'Linked Project', type: 'link', linkEntity: 'project' as const, required: true },
          { name: 'linked_tender', label: 'Linked Tender', type: 'link', linkEntity: 'tender' as const },
          { name: 'status', label: 'Status', type: 'select', defaultValue: 'PLANNED', options: STATUS_OPTIONS.map(s => ({ value: s, label: s.replace(/_/g, ' ') })) },
          { name: 'address', label: 'Address', type: 'text' },
          { name: 'latitude', label: 'Latitude', type: 'text', placeholder: '28.6139' },
          { name: 'longitude', label: 'Longitude', type: 'text', placeholder: '77.2090' },
        ]}
      />
    </RegisterPage>
  );
}
