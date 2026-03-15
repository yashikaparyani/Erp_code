'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Download, CheckCircle, XCircle, Eye, Clock, User, Calendar, IndianRupee, FileText, Loader2 } from 'lucide-react';

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

interface Stats {
  pending: number;
  pending_amount: number;
  emd_count: number;
  total: number;
}

export default function ApproveRequestPage() {
  const [data, setData] = useState<FinanceInstrument[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, pending_amount: 0, emd_count: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, statsRes] = await Promise.all([
        fetch('/api/finance-requests?status=Pending'),
        fetch('/api/finance-requests/stats'),
      ]);
      const [reqJson, statsJson] = await Promise.all([reqRes.json(), statsRes.json()]);
      if (reqJson.success) setData(reqJson.data);
      if (statsJson.success) setStats(statsJson.data);
    } catch (e) { console.error('Failed to fetch:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleApprove = async (name: string) => {
    try {
      const res = await fetch('/api/finance-requests/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (json.success) fetchData();
    } catch (e) { console.error('Approve failed:', e); }
  };

  const handleDeny = async (name: string) => {
    const reason = prompt('Reason for denial (optional):');
    try {
      const res = await fetch('/api/finance-requests/deny', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, reason: reason || '' }),
      });
      const json = await res.json();
      if (json.success) fetchData();
    } catch (e) { console.error('Deny failed:', e); }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Approve Request</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Review and approve pending finance requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Requests</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <IndianRupee className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">₹{((stats.pending_amount || 0) / 100000).toFixed(1)}L</p>
              <p className="text-sm text-gray-500">Total Pending Amount</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.emd_count}</p>
              <p className="text-sm text-gray-500">EMD Requests</p>
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
                <label className="block text-xs text-gray-500 mb-1">Urgency</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All</option>
                  <option value="urgent">Urgent ({"<"}5 days)</option>
                  <option value="medium">Medium (5-10 days)</option>
                  <option value="normal">Normal ({">"}10 days)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Requester</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All</option>
                  <option value="rahul">Rahul Sharma</option>
                  <option value="priya">Priya Singh</option>
                  <option value="amit">Amit Kumar</option>
                </select>
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Tender</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Bank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Requester</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Approver</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Request Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Expiry Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Validity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-500">
                    No pending requests found
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
                    <td className="px-4 py-3 text-sm text-gray-400 italic">-</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.creation)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.expiry_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.issue_date && row.expiry_date ? `${Math.ceil((new Date(row.expiry_date).getTime() - new Date(row.issue_date).getTime()) / 86400000)} days` : '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                        PENDING
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleApprove(row.name)}
                          className="p-1.5 hover:bg-green-100 rounded text-green-600"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeny(row.name)}
                          className="p-1.5 hover:bg-red-100 rounded text-red-600"
                          title="Deny"
                        >
                          <XCircle className="w-4 h-4" />
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
    </div>
  );
}
