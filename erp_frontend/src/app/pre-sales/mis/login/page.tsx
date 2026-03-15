'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';

interface LoginRecord {
  user: string;
  full_name: string;
  creation: string;
  ip_address: string;
  operation: string;
}

export default function LoginMISPage() {
  const [showFilters, setShowFilters] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedEmployee) params.set('user', selectedEmployee);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);
      const res = await fetch(`/api/mis/login?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error('Failed to fetch:', e); }
    finally { setLoading(false); }
  }, [selectedEmployee, fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
  const uniqueUsers = [...new Set(data.map(item => item.user))];

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleClear = () => {
    setSelectedEmployee('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Login MIS</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Employee login and session tracking</p>
      </div>

      {/* Search/Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Search className="w-4 h-4" />
            <span className="font-medium">Search</span>
          </div>
          {showFilters ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 max-w-3xl">
              <input
                type="text"
                placeholder="Filter by user email..."
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                placeholder="From date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                placeholder="To date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-16">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Full Name</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Date Time</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Operation</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No login records found</td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={`${row.user}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.user}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.full_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{formatDateTime(row.creation)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.operation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.ip_address || '-'}</td>
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
            <span>Page {currentPage} of {totalPages || 1}</span>
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
    </div>
  );
}
