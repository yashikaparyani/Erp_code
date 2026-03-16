'use client';
import { useEffect, useState } from 'react';
import { Plus, MapPin, CheckCircle2, Clock, FileText, Eye, Trash2 } from 'lucide-react';

interface Survey {
  name: string;
  site_name?: string;
  linked_tender?: string;
  coordinates?: string;
  surveyed_by?: string;
  survey_date?: string;
  summary?: string;
  status?: string;
}

interface SurveyStats {
  total?: number;
  completed?: number;
  in_progress?: number;
  pending?: number;
}

export default function SurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [stats, setStats] = useState<SurveyStats>({});
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionTender, setCompletionTender] = useState('');
  const [completionResult, setCompletionResult] = useState<string>('');
  const [createForm, setCreateForm] = useState({
    linked_tender: '',
    site_name: '',
    status: 'Pending',
    survey_date: '',
    coordinates: '',
    summary: '',
  });

  const loadSurveyData = async () => {
    setLoading(true);
    try {
      const [surveyRes, statsRes] = await Promise.all([
        fetch('/api/surveys').then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/surveys/stats').then(r => r.json()).catch(() => ({ data: {} })),
      ]);

      setSurveys(surveyRes.data || []);
      setStats(statsRes.data || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveyData();
  }, []);

  const handleCreateSurvey = async () => {
    if (!createForm.linked_tender.trim() || !createForm.site_name.trim()) {
      alert('Linked Tender and Site Name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const result = await response.json();
      if (!result.success) {
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
      await loadSurveyData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create survey');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSurvey = async (name: string) => {
    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(name)}`);
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch survey');
      }

      const survey = result.data || {};
      alert(
        [
          `Survey: ${survey.name || name}`,
          `Tender: ${survey.linked_tender || '-'}`,
          `Site: ${survey.site_name || '-'}`,
          `Status: ${survey.status || '-'}`,
          `Survey Date: ${survey.survey_date || '-'}`,
          `Surveyed By: ${survey.surveyed_by || '-'}`,
        ].join('\n')
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to fetch survey');
    }
  };

  const handleStatusUpdate = async (name: string, status: string) => {
    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to update survey');
      }
      await loadSurveyData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update survey');
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
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete survey');
      }
      await loadSurveyData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete survey');
    }
  };

  const handleCheckCompletion = async () => {
    if (!completionTender.trim()) {
      alert('Enter tender id/name first.');
      return;
    }

    try {
      const response = await fetch(`/api/surveys/check-complete?tender=${encodeURIComponent(completionTender)}`);
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to check completion');
      }

      const data = result.data || {};
      setCompletionResult(
        data.complete
          ? `Complete: ${data.completed}/${data.total} surveys done`
          : `Not complete: ${data.completed}/${data.total || 0} done, ${data.pending || 0} pending`
      );
    } catch (error) {
      setCompletionResult(error instanceof Error ? error.message : 'Failed to check completion');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Survey</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Site survey forms, photography, and feasibility reports</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          New Survey
        </button>
      </div>

      {isCreateOpen && (
        <div className="card mb-4 sm:mb-6">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Create Survey</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            <input
              value={createForm.linked_tender}
              onChange={(e) => setCreateForm(prev => ({ ...prev, linked_tender: e.target.value }))}
              placeholder="Linked Tender (required)"
              className="px-3 py-2 border border-gray-300 rounded"
            />
            <input
              value={createForm.site_name}
              onChange={(e) => setCreateForm(prev => ({ ...prev, site_name: e.target.value }))}
              placeholder="Site Name (required)"
              className="px-3 py-2 border border-gray-300 rounded"
            />
            <input
              type="date"
              value={createForm.survey_date}
              onChange={(e) => setCreateForm(prev => ({ ...prev, survey_date: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded"
            />
            <select
              value={createForm.status}
              onChange={(e) => setCreateForm(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <input
              value={createForm.coordinates}
              onChange={(e) => setCreateForm(prev => ({ ...prev, coordinates: e.target.value }))}
              placeholder="Coordinates"
              className="px-3 py-2 border border-gray-300 rounded sm:col-span-2"
            />
            <textarea
              value={createForm.summary}
              onChange={(e) => setCreateForm(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Summary"
              className="px-3 py-2 border border-gray-300 rounded sm:col-span-2"
            />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button className="px-3 py-2 border border-gray-300 rounded" onClick={() => setIsCreateOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateSurvey} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Survey'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-4 sm:mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Check Survey Completion By Tender</h3>
        </div>
        <div className="p-4 flex flex-col sm:flex-row gap-2">
          <input
            value={completionTender}
            onChange={(e) => setCompletionTender(e.target.value)}
            placeholder="Enter tender id/name"
            className="px-3 py-2 border border-gray-300 rounded flex-1"
          />
          <button className="btn btn-primary" onClick={handleCheckCompletion}>Check</button>
        </div>
        {completionResult && <div className="px-4 pb-4 text-sm text-gray-700">{completionResult}</div>}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? surveys.length}</div>
              <div className="stat-label">Total Surveys</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">All sites</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">{stats.completed ?? 0}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">Ready for engineering</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">{stats.in_progress ?? 0}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Survey in progress</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="stat-value">{stats.pending ?? 0}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Awaiting action</div>
        </div>
      </div>

      {/* Survey Records Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Survey Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Survey ID</th>
                <th>Tender</th>
                <th>Site Name</th>
                <th>Coordinates</th>
                <th>Surveyor</th>
                <th>Date</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {surveys.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-500">No surveys found</td></tr>
              ) : surveys.map(survey => (
                <tr key={survey.name}>
                  <td>
                    <div className="font-medium text-gray-900">{survey.name}</div>
                    <div className="text-xs text-gray-500">{survey.site_name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{survey.linked_tender || '-'}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">{survey.site_name || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600 font-mono">{survey.coordinates}</div>
                  </td>
                  <td>
                    <div className="text-gray-900">{survey.surveyed_by || '-'}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{survey.survey_date || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900 max-w-xs truncate">{survey.summary || '-'}</div>
                  </td>
                  <td>
                    <select
                      value={survey.status || 'Pending'}
                      onChange={(e) => handleStatusUpdate(survey.name, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1 mr-3"
                      onClick={() => handleViewSurvey(survey.name)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 text-sm font-medium inline-flex items-center gap-1"
                      onClick={() => handleDeleteSurvey(survey.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}