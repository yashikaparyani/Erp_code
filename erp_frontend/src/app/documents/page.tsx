'use client';

import { useState } from 'react';
import { Eye, FileText, FolderOpen, GitBranch, Lock, Shield, UploadCloud } from 'lucide-react';
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
	const [showUploadModal, setShowUploadModal] = useState(false);
	const [folderName, setFolderName] = useState('');
	const [uploadForm, setUploadForm] = useState({ document_name: '', linked_project: '', folder: '', category: '', file_url: '' });

	const createFolder = async () => {
		const response = await fetch('/api/documents/folders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ folder_name: folderName, file_name: folderName, folder: 'Home', source: 'custom' }),
		});
		const payload = await response.json().catch(() => ({}));
		if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed to create folder');
		setFolderName('');
		setShowFolderModal(false);
		await foldersState.refresh();
	};

	const uploadDocument = async () => {
		const response = await fetch('/api/documents', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...uploadForm, version: 1 }),
		});
		const payload = await response.json().catch(() => ({}));
		if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed to upload document');
		setUploadForm({ document_name: '', linked_project: '', folder: '', category: '', file_url: '' });
		setShowUploadModal(false);
		await docsState.refresh();
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
				<div className="flex flex-wrap gap-2">
					<button onClick={() => setShowFolderModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Create Folder</button>
					<button onClick={() => setShowUploadModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#1e6b87] px-4 py-2 text-sm font-medium text-white hover:bg-[#185a73]">
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
								<div className="text-sm font-semibold text-gray-900">Frontend upload still gated</div>
								<div className="text-sm text-gray-500">Read APIs are live now; the upload/create flow still needs a matching Next POST proxy before the button can be enabled.</div>
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
										<a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
											<Eye className="h-4 w-4" />
											View
										</a>
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

			{showFolderModal ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
						<h3 className="text-lg font-semibold text-gray-900">Create Folder</h3>
						<input className="input mt-4" value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Folder name" />
						<div className="mt-4 flex justify-end gap-2">
							<button className="btn btn-secondary" onClick={() => setShowFolderModal(false)}>Cancel</button>
							<button className="btn btn-primary" onClick={() => void createFolder()}>Create</button>
						</div>
					</div>
				</div>
			) : null}

			{showUploadModal ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
						<h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
						<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
							<input className="input" value={uploadForm.document_name} onChange={(event) => setUploadForm((prev) => ({ ...prev, document_name: event.target.value }))} placeholder="Document name" />
							<input className="input" value={uploadForm.linked_project} onChange={(event) => setUploadForm((prev) => ({ ...prev, linked_project: event.target.value }))} placeholder="Linked project" />
							<input className="input" value={uploadForm.folder} onChange={(event) => setUploadForm((prev) => ({ ...prev, folder: event.target.value }))} placeholder="Folder" />
							<input className="input" value={uploadForm.category} onChange={(event) => setUploadForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Category" />
							<input className="input sm:col-span-2" value={uploadForm.file_url} onChange={(event) => setUploadForm((prev) => ({ ...prev, file_url: event.target.value }))} placeholder="File URL" />
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
							<button className="btn btn-primary" onClick={() => void uploadDocument()}>Upload</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
