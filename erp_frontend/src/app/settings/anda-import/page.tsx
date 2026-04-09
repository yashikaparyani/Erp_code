'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Database, Play, CheckCircle2, AlertTriangle, Loader2, RefreshCw,
  ChevronDown, ChevronRight, Clock, Shield, Upload, Layers3,
} from 'lucide-react';

/* ── Helpers ────────────────────────────────────────────────────────── */

import { andaApi } from '@/lib/typedApi';

/* ── Types ──────────────────────────────────────────────────────────── */

interface MasterIntegrity {
  total_departments: number;
  total_designations: number;
  total_projects: number;
  total_sites: number;
  total_suppliers: number;
  total_users: number;
  total_milestones: number;
  projects_without_company: number;
  sites_without_project: number;
  has_projects: boolean;
  has_sites: boolean;
  has_suppliers: boolean;
  ready_for_transactional_import: boolean;
}

interface MasterLoadStep {
  name: string;
  created: number;
  existing: number;
  errors: string[];
}

interface MasterLoadResult {
  total_created: number;
  total_existing: number;
  total_errors: number;
  steps: MasterLoadStep[];
}

interface TabInfo {
  tab_key: string;
  label: string;
  risk_level: string;
}

interface ImportRowResult {
  row_idx: number;
  status: string;
  reason?: string;
  source_ref?: string;
  target_doc?: string;
}

interface TabImportResult {
  tab_name: string;
  mode: string;
  total_rows: number;
  accepted: number;
  rejected: number;
  duplicates: number;
  skipped: number;
  unresolved_references: Array<{ field: string; value: string }>;
  rows: ImportRowResult[];
}

interface OrchestratorTabReport {
  tab_key: string;
  label: string;
  summary: string;
  total_rows: number;
  accepted: number;
  rejected: number;
  duplicates: number;
  skipped: number;
  unresolved_count: number;
}

interface OrchestratorResult {
  mode: string;
  tabs_processed: number;
  total_accepted: number;
  total_rejected: number;
  total_duplicates: number;
  total_skipped: number;
  tab_reports: OrchestratorTabReport[];
  errors: string[];
}

interface ImportLog {
  name: string;
  tab_name: string;
  import_mode: string;
  total_rows: number;
  accepted_rows: number;
  rejected_rows: number;
  duplicate_rows: number;
  skipped_rows: number;
  unresolved_count: number;
  started_at: string;
  finished_at: string;
}

const MODE_OPTIONS = [
  { value: 'dry_run', label: 'Dry Run', desc: 'Validate only — no data written' },
  { value: 'stage_only', label: 'Stage', desc: 'Create drafts — not submitted' },
  { value: 'commit', label: 'Commit', desc: 'Create and submit records' },
];

const MODE_BADGE: Record<string, string> = {
  dry_run: 'badge-gray',
  stage_only: 'badge-warning',
  commit: 'badge-success',
};

/* ── Page ───────────────────────────────────────────────────────────── */

