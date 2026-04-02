'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getFileProxyUrl } from '@/lib/fileLinks';
import {
  ChevronDown, AlertCircle, CheckCircle2, FileText, Download, Upload, Loader2, Shield, Clock,
} from 'lucide-react';
import { ExpiryBadge } from './FilesTab';
import { callOps, DOSSIER_STAGE_ORDER, DOSSIER_STAGE_LABELS } from './workspace-types';

type DossierDocument = {
  name: string;
  document_name: string;
  linked_stage?: string;
  linked_site?: string;
  category?: string;
  document_subcategory?: string;
  reference_doctype?: string;
  reference_name?: string;
  file?: string;
  version?: number;
  status?: string;
  is_mandatory?: 0 | 1;
  uploaded_by?: string;
  uploaded_on?: string;
  reviewed_by?: string;
  approved_by?: string;
  valid_from?: string;
  valid_till?: string;
  expiry_date?: string;
  supersedes_document?: string;
  creation?: string;
};

type DossierData = {
  project: string;
  stages: Record<string, DossierDocument[]>;
  total_documents: number;
};

type DossierCompletenessResult = {
  requirements: {
    requirement: string;
    stage: string;
    category: string;
    subcategory?: string;
    mandatory: boolean;
    satisfied: boolean;
  }[];
  all_mandatory_satisfied: boolean;
  total: number;
  satisfied_count: number;
  missing_mandatory_count: number;
};



function DossierStatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  const tone = s === 'approved' ? 'bg-emerald-100 text-emerald-700'
    : s === 'rejected' ? 'bg-rose-100 text-rose-700'
    : s === 'blocked' ? 'bg-amber-100 text-amber-700'
    : s === 'in review' ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700';
  return <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{status || 'Draft'}</span>;
}

