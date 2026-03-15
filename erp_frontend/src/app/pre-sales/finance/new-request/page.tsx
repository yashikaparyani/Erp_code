'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Download, Plus, Calendar, Building2, CreditCard, Clock, FileText, X, Loader2 } from 'lucide-react';

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

export default function NewRequestPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState<FinanceInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    linked_tender: '',
    instrument_type: 'EMD',
    bank_name: '',
    amount: '',
    expiry_date: '',
    remarks: '',
  });

  const requirementOptions = ['EMD', 'PBG'];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance-requests');
      const json = await res.json();
      if (json.success) setRequests(json.data);
    } catch (e) { console.error('Failed to fetch:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSubmit = async () => {
    if (!formData.linked_tender.trim() || !formData.amount) return;
    try {
      const res = await fetch('/api/finance-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linked_tender: formData.linked_tender,
          instrument_type: formData.instrument_type,
          bank_name: formData.bank_name,
          amount: parseFloat(formData.amount),
          expiry_date: formData.expiry_date,
          remarks: formData.remarks,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFormData({ linked_tender: '', instrument_type: 'EMD', bank_name: '', amount: '', expiry_date: '', remarks: '' });
        setShowModal(false);
        fetchData();
      }
    } catch (e) { console.error('Failed to create request:', e); }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">New Request</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Create new finance requests for tenders</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
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
                <label className="block text-xs text-gray-500 mb-1">Instrument Type</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All</option>
                  <option value="EMD">EMD</option>
                  <option value="PBG">PBG</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All</option>
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Released">Released</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Rejected">Rejected</option>
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Tender ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Bank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Requester</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Instrument No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Created Date</th>
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
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-500">
                    No data found
                  </td>
                </tr>
              ) : (
                requests.map((row, index) => (
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
                    <td className="px-4 py-3 text-sm text-gray-600">{row.issue_date && row.expiry_date ? `${Math.ceil((new Date(row.expiry_date).getTime() - new Date(row.issue_date).getTime()) / 86400000)} days` : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : row.status === 'Active' ? 'bg-green-100 text-green-700' : row.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-blue-600 hover:text-blue-700 text-sm">View</button>
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

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">New Finance Request</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tender ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.linked_tender}
                  onChange={(e) => setFormData({...formData, linked_tender: e.target.value})}
                  placeholder="Enter tender ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instrument Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.instrument_type}
                    onChange={(e) => setFormData({...formData, instrument_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {requirementOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                    placeholder="Enter bank name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  placeholder="Any additional remarks..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
