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

/* ─── Component ────────────────────────────────────────── */

export default function RecordDocumentsPanel({
  referenceDoctype,
  referenceName,
  title = 'Linked Documents',
  compact = false,
  initialLimit = 5,
}: RecordDocumentsPanelProps) {
  const [docs, setDocs] = useState<RecordDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'get_record_documents',
          reference_doctype: referenceDoctype,
          reference_name: referenceName,
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
  }, [referenceDoctype, referenceName]);

  useEffect(() => {
    if (referenceDoctype && referenceName) fetchDocs();
  }, [fetchDocs, referenceDoctype, referenceName]);

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
        <span className="text-xs text-gray-400">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="card-body">
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
                    {doc.version && doc.version > 1 && (
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
                      {doc.expiry_date && (
                        <span className={new Date(doc.expiry_date) < new Date() ? 'text-rose-500 font-medium' : ''}>
                          Expires: {formatDate(doc.expiry_date)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {doc.file && (
                  <a
                    href={doc.file}
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
