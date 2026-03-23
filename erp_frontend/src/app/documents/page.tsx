'use client';

import { useState } from 'react';
import { Download, Eye, FileText, FolderOpen, FolderPlus, GitBranch, Lock, Shield, UploadCloud, X } from 'lucide-react';
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
	category?: string;
	file_url?: string;
	version?: number;
	uploaded_by?: string;
	uploaded_on?: string;
	modified?: string;
};

const initialFolders: FolderRecord[] = [];
const initialDocuments: DocumentRecord[] = [];
const DOC_CATEGORIES = ['Survey', 'Engineering', 'Procurement', 'Execution', 'O&M', 'Finance', 'HR', 'Other'] as const;

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

export default function DocumentsPage() {
	const foldersState = useApiData<FolderRecord[]>('/api/documents/folders?source=custom', initialFolders);
	const docsState = useApiData<DocumentRecord[]>('/api/documents?source=custom', initialDocuments);
	const folders = foldersState.data;
	const documents = docsState.data;
	const loading = foldersState.loading || docsState.loading;
	const error = foldersState.error || docsState.error;
	const lastUpdated = foldersState.lastUpdated || docsState.lastUpdated;
	const linkedProjects = new Set(documents.map((doc) => doc.linked_project).filter(Boolean));

	const [showFolderModal, setShowFolderModal] = useState(false);
	const [newFolderName, setNewFolderName] = useState('');
	const [showUploadModal, setShowUploadModal] = useState(false);
	const [uploadForm, setUploadForm] = useState({ document_name: '', linked_project: '', folder: '', category: '' });
	const [uploadFile, setUploadFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

	const handleCreateFolder = async () => {
		if (!newFolderName.trim()) return;
		setBusy(true);
		try {
			await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'create_document_folder', args: { folder_name: newFolderName.trim() } }) });
			setNewFolderName(''); setShowFolderModal(false); foldersState.refresh();
		} catch (e) { console.error('Create folder failed:', e); }
		setBusy(false);
	};

	const [uploadError, setUploadError] = useState('');

	const handleUpload = async () => {
		if (!uploadForm.document_name.trim() || !uploadFile) return;
		setBusy(true);
		setUploadError('');
		try {
			const formData = new FormData();
			formData.append('file', uploadFile);
			formData.append('document_name', uploadForm.document_name.trim());
			if (uploadForm.linked_project) formData.append('linked_project', uploadForm.linked_project);
			if (uploadForm.folder) formData.append('folder', uploadForm.folder);
			if (uploadForm.category) formData.append('category', uploadForm.category);
			const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
			const payload = await res.json();
			if (!res.ok || payload.success === false) {
				setUploadError(payload.message || 'Upload failed');
			} else {
				setUploadForm({ document_name: '', linked_project: '', folder: '', category: '' });
				setUploadFile(null);
				setShowUploadModal(false);
				docsState.refresh();
			}
		} catch (e) { setUploadError(e instanceof Error ? e.message : 'Upload failed'); }
		setBusy(false);
	};

	if (loading) {
		return (
			<div className="card">
				<div className="card-body py-16 text-center text-sm text-gray-500">Loading document folders and recent file metadata...</div>
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
						Custom GE document folders and project documents from the live backend
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
						onClick={() => setShowUploadModal(true)}
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
					<div className="stat-label">Documents</div>
					<div className="stat-value mt-1">{documents.length}</div>
					<div className="mt-2 text-xs text-gray-500">Project documents returned by the live custom API</div>
				</div>
				<div className="stat-card">
					<div className="stat-label">Linked Projects</div>
					<div className="stat-value mt-1">{linkedProjects.size}</div>
					<div className="mt-2 text-xs text-gray-500">Projects with at least one uploaded custom document</div>
				</div>
				<div className="stat-card">
					<div className="stat-label">Versioned Docs</div>
					<div className="stat-value mt-1">{documents.filter((doc) => Number(doc.version || 0) > 1).length}</div>
					<div className="mt-2 text-xs text-gray-500">Documents already tracked beyond version 1</div>
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
								<div className="text-sm font-semibold text-gray-900">Version-aware records</div>
								<div className="text-sm text-gray-500">Custom project documents already carry explicit version numbers for controlled revision history.</div>
							</div>
						</div>
						<div className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
							<div className="rounded-lg bg-amber-100 p-2 text-amber-700"><Lock className="h-4 w-4" /></div>
							<div>
								<div className="text-sm font-semibold text-gray-900">Upload via ops proxy</div>
								<div className="text-sm text-gray-500">Document uploads and folder creation are now wired through the /api/ops endpoint.</div>
							</div>
						</div>
					</div>
				</SectionCard>
			</div>

			<div className="mt-6">
				<SectionCard title="Recent Documents" subtitle="Most recently updated custom GE project documents">
					{documents.length ? (
						<div className="space-y-3">
							{documents.slice(0, 10).map((doc) => (
								<div key={doc.name} className="flex flex-col gap-3 rounded-lg bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
									<div className="flex min-w-0 items-start gap-3">
										<div className="rounded-lg bg-white p-2 text-gray-600 ring-1 ring-gray-200">
											<FileText className="h-5 w-5" />
										</div>
										<div className="min-w-0">
											<div className="truncate text-sm font-semibold text-gray-900">{doc.file_name || doc.document_name || doc.name}</div>
											<div className="mt-1 text-xs text-gray-500">
												{doc.category || 'Uncategorized'}
												{doc.folder ? ` • ${doc.folder}` : ''}
												{doc.linked_project ? ` • ${doc.linked_project}` : ''}
											</div>
											<div className="mt-1 text-xs text-gray-500">
												Uploaded by {doc.uploaded_by || 'Unknown'} • Version {doc.version || 1} • {formatDateTime(doc.modified || doc.uploaded_on)}
											</div>
										</div>
									</div>
									{doc.file_url ? (
										<div className="flex items-center gap-3">
											{isPreviewable(doc.file_url) ? (
												<button
													onClick={() => setPreviewDoc(doc)}
													className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
												>
													<Eye className="h-4 w-4" />
													Preview
												</button>
											) : null}
											<a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
												<Download className="h-4 w-4" />
												{isPreviewable(doc.file_url) ? 'Open' : 'Download'}
											</a>
										</div>
									) : (
										<span className="text-sm text-gray-400">No file URL</span>
									)}
								</div>
							))}
						</div>
					) : (
						<EmptyState message="No custom project documents have been uploaded yet." />
					)}
				</SectionCard>
			</div>

			{/* Create Folder Modal */}
			{showFolderModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
						<div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-lg font-semibold">Create Folder</h3><button onClick={() => setShowFolderModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button></div>
						<div className="p-4"><label className="block text-sm font-medium text-gray-700 mb-2">Folder Name</label><input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g., Engineering Docs" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
						<div className="flex justify-end gap-3 px-4 py-3 border-t"><button onClick={() => setShowFolderModal(false)} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg text-sm font-medium">Cancel</button><button onClick={handleCreateFolder} disabled={busy} className="px-4 py-2 bg-[#1e6b87] text-white rounded-lg text-sm font-medium disabled:opacity-50">{busy ? 'Creating...' : 'Create'}</button></div>
					</div>
				</div>
			)}

			{/* Upload Document Modal */}
			{showUploadModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
						<div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-lg font-semibold">Upload Document</h3><button onClick={() => { setShowUploadModal(false); setUploadError(''); }} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button></div>
						<div className="p-4 space-y-3">
							<div><label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label><input type="text" value={uploadForm.document_name} onChange={(e) => setUploadForm(p => ({ ...p, document_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
								<input
									type="file"
									accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg"
									onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#1e6b87] file:px-3 file:py-1 file:text-sm file:font-medium file:text-white hover:file:bg-[#185a73]"
								/>
								{uploadFile && <p className="mt-1 text-xs text-gray-500">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</p>}
							</div>
							<div><label className="block text-sm font-medium text-gray-700 mb-1">Linked Project *</label><input type="text" value={uploadForm.linked_project} onChange={(e) => setUploadForm(p => ({ ...p, linked_project: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
							<div><label className="block text-sm font-medium text-gray-700 mb-1">Folder</label><select value={uploadForm.folder} onChange={(e) => setUploadForm(p => ({ ...p, folder: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"><option value="">Select folder</option>{folders.map(f => <option key={f.name} value={f.name}>{f.folder_name || f.file_name || f.name}</option>)}</select></div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
								<select value={uploadForm.category} onChange={(e) => setUploadForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
									<option value="">Select category</option>
									{DOC_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
								</select>
							</div>
							{uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
						</div>
						<div className="flex justify-end gap-3 px-4 py-3 border-t"><button onClick={() => { setShowUploadModal(false); setUploadError(''); }} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg text-sm font-medium">Cancel</button><button onClick={handleUpload} disabled={busy || !uploadForm.document_name.trim() || !uploadForm.linked_project.trim() || !uploadForm.category.trim() || !uploadFile} className="px-4 py-2 bg-[#1e6b87] text-white rounded-lg text-sm font-medium disabled:opacity-50">{busy ? 'Uploading...' : 'Upload'}</button></div>
					</div>
				</div>
			)}

			{previewDoc && previewDoc.file_url && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
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
						<div className="h-[75vh] bg-gray-100">
							{getFileExtension(previewDoc.file_url) === 'pdf' ? (
								<iframe title={previewDoc.document_name || previewDoc.name} src={previewDoc.file_url} className="h-full w-full" />
							) : (
								<img src={previewDoc.file_url} alt={previewDoc.document_name || previewDoc.name} className="h-full w-full object-contain" />
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
