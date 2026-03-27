'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle, 
  ClipboardCheck, 
  Cpu, 
  FileCheck2, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Shield
} from 'lucide-react';

interface SiteReadiness {
  site: string;
  site_code?: string;
  site_name?: string;
  project?: string;
  status?: string;
  checklist_pct: number;
  checklist_count: number;
  test_pct: number;
  test_count: number;
  signoff_pct: number;
  signoff_count: number;
  is_blocked: boolean;
  overall_readiness: number;
}

interface BlockedSite {
  site: string;
  site_name?: string;
  project?: string;
  block_count: number;
  blocks: { name: string; prerequisite_task?: string; block_message?: string }[];
}

interface ExecutionSummary {
  sites_summary: {
    total: number;
    by_status: Record<string, number>;
    blocked_count: number;
    ready_for_commissioning: number;
  };
  commissioning_summary: {
    checklists_total: number;
    checklists_by_status: Record<string, number>;
    test_reports_total: number;
    test_by_status: Record<string, number>;
    signoffs_total: number;
    signoff_by_status: Record<string, number>;
  };
  blocked_sites: BlockedSite[];
  site_readiness: SiteReadiness[];
  action_items: { type: string; priority: string; title: string; detail: string; ref_doctype?: string; ref_name?: string }[];
}

async function callOps<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await res.json();
  if (!res.ok || !payload.success) throw new Error(payload.message || 'API error');
  return payload.data as T;
}

export default function CommissioningDashboardPage() {
  const [data, setData] = useState<ExecutionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callOps<ExecutionSummary>('get_execution_summary', {})
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load commissioning summary. Please refresh.
      </div>
    );
  }

  const { sites_summary, commissioning_summary, blocked_sites, site_readiness, action_items } = data;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Commissioning Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Site readiness, test reports, checklists, and client signoffs
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/execution/commissioning/devices" className="btn btn-secondary">
            <Cpu className="w-4 h-4" /> Devices
          </Link>
          <Link href="/execution/commissioning/test-reports" className="btn btn-primary">
            <FileCheck2 className="w-4 h-4" /> Reports & Signoffs
          </Link>
        </div>
      </div>

      {/* Action Items Banner (if any high priority) */}
      {action_items.filter(a => a.priority === 'high').length > 0 && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span className="font-semibold text-rose-800">Requires Attention</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {action_items.filter(a => a.priority === 'high').slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 rounded-lg bg-white/80 px-3 py-2">
                <span className="mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-rose-100 text-rose-700">
                  {item.type}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">{item.title}</div>
                  <div className="text-xs text-gray-500 line-clamp-1">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard 
          icon={TrendingUp} 
          color="green" 
          value={sites_summary.ready_for_commissioning} 
          label="Ready for Commissioning" 
          hint={`of ${sites_summary.total} sites`}
        />
        <StatCard 
          icon={AlertTriangle} 
          color="rose" 
          value={sites_summary.blocked_count} 
          label="Blocked Sites" 
          hint="dependency blocks"
        />
        <StatCard 
          icon={ClipboardCheck} 
          color="blue" 
          value={commissioning_summary.checklists_total} 
          label="Checklists" 
          hint={`${commissioning_summary.checklists_by_status?.['Completed'] || 0} completed`}
        />
        <StatCard 
          icon={FileCheck2} 
          color="violet" 
          value={commissioning_summary.test_reports_total} 
          label="Test Reports" 
          hint={`${commissioning_summary.test_by_status?.['Approved'] || 0} approved`}
        />
        <StatCard 
          icon={CheckCircle} 
          color="emerald" 
          value={commissioning_summary.signoffs_total} 
          label="Client Signoffs" 
          hint={`${(commissioning_summary.signoff_by_status?.['Signed'] || 0) + (commissioning_summary.signoff_by_status?.['Approved'] || 0)} signed`}
        />
        <StatCard 
          icon={Shield} 
          color="amber" 
          value={action_items.length} 
          label="Action Items" 
          hint="require follow-up"
        />
      </div>

      {/* Site Readiness Table */}
      <div className="card mb-6">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Site Commissioning Readiness</h3>
          <Link href="/execution/dependencies" className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
            Manage Dependencies <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Project</th>
                <th>Status</th>
                <th>Checklists</th>
                <th>Test Reports</th>
                <th>Signoffs</th>
                <th>Overall</th>
                <th>Blocked</th>
              </tr>
            </thead>
            <tbody>
              {site_readiness.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No sites found
                  </td>
                </tr>
              ) : site_readiness.slice(0, 15).map((r) => (
                <tr key={r.site}>
                  <td>
                    <Link href={`/execution/sites/${encodeURIComponent(r.site)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{r.site_name || r.site}</Link>
                    <div className="text-xs text-gray-500">{r.site_code || r.site}</div>
                  </td>
                  <td className="text-sm text-gray-700">{r.project || '-'}</td>
                  <td>
                    <span className={`badge ${
                      r.status === 'COMPLETED' ? 'badge-success' :
                      r.status === 'ACTIVE' || r.status === 'IN_PROGRESS' ? 'badge-info' :
                      'badge-gray'
                    }`}>{r.status || '-'}</span>
                  </td>
                  <td>
                    <ProgressCell pct={r.checklist_pct} count={r.checklist_count} />
                  </td>
                  <td>
                    <ProgressCell pct={r.test_pct} count={r.test_count} />
                  </td>
                  <td>
                    <ProgressCell pct={r.signoff_pct} count={r.signoff_count} />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            r.overall_readiness >= 80 ? 'bg-green-500' :
                            r.overall_readiness >= 50 ? 'bg-amber-500' :
                            'bg-rose-500'
                          }`}
                          style={{ width: `${r.overall_readiness}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{r.overall_readiness}%</span>
                    </div>
                  </td>
                  <td>
                    {r.is_blocked ? (
                      <span className="badge badge-error">Blocked</span>
                    ) : (
                      <span className="badge badge-success">Clear</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blocked Sites */}
      {blocked_sites.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Blocked Sites</h3>
          </div>
          <div className="p-4 space-y-3">
            {blocked_sites.slice(0, 5).map((b) => (
              <div key={b.site} className="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{b.site_name || b.site}</div>
                  <div className="text-xs text-gray-500">{b.project || 'No project'}</div>
                  <div className="mt-1 text-sm text-rose-700">
                    {b.block_count} active block{b.block_count > 1 ? 's' : ''}
                    {b.blocks[0]?.block_message && (
                      <span className="text-gray-600">: {b.blocks[0].block_message}</span>
                    )}
                  </div>
                </div>
                <Link 
                  href="/execution/dependencies" 
                  className="btn btn-xs btn-secondary flex-shrink-0"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helper Components ─── */

function StatCard({ 
  icon: Icon, 
  color, 
  value, 
  label, 
  hint 
}: { 
  icon: React.ElementType; 
  color: string; 
  value: number; 
  label: string; 
  hint?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    violet: 'bg-violet-100 text-violet-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
  };
  
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label text-xs">{label}</div>
        </div>
      </div>
      {hint && <div className="text-xs text-gray-500 mt-2">{hint}</div>}
    </div>
  );
}

function ProgressCell({ pct, count }: { pct: number; count: number }) {
  if (count === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full ${
            pct >= 80 ? 'bg-green-500' :
            pct >= 50 ? 'bg-amber-500' :
            'bg-rose-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-600">{pct}%</span>
      <span className="text-[10px] text-gray-400">({count})</span>
    </div>
  );
}
