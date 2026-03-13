'use client';
import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Download, ChevronRight, ChevronDown, ChevronsLeft, ChevronsRight, X } from 'lucide-react';

interface FolderData {
  id: number;
  folderName: string;
  createdBy: string;
  createdDateTime: string;
  subFolders?: SubFolderData[];
}

interface SubFolderData {
  id: number;
  folderName: string;
  createdBy: string;
  createdDateTime: string;
}

const mockFolders: FolderData[] = [
  { 
    id: 1, 
    folderName: 'Noida', 
    createdBy: 'Purnima Nigam', 
    createdDateTime: '25-01-2025 16:40',
    subFolders: [
      { id: 101, folderName: 'Q1 2025', createdBy: 'Purnima Nigam', createdDateTime: '26-01-2025 10:30' },
      { id: 102, folderName: 'Q2 2025', createdBy: 'Purnima Nigam', createdDateTime: '01-04-2025 09:15' },
    ]
  },
  { 
    id: 2, 
    folderName: 'Delhi', 
    createdBy: 'Ankit Mishra', 
    createdDateTime: '28-01-2025 11:20',
    subFolders: [
      { id: 201, folderName: 'Contracts', createdBy: 'Ankit Mishra', createdDateTime: '29-01-2025 14:00' },
    ]
  },
  { 
    id: 3, 
    folderName: 'Mumbai', 
    createdBy: 'Rahul Sharma', 
    createdDateTime: '02-02-2025 09:45',
  },
  { 
    id: 4, 
    folderName: 'Bangalore', 
    createdBy: 'Priya Singh', 
    createdDateTime: '05-02-2025 14:30',
  },
];

export default function FoldersPage() {
  const [data] = useState<FolderData[]>(mockFolders);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

  const toggleFolder = (folderId: number) => {
    setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      console.log('Creating folder:', newFolderName);
      setNewFolderName('');
      setShowModal(false);
    }
  };

  const filteredData = data.filter(folder =>
    folder.folderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Folders</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage document folders</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div></div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Folder
          </button>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider w-12"></th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-16">#</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Folder Name</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Created By</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Created Date & Time</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    No folders found.
                  </td>
                </tr>
              ) : (
                filteredData.map((folder, index) => (
                  <>
                    <tr key={folder.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        {folder.subFolders && folder.subFolders.length > 0 && (
                          <button
                            onClick={() => toggleFolder(folder.id)}
                            className="p-1 text-gray-500 hover:text-gray-700"
                          >
                            {expandedFolders.includes(folder.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 text-center">{index + 1}</td>
                      <td className="px-3 py-3 text-sm text-blue-600 text-center font-medium">
                        <a href="#" className="hover:underline">{folder.folderName}</a>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 text-center">{folder.createdBy}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 text-center">{folder.createdDateTime}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Sub Folders */}
                    {expandedFolders.includes(folder.id) && folder.subFolders?.map((subFolder, subIndex) => (
                      <tr key={subFolder.id} className="bg-gray-50 hover:bg-gray-100">
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 text-sm text-gray-900 text-center pl-8">
                          {index + 1}.{subIndex + 1}
                        </td>
                        <td className="px-3 py-3 text-sm text-blue-600 text-center font-medium pl-8">
                          <a href="#" className="hover:underline">└ {subFolder.folderName}</a>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">{subFolder.createdBy}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 text-center">{subFolder.createdDateTime}</td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded">
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Prev
            </button>
            <span className="px-3 py-1 bg-[#1e6b87] text-white rounded text-sm font-medium">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Create New Folder</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] transition-colors text-sm font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
