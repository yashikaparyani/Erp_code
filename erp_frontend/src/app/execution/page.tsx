'use client';
import { Plus, Wrench, Camera, Activity, CheckCircle2, Clock, Eye, AlertTriangle } from 'lucide-react';

const siteExecutions = [
  {
    id: 'EXE-001',
    name: 'Rajwada Square Junction',
    siteId: 'SITE-001',
    surveyId: 'SUR-001',
    engineer: 'Amit Patel',
    progress: 85,
    camerasInstalled: 7,
    camerasTotal: 8,
    fiberLaid: 1.1,
    fiberTotal: 1.2,
    startDate: '1/3/2024',
    targetDate: '15/4/2024',
    status: 'In Progress',
  },
  {
    id: 'EXE-002',
    name: 'Treasure Island Mall Area',
    siteId: 'SITE-002',
    surveyId: 'SUR-002',
    engineer: 'Vikram Singh',
    progress: 45,
    camerasInstalled: 5,
    camerasTotal: 12,
    fiberLaid: 1.2,
    fiberTotal: 2.5,
    startDate: '10/3/2024',
    targetDate: '20/5/2024',
    status: 'In Progress',
  },
  {
    id: 'EXE-003',
    name: 'MR 10 Traffic Signal',
    siteId: 'SITE-004',
    surveyId: 'SUR-004',
    engineer: 'Amit Patel',
    progress: 0,
    camerasInstalled: 0,
    camerasTotal: 4,
    fiberLaid: 0,
    fiberTotal: 0.5,
    startDate: '1/4/2024',
    targetDate: '10/5/2024',
    status: 'Not Started',
  },
];

const activityLog = [
  {
    type: 'camera',
    title: 'Rajwada Square - Camera 7 Installed',
    details: 'Site EXE-001',
    by: 'Amit Patel',
    time: '11:45 AM',
  },
  {
    type: 'network',
    title: 'Treasure Island - Network Testing Started',
    details: 'Site EXE-002',
    by: 'Vikram Singh',
    time: '10:30 AM',
  },
  {
    type: 'alert',
    title: 'Material Shortage - PoE Switches',
    details: 'Site EXE-002',
    by: 'Site Engineer',
    time: '09:15 AM',
  },
];

export default function ExecutionPage() {
  const totalCameras = siteExecutions.reduce((sum, s) => sum + s.camerasTotal, 0);
  const installedCameras = siteExecutions.reduce((sum, s) => sum + s.camerasInstalled, 0);
  const totalFiber = siteExecutions.reduce((sum, s) => sum + s.fiberTotal, 0);
  const laidFiber = siteExecutions.reduce((sum, s) => sum + s.fiberLaid, 0);
  const avgProgress = (siteExecutions.reduce((sum, s) => sum + s.progress, 0) / siteExecutions.length).toFixed(1);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Execution (I&C)</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Installation, commissioning, and site progress tracking</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          New Site
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{avgProgress}%</div>
              <div className="stat-label">Overall Progress</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">0 sites completed</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Camera className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">{installedCameras} / {totalCameras}</div>
              <div className="stat-label">Cameras Installed</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">{((installedCameras/totalCameras)*100).toFixed(1)}% complete</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="stat-value">{laidFiber.toFixed(1)} KM</div>
              <div className="stat-label">Fiber Laid</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">of {totalFiber.toFixed(1)} KM total</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="stat-label">Site Status</div>
              <div className="text-xs mt-1">
                <span className="text-blue-600">In Progress: 2</span> • 
                <span className="text-yellow-600 ml-1">Testing: 0</span> • 
                <span className="text-gray-600 ml-1">Not Started: 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {['All', 'In Progress', 'Testing', 'Not Started', 'Completed'].map(tab => (
          <button 
            key={tab} 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'All' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Site Execution Table */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Site Execution Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Execution ID</th>
                <th>Site Name</th>
                <th>Survey ID</th>
                <th>Engineer</th>
                <th>Progress</th>
                <th>Cameras</th>
                <th>Fiber</th>
                <th>Timeline</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {siteExecutions.map(site => (
                <tr key={site.id}>
                  <td>
                    <div className="font-medium text-gray-900">{site.id}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">{site.name}</div>
                    <div className="text-xs text-gray-500">{site.siteId}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{site.surveyId}</div>
                  </td>
                  <td>
                    <div className="text-gray-900">{site.engineer}</div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar w-20">
                        <div 
                          className={`progress-fill ${
                            site.progress >= 75 ? 'bg-green-500' : 
                            site.progress >= 25 ? 'bg-blue-500' : 
                            'bg-gray-300'
                          }`}
                          style={{ width: `${site.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{site.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{site.camerasInstalled} / {site.camerasTotal}</div>
                    <div className="text-xs text-gray-500">{site.camerasTotal > 0 ? Math.round((site.camerasInstalled/site.camerasTotal)*100) : 0}% done</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{site.fiberLaid} / {site.fiberTotal}</div>
                    <div className="text-xs text-gray-500">{site.fiberTotal > 0 ? Math.round((site.fiberLaid/site.fiberTotal)*100) : 0}% laid</div>
                  </td>
                  <td>
                    <div className="text-xs text-gray-600">Start: {site.startDate}</div>
                    <div className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Target: {site.targetDate}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      site.status === 'In Progress' ? 'badge-info' : 
                      site.status === 'Not Started' ? 'badge-gray' :
                      site.status === 'Completed' ? 'badge-success' : 
                      'badge-warning'
                    }`}>
                      {site.status}
                    </span>
                  </td>
                  <td>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      View Site Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Today's Activity Log */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Today&apos;s Activity Log</h3>
          <p className="text-sm text-gray-500">Tuesday 3 March, 2026</p>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {activityLog.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activity.type === 'camera' ? 'bg-green-100' :
                  activity.type === 'network' ? 'bg-blue-100' :
                  'bg-red-100'
                }`}>
                  {activity.type === 'camera' && <Camera className="w-5 h-5 text-green-600" />}
                  {activity.type === 'network' && <Activity className="w-5 h-5 text-blue-600" />}
                  {activity.type === 'alert' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{activity.title}</div>
                  <div className="text-sm text-gray-600">{activity.details} • By {activity.by} • {activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}