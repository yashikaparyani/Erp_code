'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Clock3, MapPin, Plus, RefreshCw, Search } from 'lucide-react';

type Survey = {
  name: string;
  site_name?: string;
  linked_tender?: string;
  coordinates?: string;
  surveyed_by?: string;
  survey_date?: string;
  summary?: string;
  status?: string;
};

type SurveyStats = {
  total?: number;
  completed?: number;
  in_progress?: number;
  pending?: number;
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function EngineeringSurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [stats, setStats] = useState<SurveyStats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionTender, setCompletionTender] = useState('');
  const [completionResult, setCompletionResult] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState({
    linked_tender: '',
    site_name: '',
    status: 'Pending',
    survey_date: '',
    coordinates: '',
    summary: '',
  });

  const loadSurveyData = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [surveyRes, statsRes] = await Promise.all([
        fetch('/api/surveys').then((response) => response.json()).catch(() => ({ data: [] })),
        fetch('/api/surveys/stats').then((response) => response.json()).catch(() => ({ data: {} })),
      ]);

      setSurveys(surveyRes.data || []);
      setStats(statsRes.data || {});
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load survey workspace');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSurveyData();
  }, []);

  const filteredSurveys = useMemo(() => {
    if (statusFilter === 'All') {
      return surveys;
    }
    return surveys.filter((survey) => (survey.status || 'Pending') === statusFilter);
  }, [statusFilter, surveys]);

  const tenderAttentionList = useMemo(
    () => surveys.filter((survey) => (survey.status || 'Pending') !== 'Completed').slice(0, 5),
    [surveys],
  );

  const handleCreateSurvey = async () => {
    if (!createForm.linked_tender.trim() || !createForm.site_name.trim()) {
      setError('Linked Tender and Site Name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create survey');
      }

      setIsCreateOpen(false);
      setCreateForm({
        linked_tender: '',
        site_name: '',
        status: 'Pending',
        survey_date: '',
        coordinates: '',
        summary: '',
      });
      await loadSurveyData(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create survey');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (name: string, status: string) => {
    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update survey');
      }
      await loadSurveyData(false);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update survey');
    }
  };

  const handleDeleteSurvey = async (name: string) => {
    if (!confirm(`Delete survey ${name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete survey');
      }
      await loadSurveyData(false);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete survey');
    }
  };

  const handleCheckCompletion = async () => {
    if (!completionTender.trim()) {
      setCompletionResult('Enter a tender id or name first.');
      return;
    }

    try {
      const response = await fetch(`/api/surveys/check-complete?tender=${encodeURIComponent(completionTender)}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to check completion');
      }

      const data = result.data || {};
      setCompletionResult(
        data.complete
          ? `Complete: ${data.completed}/${data.total} surveys done`
          : `Not complete: ${data.completed}/${data.total || 0} done, ${data.pending || 0} pending`,
      );
      setError('');
    } catch (completionError) {
      setCompletionResult(
        completionError instanceof Error ? completionError.message : 'Failed to check completion',
      );
    }
  };

  return (
    <div>
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-900 via-teal-900 to-sky-900 p-6 text-white shadow-sm mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">Field Planning</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Engineering Survey Queue</h1>
            <p className="mt-2 text-sm text-emerald-50">
              This route now has its own engineering-facing value: plan surveys, track site readiness, and check tender completion without bouncing to the generic survey module.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/survey" className="btn bg-white/10 text-white hover:bg-white/20 border-0">
              Open Full Survey Module
            </Link>
            <button
              className="btn bg-emerald-300 text-slate-900 hover:bg-emerald-200 border-0"
              onClick={() => setIsCreateOpen((current) => !current)}
            >
              <Plus className="w-4 h-4" />
              {isCreateOpen ? 'Close Form' : 'Schedule Survey'}
            </button>
            <button
              className="btn bg-white/10 text-white hover:bg-white/20 border-0"
              onClick={() => loadSurveyData(false)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isCreateOpen ? (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Schedule New Survey</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <input
              value={createForm.linked_tender}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, linked_tender: event.target.value }))}
              placeholder="Linked Tender"
              className="input"
            />
            <input
              value={createForm.site_name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, site_name: event.target.value }))}
              placeholder="Site Name"
              className="input"
            />
            <input
              type="date"
              value={createForm.survey_date}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, survey_date: event.target.value }))}
              className="input"
            />
            <select
              value={createForm.status}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, status: event.target.value }))}
              className="input"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <input
              value={createForm.coordinates}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, coordinates: event.target.value }))}
              placeholder="Coordinates"
              className="input md:col-span-2"
            />
            <textarea
              value={createForm.summary}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, summary: event.target.value }))}
              placeholder="Site constraints, route notes, power feasibility, photos summary"
              className="input min-h-24 md:col-span-2"
            />
            <div className="md:col-span-2 flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateSurvey} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Create Survey'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
              <MapPin className="h-5 w-5 text-sky-700" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? surveys.length}</div>
              <div className="stat-label">Total Surveys</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <div className="stat-value">{stats.completed ?? 0}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Clock3 className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <div className="stat-value">{stats.in_progress ?? 0}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <ClipboardList className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <div className="stat-value">{stats.pending ?? 0}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr] mb-6">
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Tender Completion Check</h2>
            </div>
            <div className="card-body">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={completionTender}
                  onChange={(event) => setCompletionTender(event.target.value)}
                  placeholder="Tender id or tender name"
                  className="input flex-1"
                />
                <button className="btn btn-primary" onClick={handleCheckCompletion}>
                  <Search className="w-4 h-4" />
                  Check
                </button>
              </div>
              {completionResult ? <p className="mt-3 text-sm text-gray-600">{completionResult}</p> : null}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Needs Attention</h2>
            </div>
            <div className="card-body space-y-3">
              {tenderAttentionList.length === 0 ? (
                <p className="text-sm text-gray-500">No pending survey follow-ups.</p>
              ) : (
                tenderAttentionList.map((survey) => (
                  <div key={survey.name} className="rounded-xl border border-slate-100 p-3">
                    <div className="font-medium text-gray-900">{survey.site_name || survey.name}</div>
                    <div className="mt-1 text-xs text-gray-500">{survey.linked_tender || 'No tender linked'}</div>
                    <div className="mt-2 text-sm text-gray-600">{survey.summary || 'Waiting for field update.'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Survey Register</h2>
              <p className="text-sm text-gray-500">Engineering-focused register with quick status control.</p>
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="input w-full sm:w-48"
            >
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-gray-500">Loading surveys...</div>
            ) : filteredSurveys.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No surveys found for this filter.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Survey</th>
                    <th>Tender</th>
                    <th>Date</th>
                    <th>Coordinates</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSurveys.map((survey) => (
                    <tr key={survey.name}>
                      <td>
                        <div className="font-medium text-gray-900">{survey.site_name || survey.name}</div>
                        <div className="text-xs text-gray-500">{survey.surveyed_by || 'Unassigned surveyor'}</div>
                      </td>
                      <td>
                        <div className="text-sm text-gray-900">{survey.linked_tender || '-'}</div>
                        <div className="text-xs text-gray-500">{survey.summary || 'No summary yet'}</div>
                      </td>
                      <td>{formatDate(survey.survey_date)}</td>
                      <td className="text-sm text-gray-600">{survey.coordinates || '-'}</td>
                      <td>
                        <select
                          value={survey.status || 'Pending'}
                          onChange={(event) => handleStatusUpdate(survey.name, event.target.value)}
                          className="input py-1 text-sm"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteSurvey(survey.name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
