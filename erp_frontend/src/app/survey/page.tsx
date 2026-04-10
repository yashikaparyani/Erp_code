'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, MapPin, Plus, Trash2 } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import type { StatItem } from '@/components/shells/RegisterPage';
import ActionModal from '@/components/ui/ActionModal';
import { usePermissions } from '@/context/PermissionContext';
import { useAuth } from '@/context/AuthContext';
import {
  type SiteRecord,
  type SiteSurveyRow,
  type SurveyCreateForm,
  EMPTY_CREATE_FORM,
  buildSiteSurveyRows,
  computeSurveyStats,
  prefillFromSite,
} from '@/components/survey/survey-types';

// ── Page ───────────────────────────────────────────────────────────────────

export default function SurveyPage() {
  const { permissions, isLoaded: isPermissionLoaded } = usePermissions();
  const { currentUser } = useAuth();
  const isDirector = (currentUser?.roles || []).includes('Director') || currentUser?.role === 'Director';
  const assignedProjects = useMemo(
    () => permissions?.user_context?.assigned_projects ?? [],
    [permissions?.user_context?.assigned_projects],
  );
  const assignedSiteNames = useMemo(
    () => permissions?.user_context?.assigned_sites ?? [],
    [permissions?.user_context?.assigned_sites],
  );

  const [rows, setRows] = useState<SiteSurveyRow[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Create form state ──
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<SurveyCreateForm>(EMPTY_CREATE_FORM);

  // ── Delete confirm ──
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!assignedProjects.length) {
      setRows([]);
      setSites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [surveyResults, siteResults] = await Promise.all([
        Promise.all(
          assignedProjects.map((project) =>
            fetch(`/api/surveys?project=${encodeURIComponent(project)}`)
              .then((r) => r.json())
              .catch(() => ({ data: [] })),
          ),
        ),
        Promise.all(
          assignedProjects.map((project) =>
            fetch(`/api/sites?project=${encodeURIComponent(project)}`)
              .then((r) => r.json())
              .catch(() => ({ data: [] })),
          ),
        ),
      ]);

      const rawSites: SiteRecord[] = siteResults.flatMap((r) =>
        Array.isArray(r.data) ? r.data : [],
      );
      const filteredSites = assignedSiteNames.length
        ? rawSites.filter(
            (s) =>
              assignedSiteNames.includes(s.name) ||
              assignedSiteNames.includes(s.site_name || ''),
          )
        : rawSites;

      const allowedSiteIds = new Set(filteredSites.map((s) => s.name));
      const allowedProjects = new Set(
        filteredSites.map((s) => s.linked_project).filter(Boolean),
      );

      const allSurveys = surveyResults.flatMap((r) =>
        Array.isArray(r.data) ? r.data : [],
      );
      const filteredSurveys = allSurveys.filter(
        (sv) =>
          (sv.linked_site && allowedSiteIds.has(sv.linked_site)) ||
          (sv.linked_project && allowedProjects.has(sv.linked_project)) ||
          (sv.needs_site_relink &&
            filteredSites.some(
              (site) =>
                (site.site_name || '').trim().toLowerCase() ===
                (sv.site_name || '').trim().toLowerCase(),
            )),
      );

      setSites(filteredSites);
      setRows(buildSiteSurveyRows(filteredSites, filteredSurveys));
      setError('');
    } catch (err) {
      setSites([]);
      setRows([]);
      setError(err instanceof Error ? err.message : 'Failed to load survey scope');
    } finally {
      setLoading(false);
    }
  }, [assignedProjects, assignedSiteNames]);

  useEffect(() => {
    if (isPermissionLoaded) void loadData();
  }, [isPermissionLoaded, loadData]);

  // ── Derived stats ────────────────────────────────────────────────────────

  const stats = useMemo(() => computeSurveyStats(rows), [rows]);

  const statItems: StatItem[] = [
    { label: 'Total Sites', value: stats.total, variant: 'info' },
    { label: 'Completed', value: stats.completed, variant: 'success' },
    { label: 'In Progress', value: stats.inProgress, variant: 'warning' },
    { label: 'Pending', value: stats.pending, variant: 'default' },
  ];

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.linked_site.trim() || !createForm.site_name.trim()) {
      setError('Please select an allotted site first.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to create survey');
      }
      setIsCreateOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create survey');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (name: string, status: string) => {
    try {
      const res = await fetch(`/api/surveys/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to update survey');
      }
      setError('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update survey');
    }
  };

  const handleDelete = async (name: string) => {
    try {
      const res = await fetch(`/api/surveys/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete survey');
      }
      setError('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete survey');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <RegisterPage
        title="Survey"
        description="Survey submission against the sites allotted to your project portfolio"
        loading={loading}
        error={error || undefined}
        empty={rows.length === 0 && !loading && !error}
        onRetry={loadData}
        emptyTitle="No allotted sites"
        emptyDescription="You have no projects or sites assigned yet."
        emptyIcon={<MapPin className="h-10 w-10" />}
        stats={statItems}
        headerActions={
          isDirector ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Director view: survey execution actions are disabled.
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Survey
            </button>
          )
        }
        filterBar={
          <>
            <span className="text-sm text-[var(--text-muted)]">
              Projects: <strong className="text-[var(--text-main)]">{assignedProjects.length ? assignedProjects.join(', ') : 'None'}</strong>
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              Sites: <strong className="text-[var(--text-main)]">{rows.length}</strong>
            </span>
          </>
        }
      >
        {/* ── Create form (inline) ── */}
        {!isDirector && isCreateOpen && (
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">Create Survey</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={createForm.linked_site}
                onChange={(e) => {
                  const selected = sites.find((s) => s.name === e.target.value);
                  if (selected) {
                    setCreateForm(prefillFromSite(selected));
                  } else {
                    setCreateForm(EMPTY_CREATE_FORM);
                  }
                }}
                className="input"
              >
                <option value="">Select allotted site</option>
                {sites.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.site_name || s.name}
                    {s.linked_project ? ` (${s.linked_project})` : ''}
                  </option>
                ))}
              </select>
              <input
                value={createForm.linked_tender}
                readOnly
                placeholder="Tender auto-fills from site"
                className="input bg-gray-50 text-gray-500"
              />
              <input
                value={createForm.site_name}
                readOnly
                placeholder="Site Name"
                className="input bg-gray-50 text-gray-500"
              />
              <input
                type="date"
                value={createForm.survey_date}
                onChange={(e) => setCreateForm((p) => ({ ...p, survey_date: e.target.value }))}
                className="input"
              />
              <select
                value={createForm.status}
                onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}
                className="input"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <input
                value={createForm.coordinates}
                onChange={(e) => setCreateForm((p) => ({ ...p, coordinates: e.target.value }))}
                placeholder="Coordinates"
                className="input"
              />
              <textarea
                value={createForm.summary}
                onChange={(e) => setCreateForm((p) => ({ ...p, summary: e.target.value }))}
                placeholder="Summary"
                className="input min-h-20 sm:col-span-2"
              />
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating\u2026' : 'Create Survey'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Project</th>
                <th>Tender</th>
                <th>Latest Survey</th>
                <th>Coordinates</th>
                <th>Surveyor</th>
                <th>Date</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ site, latestSurvey }) => (
                <tr key={site.name}>
                  <td>
                    <div className="font-medium text-gray-900">{site.site_name || site.name}</div>
                    <div className="text-xs text-gray-500">{site.site_code || site.name}</div>
                  </td>
                  <td className="text-sm text-gray-900">{site.linked_project || '-'}</td>
                  <td className="text-sm text-gray-900">{site.linked_tender || '-'}</td>
                  <td>
                    <div className="font-medium text-gray-900">
                      {latestSurvey?.name || 'Not started'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {latestSurvey?.needs_site_relink
                        ? 'Legacy survey needs site relink'
                        : latestSurvey
                          ? 'Survey record present'
                          : 'Create first survey'}
                    </div>
                  </td>
                  <td className="font-mono text-sm text-gray-600">
                    {latestSurvey?.coordinates || '-'}
                  </td>
                  <td className="text-gray-900">{latestSurvey?.surveyed_by || '-'}</td>
                  <td className="text-gray-600">{latestSurvey?.survey_date || '-'}</td>
                  <td>
                    <div className="max-w-xs truncate text-sm text-gray-900">
                      {latestSurvey?.summary || '-'}
                    </div>
                  </td>
                  <td>
                    {latestSurvey ? (
                      <select
                        value={latestSurvey.status || 'Pending'}
                        onChange={(e) => handleStatusUpdate(latestSurvey.name, e.target.value)}
                        className="input py-1 text-xs"
                        disabled={isDirector}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        Pending
                      </span>
                    )}
                  </td>
                  <td>
                    {latestSurvey ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/survey/${encodeURIComponent(latestSurvey.name)}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                        {!isDirector ? (
                          <button
                            className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"
                            onClick={() => setDeleteTarget(latestSurvey.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      !isDirector ? (
                        <button
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            setCreateForm(prefillFromSite(site));
                            setIsCreateOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Create
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">View only</span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      {/* ── Delete confirm ── */}
      <ActionModal
        open={deleteTarget !== null}
        title="Delete Survey"
        description={`Delete survey ${deleteTarget}?`}
        confirmLabel="Delete"
        variant="danger"
        fields={[]}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
