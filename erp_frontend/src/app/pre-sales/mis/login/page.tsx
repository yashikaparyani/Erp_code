'use client';
import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface LoginMISData {
  id: number;
  employeeName: string;
  loginDateTime: string;
  logoutDateTime: string;
  ipAddress: string;
}

const mockLoginData: LoginMISData[] = [
  { id: 1, employeeName: 'Purnima Nigam', loginDateTime: '09-03-2026', logoutDateTime: '', ipAddress: '10.60.137.145' },
  { id: 2, employeeName: 'Ankit Mishra', loginDateTime: '09-03-2026', logoutDateTime: '', ipAddress: '10.60.137.145' },
  { id: 3, employeeName: 'Rahul Sharma', loginDateTime: '09-03-2026 10:30 AM', logoutDateTime: '09-03-2026 06:45 PM', ipAddress: '10.60.137.142' },
  { id: 4, employeeName: 'Priya Singh', loginDateTime: '09-03-2026 09:15 AM', logoutDateTime: '09-03-2026 05:30 PM', ipAddress: '10.60.137.143' },
  { id: 5, employeeName: 'Suresh Kumar', loginDateTime: '09-03-2026 08:45 AM', logoutDateTime: '09-03-2026 07:00 PM', ipAddress: '10.60.137.144' },
  { id: 6, employeeName: 'Hemant Banwari', loginDateTime: '08-03-2026 09:00 AM', logoutDateTime: '08-03-2026 06:30 PM', ipAddress: '10.60.137.141' },
  { id: 7, employeeName: 'Vikram Desai', loginDateTime: '08-03-2026 09:30 AM', logoutDateTime: '08-03-2026 06:00 PM', ipAddress: '10.60.137.146' },
  { id: 8, employeeName: 'Neha Gupta', loginDateTime: '08-03-2026 10:00 AM', logoutDateTime: '08-03-2026 05:45 PM', ipAddress: '10.60.137.147' },
];

export default function LoginMISPage() {
  const [showFilters, setShowFilters] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [data] = useState<LoginMISData[]>(mockLoginData);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const handleSearch = () => {
    console.log('Searching:', { selectedEmployee, dateRange });
  };

  const handleClear = () => {
    setSelectedEmployee('');
    setDateRange('');
  };

  const uniqueEmployees = [...new Set(mockLoginData.map(item => item.employeeName))];

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 max-w-2xl">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">Employee Name</option>
                {uniqueEmployees.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Login From → Login To"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
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
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-16">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Employee Name</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Login Date Time</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Logout Date Time</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.employeeName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.loginDateTime}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.logoutDateTime || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.ipAddress}</td>
                </tr>
              ))}
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
