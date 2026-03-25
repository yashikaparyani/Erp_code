'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  FolderOpen,
  FolderPlus,
  GitBranch,
  Lock,
  Shield,
  UploadCloud,
  X,
} from 'lucide-react';
import { EmptyState, SectionCard, formatDateTime, useApiData } from '../../components/dashboards/shared';

type FolderRecord = {
  name: string;
  folder_name?: string;
  file_name?: string;
  department?: string;
  linked_project?: string;
  file_count?: number;
  folder?: string;
};

type DocumentRecord = {
  name: string;
  file_name?: string;
  document_name?: string;
  folder?: string;
  linked_project?: string;
  linked_site?: string;
  category?: string;
  file?: string;
  file_url?: string;
  version?: number;
  version_count?: number;
  is_latest_version?: boolean;
  uploaded_by?: string;
  uploaded_on?: string;
  modified?: string;
  creation?: string;
  expiry_date?: string;
  days_until_expiry?: number | null;
  remarks?: string;
};

const initialFolders: FolderRecord[] = [];
const initialDocuments: DocumentRecord[] = [];
const DOC_CATEGORIES = ['All', 'Survey', 'Engineering', 'Procurement', 'Execution', 'O&M', 'Finance', 'HR', 'Other'] as const;

function getFileExtension(fileUrl?: string) {
  const cleaned = (fileUrl || '').split('?', 1)[0].trim().toLowerCase();
  return cleaned.includes('.') ? cleaned.split('.').pop() || '' : '';
}

function isPreviewable(fileUrl?: string) {
  return ['pdf', 'jpg', 'jpeg'].includes(getFileExtension(fileUrl));
}

function getFolderAccent(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes('survey')) return 'bg-blue-100 text-blue-700';
  if (normalized.includes('engineer')) return 'bg-purple-100 text-purple-700';
  if (normalized.includes('procure') || normalized.includes('purchase')) return 'bg-green-100 text-green-700';
  if (normalized.includes('execut')) return 'bg-orange-100 text-orange-700';
  if (normalized.includes('om') || normalized.includes('rma')) return 'bg-red-100 text-red-700';
  if (normalized.includes('account') || normalized.includes('finance')) return 'bg-cyan-100 text-cyan-700';
  return 'bg-slate-100 text-slate-700';
}

function ExpiryBadge({ expiryDate, daysUntilExpiry }: { expiryDate?: string; daysUntilExpiry?: number | null }) {
  if (!expiryDate) {
    return <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Untracked</span>;
  }

  if ((daysUntilExpiry ?? 0) < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
        <AlertCircle className="h-3 w-3" />
        Expired {new Date(expiryDate).toLocaleDateString('en-IN')}
      </span>
    );
  }

  if ((daysUntilExpiry ?? 9999) <= 30) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <Clock className="h-3 w-3" />
        {daysUntilExpiry}d left
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      Valid till {new Date(expiryDate).toLocaleDateString('en-IN')}
    </span>
  );
}