function DossierStageSection({ stage, docs, completeness, projectId, onUploaded }: { stage: string; docs: DossierDocument[]; completeness: DossierCompletenessResult | null; projectId: string; onUploaded: () => void }) {
  const [open, setOpen] = useState(true);
  const [uploadTarget, setUploadTarget] = useState<{ category: string; subcategory: string } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const label = DOSSIER_STAGE_LABELS[stage] || stage;
  const mandatoryCount = completeness?.total || 0;
  const satisfiedCount = completeness?.satisfied_count || 0;
  const missingCount = completeness?.missing_mandatory_count || 0;

  const handleDossierUpload = async () => {
    if (!uploadFile || !uploadTarget || !uploadName.trim()) return;
    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_name', uploadName.trim());
      formData.append('linked_project', projectId);
      formData.append('category', uploadTarget.category);
      formData.append('linked_stage', stage);
      if (uploadTarget.subcategory) formData.append('document_subcategory', uploadTarget.subcategory);
      formData.append('is_mandatory', '1');
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const payload = await res.json();
      if (!res.ok || payload.success === false) return;
      setUploadTarget(null);
      setUploadFile(null);
      setUploadName('');
      onUploaded();
    } finally {
      setUploadBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-white">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3 text-left">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" /> : <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />}
          <h3 className="text-sm font-semibold text-[var(--text-main)]">{label}</h3>
          <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
            {docs.length} doc{docs.length !== 1 ? 's' : ''}
          </span>
        </div>
        {mandatoryCount > 0 && (
          <div className="flex items-center gap-2 text-[10px]">
            {missingCount > 0 ? (
              <span className="flex items-center gap-1 text-rose-600"><AlertCircle className="h-3 w-3" />{missingCount} missing</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" />{satisfiedCount}/{mandatoryCount} complete</span>
            )}
          </div>
        )}
      </button>
      {open && (
        <div className="border-t border-[var(--border-subtle)] px-5 py-3">
          {docs.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">No documents for this stage</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.name} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-main)] truncate">{doc.document_name}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-[var(--text-muted)]">{doc.category}</span>
                        {doc.document_subcategory && <span className="text-[10px] text-[var(--text-muted)]">/ {doc.document_subcategory}</span>}
                        {doc.reference_doctype && <span className="text-[10px] text-purple-500">{doc.reference_doctype}: {doc.reference_name}</span>}
                        {doc.is_mandatory ? <span className="text-[10px] text-rose-500 font-medium">Mandatory</span> : null}
                        {doc.expiry_date && (
                          <ExpiryBadge expiryDate={doc.expiry_date} />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <DossierStatusBadge status={doc.status} />
                    <span className="text-[10px] text-[var(--text-muted)]">v{doc.version || 1}</span>
                    {doc.file && (
                      <a href={doc.file} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {completeness && completeness.requirements.filter(r => r.mandatory && !r.satisfied).length > 0 && (
            <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3">
              <p className="text-[10px] font-semibold text-rose-700 mb-1.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Missing Mandatory Documents
              </p>
              <div className="space-y-1">
                {completeness.requirements.filter(r => r.mandatory && !r.satisfied).map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <p className="text-[10px] text-rose-600">
                      {r.category}{r.subcategory ? ` / ${r.subcategory}` : ''}
                    </p>
                    <button
                      onClick={() => { setUploadTarget({ category: r.category, subcategory: r.subcategory || '' }); setUploadName(`${r.category}${r.subcategory ? ' - ' + r.subcategory : ''}`); }}
                      className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-rose-700"
                    >
                      <Upload className="h-2.5 w-2.5" /> Upload Now
                    </button>
                  </div>
                ))}
              </div>
              {uploadTarget && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-white p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-[var(--text-main)]">Upload: {uploadTarget.category}{uploadTarget.subcategory ? ` / ${uploadTarget.subcategory}` : ''}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input type="text" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Document name" className="rounded-lg border border-[var(--border-subtle)] bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange)]" />
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="rounded-lg border border-[var(--border-subtle)] bg-white px-2 py-1 text-xs file:mr-2 file:rounded file:border-0 file:bg-[var(--brand-orange)] file:px-2 file:py-0.5 file:text-[10px] file:font-medium file:text-white" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setUploadTarget(null)} className="rounded px-2 py-1 text-[10px] text-[var(--text-muted)] hover:bg-gray-100">Cancel</button>
                    <button onClick={handleDossierUpload} disabled={uploadBusy || !uploadFile || !uploadName.trim()} className="rounded bg-[var(--brand-orange)] px-3 py-1 text-[10px] font-medium text-white hover:opacity-90 disabled:opacity-50">
                      {uploadBusy ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DossierTab({ projectId }: { projectId: string }) {
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [completenessMap, setCompletenessMap] = useState<Record<string, DossierCompletenessResult>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    callOps<DossierData>('get_project_dossier', { project: projectId })
      .then((data) => setDossier(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dossier'))
      .finally(() => setLoading(false));
  }, [projectId, refreshKey]);

  useEffect(() => {
    if (!dossier) return;
    const stages = DOSSIER_STAGE_ORDER.filter((s) => s !== 'Unclassified');
    for (const stage of stages) {
      callOps<DossierCompletenessResult>('check_stage_document_completeness', { project: projectId, stage })
        .then((data) => setCompletenessMap((prev) => ({ ...prev, [stage]: data })))
        .catch(() => {});
    }
  }, [dossier, projectId]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" /></div>;
  }
  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  }

  const sortedStages = DOSSIER_STAGE_ORDER.filter((stage) => {
    if (stage === 'Unclassified') return Boolean(dossier?.stages[stage]?.length);
    const docsCount = dossier?.stages[stage]?.length || 0;
    const completeness = completenessMap[stage];
    return docsCount > 0 || Boolean(completeness?.total) || Boolean(completeness?.missing_mandatory_count);
  });

  const totalDocs = dossier?.total_documents || 0;
  const totalMissing = Object.values(completenessMap).reduce((sum, c) => sum + c.missing_mandatory_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--accent-strong)]" />
            Project Dossier
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Stage-wise document completeness and controlled document inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-xs text-[var(--text-muted)]">
            {totalDocs} document{totalDocs !== 1 ? 's' : ''}
          </div>
          {totalMissing > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />{totalMissing} mandatory missing
            </div>
          )}
        </div>
      </div>
      {sortedStages.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-[var(--text-muted)] opacity-40" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedStages.map((stage) => (
            <DossierStageSection key={stage} stage={stage} docs={dossier?.stages[stage] || []} completeness={completenessMap[stage] || null} projectId={projectId} onUploaded={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

export default DossierTab;
