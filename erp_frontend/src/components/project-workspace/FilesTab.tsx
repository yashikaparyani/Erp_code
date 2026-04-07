'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getFileProxyUrl } from '@/lib/fileLinks';
import {
  Upload, X, Loader2, AlertCircle, FileText, Download, ChevronDown,
  ExternalLink, Clock, BookOpen, Trash2,
} from 'lucide-react';
import { WorkspacePermissions } from '../../context/WorkspacePermissionContext';
import type { ProjectDocument } from './workspace-types';
import {
  callOps, getDocumentExtension, isPreviewableDocument,
  DOCUMENT_TRACE_STAGES, DOCUMENT_TRACE_STAGE_LABELS,
  PROJECT_TO_DOCUMENT_STAGE, DOSSIER_STAGE_ORDER, DOSSIER_STAGE_LABELS,
} from './workspace-types';

const DOC_CATEGORIES = ['All', 'Survey', 'Engineering', 'Procurement', 'Execution', 'O&M', 'Finance', 'HR', 'Other'] as const;

function ExpiryBadge({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700"><Clock className="h-3 w-3" />Expired</span>;
  }
  if (diffDays <= 7) {
    return <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"><Clock className="h-3 w-3" />{diffDays}d left</span>;
  }
  if (diffDays <= 30) {
    return <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-50 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">{diffDays}d left</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{new Date(expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
}

type StageCompleteness = {
  requirements: Array<{
    requirement: string;
    stage: string;
    category: string;
    subcategory?: string;
    mandatory: boolean;
    satisfied: boolean;
  }>;
  all_mandatory_satisfied: boolean;
  total: number;
  satisfied_count: number;
  missing_mandatory_count: number;
};

type ProgressionGate = {
  target_stage: string;
  can_proceed: boolean;
  missing_mandatory: Array<{ stage: string; category: string; subcategory?: string }>;
  missing_count: number;
  message: string;
};

function FilesTab({ projectId, currentStage, wp }: { projectId: string; currentStage?: string; wp: WorkspacePermissions | null }) {
  const canUpload = wp?.can_upload_files ?? true;
  const canDelete = wp?.can_delete_files ?? false;
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadForm, setUploadForm] = useState({ document_name: '', category: 'Engineering', linked_site: '', expiry_date: '', remarks: '', linked_stage: '', document_subcategory: '', reference_doctype: '', reference_name: '', is_mandatory: false });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  // Version drawer state
  const [versionDoc, setVersionDoc] = useState<ProjectDocument | null>(null);
  const [versions, setVersions] = useState<ProjectDocument[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedTraceStage, setSelectedTraceStage] = useState<string>(PROJECT_TO_DOCUMENT_STAGE[currentStage || ''] || 'Survey');
  const [stageCompleteness, setStageCompleteness] = useState<StageCompleteness | null>(null);
  const [progressionGate, setProgressionGate] = useState<ProgressionGate | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [selectedRecordKey, setSelectedRecordKey] = useState('');
  const [recordDocsLoading, setRecordDocsLoading] = useState(false);
  const [recordDocs, setRecordDocs] = useState<ProjectDocument[]>([]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await callOps<ProjectDocument[]>('get_project_documents', { project: projectId });
      setDocs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSelectedTraceStage(PROJECT_TO_DOCUMENT_STAGE[currentStage || ''] || 'Survey');
  }, [currentStage, projectId]);

  const filtered = activeCategory === 'All' ? docs : docs.filter(d => d.category === activeCategory);

  // Group docs by document_name to detect multi-version docs
  const versionCounts = docs.reduce<Record<string, number>>((acc, d) => {
    const key = `${d.document_name || d.name}::${d.linked_site || ''}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const handleUpload = async () => {
    if (!uploadForm.document_name.trim() || !uploadFile) return;
    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_name', uploadForm.document_name.trim());
      formData.append('linked_project', projectId);
      formData.append('category', uploadForm.category);
      if (uploadForm.linked_site) formData.append('linked_site', uploadForm.linked_site);
      if (uploadForm.expiry_date) formData.append('expiry_date', uploadForm.expiry_date);
      if (uploadForm.remarks) formData.append('remarks', uploadForm.remarks);
      if (uploadForm.linked_stage) formData.append('linked_stage', uploadForm.linked_stage);
      if (uploadForm.document_subcategory) formData.append('document_subcategory', uploadForm.document_subcategory);
      if (uploadForm.reference_doctype) formData.append('reference_doctype', uploadForm.reference_doctype);
      if (uploadForm.reference_name) formData.append('reference_name', uploadForm.reference_name);
      if (uploadForm.is_mandatory) formData.append('is_mandatory', '1');
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const payload = await res.json();
      if (!res.ok || payload.success === false) {
        setError(payload.message || 'Upload failed');
      } else {
        setUploadForm({ document_name: '', category: 'Engineering', linked_site: '', expiry_date: '', remarks: '', linked_stage: '', document_subcategory: '', reference_doctype: '', reference_name: '', is_mandatory: false });
        setUploadFile(null);
        setShowUpload(false);
        loadDocs();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadBusy(false);
    }
  };

  const handleStatusChange = async (docName: string, status: string) => {
    try {
      await callOps('update_document_status', { name: docName, status });
      loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await callOps('delete_project_document', { name });
      loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const openVersions = async (doc: ProjectDocument) => {
    setVersionDoc(doc);
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/documents/versions?name=${encodeURIComponent(doc.name)}`);
      const payload = await res.json();
      setVersions(payload.data || []);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  // Document statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiredDocs = docs.filter(d => d.expiry_date && new Date(d.expiry_date) < today);
  const expiringDocs = docs.filter(d => {
    if (!d.expiry_date) return false;
    const exp = new Date(d.expiry_date);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  });
  const versionedDocCount = Object.values(versionCounts).filter(c => c > 1).length;
  const controlledDocs = docs.filter(d => d.expiry_date);
  const linkedRecordBundles = useMemo(() => {
    const map = new Map<string, { key: string; reference_doctype: string; reference_name: string; count: number }>();
    for (const doc of docs) {
      if (!doc.reference_doctype || !doc.reference_name) continue;
      const key = `${doc.reference_doctype}::${doc.reference_name}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          key,
          reference_doctype: doc.reference_doctype,
          reference_name: doc.reference_name,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.reference_doctype.localeCompare(b.reference_doctype) || a.reference_name.localeCompare(b.reference_name));
  }, [docs]);

  useEffect(() => {
    if (!linkedRecordBundles.length) {
      setSelectedRecordKey('');
      return;
    }
    if (!selectedRecordKey || !linkedRecordBundles.some((bundle) => bundle.key === selectedRecordKey)) {
      setSelectedRecordKey(linkedRecordBundles[0].key);
    }
  }, [linkedRecordBundles, selectedRecordKey]);

  const selectedRecordBundle = useMemo(
    () => linkedRecordBundles.find((bundle) => bundle.key === selectedRecordKey) || null,
    [linkedRecordBundles, selectedRecordKey],
  );

  useEffect(() => {
    let active = true;
    const loadTrace = async () => {
      if (!selectedTraceStage) return;
      setTraceLoading(true);
      try {
        const [completeness, gate] = await Promise.all([
          callOps<StageCompleteness>('check_stage_document_completeness', { project: projectId, stage: selectedTraceStage }),
          callOps<ProgressionGate>('check_progression_gate', { project: projectId, target_stage: selectedTraceStage }),
        ]);
        if (!active) return;
        setStageCompleteness(completeness);
        setProgressionGate(gate);
      } catch (err) {
        if (!active) return;
        setStageCompleteness(null);
        setProgressionGate(null);
        setError(err instanceof Error ? err.message : 'Failed to load document readiness');
      } finally {
        if (active) setTraceLoading(false);
      }
    };
    void loadTrace();
    return () => { active = false; };
  }, [projectId, selectedTraceStage]);

  useEffect(() => {
    let active = true;
    const loadRecordDocs = async () => {
      if (!selectedRecordBundle) {
        setRecordDocs([]);
        return;
      }
      setRecordDocsLoading(true);
      try {
        const data = await callOps<ProjectDocument[]>('get_record_documents', {
          reference_doctype: selectedRecordBundle.reference_doctype,
          reference_name: selectedRecordBundle.reference_name,
        });
        if (!active) return;
        setRecordDocs(data);
      } catch (err) {
        if (!active) return;
        setRecordDocs([]);
        setError(err instanceof Error ? err.message : 'Failed to load record-linked documents');
      } finally {
        if (active) setRecordDocsLoading(false);
      }
    };
    void loadRecordDocs();
    return () => { active = false; };
  }, [selectedRecordBundle]);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading documents...</div>;
  if (error && !docs.length) return <p className="py-12 text-center text-sm text-rose-600">{error}</p>;

  return (
    <div className="space-y-4">
      {/* DMS Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-3">
          <div className="text-xs text-[var(--text-muted)]">Total Documents</div>
          <div className="mt-1 text-xl font-bold text-[var(--text-main)]">{docs.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-3">
          <div className="text-xs text-[var(--text-muted)]">Multi-Version</div>
          <div className="mt-1 text-xl font-bold text-violet-600">{versionedDocCount}</div>
        </div>
        {expiredDocs.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <div className="text-xs text-rose-600">Expired</div>
            <div className="mt-1 flex items-center gap-1.5 text-xl font-bold text-rose-700">
              <AlertCircle className="h-4 w-4" />{expiredDocs.length}
            </div>
          </div>
        )}
        {expiringDocs.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs text-amber-600">Expiring Soon</div>
            <div className="mt-1 flex items-center gap-1.5 text-xl font-bold text-amber-700">
              <Clock className="h-4 w-4" />{expiringDocs.length}
            </div>
          </div>
        )}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-3">
          <div className="text-xs text-[var(--text-muted)]">Controlled</div>
          <div className="mt-1 text-xl font-bold text-emerald-600">{controlledDocs.length}</div>
          <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">with expiry tracking</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text-main)]">Stage Readiness</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Document completeness and progression gate for the selected lifecycle stage.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedTraceStage}
                onChange={(e) => setSelectedTraceStage(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                {DOCUMENT_TRACE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {DOCUMENT_TRACE_STAGE_LABELS[stage] || stage}
                  </option>
                ))}
              </select>
              <Link
                href={`/projects/${encodeURIComponent(projectId)}/dossier`}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50"
              >
                <BookOpen className="h-3.5 w-3.5" /> Open dossier
              </Link>
            </div>
          </div>

          {traceLoading ? (
            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking stage readiness...
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className={`rounded-xl border px-3 py-3 ${
                progressionGate?.can_proceed
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-rose-200 bg-rose-50'
              }`}>
                <div className="text-xs font-semibold text-[var(--text-main)]">
                  {progressionGate?.can_proceed ? 'Progression gate is clear' : 'Progression gate is blocked'}
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  {progressionGate?.message || 'No progression summary available yet.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <div className="text-[11px] text-[var(--text-muted)]">Requirements</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--text-main)]">{stageCompleteness?.total || 0}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <div className="text-[11px] text-[var(--text-muted)]">Satisfied</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-600">{stageCompleteness?.satisfied_count || 0}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <div className="text-[11px] text-[var(--text-muted)]">Missing Mandatory</div>
                  <div className="mt-1 text-lg font-semibold text-rose-600">{stageCompleteness?.missing_mandatory_count || 0}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                  <div className="text-[11px] text-[var(--text-muted)]">Target Stage</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">{DOCUMENT_TRACE_STAGE_LABELS[selectedTraceStage] || selectedTraceStage}</div>
                </div>
              </div>

              {progressionGate?.missing_mandatory?.length ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="text-xs font-semibold text-rose-700">Missing before stage entry</div>
                  <div className="mt-2 space-y-1">
                    {progressionGate.missing_mandatory.slice(0, 6).map((item, index) => (
                      <div key={`${item.stage}-${item.category}-${item.subcategory || index}`} className="text-[11px] text-rose-700">
                        {DOCUMENT_TRACE_STAGE_LABELS[item.stage] || item.stage}: {item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text-main)]">Record-linked Documents</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Pull the document bundle for a specific BOQ, PO, drawing, GRN, or other linked record.
              </div>
            </div>
            <div className="rounded-full bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] text-[var(--text-muted)]">
              {linkedRecordBundles.length} linked bundle{linkedRecordBundles.length !== 1 ? 's' : ''}
            </div>
          </div>

          {!linkedRecordBundles.length ? (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-6 text-center text-xs text-[var(--text-muted)]">
              No record-linked document bundle exists yet for this project.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {linkedRecordBundles.map((bundle) => (
                  <button
                    key={bundle.key}
                    onClick={() => setSelectedRecordKey(bundle.key)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      selectedRecordKey === bundle.key
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]'
                    }`}
                  >
                    {bundle.reference_doctype}: {bundle.reference_name} ({bundle.count})
                  </button>
                ))}
              </div>

              {recordDocsLoading ? (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading linked documents...
                </div>
              ) : (
                <div className="space-y-2">
                  {recordDocs.slice(0, 5).map((doc) => (
                    <div key={doc.name} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-[var(--text-main)]">{doc.document_name || doc.name}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[var(--text-muted)]">
                            {doc.category && <span>{doc.category}</span>}
                            {doc.document_subcategory && <span>/ {doc.document_subcategory}</span>}
                            {doc.linked_stage && <span>Stage: {doc.linked_stage}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.file && (
                            <a href={getFileProxyUrl(doc.file, true)} target="_blank" rel="noreferrer" className="text-violet-600 hover:text-violet-700">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <span className="text-[10px] text-[var(--text-muted)]">v{doc.version || 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedRecordBundle && !recordDocs.length ? (
                    <div className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-4 text-xs text-[var(--text-muted)]">
                      No documents returned for {selectedRecordBundle.reference_doctype}: {selectedRecordBundle.reference_name}.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Category filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {DOC_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-[var(--brand-orange)] text-white'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {(expiredDocs.length + expiringDocs.length) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />{expiredDocs.length + expiringDocs.length} need attention
            </span>
          )}
          {canUpload && (
            <button onClick={() => setShowUpload(!showUpload)} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity">
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
          )}
        </div>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--text-main)]">Upload Document</h4>
            <button onClick={() => setShowUpload(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Document Name *</label>
              <input
                type="text"
                value={uploadForm.document_name}
                onChange={e => setUploadForm(f => ({ ...f, document_name: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="e.g. Site Survey Report"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">File *</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-orange)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              />
              {uploadFile && <p className="mt-1 text-xs text-[var(--text-muted)]">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Category *</label>
              <select
                value={uploadForm.category}
                onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
              >
                {DOC_CATEGORIES.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Site (optional)</label>
              <input
                type="text"
                value={uploadForm.linked_site}
                onChange={e => setUploadForm(f => ({ ...f, linked_site: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="Site name or ID"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Expiry Date (optional)</label>
              <input
                type="date"
                value={uploadForm.expiry_date}
                onChange={e => setUploadForm(f => ({ ...f, expiry_date: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Remarks</label>
              <input
                type="text"
                value={uploadForm.remarks}
                onChange={e => setUploadForm(f => ({ ...f, remarks: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="Optional notes"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Stage</label>
              <select
                value={uploadForm.linked_stage}
                onChange={e => setUploadForm(f => ({ ...f, linked_stage: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
              >
                <option value="">— Select stage —</option>
                {DOSSIER_STAGE_ORDER.filter(s => s !== 'Unclassified').map(s => <option key={s} value={s}>{DOSSIER_STAGE_LABELS[s] || s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Subcategory</label>
              <input
                type="text"
                value={uploadForm.document_subcategory}
                onChange={e => setUploadForm(f => ({ ...f, document_subcategory: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="e.g. As-Built Drawing"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Reference Type</label>
              <input
                type="text"
                value={uploadForm.reference_doctype}
                onChange={e => setUploadForm(f => ({ ...f, reference_doctype: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="e.g. GE Purchase Order"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Reference Name</label>
              <input
                type="text"
                value={uploadForm.reference_name}
                onChange={e => setUploadForm(f => ({ ...f, reference_name: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]"
                placeholder="e.g. PO-00042"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_mandatory_upload"
                checked={uploadForm.is_mandatory}
                onChange={e => setUploadForm(f => ({ ...f, is_mandatory: e.target.checked }))}
                className="rounded border-[var(--border-subtle)] text-[var(--brand-orange)] focus:ring-[var(--brand-orange)]"
              />
              <label htmlFor="is_mandatory_upload" className="text-xs text-[var(--text-muted)]">Mandatory document</label>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleUpload} disabled={uploadBusy || !uploadForm.document_name.trim() || !uploadForm.category.trim() || !uploadFile} className="rounded-xl bg-[var(--brand-orange)] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {uploadBusy ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {/* Documents table */}
      {!filtered.length ? (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">
          {activeCategory !== 'All' ? `No ${activeCategory} documents found.` : 'No documents are linked to this project yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Status / Expiry</th>
                <th className="px-4 py-3 font-medium">Uploaded By</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((doc) => {
                const hasVersions = (versionCounts[`${doc.document_name || doc.name}::${doc.linked_site || ''}`] || 0) > 1;
                return (
                  <tr key={doc.name} className="hover:bg-[var(--surface-raised)]/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text-main)]">{doc.document_name || doc.name}</div>
                      {(doc.file_url || doc.file) && (
                        <div className="flex items-center gap-3">
                          {isPreviewableDocument(doc.file_url || doc.file) ? (
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <FileText className="h-3 w-3" />Preview
                            </button>
                          ) : null}
                          <a href={getFileProxyUrl(doc.file_url || doc.file, true)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Download className="h-3 w-3" />{isPreviewableDocument(doc.file_url || doc.file) ? 'Open' : 'Download'}
                          </a>
                        </div>
                      )}
                      {doc.remarks && <div className="mt-0.5 text-[11px] text-[var(--text-muted)] italic">{doc.remarks}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{doc.category || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{doc.linked_site || 'Project-level'}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const versionCount = versionCounts[`${doc.document_name || doc.name}::${doc.linked_site || ''}`] || 1;
                        return (
                          <button
                            onClick={() => openVersions(doc)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${
                              hasVersions
                                ? 'bg-violet-50 text-violet-700 hover:bg-violet-100 cursor-pointer'
                                : 'bg-gray-50 text-gray-600'
                            }`}
                            title={hasVersions ? `${versionCount} versions available` : 'Single version'}
                          >
                            v{doc.version || 1}
                            {hasVersions && (
                              <>
                                <span className="text-[10px] opacity-70">of {versionCount}</span>
                                <ChevronDown className="h-3 w-3" />
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <ExpiryBadge expiryDate={doc.expiry_date} />
                      {!doc.expiry_date && (
                        <span className="text-[10px] text-[var(--text-muted)] italic">Untracked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{doc.uploaded_by || doc.owner || '-'}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{doc.creation ? new Date(doc.creation).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                          (doc.status || '').toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-700'
                          : (doc.status || '').toLowerCase() === 'rejected' ? 'bg-rose-50 text-rose-700'
                          : (doc.status || '').toLowerCase() === 'in review' ? 'bg-purple-50 text-purple-700'
                          : 'bg-blue-50 text-blue-700'
                        }`}>{doc.status || 'Submitted'}</span>
                        {!['approved', 'rejected', 'closed'].includes((doc.status || '').toLowerCase()) && (
                          <>
                            <button onClick={() => handleStatusChange(doc.name, 'In Review')} className="rounded px-1.5 py-0.5 text-[10px] text-purple-600 hover:bg-purple-50" title="Mark In Review">Review</button>
                            <button onClick={() => handleStatusChange(doc.name, 'Approved')} className="rounded px-1.5 py-0.5 text-[10px] text-emerald-600 hover:bg-emerald-50" title="Approve">Approve</button>
                            <button onClick={() => handleStatusChange(doc.name, 'Rejected')} className="rounded px-1.5 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50" title="Reject">Reject</button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc.name)}
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Version History Drawer */}
      {versionDoc && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setVersionDoc(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-md bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-main)]">Version History</h3>
                <p className="text-xs text-[var(--text-muted)]">{versionDoc.document_name}</p>
              </div>
              <button onClick={() => setVersionDoc(null)} className="rounded-lg p-1 hover:bg-[var(--surface-raised)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(100vh - 80px)' }}>
              {versionsLoading ? (
                <div className="flex items-center justify-center py-12 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading...</div>
              ) : !versions.length ? (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">No version history found.</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v, i) => (
                    <div key={v.name} className={`rounded-xl border p-3 ${i === 0 ? 'border-violet-200 bg-violet-50/50' : 'border-[var(--border-subtle)]'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-semibold ${i === 0 ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-600'}`}>
                          v{v.version}{i === 0 ? ' (latest)' : ''}
                        </span>
                        {(v.file_url || v.file) && (
                          <div className="flex items-center gap-3">
                            {isPreviewableDocument(v.file_url || v.file) ? (
                              <button
                                onClick={() => setPreviewDoc(v)}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                              >
                                <FileText className="h-3 w-3" />Preview
                              </button>
                            ) : null}
                            <a href={getFileProxyUrl(v.file_url || v.file, true)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <Download className="h-3 w-3" />{isPreviewableDocument(v.file_url || v.file) ? 'Open' : 'Download'}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                        <div>Uploaded by: {v.uploaded_by || '-'}</div>
                        <div>{v.uploaded_on ? new Date(v.uploaded_on).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : v.creation ? new Date(v.creation).toLocaleString('en-IN') : '-'}</div>
                        {v.remarks && <div className="italic">{v.remarks}</div>}
                        {v.expiry_date && <div className="flex items-center gap-1"><ExpiryBadge expiryDate={v.expiry_date} /></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {previewDoc && (previewDoc.file_url || previewDoc.file) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-main)]">{previewDoc.document_name || previewDoc.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{previewDoc.category || 'Document'}</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="rounded-lg p-1 hover:bg-[var(--surface-raised)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="relative h-[75vh] bg-[var(--surface-raised)]">
              {getDocumentExtension(previewDoc.file_url || previewDoc.file) === 'pdf' ? (
                <iframe title={previewDoc.document_name || previewDoc.name} src={getFileProxyUrl(previewDoc.file_url || previewDoc.file)} className="h-full w-full" />
              ) : (
                <Image
                  src={getFileProxyUrl(previewDoc.file_url || previewDoc.file) || ''}
                  alt={previewDoc.document_name || previewDoc.name}
                  fill
                  unoptimized
                  className="object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilesTab;
export { ExpiryBadge };