export default function DocumentsPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSite, setSelectedSite] = useState('');
  const [latestOnly, setLatestOnly] = useState(true);

  const docsUrl = `/api/documents?source=custom${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ''}${selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : ''}${selectedSite ? `&site=${encodeURIComponent(selectedSite)}` : ''}${latestOnly ? '&latest_only=1' : ''}`;
  const foldersState = useApiData<FolderRecord[]>('/api/documents/folders?source=custom', initialFolders);
  const docsState = useApiData<DocumentRecord[]>(docsUrl, initialDocuments);
  const folders = foldersState.data;
  const documents = docsState.data;
  const loading = foldersState.loading || docsState.loading;
  const error = foldersState.error || docsState.error;
  const lastUpdated = docsState.lastUpdated || foldersState.lastUpdated;

  const projectOptions = Array.from(new Set([...folders.map((folder) => folder.linked_project || ''), ...documents.map((doc) => doc.linked_project || '')].filter(Boolean))).sort();
  const siteOptions = Array.from(new Set(documents.map((doc) => doc.linked_site || '').filter(Boolean))).sort();
  const linkedProjects = new Set(documents.map((doc) => doc.linked_project).filter(Boolean));
  const expiringSoon = documents.filter((doc) => typeof doc.days_until_expiry === 'number' && doc.days_until_expiry >= 0 && doc.days_until_expiry <= 30);
  const expired = documents.filter((doc) => typeof doc.days_until_expiry === 'number' && doc.days_until_expiry < 0);
  const versionedDocs = documents.filter((doc) => Number(doc.version_count || 1) > 1 && doc.is_latest_version !== false);
  const attentionDocs = [...expired, ...expiringSoon].slice(0, 6);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    document_name: '',
    linked_project: selectedProject,
    linked_site: selectedSite,
    folder: '',
    category: selectedCategory === 'All' ? '' : selectedCategory,
    expiry_date: '',
    remarks: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [versionDoc, setVersionDoc] = useState<DocumentRecord | null>(null);
  const [versions, setVersions] = useState<DocumentRecord[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setBusy(true);
    try {
      await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'create_document_folder', args: { folder_name: newFolderName.trim() } }),
      });
      setNewFolderName('');
      setShowFolderModal(false);
      await foldersState.refresh();
    } catch (createError) {
      console.error('Create folder failed:', createError);
    }
    setBusy(false);
  };

  const handleUpload = async () => {
    if (!uploadForm.document_name.trim() || !uploadFile) return;
    setBusy(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_name', uploadForm.document_name.trim());
      formData.append('linked_project', uploadForm.linked_project.trim());
      if (uploadForm.linked_site.trim()) formData.append('linked_site', uploadForm.linked_site.trim());
      if (uploadForm.folder) formData.append('folder', uploadForm.folder);
      if (uploadForm.category) formData.append('category', uploadForm.category);
      if (uploadForm.expiry_date) formData.append('expiry_date', uploadForm.expiry_date);
      if (uploadForm.remarks.trim()) formData.append('remarks', uploadForm.remarks.trim());
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const payload = await res.json();
      if (!res.ok || payload.success === false) {
        setUploadError(payload.message || 'Upload failed');
      } else {
        setUploadForm({
          document_name: '',
          linked_project: selectedProject,
          linked_site: selectedSite,
          folder: '',
          category: selectedCategory === 'All' ? '' : selectedCategory,
          expiry_date: '',
          remarks: '',
        });
        setUploadFile(null);
        setShowUploadModal(false);
        await docsState.refresh();
      }
    } catch (uploadFailure) {
      setUploadError(uploadFailure instanceof Error ? uploadFailure.message : 'Upload failed');
    }
    setBusy(false);
  };

  const openVersions = async (doc: DocumentRecord) => {
    setVersionDoc(doc);
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/documents/versions?name=${encodeURIComponent(doc.name)}`, { cache: 'no-store' });
      const payload = await res.json();
      setVersions(payload.data || []);
    } catch (versionError) {
      console.error('Failed to load document versions:', versionError);
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body py-16 text-center text-sm text-gray-500">Loading document folders and project document context...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body py-12 text-center">
          <div className="text-lg font-semibold text-gray-900">Document Management</div>
          <div className="mt-2 text-sm text-red-600">{error}</div>
          <button
            onClick={() => {
              void foldersState.refresh();
              void docsState.refresh();
            }}
            className="mt-4 rounded-lg bg-[#1e6b87] px-4 py-2 text-sm font-medium text-white hover:bg-[#185a73]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Project-aware document control with version history, expiry visibility, and site context
            {lastUpdated ? ` • Last updated: ${lastUpdated}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFolderModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </button>
          <button
            onClick={() => {
              setUploadForm((current) => ({
                ...current,
                linked_project: selectedProject,
                linked_site: selectedSite,
                category: selectedCategory === 'All' ? current.category : selectedCategory,
              }));
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e6b87] px-4 py-2 text-sm font-medium text-white hover:bg-[#185a73]"
          >
            <UploadCloud className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <div className="stat-label">Folders</div>
          <div className="stat-value mt-1">{folders.length}</div>
          <div className="mt-2 text-xs text-gray-500">Custom GE document folders currently available</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{latestOnly ? 'Latest Docs' : 'Document Rows'}</div>
          <div className="stat-value mt-1">{documents.length}</div>
          <div className="mt-2 text-xs text-gray-500">{latestOnly ? 'Latest active revisions in the current slice' : 'Every version returned by the backend'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Linked Projects</div>
          <div className="stat-value mt-1">{linkedProjects.size}</div>
          <div className="mt-2 text-xs text-gray-500">Projects with at least one uploaded custom document</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Controlled Docs</div>
          <div className="stat-value mt-1">{documents.filter((doc) => !!doc.expiry_date).length}</div>
          <div className="mt-2 text-xs text-gray-500">Documents already tracked with expiry metadata</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-700">Controlled Delivery Docs</div>
          <h3 className="mt-2 text-base font-semibold text-gray-900">Bring governed files back into operations</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Use the DMS together with project and execution workspaces so signoffs, reports, and controlled deliverables are visible where decisions happen.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/projects" className="rounded-full border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100">
              Project workspace
            </Link>
            <Link href="/execution/commissioning" className="rounded-full border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100">
              Commissioning lane
            </Link>
            <Link href="/notifications?filter=documents" className="rounded-full border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100">
              Document alerts
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">Attention Queue</div>
          <h3 className="mt-2 text-base font-semibold text-gray-900">{attentionDocs.length} document signal{attentionDocs.length !== 1 ? 's' : ''} need follow-up</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Expiry risk and missing governance should be cleared before field delivery and signoff get blocked.
          </p>
          <div className="mt-4 text-xs text-gray-600">
            Expired: <span className="font-semibold text-rose-600">{expired.length}</span> • Expiring soon: <span className="font-semibold text-amber-700">{expiringSoon.length}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">Execution Context</div>
          <h3 className="mt-2 text-base font-semibold text-gray-900">Keep site and stage linkage visible</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Filter by project and site when checking controlled reports so execution teams see only the live slice they need.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/execution" className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
              Execution home
            </Link>
            <Link href="/execution/projects" className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
              Execution workspace
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <SectionCard title="Project Folders" subtitle="Folder records returned by GE Document Folder">
          {folders.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {folders.map((folder) => {
                const label = folder.folder_name || folder.file_name || folder.name;
                return (
                  <div key={folder.name} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${getFolderAccent(label)}`}>
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{label}</div>
                    <div className="mt-1 text-xs text-gray-500">{folder.file_count || 0} files</div>
                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      <div>Department: {folder.department || '-'}</div>
                      <div>Project: {folder.linked_project || '-'}</div>
                      <div>Parent: {folder.folder || 'Home'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No custom document folders have been created yet." />
          )}
        </SectionCard>

        <SectionCard title="Access Model" subtitle="What this live document hub is already enforcing">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-700"><Shield className="h-4 w-4" /></div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Role-gated backend access</div>
                <div className="text-sm text-gray-500">Folder and document reads are already protected by backend document-access guards.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <div className="rounded-lg bg-purple-100 p-2 text-purple-700"><GitBranch className="h-4 w-4" /></div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Version-aware register</div>
                <div className="text-sm text-gray-500">The standalone DMS now exposes latest-vs-history context instead of flattening every revision.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700"><Lock className="h-4 w-4" /></div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Project and site context</div>
                <div className="text-sm text-gray-500">Filters, uploads, and expiry signals can now stay in the same project/site slice.</div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Document Register" subtitle="Version-aware project documents with expiry and site context">
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    setSelectedSite('');
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6b87]"
                >
                  <option value="">All projects</option>
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6b87]"
                >
                  {DOC_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Site</label>
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6b87]"
                >
                  <option value="">All sites</option>
                  {siteOptions.map((site) => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={latestOnly}
                  onChange={(e) => setLatestOnly(e.target.checked)}
                  className="rounded border-gray-300 text-[#1e6b87] focus:ring-[#1e6b87]"
                />
                Latest versions only
              </label>
              {(expired.length > 0 || expiringSoon.length > 0) && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  {expired.length + expiringSoon.length} docs need attention
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-violet-600">Versioned Docs</div>
              <div className="mt-1 text-xl font-bold text-violet-700">{versionedDocs.length}</div>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-amber-600">Expiring Soon</div>
              <div className="mt-1 text-xl font-bold text-amber-700">{expiringSoon.length}</div>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-rose-600">Expired</div>
              <div className="mt-1 text-xl font-bold text-rose-700">{expired.length}</div>
            </div>
          </div>

          {documents.length ? (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Document</th>
                    <th className="px-4 py-3 font-medium">Context</th>
                    <th className="px-4 py-3 font-medium">Version</th>
                    <th className="px-4 py-3 font-medium">Expiry</th>
                    <th className="px-4 py-3 font-medium">Uploaded</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {documents.slice(0, 25).map((doc) => {
                    const fileUrl = doc.file_url || doc.file;
                    const hasHistory = Number(doc.version_count || 1) > 1;
                    return (
                      <tr key={doc.name} className="hover:bg-gray-50">
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-gray-900">{doc.document_name || doc.file_name || doc.name}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {doc.category || 'Uncategorized'}
                            {doc.folder ? ` • ${doc.folder}` : ''}
                            {!doc.is_latest_version ? ' • superseded revision' : ''}
                          </div>
                          {doc.remarks ? <div className="mt-1 text-xs italic text-gray-500">{doc.remarks}</div> : null}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-gray-600">
                          <div>Project: {doc.linked_project || '-'}</div>
                          <div className="mt-1">Site: {doc.linked_site || 'Project-level'}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <button
                            onClick={() => openVersions(doc)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${hasHistory ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-slate-100 text-slate-600'}`}
                            title={hasHistory ? `${doc.version_count} versions available` : 'Single version'}
                          >
                            v{doc.version || 1}
                            {hasHistory ? (
                              <>
                                <span className="opacity-70">of {doc.version_count}</span>
                                <ChevronDown className="h-3 w-3" />
                              </>
                            ) : null}
                          </button>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <ExpiryBadge expiryDate={doc.expiry_date} daysUntilExpiry={doc.days_until_expiry} />
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-gray-600">
                          <div>{doc.uploaded_by || 'Unknown'}</div>
                          <div className="mt-1">{formatDateTime(doc.modified || doc.uploaded_on || doc.creation)}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-end gap-3">
                            {fileUrl && isPreviewable(fileUrl) ? (
                              <button
                                onClick={() => setPreviewDoc(doc)}
                                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                <Eye className="h-4 w-4" />
                                Preview
                              </button>
                            ) : null}
                            {fileUrl ? (
                              <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
                                <Download className="h-4 w-4" />
                                {isPreviewable(fileUrl) ? 'Open' : 'Download'}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">No file</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No project documents match the current filter slice." />
          )}
        </SectionCard>
      </div>

      {attentionDocs.length > 0 && (
        <div className="mt-6">
          <SectionCard title="Documents Needing Immediate Attention" subtitle="Top expiry-driven records to clear from the frontend">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {attentionDocs.map((doc) => (
                <div key={doc.name} className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{doc.document_name || doc.file_name || doc.name}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {doc.linked_project || 'No project'} • {doc.linked_site || 'Project-level'}
                      </div>
                    </div>
                    <ExpiryBadge expiryDate={doc.expiry_date} daysUntilExpiry={doc.days_until_expiry} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(doc.file_url || doc.file) && isPreviewable(doc.file_url || doc.file) ? (
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                      >
                        Preview
                      </button>
                    ) : null}
                    {doc.linked_project ? (
                      <Link href={`/projects/${encodeURIComponent(doc.linked_project)}?tab=files`} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                        Open project files
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-lg font-semibold">Create Folder</h3>
              <button onClick={() => setShowFolderModal(false)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Folder Name</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Engineering Docs"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3 border-t px-4 py-3">
              <button onClick={() => setShowFolderModal(false)} className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button>
              <button onClick={handleCreateFolder} disabled={busy} className="rounded-lg bg-[#1e6b87] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-lg font-semibold">Upload Document</h3>
              <button onClick={() => { setShowUploadModal(false); setUploadError(''); }} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Document Name *</label>
                <input
                  type="text"
                  value={uploadForm.document_name}
                  onChange={(e) => setUploadForm((current) => ({ ...current, document_name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">File *</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#1e6b87] file:px-3 file:py-1 file:text-sm file:font-medium file:text-white hover:file:bg-[#185a73]"
                />
                {uploadFile ? <p className="mt-1 text-xs text-gray-500">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Linked Project *</label>
                <input
                  type="text"
                  list="document-project-options"
                  value={uploadForm.linked_project}
                  onChange={(e) => setUploadForm((current) => ({ ...current, linked_project: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="document-project-options">
                  {projectOptions.map((project) => (
                    <option key={project} value={project} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Linked Site</label>
                <input
                  type="text"
                  list="document-site-options"
                  value={uploadForm.linked_site}
                  onChange={(e) => setUploadForm((current) => ({ ...current, linked_site: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="document-site-options">
                  {siteOptions.map((site) => (
                    <option key={site} value={site} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Folder</label>
                <select
                  value={uploadForm.folder}
                  onChange={(e) => setUploadForm((current) => ({ ...current, folder: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select folder</option>
                  {folders.map((folder) => (
                    <option key={folder.name} value={folder.name}>{folder.folder_name || folder.file_name || folder.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm((current) => ({ ...current, category: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {DOC_CATEGORIES.filter((category) => category !== 'All').map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Expiry Date</label>
                <input
                  type="date"
                  value={uploadForm.expiry_date}
                  onChange={(e) => setUploadForm((current) => ({ ...current, expiry_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  value={uploadForm.remarks}
                  onChange={(e) => setUploadForm((current) => ({ ...current, remarks: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {uploadError ? <p className="md:col-span-2 text-sm text-red-600">{uploadError}</p> : null}
            </div>
            <div className="flex justify-end gap-3 border-t px-4 py-3">
              <button onClick={() => { setShowUploadModal(false); setUploadError(''); }} className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button>
              <button
                onClick={handleUpload}
                disabled={busy || !uploadForm.document_name.trim() || !uploadForm.linked_project.trim() || !uploadForm.category.trim() || !uploadFile}
                className="rounded-lg bg-[#1e6b87] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {versionDoc && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setVersionDoc(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-md bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Version History</h3>
                <p className="text-xs text-gray-500">{versionDoc.document_name || versionDoc.name}</p>
              </div>
              <button onClick={() => setVersionDoc(null)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-80px)] overflow-y-auto p-5">
              {versionsLoading ? (
                <p className="py-8 text-center text-sm text-gray-500">Loading version history...</p>
              ) : !versions.length ? (
                <p className="py-8 text-center text-sm text-gray-500">No version history found.</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((doc, index) => {
                    const fileUrl = doc.file_url || doc.file;
                    return (
                      <div key={doc.name} className={`rounded-xl border p-3 ${index === 0 ? 'border-violet-200 bg-violet-50/50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ${index === 0 ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600'}`}>
                            v{doc.version || 1}{index === 0 ? ' (latest)' : ''}
                          </span>
                          {fileUrl ? (
                            <div className="flex items-center gap-3">
                              {isPreviewable(fileUrl) ? (
                                <button onClick={() => setPreviewDoc(doc)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                  <FileText className="h-3 w-3" />
                                  Preview
                                </button>
                              ) : null}
                              <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <Download className="h-3 w-3" />
                                {isPreviewable(fileUrl) ? 'Open' : 'Download'}
                              </a>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-gray-500">
                          <div>Uploaded by: {doc.uploaded_by || '-'}</div>
                          <div>{formatDateTime(doc.uploaded_on || doc.creation)}</div>
                          <div>Site: {doc.linked_site || 'Project-level'}</div>
                          {doc.remarks ? <div className="italic">{doc.remarks}</div> : null}
                          <div><ExpiryBadge expiryDate={doc.expiry_date} daysUntilExpiry={doc.days_until_expiry} /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewDoc && (previewDoc.file_url || previewDoc.file) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">{previewDoc.document_name || previewDoc.file_name || previewDoc.name}</div>
                <div className="text-xs text-gray-500">{previewDoc.category || 'Document'}</div>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="rounded-md p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative h-[75vh] bg-gray-100">
              {getFileExtension(previewDoc.file_url || previewDoc.file) === 'pdf' ? (
                <iframe title={previewDoc.document_name || previewDoc.name} src={previewDoc.file_url || previewDoc.file} className="h-full w-full" />
              ) : (
                <img
                  src={previewDoc.file_url || previewDoc.file || ''}
                  alt={previewDoc.document_name || previewDoc.name}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
