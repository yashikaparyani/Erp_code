'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Download, ChevronRight, ChevronDown, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import ModalFrame from '@/components/ui/ModalFrame';

interface FolderData {
  name: string;
  file_name: string;
  folder: string;
  creation: string;
  owner: string;
  file_count: number;
}

type FolderDialogState =
  | { mode: 'rename'; folder: FolderData; value: string }
  | { mode: 'delete'; folder: FolderData }
  | null;

export default function FoldersPage() {
  const [data, setData] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<FolderDialogState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingFolder, setDownloadingFolder] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/documents/folders');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        return;
      }
      setError(json.message || 'Failed to fetch folders');
    } catch (fetchError) {
      console.error('Failed to fetch:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch folders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFolders();
  }, [fetchFolders]);

  const topLevelFolders = data.filter((f) => !f.folder || f.folder === 'Home');
  const getChildren = (parentName: string) => data.filter((f) => f.folder === parentName);

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => (prev.includes(folderName) ? prev.filter((n) => n !== folderName) : [...prev, folderName]));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Folder name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_name: newFolderName.trim(), file_name: newFolderName.trim(), folder: 'Home' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to create folder');
      }
      setNewFolderName('');
      setShowModal(false);
      await fetchFolders();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create folder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenameFolder = async () => {
    if (dialog?.mode !== 'rename') return;
    const nextName = dialog.value.trim();
    if (!nextName || nextName === (dialog.folder.file_name || dialog.folder.name)) {
      setDialog(null);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/documents/folders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: dialog.folder.name, file_name: nextName, folder_name: nextName }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to rename folder');
      }
      setDialog(null);
      await fetchFolders();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Failed to rename folder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (dialog?.mode !== 'delete') return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/documents/folders?name=${encodeURIComponent(dialog.folder.name)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to delete folder');
      }
      setDialog(null);
      await fetchFolders();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete folder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadFolder = async (folder: FolderData) => {
    try {
      setDownloadingFolder(folder.name);
      const relatedRows = data.filter((row) => row.name === folder.name || row.folder === folder.name);
      const csvRows = [
        ['Folder ID', 'Folder Name', 'Parent Folder', 'Created By', 'Created On', 'File Count'],
        ...relatedRows.map((row) => [
          row.name,
          row.file_name || row.name,
          row.folder || 'Home',
          row.owner || '',
          row.creation || '',
          row.file_count || 0,
        ]),
      ];
      const csv = csvRows.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(folder.file_name || folder.name).replace(/[^a-z0-9-_]+/gi, '_').toLowerCase()}-folder-report.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingFolder(null);
    }
  };

  const filteredData = topLevelFolders.filter((folder) => folder.file_name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Folders</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage document folders</p>
      </div>

      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            New Folder
          </button>
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1e6b87]" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1e6b87] text-white">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider w-12"></th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-16">#</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Folder Name</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Files</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Created By</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Created Date & Time</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                      No folders found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((folder, index) => {
                    const children = getChildren(folder.name);
                    return (
                      <Fragment key={folder.name}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 py-3">
                            {children.length > 0 ? (
                              <button onClick={() => toggleFolder(folder.name)} className="p-1 text-gray-500 hover:text-gray-700">
                                {expandedFolders.includes(folder.name) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                          <td className="px-3 py-3 text-sm text-blue-600 text-center font-medium">{folder.file_name || folder.name}</td>
                          <td className="px-3 py-3 text-sm text-gray-900 text-center">{folder.file_count}</td>
                          <td className="px-3 py-3 text-sm text-gray-900 text-center">{folder.owner}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 text-center">{formatDate(folder.creation)}</td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" onClick={() => setDialog({ mode: 'rename', folder, value: folder.file_name || folder.name })}>
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" onClick={() => setDialog({ mode: 'delete', folder })}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => void handleDownloadFolder(folder)} disabled={downloadingFolder === folder.name} title="Download folder register">
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedFolders.includes(folder.name) && children.map((subFolder, subIndex) => (
                          <tr key={subFolder.name} className="bg-gray-50 hover:bg-gray-100">
                            <td className="px-3 py-3"></td>
                            <td className="px-3 py-3 text-sm text-gray-900 text-center pl-8">{index + 1}.{subIndex + 1}</td>
                            <td className="px-3 py-3 text-sm text-blue-600 text-center font-medium pl-8">|- {subFolder.file_name || subFolder.name}</td>
                            <td className="px-3 py-3 text-sm text-gray-900 text-center">{subFolder.file_count}</td>
                            <td className="px-3 py-3 text-sm text-gray-900 text-center">{subFolder.owner}</td>
                            <td className="px-3 py-3 text-sm text-gray-600 text-center">{formatDate(subFolder.creation)}</td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" onClick={() => setDialog({ mode: 'rename', folder: subFolder, value: subFolder.file_name || subFolder.name })}>
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" onClick={() => setDialog({ mode: 'delete', folder: subFolder })}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => void handleDownloadFolder(subFolder)} disabled={downloadingFolder === subFolder.name} title="Download folder register">
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>Page {currentPage} of {totalPages}</span>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                Prev
              </button>
              <span className="px-3 py-1 bg-[#1e6b87] text-white rounded text-sm font-medium">{currentPage}</span>
              <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                Next
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalFrame
        open={showModal}
        title="Create New Folder"
        onClose={() => setShowModal(false)}
        widthClassName="max-w-md"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={() => void handleCreateFolder()} disabled={submitting} className="btn btn-primary">
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </>
        }
      >
        <label className="block text-sm font-medium text-gray-700 mb-2">Folder Name</label>
        <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Enter folder name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </ModalFrame>

      <ModalFrame
        open={dialog?.mode === 'rename'}
        title="Rename Folder"
        onClose={() => setDialog(null)}
        widthClassName="max-w-md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDialog(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={submitting} onClick={() => void handleRenameFolder()}>
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        {dialog?.mode === 'rename' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Folder Name</label>
            <input className="input" value={dialog.value} onChange={(e) => setDialog({ ...dialog, value: e.target.value })} />
          </div>
        ) : null}
      </ModalFrame>

      <ModalFrame
        open={dialog?.mode === 'delete'}
        title="Delete Folder"
        onClose={() => setDialog(null)}
        widthClassName="max-w-md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDialog(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={submitting} onClick={() => void handleDeleteFolder()}>
              {submitting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        {dialog?.mode === 'delete' ? (
          <p className="text-sm text-gray-600">
            Delete <span className="font-semibold text-gray-900">{dialog.folder.file_name || dialog.folder.name}</span> from the document tree?
          </p>
        ) : null}
      </ModalFrame>
    </div>
  );
}
