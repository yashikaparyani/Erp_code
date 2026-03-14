'use client';
import { useEffect, useState } from 'react';
import { Plus, Wrench, Camera, Activity, CheckCircle2, Clock, Eye, AlertTriangle } from 'lucide-react';

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

interface DPR {
  name: string;
  linked_project?: string;
  linked_site?: string;
  report_date?: string;
  summary?: string;
  manpower_on_site?: number;
  equipment_count?: number;
  submitted_by?: string;
}

interface DPRStats {
  total_reports?: number;
  total_manpower_logged?: number;
  total_equipment_logged?: number;
}

export default function ExecutionPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [dprs, setDprs] = useState<DPR[]>([]);
  const [dprStats, setDprStats] = useState<DPRStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/sites').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/dprs').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([sitesRes, dprsRes]) => {
      setSites(sitesRes.data || []);
      setDprs(dprsRes.data || []);
      // Derive DPR stats from raw data
      const d = dprsRes.data || [];
      setDprStats({
        total_reports: d.length,
        total_manpower_logged: d.reduce((s: number, r: DPR) => s + (r.manpower_on_site || 0), 0),
        total_equipment_logged: d.reduce((s: number, r: DPR) => s + (r.equipment_count || 0), 0),
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const statusCounts = sites.reduce((acc, s) => {
    const st = s.status || 'Unknown';
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
              <div className="stat-value">{sites.length}</div>
              <div className="stat-label">Total Sites</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{statusCounts['COMPLETED'] || 0} completed</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Camera className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">{dprStats.total_reports ?? 0}</div>
              <div className="stat-label">DPR Reports</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">Total submitted</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="stat-value">{dprStats.total_manpower_logged ?? 0}</div>
              <div className="stat-label">Manpower Logged</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{dprStats.total_equipment_logged ?? 0} equipment</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="stat-label">Site Status</div>
              <div className="text-xs mt-1">
                {Object.entries(statusCounts).map(([st, cnt], i) => (
                  <span key={st} className={`${i > 0 ? 'ml-1' : ''} text-gray-600`}>
                    {st}: {cnt}{i < Object.entries(statusCounts).length - 1 ? ' •' : ''}
                  </span>
                ))}
                {sites.length === 0 && <span className="text-gray-400">No sites yet</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Site Table */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Execution Sites</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Site ID</th>
                <th>Site Name</th>
                <th>Project</th>
                <th>Coordinates</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sites.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No execution sites found</td></tr>
              ) : sites.map(site => (
                <tr key={site.name}>
                  <td>
                    <div className="font-medium text-gray-900">{site.name}</div>
                    <div className="text-xs text-gray-500">{site.site_code}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">{site.site_name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{site.linked_project || '-'}</div>
                    <div className="text-xs text-gray-500">{site.linked_tender || ''}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600 font-mono">
                      {site.latitude && site.longitude ? `${site.latitude}, ${site.longitude}` : '-'}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      site.status === 'ACTIVE' || site.status === 'IN_PROGRESS' ? 'badge-info' : 
                      site.status === 'NOT_STARTED' ? 'badge-gray' :
                      site.status === 'COMPLETED' ? 'badge-success' : 
                      'badge-warning'
                    }`}>
                      {site.status}
                    </span>
                  </td>
                  <td>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent DPRs */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Recent Daily Progress Reports</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {dprs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No DPR reports yet</div>
            ) : dprs.slice(0, 5).map(dpr => (
              <div key={dpr.name} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{dpr.linked_site} — {dpr.report_date}</div>
                  <div className="text-sm text-gray-600">{dpr.summary || 'No summary'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Manpower: {dpr.manpower_on_site ?? 0} • Equipment: {dpr.equipment_count ?? 0}
                    {dpr.submitted_by ? ` • By ${dpr.submitted_by}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}