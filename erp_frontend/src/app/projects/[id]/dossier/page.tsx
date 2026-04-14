'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Shield,
  XCircle,
} from 'lucide-react';
import { dmsApi } from '@/lib/typedApi';
import { getFileProxyUrl } from '@/lib/fileLinks';

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

type CompletenessResult = {
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

const STAGE_ORDER = [
  'Survey', 'BOM_BOQ', 'Drawing', 'Indent', 'Quotation_Vendor_Comparison',
  'PO', 'Dispatch', 'GRN_Inventory', 'Execution', 'Commissioning',
  'O_M', 'SLA', 'RMA', 'Commercial', 'Closure', 'Unclassified',
];

const STAGE_LABELS: Record<string, string> = {
  Survey: 'Survey',
  BOM_BOQ: 'BOM / BOQ',
  Drawing: 'Drawings',
  Indent: 'Indent',
  Quotation_Vendor_Comparison: 'Quotation / Vendor Comparison',
  PO: 'Purchase Order',
  Dispatch: 'Dispatch',
  GRN_Inventory: 'GRN / Inventory',
  Execution: 'Execution / I&C',
  Commissioning: 'Commissioning',
  O_M: 'O&M',
  SLA: 'SLA',
  RMA: 'RMA',
  Commercial: 'Commercial',
  Closure: 'Closure',
  Unclassified: 'Unclassified',
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  const tone = s === 'approved' ? 'bg-emerald-100 text-emerald-700'
    : s === 'rejected' ? 'bg-rose-100 text-rose-700'
    : s === 'blocked' ? 'bg-amber-100 text-amber-700'
    : s === 'in review' ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700';
  return <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{status || 'Draft'}</span>;
}

function StageSection({
  stage,
  docs,
  completeness,
}: {
  stage: string;
  docs: DossierDocument[];
  completeness: CompletenessResult | null;
}) {
  const [open, setOpen] = useState(true);
  const label = STAGE_LABELS[stage] || stage;
  const mandatoryCount = completeness?.total || 0;
  const satisfiedCount = completeness?.satisfied_count || 0;
  const missingCount = completeness?.missing_mandatory_count || 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {docs.length} doc{docs.length !== 1 ? 's' : ''}
          </span>
        </div>
        {mandatoryCount > 0 && (
          <div className="flex items-center gap-2 text-[10px]">
            {missingCount > 0 ? (
              <span className="flex items-center gap-1 text-rose-600">
                <AlertTriangle className="h-3 w-3" />
                {missingCount} missing
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                {satisfiedCount}/{mandatoryCount} complete
              </span>
            )}
          </div>
        )}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-3">
          {docs.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No documents for this stage</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.name} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{doc.document_name}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-slate-500">{doc.category}</span>
                        {doc.document_subcategory && (
                          <span className="text-[10px] text-slate-400">/ {doc.document_subcategory}</span>
                        )}
                        {doc.reference_doctype && (
                          <span className="text-[10px] text-purple-500">{doc.reference_doctype}: {doc.reference_name}</span>
                        )}
                        {doc.is_mandatory ? (
                          <span className="text-[10px] text-rose-500 font-medium">Mandatory</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={doc.status} />
                    <span className="text-[10px] text-slate-400">v{doc.version || 1}</span>
                    {doc.file && (
                      <a href={getFileProxyUrl(doc.file)} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                        <FileText className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Missing requirements */}
          {completeness && completeness.requirements.filter(r => r.mandatory && !r.satisfied).length > 0 && (
            <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3">
              <p className="text-[10px] font-semibold text-rose-700 mb-1.5 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Missing Mandatory Documents
              </p>
              <div className="space-y-1">
                {completeness.requirements.filter(r => r.mandatory && !r.satisfied).map((r, i) => (
                  <p key={i} className="text-[10px] text-rose-600">
                    {r.category}{r.subcategory ? ` / ${r.subcategory}` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDossierPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [completenessMap, setCompletenessMap] = useState<Record<string, CompletenessResult>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    dmsApi.getProjectDossier<DossierData>(projectId)
      .then((data) => {
        setDossier(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dossier'))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Load completeness for each stage that has documents
  useEffect(() => {
    if (!dossier) return;
    const stages = STAGE_ORDER.filter((s) => s !== 'Unclassified');
    stages.forEach((stage) => {
      dmsApi.getCompleteness<CompletenessResult>({ project: projectId, stage })
        .then((data) => {
          setCompletenessMap((prev) => ({ ...prev, [stage]: data }));
        })
        .catch(() => {});
    });
  }, [dossier, projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      </div>
    );
  }

  const sortedStages = STAGE_ORDER.filter((stage) => {
    if (stage === 'Unclassified') {
      return Boolean(dossier?.stages[stage]?.length);
    }
    const docsCount = dossier?.stages[stage]?.length || 0;
    const completeness = completenessMap[stage];
    return docsCount > 0 || Boolean(completeness?.total) || Boolean(completeness?.missing_mandatory_count);
  });
  const totalDocs = dossier?.total_documents || 0;
  const totalMissing = Object.values(completenessMap).reduce((sum, c) => sum + c.missing_mandatory_count, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}`} className="hover:text-blue-600">{projectId}</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Dossier</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Project Dossier
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            {totalDocs} document{totalDocs !== 1 ? 's' : ''}
          </div>
          {totalMissing > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {totalMissing} mandatory missing
            </div>
          )}
        </div>
      </div>

      {/* Stage sections */}
      {sortedStages.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedStages.map((stage) => (
            <StageSection
              key={stage}
              stage={stage}
              docs={dossier?.stages[stage] || []}
              completeness={completenessMap[stage] || null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