export default function AndaImportPage() {
  // Master integrity
  const [integrity, setIntegrity] = useState<MasterIntegrity | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityError, setIntegrityError] = useState('');

  // Master loading
  const [masterResult, setMasterResult] = useState<MasterLoadResult | null>(null);
  const [masterLoading, setMasterLoading] = useState(false);

  // Tabs
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [tabsLoading, setTabsLoading] = useState(false);

  // Single-tab import
  const [selectedTab, setSelectedTab] = useState('');
  const [importMode, setImportMode] = useState('dry_run');
  const [rowsJson, setRowsJson] = useState('');
  const [importResult, setImportResult] = useState<TabImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  // Orchestrated import
  const [orchMode, setOrchMode] = useState('dry_run');
  const [orchJson, setOrchJson] = useState('');
  const [orchIncludeComplex, setOrchIncludeComplex] = useState(false);
  const [orchResult, setOrchResult] = useState<OrchestratorResult | null>(null);
  const [orchLoading, setOrchLoading] = useState(false);
  const [orchError, setOrchError] = useState('');

  // Logs
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    integrity: true,
    singleTab: false,
    orchestrator: false,
    logs: true,
  });

  const toggle = (s: string) => setExpandedSections(p => ({ ...p, [s]: !p[s] }));

  /* ── Load data ──────────────────────────────────────────────────── */

  const checkIntegrity = useCallback(async () => {
    setIntegrityLoading(true); setIntegrityError('');
    try {
      const r = await andaApi.checkIntegrity<MasterIntegrity>();
      setIntegrity(r);
    } catch (e) { setIntegrityError(e instanceof Error ? e.message : 'Failed'); }
    finally { setIntegrityLoading(false); }
  }, []);

  const loadTabs = useCallback(async () => {
    setTabsLoading(true);
    try {
      const r = await andaApi.getOrder<TabInfo[]>(true);
      setTabs(r);
      if (r.length > 0 && !selectedTab) setSelectedTab(r[0].tab_key);
    } catch { /* non-critical */ }
    finally { setTabsLoading(false); }
  }, [selectedTab]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try { setLogs(await andaApi.getLogs<ImportLog[]>(30)); }
    catch { /* non-critical */ }
    finally { setLogsLoading(false); }
  }, []);

  useEffect(() => { checkIntegrity(); loadTabs(); loadLogs(); }, [checkIntegrity, loadTabs, loadLogs]);

  /* ── Actions ────────────────────────────────────────────────────── */

  const loadMasters = async () => {
    setMasterLoading(true);
    try {
      const r = await andaApi.loadMasters<MasterLoadResult>();
      setMasterResult(r);
      await checkIntegrity();
    } catch (e) { setIntegrityError(e instanceof Error ? e.message : 'Failed to load masters'); }
    finally { setMasterLoading(false); }
  };

  const runSingleImport = async () => {
    if (!selectedTab) return;
    let parsed: unknown[];
    try { parsed = JSON.parse(rowsJson); if (!Array.isArray(parsed)) throw 0; }
    catch { setImportError('Rows must be a valid JSON array of objects.'); return; }
    setImportLoading(true); setImportError(''); setImportResult(null);
    try {
      const r = await andaApi.importSingle<TabImportResult>({ tab_name: selectedTab, rows: parsed, mode: importMode });
      setImportResult(r);
      await loadLogs();
    } catch (e) { setImportError(e instanceof Error ? e.message : 'Import failed'); }
    finally { setImportLoading(false); }
  };

  const runOrchestrated = async () => {
    let parsed: Record<string, unknown[]>;
    try { parsed = JSON.parse(orchJson); if (typeof parsed !== 'object' || Array.isArray(parsed)) throw 0; }
    catch { setOrchError('Tab data must be a JSON object mapping tab_key → rows array.'); return; }
    setOrchLoading(true); setOrchError(''); setOrchResult(null);
    try {
      const r = await andaApi.importOrchestrated<OrchestratorResult>({
        tab_data: parsed, mode: orchMode, include_complex: orchIncludeComplex,
      });
      setOrchResult(r);
      await loadLogs();
    } catch (e) { setOrchError(e instanceof Error ? e.message : 'Orchestrated import failed'); }
    finally { setOrchLoading(false); }
  };

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Database className="h-5 w-5 text-blue-600" /> ANDA Import Workspace</h1>
        <p className="text-sm text-gray-500 mt-1">Import historical project data from ANDA spreadsheets. Restricted to Director / System Manager.</p>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Use this workspace for controlled backfill only. Start with master readiness, validate imports in <span className="font-semibold">Dry Run</span>, and move to staged or committed runs only after unresolved references are cleared.
      </div>

      {/* ── Section 1: Master Integrity ── */}
      <CollapsibleSection title="Master Data Readiness" icon={<Shield className="h-4 w-4 text-blue-600" />} open={expandedSections.integrity} onToggle={() => toggle('integrity')}>
        {integrityError && <div className="text-sm text-rose-600 mb-3">{integrityError}</div>}
        {integrityLoading ? <Spinner label="Checking integrity…" /> : integrity ? (
          <div className="space-y-4">
            <div className={`rounded-lg border px-4 py-3 text-sm font-medium flex items-center gap-2 ${integrity.ready_for_transactional_import ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              {integrity.ready_for_transactional_import
                ? <><CheckCircle2 className="h-4 w-4" /> Masters are ready — transactional import is safe.</>
                : <><AlertTriangle className="h-4 w-4" /> Masters incomplete — load masters before importing transactional data.</>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatMini label="Departments" value={integrity.total_departments} />
              <StatMini label="Designations" value={integrity.total_designations} />
              <StatMini label="Projects" value={integrity.total_projects} />
              <StatMini label="Sites" value={integrity.total_sites} />
              <StatMini label="Suppliers" value={integrity.total_suppliers} />
              <StatMini label="Users" value={integrity.total_users} />
              <StatMini label="Milestones" value={integrity.total_milestones} />
              <StatMini label="Orphan Projects" value={integrity.projects_without_company} warn={integrity.projects_without_company > 0} />
            </div>
            <div className="flex items-center gap-3">
              <button className="btn btn-secondary" onClick={checkIntegrity} disabled={integrityLoading}><RefreshCw className="h-4 w-4" /> Re-check</button>
              <button className="btn btn-primary" onClick={loadMasters} disabled={masterLoading}>
                {masterLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</> : <><Upload className="h-4 w-4" /> Load Default Masters</>}
              </button>
            </div>
            {masterResult && (
              <div className="card mt-3">
                <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Master Load Result</h3></div>
                <div className="card-body">
                  <div className="flex gap-4 text-sm mb-3">
                    <span>Created: <strong className="text-emerald-700">{masterResult.total_created}</strong></span>
                    <span>Existing: <strong>{masterResult.total_existing}</strong></span>
                    <span>Errors: <strong className={masterResult.total_errors ? 'text-rose-600' : ''}>{masterResult.total_errors}</strong></span>
                  </div>
                  <div className="overflow-x-auto"><table className="data-table text-xs"><thead><tr><th>Step</th><th>Created</th><th>Existing</th><th>Errors</th></tr></thead><tbody>
                    {masterResult.steps.map(s => (
                      <tr key={s.name}><td className="font-medium">{s.name}</td><td>{s.created}</td><td>{s.existing}</td><td className={s.errors.length ? 'text-rose-600' : ''}>{s.errors.length ? s.errors.join('; ') : '—'}</td></tr>
                    ))}
                  </tbody></table></div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CollapsibleSection>

      {/* ── Section 2: Single-Tab Import ── */}
      <CollapsibleSection title="Single Tab Import" icon={<Play className="h-4 w-4 text-violet-600" />} open={expandedSections.singleTab} onToggle={() => toggle('singleTab')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Tab</label>
              <select className="input w-full" value={selectedTab} onChange={e => setSelectedTab(e.target.value)} disabled={tabsLoading}>
                {tabs.map(t => <option key={t.tab_key} value={t.tab_key}>{t.label} ({t.risk_level})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Mode</label>
              <select className="input w-full" value={importMode} onChange={e => setImportMode(e.target.value)}>
                {MODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn btn-primary w-full justify-center" onClick={runSingleImport} disabled={importLoading || !selectedTab || !rowsJson.trim()}>
                {importLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Play className="h-4 w-4" /> Run Import</>}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Row Data (JSON array of objects)</label>
            <textarea className="input w-full font-mono text-xs" rows={6} placeholder={'[\n  { "project_name": "...", "site_id": "...", ... }\n]'} value={rowsJson} onChange={e => setRowsJson(e.target.value)} />
          </div>
          {importError && <div className="text-sm text-rose-600">{importError}</div>}
          {importResult && <SingleImportResultPanel result={importResult} />}
        </div>
      </CollapsibleSection>

      {/* ── Section 3: Orchestrated Import ── */}
      <CollapsibleSection title="Orchestrated Multi-Tab Import" icon={<Layers3 className="h-4 w-4 text-emerald-600" />} open={expandedSections.orchestrator} onToggle={() => toggle('orchestrator')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Mode</label>
              <select className="input w-full" value={orchMode} onChange={e => setOrchMode(e.target.value)}>
                {MODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="include-complex" checked={orchIncludeComplex} onChange={e => setOrchIncludeComplex(e.target.checked)} />
              <label htmlFor="include-complex" className="text-sm text-gray-700">Include complex tabs</label>
            </div>
            <div className="flex items-end">
              <button className="btn btn-primary w-full justify-center" onClick={runOrchestrated} disabled={orchLoading || !orchJson.trim()}>
                {orchLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Layers3 className="h-4 w-4" /> Run Orchestrated Import</>}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Tab Data (JSON object: tab_key → rows array)</label>
            <textarea className="input w-full font-mono text-xs" rows={8} placeholder={'{\n  "project_overview": [ { ... } ],\n  "milestones_phases": [ { ... } ]\n}'} value={orchJson} onChange={e => setOrchJson(e.target.value)} />
          </div>
          {orchError && <div className="text-sm text-rose-600">{orchError}</div>}
          {orchResult && <OrchestratedResultPanel result={orchResult} />}
        </div>
      </CollapsibleSection>

      {/* ── Section 4: Import Logs ── */}
      <CollapsibleSection title="Import History" icon={<Clock className="h-4 w-4 text-gray-500" />} open={expandedSections.logs} onToggle={() => toggle('logs')}>
        <div className="flex justify-end mb-2">
          <button className="btn btn-secondary btn-sm" onClick={loadLogs} disabled={logsLoading}><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
        </div>
        {logsLoading ? <Spinner label="Loading logs…" /> : logs.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-sm font-medium text-gray-700">No import runs recorded yet.</div>
            <div className="mt-1 text-xs text-gray-500">Dry runs and committed imports will appear here with per-tab counts so operators can audit what changed.</div>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="data-table text-sm"><thead><tr><th>ID</th><th>Tab</th><th>Mode</th><th>Total</th><th>Accepted</th><th>Rejected</th><th>Duplicates</th><th>Skipped</th><th>Started</th></tr></thead><tbody>
            {logs.map(l => (
              <tr key={l.name}>
                <td className="font-mono text-xs text-gray-500">{l.name}</td>
                <td className="font-medium">{l.tab_name}</td>
                <td><span className={`badge ${MODE_BADGE[l.import_mode] || 'badge-gray'}`}>{l.import_mode}</span></td>
                <td>{l.total_rows}</td>
                <td className="text-emerald-700 font-medium">{l.accepted_rows}</td>
                <td className={l.rejected_rows ? 'text-rose-600 font-medium' : ''}>{l.rejected_rows}</td>
                <td>{l.duplicate_rows}</td>
                <td>{l.skipped_rows}</td>
                <td className="text-xs text-gray-500 whitespace-nowrap">{l.started_at || '—'}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </CollapsibleSection>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function CollapsibleSection({ title, icon, open, onToggle, children }: {
  title: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="card">
      <button onClick={onToggle} className="card-header w-full flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
        {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        {icon}
        <h2 className="font-semibold text-gray-900 flex-1 text-left">{title}</h2>
      </button>
      {open && <div className="card-body">{children}</div>}
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return <div className="flex items-center gap-2 py-4 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />{label}</div>;
}

function StatMini({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${warn ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
      <div className={`text-lg font-bold ${warn ? 'text-amber-700' : 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function SingleImportResultPanel({ result }: { result: TabImportResult }) {
  const [showRows, setShowRows] = useState(false);
  return (
    <div className="card mt-3">
      <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Import Result — {result.tab_name} ({result.mode})</h3></div>
      <div className="card-body space-y-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <span>Total: <strong>{result.total_rows}</strong></span>
          <span className="text-emerald-700">Accepted: <strong>{result.accepted}</strong></span>
          <span className={result.rejected ? 'text-rose-600' : ''}>Rejected: <strong>{result.rejected}</strong></span>
          <span>Duplicates: <strong>{result.duplicates}</strong></span>
          <span>Skipped: <strong>{result.skipped}</strong></span>
        </div>
        {result.unresolved_references?.length > 0 && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <strong>Unresolved references:</strong> {result.unresolved_references.map(u => `${u.field}="${u.value}"`).join(', ')}
          </div>
        )}
        <button className="text-xs text-blue-600 hover:underline" onClick={() => setShowRows(!showRows)}>
          {showRows ? 'Hide' : 'Show'} row-level detail ({result.rows?.length || 0} rows)
        </button>
        {showRows && result.rows?.length > 0 && (
          <div className="overflow-x-auto max-h-64 overflow-y-auto"><table className="data-table text-xs"><thead><tr><th>#</th><th>Status</th><th>Reason</th><th>Source</th><th>Target</th></tr></thead><tbody>
            {result.rows.map((r, i) => (
              <tr key={i} className={r.status === 'rejected' ? 'bg-rose-50' : r.status === 'accepted' ? 'bg-emerald-50' : ''}>
                <td>{r.row_idx}</td>
                <td><span className={`badge ${r.status === 'accepted' ? 'badge-success' : r.status === 'rejected' ? 'badge-error' : 'badge-gray'}`}>{r.status}</span></td>
                <td className="max-w-xs truncate">{r.reason || '—'}</td>
                <td className="text-xs text-gray-500">{r.source_ref || '—'}</td>
                <td className="text-xs text-gray-500">{r.target_doc || '—'}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}

function OrchestratedResultPanel({ result }: { result: OrchestratorResult }) {
  return (
    <div className="card mt-3">
      <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Orchestrated Run — {result.mode}</h3></div>
      <div className="card-body space-y-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <span>Tabs Processed: <strong>{result.tabs_processed}</strong></span>
          <span className="text-emerald-700">Accepted: <strong>{result.total_accepted}</strong></span>
          <span className={result.total_rejected ? 'text-rose-600' : ''}>Rejected: <strong>{result.total_rejected}</strong></span>
          <span>Duplicates: <strong>{result.total_duplicates}</strong></span>
          <span>Skipped: <strong>{result.total_skipped}</strong></span>
        </div>
        {result.errors?.length > 0 && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
            {result.errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}
        {result.tab_reports?.length > 0 && (
          <div className="overflow-x-auto"><table className="data-table text-xs"><thead><tr><th>Tab</th><th>Total</th><th>Accepted</th><th>Rejected</th><th>Duplicates</th><th>Skipped</th><th>Unresolved</th><th>Summary</th></tr></thead><tbody>
            {result.tab_reports.map(t => (
              <tr key={t.tab_key}>
                <td className="font-medium">{t.label}</td>
                <td>{t.total_rows}</td>
                <td className="text-emerald-700">{t.accepted}</td>
                <td className={t.rejected ? 'text-rose-600' : ''}>{t.rejected}</td>
                <td>{t.duplicates}</td>
                <td>{t.skipped}</td>
                <td className={t.unresolved_count ? 'text-amber-600' : ''}>{t.unresolved_count}</td>
                <td className="text-xs text-gray-500 max-w-xs truncate">{t.summary || '—'}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
