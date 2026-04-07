'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Plus, Wrench, Camera, Activity, CheckCircle2, Eye, X, ClipboardCheck, FileCheck2, GitBranch, ArrowRight, AlertTriangle } from 'lucide-react';

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

interface CommissioningSummary {
  ready_for_commissioning: number;
  blocked_count: number;
  checklists_total: number;
  checklists_completed: number;
  test_reports_total: number;
  test_reports_approved: number;
  signoffs_total: number;
  signoffs_signed: number;
}

export default function ExecutionPage() {
  const { currentUser } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [dprs, setDprs] = useState<DPR[]>([]);
  const [dprStats, setDprStats] = useState<DPRStats>({});
  const [commSummary, setCommSummary] = useState<CommissioningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showDprModal, setShowDprModal] = useState(false);
  const [dprForm, setDprForm] = useState({ linked_project: '', linked_site: '', report_date: '', summary: '', manpower_on_site: 0, equipment_count: 0 });
  const [createForm, setCreateForm] = useState({
    site_code: '',
    site_name: '',
    linked_project: '',
    linked_tender: '',
    status: 'PLANNED',
  });
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const [sitesRes, dprsRes, execRes] = await Promise.all([
        fetch('/api/sites', { signal: controller.signal }).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/dprs', { signal: controller.signal }).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'get_execution_summary', args: {} }),
          signal: controller.signal,
        }).then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (requestId !== requestIdRef.current || controller.signal.aborted) {
        return;
      }

      setSites(sitesRes.data || []);
      setDprs(dprsRes.data || []);
      const d = dprsRes.data || [];
      setDprStats({
        total_reports: d.length,
        total_manpower_logged: d.reduce((s: number, r: DPR) => s + (r.manpower_on_site || 0), 0),
        total_equipment_logged: d.reduce((s: number, r: DPR) => s + (r.equipment_count || 0), 0),
      });
      // Commissioning summary from execution API
      if (execRes.success && execRes.data) {
        const cs = execRes.data.commissioning_summary || {};
        const ss = execRes.data.sites_summary || {};
        setCommSummary({
          ready_for_commissioning: ss.ready_for_commissioning || 0,
          blocked_count: ss.blocked_count || 0,
          checklists_total: cs.checklists_total || 0,
          checklists_completed: cs.checklists_by_status?.['Completed'] || 0,
          test_reports_total: cs.test_reports_total || 0,
          test_reports_approved: cs.test_by_status?.['Approved'] || 0,
          signoffs_total: cs.signoffs_total || 0,
          signoffs_signed: (cs.signoff_by_status?.['Signed'] || 0) + (cs.signoff_by_status?.['Approved'] || 0),
        });
      }
    } catch (loadError) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }
      setError(loadError instanceof Error ? loadError.message : 'Failed to load execution data');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadData]);

  const handleCreateSite = async () => {
    if (!createForm.site_code.trim() || !createForm.site_name.trim() || !createForm.linked_project.trim()) {
      setError('Site Code, Site Name, and Linked Project are required.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create site');
      }

      setShowCreateModal(false);
      setCreateForm({ site_code: '', site_name: '', linked_project: '', linked_tender: '', status: 'PLANNED' });
      await loadData();
    } catch (siteError) {
      setError(siteError instanceof Error ? siteError.message : 'Failed to create site');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDpr = async () => {
    if (!dprForm.linked_project.trim() || !dprForm.linked_site.trim()) {
      setError('Project and Site are required.');
      return;
    }
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'create_dpr', args: dprForm }) });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || 'Failed to create DPR');
      setShowDprModal(false); setDprForm({ linked_project: '', linked_site: '', report_date: '', summary: '', manpower_on_site: 0, equipment_count: 0 }); await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create DPR'); }
    setCreating(false);
  };

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
  const topExecutionSignals = [
    commSummary?.blocked_count ? `${commSummary.blocked_count} site blockers are active in the execution lane.` : null,
    commSummary && commSummary.ready_for_commissioning > 0 ? `${commSummary.ready_for_commissioning} site${commSummary.ready_for_commissioning > 1 ? 's are' : ' is'} ready to push into commissioning.` : null,
    (dprStats.total_reports || 0) === 0 ? 'No DPRs are visible yet. Field reporting should start before the lane drifts out of sync.' : null,
  ].filter(Boolean) as string[];
  const roleFocus = currentUser?.role || currentUser?.roles?.[0] || 'Engineer';

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Execution (I&C)</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Installation, commissioning, and site progress tracking</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary w-full sm:w-auto" onClick={() => setShowDprModal(true)}>
            <Camera className="w-4 h-4" />
            New DPR
          </button>
          <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            New Site
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.9))] p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">Execution Control Lane</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">{roleFocus} lane for installation, commissioning, and field closure</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Use this lane to move from site progress to commissioning readiness without losing DPR visibility, dependency control, or governed document context.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricChip label="Sites" value={sites.length} tone="blue" />
            <MetricChip label="Blocked" value={commSummary?.blocked_count || 0} tone={(commSummary?.blocked_count || 0) > 0 ? 'rose' : 'emerald'} />
            <MetricChip label="Ready for I&C" value={commSummary?.ready_for_commissioning || 0} tone="emerald" />
            <MetricChip label="DPRs" value={dprStats.total_reports || 0} tone="amber" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {(topExecutionSignals.length ? topExecutionSignals : ['Execution lane is broadly clear. Use the quick actions below to push the next operational move.']).map((signal) => (
            <div key={signal} className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3">
              <div className="text-sm font-semibold text-gray-900">Operational signal</div>
              <div className="mt-1 text-xs leading-5 text-gray-600">{signal}</div>
            </div>
          ))}
        </div>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create Site</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Code *</label>
                <input className="input" value={createForm.site_code} onChange={(e) => setCreateForm((p) => ({ ...p, site_code: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
                <input className="input" value={createForm.site_name} onChange={(e) => setCreateForm((p) => ({ ...p, site_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Project *</label>
                <input className="input" value={createForm.linked_project} onChange={(e) => setCreateForm((p) => ({ ...p, linked_project: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Tender</label>
                <input className="input" value={createForm.linked_tender} onChange={(e) => setCreateForm((p) => ({ ...p, linked_tender: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="input" value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="PLANNED">PLANNED</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
            {error ? <p className="px-6 pb-2 text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateSite} disabled={creating}>{creating ? 'Creating...' : 'Create Site'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* DPR Create Modal */}
      {showDprModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create Daily Progress Report</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowDprModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Linked Project *</label><input className="input" value={dprForm.linked_project} onChange={(e) => setDprForm(p => ({ ...p, linked_project: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Linked Site *</label><select className="input" value={dprForm.linked_site} onChange={(e) => setDprForm(p => ({ ...p, linked_site: e.target.value }))}><option value="">Select site</option>{sites.map(s => <option key={s.name} value={s.name}>{s.site_name || s.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label><input className="input" type="date" value={dprForm.report_date} onChange={(e) => setDprForm(p => ({ ...p, report_date: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Manpower On Site</label><input className="input" type="number" min="0" value={dprForm.manpower_on_site} onChange={(e) => setDprForm(p => ({ ...p, manpower_on_site: Number(e.target.value) }))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Equipment Count</label><input className="input" type="number" min="0" value={dprForm.equipment_count} onChange={(e) => setDprForm(p => ({ ...p, equipment_count: Number(e.target.value) }))} /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Summary</label><textarea className="input min-h-24" value={dprForm.summary} onChange={(e) => setDprForm(p => ({ ...p, summary: e.target.value }))} /></div>
            </div>
            {error ? <p className="px-6 pb-2 text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button className="btn btn-secondary" onClick={() => setShowDprModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateDpr} disabled={creating}>{creating ? 'Creating...' : 'Create DPR'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <Link href="/execution/projects" className="card p-4 hover:border-slate-300 hover:bg-slate-50/50 transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200">
              <Wrench className="w-5 h-5 text-slate-700" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Execution Workspace</div>
              <div className="text-xs text-gray-500">Project-level PM and field delivery cockpit</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-slate-700" />
          </div>
        </Link>
        <Link href="/execution/commissioning" className="card p-4 hover:border-blue-300 hover:bg-blue-50/30 transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Commissioning Dashboard</div>
              <div className="text-xs text-gray-500">Checklists, test reports, signoffs</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
          </div>
        </Link>
        <Link href="/execution/commissioning/test-reports" className="card p-4 hover:border-violet-300 hover:bg-violet-50/30 transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center group-hover:bg-violet-200">
              <FileCheck2 className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Test Reports & Signoffs</div>
              <div className="text-xs text-gray-500">FAT/SAT/UAT and client approval</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-violet-600" />
          </div>
        </Link>
        <Link href="/execution/dependencies" className="card p-4 hover:border-amber-300 hover:bg-amber-50/30 transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200">
              <GitBranch className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Dependency Management</div>
              <div className="text-xs text-gray-500">Blockers, overrides, rules</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600" />
          </div>
        </Link>
        <Link href="/documents?category=Execution" className="card p-4 hover:border-violet-300 hover:bg-violet-50/30 transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center group-hover:bg-violet-200">
              <FileCheck2 className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Execution DMS</div>
              <div className="text-xs text-gray-500">Controlled files, latest versions, and expiry risk</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-violet-600" />
          </div>
        </Link>
      </div>

      {/* Commissioning Readiness Preview */}
      {commSummary && (
        <div className="card mb-6">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Commissioning Readiness</h3>
            <Link href="/execution/commissioning" className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
              View Dashboard <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{commSummary.ready_for_commissioning}</div>
                  <div className="text-xs text-gray-500">Sites Ready</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{commSummary.blocked_count}</div>
                  <div className="text-xs text-gray-500">Blocked</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{commSummary.checklists_completed}/{commSummary.checklists_total}</div>
                  <div className="text-xs text-gray-500">Checklists Done</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{commSummary.test_reports_approved}/{commSummary.test_reports_total}</div>
                  <div className="text-xs text-gray-500">Reports Approved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <div className="card mb-6">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Next Actions Across The Lane</h3>
          <Link href="/notifications?filter=alerts" className="text-xs font-medium text-blue-600 hover:underline">
            Open alerts
          </Link>
        </div>
        <div className="card-body grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <LaneActionCard
            title="Capture field progress"
            detail="Keep DPRs current before moving into checklists or signoffs."
            href="/execution"
            tone="blue"
          />
          <LaneActionCard
            title="Clear dependencies"
            detail="Remove stage blocks and pending overrides before commissioning stalls."
            href="/execution/dependencies"
            tone="amber"
          />
          <LaneActionCard
            title="Drive commissioning"
            detail="Push test reports, checklist closure, and signoffs from one lane."
            href="/execution/commissioning"
            tone="emerald"
          />
          <LaneActionCard
            title="Check governed docs"
            detail="Verify drawings, reports, and signoff files in controlled context."
            href="/documents?category=Execution"
            tone="violet"
          />
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
                    <Link href={`/execution/sites/${encodeURIComponent(site.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{site.name}</Link>
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
                    <Link
                      href={site.linked_project ? `/projects/${encodeURIComponent(site.linked_project)}?tab=sites` : '/projects'}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Open Project
                    </Link>
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

function MetricChip({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'emerald' | 'amber' | 'rose' }) {
  const styles = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 ${styles}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function LaneActionCard({ title, detail, href, tone }: { title: string; detail: string; href: string; tone: 'blue' | 'emerald' | 'amber' | 'violet' }) {
  const styles = {
    blue: 'border-blue-200 bg-blue-50/60 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-700',
    violet: 'border-violet-200 bg-violet-50/60 text-violet-700',
  }[tone];

  return (
    <Link href={href} className={`rounded-2xl border px-4 py-3 transition hover:shadow-sm ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        <ArrowRight className="h-4 w-4" />
      </div>
      <div className="mt-2 text-xs leading-5 text-gray-600">{detail}</div>
    </Link>
  );
}
