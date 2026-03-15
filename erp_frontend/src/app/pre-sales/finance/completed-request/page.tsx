'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Download, Eye, CheckCircle2, Calendar, IndianRupee, FileCheck, Clock, ArrowUpRight, Loader2 } from 'lucide-react';

interface FinanceInstrument {
  name: string;
  instrument_type: string;
  linked_tender: string;
  instrument_number: string;
  amount: number;
  status: string;
  bank_name: string;
  issue_date: string;
  expiry_date: string;
  remarks: string;
  creation: string;
  owner: string;
}

const columns = [
  { key: '#', label: '#' },
  { key: 'tenderId', label: 'TENDER ID' },
  { key: 'requirement', label: 'REQUIREMENT' },
  { key: 'paymentMode', label: 'BANK' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'requesterName', label: 'REQUESTER' },
  { key: 'instrumentNo', label: 'INSTRUMENT NO' },
  { key: 'requestedDate', label: 'CREATED DATE' },
  { key: 'expiryDate', label: 'EXPIRY DATE' },
  { key: 'validity', label: 'VALIDITY' },
  { key: 'approvalStatus', label: 'STATUS' },
  { key: 'action', label: 'ACTION' },
];

export default function CompletedRequestPage() {
  const [data, setData] = useState<FinanceInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance-requests');
      const json = await res.json();
      if (json.success) {
        setData(json.data.filter((r: FinanceInstrument) => ['Active', 'Released', 'Refunded'].includes(r.status)));
      }
    } catch (e) { console.error('Failed to fetch:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Active: 'bg-green-100 text-green-700',
      Refunded: 'bg-blue-100 text-blue-700',
      Released: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const totalAmount = data.reduce((sum, r) => sum + (r.amount || 0), 0);
  const activeCount = data.filter(r => r.status === 'Active').length;
  const refundedCount = data.filter(r => r.status === 'Refunded').length;

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Completed Request</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Approved and processed finance requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.length}</p>
              <p className="text-sm text-gray-500">Total Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <IndianRupee className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">₹{(totalAmount / 100000).toFixed(1)}L</p>
              <p className="text-sm text-gray-500">Total Processed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FileCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{activeCount}</p>
              <p className="text-sm text-gray-500">Active Deposits</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{refundedCount}</p>
              <p className="text-sm text-gray-500">Refunded</p>
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
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="refunded">Refunded</option>
                  <option value="released">Released</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Completed Date</label>
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
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                    No data found
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={row.name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium">{row.linked_tender || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.instrument_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.bank_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">₹{(row.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.owner}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.instrument_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.creation)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.expiry_date)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <p className="text-gray-600">{row.issue_date && row.expiry_date ? `${Math.ceil((new Date(row.expiry_date).getTime() - new Date(row.issue_date).getTime()) / 86400000)} days` : '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                        title="View Details"
                      >
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
    </div>
  );
}
