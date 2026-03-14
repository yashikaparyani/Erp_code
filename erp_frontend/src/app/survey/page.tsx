'use client';
import { useEffect, useState } from 'react';
import { Plus, MapPin, CheckCircle2, Clock, FileText, Eye } from 'lucide-react';

interface Survey {
  name: string;
  site_name?: string;
  location?: string;
  tender?: string;
  tender_title?: string;
  coordinates?: string;
  surveyor?: string;
  survey_date?: string;
  camera_count?: number;
  fiber_length?: number;
  status?: string;
}

interface SurveyStats {
  total?: number;
  approved?: number;
  pending?: number;
  draft?: number;
}

export default function SurveyPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [stats, setStats] = useState<SurveyStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/surveys').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/surveys/stats').then(r => r.json()).catch(() => ({ data: {} })),
    ]).then(([surveyRes, statsRes]) => {
      setSurveys(surveyRes.data || []);
      setStats(statsRes.data || {});
    }).finally(() => setLoading(false));
  }, []);

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
        <button className="btn btn-primary w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          New Survey
        </button>
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
              <div className="stat-value">{stats.approved ?? 0}</div>
              <div className="stat-label">Approved</div>
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
              <div className="stat-value">{stats.pending ?? 0}</div>
              <div className="stat-label">Pending Review</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Awaiting approval</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="stat-value">{stats.draft ?? 0}</div>
              <div className="stat-label">Draft</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">In progress</div>
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
                <th>Location</th>
                <th>Tender</th>
                <th>Coordinates</th>
                <th>Surveyor</th>
                <th>Date</th>
                <th>Scope</th>
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
                    <div className="font-medium text-gray-900">{survey.location}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{survey.tender}</div>
                    <div className="text-xs text-gray-500 max-w-xs truncate">{survey.tender_title}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600 font-mono">{survey.coordinates}</div>
                  </td>
                  <td>
                    <div className="text-gray-900">{survey.surveyor}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{survey.survey_date}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{survey.camera_count} cameras</div>
                    <div className="text-xs text-gray-500">{survey.fiber_length ? `${survey.fiber_length} KM` : '-'}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      survey.status === 'Approved' ? 'badge-success' : 
                      survey.status === 'Pending Review' ? 'badge-warning' : 
                      'badge-gray'
                    }`}>
                      {survey.status}
                    </span>
                  </td>
                  <td>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      View Details →
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