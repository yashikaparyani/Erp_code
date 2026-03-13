'use client';
import { useState } from 'react';
import { Search, ChevronDown, Download, Eye, XCircle, RefreshCw, Calendar, User, AlertTriangle } from 'lucide-react';

interface DeniedRequest {
  id: string;
  tenderId: string;
  requirement: string;
  paymentMode: string;
  amount: number;
  requesterName: string;
  financeExecutive: string;
  requestedDate: string;
  deniedDate: string;
  deniedBy: string;
  denialReason: string;
  validity: string;
}

const mockDeniedRequests: DeniedRequest[] = [
  {
    id: '1',
    tenderId: 'TEN-2026-012',
    requirement: 'EMD',
    paymentMode: 'Bank Transfer',
    amount: 500000,
    requesterName: 'Rahul Sharma',
    financeExecutive: 'Vikram Desai',
    requestedDate: '2026-02-20',
    deniedDate: '2026-02-22',
    deniedBy: 'Finance Manager',
    denialReason: 'Insufficient funds in project account',
    validity: '90 days',
  },
  {
    id: '2',
    tenderId: 'TEN-2026-013',
    requirement: 'PBG',
    paymentMode: 'DD',
    amount: 1200000,
    requesterName: 'Priya Singh',
    financeExecutive: 'Neha Gupta',
    requestedDate: '2026-02-25',
    deniedDate: '2026-02-27',
    deniedBy: 'CFO',
    denialReason: 'Bank guarantee limit exceeded for current quarter',
    validity: '180 days',
  },
  {
    id: '3',
    tenderId: 'TEN-2026-014',
    requirement: 'Security Deposit',
    paymentMode: 'Cheque',
    amount: 250000,
    requesterName: 'Amit Kumar',
    financeExecutive: 'Vikram Desai',
    requestedDate: '2026-03-01',
    deniedDate: '2026-03-03',
    deniedBy: 'Finance Manager',
    denialReason: 'Incomplete documentation - Project approval pending',
    validity: '365 days',
  },
];

const columns = [
  { key: '#', label: '#' },
  { key: 'tenderId', label: 'TENDER ID' },
  { key: 'requirement', label: 'REQUIREMENT' },
  { key: 'paymentMode', label: 'PAYMENT MODE' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'requesterName', label: 'REQUESTER NAME' },
  { key: 'financeExecutive', label: 'FINANCE EXECUTIVE' },
  { key: 'requestedDate', label: 'REQUESTED DATE' },
  { key: 'deniedDate', label: 'DENIED DATE' },
  { key: 'validity', label: 'VALIDITY' },
  { key: 'approvalStatus', label: 'APPROVAL STATUS' },
  { key: 'action', label: 'ACTION' },
];

export default function DeniedRequestPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<DeniedRequest | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleResubmit = (id: string) => {
    console.log('Resubmitting request:', id);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Denied Request</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Finance requests that were denied</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{mockDeniedRequests.length}</p>
              <p className="text-sm text-gray-500">Total Denied</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">₹19.5L</p>
              <p className="text-sm text-gray-500">Total Denied Amount</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">1</p>
              <p className="text-sm text-gray-500">Resubmitted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Search className="w-4 h-4" />
            <span>Tender Filter</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tender ID</label>
                <input
                  type="text"
                  placeholder="Search tender ID..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Requirement</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All</option>
                  <option value="emd">EMD</option>
                  <option value="pbg">PBG</option>
                  <option value="sd">Security Deposit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Denied By</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All</option>
                  <option value="fm">Finance Manager</option>
                  <option value="cfo">CFO</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date Range</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Clear Filters
              </button>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="flex justify-end mb-4">
        <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm">
          <Download className="w-4 h-4" />
          Export To Excel
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockDeniedRequests.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                    No data found
                  </td>
                </tr>
              ) : (
                mockDeniedRequests.map((request, index) => (
                  <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium">{request.tenderId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{request.requirement}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{request.paymentMode}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">₹{request.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{request.requesterName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{request.financeExecutive}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(request.requestedDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(request.deniedDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{request.validity}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        DENIED
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setSelectedRequest(request)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleResubmit(request.id)}
                          className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
                          title="Resubmit"
                        >
                          <RefreshCw className="w-4 h-4" />
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
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <select 
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600">Page {currentPage}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 text-gray-400 hover:text-gray-600">«</button>
            <button className="px-2 py-1 text-gray-500 hover:text-gray-700">Prev</button>
            <button className="px-2 py-1 text-gray-500 hover:text-gray-700">Next</button>
            <button className="px-2 py-1 text-gray-400 hover:text-gray-600">»</button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Request Details</h2>
              <button onClick={() => setSelectedRequest(null)} className="p-1 hover:bg-gray-100 rounded">
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Tender ID</p>
                  <p className="text-sm font-medium text-gray-800">{selectedRequest.tenderId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Requirement</p>
                  <p className="text-sm font-medium text-gray-800">{selectedRequest.requirement}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-sm font-medium text-gray-800">₹{selectedRequest.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Denied By</p>
                  <p className="text-sm font-medium text-gray-800">{selectedRequest.deniedBy}</p>
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-600 font-medium mb-1">Denial Reason</p>
                <p className="text-sm text-red-800">{selectedRequest.denialReason}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => handleResubmit(selectedRequest.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Resubmit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
