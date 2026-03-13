'use client';
import { Plus, MapPin, CheckCircle2, Clock, FileText, Eye } from 'lucide-react';

const surveys = [
  {
    id: 'SUR-001',
    siteId: 'SITE-001',
    location: 'Rajwada Square Junction',
    tender: 'TEN-2024-001',
    tenderName: 'Indore Smart City Surveillance Phase II',
    coordinates: '22.7196° N, 75.8577° E',
    surveyor: 'Amit Patel',
    date: '15/1/2024',
    cameras: 8,
    fiber: '1.2 KM',
    status: 'Approved',
  },
  {
    id: 'SUR-002',
    siteId: 'SITE-002',
    location: 'Treasure Island Mall Area',
    tender: 'TEN-2024-001',
    tenderName: 'Indore Smart City Surveillance Phase II',
    coordinates: '22.7533° N, 75.8937° E',
    surveyor: 'Amit Patel',
    date: '18/1/2024',
    cameras: 12,
    fiber: '2.5 KM',
    status: 'Approved',
  },
  {
    id: 'SUR-003',
    siteId: 'SITE-003',
    location: 'Geeta Bhawan Square',
    tender: 'TEN-2024-001',
    tenderName: 'Indore Smart City Surveillance Phase II',
    coordinates: '22.7242° N, 75.8721° E',
    surveyor: 'Rahul Singh',
    date: '22/1/2024',
    cameras: 6,
    fiber: '0.8 KM',
    status: 'Pending Review',
  },
  {
    id: 'SUR-004',
    siteId: 'SITE-004',
    location: 'MR 10 Traffic Signal',
    tender: 'TEN-2024-001',
    tenderName: 'Indore Smart City Surveillance Phase II',
    coordinates: '22.7482° N, 75.9063° E',
    surveyor: 'Amit Patel',
    date: '25/1/2024',
    cameras: 4,
    fiber: '0.5 KM',
    status: 'Approved',
  },
];

export default function SurveyPage() {
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
              <div className="stat-value">4</div>
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
              <div className="stat-value">3</div>
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
              <div className="stat-value">1</div>
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
              <div className="stat-value">0</div>
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
              {surveys.map(survey => (
                <tr key={survey.id}>
                  <td>
                    <div className="font-medium text-gray-900">{survey.id}</div>
                    <div className="text-xs text-gray-500">{survey.siteId}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">{survey.location}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{survey.tender}</div>
                    <div className="text-xs text-gray-500 max-w-xs truncate">{survey.tenderName}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600 font-mono">{survey.coordinates}</div>
                  </td>
                  <td>
                    <div className="text-gray-900">{survey.surveyor}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{survey.date}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{survey.cameras} cameras</div>
                    <div className="text-xs text-gray-500">{survey.fiber}</div>
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