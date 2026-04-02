'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Plus, RefreshCw } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import type { StatItem } from '@/components/shells/RegisterPage';
import {
  type SiteRecord,
  type Survey,
  type SiteSurveyRow,
  type SurveyCreateForm,
  EMPTY_CREATE_FORM,
  buildSiteSurveyRows,
  computeSurveyStats,
  prefillFromSite,
} from '@/components/survey/survey-types';

// ── Page ───────────────────────────────────────────────────────────────────

export default function EngineeringSurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ── Filters ──
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('All');

  // ── Create form ──
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<SurveyCreateForm>(EMPTY_CREATE_FORM);

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const [surveyRes, siteRes] = await Promise.all([
        fetch('/api/surveys').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/sites').then((r) => r.json()).catch(() => ({ data: [] })),
      ]);
      setSurveys(Array.isArray(surveyRes.data) ? surveyRes.data : []);
      setSites(Array.isArray(siteRes.data) ? siteRes.data : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load survey workspace');
      setSurveys([]);
      setSites([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────

  const projectOptions = useMemo(
    () =>
      Array.from(
        new Set(sites.map((s) => s.linked_project).filter((p): p is string => Boolean(p))),
      ).sort(),
    [sites],
  );

  useEffect(() => {
    if (selectedProject === 'ALL' && projectOptions.length === 1) {
      setSelectedProject(projectOptions[0] as string);
    }
  }, [projectOptions, selectedProject]);

  const visibleSites = useMemo(
    () => (selectedProject === 'ALL' ? sites : sites.filter((s) => s.linked_project === selectedProject)),
    [selectedProject, sites],
  );

  const siteSurveyRows = useMemo(
    () => buildSiteSurveyRows(visibleSites, surveys),
    [visibleSites, surveys],
  );

  const filteredRows = useMemo(() => {
    if (statusFilter === 'All') return siteSurveyRows;
    return siteSurveyRows.filter(
      ({ latestSurvey }) => (latestSurvey?.status || 'Pending') === statusFilter,
    );
  }, [siteSurveyRows, statusFilter]);

  const stats = useMemo(() => computeSurveyStats(siteSurveyRows), [siteSurveyRows]);

  const needsAttention = useMemo(
    () =>
      siteSurveyRows
        .filter((row) => (row.latestSurvey?.status || 'Pending') !== 'Completed')
        .slice(0, 5),
    [siteSurveyRows],
  );

  const createableSites = useMemo(
    () =>
      selectedProject === 'ALL'
        ? visibleSites
        : sites.filter((s) => s.linked_project === selectedProject),
    [selectedProject, sites, visibleSites],
  );

  const statItems: StatItem[] = [
    { label: 'Total Sites', value: stats.total, variant: 'info' },
    { label: 'Completed', value: stats.completed, variant: 'success' },
    { label: 'In Progress', value: stats.inProgress, variant: 'warning' },
    { label: 'Pending', value: stats.pending, variant: 'default' },
  ];

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.linked_site.trim()) {
      setError('Select a site first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to create survey');
      }
      setIsCreateOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
      await loadData(false);
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
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to update survey');
      }
      await loadData(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update survey');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <RegisterPage
      title="Engineering Survey Workspace"
      description="Project and site scoped survey planning. This is not a tender-first free-form register."
      loading={loading}
      error={error || undefined}
      empty={filteredRows.length === 0 && !loading && !error}
      onRetry={() => loadData()}
      emptyTitle="No survey sites"
      emptyDescription="No sites found for the current filter."
      stats={statItems}
      headerActions={
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary"
            onClick={() => setIsCreateOpen((c) => !c)}
          >
            <Plus className="h-4 w-4" />
            {isCreateOpen ? 'Close Form' : 'Schedule Survey'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => void loadData(false)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      }
      filterBar={
        <>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="input w-full sm:w-64"
          >
            <option value="ALL">All projects</option>
            {projectOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <span className="ml-auto text-sm text-[var(--text-muted)]">
            {visibleSites.length} site{visibleSites.length !== 1 ? 's' : ''} in scope
          </span>
        </>
      }
    >
      {/* ── Create form (inline) ── */}
      {isCreateOpen && (
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">Schedule New Survey</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={createForm.linked_site}
              onChange={(e) => {
                const selected = createableSites.find((s) => s.name === e.target.value);
                if (selected) {
                  setCreateForm(prefillFromSite(selected));
                } else {
                  setCreateForm(EMPTY_CREATE_FORM);
                }
              }}
              className="input"
            >
              <option value="">Select site</option>
              {createableSites.map((s) => (
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
              placeholder="Site constraints, route notes, power feasibility, photos summary"
              className="input min-h-24 md:col-span-2"
            />
            <div className="flex justify-end gap-2 md:col-span-2">
              <button className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? 'Saving\u2026' : 'Create Survey'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Needs Attention + Register grid ── */}
      <div className="grid grid-cols-1 gap-0 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Needs Attention */}
        <div className="border-b border-[var(--border-subtle)] p-5 xl:border-b-0 xl:border-r">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">Needs Attention</h3>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No pending survey follow-ups.</p>
          ) : (
            <div className="space-y-3">
              {needsAttention.map(({ site, latestSurvey }) => (
                <div key={site.name} className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <div className="font-medium text-gray-900">{site.site_name || site.name}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {site.linked_project || 'No project'}
                    {site.linked_tender ? ` \u2022 ${site.linked_tender}` : ''}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {latestSurvey?.summary || 'Waiting for field update.'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Register table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Project</th>
                <th>Tender</th>
                <th>Latest Survey</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ site, latestSurvey }) => (
                <tr key={site.name}>
                  <td>
                    <div className="font-medium text-gray-900">{site.site_name || site.name}</div>
                    <div className="text-xs text-gray-500">{site.site_code || site.name}</div>
                  </td>
                  <td>{site.linked_project || '-'}</td>
                  <td>{site.linked_tender || '-'}</td>
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
                  <td>
                    {latestSurvey ? (
                      <select
                        value={latestSurvey.status || 'Pending'}
                        onChange={(e) => void handleStatusUpdate(latestSurvey.name, e.target.value)}
                        className="input py-1 text-sm"
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
                      <Link
                        href={`/engineering/survey/${encodeURIComponent(latestSurvey.name)}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                        onClick={() => {
                          setCreateForm(prefillFromSite(site));
                          setIsCreateOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Create
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RegisterPage>
  );
}
