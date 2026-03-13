'use client';
import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Download, Calendar } from 'lucide-react';

interface SalesMISData {
  id: number;
  userName: string;
  assigned: number;
  inProcess: number;
  submitted: number;
  cancelled: number;
  awarded: number;
  lost: number;
  rejected: number;
  dropped: number;
  reopened: number;
  technical: number;
  financial: number;
}

const mockSalesData: SalesMISData[] = [
  { id: 1, userName: 'Anju Ahirwar', assigned: 1, inProcess: 0, submitted: 0, cancelled: 0, awarded: 0, lost: 0, rejected: 0, dropped: 0, reopened: 0, technical: 0, financial: 0 },
  { id: 2, userName: 'Ankit Mishra', assigned: 37, inProcess: 2, submitted: 0, cancelled: 0, awarded: 0, lost: 0, rejected: 0, dropped: 1, reopened: 0, technical: 0, financial: 0 },
  { id: 3, userName: 'Hemant Banwari', assigned: 7, inProcess: 2, submitted: 0, cancelled: 0, awarded: 0, lost: 0, rejected: 0, dropped: 1, reopened: 0, technical: 0, financial: 0 },
  { id: 4, userName: 'Himadri Biswas', assigned: 0, inProcess: 0, submitted: 0, cancelled: 0, awarded: 0, lost: 0, rejected: 0, dropped: 0, reopened: 0, technical: 0, financial: 0 },
  { id: 5, userName: 'Priya Sharma', assigned: 12, inProcess: 3, submitted: 2, cancelled: 0, awarded: 1, lost: 0, rejected: 0, dropped: 0, reopened: 0, technical: 1, financial: 1 },
  { id: 6, userName: 'Rahul Singh', assigned: 8, inProcess: 1, submitted: 1, cancelled: 0, awarded: 0, lost: 1, rejected: 0, dropped: 0, reopened: 0, technical: 0, financial: 0 },
  { id: 7, userName: 'Suresh Kumar', assigned: 15, inProcess: 4, submitted: 3, cancelled: 1, awarded: 2, lost: 0, rejected: 1, dropped: 0, reopened: 1, technical: 2, financial: 1 },
];

export default function SalesMISPage() {
  const [showFilters, setShowFilters] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [data] = useState<SalesMISData[]>(mockSalesData);

  const handleSearch = () => {
    console.log('Searching:', { selectedUser, dateRange });
  };

  const handleClear = () => {
    setSelectedUser('');
    setDateRange('');
  };

  const handleExport = () => {
    console.log('Exporting to Excel');
  };

  const renderClickableNumber = (value: number) => {
    if (value === 0) return <span className="text-gray-500">0</span>;
    return <a href="#" className="text-blue-600 hover:underline">{value}</a>;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Sales MIS</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Sales team performance and tender tracking</p>
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
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">User Name</option>
                {mockSalesData.map(user => (
                  <option key={user.id} value={user.userName}>{user.userName}</option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Date From → Date To"
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

      {/* Export Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-[#1e6b87] text-[#1e6b87] rounded-lg hover:bg-[#1e6b87] hover:text-white transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Export To Excel
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">User Name</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Assigned</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">In Process</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Submitted</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Cancelled</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Awarded</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Lost</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Rejected</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Dropped</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Reopened</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Technical</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Financial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-sm text-gray-900">{index + 1}</td>
                  <td className="px-3 py-3 text-sm text-gray-900">{row.userName}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.assigned)}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.inProcess)}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.submitted)}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.cancelled)}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.awarded)}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.lost)}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.rejected)}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.dropped)}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.reopened)}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.technical)}</td>
                  <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.financial)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
