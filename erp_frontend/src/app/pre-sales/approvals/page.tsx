'use client';
import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Download, Eye, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface ApprovalData {
  id: number;
  tenderId: string;
  approvalFor: string;
  approvalFrom: string;
  inLoop: string;
  requester: string;
  requestDate: string;
  actionDate: string;
  deadlineDate: string;
  status: 'Approved' | 'Pending' | 'Rejected';
}

const mockApprovals: ApprovalData[] = [
  {
    id: 1,
    tenderId: '3266',
    approvalFor: 'EMD Approval',
    approvalFrom: 'Neeraj Kushwaha',
    inLoop: 'Purnima Nigam',
    requester: 'Purnima Nigam',
    requestDate: '04-02-2025 11:22',
    actionDate: '05-02-2025 14:22',
    deadlineDate: '04-03-2025 12:00',
    status: 'Approved',
  },
  {
    id: 2,
    tenderId: '3271',
    approvalFor: 'SD Approval',
    approvalFrom: 'Rahul Sharma',
    inLoop: 'Ankit Mishra',
    requester: 'Ankit Mishra',
    requestDate: '06-02-2025 09:30',
    actionDate: '07-02-2025 11:45',
    deadlineDate: '06-03-2025 18:00',
    status: 'Approved',
  },
  {
    id: 3,
    tenderId: '3285',
    approvalFor: 'BG Approval',
    approvalFrom: 'Priya Singh',
    inLoop: 'Hemant Banwari',
    requester: 'Hemant Banwari',
    requestDate: '10-02-2025 14:15',
    actionDate: '',
    deadlineDate: '10-03-2025 17:00',
    status: 'Pending',
  },
  {
    id: 4,
    tenderId: '3290',
    approvalFor: 'Tender Fee',
    approvalFrom: 'Vikram Desai',
    inLoop: 'Suresh Kumar',
    requester: 'Suresh Kumar',
    requestDate: '12-02-2025 10:00',
    actionDate: '12-02-2025 16:30',
    deadlineDate: '12-03-2025 12:00',
    status: 'Rejected',
  },
  {
    id: 5,
    tenderId: '3295',
    approvalFor: 'EMD Approval',
    approvalFrom: 'Neeraj Kushwaha',
    inLoop: 'Neha Gupta',
    requester: 'Neha Gupta',
    requestDate: '15-02-2025 09:00',
    actionDate: '',
    deadlineDate: '15-03-2025 18:00',
    status: 'Pending',
  },
];

export default function ApprovalsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [data] = useState<ApprovalData[]>(mockApprovals);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

  const handleExport = () => {
    console.log('Exporting to Excel');
  };

  const getStatusStyle = (status: ApprovalData['status']) => {
    switch (status) {
      case 'Approved':
        return 'text-green-600';
      case 'Pending':
        return 'text-yellow-600';
      case 'Rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Approval's</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage approval requests and workflows</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
              <input
                type="text"
                placeholder="Tender ID"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500">
                <option value="">Approval For</option>
                <option value="emd">EMD Approval</option>
                <option value="sd">SD Approval</option>
                <option value="bg">BG Approval</option>
                <option value="tender_fee">Tender Fee</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500">
                <option value="">Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <input
                type="text"
                placeholder="Requester"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button className="px-6 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] transition-colors text-sm font-medium">
                Search
              </button>
              <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
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
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-12">#</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Tender ID</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Approval For</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Approval From</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">In Loop</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Requester</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Request Date</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Action Date</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Deadline Date</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-gray-500">
                    No approvals found.
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm text-gray-900 text-center">{index + 1}</td>
                    <td className="px-3 py-3 text-sm text-blue-600 text-center font-medium">
                      <a href="#" className="hover:underline">{row.tenderId}</a>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.approvalFor}</td>
                    <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.approvalFrom}</td>
                    <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.inLoop}</td>
                    <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.requester}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-center">{row.requestDate}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-center">{row.actionDate || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-center">{row.deadlineDate}</td>
                    <td className={`px-3 py-3 text-sm text-center font-medium ${getStatusStyle(row.status)}`}>
                      {row.status}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Eye className="w-4 h-4" />
                      </button>
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
