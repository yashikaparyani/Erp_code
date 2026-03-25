'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, CheckCircle, ChevronsLeft, ChevronsRight, X, Loader2 } from 'lucide-react';

interface DesignationData {
  name: string;
  designation_name: string;
  description: string;
  creation: string;
  owner: string;
}

export default function DesignationPage() {
  const [data, setData] = useState<DesignationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [newDesignation, setNewDesignation] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/designations');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error('Failed to fetch designations:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

  const filteredData = data.filter(item =>
    item.designation_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (newDesignation.trim()) {
      try {
        const res = await fetch('/api/designations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ designation_name: newDesignation }),
        });
        const json = await res.json();
        if (json.success) {
          setNewDesignation('');
          setShowModal(false);
          fetchData();
        }
      } catch (e) { console.error('Failed to create designation:', e); }
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Designation</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage employee designations</p>
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
            Add Designation
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
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-16">#</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Designation Name</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Created By</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Created Date & Time</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'No data found.'}
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 text-center font-medium">{row.designation_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{row.owner}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{new Date(row.creation).toLocaleDateString('en-GB').replace(/\//g, '-')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 rounded-full bg-green-100 text-green-600"
                        >
                          <CheckCircle className="w-4 h-4" />
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
            </select>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              Prev
            </button>
            <span className="px-3 py-1 bg-[#1e6b87] text-white rounded text-sm font-medium">{currentPage}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              Next
            </button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Add Designation</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation Name</label>
              <input
                type="text"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                placeholder="Enter designation name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm font-medium">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] text-sm font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
