'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, Eye, Edit2, Trash2, Loader2 } from 'lucide-react';

interface DocumentData {
  name: string;
  file_name: string;
  file_url: string;
  file_size: number;
  folder: string;
  is_private: number;
  attached_to_doctype: string;
  attached_to_name: string;
  creation: string;
  modified: string;
  owner: string;
  uploaded_by: string;
}

export default function DocumentBriefCasePage() {
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    folder: '',
    fileName: '',
  });
  const [data, setData] = useState<DocumentData[]>([]);
  const [folders, setFolders] = useState<{ name: string; file_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/documents/folders');
      const json = await res.json();
      if (json.success) setFolders(json.data);
    } catch (e) { console.error('Failed to fetch folders:', e); }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.folder) params.set('folder', filters.folder);
      const res = await fetch(`/api/documents${params.toString() ? '?' + params.toString() : ''}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error('Failed to fetch:', e); }
    finally { setLoading(false); }
  }, [filters.folder]);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const filteredData = filters.fileName
    ? data.filter(d => d.file_name?.toLowerCase().includes(filters.fileName.toLowerCase()))
    : data;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setFilters({ folder: '', fileName: '' });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredData.map(item => item.name));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (name: string, checked: boolean) => {
    if (checked) {
      setSelectedRows(prev => [...prev, name]);
    } else {
      setSelectedRows(prev => prev.filter(rowId => rowId !== name));
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Document Brief Case</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage and organize your documents</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Search className="w-4 h-4" />
            <span className="font-medium">Document Brief Filter</span>
          </div>
          {showFilters ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4">
              <select
                value={filters.folder}
                onChange={(e) => handleFilterChange('folder', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">All Folders</option>
                {folders.map(f => (
                  <option key={f.name} value={f.name}>{f.file_name || f.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="File Name"
                value={filters.fileName}
                onChange={(e) => handleFilterChange('fileName', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleClear}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1e6b87]" />
        </div>
      ) : (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                <th className="px-3 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-white/30"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider w-12">#</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">File Name</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Folder</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Size</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Uploaded By</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Created Date</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                    No data found.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.name)}
                        onChange={(e) => handleSelectRow(row.name, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-3 py-3 text-sm text-blue-600 font-medium">{row.file_name}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{row.folder}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-center">{formatSize(row.file_size)}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{row.uploaded_by}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-center">{formatDate(row.creation)}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {row.file_url && (
                          <a href={`/api/files?url=${encodeURIComponent(row.file_url)}`} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-500 hover:text-blue-600">
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        <button className="p-1 text-gray-500 hover:text-green-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
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
      )}
    </div>
  );
}
