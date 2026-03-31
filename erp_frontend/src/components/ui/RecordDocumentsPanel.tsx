'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { getFileProxyUrl } from '@/lib/fileLinks';

/* ─── Types ────────────────────────────────────────────── */

interface RecordDocument {
  name: string;
  document_name?: string;
  linked_project?: string;
  linked_site?: string;
  linked_stage?: string;
  category?: string;
  document_subcategory?: string;
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
}

interface RecordDocumentsPanelProps {
  referenceDoctype: string;
  referenceName: string;
  title?: string;
  compact?: boolean;
  initialLimit?: number;
  linkedProject?: string;
}

/* ─── Helpers ──────────────────────────────────────────── */

function docStatusBadge(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'reviewed') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (s === 'expired') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

function docStatusIcon(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  if (s === 'reviewed') return <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />;
  if (s === 'rejected') return <AlertCircle className="h-3.5 w-3.5 text-rose-600" />;
  return <Clock className="h-3.5 w-3.5 text-gray-400" />;
}

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RecordExpiryBadge({ expiryDate }: { expiryDate?: string }) {
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
  return <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{formatDate(expiryDate)}</span>;
}

/* ─── Component ────────────────────────────────────────── */

export default function RecordDocumentsPanel({
  referenceDoctype,
  referenceName,
  title = 'Linked Documents',
  compact = false,
  initialLimit = 5,
  linkedProject,
}: RecordDocumentsPanelProps) {
  const [docs, setDocs] = useState<RecordDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const normalizedReferenceDoctype = (referenceDoctype || '').trim();
  const normalizedReferenceName = (referenceName || '').trim();
  const hasReference =
    Boolean(normalizedReferenceDoctype) &&
    Boolean(normalizedReferenceName) &&
    normalizedReferenceDoctype.toLowerCase() !== 'undefined' &&
    normalizedReferenceName.toLowerCase() !== 'undefined' &&
    normalizedReferenceDoctype.toLowerCase() !== 'null' &&
    normalizedReferenceName.toLowerCase() !== 'null';
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);

  const fetchDocs = useCallback(async () => {
    if (!hasReference) {
      setDocs([]);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'get_record_documents',
          reference_doctype: normalizedReferenceDoctype,
          reference_name: normalizedReferenceName,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to load documents');
      setDocs(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [hasReference, normalizedReferenceDoctype, normalizedReferenceName]);

  const handleRecordUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return;
    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_name', uploadName.trim());
      formData.append('reference_doctype', referenceDoctype);
      formData.append('reference_name', referenceName);
      formData.append('category', 'Other');
      if (linkedProject) formData.append('linked_project', linkedProject);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const payload = await res.json();
      if (!res.ok || payload.success === false) {
        setError(payload.message || 'Upload failed');
        return;
      }
      setUploadFile(null);
      setUploadName('');
      setShowUpload(false);
      fetchDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadBusy(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const visible = expanded ? docs : docs.slice(0, initialLimit);
  const hasMore = docs.length > initialLimit;

  if (loading) {
    return (
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">{title}</h3></div>
        <div className="card-body flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-400">Loading documents…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">{title}</h3></div>
        <div className="card-body flex items-center justify-center py-6 text-sm text-rose-500">
          <AlertCircle className="mr-2 h-4 w-4" /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
          <button onClick={() => setShowUpload(!showUpload)} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100">
            <Upload className="h-3 w-3" /> Upload
          </button>
        </div>
      </div>
      <div className="card-body">
        {showUpload && (
          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input type="text" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Document name *" className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs file:mr-2 file:rounded file:border-0 file:bg-blue-600 file:px-2 file:py-0.5 file:text-[10px] file:font-medium file:text-white" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowUpload(false)} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">Cancel</button>
              <button onClick={handleRecordUpload} disabled={uploadBusy || !uploadFile || !uploadName.trim()} className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {uploadBusy ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        )}
        {docs.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Upload className="h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-400">No documents linked to this record yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((doc) => (
              <div
                key={doc.name}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300"
              >
                <div className="mt-0.5">{docStatusIcon(doc.status)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {doc.document_name || doc.name}
                    </span>
                    {doc.is_mandatory === 1 && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                        Required
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${docStatusBadge(doc.status)}`}>
                      {doc.status || 'Pending'}
                    </span>
                    {doc.version && (
                      <span className="text-[10px] text-gray-400">v{doc.version}</span>
                    )}
                  </div>
                  {!compact && (
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      {doc.category && <span>Category: {doc.category}</span>}
                      {doc.document_subcategory && <span>Sub: {doc.document_subcategory}</span>}
                      {doc.uploaded_by && <span>By: {doc.uploaded_by}</span>}
                      {doc.uploaded_on && <span>On: {formatDate(doc.uploaded_on)}</span>}
                      {doc.approved_by && <span>Approved: {doc.approved_by}</span>}
                      <RecordExpiryBadge expiryDate={doc.expiry_date} />
                    </div>
                  )}
                </div>
                {doc.file && (
                  <a
                    href={getFileProxyUrl(doc.file, true)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                    title="Download / View"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                {expanded ? (
                  <>Show Less <ChevronUp className="h-3.5 w-3.5" /></>
                ) : (
                  <>Show All ({docs.length}) <ChevronDown className="h-3.5 w-3.5" /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
