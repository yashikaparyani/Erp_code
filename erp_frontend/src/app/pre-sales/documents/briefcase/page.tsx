'use client';
import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, Eye, Edit2, Trash2, Download } from 'lucide-react';

interface DocumentData {
  id: number;
  folderName: string;
  subFolderName: string;
  fileName: string;
  createdBy: string;
  createdDateTime: string;
  expiryDate: string;
  remarks: string;
}

const mockDocuments: DocumentData[] = [];

const folderOptions = [
  { value: '', label: 'Folder Name' },
  { value: 'tenders', label: 'Tenders' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'reports', label: 'Reports' },
];

const subFolderOptions = [
  { value: '', label: 'Sub Folder Name' },
  { value: '2024', label: '2024' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: 'archived', label: 'Archived' },
];

export default function DocumentBriefCasePage() {
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    folderName: '',
    subFolderName: '',
    fileName: '',
    showDeleted: false,
  });
  const [data] = useState<DocumentData[]>(mockDocuments);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    console.log('Searching with filters:', filters);
  };

  const handleClear = () => {
    setFilters({
      folderName: '',
      subFolderName: '',
      fileName: '',
      showDeleted: false,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(data.map(item => item.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedRows(prev => [...prev, id]);
    } else {
      setSelectedRows(prev => prev.filter(rowId => rowId !== id));
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
                value={filters.folderName}
                onChange={(e) => handleFilterChange('folderName', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                {folderOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={filters.subFolderName}
                onChange={(e) => handleFilterChange('subFolderName', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                {subFolderOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
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

            {/* Checkbox */}
            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showDeleted}
                  onChange={(e) => handleFilterChange('showDeleted', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Show Deleted File
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] transition-colors text-sm font-medium"
              >
                Search
              </button>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                <th className="px-3 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-white/30"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider w-12">#</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Folder Name</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Sub Folder Name</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">File Name</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Created By</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Created Date & Time</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Expiry Date</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Remarks</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                    No data found.
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{row.folderName}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{row.subFolderName}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{row.fileName}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{row.createdBy}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-center">{row.createdDateTime}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-center">{row.expiryDate}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">{row.remarks}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1 text-gray-500 hover:text-blue-600">
                          <Eye className="w-4 h-4" />
                        </button>
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
    </div>
  );
}
